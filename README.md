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
# Abra http://localhost:8000/site/src/

# Opção 2: build + servir dist
npm run build
npx serve dist
# Abra http://localhost:3000 (ou a porta indicada)
```

---

## Adicionar ou editar projetos

1. Edite `content/projects.json`: adicione ou altere um objeto no array.
2. Cada entrada deve seguir o schema em `content/schema/projects.schema.json` (campos obrigatórios, `phase` no enum: idea | test | dev | stg | prod | archived | dropped).
3. Abra um PR; o CI valida o schema.
4. Após o merge, o site é atualizado no próximo deploy (se o workflow de deploy estiver ativo).

*(Futuro: GitHub App — quando um novo repo for criado na org, um PR será aberto automaticamente adicionando uma entrada. Ver Addendum no plano.)*

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
- `site/src/` — HTML, CSS, JS do hub (table/cards, busca, filtros)
- `scripts/validate-schema.js` — validação com Ajv
- `scripts/build.js` — copia site + content para `dist/`
- `balcony/` — scanner local (ver README em balcony/)
- `potts/` — assistente por voz + “adicionar ao hub” (ver README em potts/)
