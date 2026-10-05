import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';
import {
  Project,
  ProjectColumn,
  Task,
  Idea,
  ProjectMember,
  ProjectDocument,
  Suggestion,
  BugReport,
  Visibility,
  ProjectStatus
} from '@/types';
import { RealtimeSyncService } from './realtimeSyncService';
import { CloudSqlService } from './cloudSqlService';
import { DataConnectService } from './dataConnectService';

// Backward compatibility helpers (no-op since Firestore was removed)
export function sanitizeForFirestore<T>(data: T): T {
  return data;
}

export function safeFirestoreWrite(promise: Promise<any>): void {
  promise.catch(() => { });
}

export async function safeFirestoreQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fallback;
}

const LOCAL_STORAGE_KEY_PREFIX = 'gestao_projetos_db_';

export function getLocalData<T>(key: string, defaultValue: T[]): T[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving local data for ${key}:`, err);
  }
}

// Initial seed sample data
export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    ownerId: 'demo-user-123',
    ownerName: 'Victor Reghini',
    name: 'Sistema de Gestão de Projetos & Ideias',
    slug: 'sistema-gestao-projetos',
    shortDescription: 'Plataforma moderna para centralização de projetos, Kanban, documentação e API pública.',
    description: 'Sistema completo construído com React, TypeScript, Vite, Firebase e Netlify Functions. Suporta Kanban dinâmico, renderização de diagramas Mermaid, controle de visibilidade (privado, compartilhado, público) e API REST v1 para integrações externas.',
    visibility: 'PUBLIC',
    status: 'EM_ANDAMENTO',
    technologies: ['React', 'TypeScript', 'Vite', 'Firebase', 'Netlify', 'TailwindCSS/Vanilla CSS'],
    links: [
      { title: 'Repositório GitHub', url: 'https://github.com/victor-reghini/Gestao-de-Projetos' },
      { title: 'Documentação da API', url: '/docs/api' }
    ],
    repository: {
      provider: 'github',
      owner: 'victor-reghini',
      name: 'Gestao-de-Projetos',
      url: 'https://github.com/victor-reghini/Gestao-de-Projetos',
      defaultBranch: 'main'
    },
    readme: '# Gestão de Projetos\n\nHub central para projetos e ideias com Kanban e API aberta.',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'proj-2',
    ownerId: 'demo-user-123',
    ownerName: 'Victor Reghini',
    name: 'API Gateway & Autenticação Biométrica',
    slug: 'api-gateway-biometria',
    shortDescription: 'Microsserviço de autenticação segura e roteamento de APIs com suporte a WebAuthn.',
    description: 'Microsserviço escalável focado em segurança de ponta a ponta, rate limiting por token, verificação de integridade e auditoria de requisições.',
    visibility: 'PRIVATE',
    status: 'PLANEJAMENTO',
    technologies: ['Node.js', 'Go', 'Redis', 'Docker'],
    links: [
      { title: 'Design Doc', url: 'https://github.com' }
    ],
    repository: {
      provider: 'github',
      owner: 'victor-reghini',
      name: 'api-gateway-biometria',
      url: 'https://github.com/victor-reghini/api-gateway-biometria',
      defaultBranch: 'main'
    },
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialColumns: ProjectColumn[] = [
  { id: 'col-1', projectId: 'proj-1', name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', autoComplete: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-2', projectId: 'proj-1', name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', autoComplete: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-3', projectId: 'proj-1', name: 'Revisão / Testes', key: 'review', position: 2, color: '#f59e0b', autoComplete: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-4', projectId: 'proj-1', name: 'Concluído', key: 'done', position: 3, color: '#10b981', autoComplete: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  { id: 'col-20', projectId: 'proj-2', name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', autoComplete: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-21', projectId: 'proj-2', name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', autoComplete: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-22', projectId: 'proj-2', name: 'Concluído', key: 'done', position: 2, color: '#10b981', autoComplete: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    columnId: 'col-2',
    title: 'Implementar endpoints públicos da API v1',
    description: 'Criar handlers REST em Netlify Functions com rate limiting e documentação Swagger.',
    priority: 'ALTA',
    position: 0,
    concluded: false,
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    createdById: 'demo-user-123',
    createdByName: 'Victor Reghini',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    columnId: 'col-2',
    title: 'Renderização visual de diagramas Mermaid',
    description: 'Adicionar suporte dinâmico no editor de documentação para gráficos Mermaid interativos.',
    priority: 'MEDIA',
    position: 1,
    concluded: false,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    createdById: 'demo-user-123',
    createdByName: 'Victor Reghini',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    columnId: 'col-4',
    title: 'Configurar layout responsivo e Design System',
    description: 'Criar tokens CSS, suporte a modo escuro, glassmorphism e micro-animações.',
    priority: 'ALTA',
    position: 0,
    concluded: true,
    dueDate: new Date().toISOString().split('T')[0],
    createdById: 'demo-user-123',
    createdByName: 'Victor Reghini',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    columnId: 'col-1',
    title: 'Integração com Webhooks do GitHub',
    description: 'Receber notificações automáticas de commits e pull requests.',
    priority: 'BAIXA',
    position: 0,
    concluded: false,
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    createdById: 'demo-user-123',
    createdByName: 'Victor Reghini',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialIdeas: Idea[] = [
  {
    id: 'idea-1',
    ownerId: 'demo-user-123',
    ownerName: 'Victor Reghini',
    title: 'Gerador Automático de Changelog com IA',
    description: 'Ferramenta CLI e web que analisa commits Git convencionais e gera relatórios semânticos de versão e release notes para equipes.',
    visibility: 'PUBLIC',
    status: 'VALIDADA',
    technologies: ['TypeScript', 'Gemini API', 'CLI', 'GitHub Actions'],
    links: [
      { title: 'Pesquisa inicial', url: 'https://keepachangelog.com' }
    ],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'idea-2',
    ownerId: 'demo-user-123',
    ownerName: 'Victor Reghini',
    title: 'Dashboard de Monitoramento de Web Vitals para Jamstack',
    description: 'Agente leve em JavaScript para coletar métricas LCP, FID e CLS em produção e alertar no Discord/Slack.',
    visibility: 'PRIVATE',
    status: 'NOVA',
    technologies: ['Web Workers', 'FastAPI', 'TimescaleDB'],
    links: [],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialDocs: ProjectDocument[] = [
  {
    id: 'doc-1',
    projectId: 'proj-1',
    type: 'markdown',
    title: 'Visão Geral da Arquitetura',
    content: `# Arquitetura do Sistema

O **Gestor de Projetos e Ideias** foi concebido com os seguintes pilares:

1. **Frontend:** React + Vite + TypeScript.
2. **Backend/API:** Serverless Netlify Functions disponibilizando endpoints REST em \`/api/v1\`.
3. **Persistência:** Google Cloud SQL (PostgreSQL) com sincronização em tempo real via Realtime Database.
4. **Armazenamento:** Firebase Storage para anexos e imagens.

## Diagrama de Fluxo de Dados
Consulte a aba de diagramas para visualizar a topologia completa dos serviços.
`,
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'doc-2',
    projectId: 'proj-1',
    type: 'mermaid',
    title: 'Diagrama de Arquitetura C4',
    content: `graph TD
    Client[Browser / Usuário] -->|HTTPS SPA| Netlify[Netlify CDN]
    Client -->|Auth| FirebaseAuth[Firebase Auth]
    Client -->|WebSocket Live Sync| RTDB[Firebase Realtime Database]
    Client -->|Persistência Relacional| CloudSQL[Google Cloud SQL PostgreSQL]
    ExternalApp[Aplicações Externas] -->|REST API v1| NetlifyFunctions[Netlify Functions /api/v1]
    NetlifyFunctions -->|Persistência| CloudSQL
    Client -->|Upload Anexos| Storage[Firebase Storage]
`,
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialSuggestions: Suggestion[] = [
  {
    id: 'sug-1',
    projectId: 'proj-1',
    authorUserId: null,
    authorName: 'Ana Clara (Comunidade)',
    authorEmail: 'ana.clara@example.com',
    title: 'Adicionar atalhos de teclado no Kanban',
    description: 'Seria muito produtivo poder navegar entre cards e colunas usando as setas do teclado e a tecla N para nova atividade.',
    status: 'EM_ANALISE',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialBugs: BugReport[] = [
  {
    id: 'bug-1',
    projectId: 'proj-1',
    authorUserId: null,
    authorName: 'Carlos Dev',
    authorEmail: 'carlos@example.com',
    title: 'Quebra de linha no preview de Markdown longo em telas pequenas',
    description: 'Blocos de código sem quebra horizontal causam overflow na visualização mobile.',
    severity: 'BAIXA',
    stepsToReproduce: '1. Acessar tela de documentação no celular\n2. Abrir documento com bloco de código longo',
    expectedBehavior: 'O bloco de código deve ter scroll horizontal sem esticar a tela',
    observedBehavior: 'A tela do navegador sofre overflow horizontal',
    environment: 'Safari Mobile no iOS 17',
    status: 'ABERTO',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper to generate URL-safe slug
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function isUserConnected(userId?: string): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return false;
  }
  if (userId) return true;
  try {
    if (auth && auth.currentUser) return true;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gestao_demo_user')) return true;
  } catch { }
  return false;
}

// Ensure local seed on first load
function ensureSeedData() {
  if (typeof localStorage === 'undefined') return;
  if (isUserConnected()) return;
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'projects')) {
    setLocalData('projects', initialProjects);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'columns')) {
    setLocalData('columns', initialColumns);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'tasks')) {
    setLocalData('tasks', initialTasks);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'ideas')) {
    setLocalData('ideas', initialIdeas);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'documents')) {
    setLocalData('documents', initialDocs);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'suggestions')) {
    setLocalData('suggestions', initialSuggestions);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'bugs')) {
    setLocalData('bugs', initialBugs);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'members')) {
    setLocalData('members', []);
  }
}
ensureSeedData();

