-- ============================================================================
-- SCRIPT DE CARGA COMPLETO PARA GOOGLE CLOUD SQL (PostgreSQL)
-- Instância: gestao-projetos-ea44c:us-east4:gestao-projetos-ea44c-instance
-- Database: postgres | Schema: public
-- Execute diretamente no Cloud SQL Studio do Google Cloud Console
-- ============================================================================

BEGIN;

-- 1. Usuário Proprietário Padrão
INSERT INTO "public"."users" (id, name, email, avatar_url, updated_at) 
VALUES (
  'demo-user-123', 
  'Victor Reghini', 
  'contato@victorreghini.com.br', 
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  email = EXCLUDED.email, 
  updated_at = NOW();

-- 2. Projetos
INSERT INTO "public"."project" (
  id, owner_id, name, slug, short_description, description, visibility, status, technologies, links, readme, created_at, updated_at
) VALUES 
(
  'proj-1',
  'demo-user-123',
  'Sistema de Gestão de Projetos & Ideias',
  'sistema-gestao-projetos',
  'Plataforma moderna para centralização de projetos, Kanban, documentação e API pública.',
  'Sistema completo construído com React, TypeScript, Vite, Firebase e Netlify Functions. Suporta Kanban dinâmico, renderização de diagramas Mermaid, controle de visibilidade (privado, compartilhado, público) e API REST v1 para integrações externas.',
  'PUBLIC',
  'EM_ANDAMENTO',
  '{"React","TypeScript","Vite","Firebase","Netlify","TailwindCSS/Vanilla CSS"}',
  '[{"title":"Repositório GitHub","url":"https://github.com/victor-reghini/Gestao-de-Projetos"},{"title":"Documentação da API","url":"/docs/api"}]'::jsonb,
  '# Gestão de Projetos\n\nHub central para projetos e ideias com Kanban e API aberta.',
  '2026-09-23T12:00:00.000Z',
  NOW()
),
(
  'proj-2',
  'demo-user-123',
  'API Gateway & Autenticação Biométrica',
  'api-gateway-biometria',
  'Microsserviço de autenticação segura e roteamento de APIs com suporte a WebAuthn.',
  'Microsserviço escalável focado em segurança de ponta a ponta, rate limiting por token, verificação de integridade e auditoria de requisições.',
  'PRIVATE',
  'PLANEJAMENTO',
  '{"Node.js","Go","Redis","Docker"}',
  '[{"title":"Design Doc","url":"https://github.com"}]'::jsonb,
  '# API Gateway & Autenticação Biométrica\n\nSegurança de alta performance.',
  '2026-09-27T12:00:00.000Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  slug = EXCLUDED.slug, 
  short_description = EXCLUDED.short_description, 
  description = EXCLUDED.description, 
  visibility = EXCLUDED.visibility, 
  status = EXCLUDED.status, 
  technologies = EXCLUDED.technologies, 
  links = EXCLUDED.links, 
  readme = EXCLUDED.readme, 
  updated_at = NOW();

-- 3. Colunas do Kanban
INSERT INTO "public"."project_column" (
  id, project_id, name, key, position, color, created_at, updated_at
) VALUES 
('col-1', 'proj-1', 'Backlog', 'backlog', 0, '#64748b', '2026-09-23T12:00:00.000Z', NOW()),
('col-2', 'proj-1', 'Em Execução', 'in_progress', 1, '#6366f1', '2026-09-23T12:00:00.000Z', NOW()),
('col-3', 'proj-1', 'Revisão / Testes', 'review', 2, '#f59e0b', '2026-09-23T12:00:00.000Z', NOW()),
('col-4', 'proj-1', 'Concluído', 'done', 3, '#10b981', '2026-09-23T12:00:00.000Z', NOW()),
('col-20', 'proj-2', 'Backlog', 'backlog', 0, '#64748b', '2026-09-27T12:00:00.000Z', NOW()),
('col-21', 'proj-2', 'Em Execução', 'in_progress', 1, '#6366f1', '2026-09-27T12:00:00.000Z', NOW()),
('col-22', 'proj-2', 'Concluído', 'done', 2, '#10b981', '2026-09-27T12:00:00.000Z', NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  key = EXCLUDED.key, 
  position = EXCLUDED.position, 
  color = EXCLUDED.color, 
  updated_at = NOW();

-- 4. Atividades (Tasks)
INSERT INTO "public"."task" (
  id, project_id, column_id, title, description, priority, position, due_date, created_by_id, created_by_name, created_at, updated_at
) VALUES 
(
  'task-1',
  'proj-1',
  'col-2',
  'Implementar endpoints públicos da API v1',
  'Criar handlers REST em Netlify Functions com rate limiting e documentação Swagger.',
  'ALTA',
  0,
  CURRENT_DATE + INTERVAL '2 days',
  'demo-user-123',
  'Victor Reghini',
  '2026-09-28T10:00:00.000Z',
  NOW()
),
(
  'task-2',
  'proj-1',
  'col-2',
  'Renderização visual de diagramas Mermaid',
  'Adicionar suporte dinâmico no editor de documentação para gráficos Mermaid interativos.',
  'MEDIA',
  1,
  CURRENT_DATE + INTERVAL '3 days',
  'demo-user-123',
  'Victor Reghini',
  '2026-09-28T11:00:00.000Z',
  NOW()
),
(
  'task-3',
  'proj-1',
  'col-4',
  'Configurar layout responsivo e Design System',
  'Criar tokens CSS, suporte a modo escuro, glassmorphism e micro-animações.',
  'ALTA',
  0,
  CURRENT_DATE,
  'demo-user-123',
  'Victor Reghini',
  '2026-09-28T12:00:00.000Z',
  NOW()
),
(
  'task-4',
  'proj-1',
  'col-1',
  'Integração com Webhooks do GitHub',
  'Receber notificações automáticas de commits e pull requests.',
  'BAIXA',
  0,
  CURRENT_DATE + INTERVAL '10 days',
  'demo-user-123',
  'Victor Reghini',
  '2026-09-28T14:00:00.000Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  project_id = EXCLUDED.project_id,
  column_id = EXCLUDED.column_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  position = EXCLUDED.position,
  due_date = EXCLUDED.due_date,
  updated_at = NOW();

-- 5. Ideias
INSERT INTO "public"."idea" (
  id, owner_id, owner_name, title, description, visibility, status, technologies, links, created_at, updated_at
) VALUES 
(
  'idea-1',
  'demo-user-123',
  'Victor Reghini',
  'Gerador Automático de Changelog com IA',
  'Ferramenta CLI e web que analisa commits Git convencionais e gera relatórios semânticos de versão e release notes para equipes.',
  'PUBLIC',
  'VALIDADA',
  '{"TypeScript","Gemini API","CLI","GitHub Actions"}',
  '[{"title":"Pesquisa inicial","url":"https://keepachangelog.com"}]'::jsonb,
  '2026-09-25T12:00:00.000Z',
  NOW()
),
(
  'idea-2',
  'demo-user-123',
  'Victor Reghini',
  'Dashboard de Monitoramento de Web Vitals para Jamstack',
  'Agente leve em JavaScript para coletar métricas LCP, FID e CLS em produção e alertar no Discord/Slack.',
  'PRIVATE',
  'NOVA',
  '{"Web Workers","FastAPI","TimescaleDB"}',
  '[]'::jsonb,
  '2026-09-28T12:00:00.000Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  visibility = EXCLUDED.visibility,
  status = EXCLUDED.status,
  technologies = EXCLUDED.technologies,
  links = EXCLUDED.links,
  updated_at = NOW();

-- 6. Documentação do Projeto
INSERT INTO "public"."project_document" (
  id, project_id, title, content, type, position, created_at, updated_at
) VALUES 
(
  'doc-1',
  'proj-1',
  'Visão Geral da Arquitetura',
  '# Arquitetura do Sistema\n\nO **Gestor de Projetos e Ideias** foi concebido com os seguintes pilares:\n\n1. **Frontend:** React + Vite + TypeScript.\n2. **Backend/API:** Serverless Netlify Functions disponibilizando endpoints REST em `/api/v1`.\n3. **Persistência:** Google Cloud SQL (PostgreSQL) com sincronização Realtime Database.\n4. **Armazenamento:** Firebase Storage para anexos e imagens.\n',
  'markdown',
  0,
  '2026-09-23T12:00:00.000Z',
  NOW()
),
(
  'doc-2',
  'proj-1',
  'Diagrama de Arquitetura C4',
  'graph TD\n    Client[Browser / Usuário] -->|HTTPS SPA| Netlify[Netlify CDN]\n    Client -->|Auth| FirebaseAuth[Firebase Auth]\n    Client -->|WebSocket Live Sync| RTDB[Firebase Realtime Database]\n    Client -->|Persistência Relacional| CloudSQL[Google Cloud SQL PostgreSQL]\n    ExternalApp[Aplicações Externas] -->|REST API v1| NetlifyFunctions[Netlify Functions /api/v1]\n    NetlifyFunctions -->|Persistência| CloudSQL\n    Client -->|Upload Anexos| Storage[Firebase Storage]',
  'mermaid',
  1,
  '2026-09-23T12:00:00.000Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  type = EXCLUDED.type,
  position = EXCLUDED.position,
  updated_at = NOW();

-- 7. Sugestões da Comunidade
INSERT INTO "public"."suggestion" (
  id, project_id, author_id, author_name, title, description, status, created_at, updated_at
) VALUES 
(
  'sug-1',
  'proj-1',
  NULL,
  'Ana Clara (Comunidade)',
  'Adicionar atalhos de teclado no Kanban',
  'Seria muito produtivo poder navegar entre cards e colunas usando as setas do teclado e a tecla N para nova atividade.',
  'EM_ANALISE',
  '2026-09-29T12:00:00.000Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 8. Relatórios de Bug
INSERT INTO "public"."bug_report" (
  id, project_id, author_id, author_name, title, description, severity, status, screenshot_url, created_at, updated_at
) VALUES 
(
  'bug-1',
  'proj-1',
  NULL,
  'Carlos Dev',
  'Quebra de linha no preview de Markdown longo em telas pequenas',
  'Blocos de código sem quebra horizontal causam overflow na visualização mobile.',
  'BAIXA',
  'ABERTO',
  NULL,
  '2026-09-28T12:00:00.000Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  updated_at = NOW();

COMMIT;

-- Consultas de Verificação
SELECT 'Projetos:' AS tabela, COUNT(*) AS total FROM "public"."project"
UNION ALL
SELECT 'Colunas:', COUNT(*) FROM "public"."project_column"
UNION ALL
SELECT 'Atividades:', COUNT(*) FROM "public"."task"
UNION ALL
SELECT 'Ideias:', COUNT(*) FROM "public"."idea"
UNION ALL
SELECT 'Documentos:', COUNT(*) FROM "public"."project_document"
UNION ALL
SELECT 'Sugestões:', COUNT(*) FROM "public"."suggestion"
UNION ALL
SELECT 'Bugs:', COUNT(*) FROM "public"."bug_report";
