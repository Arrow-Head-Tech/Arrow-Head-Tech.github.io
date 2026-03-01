# Contribuindo

## Adicionar um novo projeto

1. Edite `content/projects.json` e adicione um novo objeto ao array.
2. Use os **campos obrigatórios**: `id`, `name`, `repo_url`, `phase`, `primary_language`, `primary_stack`, `tags`, `short_description`.
3. **Phase** deve ser um dos: `idea`, `test`, `dev`, `stg`, `prod`, `archived`, `dropped`. Definições e regras em `content/taxonomy/phases.md` (e no site em Taxonomy).
4. **id**: slug estável (minúsculas, hífens; ex.: `meu-projeto`).
5. Campos opcionais: `owner`, `team`, `created_at`, `last_updated`, `status_notes`, `visibility`, `links` (ex.: `{ "docs": "...", "demo": "..." }`).

### Exemplo de entrada

```json
{
  "id": "meu-projeto",
  "name": "Meu Projeto",
  "repo_url": "https://github.com/Arrow-Head-Tech/meu-projeto",
  "phase": "dev",
  "primary_language": "Python",
  "primary_stack": "FastAPI",
  "tags": ["api", "backend"],
  "short_description": "Descrição curta do projeto."
}
```

## Validar antes de abrir PR

Na raiz do repositório:

```bash
npm install
npm run validate
```

O script valida `content/projects.json` contra `content/schema/projects.schema.json` e verifica ids únicos. O CI roda a mesma validação em todo PR.

## Taxonomy (phases)

As definições das phases estão em `content/taxonomy/phases.md` e `content/taxonomy/phases.json`. O site exibe essa página em **Taxonomy**. Ao adicionar projetos, use o enum do schema e as regras descritas na taxonomy.

## Rodar o site localmente

Ver [README.md](README.md#rodar-o-site-localmente). Opcional: rodar BALCONY ou POTTS para contribuir com o JSON (ver README em `balcony/` e `potts/`).
