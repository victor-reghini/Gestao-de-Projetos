<!-- RTK_TOKEN_SAVER_START -->
# Antigravity & Gemini Project Context & Rules - Gestão de Projetos

## 1. RTK (Rust Token Killer) Optimization Rule
Prefix every shell/terminal execution command with `rtk`:
- `rtk git status`, `rtk git diff -U1`, `rtk git log -n 5`
- `rtk npm test`, `rtk npm run build`, `rtk vitest run`
- `rtk ls src/`, `rtk tree -L 2`, `rtk rg "pattern"`

Keep the prefix inside chains: `rtk git add . && rtk git commit -m "msg"`.
Commands RTK has no filter for run as-is, so the prefix is always safe.

### Output & Token Optimization
Command output is condensed to save 60-90% LLM context window tokens while preserving every critical signal, error, and exit code.
- `rtk gain` / `rtk gain --history` - View token savings scoreboard.
- `rtk proxy <cmd>` - Run a command unfiltered if raw output is strictly needed.
- `RTK_DISABLED=1 <cmd>` - Skip RTK for one command.

## 2. Headroom Context Compression
- Utilize Headroom context compression and Compress-Cache-Retrieve (CCR) for heavy JSON structures, file reads, and tool payloads to minimize prompt tokens.

## 3. Output & Generation Token Saver Rule (Ponytail Mode: FULL)
- **YAGNI & Shortest Diff:** Only write code that must exist. Reach for standard library before custom code or new dependencies. Shortest working diff wins.
- **Terse Responses:** Code first. At most 3 short lines of explanation: what was skipped, when to add it. No essays, no unsolicited design tours, no feature walkthroughs.
- **Terse Directives:** Eliminate pleasantries, greetings, and conversational filler. Provide direct answers and actionable code. Avoid reprinting unchanged code blocks.
- **Context Optimization:** Single-line compact diffs (`rtk git diff -U1`). Inspect AST outlines (`/rtk-outline`) before reading entire files.
<!-- RTK_TOKEN_SAVER_END -->

---

# 🚀 Contexto Completo da Aplicação (Gestão de Projetos)

## 📌 Visão Geral da Arquitetura
Hub de desenvolvimento ágil para centralizar projetos, ideias, quadros Kanban, documentação Markdown/Mermaid e API pública REST v1 para sugestões e reporte de bugs da comunidade.
- **Frontend:** React 18, Vite, TypeScript, Vanilla CSS (Glassmorphism, variáveis HSL, fontes Inter/Outfit).
- **Backend Serverless:** Netlify Functions (`netlify/functions/api.ts`) e Vite dev proxy expondo `/api/v1/...`.
- **Persistência Relacional & Real-Time:**
  1. `Google Cloud SQL (PostgreSQL)`: Persistência relacional direta via pool PostgreSQL (`src/services/server/cloudSqlDb.ts`), instância `gestao-projetos-ea44c-instance`, host `34.181.161.180:5432`.
  2. `Firebase Realtime Database`: Sincronização ao vivo via WebSockets entre navegadores e abas ativas (`projects/{id}`).
  3. `LocalStorage`: Inicialização instantânea (0ms) e cache resiliente com fila de sincronização offline (`gestao_offline_sync_queue`).
  *(Nota: Firestore foi descontinuado em prol da combinação Cloud SQL PostgreSQL + Realtime Database).*
- **Autenticação:** Firebase Auth (Email/Senha, Google) + Modo Demo/Offline instantâneo.
- **Storage:** Firebase Storage (fotos de perfil em `avatars/`, prints de bugs em `bug-reports/`) com fallback automático para Base64 Data URL.

---

