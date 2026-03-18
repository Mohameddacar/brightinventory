# Migration Policy (Data-Safe)

## Core Rules
- Never run reset commands on active databases.
- Never delete business data during schema upgrades.
- Always create a backup before migration.
- Never edit old applied migration folders.
- Add a new migration for every schema change.

## Allowed Upgrade Pattern
1. Update `prisma/schema.prisma`.
2. Run `npm run db:migrate:safe -- -Name your_change_name`.
3. Confirm migration SQL does not contain destructive statements.
4. Deploy and verify application endpoints.

## Blocked / Risky Operations
- `prisma migrate reset`
- SQL containing `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM`

## Why New Migration Folders Are Normal
Many migration folders are expected in a healthy project history. They provide traceability and safe roll-forward behavior. If the list becomes large, use planned migration squashing as a controlled maintenance task, not by editing old applied migrations.
