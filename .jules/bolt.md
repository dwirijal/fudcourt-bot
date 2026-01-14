## 2025-01-26 - [Heavy Initialization in Command Modules]
**Learning:** Instantiating heavy objects like `PrismaClient` at the top level of dynamically loaded command modules runs during startup/import, even if the command is never used. This adds unnecessary overhead to bot startup time and resource usage.
**Action:** Audit all command files for top-level instantiations. Ensure resources are either lazy-loaded inside the `execute` function or use shared singletons (like `src/db.ts` for Prisma).
