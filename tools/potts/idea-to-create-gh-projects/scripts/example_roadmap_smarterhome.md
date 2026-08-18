# Smarter Home — Master Roadmap (LLM-ready)

## Status por atividade

| Status | Significado |
|--------|-------------|
| **Backlog** | Ainda não priorizado |
| **Ready** | Pronto para iniciar |
| **In progress** | Em desenvolvimento |
| **In Review** | Aguardando revisão |
| **Done** | Concluído |

**Nota:** A implementação atual usa `BACK/` (Node) + `ADAPTERS/` (Python) + `FRONT/`, em vez da estrutura `core/plugins/` do roadmap. Os itens marcados Done refletem o que foi implementado nessa arquitetura.

### Implementação atual (resumo)

| Área | Implementado |
|------|--------------|
| **Adapter Tuya** | `ADAPTERS/tuya/tuya_adapter.py` — contrato stdin/stdout JSON (`status`, `command` com `set_power`, `set_switch_1..N`); `TUYA_DRIVER=stub` para testes; `CONTRACT.md` |
| **Integração BACK** | `BACK/adapters/tuya.js` — `runTuyaAdapter`, `isTuyaDevice`, `getTuyaEnv`, `isTuyaCommand`; `heartbeat.js` inclui Tuya; `routes/devices.js` roteia comandos |
| **Config/credenciais** | `dotenv` em BACK; `.env`/`.env.example` em BACK e ADAPTERS/tuya; credenciais de `tuya_cloud_cli_v2` |
| **Testes** | `BACK/test/tuya-adapter.test.js` (`npm run test:tuya` com stub); `ADAPTERS/tuya/run.py` (FastAPI porta 8013) |
| **Multi-gang UI** | `getSwitchChannels(device)`; `SwitchRelayCard` (list/grid 1–4 canais); `SwitchRelayDetail` (toggles + "Turn on/off all"); `config.channels` |
| **Stub 5–8 canais** | `switch_tuya_stub_6` em seed/state para testes |
| **Adapter Winix** | `ADAPTERS/airpurifier/winix_adapter.py`; `BACK/adapters/winix.js`; heartbeat; comandos power/mode/fan/plasmawave |

---

## Visão do Produto

**Smarter Home** é um **hub web (mobile-first)** que unifica controle e monitoramento de dispositivos de smart home (Tuya/eCasa + Winix como base), com foco em:

- **Funcionalidade real** (controlar dispositivos de verdade)
- **Estabilidade e simplicidade** (produto minimalista e robusto)
- **Extensibilidade** (devices/integrations como plugins, core mínimo)
- **LAN-first** (preferir controle local; fallback cloud quando necessário). MVP: Tuya via Cloud; LAN-first entra no v1/v2 (com fallback).

**Usuário principal (MVP):** você (power user).

---

## Princípios e Guard Rails (não-negociáveis)

1. **Core mínimo**  
   O core não conhece detalhes de vendor nem “quantos botões” um switch tem. Isso vem de `describe()` do plugin.

2. **Plugin-first**  
   Devices e integrações não ficam no core; o core só roteia para plugins.

3. **Config-first (MVP = JSON)**  
   Rooms/devices/scenes partem de JSON. Runtime state é separado e não versionado no git.

4. **UX estável e previsível**  
   Feedback via toasts consistente, coalesced, sem spam, sem “pilha infinita”.

5. **Secrets hygiene**  
   Nada de tokens/secrets em logs, commits ou UI.

---

## Glossário rápido

- **Core**: engine mínima (executor + roteamento + health + errors).
- **Plugin**: módulo que implementa `describe/read/invoke` para um vendor/tipo.
- **Device instance**: item em `devices.json` (“Tomada Cafeteira”).
- **Capability**: feature suportada pelo device (`power`, `brightness`, `ir_send`).
- **Action**: unidade executável em scene (`device|scene|macro`).
- **LAN-first**: tentar local primeiro; cloud só quando necessário.
- **Semantic hints**: metadados de intenção (toggle/select/range/unit) sem acoplar UI.

---

## Definition of Done (DoD) padrão — para qualquer Story

Uma Story está **Done** quando:

