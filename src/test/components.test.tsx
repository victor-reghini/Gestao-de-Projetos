import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ApiDocsPage } from '@/pages/public/ApiDocsPage';

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
});
