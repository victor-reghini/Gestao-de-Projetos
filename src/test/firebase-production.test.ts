import { describe, it, expect } from 'vitest';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { handler } from '../../netlify/functions/api';
import { 
  ProjectService, 
  TaskService, 
  ColumnService, 
  IdeaService, 
  DocumentService, 
  SuggestionService, 
  BugReportService, 
  UserService,
  slugify 
} from '../services/dbService';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBjRfirLy7Rcstm5yAA36EHzlrIxIgLS04",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gestao-projetos-ea44c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gestao-projetos-ea44c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gestao-projetos-ea44c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "947089271740",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:947089271740:web:97823942e9df0e58cf59b9",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://gestao-projetos-ea44c-default-rtdb.firebaseio.com"
};

describe('Firebase & Production Integration Test Suite', () => {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const rtdb = getDatabase(app);
  const storage = getStorage(app);

  describe('1. Firebase Configuration & Instance Verification', () => {
    it('initializes Firebase app with valid project credentials', () => {
      expect(app.name).toBeDefined();
      expect(app.options.projectId).toBe('gestao-projetos-ea44c');
      expect(app.options.storageBucket).toBe('gestao-projetos-ea44c.firebasestorage.app');
    });

    it('initializes Realtime Database and Storage instances correctly', () => {
      expect(rtdb.app.name).toBe(app.name);
      expect(storage.app.name).toBe(app.name);
    });
  });

  describe('2. Firebase Storage Integration Test', () => {
    it('uploads a test avatar and generates a valid download URL', async () => {
      const testContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header bytes
      const testFile = new File([testContent], 'avatar-test.png', { type: 'image/png' });
      
      const avatarUrl = await UserService.uploadAvatar('test-user-integ', testFile);
      expect(avatarUrl).toBeDefined();
      expect(typeof avatarUrl).toBe('string');
      expect(avatarUrl.length).toBeGreaterThan(10);
    });

    it('uploads a bug report screenshot and returns a valid URL', async () => {
      const testContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const testFile = new File([testContent], 'bug-screenshot-test.png', { type: 'image/png' });

      const screenshotUrl = await BugReportService.uploadScreenshot(testFile);
      expect(screenshotUrl).toBeDefined();
      expect(typeof screenshotUrl).toBe('string');
    });
  });

  describe('3. Production REST API (Netlify Functions) Endpoints', () => {
    it('handles GET /health and returns API metadata', async () => {
      const event: any = {
        httpMethod: 'GET',
        path: '/api/v1/health',
        headers: {}
      };
      const response: any = await handler(event, {} as any);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.version).toBe('v1');
      expect(body.status).toBe('online');
    });

    it('handles GET /projects/:slug', async () => {
      const event: any = {
        httpMethod: 'GET',
        path: '/api/v1/projects/sistema-gestao-projetos',
        headers: {}
      };
      const response: any = await handler(event, {} as any);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.slug).toBe('sistema-gestao-projetos');
    });

    it('handles POST /projects/:slug/suggestions with valid payload', async () => {
      const event: any = {
        httpMethod: 'POST',
        path: '/api/v1/projects/sistema-gestao-projetos/suggestions',
        headers: {},
        body: JSON.stringify({
          title: 'Integração com Slack Webhooks',
          description: 'Notificar canal do Slack ao mover cards para Concluído',
          authorName: 'Developer Test'
        })
      };
      const response: any = await handler(event, {} as any);
      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Integração com Slack Webhooks');
      expect(body.data.status).toBe('ABERTO');
    });

    it('handles POST /projects/:slug/bugs with valid payload', async () => {
      const event: any = {
        httpMethod: 'POST',
        path: '/api/v1/projects/sistema-gestao-projetos/bugs',
        headers: {},
        body: JSON.stringify({
          title: 'Erro de validação em campo de data',
          description: 'A data limite não aceita formato ISO',
          severity: 'ALTA'
        })
      };
      const response: any = await handler(event, {} as any);
      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.severity).toBe('ALTA');
      expect(body.data.status).toBe('ABERTO');
    });

    it('rejects POST with missing required fields with 400 Bad Request', async () => {
      const event: any = {
        httpMethod: 'POST',
        path: '/api/v1/projects/sistema-gestao-projetos/bugs',
        headers: {},
        body: JSON.stringify({
          severity: 'ALTA'
        })
      };
      const response: any = await handler(event, {} as any);
      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Campos obrigatórios ausentes');
    });

    it('returns 404 for unknown endpoints', async () => {
      const event: any = {
        httpMethod: 'GET',
        path: '/api/v1/unknown-route',
        headers: {}
      };
      const response: any = await handler(event, {} as any);
      expect(response.statusCode).toBe(404);
    });
  });

  describe('4. Complete Domain Lifecycle (Projects, Kanban, Ideas, Docs, Suggestions, Bugs)', () => {
    let createdProjectId: string;
    let createdIdeaId: string;

    it('creates a new project with auto-generated slug and default columns', async () => {
      const project = await ProjectService.create({
        ownerId: 'test-user-prod',
        ownerName: 'Test Production User',
        name: 'Plataforma E-commerce Headless',
        shortDescription: 'Arquitetura moderna com Next.js e Shopify Storefront API',
        description: 'Projeto full-stack para loja virtual escalável com pagamentos via Stripe.',
        visibility: 'PUBLIC',
        status: 'EM_ANDAMENTO',
        technologies: ['Next.js', 'TypeScript', 'Tailwind', 'Stripe'],
        links: [{ title: 'Figma Mockup', url: 'https://figma.com' }]
      });

      expect(project.id).toBeDefined();
      expect(project.slug).toBe('plataforma-e-commerce-headless');
      createdProjectId = project.id;

      // Verify default columns were created
      const cols = await ColumnService.getByProject(project.id);
      expect(cols.length).toBe(3);
      expect(cols.map(c => c.name)).toEqual(['Backlog', 'Em Execução', 'Concluído']);
    });

    it('adds and moves tasks across Kanban columns', async () => {
      const cols = await ColumnService.getByProject(createdProjectId);
      const backlogCol = cols[0];
      const inProgressCol = cols[1];

      const task = await TaskService.create({
        projectId: createdProjectId,
        columnId: backlogCol.id,
        title: 'Configurar Webhooks do Stripe',
        description: 'Processar eventos payment_intent.succeeded',
        priority: 'ALTA',
        createdById: 'test-user-prod',
        createdByName: 'Test User'
      });

      expect(task.id).toBeDefined();
      expect(task.columnId).toBe(backlogCol.id);

      // Move task to in_progress
      await TaskService.move(task.id, inProgressCol.id, 0);

      const tasks = await TaskService.getByProject(createdProjectId);
      const movedTask = tasks.find(t => t.id === task.id);
      expect(movedTask?.columnId).toBe(inProgressCol.id);
    });

    it('creates documentation with Markdown and Mermaid diagrams', async () => {
      const mdDoc = await DocumentService.create({
        projectId: createdProjectId,
        type: 'markdown',
        title: 'Especificação Técnica',
        content: '# Guia de Arquitetura\n\nDescreve os contratos de API e modelos de dados.',
        position: 0
      });
      expect(mdDoc.id).toBeDefined();

      const mermaidDoc = await DocumentService.create({
        projectId: createdProjectId,
        type: 'mermaid',
        title: 'Fluxo de Checkout',
        content: 'sequenceDiagram\nClient->>API: Checkout\nAPI->>Stripe: Criar Sessão',
        position: 1
      });
      expect(mermaidDoc.id).toBeDefined();

      const docs = await DocumentService.getByProject(createdProjectId);
      expect(docs.length).toBe(2);
    });

    it('creates and converts an Idea to a Project', async () => {
      const idea = await IdeaService.create({
        ownerId: 'test-user-prod',
        ownerName: 'Test Production User',
        title: 'App Mobile de Gestão Financeira Pessoal',
        description: 'Controle de gastos por inteligência artificial com categorização automática.',
        visibility: 'PUBLIC',
        status: 'VALIDADA',
        technologies: ['React Native', 'Expo', 'Python'],
        links: []
      });

      expect(idea.id).toBeDefined();
      expect(idea.status).toBe('VALIDADA');
      createdIdeaId = idea.id;

      // Convert to project
      const convertedProject = await IdeaService.convertToProject(
        idea.id, 
        'test-user-prod', 
        'Test Production User'
      );

      expect(convertedProject.id).toBeDefined();
      expect(convertedProject.name).toBe(idea.title);

      const updatedIdea = await IdeaService.getById(createdIdeaId);
      expect(updatedIdea?.status).toBe('CONVERTIDA');
      expect(updatedIdea?.convertedProjectId).toBe(convertedProject.id);
    });

    it('submits suggestions and updates their status', async () => {
      const suggestion = await SuggestionService.create({
        projectId: createdProjectId,
        authorUserId: 'user-community-1',
        authorName: 'Maria Silva',
        authorEmail: 'maria@example.com',
        title: 'Suporte a PIX no Checkout',
        description: 'Adicionar opção de pagamento instantâneo via chave aleatória e QR Code'
      });

      expect(suggestion.id).toBeDefined();
      expect(suggestion.status).toBe('ABERTO');

      const updated = await SuggestionService.updateStatus(suggestion.id, 'ACEITO');
      expect(updated.status).toBe('ACEITO');
    });

    it('submits bug reports and changes resolution status', async () => {
      const bug = await BugReportService.create({
        projectId: createdProjectId,
        authorUserId: null,
        authorName: 'QA Tester',
        authorEmail: 'qa@example.com',
        title: 'Botão de finalizar compra não desabilita após clique',
        description: 'Permite múltiplos cliques gerando cobranças duplicadas.',
        severity: 'CRITICA',
        stepsToReproduce: '1. Adicionar item ao carrinho\n2. Clicar duas vezes rapidamente em Comprar',
        expectedBehavior: 'O botão deve mostrar spinner e ficar desabilitado',
        observedBehavior: 'Duas requisições são disparadas',
        environment: 'Google Chrome 122 no macOS',
        imageUrl: 'https://gestao-projetos-ea44c.firebasestorage.app/bug-reports/test.png'
      });

      expect(bug.id).toBeDefined();
      expect(bug.severity).toBe('CRITICA');

      const resolved = await BugReportService.updateStatus(bug.id, 'RESOLVIDO');
      expect(resolved.status).toBe('RESOLVIDO');
    });
  });
});