- Código implementado e revisado (nem que seja auto-review com checklist)
- Nenhum secret hardcoded; `.env.example` atualizado quando necessário
- Teste manual executado e documentado (passo a passo)
- Erros padronizados: mensagem útil, sem stacktrace cru na UI
- Documentação mínima atualizada (README/docs)
- UI: mobile-first sem overflow/bug óbvio
- Scenes: não quebra cenas existentes e retorna resultado agregado
- Logs: não spam; sem dados sensíveis

---

## Convenção de IDs

- **E#** = Épico
- **F#.#** = Feature
- **S#.#.#** = Story
- **T#.#.#.#** = Task

---

# MVP Cutline (Definição de “pronto para uso”)

O **MVP está pronto** quando:

1. UI web mobile-first funcional (Home/Devices/Scenes/Rooms + Menu + Toasts)
2. Engine de execução de scenes funciona (manual + macro)
3. Integrações reais funcionando:
   - **Tuya switch multi-gang** controlável (cloud)
   - **Winix purifier** controlável (api/lib)
4. Config JSON é “source of truth”
5. Health online/offline mínimo visível
6. Setup e troubleshooting documentados

---

# E1 — Fundacional: Repo, padrões e documentação mínima

## F1.1 — Estrutura do repo e scripts de execução

### S1.1.1 — Criar estrutura base do repositório
**Status:** Done  
**Objetivo:** deixar claro onde fica core/plugins/ui/configs/scripts.

**Entregáveis:**
- Pastas base criadas
- `README.md` com setup local
- `.env.example` e `.gitignore` corretos

**Dependencies:** none

**Tasks**
- T1.1.1.1 Criar pastas: `core/`, `plugins/`, `ui/`, `configs/`, `scripts/`, `docs/adr/`
- T1.1.1.2 Criar `README.md` (setup python/node + como rodar)
- T1.1.1.3 Criar `.env.example` (sem valores reais)
- T1.1.1.4 Criar `.gitignore` (env, caches, logs)

**Acceptance criteria (Given/When/Then)**
- Given repo clonado, When seguir README, Then UI e backend sobem sem erro.
- Given `.env.example`, When copiar para `.env`, Then app roda sem vazar secrets.

**Test plan**
- Rodar UI local (dev) e backend local
- Validar que `.env` não é versionado

**Edge cases**
- Windows path / shells diferentes
- Versões de python/node divergentes

---

## F1.2 — ADRs (Decisões arquiteturais)

### S1.2.1 — Registrar ADR base: LAN-first + plugin-first + core mínimo
**Status:** Backlog  
**Dependencies:** S1.1.1

**Tasks**
- T1.2.1.1 Criar `docs/adr/000-template.md`
- T1.2.1.2 Criar `docs/adr/001-core-principles.md`

**Acceptance**
- ADR explica decisões e trade-offs em até 2 páginas.

---

# E2 — Config & Model (MVP = JSON)

## F2.1 — Schemas mínimos + validação leve

### S2.1.1 — Definir `rooms.json`
**Status:** Done  
**Tasks**
- T2.1.1.1 Criar `configs/rooms.json` (`id,name,order`)
- T2.1.1.2 Validar ids únicos no load

**Acceptance**
- Rooms aparecem ordenadas na UI.

**Edge cases**
- Room sem `order` → default 0

---

### S2.1.2 — Definir `devices.json`
**Status:** Done  
**Campos mínimos (MVP)**
- `id`, `type`, `vendor`, `name`, `roomId`, `tags[]`, `pinned`, `config{}`

**Dependencies:** S1.1.1

**Tasks**
- T2.1.2.1 Criar `configs/devices.json` com:
  - 1 Tuya device real
  - 1 Winix device (placeholder ok)
- T2.1.2.2 Documentar enum inicial `type` (README)
- T2.1.2.3 Doc: “como adicionar um device” (README)

**Acceptance**
- Backend carrega `devices.json` sem erro.
- UI lista cards dos devices.

**Edge cases**
- `roomId` inválido → fallback “Unknown room”
- `type/vendor` sem plugin → UI mostra como “Unsupported” sem crash

---

### S2.1.3 — Definir `scenes.json` (DSL v0)
**Status:** Done  
**Campos mínimos**
- `id,name,icon,tags[],actions[]`
- `actions[]`: `kind=device|scene|macro`

**Dependencies:** S3.1.x (executor)

