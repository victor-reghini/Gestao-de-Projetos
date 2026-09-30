# Instruções para Criação do Schema no Firebase

Este documento detalha o schema completo do banco de dados para o **Gestor de Projetos e Ideias**, com instruções passo a passo para configuração no **Firebase Data Connect (SQL Connect com PostgreSQL)**, **Firebase Firestore**, **Firebase Storage** e **Firebase Auth**.

---

## 📋 Sumário
1. [Visão Geral e Credenciais](#1-visão-geral-e-credenciais)
2. [Firebase Data Connect / SQL Connect (PostgreSQL)](#2-firebase-data-connect--sql-connect-postgresql)
   - [Script SQL DDL Completo](#script-sql-ddl-completo)
   - [Schema GraphQL do Data Connect (`schema.gql`)](#schema-graphql-do-data-connect-schemagql)
3. [Firebase Storage (Upload de Imagens de Perfil e Bugs)](#3-firebase-storage-upload-de-imagens-de-perfil-e-bugs)
   - [Estrutura de Pastas e Buckets](#estrutura-de-pastas-e-buckets)
   - [Regras de Segurança (`storage.rules`)](#regras-de-segurança-storagerules)
4. [Firebase Firestore (Modo Documental NoSQL)](#4-firebase-firestore-modo-documental-nosql)
   - [Coleções e Estruturas](#coleções-e-estruturas)
   - [Regras de Segurança (`firestore.rules`)](#regras-de-segurança-firestorerules)
5. [Passo a Passo de Execução e Deploy](#5-passo-a-passo-de-execução-e-deploy)

---

## 1. Visão Geral e Credenciais

As credenciais do projeto no Firebase já estão configuradas no arquivo `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSyBjRfirLy7Rcstm5yAA36EHzlrIxIgLS04
VITE_FIREBASE_AUTH_DOMAIN=gestao-projetos-ea44c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gestao-projetos-ea44c
VITE_FIREBASE_STORAGE_BUCKET=gestao-projetos-ea44c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=947089271740
VITE_FIREBASE_APP_ID=1:947089271740:web:97823942e9df0e58cf59b9
```

---

## 2. Firebase Data Connect / SQL Connect (PostgreSQL)

O **Firebase SQL Connect (Data Connect)** utiliza uma instância gerenciada de **Cloud SQL com PostgreSQL**. Abaixo está o script DDL SQL padrão e o schema GraphQL oficial do Data Connect.

### Script SQL DDL Completo

Execute o script SQL abaixo diretamente no Cloud SQL Studio ou cliente PostgreSQL conectado à instância:

```sql
-- =================================================================
-- SCHEMA: Gestor de Projetos e Ideias (PostgreSQL / SQL Connect)
-- =================================================================

-- Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela: users (Identidade do Usuário)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY, -- UID do Firebase Auth
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela: repositories (Vínculo Git do Projeto)
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) DEFAULT 'github', -- 'github', 'gitlab', 'bitbucket', 'other'
    url TEXT NOT NULL,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela: projects (Projetos do Sistema)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT NOT NULL,
    visibility VARCHAR(20) DEFAULT 'PUBLIC' CHECK (visibility IN ('PRIVATE', 'SHARED', 'PUBLIC')),
    status VARCHAR(30) DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('PLANEJAMENTO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'ARQUIVADO')),
    repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    technologies TEXT[], -- Array de tecnologias: ['React', 'TypeScript', 'Node.js']
    links JSONB DEFAULT '[]'::jsonb, -- Array de links: [{"title": "Docs", "url": "https://..."}]
    readme TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela: project_members (Membros e Permissões)
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- 5. Tabela: project_columns (Colunas do Kanban)
CREATE TABLE IF NOT EXISTS project_columns (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(30) DEFAULT '#2563eb',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela: tasks (Atividades do Kanban)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    column_id VARCHAR(128) NOT NULL REFERENCES project_columns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIA' CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
    position INTEGER NOT NULL DEFAULT 0,
    due_date DATE,
    created_by_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela: ideas (Ideias no Backlog)
CREATE TABLE IF NOT EXISTS ideas (
    id VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    visibility VARCHAR(20) DEFAULT 'PUBLIC' CHECK (visibility IN ('PRIVATE', 'SHARED', 'PUBLIC')),
    status VARCHAR(30) DEFAULT 'NOVA' CHECK (status IN ('NOVA', 'EM_ANALISE', 'VALIDADA', 'ARQUIVADA', 'CONVERTIDA')),
    technologies TEXT[],
    links JSONB DEFAULT '[]'::jsonb,
    converted_project_id VARCHAR(128) REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabela: project_documents (Documentação e Diagramas Mermaid)
CREATE TABLE IF NOT EXISTS project_documents (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(30) DEFAULT 'markdown' CHECK (type IN ('markdown', 'mermaid', 'diagram', 'note')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabela: suggestions (Sugestões de Usuários e API Externa)
CREATE TABLE IF NOT EXISTS suggestions (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_user_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_ANALISE', 'ACEITO', 'REJEITADO', 'RESOLVIDO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabela: bug_reports (Reportes de Bugs com Anexo)
CREATE TABLE IF NOT EXISTS bug_reports (
    id VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(128) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_user_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIA' CHECK (severity IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    observed_behavior TEXT,
    environment VARCHAR(255),
    image_url TEXT, -- Link da imagem salva no Firebase Storage
    status VARCHAR(30) DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_ANALISE', 'ACEITO', 'REJEITADO', 'RESOLVIDO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabela: api_keys (Chaves de API para Integrações)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(128) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read', 'write'],
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_tasks_project_column ON tasks(project_id, column_id);
CREATE INDEX IF NOT EXISTS idx_ideas_owner ON ideas(owner_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_project ON suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_project ON bug_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_docs_project ON project_documents(project_id);
```

---

### Schema GraphQL do Data Connect (`dataconnect/schema/schema.gql`)

Caso esteja utilizando o **Firebase Data Connect CLI**, crie o arquivo `dataconnect/schema/schema.gql`:

```graphql
# Schema oficial para o Firebase Data Connect

type User @table(key: ["id"]) {
  id: String!
  name: String!
  email: String!
  avatarUrl: String
  createdAt: Timestamp
  updatedAt: Timestamp
}

type Project @table(key: ["id"]) {
  id: String!
  owner: User!
  name: String!
  slug: String!
  shortDescription: String
  description: String!
  visibility: String! # 'PRIVATE' | 'SHARED' | 'PUBLIC'
  status: String!     # 'PLANEJAMENTO' | 'EM_ANDAMENTO' | 'PAUSADO' | 'CONCLUIDO' | 'ARQUIVADO'
  readme: String
  createdAt: Timestamp
  updatedAt: Timestamp
}

type ProjectColumn @table(key: ["id"]) {
  id: String!
  project: Project!
  name: String!
  key: String!
  position: Int!
  color: String
  createdAt: Timestamp
  updatedAt: Timestamp
}

type Task @table(key: ["id"]) {
  id: String!
  project: Project!
  column: ProjectColumn!
  title: String!
  description: String
  priority: String! # 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  position: Int!
  dueDate: Date
  createdById: String
  createdByName: String
  createdAt: Timestamp
  updatedAt: Timestamp
}

type Idea @table(key: ["id"]) {
  id: String!
  owner: User!
  title: String!
  description: String!
  visibility: String!
  status: String! # 'NOVA' | 'EM_ANALISE' | 'VALIDADA' | 'ARQUIVADA' | 'CONVERTIDA'
  convertedProjectId: String
  createdAt: Timestamp
  updatedAt: Timestamp
}

type ProjectDocument @table(key: ["id"]) {
  id: String!
  project: Project!
  type: String! # 'markdown' | 'mermaid' | 'diagram' | 'note'
  title: String!
  content: String!
  position: Int!
  createdAt: Timestamp
  updatedAt: Timestamp
}

type Suggestion @table(key: ["id"]) {
  id: String!
  project: Project!
  authorUserId: String
  authorName: String!
  authorEmail: String
  title: String!
  description: String!
  status: String!
  createdAt: Timestamp
  updatedAt: Timestamp
}

type BugReport @table(key: ["id"]) {
  id: String!
  project: Project!
  authorUserId: String
  authorName: String!
  authorEmail: String
  title: String!
  description: String!
  severity: String!
  stepsToReproduce: String
  expectedBehavior: String
  observedBehavior: String
  environment: String
  imageUrl: String
  status: String!
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## 3. Firebase Storage (Upload de Imagens de Perfil e Bugs)

O **Firebase Storage** é utilizado para armazenar:
1. **Fotos de Perfil dos Usuários:** pasta `avatars/{userId}_{timestamp}_{filename}`
2. **Prints e Anexos de Reporte de Bugs:** pasta `bug-reports/{timestamp}_{filename}`

### Regras de Segurança do Storage (`storage.rules`)

Copie e cole estas regras na aba **Storage > Rules** no Console do Firebase:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Regra para fotos de perfil:
    // - Qualquer pessoa pode visualizar a imagem de perfil (leitura pública)
    // - Usuário autenticado ou modo de teste pode fazer upload de imagens até 5MB
    match /avatars/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // Regra para prints e imagens de bugs:
    // - Qualquer pessoa pode visualizar os prints dos bugs públicos
    // - Qualquer usuário pode enviar uma imagem até 5MB
    match /bug-reports/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // Fallback geral
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 4. Firebase Firestore (Modo Documental NoSQL)

Para uso com o Firestore direto (modo sincronizado), as seguintes coleções principais são utilizadas:

- `users/{userId}`: Perfil do usuário (`name`, `email`, `avatarUrl`, `updatedAt`).
- `projects/{projectId}`: Dados do projeto (`ownerId`, `name`, `slug`, `visibility`, `status`, `technologies`, `repository`).
- `project_columns/{columnId}`: Colunas do Kanban (`projectId`, `name`, `key`, `position`, `color`).
- `tasks/{taskId}`: Atividades (`projectId`, `columnId`, `title`, `description`, `priority`, `position`, `dueDate`).
- `ideas/{ideaId}`: Ideias (`ownerId`, `title`, `description`, `status`, `visibility`, `convertedProjectId`).
- `documents/{docId}`: Documentação e diagramas Mermaid (`projectId`, `type`, `title`, `content`, `position`).
- `suggestions/{sugId}`: Sugestões públicas (`projectId`, `authorName`, `title`, `description`, `status`).
- `bugs/{bugId}`: Bugs reportados (`projectId`, `authorName`, `title`, `severity`, `imageUrl`, `status`).

### Regras de Segurança do Firestore (`firestore.rules`)

Copie e cole estas regras na aba **Firestore Database > Rules** no Console do Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funções auxiliares
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Usuários
    match /users/{userId} {
      allow read: if true;
      allow write: if isOwner(userId) || true; // Modo dev
    }

    // Projetos
    match /projects/{projectId} {
      allow read: if resource.data.visibility == 'PUBLIC' || isOwner(resource.data.ownerId);
      allow create: if true;
      allow update, delete: if isOwner(resource.data.ownerId) || true;
    }

    // Colunas e Tarefas
    match /project_columns/{colId} {
      allow read, write: if true;
    }
    
    match /tasks/{taskId} {
      allow read, write: if true;
    }

    // Ideias
    match /ideas/{ideaId} {
      allow read: if resource.data.visibility == 'PUBLIC' || isOwner(resource.data.ownerId);
      allow write: if true;
    }

    // Documentos e Diagramas
    match /documents/{docId} {
      allow read, write: if true;
    }

    // Sugestões e Bugs (Públicos para escrita via portal ou API)
    match /suggestions/{sugId} {
      allow read, create: if true;
      allow update, delete: if true;
    }

    match /bugs/{bugId} {
      allow read, create: if true;
      allow update, delete: if true;
    }
  }
}
```

---

## 5. Passo a Passo de Execução e Deploy

### Opção A: Ativação pelo Console do Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/u/0/project/gestao-projetos-ea44c/).
2. **Ativar Firestore Database:**
   - No menu lateral, clique em **Criação > Firestore Database**.
   - Clique em **Criar banco de dados**, selecione o local (ex: `southamerica-east1` ou `us-central1`) e escolha **Iniciar no modo de teste**.
   - Na aba **Regras**, cole as regras de `firestore.rules` acima e clique em **Publicar**.
3. **Ativar Firebase Storage:**
   - No menu lateral, clique em **Criação > Storage**.
   - Clique em **Primeiros passos**, selecione o mesmo local e escolha **Iniciar no modo de teste**.
   - Na aba **Regras**, cole as regras de `storage.rules` acima e clique em **Publicar**.
4. **Ativar Firebase Authentication:**
   - No menu lateral, clique em **Criação > Authentication**.
   - Clique em **Primeiros passos**, ative os provedores **E-mail/senha** e **Google**.
5. **Ativar Data Connect / SQL Connect (Opcional se for utilizar PostgreSQL):**
   - Acesse **Criação > Data Connect**.
   - Conecte ou crie a instância Cloud SQL PostgreSQL e execute o script SQL do item 2.

### Opção B: Deploy Automático via Firebase CLI
Caso tenha a Firebase CLI instalada:

```bash
# 1. Login no Firebase
firebase login

# 2. Selecionar o projeto
firebase use gestao-projetos-ea44c

# 3. Fazer o deploy das regras e schema
firebase deploy --only firestore:rules,storage
```
