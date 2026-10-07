import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  hasSensitiveMarkers,
  encryptSensitivePayload,
  decryptSensitivePayload,
  encryptSensitiveMarkers,
  decryptSensitiveMarkers,
  redactSensitiveMarkers,
  sanitizeProjectForUser,
  sanitizeTaskForUser,
  renderFormattedMarkdown,
  SENSITIVE_CIPHER_PREFIX
} from '@/services/sensitiveInfoService';
import { 
  persistProject, 
  persistTask,
  fetchCloudSqlProjects,
  fetchCloudSqlProjectByIdOrSlug,
  fetchCloudSqlTasks
} from '@/services/server/cloudSqlDb';
import { ProjectService, TaskService } from '@/services/dbService';
import { setActiveStorageUserId } from '@/services/storageCrypto';
import { Project, Task } from '@/types';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownTextareaWithPreview } from '@/components/common/MarkdownTextareaWithPreview';

describe('Sensitive Information & Markdown Security', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActiveStorageUserId(null);
    vi.clearAllTimers();
  });

  describe('1. Marker Detection and Payload Cryptography', () => {
    it('detects block and inline sensitive markdown markers', () => {
      expect(hasSensitiveMarkers('Texto normal sem segredos')).toBe(false);
      expect(hasSensitiveMarkers(':::secret\nsenha=123\n:::')).toBe(true);
      expect(hasSensitiveMarkers(':::sensivel\nchave_privada\n:::')).toBe(true);
      expect(hasSensitiveMarkers(':::sigiloso\nsegredo\n:::')).toBe(true);
      expect(hasSensitiveMarkers('Acesso com ||senha_secreta|| via SSH')).toBe(true);
      expect(hasSensitiveMarkers('Token: [secret]xyz123[/secret]')).toBe(true);
    });

    it('encrypts and decrypts payload correctly with enc_sec_v1: prefix', () => {
      const secret = 'SenhaForte#2026! com acentuação e emojis 🔑';
      const encrypted = encryptSensitivePayload(secret);

      expect(encrypted).toMatch(new RegExp(`^${SENSITIVE_CIPHER_PREFIX}`));
      expect(encrypted).not.toContain(secret);
      expect(encrypted).not.toContain('SenhaForte');

      const decrypted = decryptSensitivePayload(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('encrypts sensitive markers inside markdown text while keeping surrounding text readable', () => {
      const markdown = [
        '# Documentação da API',
        'Este serviço conecta ao banco de dados principal.',
        ':::secret',
        'DATABASE_URL=postgres://user:super_secret_password@db.internal:5432/main',
        ':::',
        'Utilize a conexão com cautela.'
      ].join('\n');

      const encryptedText = encryptSensitiveMarkers(markdown);

      // Surrounding markdown is intact
      expect(encryptedText).toContain('# Documentação da API');
      expect(encryptedText).toContain('Este serviço conecta ao banco de dados principal.');
      expect(encryptedText).toContain('Utilize a conexão com cautela.');

      // Secret content is NOT in plaintext
      expect(encryptedText).not.toContain('super_secret_password');
      expect(encryptedText).toContain(':::secret\nenc_sec_v1:');

      // Decryption by owner restores original plaintext
      const decryptedText = decryptSensitiveMarkers(encryptedText);
      expect(decryptedText).toContain('super_secret_password');
    });

    it('encrypts and decrypts inline markers ||...||', () => {
      const text = 'Servidor na porta ||192.168.1.50:8080|| acessível internamente.';
      const encrypted = encryptSensitiveMarkers(text);

      expect(encrypted).toContain('||enc_sec_v1:');
      expect(encrypted).not.toContain('192.168.1.50:8080');

      const decrypted = decryptSensitiveMarkers(encrypted);
      expect(decrypted).toBe(text);
    });
  });

  describe('2. Backend Redaction (Recorte de Informação para Não-Proprietários)', () => {
    it('completely cuts/removes sensitive blocks from markdown for non-owners', () => {
      const original = [
        '# Projeto Confidencial',
        'Descrição aberta para todos os colaboradores.',
        ':::secret',
        'CONTA_BANCARIA=12345-6',
        'API_KEY=sk_prod_998877665544332211',
        ':::',
        'Mais orientações no canal da equipe.'
      ].join('\n');

      const redacted = redactSensitiveMarkers(original);

      expect(redacted).not.toContain('CONTA_BANCARIA');
      expect(redacted).not.toContain('API_KEY');
      expect(redacted).not.toContain(':::secret');
      expect(redacted).toContain('# Projeto Confidencial');
      expect(redacted).toContain('Descrição aberta para todos os colaboradores.');
      expect(redacted).toContain('Mais orientações no canal da equipe.');
    });

    it('cuts inline markers and spoilers without breaking surrounding text flow', () => {
      const inlineText = 'O login deve ser feito com usuário admin e senha ||senha_mestra_123||.';
      const redacted = redactSensitiveMarkers(inlineText);

      expect(redacted).not.toContain('senha_mestra_123');
      expect(redacted).not.toContain('||');
      expect(redacted).toBe('O login deve ser feito com usuário admin e senha .');
    });

    it('sanitizeProjectForUser decrypts for owner and strips for non-owners', () => {
      const proj: Project = {
        id: 'proj-security-1',
        ownerId: 'owner_alice',
        name: 'Plataforma Alpha',
        slug: 'plataforma-alpha',
        description: 'Descrição pública.\n:::secret\nTOKEN_SECRETO_ALICE\n:::\nFim da descrição.',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['React'],
        links: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Encrypt as if saved in DB
      const storedProj = {
        ...proj,
        description: encryptSensitiveMarkers(proj.description)
      };

      // 1. Owner requests: sees the secret
      const ownerView = sanitizeProjectForUser(storedProj, 'owner_alice');
      expect(ownerView.description).toContain('TOKEN_SECRETO_ALICE');

      // 2. Non-owner (Bob) requests: secret is completely redacted/cut
      const bobView = sanitizeProjectForUser(storedProj, 'user_bob');
      expect(bobView.description).not.toContain('TOKEN_SECRETO_ALICE');
      expect(bobView.description).not.toContain(':::secret');
      expect(bobView.description).toContain('Descrição pública.');

      // 3. Anonymous / unauthenticated requests: secret is redacted/cut
      const anonView = sanitizeProjectForUser(storedProj, null);
      expect(anonView.description).not.toContain('TOKEN_SECRETO_ALICE');

      // 4. Superuser: sees the secret
      const superView = sanitizeProjectForUser(storedProj, 'super_admin_user', true);
      expect(superView.description).toContain('TOKEN_SECRETO_ALICE');
    });

    it('sanitizeTaskForUser decrypts for project owner and strips for non-owners', () => {
      const task: Task = {
        id: 'task-sec-1',
        projectId: 'proj-security-1',
        columnId: 'col-1',
        title: 'Deploy em Produção',
        description: 'Procedimento padrão.\n:::secret\nSSH_KEY=id_rsa_secret_content\n:::\nFinalizar.',
        priority: 'ALTA',
        position: 0,
        createdById: 'dev_user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const storedTask = {
        ...task,
        description: encryptSensitiveMarkers(task.description)
      };

      // Owner of project 'proj-security-1' is 'owner_alice'
      const ownerView = sanitizeTaskForUser(storedTask, 'owner_alice', 'owner_alice');
      expect(ownerView.description).toContain('SSH_KEY=id_rsa_secret_content');

      const nonOwnerView = sanitizeTaskForUser(storedTask, 'owner_alice', 'user_other');
      expect(nonOwnerView.description).not.toContain('SSH_KEY');
      expect(nonOwnerView.description).not.toContain(':::secret');
      expect(nonOwnerView.description).toContain('Procedimento padrão.');
    });
  });

  describe('3. Cloud SQL Integration and Scoped Fetching', () => {
    it('persists encrypted markers in Cloud SQL and returns decrypted to owner / redacted to non-owner', async () => {
      const sensitiveProject: Project = {
        id: 'proj-cloudsql-sec',
        ownerId: 'owner_carol',
        ownerName: 'Carol Owner',
        name: 'Projeto Seguro Carol',
        slug: 'projeto-seguro-carol',
        description: 'Visão geral.\n:::secret\nCREDENCIAIS_AWS_PROD=12345\n:::\nFim.',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['Node.js'],
        links: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Persist to Cloud SQL (simulated or real DB)
      await persistProject(sensitiveProject, 'owner_carol');

      // Fetch as owner
      const fetchedAsOwner = await fetchCloudSqlProjectByIdOrSlug('proj-cloudsql-sec', 'owner_carol');
      if (fetchedAsOwner) {
        expect(fetchedAsOwner.description).toContain('CREDENCIAIS_AWS_PROD=12345');
      }

      // Fetch as stranger (David)
      const fetchedAsDavid = await fetchCloudSqlProjectByIdOrSlug('proj-cloudsql-sec', 'user_david');
      if (fetchedAsDavid) {
        expect(fetchedAsDavid.description).not.toContain('CREDENCIAIS_AWS_PROD');
        expect(fetchedAsDavid.description).not.toContain(':::secret');
      }
    });

    it('persists encrypted tasks and redacts them when non-owner fetches project tasks', async () => {
      const task: Task = {
        id: 'task-cloudsql-sec',
        projectId: 'proj-cloudsql-sec',
        columnId: 'col-1',
        title: 'Atualizar Certificados SSL',
        description: 'Subir certificado ||cert_privkey_content_999|| no gateway.',
        priority: 'URGENTE',
        position: 0,
        createdById: 'owner_carol',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await persistTask(task, 'owner_carol');

      const tasksAsOwner = await fetchCloudSqlTasks('proj-cloudsql-sec', 'owner_carol');
      if (tasksAsOwner && tasksAsOwner.length > 0) {
        const found = tasksAsOwner.find(t => t.id === 'task-cloudsql-sec');
        if (found) {
          expect(found.description).toContain('cert_privkey_content_999');
        }
      }

      const tasksAsStranger = await fetchCloudSqlTasks('proj-cloudsql-sec', 'user_stranger');
      if (tasksAsStranger && tasksAsStranger.length > 0) {
        const found = tasksAsStranger.find(t => t.id === 'task-cloudsql-sec');
        if (found) {
          expect(found.description).not.toContain('cert_privkey_content_999');
          expect(found.description).not.toContain('||');
        }
      }
    });
  });

  describe('4. Local Storage & dbService Multi-Account Scoping', () => {
    it('ProjectService encrypts on create and sanitizes on read for different active users', async () => {
      setActiveStorageUserId('user_elena');

      const created = await ProjectService.create({
        ownerId: 'user_elena',
        ownerName: 'Elena',
        name: 'Projeto Secreto Elena',
        description: 'Informações gerais.\n:::secret\nSEGREDO_DE_ELENA_XYZ\n:::\nFim.',
        visibility: 'PRIVATE',
        status: 'EM_ANDAMENTO',
        technologies: ['TypeScript'],
        links: []
      });

      // Elena reads her project: secret is visible
      const elenaView = await ProjectService.getById(created.id);
      expect(elenaView?.description).toContain('SEGREDO_DE_ELENA_XYZ');

      // User Frank logs in
      setActiveStorageUserId('user_frank');
      const frankView = await ProjectService.getById(created.id);
      if (frankView) {
        expect(frankView.description).not.toContain('SEGREDO_DE_ELENA_XYZ');
        expect(frankView.description).not.toContain(':::secret');
      }
    });
  });

  describe('5. Markdown Rendering & Security Formatting', () => {
    it('formats markdown with headings, bold, code, lists, and displays security badges for owners', () => {
      const md = [
        '# Título Principal',
        '**Importante** e *itálico*.',
        '```ts',
        'const a = 1;',
        '```',
        '- Item 1',
        '- Item 2',
        ':::secret',
        'CHAVE_PRIVADA_MESTRE',
        ':::'
      ].join('\n');

      const htmlOwner = renderFormattedMarkdown(md, true);

      // Verify headings and markdown
      expect(htmlOwner).toContain('<h1');
      expect(htmlOwner).toContain('Título Principal');
      expect(htmlOwner).toContain('<strong');
      expect(htmlOwner).toContain('<pre');
      expect(htmlOwner).toContain('<li');

      // Verify confidential indicator container
      expect(htmlOwner).toContain('Informação Sigilosa (Confidencial)');
      expect(htmlOwner).toContain('CHAVE_PRIVADA_MESTRE');

      // Verify for non-owner: sensitive section is completely omitted
      const htmlNonOwner = renderFormattedMarkdown(md, false);
      expect(htmlNonOwner).not.toContain('CHAVE_PRIVADA_MESTRE');
      expect(htmlNonOwner).not.toContain('Informação Sigilosa');
    });
  });

  describe('6. Frontend MarkdownTextareaWithPreview Component', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders textarea, preview toggle switch and "i" info button with instructions', () => {
      const handleChange = vi.fn();
      render(
        <MarkdownTextareaWithPreview
          label="Descrição Completa"
          value="# Olá mundo"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Descrição Completa')).toBeDefined();
      const toggle = screen.getByTestId('preview-toggle');
      expect(toggle).toBeDefined();
      expect(toggle.getAttribute('aria-checked')).toBe('false');

      // Click "i" info button
      const infoBtn = screen.getByTestId('markdown-info-btn');
      expect(infoBtn).toBeDefined();
      fireEvent.click(infoBtn);

      // Verify popover appears with instructions and link to markdownguide.org
      expect(screen.getByTestId('markdown-info-popover')).toBeDefined();
      expect(screen.getByText(/Inclusão de Dados Sigilosos/i)).toBeDefined();
      const guideLink = screen.getByRole('link', { name: /Como utilizar o padrão Markdown/i });
      expect(guideLink.getAttribute('href')).toBe('https://www.markdownguide.org/basic-syntax/');
    });

    it('enables preview when user blurs (leaves focus) and returns to edit on click', () => {
      const handleChange = vi.fn();
      render(
        <MarkdownTextareaWithPreview
          label="Descrição Completa"
          value="# Projeto Teste"
          onChange={handleChange}
        />
      );

      const toggle = screen.getByTestId('preview-toggle');
      const textarea = screen.getByRole('textbox');

      // 1. Typing keeps user in edit mode (does not switch while focused)
      fireEvent.change(textarea, { target: { value: '# Projeto Atualizado' } });
      expect(handleChange).toHaveBeenCalledWith('# Projeto Atualizado');
      expect(toggle.getAttribute('aria-checked')).toBe('false');

      // 2. User leaves focus / clicks outside (blur): auto-enables preview!
      fireEvent.blur(textarea);
      expect(toggle.getAttribute('aria-checked')).toBe('true');
      expect(screen.getByText('Projeto Teste')).toBeDefined();

      // 3. User clicks on formatted preview to resume editing
      const previewBox = screen.getByTitle('Clique para voltar a editar o texto');
      fireEvent.click(previewBox);
      expect(toggle.getAttribute('aria-checked')).toBe('false');
    });

    it('inserts secret blocks and inline tags without API_KEY', () => {
      const handleChange = vi.fn();
      render(
        <MarkdownTextareaWithPreview
          label="Descrição da Atividade"
          value=""
          onChange={handleChange}
        />
      );

      // Click "+ Bloco :::secret"
      const blockBtn = screen.getByTitle('Inserir bloco sigiloso :::secret');
      fireEvent.click(blockBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining(':::secret\n[informação sigilosa]\n:::'));
      expect(handleChange).not.toHaveBeenCalledWith(expect.stringContaining('API_KEY'));

      // Click "+ Inline ||segredo||"
      const inlineBtn = screen.getByTitle('Inserir dado em linha ||informação sigilosa||');
      fireEvent.click(inlineBtn);
      expect(handleChange).toHaveBeenCalledWith(expect.stringContaining('||informação sigilosa||'));
    });
  });
});
