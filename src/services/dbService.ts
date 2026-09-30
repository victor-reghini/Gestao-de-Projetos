import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
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

// Helper for local mock fallback storage
const LOCAL_STORAGE_KEY_PREFIX = 'gestao_projetos_db_';

function getLocalData<T>(key: string, defaultValue: T[]): T[] {
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

// Initial seed sample data for an impressive first impression
const initialProjects: Project[] = [
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

const initialColumns: ProjectColumn[] = [
  { id: 'col-1', projectId: 'proj-1', name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-2', projectId: 'proj-1', name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-3', projectId: 'proj-1', name: 'Revisão / Testes', key: 'review', position: 2, color: '#f59e0b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-4', projectId: 'proj-1', name: 'Concluído', key: 'done', position: 3, color: '#10b981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  { id: 'col-20', projectId: 'proj-2', name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-21', projectId: 'proj-2', name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-22', projectId: 'proj-2', name: 'Concluído', key: 'done', position: 2, color: '#10b981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const initialTasks: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    columnId: 'col-2',
    title: 'Implementar endpoints públicos da API v1',
    description: 'Criar handlers REST em Netlify Functions com rate limiting e documentação Swagger.',
    priority: 'ALTA',
    position: 0,
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
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    createdById: 'demo-user-123',
    createdByName: 'Victor Reghini',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const initialIdeas: Idea[] = [
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

const initialDocs: ProjectDocument[] = [
  {
    id: 'doc-1',
    projectId: 'proj-1',
    type: 'markdown',
    title: 'Visão Geral da Arquitetura',
    content: `# Arquitetura do Sistema

O **Gestor de Projetos e Ideias** foi concebido com os seguintes pilares:

1. **Frontend:** React + Vite + TypeScript.
2. **Backend/API:** Serverless Netlify Functions disponibilizando endpoints REST em \`/api/v1\`.
3. **Persistência:** Firebase Firestore com suporte a dados relacionais e modo offline resiliente.
4. **Armazenamento:** Firebase Storage para prints de tela em reportes de bugs.

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
    Client -->|Auth & Sync| Firebase[Firebase Auth & Firestore]
    ExternalApp[Aplicações Externas] -->|REST API v1| NetlifyFunctions[Netlify Functions /api/v1]
    NetlifyFunctions -->|Persistência| Firebase
    Client -->|Upload Anexos| Storage[Firebase Storage]
`,
    position: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const initialSuggestions: Suggestion[] = [
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

const initialBugs: BugReport[] = [
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

// Ensure local seed on first load
function ensureSeedData() {
  if (!localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'projects')) {
    setLocalData('projects', initialProjects);
    setLocalData('columns', initialColumns);
    setLocalData('tasks', initialTasks);
    setLocalData('ideas', initialIdeas);
    setLocalData('documents', initialDocs);
    setLocalData('suggestions', initialSuggestions);
    setLocalData('bugs', initialBugs);
    setLocalData('members', []);
  }
}
ensureSeedData();

// --- PROJECT SERVICE ---
export const ProjectService = {
  async getAll(userId?: string): Promise<Project[]> {
    try {
      if (userId) {
        // Query projects owned by user or shared/public
        const local = getLocalData<Project>('projects', initialProjects);
        return local.filter(p => p.ownerId === userId || p.visibility === 'PUBLIC' || p.visibility === 'SHARED');
      }
      return getLocalData<Project>('projects', initialProjects);
    } catch {
      return getLocalData<Project>('projects', initialProjects);
    }
  },

  async getPublicProjects(): Promise<Project[]> {
    const list = getLocalData<Project>('projects', initialProjects);
    return list.filter(p => p.visibility === 'PUBLIC' && p.status !== 'ARQUIVADO');
  },

  async getById(id: string): Promise<Project | null> {
    const list = getLocalData<Project>('projects', initialProjects);
    return list.find(p => p.id === id) || null;
  },

  async getBySlug(slug: string): Promise<Project | null> {
    const list = getLocalData<Project>('projects', initialProjects);
    return list.find(p => p.slug === slug || p.id === slug) || null;
  },

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'slug'> & { slug?: string }): Promise<Project> {
    const id = 'proj_' + Math.random().toString(36).substring(2, 9);
    const slugBase = data.slug ? slugify(data.slug) : slugify(data.name);
    
    // Ensure slug uniqueness
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

    // Safely attempt Firebase Firestore write in background without blocking
    try {
      setDoc(doc(db, 'projects', id), newProject).catch((err) => {
        // Safe logging for offline/unconfigured Firestore
      });
    } catch {
      // Ignored for resilient offline mode
    }

    // Automatically create default columns: Backlog, Em Execução, Concluído
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

    try {
      updateDoc(doc(db, 'projects', id), { ...updates, updatedAt: updatedItem.updatedAt }).catch(() => {});
    } catch {
      // Ignored for resilient offline mode
    }

    return updatedItem;
  },

  async archive(id: string): Promise<Project> {
    return this.update(id, { status: 'ARQUIVADO' });
  },

  async delete(id: string): Promise<void> {
    const list = getLocalData<Project>('projects', initialProjects);
    const filtered = list.filter(p => p.id !== id);
    setLocalData('projects', filtered);

    try {
      deleteDoc(doc(db, 'projects', id)).catch(() => {});
    } catch {
      // Ignored for resilient offline mode
    }
  }
};

// --- KANBAN COLUMNS SERVICE ---
export const ColumnService = {
  async getByProject(projectId: string): Promise<ProjectColumn[]> {
    const list = getLocalData<ProjectColumn>('columns', initialColumns);
    const cols = list.filter(c => c.projectId === projectId);
    return cols.sort((a, b) => a.position - b.position);
  },

  async createDefaultColumns(projectId: string): Promise<ProjectColumn[]> {
    const defaults = [
      { name: 'Backlog', key: 'backlog', position: 0, color: '#64748b' },
      { name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1' },
      { name: 'Concluído', key: 'done', position: 2, color: '#10b981' }
    ];

    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const newCols: ProjectColumn[] = defaults.map((d, index) => ({
      id: `col_${projectId}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      name: d.name,
      key: d.key,
      position: d.position,
      color: d.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setLocalData('columns', [...allCols, ...newCols]);
    return newCols;
  },

  async create(projectId: string, name: string, color = '#6366f1'): Promise<ProjectColumn> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const projectCols = allCols.filter(c => c.projectId === projectId);
    
    const newCol: ProjectColumn = {
      id: `col_${Math.random().toString(36).substring(2, 9)}`,
      projectId,
      name,
      key: slugify(name),
      position: projectCols.length,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('columns', [...allCols, newCol]);
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
    return allCols[index];
  },

  async reorder(projectId: string, orderedColumnIds: string[]): Promise<void> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const updated = allCols.map(col => {
      if (col.projectId === projectId) {
        const newPos = orderedColumnIds.indexOf(col.id);
        if (newPos !== -1) {
          return { ...col, position: newPos, updatedAt: new Date().toISOString() };
        }
      }
      return col;
    });

    setLocalData('columns', updated);
  },

  async delete(columnId: string, targetFallbackColumnId?: string): Promise<void> {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const colToDelete = allCols.find(c => c.id === columnId);
    if (!colToDelete) return;

    // Migrate tasks if fallback is provided
    if (targetFallbackColumnId) {
      const allTasks = getLocalData<Task>('tasks', initialTasks);
      const migratedTasks = allTasks.map(t => {
        if (t.columnId === columnId) {
          return { ...t, columnId: targetFallbackColumnId, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      setLocalData('tasks', migratedTasks);
    }

    setLocalData('columns', allCols.filter(c => c.id !== columnId));
  }
};

// --- TASKS SERVICE ---
export const TaskService = {
  async getByProject(projectId: string): Promise<Task[]> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    return allTasks.filter(t => t.projectId === projectId).sort((a, b) => a.position - b.position);
  },

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const columnTasks = allTasks.filter(t => t.columnId === data.columnId);

    const newTask: Task = {
      ...data,
      id: `task_${Math.random().toString(36).substring(2, 9)}`,
      position: data.position !== undefined ? data.position : columnTasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('tasks', [...allTasks, newTask]);
    return newTask;
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const index = allTasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Atividade não encontrada');

    allTasks[index] = {
      ...allTasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setLocalData('tasks', allTasks);
    return allTasks[index];
  },

  async move(taskId: string, targetColumnId: string, newPosition: number): Promise<void> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    // Reorder destination column
    const otherTasksInTarget = allTasks
      .filter(t => t.columnId === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    otherTasksInTarget.splice(newPosition, 0, { ...task, columnId: targetColumnId, position: newPosition });

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
  },

  async delete(id: string): Promise<void> {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    setLocalData('tasks', allTasks.filter(t => t.id !== id));
  }
};

// --- IDEAS SERVICE ---
export const IdeaService = {
  async getAll(userId?: string): Promise<Idea[]> {
    const list = getLocalData<Idea>('ideas', initialIdeas);
    if (userId) {
      return list.filter(i => i.ownerId === userId || i.visibility === 'PUBLIC' || i.visibility === 'SHARED');
    }
    return list;
  },

  async getById(id: string): Promise<Idea | null> {
    const list = getLocalData<Idea>('ideas', initialIdeas);
    return list.find(i => i.id === id) || null;
  },

  async create(data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt' | 'convertedProjectId'>): Promise<Idea> {
    const allIdeas = getLocalData<Idea>('ideas', initialIdeas);
    const newIdea: Idea = {
      ...data,
      id: `idea_${Math.random().toString(36).substring(2, 9)}`,
      convertedProjectId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('ideas', [newIdea, ...allIdeas]);
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
    return allIdeas[index];
  },

  async convertToProject(ideaId: string, ownerId: string, ownerName: string): Promise<Project> {
    const idea = await this.getById(ideaId);
    if (!idea) throw new Error('Ideia não encontrada');

    // Create the project from the idea
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

    // Update the idea status and converted link
    await this.update(ideaId, {
      status: 'CONVERTIDA',
      convertedProjectId: newProject.id
    });

    return newProject;
  },

  async delete(id: string): Promise<void> {
    const allIdeas = getLocalData<Idea>('ideas', initialIdeas);
    setLocalData('ideas', allIdeas.filter(i => i.id !== id));
  }
};

// --- PROJECT DOCUMENTS SERVICE ---
export const DocumentService = {
  async getByProject(projectId: string): Promise<ProjectDocument[]> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    return docs.filter(d => d.projectId === projectId).sort((a, b) => a.position - b.position);
  },

  async create(data: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectDocument> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    const newDoc: ProjectDocument = {
      ...data,
      id: `doc_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('documents', [...docs, newDoc]);
    return newDoc;
  },

  async update(id: string, updates: Partial<ProjectDocument>): Promise<ProjectDocument> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Documento não encontrado');

    docs[index] = {
      ...docs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setLocalData('documents', docs);
    return docs[index];
  },

  async delete(id: string): Promise<void> {
    const docs = getLocalData<ProjectDocument>('documents', initialDocs);
    setLocalData('documents', docs.filter(d => d.id !== id));
  }
};

// --- SUGGESTIONS SERVICE ---
export const SuggestionService = {
  async getByProject(projectId: string): Promise<Suggestion[]> {
    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    return list.filter(s => s.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(data: Omit<Suggestion, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Suggestion> {
    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    const newSug: Suggestion = {
      ...data,
      id: `sug_${Math.random().toString(36).substring(2, 9)}`,
      status: 'ABERTO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('suggestions', [newSug, ...list]);
    return newSug;
  },

  async updateStatus(id: string, status: Suggestion['status']): Promise<Suggestion> {
    const list = getLocalData<Suggestion>('suggestions', initialSuggestions);
    const index = list.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Sugestão não encontrada');

    list[index] = {
      ...list[index],
      status,
      updatedAt: new Date().toISOString()
    };

    setLocalData('suggestions', list);
    return list[index];
  }
};

// --- BUG REPORT SERVICE ---
export const BugReportService = {
  async getByProject(projectId: string): Promise<BugReport[]> {
    const list = getLocalData<BugReport>('bugs', initialBugs);
    return list.filter(b => b.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(data: Omit<BugReport, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<BugReport> {
    const list = getLocalData<BugReport>('bugs', initialBugs);
    const newBug: BugReport = {
      ...data,
      id: `bug_${Math.random().toString(36).substring(2, 9)}`,
      status: 'ABERTO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalData('bugs', [newBug, ...list]);
    return newBug;
  },

  async updateStatus(id: string, status: BugReport['status']): Promise<BugReport> {
    const list = getLocalData<BugReport>('bugs', initialBugs);
    const index = list.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Bug report não encontrado');

    list[index] = {
      ...list[index],
      status,
      updatedAt: new Date().toISOString()
    };

    setLocalData('bugs', list);
    return list[index];
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
    const newMember: ProjectMember = {
      id: `mem_${Math.random().toString(36).substring(2, 9)}`,
      projectId,
      userId: `user_${Math.random().toString(36).substring(2, 9)}`,
      userEmail: email,
      userName: name,
      role,
      createdAt: new Date().toISOString()
    };

    setLocalData('members', [...members, newMember]);
    return newMember;
  },

  async removeMember(memberId: string): Promise<void> {
    const members = getLocalData<ProjectMember>('members', []);
    setLocalData('members', members.filter(m => m.id !== memberId));
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

