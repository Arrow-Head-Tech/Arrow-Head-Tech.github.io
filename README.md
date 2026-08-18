# Arrowhead Tech — Organization Hub

Monorepo do site da organização Arrowhead Tech: **site estático** (hub de projetos) + **BALCONY** (scanner local → export) + **POTTS** (voz + GitHub + adicionar ao hub). Fonte única: `content/projects.json`.

**Site:** https://arrow-head-tech.github.io

---

## Rodar o site localmente

Servir a partir da **raiz do repositório** (ou da pasta `dist/` após o build) para que `content/projects.json` seja acessível.

```bash
# Opção 1: raiz do repo (recomendado para dev)
cd Arrow-Head-Tech.github.io
python3 -m http.server 8000
# Abra http://localhost:8000/site/

# Opção 2: build + servir dist
npm run build
npx serve dist
# Abra http://localhost:3000 (ou a porta indicada)
```

---

## Rodar o backend (API)

O backend Flask é independente do site estático e fornece endpoints para mutações (GitHub) e chat (LLM proxy).

```bash
cd api
pip install -r requirements.txt
cp .env.example .env      # configure ALLOWED_ORIGINS
python app.py             # escuta em :5001 por padrão
```

Testar:
```bash
curl http://localhost:5001/api/health
# → {"status":"ok"}
```

> **Atenção HTTPS:** O GitHub Pages serve o site via HTTPS. Browsers bloqueiam requisições de páginas HTTPS para backends HTTP. Para uso em produção, coloque o backend atrás de HTTPS (ngrok, Railway, reverse proxy, etc.).

Endpoints e headers: ver `api/README.md`.

---

## Adicionar ou editar projetos

1. Edite `content/projects.json`: adicione ou altere um objeto no array.
2. Cada entrada deve seguir o schema em `content/schema/projects.schema.json` (campos obrigatórios, `phase` no enum: idea | test | dev | stg | prod | archived | dropped).
3. Abra um PR; o CI valida o schema.
4. Após o merge, o site é atualizado no próximo deploy (se o workflow de deploy estiver ativo).

### Automação (GitHub App)

Quando um **novo repositório** é criado na org Arrow-Head-Tech, um **GitHub App** pode abrir automaticamente um PR neste repo adicionando uma entrada em `content/projects.json` (phase `idea`, placeholders Unknown/TBD). Configuração: **docs/GITHUB-APP-SETUP.md**. O receptor de webhook está em **tools/webhook/** (ver tools/webhook/README.md).

**Triagem:** Os PRs criados pelo bot trazem entradas com placeholders. Antes ou depois do merge, edite `content/projects.json` para preencher `primary_language`, `primary_stack`, `tags` e `short_description` conforme o projeto.

---

## CI

- Em todo push/PR para `main` (ou `master`): **validação de schema** (`npm run validate`).
- O script valida `content/projects.json` contra `content/schema/projects.schema.json` e verifica ids únicos.

---

## Deploy

Repositório **Arrow-Head-Tech.github.io** → site em **https://arrow-head-tech.github.io**. O workflow `.github/workflows/deploy.yml` publica a pasta `dist/` (gerada por `npm run build`) no GitHub Pages em todo push para `main` ou `master`. É necessário ativar **Pages** no repositório: Settings → Pages → Source: **GitHub Actions**.

**Privacidade:** Repo privado não garante que o GitHub Pages seja privado. Se o site for público, ajuste os textos para não revelar informações sensíveis.

---

## Estrutura (resumo)

- `content/projects.json` — lista de projetos (fonte única)
- `content/schema/projects.schema.json` — schema para validação no CI
- `site/` — HTML, CSS, JS do hub (table/cards, busca, filtros, chat)
- `api/` — backend Flask (mutações GitHub, proxy LLM). Ver `api/README.md`
- `scripts/validate-schema.js` — validação com Ajv
- `scripts/build.js` — copia site + content para `dist/`
- `tools/balcony/` — scanner local (ver README em tools/balcony/)
- `tools/potts/` — CLI para projects.json. Hub writer: `python tools/potts/hub_writer.py list|add|get`. Ver README em tools/potts/
- `tools/webhook/` — receptor de webhook do GitHub App (repository created → PR no hub). Ver docs/GITHUB-APP-SETUP.md e tools/webhook/README.md