// --- PROJECT SERVICE ---
export const ProjectService = {
  async getAll(userId?: string): Promise<Project[]> {
    const connected = isUserConnected(userId);

    // Quando o usuário estiver conectado, ignora o localStorage e consome os dados atualizados do banco
    if (connected) {
      try {
        const remote = await CloudSqlService.fetchProjects();
        if (remote !== null) {
          setLocalData('projects', remote);
          if (userId) {
            return remote.filter(p => p.ownerId === userId || p.visibility === 'PUBLIC' || p.visibility === 'SHARED');
          }
          return remote;
        }
      } catch (err) {
        console.warn('Falha ao buscar projetos do banco de dados:', err);
      }
    }

    // Modo offline / fallback
    const local = getLocalData<Project>('projects', initialProjects);
    if (userId) {
      return local.filter(p => p.ownerId === userId || p.visibility === 'PUBLIC' || p.visibility === 'SHARED');
    }
    return local;
  },

  async getPublicProjects(): Promise<Project[]> {
    const list = await this.getAll();
    return list.filter(p => p.visibility === 'PUBLIC' && p.status !== 'ARQUIVADO');
  },

  async getById(id: string): Promise<Project | null> {
    const connected = isUserConnected();

    // Se conectado, prioriza buscar diretamente do banco para dados mais recentes
    if (connected) {
      try {
        const remote = await CloudSqlService.fetchProjectByIdOrSlug(id);
        if (remote) {
          const local = getLocalData<Project>('projects', initialProjects);
          setLocalData('projects', [...local.filter(p => p.id !== remote.id), remote]);
          return remote;
        }
      } catch (err) {
        console.warn('Falha ao buscar projeto por ID do banco de dados:', err);
      }
    }

    // Fallback offline / não conectado
    const local = getLocalData<Project>('projects', initialProjects);
    const found = local.find(p => p.id === id);
    if (found) return found;

    try {
      const remote = await CloudSqlService.fetchProjectByIdOrSlug(id);
      if (remote) {
        setLocalData('projects', [...local.filter(p => p.id !== remote.id), remote]);
        return remote;
      }
    } catch (err) {
      console.warn('Failed to fetch project by id from Cloud SQL:', err);
    }
    return null;
  },

  async getBySlug(slug: string): Promise<Project | null> {
    const connected = isUserConnected();

    // Se conectado, prioriza buscar diretamente do banco para dados mais recentes
    if (connected) {
      try {
        const remote = await CloudSqlService.fetchProjectByIdOrSlug(slug);
        if (remote) {
          const local = getLocalData<Project>('projects', initialProjects);
          setLocalData('projects', [...local.filter(p => p.id !== remote.id), remote]);
          return remote;
        }
      } catch (err) {
        console.warn('Falha ao buscar projeto por slug do banco de dados:', err);
      }
    }

    // Fallback offline / não conectado
    const local = getLocalData<Project>('projects', initialProjects);
    const found = local.find(p => p.slug === slug || p.id === slug);
    if (found) return found;

    try {
      const remote = await CloudSqlService.fetchProjectByIdOrSlug(slug);
      if (remote) {
        setLocalData('projects', [...local.filter(p => p.id !== remote.id), remote]);
        return remote;
      }
    } catch (err) {
      console.warn('Failed to fetch project by slug from Cloud SQL:', err);
    }
    return null;
  },

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'slug'> & { slug?: string }): Promise<Project> {
    const id = 'proj_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const slugBase = data.slug ? slugify(data.slug) : slugify(data.name);

    const existing = getLocalData<Project>('projects', initialProjects);
    let finalSlug = slugBase;
    let counter = 1;
    while (existing.some(p => p.slug === finalSlug)) {
      finalSlug = `${slugBase}-${counter++}`;
    }

    const newProject: Project = {
      ...data,
      id,
      slug: finalSlug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newProject, ...existing];
    setLocalData('projects', updated);

    // Persist to Google Cloud SQL & Data Connect
    CloudSqlService.syncProject(newProject).catch(() => { });
    DataConnectService.syncProject(newProject).catch(() => { });

    await ColumnService.createDefaultColumns(id);
    return newProject;
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const list = getLocalData<Project>('projects', initialProjects);
    const index = list.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Projeto não encontrado');

    const updatedItem: Project = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedItem;
    setLocalData('projects', list);

    // Persist to Google Cloud SQL & Data Connect
    CloudSqlService.syncProject(updatedItem).catch(() => { });
    DataConnectService.syncProject(updatedItem).catch(() => { });
    return updatedItem;
  },

  async archive(id: string): Promise<Project> {
    return this.update(id, { status: 'ARQUIVADO' });
  },

  async touch(id: string): Promise<Project | null> {
    if (!id) return null;
    const list = getLocalData<Project>('projects', initialProjects);
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updatedItem: Project = {
      ...list[index],
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedItem;
    setLocalData('projects', list);

    // Persist to Google Cloud SQL & Data Connect
    CloudSqlService.syncProject(updatedItem).catch(() => { });
    DataConnectService.syncProject(updatedItem).catch(() => { });
    return updatedItem;
  },

  async delete(id: string): Promise<void> {
    const list = getLocalData<Project>('projects', initialProjects);
    const filtered = list.filter(p => p.id !== id);
    setLocalData('projects', filtered);

    // Persist deletion to Google Cloud SQL & Data Connect
    CloudSqlService.deleteProject(id).catch(() => { });
    DataConnectService.deleteProject(id).catch(() => { });
  }
};

