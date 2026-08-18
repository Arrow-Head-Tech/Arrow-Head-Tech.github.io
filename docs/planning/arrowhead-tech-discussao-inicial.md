# Arrowhead Tech — Discussão Inicial do Projeto

## 1. Contexto geral

O projeto **arrowheadtech.github.io** é o site da organização **Arrowhead Tech**, criada para reunir projetos pessoais, provas de conceito, experimentos e iniciativas autorais.

A motivação central do projeto nasce do fato de existir um grande volume de ideias e projetos em diferentes níveis de maturidade. Ao longo do tempo, esses projetos foram sendo desenvolvidos de forma fragmentada, às vezes como testes isolados, às vezes como ferramentas já utilizadas no dia a dia, mas sem uma camada única de organização, visualização e operação.

A proposta do Arrowhead Tech é consolidar esse ecossistema em uma estrutura única, capaz de:

- capturar novas ideias;
- organizar projetos por estágio de maturidade;
- preservar contexto e referências;
- facilitar a retomada de projetos antigos;
- integrar filesystem local, monorepo, interface web e GitHub;
- usar agentes/LLMs para apoiar análise, refinamento e execução.

---

## 2. Antecedentes conceituais

### 2.1 Balcony

O **Balcony** foi pensado como uma ferramenta de visualização e sincronização entre o sistema de arquivos local e uma interface web.

A ideia central era ter projetos organizados em pastas representando estágios do ciclo de vida, e uma interface que permitisse:

- visualizar todos os projetos em formato de “balcão”;
- mover projetos entre lanes;
- refletir automaticamente essas mudanças no sistema de arquivos local;
- atualizar o site quando alterações fossem detectadas localmente.

Em essência, o Balcony funcionava como uma ferramenta de **sincronização bidirecional entre filesystem e catálogo visual**.

### 2.2 Potts

O **Potts** (referência a Pepper Potts) foi pensado como uma assistente operacional para reduzir o atrito de transformar uma ideia em projeto.

A visão era permitir que entradas simples em linguagem natural ou em arquivos iniciais gerassem automações como:

- refinamento da ideia;
- criação de repositório;
- bootstrap do projeto;
- geração de roadmap;
- acionamento de workflows no GitHub.

Em essência, o Potts representava a camada de **automação e orquestração assistida por IA**.

---

## 3. Visão consolidada do Arrowhead Tech

O Arrowhead Tech surge como a tentativa de unificar essas ideias em uma plataforma única.

Ele não deve ser visto apenas como um site, mas como um **hub de gestão do portfólio de ideias e projetos**, combinando:

- **catálogo visual** de iniciativas;
- **modelo de maturidade** dos projetos;
- **sincronização com artefatos reais**;
- **preservação de contexto**;
- **agentes de IA para análise e automação**.

Em termos conceituais, o produto pode ser descrito assim:

> **Arrowhead Tech é uma plataforma pessoal de gestão de ideias e projetos, com catálogo central, workflow de maturidade, sincronização com artefatos reais e automação assistida por IA para transformar ideias em execução.**

---

## 4. Refinamento do estágio “Ideia”

O estágio **Ideia** representa o momento mais inicial do fluxo.

Ele existe para registrar algo que parece interessante, antes que seja esquecido. Nesse estágio, a proposta ainda não precisa estar madura, mas já deve ser passível de análise crítica.

### 4.1 Natureza do estágio

Uma ideia é:

- um insight;
- uma hipótese;
- uma oportunidade percebida;
- uma vontade de explorar algo;
- um embrião de projeto.

Ela ainda não precisa estar validada, mas não deve ser descartada sem antes passar por uma análise qualificatória.

### 4.2 Critério de passagem

As perguntas associadas à ideia **não precisam ser necessariamente eliminatórias**, mas sim **qualificatórias**.

Ou seja, a passagem para a próxima etapa pode ocorrer mesmo com algumas lacunas, desde que a ideia atinja um nível mínimo de consistência.

Exemplo de lógica:

- existe um conjunto de perguntas críticas;
- a ideia pode avançar se uma parcela relevante dessas perguntas for respondida de forma satisfatória;
- o que estiver faltando pode ser tratado como provocação adicional do agente.

### 4.3 Papel do agente/LLM no estágio Ideia

No estágio Ideia, o agente deve atuar como um **analista crítico**, e não como um sistema que apenas concorda com a proposta.

Sua função é:

- tensionar a ideia;
- identificar lacunas;
- transformar uma descrição inicial em análise estruturada;
- devolver perguntas complementares quando necessário;
- pesquisar o que já existe;
- apontar riscos de reinvenção da roda.

O agente deve assumir uma postura crítica e investigativa.

### 4.4 Perguntas-base para qualificação da ideia

A partir da discussão, surgiram as seguintes perguntas iniciais:

