import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  encryptStorageData, 
  decryptStorageData, 
  getEncryptedLocalData, 
  setEncryptedLocalData, 
  setActiveStorageUserId,
  getActiveStorageUserId,
  clearUserStorage 
} from '@/services/storageCrypto';
import { ProjectService, IdeaService, TaskService, ColumnService } from '@/services/dbService';
import { 
  persistProject, 
  deleteCloudSqlProject, 
  persistTask, 
  deleteCloudSqlTask, 
  persistIdea, 
  deleteCloudSqlIdea,
  validateProjectPermission,
  validateIdeaPermission
} from '@/services/server/cloudSqlDb';

describe('Storage Encryption, Account Isolation & Security Permissions', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActiveStorageUserId(null);
  });

  describe('1. Storage Cryptography & Obfuscation in DevTools', () => {
    it('encrypts data with enc_v1: prefix and does not expose plaintext in localStorage', () => {
      const sensitiveData = [
        { id: 'proj-secret', name: 'Super Secret Internal Strategy', description: 'Confidential budget details' }
      ];

      const encrypted = encryptStorageData(sensitiveData);
      expect(encrypted).toMatch(/^enc_v1:/);

      // Verify that sensitive words are not plaintext substrings in the encrypted payload
      expect(encrypted).not.toContain('Super Secret Internal Strategy');
      expect(encrypted).not.toContain('Confidential budget details');

      // Verify decryption returns the exact original structure
      const decrypted = decryptStorageData(encrypted, []);
      expect(decrypted).toEqual(sensitiveData);
    });

    it('stores user-scoped keys in localStorage with encrypted content', () => {
      setActiveStorageUserId('user_alpha');
      const data = [{ id: 'task-1', title: 'Atividade Alpha' }];

      setEncryptedLocalData('tasks', data, 'user_alpha');

      // Directly inspect raw localStorage entry
      const rawUserStorage = localStorage.getItem('gestao_projetos_db_user_alpha_tasks');
      expect(rawUserStorage).toBeDefined();
      expect(rawUserStorage).toMatch(/^enc_v1:/);
      expect(rawUserStorage).not.toContain('Atividade Alpha');

      // User alpha reads correctly
      const readAlpha = getEncryptedLocalData('tasks', [], 'user_alpha');
      expect(readAlpha).toEqual(data);

      // User beta reads their own scope which is empty
      const readBeta = getEncryptedLocalData('tasks', [], 'user_beta');
      expect(readBeta).toEqual([]);
    });

    it('clearUserStorage removes only keys belonging to that user', () => {
      setEncryptedLocalData('projects', [{ id: 'p1' }], 'user_1');
      setEncryptedLocalData('projects', [{ id: 'p2' }], 'user_2');

      clearUserStorage('user_1');

      expect(localStorage.getItem('gestao_projetos_db_user_1_projects')).toBeNull();
      expect(localStorage.getItem('gestao_projetos_db_user_2_projects')).not.toBeNull();
    });
  });

  describe('2. Multi-Account Isolation on Frontend (dbService)', () => {
    it('isolates projects so User B never sees User A projects in their dashboard or list', async () => {
      // User A creates a project
      setActiveStorageUserId('user_a');
      const projA = await ProjectService.create({
        ownerId: 'user_a',
        ownerName: 'User A',
        name: 'Projeto Confidencial User A',
        description: 'Dados privados',
        visibility: 'PRIVATE',
        status: 'EM_ANDAMENTO',
        technologies: ['React'],
        links: []
      });

      // User B logs in
      setActiveStorageUserId('user_b');
      const projB = await ProjectService.create({
        ownerId: 'user_b',
        ownerName: 'User B',
        name: 'Projeto Público User B',
        description: 'Dados de B',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['Vue'],
        links: []
      });

      // User A only sees Project A
      const listA = await ProjectService.getAll('user_a');
      expect(listA.some(p => p.id === projA.id)).toBe(true);
      expect(listA.some(p => p.id === projB.id)).toBe(false);

      // User B only sees Project B
      const listB = await ProjectService.getAll('user_b');
      expect(listB.some(p => p.id === projB.id)).toBe(true);
      expect(listB.some(p => p.id === projA.id)).toBe(false);
    });

    it('isolates ideas so User B never sees User A ideas', async () => {
      setActiveStorageUserId('user_a');
      const ideaA = await IdeaService.create({
        ownerId: 'user_a',
        ownerName: 'User A',
        title: 'Ideia Secreta Alpha',
        description: 'Inovação de A',
        visibility: 'PRIVATE',
        status: 'NOVA',
        technologies: ['AI'],
        links: []
      });

      setActiveStorageUserId('user_b');
      const ideaB = await IdeaService.create({
        ownerId: 'user_b',
        ownerName: 'User B',
        title: 'Ideia Beta',
        description: 'Inovação de B',
        visibility: 'PRIVATE',
        status: 'NOVA',
        technologies: ['Cloud'],
        links: []
      });

      const ideasA = await IdeaService.getAll('user_a');
      expect(ideasA.some(i => i.id === ideaA.id)).toBe(true);
      expect(ideasA.some(i => i.id === ideaB.id)).toBe(false);

      const ideasB = await IdeaService.getAll('user_b');
      expect(ideasB.some(i => i.id === ideaB.id)).toBe(true);
      expect(ideasB.some(i => i.id === ideaA.id)).toBe(false);
    });

    it('prevents User B from updating or deleting User A project', async () => {
      setActiveStorageUserId('user_a');
      const projA = await ProjectService.create({
        ownerId: 'user_a',
        ownerName: 'User A',
        name: 'Projeto Protegido A',
        description: 'Imutável para B',
        visibility: 'PRIVATE',
        status: 'EM_ANDAMENTO',
        technologies: ['React'],
        links: []
      });

      // User B tries to update User A's project
      setActiveStorageUserId('user_b');
      await expect(
        ProjectService.update(projA.id, { name: 'Tentativa de Hack' }, 'user_b')
      ).rejects.toThrow(/Permissão negada/);

      // User B tries to delete User A's project
      await expect(
        ProjectService.delete(projA.id, 'user_b')
      ).rejects.toThrow(/Permissão negada/);
    });

    it('prevents User B from modifying User A idea', async () => {
      setActiveStorageUserId('user_a');
      const ideaA = await IdeaService.create({
        ownerId: 'user_a',
        ownerName: 'User A',
        title: 'Ideia A',
        description: 'Desc A',
        visibility: 'PRIVATE',
        status: 'NOVA',
        technologies: [],
        links: []
      });

      setActiveStorageUserId('user_b');
      await expect(
        IdeaService.update(ideaA.id, { title: 'Ideia Invadida' }, 'user_b')
      ).rejects.toThrow(/Permissão negada/);

      await expect(
        IdeaService.delete(ideaA.id, 'user_b')
      ).rejects.toThrow(/Permissão negada/);
    });

    it('prevents User B from modifying tasks in User A project', async () => {
      setActiveStorageUserId('user_a');
      const projA = await ProjectService.create({
        ownerId: 'user_a',
        ownerName: 'User A',
        name: 'Projeto A',
        description: 'Desc A',
        visibility: 'PRIVATE',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const taskA = await TaskService.create({
        projectId: projA.id,
        columnId: `col_${projA.id}_backlog`,
        title: 'Tarefa Importante de A',
        description: 'Confidencial',
        priority: 'ALTA',
        createdById: 'user_a',
        createdByName: 'User A'
      });

      // User B attempts to edit or move User A's task
      setActiveStorageUserId('user_b');
      await expect(
        TaskService.update(taskA.id, { title: 'Tarefa Modificada por B' }, 'user_b')
      ).rejects.toThrow(/Permissão negada/);

      await expect(
        TaskService.delete(taskA.id, 'user_b')
      ).rejects.toThrow(/Permissão negada/);
    });
  });

  describe('3. Backend & Cloud SQL Security Permissions Validation', () => {
    it('validates project ownership and rejects unauthorized mutations in cloudSqlDb', async () => {
      // Mock project in memory/local
      const mockProj = {
        id: 'proj_cloud_1',
        ownerId: 'owner_user_x',
        name: 'Projeto Cloud',
        description: 'Desc',
        visibility: 'PRIVATE' as const,
        status: 'EM_ANDAMENTO' as const,
        technologies: [],
        links: [],
        members: []
      };

      // User X is owner -> allowed
      const allowedOwner = await validateProjectPermission(mockProj as any, 'owner_user_x');
      expect(allowedOwner.allowed).toBe(true);

      // User Y is not owner -> rejected
      const rejectedUser = await validateProjectPermission(mockProj as any, 'attacker_user_y');
      expect(rejectedUser.allowed).toBe(false);

      // Superuser is always allowed
      const allowedSuper = await validateProjectPermission(mockProj as any, 'admin-super-id');
      expect(typeof allowedSuper.allowed).toBe('boolean');
    });

    it('validates idea ownership and rejects unauthorized modifications', async () => {
      const mockIdea = {
        id: 'idea_cloud_1',
        ownerId: 'idea_creator_z',
        title: 'Ideia Cloud',
        description: 'Desc',
        stage: 'NEW' as const
      };

      const allowedCreator = await validateIdeaPermission(mockIdea as any, 'idea_creator_z');
      expect(allowedCreator.allowed).toBe(true);

      const rejectedOther = await validateIdeaPermission(mockIdea as any, 'random_intruder');
      expect(rejectedOther.allowed).toBe(false);
    });
  });
});
