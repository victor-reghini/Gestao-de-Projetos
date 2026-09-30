export type Visibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

export type ProjectStatus = 'PLANEJAMENTO' | 'EM_ANDAMENTO' | 'PAUSADO' | 'CONCLUIDO' | 'ARQUIVADO';

export type TaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type IdeaStatus = 'NOVA' | 'EM_ANALISE' | 'VALIDADA' | 'ARQUIVADA' | 'CONVERTIDA';

export type MemberRole = 'owner' | 'editor' | 'viewer';

export type ItemStatus = 'ABERTO' | 'EM_ANALISE' | 'ACEITO' | 'REJEITADO' | 'RESOLVIDO';

export type BugSeverity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type DocumentType = 'markdown' | 'mermaid' | 'diagram' | 'note';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  url: string;
  owner: string;
  name: string;
  defaultBranch: string;
}

export interface ProjectLink {
  title: string;
  url: string;
}

export interface Project {
  id: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description: string;
  visibility: Visibility;
  status: ProjectStatus;
  technologies: string[];
  links: ProjectLink[];
  repository?: Repository;
  readme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: MemberRole;
  createdAt: string;
}

export interface ProjectColumn {
  id: string;
  projectId: string;
  name: string;
  key: string;
  position: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  position: number;
  dueDate?: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Idea {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description: string;
  visibility: Visibility;
  status: IdeaStatus;
  technologies: string[];
  links: ProjectLink[];
  convertedProjectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Suggestion {
  id: string;
  projectId: string;
  authorUserId?: string | null;
  authorName: string;
  authorEmail?: string | null;
  title: string;
  description: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BugReport {
  id: string;
  projectId: string;
  authorUserId?: string | null;
  authorName: string;
  authorEmail?: string | null;
  title: string;
  description: string;
  severity: BugSeverity;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  observedBehavior?: string;
  environment?: string;
  imageUrl?: string | null;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  ownerId: string;
  projectId?: string | null;
  name: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
