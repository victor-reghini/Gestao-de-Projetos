# Plano de Projeto — Gestor de Projetos e Ideias

Versão 1.0 — 29/09/2026

## 1. Objetivo

Construir uma aplicação web para centralizar projetos, ideias de projetos e atividades, permitindo acompanhar a evolução de cada iniciativa, documentá-la, vincular seu repositório Git e disponibilizar uma API pública para integração com outros sistemas.

O sistema deve funcionar tanto como ferramenta privada de organização pessoal quanto como um catálogo de projetos públicos/compartilhados, possibilitando que aplicações externas enviem sugestões e reportes de bugs diretamente para o projeto correspondente.

## 2. Stack e restrições

- Frontend: React + Vite.
- Backend/API: implementar a API utilizando a camada server-side disponível no ecossistema Node/Vite.
- Banco de dados: Firebase SQL Connect.
- Hosting/deploy: Netlify.
- API pública: endpoints REST versionados, documentados e protegidos contra abuso.
- Autenticação: solução compatível com Firebase e com a arquitetura escolhida; o agente deve validar a integração disponível com Firebase SQL Connect antes da implementação.
- Código: TypeScript preferencialmente em todo o projeto.
- Git: cada projeto deve poder armazenar URL do repositório, provedor e branch principal.
- Dados de integração com o firebase estão no arquivo .env

## 3. Princípios de arquitetura

- Separar claramente UI, domínio, persistência e camada HTTP/API.
- Não colocar regras de autorização apenas no frontend.
- Toda operação sobre projetos, ideias e atividades deve validar o usuário autenticado e a visibilidade do recurso.
- A API pública deve ser versionada desde o início (ex.: /api/v1).
- Modelar banco para permitir crescimento futuro sem acoplamento entre UI e persistência.
- Usar variáveis de ambiente para credenciais, URLs e configurações.
- Registrar erros e eventos relevantes sem armazenar segredos ou dados sensíveis nos logs.

## 4. Perfis e controle de acesso

Usuários:

- Visitante não autenticado: pode acessar somente recursos públicos.
- Usuário autenticado: pode criar e administrar seus próprios projetos e ideias.
- Colaborador/compartilhado: pode acessar recursos explicitamente compartilhados conforme permissão.
- Proprietário: controle total sobre o recurso, compartilhamento, edição e exclusão.

Visibilidade:

- PRIVATE — somente proprietário e usuários explicitamente autorizados.
- SHARED — acessível aos usuários convidados/compartilhados, conforme permissão.
- PUBLIC — acessível publicamente; operações de escrita continuam exigindo autenticação e autorização.

## 5. Entidades principais

- User — identidade do usuário.
- Project — projeto gerenciado pelo sistema.
- ProjectMember — relacionamento entre projeto e usuários compartilhados.
- ProjectColumn — colunas do Kanban de um projeto.
- Task — atividade ligada a um projeto e a uma coluna.
- Idea — ideia de projeto que pode evoluir para um Project.
- Repository — dados do repositório Git vinculado ao projeto.
- ProjectDocument — descrições, diagramas e documentação.
- Suggestion — sugestão enviada para um projeto; São um tipo de Task.
- BugReport — reporte de bug enviado para um projeto; São um tipo de Task.
- ApiKey ou mecanismo equivalente — opcional para integrações autenticadas de escrita, caso necessário.
- AuditEvent — opcional, para registrar alterações relevantes.

## 6. Modelo de dados proposto

Campos mínimos sugeridos; o agente pode ajustar tipos conforme Firebase SQL Connect.

users: id, name, email, avatarUrl, createdAt, updatedAt

projects: id, ownerId, name, slug, description, visibility, status, repositoryId, readme, createdAt, updatedAt

project_members: id, projectId, userId, role, createdAt

project_columns: id, projectId, name, key, position, color, createdAt, updatedAt

tasks: id, projectId, columnId, title, description, priority, position, dueDate, createdById, createdAt, updatedAt

ideas: id, ownerId, title, description, visibility, status, technologies, links, createdAt, updatedAt, convertedProjectId

repositories: id, projectId, provider, url, owner, name, defaultBranch

project_documents: id, projectId, type, title, content, position, createdAt, updatedAt

suggestions: id, projectId, authorUserId nullable, authorName, authorEmail nullable, title, description, status, createdAt

bug_reports: id, projectId, authorUserId nullable, authorName, authorEmail nullable, title, description, severity, environment, status, createdAt

