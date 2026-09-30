import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ApiDocsPage } from '@/pages/public/ApiDocsPage';
import { TaskModal } from '@/components/kanban/TaskModal';
import { ImageCropperModal } from '@/components/profile/ImageCropperModal';
import { AppLayout } from '@/components/layout/AppLayout';
import { SuggestionsTab } from '@/components/feedback/SuggestionsTab';
import { BugsTab } from '@/components/feedback/BugsTab';
import { ProjectColumn, Task, Suggestion, BugReport } from '@/types';

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
});