1. Qual problema real essa ideia resolve?
2. Qual o potencial de uso dessa ideia?
3. Quem se beneficiaria dela?
4. Essa ideia é para uso pessoal ou para uma audiência maior?
5. Ela tem vocação acadêmica, experimental ou de produto?
6. Qual a viabilidade técnica inicial?
7. Já existem soluções semelhantes?
8. Se já existem, por que essa ideia ainda faria sentido?
9. O que torna essa ideia diferente?
10. Por que alguém usaria essa solução em vez das alternativas já existentes?

### 4.5 Expansão inspirada por Lean Startup e Zero to One

Essas perguntas foram expandidas tomando como referência os princípios de **Lean Startup** e **Zero to One**, especialmente no sentido de:

- testar hipóteses cedo;
- validar problemas reais;
- evitar construir apenas “vitaminas” em vez de “analgésicos”;
- buscar diferenciais genuínos;
- avaliar potencial de criação de valor singular.

Perguntas adicionais relevantes:

11. Isso resolve um problema real e doloroso ou apenas algo superficial?
12. Existe um MVP simples que permitiria testar essa hipótese rapidamente?
13. Qual aprendizado mínimo precisa ser obtido antes de investir mais energia?
14. Existe um nicho onde essa ideia poderia ser a primeira, a melhor ou a mais especializada?
15. Se essa ideia der certo, ela tem potencial de escalar ou gerar valor desproporcional?
16. Quais hipóteses precisam ser validadas para a ideia continuar fazendo sentido?
17. Como será possível medir aprendizado ou validação?
18. A proposta é incremental ou realmente oferece algo novo?
19. Existe uma verdade importante que poucas pessoas enxergam e que essa ideia explora?
20. Essa ideia é forte o suficiente para justificar esforço contínuo?

### 4.6 Saída esperada do estágio Ideia

Ao final dessa etapa, o principal artefato gerado deve ser um **`context.md`**, reunindo de forma organizada:

- descrição da ideia;
- respostas às perguntas de qualificação;
- hipóteses levantadas;
- diferenciais percebidos;
- referências encontradas;
- alternativas existentes;
- dúvidas em aberto;
- direção inicial para continuação.

Esse documento marca a passagem da ideia para a etapa seguinte.

---

## 5. Fluxo de maturidade refinado

Depois do refinamento, o fluxo principal passou a ser entendido da seguinte forma:

1. **Ideia**
2. **PoC (Proof of Concept)**
3. **Dev**
4. **Staging**
5. **Prod**
6. Estados finais ou de encerramento: **Delivered**, **Dropped**, **Archived**

### 5.1 Ideia

Fase inicial de captura e qualificação.

O foco é registrar algo promissor e submetê-lo a uma análise crítica suficiente para decidir se vale ou não a pena investir mais energia.

### 5.2 PoC

A etapa de **PoC** existe para explorar a viabilidade prática da ideia.

Aqui acontece:

- detalhamento inicial;
- discussão da abordagem;
- primeiros experimentos;
- tentativa de implementação de uma versão embrionária;
- verificação de sentido prático.

A PoC não é ainda o pipeline regular de desenvolvimento. Ela é uma etapa de prova e exploração.

A saída da PoC pode ser:

- **não faz sentido continuar**;
- **faz sentido promover para Dev**.

### 5.3 Dev

A etapa **Dev** é onde a maior parte dos projetos tende a permanecer.

Ela representa o estado em que o projeto já passou pelo teste inicial da PoC e foi aceito para continuar sendo desenvolvido.

Nesse estágio ficam:

- projetos em construção;
- projetos que ainda não estão prontos para uso remoto;
- projetos com desenvolvimento ativo ou potencialmente retomável.

Dev é o grande pipeline de desenvolvimento do portfólio.

### 5.4 Staging

A principal definição de **Staging** é:

> o projeto já está suficientemente funcional para ser consumido pelo próprio autor de maneira real, remota e não dependente do ambiente local.

Critérios importantes dessa etapa:

- o projeto precisa estar **deployado**;
- ele não depende mais de rodar exclusivamente na máquina local;
- já pode ser acessado remotamente;
- o próprio Lucas já consegue utilizá-lo como usuário principal.

Ou seja, staging marca o ponto em que a ferramenta deixa de ser apenas algo em desenvolvimento e passa a ser algo realmente utilizável, ainda que por um único usuário.

### 5.5 Produção

A promoção de **Staging** para **Prod** ocorre quando o projeto deixa de ter apenas um único consumidor.

Critério principal:

> o projeto entra em produção quando não é mais apenas o autor que o utiliza, mas também outras pessoas.

Logo, produção está vinculada à existência de **múltiplos usuários** ou consumo compartilhado.

### 5.6 Delivered

**Delivered** representa algo que chegou ao seu objetivo, teve começo, meio e fim, entregou valor, e não necessariamente continuará evoluindo.