api_keys: id, ownerId, projectId nullable, name, keyHash, scopes, lastUsedAt, expiresAt, createdAt

## 7. Regras de negócio

- Todo projeto pertence a um proprietário.
- Toda atividade pertence a exatamente um projeto e uma coluna.
- Um projeto deve possuir as colunas padrão Backlog, Em execução e Concluído ao ser criado.
- O usuário pode criar, renomear, reordenar e excluir colunas, desde que não viole regras de integridade. A exclusão de uma coluna com atividades deve exigir migração dessas atividades ou confirmação explícita.
- Atividades devem possuir ordenação dentro da coluna para suportar drag-and-drop.
- Uma ideia pode permanecer como ideia ou ser convertida em projeto. A conversão deve preservar seus dados e registrar o vínculo convertedProjectId.
- Projetos podem possuir documentação, diagramas e descrição.
- O repositório Git é um vínculo do projeto e não deve ser tratado como uma cópia do repositório.
- Sugestões e bugs recebidos pela API devem ficar associados ao projeto de destino.
- Recursos privados nunca podem ser expostos por endpoints públicos sem autorização.
- Recursos compartilhados devem respeitar as permissões concedidas.
- Recursos públicos podem ser consultados sem login por endpoints de leitura definidos como públicos.

## 8. Módulo de Projetos

- Dashboard com lista, busca, filtros por visibilidade/status/tecnologia e ordenação.
- Criar, editar, arquivar e excluir projetos.
- Página pública do projeto quando visibility = PUBLIC.
- Página privada/compartilhada com visão completa de gestão.
- Dados: nome, slug, descrição curta, descrição completa, status, tecnologias, links, repositório e documentação.
- Área de diagramas: permitir armazenar conteúdo em formato adequado ao MVP, preferencialmente Mermaid, com renderização visual.
- Área de documentação: Markdown deve ser considerado como formato inicial.
- Indicadores: quantidade de tarefas por coluna, progresso, últimas alterações e links externos.

## 9. Módulo Kanban

- Quadro por projeto.
- Colunas padrão: Backlog, Em execução, Concluído.
- Adicionar, editar, reordenar e excluir colunas.
- Criar e editar atividades.
- Drag-and-drop de atividades entre colunas e dentro da mesma coluna.
- Persistir position de forma consistente.
- Campos de atividade: título, descrição, prioridade, prazo, coluna, posição e autor.
- Permitir filtros por prioridade, prazo e texto.
- Preparar arquitetura para labels, responsáveis e comentários em versões futuras.

## 10. Módulo de Ideias

- Lista separada de ideias.
- CRUD completo.
- Estados sugeridos: Nova, Em análise, Validada, Arquivada, Convertida em projeto.
- Tecnologias pretendidas, descrição, links, observações e prioridade/opcional.
- Visibilidade privada, compartilhada ou pública.
- Ação 'Converter em projeto', criando o projeto e mantendo referência bidirecional.
- Após conversão, a ideia original deve permanecer como histórico, salvo exclusão explícita.

## 11. API pública

A API deve ser RESTful e versionada.

- GET /api/v1/projects/{slug} — obter dados públicos de um projeto.
- GET /api/v1/projects/{slug}/suggestions — listar sugestões públicas/permitidas.
- POST /api/v1/projects/{slug}/suggestions — enviar sugestão.
- GET /api/v1/projects/{slug}/bugs — listar reportes conforme política de exposição.
- POST /api/v1/projects/{slug}/bugs — enviar bug report.
- GET /api/v1/projects/{slug}/tasks — opcional no MVP; somente dados explicitamente públicos.
- GET /api/v1/projects/{slug}/docs — obter documentação pública.
Requisitos da API:

- Respostas JSON padronizadas.
- HTTP status codes corretos.
- Validação rigorosa de payload.
- Rate limiting para endpoints públicos de escrita.
- CORS configurável.
- Proteção contra spam/abuso.
- Paginação em listas.
- Filtros e ordenação documentados.
- OpenAPI/Swagger ou documentação equivalente.
- Nunca retornar campos privados, tokens ou hashes.

## 12. Sugestões e bugs

Cada projeto público deve poder disponibilizar links como 'Sugerir melhoria' e 'Reportar bug'. Esses links podem abrir uma interface própria do sistema ou consumir diretamente os endpoints da API.

