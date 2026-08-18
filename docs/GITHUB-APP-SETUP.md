# GitHub App — Setup para automação “repository created → PR no hub”

Este documento descreve como criar e configurar o GitHub App que escuta o evento **repository created** na organização Arrow-Head-Tech e abre um PR em `Arrow-Head-Tech.github.io` adicionando uma entrada em `content/projects.json`.

---

## 1. Criar o App

1. Acesse **GitHub** → **Settings** (da sua conta) → **Developer settings** → **GitHub Apps** → **New GitHub App**.
2. Preencha:
   - **GitHub App name:** ex. `Arrowhead Hub Bot` (nome único no GitHub).
   - **Homepage URL:** ex. `https://arrow-head-tech.github.io` ou a URL do repo.
   - **Webhook:** marque **Active**.
   - **Webhook URL:** a URL pública onde o serviço receptor está hospedado (ex. `https://seu-dominio.com/webhook`). Para testes locais pode usar [ngrok](https://ngrok.com/) ou [smee.io](https://smee.io/).
   - **Webhook secret:** gere um segredo forte (ex. `openssl rand -hex 32`) e guarde; será a variável `WEBHOOK_SECRET` no serviço.
   - **Permissions & events** (aba seguinte).

---

## 2. Permissões (Repository permissions)

| Permission     | Access   | Motivo                                      |
|----------------|----------|---------------------------------------------|
| Contents       | Read and write | Criar branch e alterar `content/projects.json` |
| Pull requests  | Read and write | Abrir o PR após o commit                    |
| Metadata       | Read-only     | Obrigatório (já vem por padrão)             |

Nenhuma permissão de “Organization” é necessária só para abrir PR neste repo.

---

## 3. Eventos (Subscribe to events)

Marque apenas:

- **Repository** — para receber `repository` (inclui `created`).

Não é necessário **Push**, **Create**, etc.

---

## 4. Onde instalar o App

- **Install App** → escolha **Only on this account** e selecione a organização **Arrow-Head-Tech** (ou “All repositories” / só o repo do hub, conforme desejado).  
- Assim o App recebe eventos de “repository created” em repositórios da org (e, se instalado só no hub, ainda assim pode ser usado para criar PRs no hub; para “repository created” em qualquer repo da org, a instalação deve incluir esses repos ou “All”).

Recomendação: instalar na org **Arrow-Head-Tech** com acesso a **All repositories** (ou pelo menos ao repo `Arrow-Head-Tech.github.io` e aos repos que podem ser criados), para que o evento “repository created” seja entregue ao webhook.

---

## 5. Variáveis para o serviço receptor

Após criar o App e instalá-lo na org, reúna:

| Variável           | Onde obter |
|--------------------|------------|
| `GITHUB_APP_ID`    | App → General → App ID |
| `GITHUB_APP_PRIVATE_KEY` | App → General → Private keys → Generate private key (conteúdo do `.pem`) |
| `GITHUB_APP_INSTALLATION_ID` | Na URL ao abrir a instalação na org: `.../installations/<id>` ou via API `GET /orgs/Arrow-Head-Tech/installations` |
| `WEBHOOK_SECRET`   | O mesmo “Webhook secret” definido no passo 1 |
| `HUB_REPO`         | `Arrow-Head-Tech/Arrow-Head-Tech.github.io` (opcional; pode ser fixo no código) |

O serviço em `webhook/` usa essas variáveis para validar o webhook e criar o PR no hub.

---

## 6. Fluxo resumido

1. Alguém cria um novo repositório na org **Arrow-Head-Tech**.
2. O GitHub envia um POST para a **Webhook URL** com evento `repository` e `action: created`.
3. O receptor valida o header `X-Hub-Signature-256` com `WEBHOOK_SECRET`, deduplica (ex.: id já existe ou PR aberto) e monta uma entrada padrão (phase `idea`, language/stack `Unknown`, short_description `TBD`).
4. Com um **installation access token**, o serviço cria uma branch `bot/add-repo-<slug>-<timestamp>`, atualiza `content/projects.json` com a nova entrada e abre um **Pull request** no `Arrow-Head-Tech.github.io`.
5. Após o merge do PR, o site é atualizado no próximo deploy.

---

## 7. Triagem após o PR

- O PR criado pelo bot terá uma entrada com placeholders (`Unknown`, `TBD`). Alguém pode editar o `projects.json` no próprio PR ou depois no `main` para preencher language, stack, tags e short_description.
- (Opcional) Abrir uma **Issue** de triagem referenciando o PR quando a entrada tiver placeholders; isso pode ser documentado no README do hub.

---

## 8. Se o evento `repository` não chegar

Se o App está configurado (Repository marcado, webhook URL e secret corretos) mas **nenhuma entrega** `repository` / `created` aparece em **Advanced → Recent deliveries** ao criar um repo na org:

- **App criado na org** (`organizations/Arrow-Head-Tech/settings/apps/...`): há relatos de que o GitHub não envia o evento `repository` para Apps *owned* pela organização nesse contexto.
- **Alternativa:** criar o App na **sua conta** (Settings da **sua conta** → Developer settings → GitHub Apps → **New GitHub App**). Preencher nome, homepage, webhook URL (ex. smee), webhook secret, **Repository** em Subscribe to events, **Contents** e **Pull requests** em Read and write. Depois: **Install App** → escolher a org **Arrow-Head-Tech** e instalar. Atualizar o `webhook/.env` com o novo **App ID**, a nova **private key** e o **Installation ID** da instalação na org. Testar criando um repo na org; o evento deve passar a ser entregue.

---

## 9. Registro de tentativas (troubleshooting)

Resumo do que foi testado ao configurar o App e por que o evento `repository` / `created` não chegou ao webhook.

### App 1 — "Arrowhead Hub Bot" (conta do usuário)

- **Criação:** App criado em Settings → Developer settings → GitHub Apps (conta Lukasavicus).
- **Instalação:** Instalado **na conta do usuário** (Lukasavicus), não na org.
- **Verificação via API:** `GET /app/installations` mostrou apenas `Installation ID: 113406270 | Org/User: Lukasavicus | Type: User`.
- **Conclusão:** Eventos de "repository created" na **org** Arrow-Head-Tech não são enviados para um App instalado só na conta do usuário. O App precisava estar instalado **na org**.

### App 2 — "Arrowhead Hub Bot Automation" (criado na org)

- **Criação:** App criado em **organizations/Arrow-Head-Tech/settings/apps** (New GitHub App da org).
- **Webhook:** URL `https://smee.io/Kj01DEle4IOoCdQ`, secret configurado. Confirmado via `GET /app/hook/config` (JWT).
- **Instalação:** Instalado na org Arrow-Head-Tech. Installation ID: `113410605` (URL `.../installations/113410605`).
- **Subscribe to events:** O evento **Repository** não aparecia em "Subscribe to events" quando só permissões de **Repository** estavam configuradas. O checkbox **Repository** apareceu em **Permissions & events** após configurar permissão de **Organization** (não apenas Repository permissions).
- **Permissões:** Repository → Contents (Read and write), Pull requests (Read and write); Subscribe to events → **Repository** e **Pull request** marcados.
- **Testes:** Vários repositórios de teste criados na org (`webhook-test-repo`, `webhook-test-repo-2`, … até `webhook-test-repo-9`).
- **Resultado:** Em **Advanced → Recent deliveries** só aparecem entregas `installation` (created) e `ping`. Nenhuma entrega `repository` / `created` em nenhum teste.
- **Flask + smee:** Receptor (Flask) e smee-client rodando; porta 8080 verificada; webhook URL e secret conferidos. Nenhum POST no log do Flask para evento repository.
- **Conclusão:** Com App **criado e owned pela org** (`organizations/Arrow-Head-Tech/settings/apps/arrowhead-hub-bot-automation`), o GitHub **não enviou** o evento `repository` / `created` ao criar repositórios na própria org. Comportamento observado de forma consistente em todas as tentativas.

### Outras verificações feitas

- **Redeliver:** Script `webhook/redeliver.py` criado para chamar `POST /app/hook/deliveries/{id}/attempts`. Não existia entrega `repository` / `created` para redeliver (apenas `installation` e `ping`).
- **Webhook config por script:** `webhook/set_webhook_config.py` criado para `PATCH /app/hook/config` (URL + secret) via JWT. Executado com sucesso; URL e secret já estavam corretos.
- **Listagem de entregas:** Uso recorrente de `GET /app/hook/deliveries` com JWT para confirmar que nenhuma nova entrega `repository` surgia após criar repos.
- **Permissão "Permission updates requested":** Verificado na org se havia pendência de aceite de permissões; não havia nada do tipo na instalação usada.

### Próxima tentativa recomendada

- Criar um **novo** App na **conta do usuário** (não na org), com os mesmos webhook URL e secret, Repository em Subscribe to events, Contents e Pull requests em Read and write; **instalar esse App na org** Arrow-Head-Tech; atualizar `webhook/.env` com o novo App ID, private key e Installation ID da org. Testar novamente a criação de um repo na org e conferir **Recent deliveries** e o receptor.

---

## 10. Referências

- [GitHub Apps](https://docs.github.com/en/apps)
- [Webhook events — repository](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository)
- [Authenticating with GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)
