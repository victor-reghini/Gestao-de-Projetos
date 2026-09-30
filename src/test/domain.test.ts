import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ProjectService, 
  ColumnService, 
  TaskService, 
  IdeaService, 
  SuggestionService,
  BugReportService,
  slugify 
} from '@/services/dbService';

describe('Domain & Business Rules Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('slugify utility', () => {
    it('generates URL-safe lowercase slugs removing accents and special characters', () => {
      expect(slugify('Gestão de Projetos & Ideias!')).toBe('gestao-de-projetos-ideias');
      expect(slugify('API de Autenticação Biométrica 2.0')).toBe('api-de-autenticacao-biometrica-20');
      expect(slugify('  Projeto   com   Múltiplos   Espaços  ')).toBe('projeto-com-multiplos-espacos');
    });
  });

  describe('Project Service', () => {
    it('creates a project with auto-generated unique slug and default Kanban columns', async () => {
      const project = await ProjectService.create({
        ownerId: 'user-1',
        ownerName: 'Test Owner',
        name: 'Plataforma Web 3.0',
        description: 'Descrição do projeto de teste',
        visibility: 'PUBLIC',
        status: 'PLANEJAMENTO',
        technologies: ['React', 'TypeScript'],
        links: []
      });

      expect(project.id).toBeDefined();
      expect(project.slug).toBe('plataforma-web-30');
      expect(project.visibility).toBe('PUBLIC');

      // Verify default columns: Backlog, Em Execução, Concluído
      const columns = await ColumnService.getByProject(project.id);
      expect(columns.length).toBe(3);
      expect(columns[0].name).toBe('Backlog');
      expect(columns[1].name).toBe('Em Execução');
      expect(columns[2].name).toBe('Concluído');
    });

    it('filters public projects correctly for unauthenticated visitors', async () => {
      await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Público',
        description: 'Desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Privado',
        description: 'Desc',
        visibility: 'PRIVATE',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const publicList = await ProjectService.getPublicProjects();
      expect(publicList.every(p => p.visibility === 'PUBLIC')).toBe(true);
    });

    it('archives a project changing its status', async () => {
      const p = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Antigo',
        description: 'Desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const archived = await ProjectService.archive(p.id);
      expect(archived.status).toBe('ARQUIVADO');
    });
  });

  describe('Kanban Tasks & Drag-and-Drop', () => {
    it('creates a task and allows moving between columns', async () => {
      const proj = await ProjectService.create({
        ownerId: 'user-1',
        name: 'App Kanban',
        description: 'Desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const cols = await ColumnService.getByProject(proj.id);
      const backlogCol = cols[0];
      const doneCol = cols[2];

      const task = await TaskService.create({
        projectId: proj.id,
        columnId: backlogCol.id,
        title: 'Criar tela de login',
        description: 'Critérios de aceite...',
        priority: 'ALTA',
        position: 0,
        createdById: 'user-1'
      });

      expect(task.columnId).toBe(backlogCol.id);

      // Move to Done column
      await TaskService.move(task.id, doneCol.id, 0);

      const tasksAfter = await TaskService.getByProject(proj.id);
      const movedTask = tasksAfter.find(t => t.id === task.id);
      expect(movedTask?.columnId).toBe(doneCol.id);
    });
  });

  describe('Idea Conversion to Project', () => {
    it('converts an idea to a new project preserving history and linking convertedProjectId', async () => {
      const idea = await IdeaService.create({
        ownerId: 'user-1',
        title: 'Plataforma de IA Generativa',
        description: 'Uma ideia inovadora para gerar código.',
        visibility: 'PUBLIC',
        status: 'VALIDADA',
        technologies: ['Python', 'OpenAI'],
        links: []
      });

      expect(idea.status).toBe('VALIDADA');
      expect(idea.convertedProjectId).toBeNull();

      const createdProject = await IdeaService.convertToProject(idea.id, 'user-1', 'Test Owner');

      expect(createdProject.name).toBe(idea.title);
      expect(createdProject.description).toBe(idea.description);

      // Verify the idea updated its status and link
      const updatedIdea = await IdeaService.getById(idea.id);
      expect(updatedIdea?.status).toBe('CONVERTIDA');
      expect(updatedIdea?.convertedProjectId).toBe(createdProject.id);
    });
  });

  describe('Suggestions & Bug Reports Moderation', () => {
    it('records a suggestion and allows updating status', async () => {
      const sug = await SuggestionService.create({
        projectId: 'proj-1',
        title: 'Adicionar filtro por data',
        description: 'Seria muito útil.',
        authorName: 'Comunidade'
      });

      expect(sug.status).toBe('ABERTO');

      const updated = await SuggestionService.updateStatus(sug.id, 'ACEITO');
      expect(updated.status).toBe('ACEITO');
    });

    it('records a bug report with severity and environment', async () => {
      const bug = await BugReportService.create({
        projectId: 'proj-1',
        title: 'Falha no upload de imagem',
        description: 'Erro 500 ao anexar print',
        severity: 'ALTA',
        environment: 'Safari Mobile',
        authorName: 'Tester'
      });

      expect(bug.severity).toBe('ALTA');
      expect(bug.status).toBe('ABERTO');
    });
  });
});