## 🗂️ Mapa de Arquivos & Estrutura Chave
```
├── netlify/
│   └── functions/api.ts          # API REST v1 (/api/v1/projects/:slug/... e /api/v1/cloudsql/...)
├── src/
│   ├── types/index.ts            # Tipos centrais (Project, Task, Column, Idea, Doc, Bug, Suggestion)
│   ├── services/
│   │   ├── firebase.ts           # Inicialização segura do Firebase (Auth, RTDB, Storage)
│   │   ├── dbService.ts          # Camada unificada de dados (CRUD Projetos, Tasks, Ideias, Docs, Bugs)
│   │   ├── cloudSqlService.ts    # Cliente HTTP para endpoints do Cloud SQL PostgreSQL
│   │   ├── realtimeSyncService.ts# Live sync WebSocket, validação de paridade e fila offline
│   │   └── server/
│   │       └── cloudSqlDb.ts     # Acesso direto ao PostgreSQL (Pool, consultas, UPSERTs e integridade FK)
│   ├── context/
│   │   └── AuthContext.tsx       # Estado de autenticação, login, registro, logout, modo demo
│   ├── components/
│   │   ├── kanban/KanbanBoard.tsx# Drag-and-drop, colunas e cards de tarefas
│   │   ├── feedback/             # Abas de BugsTab e SuggestionsTab
│   │   ├── documents/            # Visualizador/Editor Markdown + diagramas Mermaid interativos
│   │   └── layout/AppLayout.tsx  # Navegação, sidebar colapsável e header
│   └── pages/
│       ├── DashboardPage.tsx     # Métricas, projetos recentes e progresso
│       ├── projects/             # Listagem e ProjectDetailPage
│       ├── ideas/IdeasPage.tsx   # Gestão de ideias e conversão para Projeto
│       ├── public/               # Portal público (/p/:slug, /p/:slug/sugerir, /p/:slug/reportar-bug)
│       └── auth/                 # LoginPage, RegisterPage, ProfilePage
```

---

## 📋 Entidades de Domínio (`src/types/index.ts`)
- **Project:** `id`, `name`, `slug`, `description`, `visibility` (`PRIVATE` | `SHARED` | `PUBLIC`), `status` (`PLANNING` | `IN_PROGRESS` | `PAUSED` | `COMPLETED` | `ARCHIVED`), `ownerId`, `repository` (`url`, `provider`, `owner`, `name`, `defaultBranch`), `members`, `technologies`, `createdAt`, `updatedAt`.
- **Task:** `id`, `projectId`, `columnId`, `title`, `description`, `priority` (`LOW` | `MEDIUM` | `HIGH` | `URGENT`), `position`, `dueDate`, `assigneeId`, `authorId`, `tags`, `createdAt`, `updatedAt`.
- **ProjectColumn:** `id`, `projectId`, `name`, `key`, `position`, `color`.
- **Idea:** `id`, `title`, `description`, `stage` (`NEW` | `IN_ANALYSIS` | `VALIDATED` | `ARCHIVED` | `CONVERTED`), `convertedProjectId`, `ownerId`.
- **ProjectDocument:** `id`, `projectId`, `title`, `content` (Markdown + Mermaid), `type`, `isPublic`.
- **Suggestion / BugReport:** `id`, `projectId`, `title`, `description`, `status`, `reporterName`, `reporterEmail`, `screenshotUrl`, `stepsToReproduce`.

---

## 📐 Regras de Isolamento de Colunas e Integridade Multi-Projeto
1. **Unicidade e Escopo Estrito:**
   - Cada coluna pertence exclusivamente ao seu projeto (`c.projectId`).
   - Colunas com mesmo nome ou slug em projetos distintos (ex.: "Backlog", "Em Execução") são completamente independentes.
   - IDs de colunas novas são prefixados com o projeto: `col_${projectId}_${slugify(name)}_${random}`.
   - IDs de colunas padrão: `col_${projectId}_${key}` (ex.: `col_proj-1_backlog`).
2. **De-duplicação Composta:**
   - Todo mapeamento e rotina de de-duplicação (`deduplicateColumns`, `colMap`, etc.) utiliza a chave composta `${c.projectId}:${key || slugify(c.name)}`. Isso impede que colunas homônimas de projetos diferentes sejam mescladas ou sobrescritas.
