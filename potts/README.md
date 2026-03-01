# POTTS (Pepper Potts)

Assistente por voz + GitHub + "adicionar ao hub".

**Status:** Placeholder. Integração com hub prevista na Fase 4 do plano.

- `hub_writer.py`: ler/escrever `content/projects.json` (path relativo ao root do monorepo); conhece o schema.
- Configurar `GITHUB_TOKEN` em `.env` (ver `.env.example`).
- Comando "adicionar ao hub" edita `content/projects.json` no mesmo clone.
