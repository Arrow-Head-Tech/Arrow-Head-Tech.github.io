# POTTS (Pepper Potts)

Assistente por voz + GitHub + "adicionar ao hub".

## Hub writer (`hub_writer.py`)

Módulo para ler/escrever `content/projects.json` no monorepo. Conhece o schema (campos obrigatórios, enum de phase). Use quando o POTTS precisar **adicionar** ou **atualizar** um projeto no hub.

### Uso como script (na raiz do repo)

```bash
# Listar projetos
python potts/hub_writer.py list

# Ver um projeto por id
python potts/hub_writer.py get <id>

# Adicionar projeto (phase opcional, default idea)
python potts/hub_writer.py add "Nome do Projeto" "https://github.com/Arrow-Head-Tech/repo-name" [phase]
```

### Uso como módulo (no código do POTTS)

Com o processo rodando a partir da **raiz do monorepo** ou da pasta **potts/**:

```python
from hub_writer import load_projects, add_project, new_entry, update_project, find_project

# Adicionar novo projeto
entry = new_entry("MeuProjeto", "https://github.com/Arrow-Head-Tech/MeuProjeto", phase="dev")
add_project(entry)

# Atualizar existente
update_project("meuprojeto", {"phase": "prod", "short_description": "Nova descrição"})
```

### Campos e schema

- Obrigatórios: `id`, `name`, `repo_url`, `phase`, `primary_language`, `primary_stack`, `tags`, `short_description`.
- Phase: um de `idea`, `test`, `dev`, `stg`, `prod`, `archived`, `dropped`.
- `hub_writer` valida antes de escrever; o CI do repo também valida com o JSON Schema.

## Credenciais

Copie `.env.example` para `.env` e defina `GITHUB_TOKEN` (para o assistente criar repos, listar org, etc.). O hub_writer em si não usa o token; quem chama (POTTS) usa para GitHub API.

## Comando "adicionar ao hub"

Quando o POTTS (voz ou CLI) receber um comando do tipo "adicionar [repo] ao hub", o fluxo é:

1. Obter nome e URL do repo (ex.: da API do GitHub ou do usuário).
2. Chamar `hub_writer.new_entry(...)` e `hub_writer.add_project(entry)` (ou usar o script `hub_writer.py add ...`).
3. O arquivo `content/projects.json` é atualizado no clone; o usuário pode commitar e abrir PR, ou o POTTS pode abrir PR via API.
