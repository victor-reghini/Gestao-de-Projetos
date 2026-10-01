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

  describe('Column Isolation & Scoped Deletion per Project', () => {
    it('ensures removing a column removes it ONLY from its project, even when another project has a column with the exact same name', async () => {
      // 1. Create two separate projects
      const projectA = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Alfa',
        description: 'Projeto Alfa desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const projectB = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Beta',
        description: 'Projeto Beta desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      // Both projects initialize default columns: "Backlog", "Em Execução", "Concluído"
      const colsA = await ColumnService.getByProject(projectA.id);
      const colsB = await ColumnService.getByProject(projectB.id);

      expect(colsA.length).toBe(3);
      expect(colsB.length).toBe(3);

      const backlogA = colsA.find(c => c.name === 'Backlog');
      const backlogB = colsB.find(c => c.name === 'Backlog');

      expect(backlogA).toBeDefined();
      expect(backlogB).toBeDefined();
      // IDs must be unique per project
      expect(backlogA?.id).not.toBe(backlogB?.id);
      expect(backlogA?.projectId).toBe(projectA.id);
      expect(backlogB?.projectId).toBe(projectB.id);

      // Add a custom column with the identical name to both projects
      const customColA = await ColumnService.create(projectA.id, 'Em Homologação', '#ec4899');
      const customColB = await ColumnService.create(projectB.id, 'Em Homologação', '#ec4899');

      expect(customColA.name).toBe('Em Homologação');
      expect(customColB.name).toBe('Em Homologação');
      expect(customColA.projectId).toBe(projectA.id);
      expect(customColB.projectId).toBe(projectB.id);
      expect(customColA.id).not.toBe(customColB.id);

      // 2. Remove "Em Homologação" from Project A only
      await ColumnService.delete(customColA.id, undefined, projectA.id);

      // 3. Verify Project A no longer has "Em Homologação"
      const updatedColsA = await ColumnService.getByProject(projectA.id);
      expect(updatedColsA.find(c => c.id === customColA.id)).toBeUndefined();
      expect(updatedColsA.find(c => c.name === 'Em Homologação')).toBeUndefined();

      // 4. Verify Project B STILL HAS "Em Homologação" completely intact!
      const updatedColsB = await ColumnService.getByProject(projectB.id);
      const remainingCustomB = updatedColsB.find(c => c.id === customColB.id);
      expect(remainingCustomB).toBeDefined();
      expect(remainingCustomB?.name).toBe('Em Homologação');
      expect(remainingCustomB?.projectId).toBe(projectB.id);

      // 5. Verify deleting default column "Backlog" in Project A does NOT affect Project B's "Backlog"
      const fallbackA = updatedColsA.find(c => c.id !== backlogA?.id);
      await ColumnService.delete(backlogA!.id, fallbackA?.id, projectA.id);

      const finalColsA = await ColumnService.getByProject(projectA.id);
      const finalColsB = await ColumnService.getByProject(projectB.id);

      expect(finalColsA.find(c => c.id === backlogA?.id)).toBeUndefined();
      expect(finalColsB.find(c => c.id === backlogB?.id)).toBeDefined();
      expect(finalColsB.find(c => c.name === 'Backlog')?.projectId).toBe(projectB.id);
    });

    it('scopes task reassignment and deletion strictly to the project when deleting a column', async () => {
      const projA = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Tasks A',
        description: 'Desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const projB = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Tasks B',
        description: 'Desc',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });

      const colsA = await ColumnService.getByProject(projA.id);
      const colsB = await ColumnService.getByProject(projB.id);

      // Create task in Project A in column 0 (Backlog)
      const taskA = await TaskService.create({
        projectId: projA.id,
        columnId: colsA[0].id,
        title: 'Tarefa no Backlog de A',
        description: 'Descrição da tarefa A',
        priority: 'MEDIA',
        createdById: 'user-1'
      });

      // Create task in Project B in column 0 (Backlog)
      const taskB = await TaskService.create({
        projectId: projB.id,
        columnId: colsB[0].id,
        title: 'Tarefa no Backlog de B',
        description: 'Descrição da tarefa B',
        priority: 'ALTA',
        createdById: 'user-1'
      });

      // Delete column 0 from Project A with fallback to column 1
      await ColumnService.delete(colsA[0].id, colsA[1].id, projA.id);

      // Project A task should have moved to column 1
      const tasksA = await TaskService.getByProject(projA.id);
      const updatedTaskA = tasksA.find(t => t.id === taskA.id);
      expect(updatedTaskA?.columnId).toBe(colsA[1].id);

      // Project B task should be completely untouched and still in Project B's column 0
      const tasksB = await TaskService.getByProject(projB.id);
      const unchangedTaskB = tasksB.find(t => t.id === taskB.id);
      expect(unchangedTaskB?.columnId).toBe(colsB[0].id);
      expect(unchangedTaskB?.projectId).toBe(projB.id);
    });
  });
});
