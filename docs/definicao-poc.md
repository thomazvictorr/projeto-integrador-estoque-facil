# Definição da Prova de Conceito (PoC)

Projeto Integrador, 2ª etapa. Tema: **Sistema de Gestão de Estoque para Pequenos Comércios**
(mercadinhos, papelarias e lanchonetes).

## 1. Revisita do projeto

O sistema completo previsto na 1ª etapa envolve vários módulos: cadastro de produtos, controle de entradas e
saídas, alertas, relatórios, gestão de fornecedores, usuários com perfis diferentes e uso em dispositivos móveis.

O maior risco do projeto não é técnico, e sim de **adoção**: o pequeno comerciante só vai usar o sistema se
registrar uma entrada ou uma saída for mais rápido do que anotar no caderno, e se o sistema avisar sozinho
quando um produto está acabando. Se essa experiência básica não funcionar, os demais módulos perdem o sentido.

Por isso, a revisita priorizou a jornada que concentra o maior valor para o usuário e o maior risco para o produto.

## 2. Jornada selecionada

> O comerciante cadastra um produto, registra entradas e saídas de estoque, e o sistema mostra o estoque atual
> com **alerta de estoque baixo**.

Passos da jornada (mapeamento de UX):

| # | Passo do usuário | O que o sistema faz |
|---|---|---|
| 1 | Cadastra um produto com SKU, preço, estoque inicial e estoque mínimo | Valida os dados, impede SKU duplicado e registra o estoque inicial no histórico |
| 2 | Registra uma **entrada** (compra de fornecedor) | Soma ao estoque e grava a movimentação |
| 3 | Registra uma **saída** (venda ou uso) | Subtrai do estoque; **bloqueia** saída maior que o saldo |
| 4 | Consulta a lista de produtos | Exibe o saldo atual e marca em destaque os produtos com estoque igual ou abaixo do mínimo |
| 5 | Filtra apenas os alertas | Lista somente os produtos que precisam de reposição |
| 6 | Consulta o histórico | Mostra as últimas movimentações com data, tipo e observação |

## 3. Hipótese a ser validada

"Um comerciante consegue manter o estoque correto e ser avisado de produtos acabando com poucos cliques
(menos de 3 por movimentação), sem treinamento."

Critérios de sucesso da PoC:

- Registrar uma entrada ou saída em até 3 interações (botão, quantidade, confirmar).
- O estoque nunca fica negativo.
- O alerta aparece imediatamente após a movimentação que cruza o mínimo.
- A interface é utilizável em tela de celular.

## 4. O que está fora do escopo da PoC

Login e perfis de usuário, fornecedores, relatórios avançados, leitura de código de barras, integração com
caixa/PDV e aplicativo nativo. Esses itens ficam para as próximas etapas do projeto.

## 5. Vantagens da abordagem

- **Redução de riscos:** valida a experiência central antes de investir nos demais módulos.
- **Validação rápida:** a viabilidade técnica e de uso aparece em poucos dias.
- **Tomada de decisão:** ajuda os stakeholders a decidir se o projeto segue como planejado ou precisa de ajustes.

## 6. Arquitetura e modelagem de dados

```
Navegador  ->  Frontend (React + Vite)  ->  API REST (Node + Express)  ->  SQLite
```

Modelo de dados:

```
produtos                              movimentacoes
-------------------------             -------------------------
id (PK)                               id (PK)
nome                                  produto_id (FK -> produtos.id)
sku (único)                           tipo (ENTRADA | SAIDA)
categoria                             quantidade (> 0)
preco                                 observacao
estoque_atual (>= 0)                  criado_em
estoque_minimo (>= 0)
criado_em
```

Relação: um produto tem muitas movimentações (1:N). Ao excluir um produto, seu histórico é removido em cascata.

Regra central: `estoque_baixo = estoque_atual <= estoque_minimo`. A atualização do saldo e o registro da
movimentação acontecem na mesma transação do banco, para que os dois nunca fiquem inconsistentes.

## 7. Stack escolhida

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 19 + Vite | Componentes simples, build rápido, layout responsivo |
| Backend | Node.js + Express | API REST simples e conhecida |
| Banco | SQLite (`node:sqlite`, embutido no Node 22) | Sem servidor e sem dependência nativa para compilar, ideal para a PoC |
| Testes | `node:test` | Já vem no Node, sem dependência extra |
| Repositório | GitHub | Exigência da entrega |
