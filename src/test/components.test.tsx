import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ApiDocsPage } from '@/pages/public/ApiDocsPage';
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { TaskModal } from '@/components/kanban/TaskModal';
import { NewProjectModal } from '@/pages/projects/NewProjectModal';
import { ImageCropperModal } from '@/components/profile/ImageCropperModal';
import { AppLayout } from '@/components/layout/AppLayout';
import { SuggestionsTab } from '@/components/feedback/SuggestionsTab';
import { BugsTab } from '@/components/feedback/BugsTab';
import { ProjectColumnProgressBar } from '@/components/project/ProjectColumnProgressBar';
import { ColumnService, ProjectService, TaskService, SuggestionService, BugReportService } from '@/services/dbService';
import { Project, ProjectColumn, Task, Suggestion, BugReport } from '@/types';

const mockColumns: ProjectColumn[] = [
  { id: 'col-1', projectId: 'p1', name: 'Backlog', key: 'backlog', position: 0, createdAt: '', updatedAt: '' },
  { id: 'col-2', projectId: 'p1', name: 'Em Execução', key: 'in_progress', position: 1, createdAt: '', updatedAt: '' }
];

describe('UI Components & Pages Tests', () => {
  it('renders LoginPage with Email, Password and Demo buttons', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Gestor de Projetos & Ideias')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar com Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar Demo/i })).toBeInTheDocument();
  });

  it('renders ApiDocsPage with endpoints and live tester', () => {
    render(
      <BrowserRouter>
        <ApiDocsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Documentação da API Pública')).toBeInTheDocument();
    expect(screen.getByText(/Rate Limiting Ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Exemplo cURL/i)).toBeInTheDocument();
  });

  it('allows creating a new activity in TaskModal', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <AuthProvider>
        <TaskModal
          isOpen={true}
          onClose={onClose}
          projectId="p1"
          columns={mockColumns}
          defaultColumnId="col-1"
          taskToEdit={null}
          onSaved={onSaved}
        />
      </AuthProvider>
    );

    expect(screen.getByText('Nova Atividade no Kanban')).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/Título da Atividade/i);
    fireEvent.change(titleInput, { target: { value: 'Nova Tarefa de Teste' } });

    const submitBtn = screen.getByRole('button', { name: /Criar Atividade/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows editing an existing activity in TaskModal', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const existingTask: Task = {
      id: 'task-test-1',
      projectId: 'p1',
      columnId: 'col-1',
      title: 'Tarefa Existente',
      description: 'Descrição detalhada',
      priority: 'ALTA',
      position: 0,
      createdById: 'demo-user-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    render(
      <AuthProvider>
        <TaskModal
          isOpen={true}
          onClose={onClose}
          projectId="p1"
          columns={mockColumns}
          defaultColumnId="col-1"
          taskToEdit={existingTask}
          onSaved={onSaved}
        />
      </AuthProvider>
    );

    expect(screen.getByText('Editar Atividade')).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/Título da Atividade/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Tarefa Existente');

    // Update title
    fireEvent.change(titleInput, { target: { value: 'Tarefa Atualizada com Sucesso' } });

    const submitBtn = screen.getByRole('button', { name: /Atualizar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders ImageCropperModal with controls and action buttons', () => {
    const onCropComplete = vi.fn();
    const onClose = vi.fn();

    render(
      <ImageCropperModal
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        onClose={onClose}
        onCropComplete={onCropComplete}
      />
    );

    expect(screen.getByText('Editar Foto de Perfil')).toBeInTheDocument();
    expect(screen.getByText(/Arraste para ajustar a posição/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recortar e Salvar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('toggles collapsible sidebar and stores state in localStorage', () => {
    localStorage.removeItem('gestao_sidebar_collapsed');
    render(
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    );

    const toggleBtn = screen.getByLabelText(/Minimizar menu lateral/i);
    expect(toggleBtn).toBeInTheDocument();

    // Initially expanded
    expect(screen.getByText('Hub Ágil & Docs')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleBtn);
    expect(localStorage.getItem('gestao_sidebar_collapsed')).toBe('true');
    expect(screen.queryByText('Hub Ágil & Docs')).not.toBeInTheDocument();

    // Click to expand again
    const expandBtn = screen.getByLabelText(/Expandir menu lateral/i);
    fireEvent.click(expandBtn);
    expect(localStorage.getItem('gestao_sidebar_collapsed')).toBe('false');
    expect(screen.getByText('Hub Ágil & Docs')).toBeInTheDocument();
  });

  it('renders "Transformar em Atividade" button on suggestion cards and converts to task', async () => {
    const onRefresh = vi.fn();
    const mockSuggestions: Suggestion[] = [
      {
        id: 'sug-test-1',
        projectId: 'p1',
        authorUserId: null,
        authorName: 'Tester User',
        authorEmail: 'tester@example.com',
        title: 'Sugestão de Atalho',
        description: 'Descrição da sugestão de atalho',
        status: 'ABERTO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    render(
      <SuggestionsTab
        projectId="p1"
        suggestions={mockSuggestions}
        onRefresh={onRefresh}
        isReadOnly={false}
      />
    );

    const convertBtn = screen.getByRole('button', { name: /Transformar em Atividade/i });
    expect(convertBtn).toBeInTheDocument();

    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    fireEvent.click(convertBtn);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });

    alertMock.mockRestore();
  });

  it('renders "Transformar em Atividade" button on bug cards and converts to task', async () => {
    const onRefresh = vi.fn();
    const mockBugs: BugReport[] = [
      {
        id: 'bug-test-1',
        projectId: 'p1',
        authorUserId: null,
        authorName: 'QA Tester',
        authorEmail: 'qa@example.com',
        title: 'Falha no Botão de Envio',
        description: 'O botão não responde ao clique',
        severity: 'ALTA',
        status: 'ABERTO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    render(
      <BugsTab
        projectId="p1"
        bugs={mockBugs}
        onRefresh={onRefresh}
        isReadOnly={false}
      />
    );

    const convertBtn = screen.getByRole('button', { name: /Transformar em Atividade/i });
    expect(convertBtn).toBeInTheDocument();

    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    fireEvent.click(convertBtn);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });

    alertMock.mockRestore();
  });

  it('renders ProjectsListPage and sorts by recent, name, status, and pending with badges', async () => {
    const mockProjects: Project[] = [
      {
        id: 'proj-a',
        ownerId: 'u1',
        name: 'Alpha Project',
        slug: 'alpha-project',
        description: 'Alpha description',
        visibility: 'PUBLIC',
        status: 'CONCLUIDO',
        technologies: ['React'],
        links: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z'
      },
      {
        id: 'proj-b',
        ownerId: 'u1',
        name: 'Beta Project',
        slug: 'beta-project',
        description: 'Beta description',
        visibility: 'PRIVATE',
        status: 'PLANEJAMENTO',
        technologies: ['TypeScript'],
        links: [],
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z'
      },
      {
        id: 'proj-c',
        ownerId: 'u1',
        name: 'Gamma Project',
        slug: 'gamma-project',
        description: 'Gamma description',
        visibility: 'SHARED',
        status: 'EM_ANDAMENTO',
        technologies: ['Node.js'],
        links: [],
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T10:00:00Z'
      }
    ];

    const mockBugs: BugReport[] = [
      { id: 'b1', projectId: 'proj-b', title: 'Bug B1', description: '', severity: 'MEDIA', status: 'ABERTO', authorName: 'Tester', createdAt: '', updatedAt: '' },
      { id: 'b2', projectId: 'proj-c', title: 'Bug C1', description: '', severity: 'ALTA', status: 'ABERTO', authorName: 'Tester', createdAt: '', updatedAt: '' },
      { id: 'b3', projectId: 'proj-c', title: 'Bug C2', description: '', severity: 'CRITICA', status: 'EM_ANALISE', authorName: 'Tester', createdAt: '', updatedAt: '' },
      { id: 'b4', projectId: 'proj-c', title: 'Bug C3', description: '', severity: 'BAIXA', status: 'ABERTO', authorName: 'Tester', createdAt: '', updatedAt: '' }
    ];

    const mockSuggestions: Suggestion[] = [
      { id: 's1', projectId: 'proj-b', title: 'Sug B1', description: '', status: 'ABERTO', authorName: 'User', createdAt: '', updatedAt: '' },
      { id: 's2', projectId: 'proj-c', title: 'Sug C1', description: '', status: 'ABERTO', authorName: 'User', createdAt: '', updatedAt: '' },
      { id: 's3', projectId: 'proj-c', title: 'Sug C2', description: '', status: 'EM_ANALISE', authorName: 'User', createdAt: '', updatedAt: '' }
    ];

    vi.spyOn(ProjectService, 'getAll').mockResolvedValue(mockProjects);
    vi.spyOn(TaskService, 'getByProject').mockResolvedValue([]);
    vi.spyOn(BugReportService, 'getByProject').mockImplementation(async (pid) => mockBugs.filter(b => b.projectId === pid));
    vi.spyOn(SuggestionService, 'getByProject').mockImplementation(async (pid) => mockSuggestions.filter(s => s.projectId === pid));

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProjectsListPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
      expect(screen.getByText('Gamma Project')).toBeInTheDocument();
    });

    // Verify badges on cards
    expect(screen.getByText('3 bugs')).toBeInTheDocument();
    expect(screen.getByText('2 melhorias')).toBeInTheDocument();
    expect(screen.getByText('1 bug')).toBeInTheDocument();
    expect(screen.getByText('1 melhoria')).toBeInTheDocument();
    expect(screen.getByText('Em dia')).toBeInTheDocument();
    expect(screen.getAllByText('0 bugs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0 melhorias').length).toBeGreaterThan(0);

    // Verify links on badges
    const bugLink = screen.getByRole('link', { name: /3 bugs/i });
    expect(bugLink).toHaveAttribute('href', '/projects/proj-c?tab=bugs');

    const sugLink = screen.getByRole('link', { name: /2 melhorias/i });
    expect(sugLink).toHaveAttribute('href', '/projects/proj-c?tab=suggestions');

    // 1. Default sort: Most recent update (Beta [Mar] -> Gamma [Feb] -> Alpha [Jan])
    let titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(titles).toEqual(['Beta Project', 'Gamma Project', 'Alpha Project']);

    // 2. Sort by name: A-Z (Alpha -> Beta -> Gamma)
    const sortSelect = screen.getByLabelText(/Ordenar projetos/i);
    fireEvent.change(sortSelect, { target: { value: 'name' } });
    titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(titles).toEqual(['Alpha Project', 'Beta Project', 'Gamma Project']);

    // 3. Sort by status: EM_ANDAMENTO (Gamma) -> PLANEJAMENTO (Beta) -> CONCLUIDO (Alpha)
    fireEvent.change(sortSelect, { target: { value: 'status' } });
    titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(titles).toEqual(['Gamma Project', 'Beta Project', 'Alpha Project']);

    // 4. Sort by pending: Gamma (5 pendências) -> Beta (2 pendências) -> Alpha (0 pendências)
    fireEvent.change(sortSelect, { target: { value: 'pending' } });
    titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(titles).toEqual(['Gamma Project', 'Beta Project', 'Alpha Project']);
  });

  it('renders KanbanBoard with grouped Colunas button and toggles column header commands', async () => {
    vi.spyOn(ColumnService, 'getByProject').mockResolvedValue(mockColumns);
    vi.spyOn(TaskService, 'getByProject').mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <KanbanBoard projectId="p1" isReadOnly={false} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Backlog')).toBeInTheDocument();
      expect(screen.getByText('Em Execução')).toBeInTheDocument();
    });

    // Commands in column header should be hidden by default
    expect(screen.queryByLabelText('Mover coluna para a esquerda')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mover coluna para a direita')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Editar Coluna')).not.toBeInTheDocument();

    // Grouped button "Colunas" should be visible
    const colunasBtn = screen.getByRole('button', { name: /Menu de Colunas/i });
    expect(colunasBtn).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(colunasBtn);
    expect(screen.getByText('Editar Colunas')).toBeInTheDocument();
    expect(screen.getByText('Nova Coluna')).toBeInTheDocument();

    // Click "Editar Colunas"
    fireEvent.click(screen.getByText('Editar Colunas'));

    // Now column header commands should be visible
    expect(screen.getAllByLabelText('Mover coluna para a esquerda').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Mover coluna para a direita').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Editar Coluna').length).toBeGreaterThan(0);

    // Click "Colunas" again to toggle and hide
    fireEvent.click(colunasBtn);
    fireEvent.click(screen.getByText('Ocultar Comandos'));

    // Commands are hidden again
    expect(screen.queryByLabelText('Mover coluna para a esquerda')).not.toBeInTheDocument();
  });

  it('discreetly creates project and invokes onCreated with created project data', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();

    render(
      <BrowserRouter>
        <AuthProvider>
          <NewProjectModal
            isOpen={true}
            onClose={onClose}
            onCreated={onCreated}
          />
        </AuthProvider>
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText(/Nome do Projeto/i);
    fireEvent.change(nameInput, { target: { value: 'Projeto Atualização Discreta' } });

    const submitBtn = screen.getByRole('button', { name: /Criar Projeto/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    const createdArg = onCreated.mock.calls[0][0];
    expect(createdArg).toBeDefined();
    expect(createdArg.name).toBe('Projeto Atualização Discreta');
  });

  it('discreetly updates task concluded state without crashing or reloading board', async () => {
    const onProjectUpdate = vi.fn();
    const testTask: Task = {
      id: 'task-disc-1',
      projectId: 'p1',
      columnId: 'col-1',
      title: 'Tarefa para conclusão discreta',
      description: 'Testando conclui',
      priority: 'MEDIA',
      concluded: false,
      position: 0,
      createdById: 'user-test',
      createdAt: '',
      updatedAt: ''
    };

    vi.spyOn(ColumnService, 'getByProject').mockResolvedValue(mockColumns);
    vi.spyOn(TaskService, 'getByProject').mockResolvedValue([testTask]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <KanbanBoard projectId="p1" isReadOnly={false} onProjectUpdate={onProjectUpdate} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tarefa para conclusão discreta')).toBeInTheDocument();
    });

    const concludeBtn = screen.getByRole('button', { name: /Marcar como concluída/i });
    fireEvent.click(concludeBtn);

    await waitFor(() => {
      expect(onProjectUpdate).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Marcar como pendente/i })).toBeInTheDocument();
    });
  });

  it('renders ProjectColumnProgressBar with half orange and half green for 2 backlog and 2 done tasks, strictly respecting order and colors', () => {
    const customColumns: ProjectColumn[] = [
      { id: 'col-backlog', projectId: 'p-test', name: 'Backlog', key: 'backlog', position: 0, color: '#f97316', createdAt: '', updatedAt: '' },
      { id: 'col-progress', projectId: 'p-test', name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', createdAt: '', updatedAt: '' },
      { id: 'col-done', projectId: 'p-test', name: 'Concluído', key: 'done', position: 2, color: '#10b981', autoComplete: true, createdAt: '', updatedAt: '' }
    ];

    const fourTasks: Task[] = [
      { id: 't1', projectId: 'p-test', columnId: 'col-backlog', title: 'Task 1', description: '', priority: 'MEDIA', position: 0, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't2', projectId: 'p-test', columnId: 'col-backlog', title: 'Task 2', description: '', priority: 'MEDIA', position: 1, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't3', projectId: 'p-test', columnId: 'col-done', title: 'Task 3', description: '', priority: 'MEDIA', position: 0, concluded: true, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't4', projectId: 'p-test', columnId: 'col-done', title: 'Task 4', description: '', priority: 'MEDIA', position: 1, concluded: true, createdById: 'u1', createdAt: '', updatedAt: '' },
    ];

    render(
      <ProjectColumnProgressBar
        projectId="p-test"
        tasks={fourTasks}
        columns={customColumns}
      />
    );

    // Title / Header verification
    expect(screen.getByText('Tarefas no Fluxo')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('50% concluído')).toBeInTheDocument();

    // Segments verification
    const backlogSegment = screen.getByTestId('segment-backlog');
    const doneSegment = screen.getByTestId('segment-done');
    expect(screen.queryByTestId('segment-in_progress')).not.toBeInTheDocument(); // 0 tasks, so not rendered in bar

    // Widths are 50% each
    expect(backlogSegment).toHaveStyle({ width: '50%', backgroundColor: '#f97316' });
    expect(doneSegment).toHaveStyle({ width: '50%', backgroundColor: '#10b981' });

    // Order verification: backlog segment precedes done segment in DOM
    expect(backlogSegment.compareDocumentPosition(doneSegment)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // Legend verification: Backlog 50% and Concluído 50%
    expect(screen.getByTestId('legend-backlog')).toHaveTextContent('Backlog');
    expect(screen.getByTestId('legend-backlog')).toHaveTextContent('50%');
    expect(screen.getByTestId('legend-done')).toHaveTextContent('Concluído');
    expect(screen.getByTestId('legend-done')).toHaveTextContent('50%');
  });

  it('renders adaptive legend with top percentages in small space and toggles expansion to show all columns', () => {
    const multiColumns: ProjectColumn[] = [
      { id: 'col-1', projectId: 'p-multi', name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', createdAt: '', updatedAt: '' },
      { id: 'col-2', projectId: 'p-multi', name: 'Em Análise', key: 'analysis', position: 1, color: '#06b6d4', createdAt: '', updatedAt: '' },
      { id: 'col-3', projectId: 'p-multi', name: 'Em Execução', key: 'in_progress', position: 2, color: '#6366f1', createdAt: '', updatedAt: '' },
      { id: 'col-4', projectId: 'p-multi', name: 'Revisão', key: 'review', position: 3, color: '#f59e0b', createdAt: '', updatedAt: '' },
      { id: 'col-5', projectId: 'p-multi', name: 'Concluído', key: 'done', position: 4, color: '#10b981', autoComplete: true, createdAt: '', updatedAt: '' },
    ];

    const tasks: Task[] = [
      // 4 in Backlog (40%)
      { id: 't1', projectId: 'p-multi', columnId: 'col-1', title: 'T1', description: '', priority: 'MEDIA', position: 0, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't2', projectId: 'p-multi', columnId: 'col-1', title: 'T2', description: '', priority: 'MEDIA', position: 1, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't3', projectId: 'p-multi', columnId: 'col-1', title: 'T3', description: '', priority: 'MEDIA', position: 2, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't4', projectId: 'p-multi', columnId: 'col-1', title: 'T4', description: '', priority: 'MEDIA', position: 3, createdById: 'u1', createdAt: '', updatedAt: '' },
      // 3 in Em Execução (30%)
      { id: 't5', projectId: 'p-multi', columnId: 'col-3', title: 'T5', description: '', priority: 'MEDIA', position: 0, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't6', projectId: 'p-multi', columnId: 'col-3', title: 'T6', description: '', priority: 'MEDIA', position: 1, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't7', projectId: 'p-multi', columnId: 'col-3', title: 'T7', description: '', priority: 'MEDIA', position: 2, createdById: 'u1', createdAt: '', updatedAt: '' },
      // 2 in Concluído (20%)
      { id: 't8', projectId: 'p-multi', columnId: 'col-5', title: 'T8', description: '', priority: 'MEDIA', position: 0, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't9', projectId: 'p-multi', columnId: 'col-5', title: 'T9', description: '', priority: 'MEDIA', position: 1, createdById: 'u1', createdAt: '', updatedAt: '' },
      // 1 in Revisão (10%)
      { id: 't10', projectId: 'p-multi', columnId: 'col-4', title: 'T10', description: '', priority: 'MEDIA', position: 0, createdById: 'u1', createdAt: '', updatedAt: '' },
    ];

    render(
      <ProjectColumnProgressBar
        projectId="p-multi"
        tasks={tasks}
        columns={multiColumns}
      />
    );

    // Total tasks = 10
    expect(screen.getByText('10')).toBeInTheDocument();

    // Since there are 5 columns (> 3 columns heuristic in test environment), it is in small space
    // Top 2 percentages are Backlog (40%) and Em Execução (30%)
    expect(screen.getByTestId('legend-backlog')).toBeInTheDocument();
    expect(screen.getByTestId('legend-backlog')).toHaveTextContent('40%');
    expect(screen.getByTestId('legend-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('legend-in_progress')).toHaveTextContent('30%');

    // Button to expand remaining columns (+3 mais)
    const toggleBtn = screen.getByTestId('toggle-more-columns');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent('+3 mais');

    // Click to expand and view ALL column names and colors
    fireEvent.click(toggleBtn);

    // Now all 5 columns should be visible in the legend
    expect(screen.getByTestId('legend-backlog')).toBeInTheDocument();
    expect(screen.getByTestId('legend-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('legend-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('legend-review')).toBeInTheDocument();
    expect(screen.getByTestId('legend-done')).toBeInTheDocument();

    // Toggle button now says "Menos"
    expect(toggleBtn).toHaveTextContent('Menos');
  });

  it('renders ProjectColumnProgressBar with 0 tasks showing empty state', () => {
    render(
      <ProjectColumnProgressBar
        projectId="p-empty"
        tasks={[]}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('0 tarefas')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma atividade no projeto')).toBeInTheDocument();
  });

  it('renders ProjectColumnProgressBar independently by fetching tasks and columns when not passed as props', async () => {
    const fetchedCols: ProjectColumn[] = [
      { id: 'c1', projectId: 'p-auto', name: 'A Fazer', key: 'backlog', position: 0, color: '#f97316', createdAt: '', updatedAt: '' },
      { id: 'c2', projectId: 'p-auto', name: 'Pronto', key: 'done', position: 1, color: '#10b981', autoComplete: true, createdAt: '', updatedAt: '' }
    ];
    const fetchedTasks: Task[] = [
      { id: 't1', projectId: 'p-auto', columnId: 'c1', title: 'Task 1', description: '', priority: 'MEDIA', position: 0, createdById: 'u1', createdAt: '', updatedAt: '' },
      { id: 't2', projectId: 'p-auto', columnId: 'c2', title: 'Task 2', description: '', priority: 'MEDIA', position: 0, concluded: true, createdById: 'u1', createdAt: '', updatedAt: '' }
    ];

    vi.spyOn(ColumnService, 'getByProject').mockResolvedValue(fetchedCols);
    vi.spyOn(TaskService, 'getByProject').mockResolvedValue(fetchedTasks);

    render(
      <ProjectColumnProgressBar
        projectId="p-auto"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tarefas no Fluxo')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('50% concluído')).toBeInTheDocument();
    });

    expect(screen.getByTestId('segment-backlog')).toBeInTheDocument();
    expect(screen.getByTestId('segment-done')).toBeInTheDocument();
  });

  it('renders SyncStatusIndicator button and opens SyncModal on click', async () => {
    const { SyncStatusIndicator } = await import('@/components/sync/SyncStatusIndicator');

    render(
      <BrowserRouter>
        <AuthProvider>
          <SyncStatusIndicator />
        </AuthProvider>
      </BrowserRouter>
    );

    const indicatorBtn = screen.getByRole('button');
    expect(indicatorBtn).toBeInTheDocument();

    // Click indicator button to open SyncModal
    fireEvent.click(indicatorBtn);

    expect(screen.getByText('Sincronização com o Banco de Dados')).toBeInTheDocument();
    expect(screen.getByText('Google Cloud SQL (PostgreSQL)')).toBeInTheDocument();
    expect(screen.getByText(/Dados Salvos no Navegador/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar Dados do Navegador para o Banco/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copiar Script SQL/i })).toBeInTheDocument();
  });
});