3. **Exclusão Escopada e Atômica:**
   - `ColumnService.delete` e o endpoint `/api/v1/cloudsql/delete-column` executam a remoção com escopo duplo: `DELETE FROM project_column WHERE id = $1 AND project_id = $2`.
   - Colunas de outros projetos não sofrem qualquer efeito mesmo que possuam IDs semelhantes ou nomes idênticos.
4. **Proteção de Chave Estrangeira (`task_column_id_fkey`):**
   - Ao excluir uma coluna, se houver `fallbackColumnId`, as tarefas são realocadas no PostgreSQL (`UPDATE task SET column_id = $1 WHERE column_id = $2 AND project_id = $3`) antes da remoção da coluna.
   - Se não houver fallback, as tarefas vinculadas são removidas no PostgreSQL (`DELETE FROM task WHERE column_id = $1 AND project_id = $2`) antes da remoção da coluna, impedindo violações de Foreign Key.
5. **Prevenção de Ressurreição de Colunas por Cache Local:**
   - Em `ColumnService.getByProject`, quando o Cloud SQL responde com sucesso (`remoteCols.length > 0`), sua lista é considerada a fonte autoritativa de verdade (`deduplicateColumns(remoteCols)`). Não há merge com `localCols` obsoletas de outros navegadores.
6. **Integridade em `persistTask`:**
   - Antes de inserir tarefas no PostgreSQL, valida se `task.columnId` existe especificamente no projeto da tarefa (`WHERE id = $1 AND project_id = $2`). Se não existir, associa a uma coluna válida do projeto ou auto-cria no escopo do projeto.

---

## 🌐 Endpoints da API REST v1 (`netlify/functions/api.ts` & Vite Proxy)
Rate limit: 60 req/min por IP. Respostas padronizadas JSON:
- `GET /api/v1/projects/:slug` - Detalhes públicos do projeto e roadmap.
- `GET /api/v1/projects/:slug/suggestions` - Listar sugestões públicas.
- `POST /api/v1/projects/:slug/suggestions` - Criar sugestão externa.
- `GET /api/v1/projects/:slug/bugs` - Listar bugs públicos.
- `POST /api/v1/projects/:slug/bugs` - Criar reporte de bug externo.
- `GET /api/v1/projects/:slug/docs` - Obter documentação pública e diagramas.
- `GET /api/v1/cloudsql/fetch-all` - Carregar snapshot relacional completo.
- `POST /api/v1/cloudsql/sync-all` - Persistência relacional em lote no PostgreSQL.
- `POST /api/v1/cloudsql/sync-task` | `sync-column` | `sync-project` - Operações individuais atômicas.
- `POST /api/v1/cloudsql/delete-task` | `delete-column` | `delete-project` - Exclusões escopadas.

---

## 🛡️ Referência Rápida de Regras Firebase (Console)
Regras prontas para copiar/colar caso configure instâncias novas no Firebase Console:

### 1. Firebase Storage
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{file} { allow read: if true; allow write: if request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*'); }
    match /bug-reports/{file} { allow read: if true; allow write: if request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*'); }
    match /{all=**} { allow read: if true; allow write: if request.auth != null; }
  }
}
```

### 2. Realtime Database
```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "projects": {
      "$projectId": {
        "tasks": { ".indexOn": ["columnId", "position", "updatedAt"] },
        "columns": { ".indexOn": ["position"] }
      }
    }
  }
}
```

---

## 🔧 Comandos de Teste, Debug e Build
- **Testes Unitários e Integração:** `rtk npm test` ou `rtk vitest run` (52 testes em 5 arquivos cobrindo regras de negócio, persistência e isolamento multi-projeto).
- **Servidor Local Dev:** `rtk npm run dev` (porta padrão 3000 via Vite com proxy integrado para API e Cloud SQL).
- **Validação de Tipos e Build:** `rtk npm run build` (executa `tsc -b && vite build`).
- **Debugging & Fallback:** Se Firebase Storage falhar (`storage/unknown`), o sistema utiliza automaticamente fallback para Base64 Data URL, garantindo que uploads de avatar e screenshots nunca bloqueiem o usuário.