**Tasks**
- T2.1.3.1 Criar `configs/scenes.json` (3–4 scenes)
- T2.1.3.2 Validar referências (deviceId/sceneId)
- T2.1.3.3 Documentar formato actions (README)

**Acceptance**
- Scene executa steps e retorna resumo agregado.

---

### S2.1.4 — Runtime state (separado do config)
**Status:** Done  
**Objetivo:** diferenciar config (git) de estado (runtime).

**Tasks**
- T2.1.4.1 Criar estrutura runtime cache no backend:
  - `status`, `state`, `last_seen`, `last_error`

**Acceptance**
- UI consegue pedir “estado atual” sem depender do config.

---

# E3 — Core Engine: executor, erros, health

**Nota (arquitetura atual):** O executor existe no BACK via `routes/devices.js` e controllers — roteamento de comandos por device e execução via adapters (tuya.js, winix.js). Não há `core/executor.py`; a lógica está distribuída no Node.

## F3.1 — Executor canônico (device/scene/macro)

### S3.1.1 — Implementar `execute_action(action)`
**Status:** In progress  
**Dependencies:** none (pode começar cedo)

**Tasks**
- T3.1.1.1 Criar `core/executor.py` com `execute_action`
- T3.1.1.2 Logs estruturados (start/end por step)
- T3.1.1.3 3 testes unitários:
  - macro com 2 steps
  - scene chama scene
  - unknown kind → erro amigável

**Acceptance**
- Macro executa em ordem.
- Erro em step não derruba execução; retorna partial result.

**Edge cases**
- Macro recursiva (scene chama scene) → guard de recursion depth

---

### S3.1.2 — Implementar `run_scene(sceneId)`
**Status:** Backlog  
**Dependencies:** S3.1.1 + S2.1.3

**Tasks**
- T3.1.2.1 Carregar scenes do JSON
- T3.1.2.2 Validar ids e montar trace
- T3.1.2.3 Retornar payload agregado (`steps_ok/failed/errors[]`)

**Acceptance**
- Rodar “Cheguei” altera estados e gera activity log.

---

## F3.2 — Errors padronizados

### S3.2.1 — Error model + mapping JSON
**Status:** Backlog  
**Dependencies:** S3.1.x

**Tasks**
- T3.2.1.1 Criar `core/errors.py`: `Offline/Timeout/Unsupported/AuthRequired/ConfigError`
- T3.2.1.2 Mapper para payload JSON (sem stacktrace cru)
- T3.2.1.3 Testes: offline → erro correto

**Acceptance**
- Offline gera mensagem clara e toast “offline”.

---

## F3.3 — Health/Heartbeat mínimo

### S3.3.1 — Poller e status online/offline
**Status:** Done  
**Dependencies:** BACK adapter router (`routes/devices.js`) + adapters implementados (tuya.js, winix.js) e integração heartbeat existente.

**Tasks**
- T3.3.1.1 Loop a cada N sec: `read(device)` via plugin
- T3.3.1.2 Atualizar runtime cache (last_seen/error)
- T3.3.1.3 Endpoint batch para UI (ex.: `/devices/state`)

**Acceptance**
- UI mostra Online/Offline corretamente.

**Edge cases**
- timeouts em sequência → degrade + backoff simples

---

# E4 — Plugin System (MCP-like v0)

## F4.1 — Contrato adapter v0 + protocolo v1 (MCP-like)

### S4.1.1 — Adapter Protocol v0 (stdin/stdout JSON) + mapping no BACK
**Status:** Done  
**Dependencies:** E2 (models)

**Contrato v0 (implementado)**
- Adapters Python: stdin/stdout JSON com `status` (device_id) e `command` (set_power, set_switch_1..N)
- BACK: `adapters/tuya.js`, `adapters/winix.js` — `runTuyaAdapter`, `runWinixAdapter`; roteamento em `routes/devices.js`
- Heartbeat: `heartbeat.js` chama adapters para status online/offline

**Tasks**
- T4.1.1.1 Contrato documentado (ex.: `ADAPTERS/*/CONTRACT.md`)
- T4.1.1.2 Mapeamento device → adapter no BACK (isTuyaDevice, isWinixPurifier)
- T4.1.1.3 Stub para testes (TUYA_DRIVER=stub)