- Sugestão: título, descrição, contexto, autor opcional e data.
- Bug: título, descrição, severidade, passos para reprodução, comportamento esperado, comportamento observado, ambiente e anexos como evolução futura.
- Status sugeridos: aberto, em análise, aceito, rejeitado, resolvido/fechado.
- O proprietário deve visualizar e gerenciar os registros no painel do projeto.

## 13. Telas

- Login / cadastro / recuperação de acesso.
- Dashboard geral.
- Projetos — listagem.
- Projeto — visão geral.
- Projeto — Kanban.
- Projeto — documentação.
- Projeto — diagramas.
- Projeto — repositório e links.
- Projeto — sugestões.
- Projeto — bugs.
- Configurações e compartilhamento.
- Ideias — listagem.
- Ideia — detalhes/edição.
- Página pública do projeto.
- Formulário público de sugestão.
- Formulário público de bug.

## 14. UX/UI

- Interface desktop-first, responsiva para tablet e mobile.
- Navegação lateral ou equivalente com acesso rápido a Dashboard, Projetos e Ideias.
- Kanban com drag-and-drop acessível.
- Feedback visual para loading, sucesso, erro e salvamento.
- Confirmação para operações destrutivas.
- URLs amigáveis usando slugs.
- Página pública deve funcionar sem exigir autenticação.
- Priorizar simplicidade e densidade de informação adequada para gestão de software.

## 15. Segurança

- Autenticação robusta.
- Autorização no backend.
- Validação de entrada no servidor.
- Sanitização/escaping para conteúdo renderizado.
- Proteção contra XSS, CSRF quando aplicável, injection e abuso da API.
- Rate limiting para endpoints públicos.
- Segredos exclusivamente em variáveis de ambiente/secret management.
- Não expor credenciais de Firebase ou chaves administrativas no frontend.
- Logs sem dados sensíveis.
- Política explícita de CORS.
- Controle de acesso testado para private/shared/public.

## 16. Deploy e ambientes

- Desenvolvimento local.
- Staging opcional.
- Produção na Netlify.
- Configuração por variáveis de ambiente.
- Build automatizado.
- Deploy baseado em Git.
- Funções/server-side da Netlify para endpoints da API, se essa for a abordagem escolhida.
- Migrations/versionamento do banco devem ser reproduzíveis.

## 17. Estrutura sugerida do repositório

/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── hooks/
│   ├── services/
│   ├── api/
│   ├── domain/
│   ├── types/
│   ├── utils/
│   └── main.tsx
├── netlify/
│   └── functions/
├── public/
├── tests/
├── docs/
├── .env.example
├── netlify.toml
├── package.json
├── tsconfig.json
└── README.md

## 18. Fases de implementação

Fase 0 — Fundação: Criar projeto React/Vite/TypeScript, configurar lint/format/testes, Netlify, ambientes e estrutura.

Fase 1 — Auth e usuários: Login, cadastro, sessão, proteção de rotas e modelo de usuário.

Fase 2 — Projetos: CRUD, visibilidade, dashboard e vínculo Git.

Fase 3 — Kanban: Colunas, atividades, drag-and-drop e persistência de ordenação.

Fase 4 — Ideias: CRUD, estados e conversão para projeto.

Fase 5 — Documentação: Descrição, Markdown e diagramas.

Fase 6 — Compartilhamento: Membros, permissões e páginas públicas.

Fase 7 — API pública: Endpoints, validação, rate limiting, CORS e documentação.

Fase 8 — Sugestões e bugs: Formulários públicos, gestão interna e status.

Fase 9 — Qualidade: Testes, segurança, performance, acessibilidade e revisão.

Fase 10 — Produção: CI/CD, observabilidade, documentação e checklist de lançamento.

## 19. Estratégia de testes

- Unitários para regras de domínio.
- Testes de componentes React.
- Testes de integração para API + banco.
- Testes de autorização para private/shared/public.
- Testes de API para payloads inválidos, autenticação, rate limiting e status codes.
- Testes E2E dos fluxos principais: cadastro → projeto → Kanban → ideia → conversão → publicação → sugestão/bug.
- Testes de regressão para operações de drag-and-drop e ordenação.

## 20. Critérios de aceite do MVP

