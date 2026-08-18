# Webhook — repository created → PR no hub

Serviço que recebe webhooks do **GitHub App** e, no evento **repository created**, abre um PR em `Arrow-Head-Tech.github.io` adicionando uma entrada em `content/projects.json` (phase `idea`, placeholders Unknown/TBD).

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `WEBHOOK_SECRET` | Sim | Mesmo secret configurado no GitHub App (Webhook secret). |
| `GITHUB_APP_ID` | Sim | App ID do GitHub App. |
| `GITHUB_APP_PRIVATE_KEY` | Sim | Conteúdo do `.pem` (incl. `-----BEGIN/END-----`) ou caminho do ficheiro. |
| `GITHUB_APP_INSTALLATION_ID` | Sim | ID da instalação do App na org (ex. Arrow-Head-Tech). |
| `PORT` | Não | Porta do servidor (default `8080`). |
| `FLASK_DEBUG` | Não | `1` ou `true` para debug. |

Ver **docs/GITHUB-APP-SETUP.md** para como obter App ID, private key e installation ID.

**Definir URL e secret do webhook pela linha de comando:**  
`python set_webhook_config.py` (usa `WEBHOOK_SECRET` e, se existir, `WEBHOOK_URL` do `.env`; senão URL default = smee). Para sobrescrever: `python set_webhook_config.py --url https://... --secret SEU_SECRET`.

## Rodar localmente

```bash
cd webhook
python3 -m venv .venv
source .venv/bin/activate   # ou .venv\Scripts\activate no Windows
pip install -r requirements.txt
export WEBHOOK_SECRET="..."
export GITHUB_APP_ID="..."
export GITHUB_APP_PRIVATE_KEY="$(cat /caminho/ao/app.private-key.pem)"
export GITHUB_APP_INSTALLATION_ID="..."
python app.py
```

O endpoint fica em `http://localhost:8080/`. Para receber eventos do GitHub em local, use um túnel (ex. [ngrok](https://ngrok.com/) ou [smee.io](https://smee.io/)) e configure essa URL como Webhook URL no App.

## Endpoints

- **GET /** — Health check; retorna `{"status":"ok"}`.
- **POST /** ou **POST /webhook** — Recebe o payload do GitHub. Valida `X-Hub-Signature-256`, processa apenas `repository` + `action: created`; cria branch `bot/add-repo-<slug>-<timestamp>`, atualiza `projects.json` e abre o PR.

Respostas: `200` (ignorado/duplicado), `201` (PR criado), `400`/`401`/`500` (erro).

## Deploy

Pode ser hospedado em qualquer serviço que rode Python (Cloud Run, Fly.io, Railway, etc.). Configure as env e defina a **Webhook URL** do GitHub App para `https://seu-dominio/` ou `https://seu-dominio/webhook`.
