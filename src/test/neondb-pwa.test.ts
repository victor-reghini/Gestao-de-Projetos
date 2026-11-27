import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCloudSqlConfig, fetchCloudSqlTasks } from '@/services/server/cloudSqlDb';
import { getEnvVar } from '@/services/firebase';
import { handleApiRequest } from '@/services/server/apiHandler';
import { CloudSqlService } from '@/services/cloudSqlService';
import { ProjectService, IdeaService, ColumnService } from '@/services/dbService';

describe('NeonDB Configuration & PWA Assets', () => {
  const originalDbUrl = process.env.DATABASE_URL;
  const originalPgHost = process.env.PGHOST;

  afterEach(() => {
    if (originalDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDbUrl;

    if (originalPgHost === undefined) delete process.env.PGHOST;
    else process.env.PGHOST = originalPgHost;
  });

  it('prioritizes DATABASE_URL and extracts sanitized hostname without exposing credentials', () => {
    process.env.DATABASE_URL = 'postgresql://neondb_owner:secret_pass@ep-test-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    delete process.env.PGHOST;

    const cfg = getCloudSqlConfig();
    expect(cfg.isConfigured).toBe(true);
    expect(cfg.host).toBe('ep-test-pooler.sa-east-1.aws.neon.tech');
    expect(cfg.host).not.toContain('secret_pass');
  });

  it('includes valid PWA manifest and service worker in public/', () => {
    const rootDir = process.cwd();
    const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
    const swPath = path.join(rootDir, 'public', 'sw.js');

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(swPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/dashboard');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.some((i: any) => i.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);

    for (const icon of manifest.icons) {
      const iconFile = path.join(rootDir, 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconFile)).toBe(true);
    }

    const swCode = fs.readFileSync(swPath, 'utf8');
    expect(swCode).toContain("url.pathname.startsWith('/api/')");
    expect(swCode).toContain('skipWaiting');
  });

  it('hides mobile-top-header and mobile-bottom-nav by default on desktop and activates only under 767px', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8');
    const mobileHeaderMatch = css.match(/\.mobile-top-header\s*\{[^}]*\}/);
    const mobileNavMatch = css.match(/\.mobile-bottom-nav\s*\{[^}]*\}/);
    expect(mobileHeaderMatch?.[0]).toContain('display: none;');
    expect(mobileNavMatch?.[0]).toContain('display: none;');

    const mobileMediaSection = css.split('@media (max-width: 767px)')[1] || '';
    expect(mobileMediaSection).toMatch(/\.mobile-top-header\s*\{\s*display:\s*flex;/);
    expect(mobileMediaSection).toMatch(/\.mobile-bottom-nav\s*\{\s*display:\s*grid;/);
  });

  it('returns server-authorized NeonDB projects and ideas without redundant client filtering', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const remoteProjects = [
      { id: 'p-own', ownerId: 'demo-user-123', name: 'Own', slug: 'own', description: '', visibility: 'PRIVATE', status: 'EM_ANDAMENTO', technologies: [], links: [], createdAt: '', updatedAt: '' },
      { id: 'p-migrated', ownerId: 'J766YapgzET59GiBxrArpjH5Ozn2', name: 'Migrated', slug: 'migrated', description: '', visibility: 'PUBLIC', status: 'EM_ANDAMENTO', technologies: [], links: [], createdAt: '', updatedAt: '' }
    ];
    const remoteIdeas = [
      { id: 'i-own', ownerId: 'demo-user-123', title: 'Own Idea', description: '', visibility: 'PRIVATE', status: 'NOVA', technologies: [], links: [], createdAt: '', updatedAt: '' },
      { id: 'i-migrated', ownerId: 'J766YapgzET59GiBxrArpjH5Ozn2', title: 'Migrated Idea', description: '', visibility: 'PUBLIC', status: 'VALIDADA', technologies: [], links: [], createdAt: '', updatedAt: '' }
    ];
    const projSpy = vi.spyOn(CloudSqlService, 'fetchProjects').mockResolvedValue(remoteProjects as any);
    const ideaSpy = vi.spyOn(CloudSqlService, 'fetchIdeas').mockResolvedValue(remoteIdeas as any);
    try {
      const projects = await ProjectService.getAll('demo-user-123');
      const ideas = await IdeaService.getAll('demo-user-123');
      expect(projects.map(p => p.id)).toEqual(['p-own', 'p-migrated']);
      expect(ideas.map(i => i.id)).toEqual(['i-own', 'i-migrated']);
    } finally {
      process.env.NODE_ENV = origEnv;
      projSpy.mockRestore();
      ideaSpy.mockRestore();
    }
  });

  it('returns null from fetchCloudSqlTasks and 503 from /api/v1/cloudsql/tasks when DB is unavailable in production', async () => {
    const origEnv = process.env.NODE_ENV;
    const origNetlifyUrl = process.env.NETLIFY_DATABASE_URL;
    const origUnpooled = process.env.DATABASE_URL_UNPOOLED;
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    delete process.env.NETLIFY_DATABASE_URL;
    delete process.env.DATABASE_URL_UNPOOLED;
    delete process.env.PGHOST;

    try {
      const tasks = await fetchCloudSqlTasks('proj-1');
      expect(tasks).toBeNull();

      const res = await handleApiRequest({
        method: 'GET',
        path: '/api/v1/cloudsql/tasks',
        headers: {},
        queryParams: { projectId: 'proj-1' }
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body).data).toBeNull();
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origNetlifyUrl !== undefined) process.env.NETLIFY_DATABASE_URL = origNetlifyUrl;
      if (origUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = origUnpooled;
    }
  });

  it('prevents duplicate column creation and never recreates default columns when DB fails or already has columns', async () => {
    localStorage.clear();
    sessionStorage.setItem('gestao_demo_user', JSON.stringify({ id: 'demo-user-123' }));
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const existingCols = [
      { id: 'col-1', projectId: 'proj-dup-guard', name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', createdAt: '', updatedAt: '' }
    ];
    const syncColSpy = vi.spyOn(CloudSqlService, 'syncColumn').mockResolvedValue(true);
    const fetchColsSpy = vi.spyOn(CloudSqlService, 'fetchColumns').mockResolvedValueOnce(null);

    try {
      // 1. DB unavailable (fetchColumns returns null) -> must not create defaults on server
      const onErrorCols = await ColumnService.getByProject('proj-dup-guard');
      expect(onErrorCols).toEqual([]);
      expect(syncColSpy).not.toHaveBeenCalled();

      // 2. createDefaultColumns sees existing remote columns -> returns them without recreating defaults
      fetchColsSpy.mockResolvedValueOnce(existingCols as any);
      const fromRemote = await ColumnService.createDefaultColumns('proj-dup-guard');
      expect(fromRemote.map(c => c.id)).toEqual(['col-1']);
      expect(syncColSpy).not.toHaveBeenCalled();

      // 3. ColumnService.create rejects duplicate column name within the same project
      await expect(
        ColumnService.create('proj-dup-guard', 'Backlog')
      ).rejects.toThrow(/Já existe uma coluna com este nome/);
    } finally {
      process.env.NODE_ENV = origEnv;
      sessionStorage.clear();
      syncColSpy.mockRestore();
      fetchColsSpy.mockRestore();
    }
  });

  it('ignores placeholder env values and strips surrounding quotes in getEnvVar', () => {
    const origPlaceholder = process.env.VITE_TEST_FIREBASE_KEY;
    try {
      process.env.VITE_TEST_FIREBASE_KEY = 'your_firebase_api_key';
      expect(getEnvVar('VITE_TEST_FIREBASE_KEY', 'AIzaFallback')).toBe('AIzaFallback');

      process.env.VITE_TEST_FIREBASE_KEY = ' "AIzaQuoted" ';
      expect(getEnvVar('VITE_TEST_FIREBASE_KEY', 'AIzaFallback')).toBe('AIzaQuoted');
    } finally {
      if (origPlaceholder === undefined) delete process.env.VITE_TEST_FIREBASE_KEY;
      else process.env.VITE_TEST_FIREBASE_KEY = origPlaceholder;
    }
  });
});