- Usuário consegue criar conta e fazer login.
- Usuário consegue criar, editar e excluir projetos.
- Cada projeto nasce com Backlog, Em execução e Concluído.
- Usuário consegue criar novas colunas.
- Usuário consegue criar e mover atividades entre colunas.
- Cada atividade pertence a um projeto.
- Projeto possui descrição, tecnologias e repositório Git.
- Usuário consegue criar e administrar ideias.
- Ideia pode ser convertida em projeto.
- Projetos e ideias suportam private/shared/public.
- Projeto público possui página acessível sem login.
- Projeto público possui mecanismo para sugestão e bug report.
- API pública permite receber sugestões e bugs para um projeto.
- API não expõe dados privados.
- Aplicação está publicada na Netlify.
- Documentação de setup, arquitetura e API está presente no repositório.
- Testes automatizados cobrem os fluxos críticos.

## 21. Prompt mestre para o agente de IA

Você é um agente de engenharia de software responsável por implementar o projeto descrito neste documento. Implemente o sistema de ponta a ponta, priorizando código funcional, seguro, testável e simples de manter. Antes de escrever código, analise a arquitetura, confirme a compatibilidade das tecnologias escolhidas e identifique ambiguidades. Não substitua silenciosamente uma tecnologia por outra. Se alguma integração não existir exatamente como especificada, documente a limitação e proponha a menor adaptação arquitetural necessária.

- Comece pela Fase 0 e avance em incrementos funcionais.
- Ao final de cada fase, execute testes e valide o build.
- Mantenha um arquivo CHANGELOG/PROGRESS.md com o que foi concluído, pendências e decisões.
- Não implemente funcionalidades futuras antes de estabilizar o MVP.
- Nunca coloque segredos no código.
- Toda rota protegida deve possuir verificação server-side.
- Toda alteração de schema deve ser versionada.
- Escreva testes para regras de autorização e visibilidade.
- Forneça documentação para execução local e deploy.
- Ao encontrar erro, investigue a causa raiz em vez de mascarar o problema.
- Ao finalizar o MVP, produza um relatório com funcionalidades implementadas, testes executados, limitações e próximos passos.

## 22. Decisões a validar antes do desenvolvimento

- Confirmar exatamente quais recursos do Firebase SQL Connect estarão disponíveis para o projeto e como será feita a autenticação/autorização. -> SQL Connect e Storage, inicialmente em modo de teste, mas futuramente com autenticação do próprio Firebase (email/senha e google)
- Definir provedor Git inicial GitHub -> no repositório atual.
- Definir se usuários compartilhados poderão editar ou somente visualizar. -> O proprietário poderá editar as permissões de cada usuário que adicionar aos seus projetos.
- Definir se sugestões e bugs públicos aparecerão publicamente ou apenas para o proprietário. -> Aparecerão publicamente para que não usuários possam acompanhar as atividades, mas poderão ser recusadas, aprovadas ou arquivadas pelo proprietário.
- Definir necessidade de anexos para bug reports no MVP. -> Sim, serão necessárias imagens para a descrição dos bugs.
- Definir estratégia de exclusão/arquivamento de projetos. -> Arquivamento.
- Definir limites de rate limiting e política anti-spam. -> Sim, serão necessárias limites de rate limiting e política anti-spam.
- Definir se diagramas serão exclusivamente Mermaid no MVP. -> Não, não serão exclusivamente Mermaid, poderá usar qualquer formato. 

## 23. Fora do escopo inicial -> tudo isso será implementado no futuro.

- Integração automática profunda com GitHub/GitLab (issues, commits, PRs, CI) — preparar arquitetura, mas deixar para evolução.
- Aplicativo mobile nativo.
- Chat em tempo real.
- IA para gerar tarefas ou documentação.
- Sistema avançado de analytics.
- Marketplace de projetos.
- Cobrança/assinaturas.

## 24. Evoluções futuras

- Integração com GitHub/GitLab para sincronizar issues.
- Webhooks de repositórios.
- Comentários e menções nas atividades.
- Labels e responsáveis.
- Notificações.
- Pesquisa global.
- IA para transformar ideias em roadmap e tarefas.
- Dashboard de métricas.
- Exportação/importação.
- Integração com Slack/Discord/e-mail.
- API keys por projeto para integrações externas avançadas.

## 25. Resultado esperado

Ao final do projeto deve existir uma aplicação web em produção capaz de funcionar como um hub pessoal de projetos e ideias, com gerenciamento Kanban, documentação, vínculo com repositórios Git, controle de visibilidade, colaboração e uma API pública que permita que os próprios projetos integrem mecanismos de sugestão e reporte de bugs.