**Acceptance**
- Adapter responde status/command via stdin/stdout; BACK roteia corretamente.

---

### S4.1.2 — Protocol v1 MCP-like (describe/read/invoke) + semantic hints
**Status:** Backlog  
**Dependencies:** S4.1.1

**Objetivo:** descoberta dinâmica de comandos sem hardcode de canais.

**Contrato v1 (planejado)**
- `describe(device)` → capabilities + commands + semantic hints
- `read(device)` → state normalizado + status
- `invoke(device, command, args)` → executa

**Tasks**
- T4.1.2.1 Formalizar schema v1 em `docs/protocol_v1.md`
- T4.1.2.2 Implementar `describe` em pelo menos um adapter (Tuya)
- T4.1.2.3 Migrar BACK router para usar describe (sem hardcode 4 vs 6 gangs)
- T4.1.2.4 Atualizar UI para consumir commands dinâmicos

**Acceptance**
- Backend descobre comandos dinamicamente via describe; UI renderiza sem hardcode de canais.

---

## F4.2 — Registry por vendor/type

### S4.2.1 — Resolver plugin por `(vendor,type)`
**Status:** Done  
**Dependencies:** S4.1.1

**Tasks**
- T4.2.1.1 Criar `core/registry.py`
- T4.2.1.2 Roteamento: device instance → plugin correto
- T4.2.1.3 Unsupported → erro amigável

**Acceptance**
- Device sem plugin vira “unsupported” sem quebrar app.

---

# E5 — Dispositivos: Tuya + Winix (valor real)

## F5.1 — Tuya Cloud (primeiro para funcionar rápido)

### S5.1.1 — Tuya Cloud CLI (token/devices/status/functions/commands)
**Status:** Done  
**Dependencies:** E1

**Tasks**
- T5.1.1.1 `scripts/tuya_cloud_cli.py` no repo
- T5.1.1.2 `docs/tuya/setup.md`: link account, region, token
- T5.1.1.3 “Golden commands” no docs (copiar e colar)

**Acceptance**
- Você consegue listar devices e ler status/functions via CLI.

**Edge cases**
- lista vazia por falta de “Link Tuya App Account” → doc troubleshooting

---

### S5.1.2 — Tuya Switch multi-gang (MVP device #1)
**Status:** Done  
**Dependencies:** S4.2.1 + S5.1.1

**Objetivo:** switch N-gang sem hardcode.

**Tasks**
- T5.1.2.1 Salvar outputs reais:
  - `docs/tuya/<deviceId>_status.json`
  - `docs/tuya/<deviceId>_functions.json`
- T5.1.2.2 Implementar `plugins/tuya/cloud_client.py` (assinatura + request)
- T5.1.2.3 Implementar `plugins/tuya/switch_multigang.py`
  - `describe()` detecta `switch_1..N`
  - `read()` mapeia status codes→state
  - `invoke()` envia command code/value
- T5.1.2.4 Integrar registry (vendor=tuya,type=switch*)
- T5.1.2.5 UI detail mínimo:
  - mostrar toggles para cada `switch_i`

**Acceptance criteria (G/W/T)**
- Given device real multi-gang, When `invoke set_switch channel=1 on=true`, Then tecla 1 liga.
- Given status real, When abrir detail, Then aparecem N toggles coerentes.

**Test plan**
- Manual: ligar/desligar todos canais
- Script: chamar cloud command e revalidar status

**Edge cases**
- gaps: switch_1, switch_2, switch_4 → UI lista somente os existentes
- token expirado → AuthRequired + instrução

---

### S5.1.3 — Tuya Smart Plug (power)
**Status:** Backlog  
**Dependencies:** S5.1.2 (reuso cloud_client)

**Tasks**
- T5.1.3.1 Descobrir code power via functions/status
- T5.1.3.2 Plugin `smart_plug`
- T5.1.3.3 UI: toggle simples

**Acceptance**
- Liga/desliga tomada real via UI.

---

### S5.1.4 — Tuya Light (power/brightness/rgb)
**Status:** Backlog  
**Dependencies:** S5.1.2

**Tasks**
- T5.1.4.1 Mapear codes reais
- T5.1.4.2 Plugin light (invoke power/brightness/color)
- T5.1.4.3 UI: slider + 5 presets de cor

