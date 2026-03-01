# BALCONY

Scanner de pasta local → export para `content/projects.json` (formato do hub).

## Configuração

1. Defina o caminho da pasta de projetos (fora do repo):
   - **Opção A:** Copie `.env.example` para `.env` e edite `BALCONY_TARGET_FOLDER=/caminho/para/sua/pasta`.
   - **Opção B:** Exporte no shell: `export BALCONY_TARGET_FOLDER=/caminho/para/sua/pasta`.

2. (Opcional) Instale dependências para usar `.env`:
   ```bash
   pip install -r requirements.txt
   ```

## Como rodar

Na **raiz do repositório** (Arrow-Head-Tech.github.io):

```bash
python balcony/scan_and_export.py
```

Ou, de dentro de `balcony/`:

```bash
cd balcony
python scan_and_export.py
```

O script grava em `content/projects.json`. Rode `npm run validate` na raiz para checar o schema antes de commitar.

## Estrutura da pasta escaneada

Dois modos:

### 1) Pastas por phase (recomendado)

Se a pasta alvo contiver subpastas com nomes de phase, cada subpasta é tratada como phase e os projetos são os subdiretórios dentro delas:

```
BALCONY_TARGET_FOLDER/
├── 1.IDEA/
│   ├── MeuProjeto/
│   └── OutroProjeto/
├── 2.SCRATCH/
│   └── PrototypeX/
├── 5.PROD/
│   └── AppLive/
└── 6.ARCHIVED/
    └── OldThing/
```

**Mapeamento pasta → phase:**

| Pasta       | Phase    |
|------------|----------|
| 1.IDEA     | idea     |
| 2.SCRATCH  | test     |
| 3.PROTOTYPE| dev      |
| 4.HML      | dev      |
| 5.PROD     | prod     |
| 6.ARCHIVED | archived |
| 7.DROPPED  | dropped  |

### 2) Lista plana de projetos

Se **não** houver nenhuma dessas pastas no primeiro nível, cada subpasta é considerada um projeto e a phase usada é **idea**.

```
BALCONY_TARGET_FOLDER/
├── ProjetoA/
├── ProjetoB/
└── ProjetoC/
```

## Campos gerados

- **id:** slug do nome da pasta (minúsculas, hífens).
- **name:** nome da pasta.
- **repo_url:** `https://github.com/Arrow-Head-Tech/{name}`.
- **phase:** do mapeamento acima ou `idea`.
- **primary_language:** inferido por extensões de arquivo (.py → Python, etc.) ou "Unknown".
- **primary_stack:** igual a primary_language.
- **tags:** `[]` (editar manualmente no JSON se quiser).
- **short_description:** primeira linha do README.md (sem o `#`) ou "TBD".
- **owner:** Arrow-Head-Tech.

Depois do export, você pode editar `content/projects.json` à mão (tags, descrição, phase) e o hub usa esse arquivo como fonte única.
