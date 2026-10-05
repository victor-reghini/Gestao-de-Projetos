# Regra de Gestão de Branches e Git Workflow

## 1. Proteção da Branch Principal (`main`)
- **Proibição Absoluta:** NUNCA comitar ou realizar push diretamente na branch `main`.
- Toda nova funcionalidade, correção de bug ou refatoração deve obrigatoriamente viver em uma branch separada.

## 2. Comando "Nova atividade"
Sempre que o usuário digitar `Nova atividade`, `nova atividade`, `/nova-atividade` ou solicitar o início de uma nova demanda:
1. **Derivar nome semântico da branch:**
   - Para novas funcionalidades: `feature/<descricao-kebab-case>`
   - Para correções: `fix/<descricao-kebab-case>`
   - Para tarefas gerais: `task/<descricao-kebab-case>`
   *(Se o usuário não especificar nome imediato, inferir do contexto ou usar `task/<timestamp>`)*
2. **Executar checkout imediato:**
   - Executar: `rtk git checkout -b <nome-da-branch>` a partir da `main` sincronizada.
3. **Isolamento de Alterações:**
   - Todas as modificações de arquivos, testes e commits devem ser realizados exclusivamente dentro da branch criada.
