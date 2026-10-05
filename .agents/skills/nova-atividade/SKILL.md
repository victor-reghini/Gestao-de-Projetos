---
name: nova-atividade
description: >
  Inicia uma nova atividade no projeto criando e alternando para uma branch git dedicada.
  Garante que nenhuma alteração seja feita ou enviada diretamente na branch main.
  Ativa sempre que o usuário digitar "Nova atividade", "nova atividade", "/nova-atividade"
  ou pedir para iniciar uma nova tarefa.
argument-hint: "[nome_ou_descricao_da_atividade]"
license: MIT
---

# Fluxo de Nova Atividade (/nova-atividade)

Sempre que o usuário enviar o comando `Nova atividade` ou iniciar uma demanda:

## 1. Definir o Nome da Branch
- Caso o usuário especifique um nome/tópico (ex.: `Nova atividade: adicionar filtro por tags`), converta para slug:
  - Funcionalidade: `feature/<slug>` (ex.: `feature/adicionar-filtro-tags`)
  - Correção de erro: `fix/<slug>` (ex.: `fix/correcao-sync-status`)
  - Tarefa geral: `task/<slug>` (ex.: `task/reorganizacao-testes`)
- Se nenhum nome for informado, derive do contexto do projeto ou use `task/<timestamp>`.

## 2. Preparar e Criar a Branch
1. Verificar status atual:
   ```bash
   rtk git status
   ```
2. Garantir que a base está limpa e sincronizada.
3. Criar e alternar para a nova branch:
   ```bash
   rtk git checkout -b <nome-da-branch>
   ```

## 3. Isolamento Total da `main`
- **Regra Absoluta:** NUNCA commitar ou realizar `git push` diretamente na branch `main`.
- Toda alteração, edição de código e commit pertencem exclusivamente à branch de trabalho criada.
