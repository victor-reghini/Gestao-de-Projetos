# Resumo das Modificações (Work in Progress)

**Data:** 01/10/2026  
**Status:** Testes passando (57/57), build de produção validado (`tsc -b && vite build`), pronto para deploy.

---

## 🎯 Contexto e Objetivos

1. **Resolução do Erro 502 Bad Gateway no Netlify:**
   - **Causa Raiz:** A Netlify Function (`netlify/functions/api.ts`) importava `initialProjects` de `src/services/dbService.ts`, que por sua vez importava `src/services/firebase.ts`. No runtime Node.js da função serverless, `import.meta.env` é `undefined`. Ao tentar avaliar `import.meta.env.VITE_FIREBASE_API_KEY`, ocorria um `TypeError: Cannot read properties of undefined` no cold start da função, retornando 502 em todos os endpoints `/api/v1/*`.
   - **Solução:** Desacoplamento total da Netlify Function do código do cliente web, com fallback local independente.

2. **Auditoria de Segurança e Eliminação de Segredos Hardcoded:**
   - Todas as chaves, senhas, tokens e IPs de banco foram removidos dos arquivos versionados no Git.
   - O arquivo `.env` local permanece protegido e ignorado pelo `.gitignore`.

3. **Nova Regra de Negócio para `getEnvVar`:**
   - **Valor Padrão (Prioridade 1):** Variáveis de ambiente configuradas no sistema/host (`process.env` no runtime Node/Netlify ou `import.meta.env` no client Vite).
   - **Fallback Dinâmico (Prioridade 2):** Leitura direta dos documentos `.env` locais (`.env` e `.env.local`), carregados dinamicamente via `process.loadEnvFile` ou parser local, impedindo valores vazios sem expor credenciais fixas no código-fonte.

---

## 📁 Arquivos Modificados

### 1. `netlify/functions/api.ts`
- Removida a dependência `import { initialProjects } from '../../src/services/dbService'`.
- Adicionado `defaultFallbackProjects` local e estático na função serverless para o endpoint `GET /api/v1/projects/:slug`.
- A função serverless agora é 100% autônoma, sem dependências de módulos do browser (`localStorage`, Firebase client SDK).

### 2. `src/services/firebase.ts`
- Implementada a função `getEnvVar` seguindo estritamente a nova regra de negócio:
  - Tenta ler de `process.env` (Node / Netlify / CI).
  - Tenta ler de `import.meta.env` (Vite dev / build).
  - Fallback: Carrega do arquivo `.env` via `process.loadEnvFile` e parser em memória de `.env` / `.env.local`.
- Removidas todas as strings com credenciais e chaves fixas em `firebaseConfig`.

### 3. `src/test/firebase-production.test.ts`
- Atualizado para reutilizar `getEnvVar` de `../services/firebase`.
- Removidas as chaves hardcoded da suíte de testes de integração do Firebase.

### 4. `scripts/seed-cloudsql.mjs`
- Removido o IP fixo de fallback para `PGHOST`.
- Valida presença obrigatória de `PGHOST` e `PGPASSWORD` no `.env` antes da execução.

### 5. `AGENTS.md` e `src/dataconnect-generated/README.md`
- Sanitizadas as referências ao IP do Cloud SQL, apontando para a variável `PGHOST` no `.env`.

---

## 🧪 Validação e Testes

- **TypeScript:** `rtk npx tsc --noEmit` ➔ 0 erros.
- **Suíte de Testes (Vitest):** `rtk npm test` ➔ 57 testes passando em 5 arquivos (`data-connect.test.ts`, `realtime-sync.test.ts`, `domain.test.ts`, `components.test.tsx`, `firebase-production.test.ts`).
- **Build de Produção:** `rtk npm run build` (`tsc -b && vite build`) ➔ Gerado com sucesso.
- **Git Ignore:** Confirmado que `.env` e `.env.local` não são rastreados (`git check-ignore`).

---

## 🚀 Próximos Passos para Retomada

1. **Deploy no Netlify:**
   - Fazer `git push origin main` com o commit WIP.
   - Certificar-se de que as variáveis de ambiente necessárias estejam cadastradas no painel do Netlify (*Site configuration > Environment variables*):
     - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_DATABASE_URL`
     - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSL`
2. **Validação em Produção:**
   - Acessar o endpoint público e a rota `/api/v1/cloudsql/all` para confirmar resposta 200 OK sem 502.