**Acceptance**
- Alterar cor/brilho na vida real.

---

### S5.1.5 — Tuya IR + Sensor temp/umidade (climate_sensor_ir)
**Status:** Backlog  
**Dependencies:** S5.1.2 + E2 schema

**Tasks**
- T5.1.5.1 Schema `irPresets` em `devices.json`
- T5.1.5.2 Plugin `climate_sensor_ir`
- T5.1.5.3 UI: grid de presets + temp/humidity

**Acceptance**
- Enviar preset IR e atualizar last preset.

---

### S5.1.6 — LAN-first Tuya (fase 2)
**Status:** Backlog  
**Dependencies:** pós-MVP

**Tasks**
- T5.1.6.1 POC tinytuya com local_key
- T5.1.6.2 Fallback LAN→cloud
- T5.1.6.3 Métricas: latência/falhas

---

## F5.2 — Winix purifier (MVP device #2)

### S5.2.1 — Plugin Winix (stub/lib/api) end-to-end
**Status:** Done  
**Dependencies:** S4.2.1

**Tasks**
- T5.2.1.1 Refatorar drivers em `plugins/winix/purifier_driver.py`
- T5.2.1.2 `WinixPurifierPlugin` (describe/read/invoke)
- T5.2.1.3 Integrar registry
- T5.2.1.4 UI: power/mode/fan/plasmawave

**Acceptance**
- Comandos executam no purificador real (api/lib).

**Edge cases**
- credenciais ausentes → ConfigError/AuthRequired
- API instável → degrade status e toast coerente

---

# E6 — UI Web (MVP sólido)

## F6.1 — Navegação e telas

### S6.1.1 — Home (pinned + scenes + widgets mínimos)
**Status:** Done  
**Dependencies:** E2 configs + E3 executor

**Tasks**
- T6.1.1.1 Quick scenes row
- T6.1.1.2 Pinned devices (grid 2 cols default)
- T6.1.1.3 Room chips filtra home

---

### S6.1.2 — Devices (search + filter)
**Status:** Done  
**Tasks**
- T6.1.2.1 Busca
- T6.1.2.2 Filtro room/status
- T6.1.2.3 Cards por type via registry

---

### S6.1.3 — Scenes
**Status:** In progress  
**Nota:** UI lista scenes; engine de execução (run_scene) pendente.

**Tasks**
- T6.1.3.1 Lista
- T6.1.3.2 Run com toast agregado

---

### S6.1.4 — Rooms
**Status:** Done  
**Tasks**
- T6.1.4.1 Overview com contagem online/offline
- T6.1.4.2 Click room → Devices filtrado

---

## F6.2 — Feedback (toasts) + menu/config + debug

### S6.2.1 — Toast lifecycle + coalesce
**Status:** Backlog  
**Tasks**
- T6.2.1.1 Enter/show/leave com animação suave
- T6.2.1.2 TTL e cap (1–2)
- T6.2.1.3 Coalesce por key (scene/activity)

---

### S6.2.2 — Menu de configuração (bottom sheet)
**Status:** Backlog  
**Tasks**
- T6.2.2.1 Abrir/fechar
- T6.2.2.2 Preferências: grid/list, toasts on/off, compact/verbose
- T6.2.2.3 Persist localStorage

---

### S6.2.3 — Debug panel (Step zero)
**Status:** Backlog  
**Tasks**
- T6.2.3.1 Last scene/command/error
- T6.2.3.2 Botões: emit toast / run scene / simulate offline

---

### S6.2.4 — Bugfix estrutural do UI atual
**Status:** Backlog  
**Observação:** há trecho de menu/config/debug colado dentro de `renderActionEditor()` do `SwitchPanelDetail`, quebrando escopo.

**Tasks**
- T6.2.4.1 Remover bloco menu/config/debug de `renderActionEditor()`
- T6.2.4.2 Reposicionar menu/config/debug no componente root
- T6.2.4.3 Validar build e editor volta a funcionar

---

## F6.3 — Renderer genérico por `describe()` (pós-MVP)

### S6.3.1 — GenericControlRenderer
**Status:** Backlog  
**Tasks**
- T6.3.1.1 Mapear semantic hint → componente
- T6.3.1.2 Render comandos sem UI dedicada

