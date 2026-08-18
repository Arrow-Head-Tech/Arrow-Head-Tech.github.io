# Technical Debt

## UI

### Kanban card name overflow
Long underscore-joined project names (e.g. `TEACHING_PROGRAMMING_W_GAMES`, `CPTM_QRCODE_GENERATOR_BLUE_PEN`) do not wrap inside the Kanban card.

- `overflow-wrap: break-word` was added to `.kanban-card-name` but does not trigger because the text fits in one line (the full token width ≈ column inner width).
- `<wbr>` injection after underscores in JS also did not produce visible wrapping.
- Likely needs either a narrower column, a smaller font, or `word-break: break-all` (accepted trade-off: breaks mid-token even when not needed).
