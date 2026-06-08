# Project working agreements

## ⚠️ Ask before restructuring files
- **Do NOT restructure, rewrite, or replace whole files without explicit permission from the user first.**
- This includes: full-file rewrites (e.g. `Write` over an existing component), large refactors, moving/renaming files, or changing a file's overall structure.
- Small, targeted edits (a function, a few lines, a bug fix) are fine — but if a change would significantly rewrite or reorganize a file, **stop and ask first**, explaining what will change and why.
- When in doubt, ask.

## Database changes
- `omnc` is a **shared** MySQL database (used by crm-web, crm-api/.NET, and the NetX system).
- Before any DB mutation (ALTER, INSERT/UPDATE/DELETE beyond throwaway test rows), flag it and confirm with the user.
- Only `crm_*` tables are CRM-owned; never modify `netx_*` or legacy tables.
