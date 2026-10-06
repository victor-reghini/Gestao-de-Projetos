import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProjectService,
  ColumnService,
  TaskService,
  IdeaService,
  DocumentService,
  SuggestionService,
  BugReportService,
  isUserConnected,
  slugify
} from '@/services/dbService';
import { CloudSqlService } from '@/services/cloudSqlService';

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
      expect(movedTask?.concluded).toBe(true);
    });
  });

  describe('Task Direct Completion & Column Auto-Complete Logic', () => {
    it('directly links completion status to the task and defaults to false in standard column', async () => {
      const proj = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Conclusão Direta',
        description: 'Test',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });
      const cols = await ColumnService.getByProject(proj.id);
      const backlog = cols[0];

      const task = await TaskService.create({
        projectId: proj.id,
        columnId: backlog.id,
        title: 'Atividade Pendente',
        description: 'Test desc',
        priority: 'MEDIA',
        createdById: 'user-1'
      });

      expect(task.concluded).toBe(false);

      // Toggle completion directly on the task without changing column
      const concludedTask = await TaskService.update(task.id, { concluded: true });
      expect(concludedTask.concluded).toBe(true);
      expect(concludedTask.columnId).toBe(backlog.id);

      // Toggle back to incomplete directly on the task
      const unconcludedTask = await TaskService.update(task.id, { concluded: false });
      expect(unconcludedTask.concluded).toBe(false);
      expect(unconcludedTask.columnId).toBe(backlog.id);
    });

    it('automatically marks task as concluded when moved to an auto-completing column', async () => {
      const proj = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Auto-Complete Coluna',
        description: 'Test',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });
      const cols = await ColumnService.getByProject(proj.id);
      const backlog = cols[0];
      const doneCol = cols.find(c => c.key === 'done')!;

      expect(doneCol.autoComplete).toBe(true);

      const task = await TaskService.create({
        projectId: proj.id,
        columnId: backlog.id,
        title: 'Tarefa para Concluir',
        description: 'Desc',
        priority: 'ALTA',
        createdById: 'user-1'
      });
      expect(task.concluded).toBe(false);

      // Move to Done column
      await TaskService.move(task.id, doneCol.id, 0);

      const tasksAfter = await TaskService.getByProject(proj.id);
      const movedTask = tasksAfter.find(t => t.id === task.id);
      expect(movedTask?.columnId).toBe(doneCol.id);
      expect(movedTask?.concluded).toBe(true);
    });

    it('allows creating custom columns with autoComplete and auto-completes tasks moved to them', async () => {
      const proj = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Coluna Personalizada',
        description: 'Test',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });
      const cols = await ColumnService.getByProject(proj.id);
      const backlog = cols[0];

      // Create a custom column "Em Produção" with autoComplete = true
      const customDoneCol = await ColumnService.create(proj.id, 'Em Produção', '#10b981', true);
      expect(customDoneCol.autoComplete).toBe(true);

      const task = await TaskService.create({
        projectId: proj.id,
        columnId: backlog.id,
        title: 'Deploy em Produção',
        description: 'Subir build',
        priority: 'URGENTE',
        createdById: 'user-1'
      });
      expect(task.concluded).toBe(false);

      // Move to custom auto-complete column
      await TaskService.move(task.id, customDoneCol.id, 0);

      const tasksAfter = await TaskService.getByProject(proj.id);
      const movedTask = tasksAfter.find(t => t.id === task.id);
      expect(movedTask?.columnId).toBe(customDoneCol.id);
      expect(movedTask?.concluded).toBe(true);
    });

    it('auto-completes task on create when target column has autoComplete enabled', async () => {
      const proj = await ProjectService.create({
        ownerId: 'user-1',
        name: 'Projeto Criar Direto no Done',
        description: 'Test',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: [],
        links: []
      });
      const cols = await ColumnService.getByProject(proj.id);
      const doneCol = cols.find(c => c.key === 'done')!;

      const task = await TaskService.create({
        projectId: proj.id,
        columnId: doneCol.id,
        title: 'Tarefa Criada Já Concluída',
        description: 'Desc',
        priority: 'BAIXA',
        createdById: 'user-1'
      });

      expect(task.concluded).toBe(true);
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

    it('reorders columns within a project and persists new positions', async () => {
      const proj = await ProjectService.create({
        name: 'Projeto Reordenação de Colunas',
        description: 'Teste',
        visibility: 'PRIVATE',
        status: 'PLANEJAMENTO',
        technologies: ['TypeScript'],
        links: [],
        ownerId: 'user-1'
      });

      const cols = await ColumnService.getByProject(proj.id);
      expect(cols.length).toBeGreaterThanOrEqual(2);

      // Invert column order
      const reversedIds = cols.map(c => c.id).reverse();
      const reordered = await ColumnService.reorder(proj.id, reversedIds);

      expect(reordered[0].id).toBe(reversedIds[0]);
      expect(reordered[0].position).toBe(0);
      expect(reordered[1].id).toBe(reversedIds[1]);
      expect(reordered[1].position).toBe(1);

      // Verify fetched from storage
      const fetched = await ColumnService.getByProject(proj.id);
      const sorted = [...fetched].sort((a, b) => a.position - b.position);
      expect(sorted[0].id).toBe(reversedIds[0]);
      expect(sorted[1].id).toBe(reversedIds[1]);
    });

    it('inserts newly created tasks at the end of the column list and allows reordering', async () => {
      const proj = await ProjectService.create({
        name: 'Projeto Posição de Tarefas',
        description: 'Teste',
        visibility: 'PRIVATE',
        status: 'PLANEJAMENTO',
        technologies: ['TypeScript'],
        links: [],
        ownerId: 'user-1'
      });

      const cols = await ColumnService.getByProject(proj.id);
      const colId = cols[0].id;

      // Create 3 tasks sequentially without specifying position
      const task1 = await TaskService.create({
        projectId: proj.id,
        columnId: colId,
        title: 'Primeira Tarefa',
        description: 'Primeira',
        priority: 'MEDIA',
        createdById: 'user-1'
      });

      const task2 = await TaskService.create({
        projectId: proj.id,
        columnId: colId,
        title: 'Segunda Tarefa',
        description: 'Segunda',
        priority: 'ALTA',
        createdById: 'user-1'
      });

      const task3 = await TaskService.create({
        projectId: proj.id,
        columnId: colId,
        title: 'Terceira Tarefa',
        description: 'Terceira',
        priority: 'BAIXA',
        createdById: 'user-1'
      });

      // Verify tasks are ordered at the end of the list: 0, 1, 2
      expect(task1.position).toBe(0);
      expect(task2.position).toBe(1);
      expect(task3.position).toBe(2);

      // Reorder task3 to the top (position 0)
      await TaskService.move(task3.id, colId, 0);

      const tasksAfterMove = await TaskService.getByProject(proj.id);
      const colTasks = tasksAfterMove.filter(t => t.columnId === colId).sort((a, b) => a.position - b.position);

      expect(colTasks[0].id).toBe(task3.id);
      expect(colTasks[0].position).toBe(0);
      expect(colTasks[1].id).toBe(task1.id);
      expect(colTasks[1].position).toBe(1);
      expect(colTasks[2].id).toBe(task2.id);
      expect(colTasks[2].position).toBe(2);
    });

    it('updates project updatedAt when kanban, docs, bugs, suggestions or settings change', async () => {
      // 1. Create a project with an initial timestamp in the past
      const pastTime = new Date(Date.now() - 60000).toISOString();
      const proj = await ProjectService.create({
        name: 'Projeto Timestamp Test',
        description: 'Testando atualização de updatedAt',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['React'],
        links: [],
        ownerId: 'user-ts'
      });

      // Manually set older timestamp in localStorage to verify subsequent updates
      const list = JSON.parse(localStorage.getItem('gestao_projetos_db_projects') || '[]');
      const idx = list.findIndex((p: any) => p.id === proj.id);
      if (idx !== -1) {
        list[idx].updatedAt = pastTime;
        localStorage.setItem('gestao_projetos_db_projects', JSON.stringify(list));
      }

      let currentProj = await ProjectService.getById(proj.id);
      expect(currentProj?.updatedAt).toBe(pastTime);

      // 2. Test Kanban: Task Creation updates project updatedAt
      const cols = await ColumnService.getByProject(proj.id);
      const task = await TaskService.create({
        projectId: proj.id,
        columnId: cols[0].id,
        title: 'Nova tarefa para teste de touch',
        description: 'Descrição de teste',
        priority: 'MEDIA',
        createdById: 'user-ts'
      });
      currentProj = await ProjectService.getById(proj.id);
      expect(new Date(currentProj!.updatedAt).getTime()).toBeGreaterThan(new Date(pastTime).getTime());

      // 3. Test Kanban: Task Move updates project updatedAt
      const timeBeforeMove = currentProj!.updatedAt;
      await new Promise(r => setTimeout(r, 10));
      await TaskService.move(task.id, cols[1].id, 0);
      currentProj = await ProjectService.getById(proj.id);
      expect(new Date(currentProj!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(timeBeforeMove).getTime());

      // 4. Test Docs: Document creation updates project updatedAt
      const timeBeforeDoc = currentProj!.updatedAt;
      await new Promise(r => setTimeout(r, 10));
      const doc = await DocumentService.create({
        projectId: proj.id,
        title: 'Arquitetura do Sistema',
        content: '# Arquitetura',
        type: 'markdown',
        position: 0
      });
      currentProj = await ProjectService.getById(proj.id);
      expect(new Date(currentProj!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(timeBeforeDoc).getTime());

      // 5. Test Bugs: Bug Report creation updates project updatedAt
      const timeBeforeBug = currentProj!.updatedAt;
      await new Promise(r => setTimeout(r, 10));
      const bug = await BugReportService.create({
        projectId: proj.id,
        authorUserId: 'user-ts',
        authorName: 'Tester',
        authorEmail: 'tester@test.com',
        title: 'Bug na tela inicial',
        description: 'Erro 500',
        severity: 'ALTA'
      });
      currentProj = await ProjectService.getById(proj.id);
      expect(new Date(currentProj!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(timeBeforeBug).getTime());

      // 6. Test Suggestions: Suggestion creation updates project updatedAt
      const timeBeforeSug = currentProj!.updatedAt;
      await new Promise(r => setTimeout(r, 10));
      await SuggestionService.create({
        projectId: proj.id,
        authorUserId: 'user-ts',
        authorName: 'Tester',
        authorEmail: 'tester@test.com',
        title: 'Melhoria no formulário',
        description: 'Adicionar máscara'
      });
      currentProj = await ProjectService.getById(proj.id);
      expect(new Date(currentProj!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(timeBeforeSug).getTime());

      // 7. Test Settings/Visão Geral: ProjectService.update updates project updatedAt
      const timeBeforeSettings = currentProj!.updatedAt;
      await new Promise(r => setTimeout(r, 10));
      await ProjectService.update(proj.id, { description: 'Nova descrição atualizada' });
      currentProj = await ProjectService.getById(proj.id);
      expect(new Date(currentProj!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(timeBeforeSettings).getTime());
    });
  });

  describe('Connected User Database Authority & LocalStorage Bypass', () => {
    it('ignores stale localStorage and returns exclusively database projects when connected', async () => {
      // 1. Setup stale items in localStorage
      localStorage.setItem('gestao_projetos_db_projects', JSON.stringify([
        {
          id: 'stale-proj-1',
          ownerId: 'user-connected-123',
          name: 'Projeto Antigo no LocalStorage',
          slug: 'projeto-antigo-localstorage',
          status: 'PLANEJAMENTO',
          visibility: 'PUBLIC'
        }
      ]));

      // 2. Mock CloudSqlService.fetchProjects returning fresh database data
      const remoteProjects = [
        {
          id: 'db-proj-fresh',
          ownerId: 'user-connected-123',
          name: 'Projeto Fresco do Banco de Dados',
          slug: 'projeto-fresco-banco',
          status: 'EM_ANDAMENTO',
          visibility: 'PUBLIC'
        }
      ];
      const fetchSpy = vi.spyOn(CloudSqlService, 'fetchProjects').mockResolvedValue(remoteProjects as any);

      // 3. Fetch as connected user
      // Pass userId so isUserConnected recognizes the connected state
      // (temporarily override NODE_ENV to simulate production/browser runtime)
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const result = await ProjectService.getAll('user-connected-123');

        // Should return ONLY the fresh DB project and NOT the stale localStorage project
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('db-proj-fresh');
        expect(result[0].name).toBe('Projeto Fresco do Banco de Dados');

        // Should NOT contain the resurrected stale item
        expect(result.some(p => p.id === 'stale-proj-1')).toBe(false);
      } finally {
        process.env.NODE_ENV = origEnv;
        fetchSpy.mockRestore();
      }
    });

    it('ignores stale localStorage and returns exclusively database tasks when connected', async () => {
      // 1. Setup stale/deleted task in localStorage
      localStorage.setItem('gestao_projetos_db_tasks', JSON.stringify([
        {
          id: 'stale-deleted-task',
          projectId: 'proj-test-1',
          columnId: 'col-1',
          title: 'Tarefa que foi deletada no banco mas ficou no localStorage',
          position: 0
        }
      ]));

      // 2. Mock CloudSqlService.fetchTasks returning fresh tasks from database
      const remoteTasks = [
        {
          id: 'fresh-db-task',
          projectId: 'proj-test-1',
          columnId: 'col-1',
          title: 'Tarefa Atualizada no Banco',
          position: 0
        }
      ];
      const fetchSpy = vi.spyOn(CloudSqlService, 'fetchTasks').mockResolvedValue(remoteTasks as any);

      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      // Mock active session so isUserConnected returns true
      sessionStorage.setItem('gestao_demo_user', JSON.stringify({ id: 'user-123' }));

      try {
        const result = await TaskService.getByProject('proj-test-1');

        // Should return ONLY the database task
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('fresh-db-task');
        expect(result.some(t => t.id === 'stale-deleted-task')).toBe(false);
      } finally {
        process.env.NODE_ENV = origEnv;
        sessionStorage.removeItem('gestao_demo_user');
        fetchSpy.mockRestore();
      }
    });

    it('falls back cleanly to localStorage and preserves newly created projects when Cloud SQL fails/returns null', async () => {
      // 1. Mock Cloud SQL fetch returning null (simulating database connection error)
      const fetchSpy = vi.spyOn(CloudSqlService, 'fetchProjects').mockResolvedValue(null);

      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      sessionStorage.setItem('gestao_demo_user', JSON.stringify({ id: 'demo-user-123' }));

      try {
        // 2. Create project locally
        const created = await ProjectService.create({
          ownerId: 'demo-user-123',
          ownerName: 'Victor Reghini',
          name: 'Projeto Criado Localmente',
          description: 'Teste de persistência local',
          visibility: 'PUBLIC',
          status: 'EM_ANDAMENTO',
          technologies: ['React', 'TypeScript'],
          links: []
        });

        expect(created.id).toBeDefined();

        // 3. Fetch all projects as connected user
        const result = await ProjectService.getAll('demo-user-123');

        // Should NOT be wiped; should return the created local project
        expect(result.some(p => p.id === created.id)).toBe(true);
      } finally {
        process.env.NODE_ENV = origEnv;
        sessionStorage.removeItem('gestao_demo_user');
        fetchSpy.mockRestore();
      }
    });
  });

  describe('Project Links and Documentation Editability & CRUD', () => {
    it('allows owner to add, edit, and remove project links after project creation', async () => {
      const proj = await ProjectService.create({
        ownerId: 'demo-user-123',
        ownerName: 'Victor Reghini',
        name: 'Projeto com Links Editáveis',
        description: 'Teste de edição de links',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['React'],
        links: [{ title: 'Figma Inicial', url: 'https://figma.com/file/1' }]
      });

      // 1. Initial link exists
      let current = await ProjectService.getById(proj.id);
      expect(current!.links).toHaveLength(1);
      expect(current!.links[0].title).toBe('Figma Inicial');

      // 2. Add new link and edit existing link
      const updatedLinks = [
        { title: 'Figma Atualizado', url: 'https://figma.com/file/v2' },
        { title: 'API Docs', url: 'https://api.exemplo.com' }
      ];
      await ProjectService.update(proj.id, { links: updatedLinks });

      current = await ProjectService.getById(proj.id);
      expect(current!.links).toHaveLength(2);
      expect(current!.links[0].title).toBe('Figma Atualizado');
      expect(current!.links[0].url).toBe('https://figma.com/file/v2');
      expect(current!.links[1].title).toBe('API Docs');

      // 3. Delete a link
      const filteredLinks = current!.links.filter(l => l.title !== 'Figma Atualizado');
      await ProjectService.update(proj.id, { links: filteredLinks });

      current = await ProjectService.getById(proj.id);
      expect(current!.links).toHaveLength(1);
      expect(current!.links[0].title).toBe('API Docs');

      // 4. Delete all links
      await ProjectService.update(proj.id, { links: [] });
      current = await ProjectService.getById(proj.id);
      expect(current!.links).toHaveLength(0);
    });

    it('allows creating, editing, and deleting markdown and mermaid documents', async () => {
      const proj = await ProjectService.create({
        ownerId: 'demo-user-123',
        ownerName: 'Victor Reghini',
        name: 'Projeto para Documentação',
        description: 'Teste de docs',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['TypeScript'],
        links: []
      });

      // 1. Create new Markdown document
      const doc = await DocumentService.create({
        projectId: proj.id,
        title: 'Documento de Especificação',
        content: '# Requisitos do Sistema',
        type: 'markdown',
        position: 0
      });

      expect(doc.id).toBeDefined();
      expect(doc.type).toBe('markdown');

      let docs = await DocumentService.getByProject(proj.id);
      expect(docs.some(d => d.id === doc.id)).toBe(true);

      // 2. Edit existing document
      await DocumentService.update(doc.id, {
        title: 'Especificação Atualizada',
        content: '# Requisitos Atualizados com Sucesso'
      });

      docs = await DocumentService.getByProject(proj.id);
      const updated = docs.find(d => d.id === doc.id);
      expect(updated!.title).toBe('Especificação Atualizada');
      expect(updated!.content).toBe('# Requisitos Atualizados com Sucesso');

      // 3. Delete document
      await DocumentService.delete(doc.id);
      docs = await DocumentService.getByProject(proj.id);
      expect(docs.some(d => d.id === doc.id)).toBe(false);
    });
  });
});