---

# E7 — Scenes avançadas (pós-MVP incremental)

## F7.1 — Scenes v1: delay + retry
### S7.1.1 — Delay/retry básicos
**Status:** Backlog  
**Tasks**
- T7.1.1.1 `delay_ms` em macro steps
- T7.1.1.2 retry com maxAttempts

## F7.2 — Scenes v2: variáveis e condições (pós-MVP)
### S7.2.1 — Vars + if (safe evaluator)
**Status:** Backlog  
**Tasks**
- T7.2.1.1 Schema vars
- T7.2.1.2 evaluator sem `eval`

---

# E8 — Pesquisa técnica (Spikes) — validar hipóteses

## F8.1 — Spike: Kiper portão
**Status:** Backlog  
**Deliverable:** doc de viabilidade + riscos + recomendação.
**Tasks**
- T8.1.1 Checar API oficial/local
- T8.1.2 Se RE: mapear auth/replay/binding
- T8.1.3 Go/No-go doc

## F8.2 — Spike: câmera inteligente
**Status:** Backlog  
**Deliverable:** doc custo/benefício + arquitetura.

## F8.3 — Spike: estrutura vertical vs horizontal
**Status:** Backlog  
**Hipótese:** “feature slice por device module” reduz fricção.
**Tasks**
- T8.3.1 Branch POC “vertical”
- T8.3.2 Implementar tuya_switch em layout vertical
- T8.3.3 Comparar delta de mudança
- T8.3.4 ADR de recomendação

## F8.4 — Spike: MCP-like adapter↔backend
**Status:** Backlog  
**Hipótese:** reduzir hardcode (4 vs 6 gangs).
**Tasks**
- T8.4.1 Formalizar spec `describe/read/invoke` v0
- T8.4.2 POC com tuya_switch
- T8.4.3 Medir redução de mudanças no backend
- T8.4.4 Recomendação (adotar/não/partial)

---

# E9 — Integrações “Alexa-like” (pós-MVP)

- Widgets: RSS, weather, commute time
- Media: Spotify control, YouTube launcher

---

# E10 — Estabilidade e Observabilidade mínima

## F10.1 — Activity timeline exportável
**Status:** Backlog  
**Tasks**
- T10.1.1 Log de cada invoke/scene
- T10.1.2 Export JSON

## F10.2 — Secrets hygiene + CI check
**Status:** Backlog  
**Tasks**
- T10.2.1 Mask tokens em logs
- T10.2.2 Checagem CI “.env não commit”

---

## Prompt final para LLM (Kanban Generator)

```text
You are a senior PM + Tech Lead. Convert this Markdown backlog into a Kanban-ready plan.

Output requirements:
A) A Kanban board with columns: Backlog / Next / In Progress / Blocked / Done
B) Milestones: MVP / v1 / v2 (assign stories to each)
C) For each Story:
   - DoD (specific, testable)
   - Acceptance criteria (Given/When/Then)
   - Test plan (manual + automated if applicable)
   - Edge cases
   - Tasks (0.5–4h each) with explicit dependencies
D) Risk register with mitigations

Constraints:
- Keep product minimal, stable, plugin-first, LAN-first.
- MVP must include: Tuya multi-gang switch control + Winix purifier control + Scenes manual + UI with toasts/menu.
- Do not invent new features; only refine, clarify and organize.
```

---

## Patch summary

- **(1) S3.3.1 Dependencies:** Atualizado de "E4 plugin system (read)" para "BACK adapter router (`routes/devices.js`) + adapters implementados (tuya.js, winix.js) e integração heartbeat existente".
- **(2) Scenes vs Executor:** Adicionada nota em E3 sobre executor no BACK (routes/controllers); S6.1.3 alterado de Done para In progress com nota "UI list done; execution engine pending".
- **(3) Plugin protocol v0 vs v1:** S4.1.1 renomeado para "Adapter Protocol v0 (stdin/stdout JSON) + mapping no BACK" com Tasks/Acceptance alinhados à implementação atual; criada S4.1.2 "Protocol v1 MCP-like (describe/read/invoke)" em Backlog.
- **(4) LAN-first scope:** Adicionada clarificação na Visão do Produto: "MVP: Tuya via Cloud; LAN-first entra no v1/v2 (com fallback)".
