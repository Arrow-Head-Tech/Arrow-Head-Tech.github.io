# Project phases (taxonomy)

Projects in the hub use a single **phase** field. Use the following definitions when adding or triaging projects.

| Phase       | When to use |
|------------|-------------|
| **idea**   | Early idea or concept; not yet implemented or only exploratory. |
| **test**   | Proof of concept or experimental; validating approach or technology. |
| **dev**    | Active development; not yet production-ready. |
| **stg**    | Deployed in staging; ready for production validation. |
| **prod**   | Live in production; maintained. |
| **archived** | No longer actively developed; kept for reference. |
| **dropped**  | Abandoned or superseded; not maintained. |

## Rules of thumb

- New repos (e.g. from GitHub App automation) default to **idea** until someone sets phase.
- Move to **dev** when there is active code and a clear direction.
- Use **stg** only if you have a real staging environment.
- Use **prod** for anything that is live and maintained.
- **archived** = read-only, kept for history. **dropped** = we no longer recommend or use it.
