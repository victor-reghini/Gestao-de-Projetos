# Gestor de Projetos e Ideias 🚀

> **Hub de Desenvolvimento Ágil, Central de Ideias, Kanban Dinâmico, Documentação Markdown & Mermaid e API REST v1 para Integração de Feedbacks.**

---

## 📌 Visão Geral

O **Gestor de Projetos e Ideias** é uma plataforma moderna concebida para centralizar iniciativas de software, hipóteses de produtos e tarefas em equipe. O sistema funciona tanto como ferramenta privada de organização pessoal quanto como um portal público de projetos, permitindo que aplicações externas enviem sugestões e reportes de bugs diretamente para o projeto correspondente via API REST.

---

## 🛠️ Stack Tecnológica

- **Frontend:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** Vanilla CSS customizado com Glassmorphism, variáveis HSL, micro-animações táteis e tipografia [Google Fonts (Inter & Outfit)](https://fonts.google.com/)
- **Diagramação:** [Mermaid.js](https://mermaid.js.org/) para renderização visual em tempo real (Arquitetura C4, Fluxogramas, Sequência, ERD)
- **Backend / API Pública:** [Netlify Serverless Functions](https://www.netlify.com/products/functions/) versionada em `/api/v1` + endpoints de persistência Cloud SQL
- **Banco de Dados & Auth:** [Google Cloud SQL](https://cloud.google.com/sql) (PostgreSQL), [Firebase](https://firebase.google.com/) (Auth, Realtime Database, Storage) com sincronização local e live sync
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Testes:** [Vitest](https://vitest.dev/) (52 testes automatizados) + [Testing Library](https://testing-library.com/)

---

## ✨ Funcionalidades Principais

### 1. 📊 Dashboard Central
- Métricas em tempo real (Projetos Ativos, Ideias no Backlog, Taxa de Conclusão, Feedbacks Pendentes).
- Listagem dos projetos recentes com barra de progresso de atividades.
- Acesso rápido para criação de projetos e anotação de ideias.

### 2. 🗂️ Módulo de Projetos
- CRUD completo de projetos com slug URL amigável (`/projects/:id` e `/p/:slug`).
- Filtros dinâmicos por visibilidade (**Público**, **Privado**, **Compartilhado**), status (**Em Andamento**, **Planejamento**, **Pausado**, **Concluído**, **Arquivado**) e tecnologias.
- Vínculo direto com repositórios Git (**GitHub**: url, branch principal, owner e repositório).
- Controle granular de membros e permissões (**Owner**, **Editor**, **Viewer**).

### 3. 📋 Kanban Dinâmico e Interativo
- Colunas isoladas por projeto com integridade referencial: cada coluna é estritamente vinculada ao projeto, impedindo colisões mesmo com nomes homônimos em outros projetos.
- Colunas padrão (**Backlog**, **Em Execução**, **Concluído**) + criação de colunas personalizadas com seletor de cores.
- Remoção segura com remanejamento ou limpeza automática de atividades no Cloud SQL e Realtime Database.
- **Drag-and-Drop suave** entre colunas e reordenação interna.
- Atividades com título, descrição detalhada, prioridade (**Baixa**, **Média**, **Alta**, **Urgente**), prazo de entrega e autor.
- Filtros instantâneos por texto de busca e prioridade.

### 4. 💡 Módulo de Ideias & Backlog
- Gestão de ideias em estágios: `NOVA`, `EM_ANALISE`, `VALIDADA`, `ARQUIVADA` e `CONVERTIDA`.
- Ação **"Converter em Projeto"**: cria um novo projeto com quadro Kanban e documentação preservando o histórico e vínculo bidirecional `convertedProjectId`.

### 5. 📖 Documentação & Diagramas
- Editor e visualizador Markdown com suporte a cabeçalhos, listas, blocos de código e alertas.
- Suporte a **diagramas Mermaid** interativos com templates prontos (Arquitetura Web, Fluxogramas, Diagramas de Sequência e Modelos ERD) e exportação em SVG.

### 6. 🌐 Portal Público & Feedbacks
- Página pública sem necessidade de login (`/p/:slug`) com visão geral, roadmap, documentação e diagramas públicos.
- Formulário público para **Sugestões** da comunidade (`/p/:slug/sugerir`).
- Formulário público para **Reporte de Bugs** (`/p/:slug/reportar-bug`) com anexo de imagens e detalhes de reprodução.
- Painel de moderação para o proprietário: aceitar, rejeitar, resolver ou transformar em atividade no Kanban.

### 7. ⚡ API Pública REST v1
Endpoints documentados e com rate limiting (60 req/min), CORS aberto e respostas JSON padronizadas:
- `GET /api/v1/projects/:slug` — Obter dados públicos de um projeto.
- `GET /api/v1/projects/:slug/suggestions` — Listar sugestões públicas.
- `POST /api/v1/projects/:slug/suggestions` — Enviar sugestão.
- `GET /api/v1/projects/:slug/bugs` — Listar reportes de bugs.
- `POST /api/v1/projects/:slug/bugs` — Enviar reporte de bug.
- `GET /api/v1/projects/:slug/docs` — Obter documentação pública.
- Documentação interativa e playground cURL acessível em `/docs/api`.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) v18+ ou v20+
- npm v10+

### Instalação e Execução

```bash
# 1. Clonar o repositório
git clone https://github.com/victor-reghini/Gestao-de-Projetos.git
cd Gestao-de-Projetos

# 2. Instalar dependências
npm install

# 3. Executar o servidor de desenvolvimento
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**

### Executando os Testes Automatizados

```bash
# Executar suíte de testes Vitest
npm run test
```

### Build de Produção

```bash
# Validar tipagem TypeScript e gerar bundle otimizado
npm run build
```

---

## 🌐 Deploy na Netlify

O repositório já está configurado com `netlify.toml` pronto para deploy contínuo:

1. Conecte o repositório no dashboard da [Netlify](https://app.netlify.com/).
2. A Netlify executará automaticamente o comando `npm run build` e publicará a pasta `dist`.
3. As funções da API pública serão automaticamente publicadas a partir de `netlify/functions`.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para obter mais informações.