É um estado de conclusão bem-sucedida.

### 5.7 Dropped

**Dropped** representa um projeto que foi interrompido antes de gerar valor relevante em produção.

Ele pode ter morrido ainda em Ideia, PoC, Dev ou Staging, mas não se consolidou como algo de uso efetivo mais amplo.

### 5.8 Archived

Na formulação atual, **Archived** tende a significar algo que “morreu na praia” ou foi encerrado sem continuidade prática relevante.

Ainda existe alguma sobreposição conceitual entre Archived e Dropped, e esse ponto pode ser refinado futuramente.

Uma possível distinção futura seria:

- **Dropped**: interrompido sem valor consolidado;
- **Archived**: encerrado, mas mantido como registro, referência ou histórico.

Por enquanto, ambos ainda estão próximos conceitualmente.

---

## 6. Duas dimensões separadas: maturidade vs. workflow de execução

Um ponto importante da discussão foi a separação entre:

1. **maturidade do projeto**;
2. **estado de trabalho dentro de uma etapa**.

Isso significa que itens como:

- backlog;
- to do;
- in doing;
- em andamento;
- pausado;
- priorizado;

não precisam ser tratados como estágios de maturidade.

Esses itens pertencem melhor a uma **segunda dimensão**, mais ligada à gestão de trabalho.

### 6.1 Interpretação sugerida

- **Ideia / PoC / Dev / Staging / Prod** = estágio de maturidade do projeto
- **Backlog / To Do / In Progress / Paused / Done** = status operacional dentro da etapa

Exemplo:

- um projeto pode estar em **Dev** e, dentro de Dev, estar em **Backlog**;
- outro pode estar em **Dev** e estar em **In Progress**;
- outro pode estar em **Staging**, mas temporariamente pausado.

Essa separação evita misturar níveis conceituais diferentes e dá mais clareza ao modelo.

---

## 7. Papel esperado do agente em cada etapa

A interação com o agente/LLM deve variar conforme o estágio do projeto.

### 7.1 Ideia

Papel principal:

- provocar;
- criticar;
- identificar lacunas;
- pesquisar alternativas existentes;
- estruturar análise inicial;
- produzir o material-base para o `context.md`.

### 7.2 PoC

Papel principal:

- ajudar a detalhar a ideia;
- sugerir caminhos de implementação rápida;
- apoiar testes conceituais;
- levantar riscos;
- ajudar a decidir se a PoC justifica promoção para Dev.

### 7.3 Dev

Papel principal:

- apoiar refinamento técnico;
- sugerir próximas tasks;
- ajudar a decompor trabalho;
- revisar decisões;
- contribuir com implementações, arquitetura, roadmaps e documentação.

### 7.4 Staging

Papel principal:

- validar readiness para deploy;
- ajudar a revisar ambiente acessível remotamente;
- sugerir checklist de uso real;
- coletar ou organizar feedback do primeiro uso operacional.

### 7.5 Prod

Papel principal:

- apoiar observabilidade e evolução;
- organizar feedback de múltiplos usuários;
- sugerir melhorias;
- auxiliar na priorização de evolução do produto.

---

## 8. Síntese do modelo atual

No estado atual da discussão, o modelo pode ser resumido assim:

### 8.1 Fluxo principal

`Ideia -> PoC -> Dev -> Staging -> Prod`

### 8.2 Condições marcantes

- **Ideia -> PoC**: a ideia atinge qualificação mínima
- **PoC -> Dev**: a prova inicial mostrou que vale continuar
- **Dev -> Staging**: a ferramenta já está deployada e utilizável remotamente pelo próprio autor
- **Staging -> Prod**: o projeto passa a ter mais de um usuário

### 8.3 Encerramentos possíveis

- **Delivered**: objetivo cumprido
- **Dropped**: interrompido antes de consolidar valor
- **Archived**: encerrado e preservado como registro, ainda com definição futura a refinar

---

## 9. Próximos passos naturais

A partir desta discussão, os próximos passos mais naturais são:

1. formalizar melhor a atuação do agente em cada etapa;
2. definir a estrutura esperada do `context.md`;
3. transformar esse fluxo em épicos formais do sistema;
4. depois quebrar esses épicos em features, stories e tasks.

---

## 10. Observação final

Este documento consolida a discussão inicial e representa uma **primeira definição estruturada do modelo de maturidade do Arrowhead Tech**.

Alguns pontos ainda podem evoluir, especialmente:

- a distinção exata entre `dropped` e `archived`;
- a modelagem da segunda dimensão de workflow operacional;
- o grau de autonomia do agente em cada etapa;
- a definição formal dos artefatos obrigatórios para promoção entre estados.

Ainda assim, o núcleo conceitual já está suficientemente claro para sustentar o próximo refinamento.