export function deduplicateColumns(columns: ProjectColumn[]): ProjectColumn[] {
  const map = new Map<string, ProjectColumn>();
  for (const c of columns) {
    if (!c || !c.id) continue;
    // Each column belongs to a single specific project! Deduplication MUST be scoped per project:
    const key = `${c.projectId || ''}:${(c.key || slugify(c.name)).toLowerCase().trim()}`;
    if (!map.has(key)) {
      map.set(key, c);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.position - b.position);
}

// --- KANBAN COLUMNS SERVICE ---
export const ColumnService = {
  async getByProject(projectId: string): Promise<ProjectColumn[]> {
    const connected = isUserConnected();

    if (connected) {
      try {
        const remoteCols = await CloudSqlService.fetchColumns(projectId);
        if (remoteCols !== null) {
          if (remoteCols.length > 0) {
            const finalCols = deduplicateColumns(remoteCols);
            const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
            const otherCols = allCols.filter(c => c.projectId !== projectId);
            setLocalData('columns', [...otherCols, ...finalCols]);
            RealtimeSyncService.syncColumns(projectId, finalCols, 'sync_columns').catch(() => { });
            return finalCols;
          }
          // Projeto novo no banco sem colunas criadas ainda
          return await this.createDefaultColumns(projectId);
        }
      } catch (err) {
        console.warn('Falha ao buscar colunas do banco de dados:', err);
      }
    }

    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    let localCols = deduplicateColumns(allCols.filter(c => c.projectId === projectId));

    if (localCols.length === 0) {
      localCols = await this.createDefaultColumns(projectId);
    }

    // Sync with Realtime Database cache
    RealtimeSyncService.syncColumns(projectId, localCols, 'sync_columns').catch(() => { });
    return localCols;
  },

  async createDefaultColumns(projectId: string): Promise<ProjectColumn[]> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const existing = allCols.filter(c => c.projectId === projectId);
    if (existing.length > 0) {
      return deduplicateColumns(existing);
    }

    const defaults = [
      { name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', autoComplete: false },
      { name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', autoComplete: false },
      { name: 'Concluído', key: 'done', position: 2, color: '#10b981', autoComplete: true }
    ];

    const newCols: ProjectColumn[] = defaults.map((d) => ({
      id: `col_${projectId}_${d.key}`,
      projectId,
      name: d.name,
      key: d.key,
      position: d.position,
      color: d.color,
      autoComplete: d.autoComplete,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setLocalData('columns', [...allCols, ...newCols]);

    // Sync to Realtime DB and Google Cloud SQL
    RealtimeSyncService.syncColumns(projectId, newCols, 'col_defaults').catch(() => { });
    for (const c of newCols) {
      CloudSqlService.syncColumn(c).catch(() => { });
      DataConnectService.syncColumn(c).catch(() => { });
    }
    return newCols;
  },

  async create(projectId: string, name: string, color = '#6366f1', autoComplete = false): Promise<ProjectColumn> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const projectCols = allCols.filter(c => c.projectId === projectId);
    const id = `col_${projectId}_${slugify(name)}_${Math.random().toString(36).substring(2, 7)}`;

    const newCol: ProjectColumn = {
      id,
      projectId,
      name,
      key: slugify(name),
      position: projectCols.length,
      color,
      autoComplete,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('columns', [...allCols, newCol]);

    // Update project updatedAt
    ProjectService.touch(projectId).catch(() => { });

    // Sync to Realtime DB and Google Cloud SQL
    RealtimeSyncService.syncColumns(projectId, [...projectCols, newCol], 'col_create').catch(() => { });
    CloudSqlService.syncColumn(newCol).catch(() => { });
    DataConnectService.syncColumn(newCol).catch(() => { });
    return newCol;
  },

  async update(id: string, updates: Partial<ProjectColumn>): Promise<ProjectColumn> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const index = allCols.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Coluna não encontrada');

    allCols[index] = {
      ...allCols[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setLocalData('columns', allCols);

    // Update project updatedAt
    if (allCols[index].projectId) {
      ProjectService.touch(allCols[index].projectId).catch(() => { });
    }

    // Sync to Realtime DB and Google Cloud SQL
    const projCols = allCols.filter(c => c.projectId === allCols[index].projectId);
    RealtimeSyncService.syncColumns(allCols[index].projectId, projCols, 'col_update').catch(() => { });
    CloudSqlService.syncColumn(allCols[index]).catch(() => { });
    DataConnectService.syncColumn(allCols[index]).catch(() => { });
    return allCols[index];
  },

  async reorder(projectId: string, columnIds: string[]): Promise<ProjectColumn[]> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const projectCols = allCols.filter(c => c.projectId === projectId);
    const otherCols = allCols.filter(c => c.projectId !== projectId);

    const reordered: ProjectColumn[] = [];
    columnIds.forEach((id, index) => {
      const col = projectCols.find(c => c.id === id);
      if (col) {
        reordered.push({ ...col, position: index, updatedAt: new Date().toISOString() });
      }
    });

    const finalCols = [...otherCols, ...reordered];
    setLocalData('columns', finalCols);

    // Update project updatedAt
    ProjectService.touch(projectId).catch(() => { });

    // Sync to Realtime DB and Google Cloud SQL
    RealtimeSyncService.syncColumns(projectId, reordered, 'col_reorder').catch(() => { });
    for (const c of reordered) {
      CloudSqlService.syncColumn(c).catch(() => { });
      DataConnectService.syncColumn(c).catch(() => { });
    }
    return reordered;
  },

  async delete(columnId: string, fallbackColumnId?: string, projectId?: string): Promise<void> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const targetCol = allCols.find(c => c.id === columnId && (!projectId || c.projectId === projectId))
      || allCols.find(c => c.id === columnId);

    const targetProjectId = projectId || targetCol?.projectId;

    // Filter out only the column belonging to this project
    const remainingCols = allCols.filter(c => {
      if (c.id === columnId) {
        if (targetProjectId) {
          return c.projectId !== targetProjectId;
        }
        return false;
      }
      return true;
    });
    setLocalData('columns', remainingCols);

    // Handle tasks in this column: move to fallbackColumnId or delete ONLY for this project
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    let finalProjectTasks: Task[] = [];

    if (fallbackColumnId) {
      const fallbackTasks = allTasks.filter(t => t.columnId === fallbackColumnId && (!targetProjectId || t.projectId === targetProjectId));
      let nextPos = fallbackTasks.length;
      const updatedTasks = allTasks.map(t => {
        if (t.columnId === columnId && (!targetProjectId || t.projectId === targetProjectId)) {
          const moved = { ...t, columnId: fallbackColumnId, position: nextPos++, updatedAt: new Date().toISOString() };
          CloudSqlService.syncTask(moved).catch(() => { });
          DataConnectService.syncTask(moved).catch(() => { });
          return moved;
        }
        return t;
      });
      setLocalData('tasks', updatedTasks);
      finalProjectTasks = targetProjectId ? updatedTasks.filter(t => t.projectId === targetProjectId) : [];
    } else {
      const remainingTasks = allTasks.filter(t => !(t.columnId === columnId && (!targetProjectId || t.projectId === targetProjectId)));
      setLocalData('tasks', remainingTasks);
      finalProjectTasks = targetProjectId ? remainingTasks.filter(t => t.projectId === targetProjectId) : [];
    }

    if (targetProjectId) {
      const remainingProjectCols = remainingCols.filter(c => c.projectId === targetProjectId);
      RealtimeSyncService.deleteColumn(targetProjectId, columnId).catch(() => { });
      RealtimeSyncService.syncFullProjectBoard(targetProjectId, remainingProjectCols, finalProjectTasks).catch(() => { });
      ProjectService.touch(targetProjectId).catch(() => { });
    }
    CloudSqlService.deleteColumn(columnId, targetProjectId, fallbackColumnId).catch(() => { });
    DataConnectService.deleteColumn(columnId).catch(() => { });
  }
};

// --- TASKS SERVICE ---
export const TaskService = {
  async getByProject(projectId: string): Promise<Task[]> {
    const connected = isUserConnected();

    if (connected) {
      try {
        const remoteTasks = await CloudSqlService.fetchTasks(projectId);
        if (remoteTasks !== null) {
          const sorted = [...remoteTasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const allTasks = getLocalData<Task>('tasks', initialTasks);
          const otherTasks = allTasks.filter(t => t.projectId !== projectId);
          setLocalData('tasks', [...otherTasks, ...sorted]);

          const allCols = getLocalData<ProjectColumn>('columns', initialColumns).filter(c => c.projectId === projectId);
          RealtimeSyncService.syncFullProjectBoard(projectId, allCols, sorted).catch(() => { });
          return sorted;
        }
      } catch (err) {
        console.warn('Falha ao buscar atividades do banco de dados:', err);
      }
    }

    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const localTasks = allTasks.filter(t => t.projectId === projectId).sort((a, b) => a.position - b.position);

    // Cache to Realtime Database
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns).filter(c => c.projectId === projectId);
    RealtimeSyncService.syncFullProjectBoard(projectId, allCols, localTasks).catch(() => { });
    return localTasks;
  },

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'position'> & { position?: number }): Promise<Task> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);

    let targetColId = data.columnId;
    if (!targetColId) {
      const projCols = allCols.filter(c => c.projectId === data.projectId);
      if (projCols.length > 0) {
        targetColId = projCols[0].id;
      }
    }

    const targetCol = allCols.find(c => c.id === targetColId);
    const shouldComplete = targetCol?.autoComplete || targetCol?.key === 'done' || targetCol?.name.toLowerCase().includes('conclu');
    const concluded = data.concluded !== undefined ? Boolean(data.concluded) : Boolean(shouldComplete);

    const columnTasks = allTasks.filter(t => t.columnId === targetColId && (!data.projectId || t.projectId === data.projectId));
    const maxPos = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position ?? 0)) : -1;
    const finalPosition = data.position !== undefined ? data.position : maxPos + 1;
    const id = `task_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

    const newTask: Task = {
      ...data,
      columnId: targetColId,
      id,
      position: finalPosition,
      concluded,
      dueDate: data.dueDate || null,
      description: data.description || '',
      priority: data.priority || 'MEDIA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('tasks', [...allTasks, newTask]);

    // Update project updatedAt
    if (newTask.projectId) {
      ProjectService.touch(newTask.projectId).catch(() => { });
    }

    // Persist to Realtime Database, Google Cloud SQL, and Data Connect
    RealtimeSyncService.syncTask(newTask, 'task_create').catch(() => { });
    CloudSqlService.syncTask(newTask).catch(() => { });
    DataConnectService.syncTask(newTask).catch(() => { });
    return newTask;
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const index = allTasks.findIndex(t => t.id === id);
    let updatedItem: Task;

    if (index === -1) {
      const targetColId = updates.columnId || 'col-1';
      const targetCol = allCols.find(c => c.id === targetColId);
      const shouldComplete = targetCol?.autoComplete || targetCol?.key === 'done' || targetCol?.name.toLowerCase().includes('conclu');
      const concluded = updates.concluded !== undefined ? Boolean(updates.concluded) : Boolean(shouldComplete);

      updatedItem = {
        id,
        projectId: updates.projectId || 'proj-1',
        columnId: targetColId,
        title: updates.title || 'Nova Atividade',
        description: updates.description || '',
        priority: updates.priority || 'MEDIA',
        position: updates.position || 0,
        concluded,
        dueDate: updates.dueDate || null,
        createdById: updates.createdById || 'demo-user-123',
        createdByName: updates.createdByName || 'Victor Reghini',
        createdAt: updates.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalData('tasks', [...allTasks, updatedItem]);
    } else {
      const currentTask = allTasks[index];
      let position = updates.position !== undefined ? updates.position : currentTask.position;

      let concluded = updates.concluded !== undefined ? updates.concluded : currentTask.concluded;
      if (updates.columnId && updates.columnId !== currentTask.columnId) {
        if (updates.position === undefined) {
          const destColumnTasks = allTasks.filter(t => t.columnId === updates.columnId && t.id !== id);
          position = destColumnTasks.length;
        }
        const targetCol = allCols.find(c => c.id === updates.columnId);
        if (targetCol && (targetCol.autoComplete || targetCol.key === 'done' || targetCol.name.toLowerCase().includes('conclu'))) {
          concluded = true;
        }
      }

      updatedItem = {
        ...currentTask,
        ...updates,
        position,
        concluded: concluded ?? false,
        updatedAt: new Date().toISOString()
      };
      allTasks[index] = updatedItem;
      setLocalData('tasks', allTasks);
    }

    // Update project updatedAt
    if (updatedItem.projectId) {
      ProjectService.touch(updatedItem.projectId).catch(() => { });
    }

    // Persist to Realtime Database, Google Cloud SQL, and Data Connect
    RealtimeSyncService.syncTask(updatedItem, 'task_update').catch(() => { });
    CloudSqlService.syncTask(updatedItem).catch(() => { });
    DataConnectService.syncTask(updatedItem).catch(() => { });
    return updatedItem;
  },

  async move(taskId: string, targetColumnId: string, newPosition: number): Promise<void> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const targetCol = allCols.find(c => c.id === targetColumnId);
    const shouldComplete = Boolean(targetCol?.autoComplete || targetCol?.key === 'done' || targetCol?.name.toLowerCase().includes('conclu'));

    const otherTasksInTarget = allTasks
      .filter(t => t.columnId === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    const movedTask: Task = {
      ...task,
      columnId: targetColumnId,
      position: newPosition,
      concluded: shouldComplete ? true : (task.concluded ?? false),
      updatedAt: new Date().toISOString()
    };
    otherTasksInTarget.splice(newPosition, 0, movedTask);

    const updatedColumnTasks = otherTasksInTarget.map((t, idx) => ({
      ...t,
      position: idx,
      updatedAt: new Date().toISOString()
    }));

    const finalTasks = allTasks.map(t => {
      const match = updatedColumnTasks.find(u => u.id === t.id);
      return match || t;
    });

    setLocalData('tasks', finalTasks);

    // Update project updatedAt
    if (task.projectId) {
      ProjectService.touch(task.projectId).catch(() => { });
    }

    // Persist to Realtime Database, Google Cloud SQL, and Data Connect
    RealtimeSyncService.syncTaskMove(task.projectId, updatedColumnTasks).catch(() => { });
    for (const t of updatedColumnTasks) {
      CloudSqlService.syncTask(t).catch(() => { });
      DataConnectService.syncTask(t).catch(() => { });
    }
  },

  async delete(id: string): Promise<void> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const taskToDelete = allTasks.find(t => t.id === id);
    setLocalData('tasks', allTasks.filter(t => t.id !== id));

    if (taskToDelete?.projectId) {
      RealtimeSyncService.deleteTask(taskToDelete.projectId, id).catch(() => { });
      ProjectService.touch(taskToDelete.projectId).catch(() => { });
    }
    CloudSqlService.deleteTask(id).catch(() => { });
    DataConnectService.deleteTask(id).catch(() => { });
  }
};

// --- IDEAS SERVICE ---
export const IdeaService = {
  async getAll(userId?: string): Promise<Idea[]> {
    const connected = isUserConnected(userId);

    if (connected) {
      try {
        const remote = await CloudSqlService.fetchIdeas();
        if (remote !== null) {
          setLocalData('ideas', remote);
          if (userId) {
            return remote.filter(i => i.ownerId === userId || i.visibility === 'PUBLIC' || i.visibility === 'SHARED');
          }
          return remote;
        }
      } catch (err) {
        console.warn('Falha ao buscar ideias do banco de dados:', err);
      }
    }

    const local = getLocalData<Idea>('ideas', initialIdeas);
    if (userId) {
      return local.filter(i => i.ownerId === userId || i.visibility === 'PUBLIC' || i.visibility === 'SHARED');
    }
    return local;
  },

  async getById(id: string): Promise<Idea | null> {
    const connected = isUserConnected();

    if (connected) {
      try {
        const remote = await CloudSqlService.fetchIdeas();
        if (remote !== null) {
          const found = remote.find(i => i.id === id);
          if (found) {
            setLocalData('ideas', remote);
            return found;
          }
        }
      } catch { }
    }

    const local = getLocalData<Idea>('ideas', initialIdeas);
    return local.find(i => i.id === id) || null;
  },

  async create(data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt' | 'convertedProjectId'>): Promise<Idea> {
    const allIdeas = getLocalData<Idea>('ideas', initialIdeas);
    const id = `idea_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const newIdea: Idea = {
      ...data,
      id,
      convertedProjectId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('ideas', [newIdea, ...allIdeas]);
    CloudSqlService.syncIdea(newIdea).catch(() => { });
    return newIdea;
  },

  async update(id: string, updates: Partial<Idea>): Promise<Idea> {
    const allIdeas = getLocalData<Idea>('ideas', initialIdeas);
    const index = allIdeas.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Ideia não encontrada');

    allIdeas[index] = {
      ...allIdeas[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setLocalData('ideas', allIdeas);
    CloudSqlService.syncIdea(allIdeas[index]).catch(() => { });
    return allIdeas[index];
  },

  async convertToProject(ideaId: string, ownerId: string, ownerName: string): Promise<Project> {
    const idea = await this.getById(ideaId);
    if (!idea) throw new Error('Ideia não encontrada');

    const newProject = await ProjectService.create({
      ownerId,
      ownerName,
      name: idea.title,
      description: idea.description,
      shortDescription: idea.description.substring(0, 160),
      visibility: idea.visibility,
      status: 'PLANEJAMENTO',
      technologies: idea.technologies || [],
      links: idea.links || [],
      readme: `# ${idea.title}\n\n${idea.description}\n\n*Convertido a partir de ideia.*`
    });

    await this.update(ideaId, {
      status: 'CONVERTIDA',
      convertedProjectId: newProject.id
    });

    return newProject;
  },

  async delete(id: string): Promise<void> {
    const allIdeas = getLocalData<Idea>('ideas', initialIdeas);
    setLocalData('ideas', allIdeas.filter(i => i.id !== id));
    CloudSqlService.deleteIdea(id).catch(() => { });
  }
};

// --- PROJECT DOCUMENTS SERVICE ---
export const DocumentService = {
  async getByProject(projectId: string): Promise<ProjectDocument[]> {
    const connected = isUserConnected();

    if (connected) {
      try {
        const remote = await CloudSqlService.fetchDocuments(projectId);
        if (remote !== null) {
          const sorted = [...remote].sort((a, b) => a.position - b.position);
          const docs = getLocalData<ProjectDocument>('documents', initialDocs);
          const otherDocs = docs.filter(d => d.projectId !== projectId);
          setLocalData('documents', [...otherDocs, ...sorted]);
          return sorted;
        }
      } catch (err) {
        console.warn('Falha ao buscar documentos do banco de dados:', err);
      }
    }

    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    return docs.filter(d => d.projectId === projectId).sort((a, b) => a.position - b.position);
  },

  async create(data: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectDocument> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    const id = `doc_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const newDoc: ProjectDocument = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('documents', [...docs, newDoc]);
    if (newDoc.projectId) {
      ProjectService.touch(newDoc.projectId).catch(() => { });
    }
    CloudSqlService.syncDocument(newDoc).catch(() => { });
    return newDoc;
  },

  async update(id: string, updates: Partial<ProjectDocument>): Promise<ProjectDocument> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Documento não encontrado');

    const projectId = docs[index].projectId;
    docs[index] = {
      ...docs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setLocalData('documents', docs);
    if (projectId) {
      ProjectService.touch(projectId).catch(() => { });
    }
    CloudSqlService.syncDocument(docs[index]).catch(() => { });
    return docs[index];
  },

  async delete(id: string): Promise<void> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    const docToDelete = docs.find(d => d.id === id);
    setLocalData('documents', docs.filter(d => d.id !== id));
    if (docToDelete?.projectId) {
      ProjectService.touch(docToDelete.projectId).catch(() => { });
    }
    CloudSqlService.deleteDocument(id).catch(() => { });
  }
};

// --- SUGGESTIONS SERVICE ---
export const SuggestionService = {
  async getByProject(projectId: string): Promise<Suggestion[]> {
    const connected = isUserConnected();

    if (connected) {
      try {
        const remote = await CloudSqlService.fetchSuggestions(projectId);
        if (remote !== null) {
          const sorted = [...remote].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
          const other = list.filter(s => s.projectId !== projectId);
          setLocalData('suggestions', [...other, ...sorted]);
          return sorted;
        }
      } catch (err) {
        console.warn('Falha ao buscar sugestões do banco de dados:', err);
      }
    }

    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    return list.filter(s => s.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(data: Omit<Suggestion, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Suggestion> {
    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    const id = `sug_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const newSug: Suggestion = {
      ...data,
      id,
      status: 'ABERTO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('suggestions', [newSug, ...list]);
    if (newSug.projectId) {
      ProjectService.touch(newSug.projectId).catch(() => { });
    }
    CloudSqlService.syncSuggestion(newSug).catch(() => { });
    return newSug;
  },

  async updateStatus(id: string, status: Suggestion['status']): Promise<Suggestion> {
    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    const index = list.findIndex(s => s.id === id);
    if (index === -1) {
      const item: Suggestion = {
        id,
        projectId: 'proj-1',
        authorUserId: null,
        authorName: 'Usuário',
        authorEmail: null,
        title: 'Sugestão',
        description: '',
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalData('suggestions', [...list, item]);
      if (item.projectId) {
        ProjectService.touch(item.projectId).catch(() => { });
      }
      CloudSqlService.syncSuggestion(item).catch(() => { });
      return item;
    }

    const projId = list[index].projectId;
    list[index] = {
      ...list[index],
      status,
      updatedAt: new Date().toISOString()
    };

    setLocalData('suggestions', list);
    if (projId) {
      ProjectService.touch(projId).catch(() => { });
    }
    CloudSqlService.syncSuggestion(list[index]).catch(() => { });
    return list[index];
  },

  async delete(id: string): Promise<void> {
    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    const sugToDelete = list.find(s => s.id === id);
    setLocalData('suggestions', list.filter(s => s.id !== id));
    if (sugToDelete?.projectId) {
      ProjectService.touch(sugToDelete.projectId).catch(() => { });
    }
    CloudSqlService.deleteSuggestion(id).catch(() => { });
  }
};

// --- BUG REPORT SERVICE ---
export const BugReportService = {
  async getByProject(projectId: string): Promise<BugReport[]> {
    const connected = isUserConnected();

    if (connected) {
      try {
        const remote = await CloudSqlService.fetchBugs(projectId);
        if (remote !== null) {
          const sorted = [...remote].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const list = getLocalData<BugReport>('bugs', initialBugs);
          const other = list.filter(b => b.projectId !== projectId);
          setLocalData('bugs', [...other, ...sorted]);
          return sorted;
        }
      } catch (err) {
        console.warn('Falha ao buscar bugs do banco de dados:', err);
      }
    }

    const list = getLocalData<BugReport>('bugs', initialBugs);
    return list.filter(b => b.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(data: Omit<BugReport, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<BugReport> {
    const list = getLocalData<BugReport>('bugs', initialBugs);
    const id = `bug_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const newBug: BugReport = {
      ...data,
      id,
      status: 'ABERTO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('bugs', [newBug, ...list]);
    if (newBug.projectId) {
      ProjectService.touch(newBug.projectId).catch(() => { });
    }
    CloudSqlService.syncBugReport(newBug).catch(() => { });
    return newBug;
  },

  async updateStatus(id: string, status: BugReport['status']): Promise<BugReport> {
    const list = getLocalData<BugReport>('bugs', initialBugs);
    const index = list.findIndex(b => b.id === id);
    if (index === -1) {
      const item: BugReport = {
        id,
        projectId: 'proj-1',
        authorUserId: null,
        authorName: 'Usuário',
        authorEmail: null,
        title: 'Bug Report',
        description: '',
        severity: 'MEDIA',
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLocalData('bugs', [...list, item]);
      if (item.projectId) {
        ProjectService.touch(item.projectId).catch(() => { });
      }
      CloudSqlService.syncBugReport(item).catch(() => { });
      return item;
    }

    const projId = list[index].projectId;
    list[index] = {
      ...list[index],
      status,
      updatedAt: new Date().toISOString()
    };

    setLocalData('bugs', list);
    if (projId) {
      ProjectService.touch(projId).catch(() => { });
    }
    CloudSqlService.syncBugReport(list[index]).catch(() => { });
    return list[index];
  },

  async delete(id: string): Promise<void> {
    const list = getLocalData<BugReport>('bugs', initialBugs);
    const bugToDelete = list.find(b => b.id === id);
    setLocalData('bugs', list.filter(b => b.id !== id));
    if (bugToDelete?.projectId) {
      ProjectService.touch(bugToDelete.projectId).catch(() => { });
    }
    CloudSqlService.deleteBugReport(id).catch(() => { });
  },

  async uploadScreenshot(file: File): Promise<string> {
    try {
      const storageRef = ref(storage, `bug-reports/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('Firebase Storage upload fallback to Data URL:', err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }
};

// --- PROJECT MEMBERS SERVICE ---
export const MemberService = {
  async getByProject(projectId: string): Promise<ProjectMember[]> {
    const members = getLocalData<ProjectMember>('members', []);
    return members.filter(m => m.projectId === projectId);
  },

  async addMember(projectId: string, email: string, name: string, role: ProjectMember['role']): Promise<ProjectMember> {
    const members = getLocalData<ProjectMember>('members', []);
    const id = `mem_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const newMember: ProjectMember = {
      id,
      projectId,
      userId: `user_${Math.random().toString(36).substring(2, 9)}`,
      userEmail: email,
      userName: name,
      role,
      createdAt: new Date().toISOString()
    };

    setLocalData('members', [...members, newMember]);
    ProjectService.touch(projectId).catch(() => { });
    return newMember;
  },

  async removeMember(memberId: string): Promise<void> {
    const members = getLocalData<ProjectMember>('members', []);
    const memberToDelete = members.find(m => m.id === memberId);
    setLocalData('members', members.filter(m => m.id !== memberId));
    if (memberToDelete?.projectId) {
      ProjectService.touch(memberToDelete.projectId).catch(() => { });
    }
  }
};

// --- USER PROFILE & AVATAR SERVICE ---
export const UserService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const storageRef = ref(storage, `avatars/${userId}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('Firebase Storage avatar upload fallback to Data URL:', err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }
};

// Helper to batch-sync all local entities to Google Cloud SQL
export async function syncAllLocalToCloudSql(): Promise<{ success: boolean; message: string; syncedCount?: any }> {
  const projects = getLocalData<Project>('projects', initialProjects);
  const columns = getLocalData<ProjectColumn>('columns', initialColumns);
  const tasks = getLocalData<Task>('tasks', initialTasks);
  const ideas = getLocalData<Idea>('ideas', initialIdeas);
  const documents = getLocalData<ProjectDocument>('documents', initialDocs);
  const suggestions = getLocalData<Suggestion>('suggestions', initialSuggestions);
  const bugs = getLocalData<BugReport>('bugs', initialBugs);

  return CloudSqlService.syncAll({ projects, columns, tasks, ideas, documents, suggestions, bugs });
}

// Helper to generate SQL INSERT statements for direct execution in Cloud SQL Studio
export function generateCloudSqlScript(): string {
  const projects = getLocalData<Project>('projects', initialProjects);
  const columns = getLocalData<ProjectColumn>('columns', initialColumns);
  const tasks = getLocalData<Task>('tasks', initialTasks);
  const ideas = getLocalData<Idea>('ideas', initialIdeas);
  const documents = getLocalData<ProjectDocument>('documents', initialDocs);
  const suggestions = getLocalData<Suggestion>('suggestions', initialSuggestions);
  const bugs = getLocalData<BugReport>('bugs', initialBugs);

  return CloudSqlService.generateSqlScript({ projects, columns, tasks, ideas, documents, suggestions, bugs });
}

// Global hydration helper to fetch all remote data from Cloud SQL and update local storage
export async function hydrateFromCloudSql(): Promise<boolean> {
  try {
    const all = await CloudSqlService.fetchAll();
    if (!all) return false;

    if (all.projects && Array.isArray(all.projects)) {
      setLocalData('projects', all.projects);
    }
    if (all.columns && Array.isArray(all.columns)) {
      setLocalData('columns', deduplicateColumns(all.columns));
    }
    if (all.tasks && Array.isArray(all.tasks)) {
      setLocalData('tasks', all.tasks);
    }
    if (all.ideas && Array.isArray(all.ideas)) {
      setLocalData('ideas', all.ideas);
    }
    if (all.documents && Array.isArray(all.documents)) {
      setLocalData('documents', all.documents);
    }
    if (all.suggestions && Array.isArray(all.suggestions)) {
      setLocalData('suggestions', all.suggestions);
    }
    if (all.bugs && Array.isArray(all.bugs)) {
      setLocalData('bugs', all.bugs);
    }
    return true;
  } catch (err) {
    console.warn('Hydration from Cloud SQL failed:', err);
    return false;
  }
}

