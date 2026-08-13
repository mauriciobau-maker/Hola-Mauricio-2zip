---
name: Migration audit guardrails
description: Durable safety constraints discovered while auditing the current schema and build.
---

The modalities migration is not a harmless repeatable sync: it clears matches, match participants, and Elo history before making `matches.modality_id` mandatory. Treat it as a reviewed one-time data migration and require a tested backup restore before any rerun.

**Why:** The development database currently has empty match tables and the local migration contains explicit DELETE statements, so repeating it could destroy future match data.

**How to apply:** Prefer read-only schema comparison first; never put this migration in startup or automatic deployment flow.

The padel frontend Vite build requires both `PORT` and `BASE_PATH`; a missing variable fails before compilation.

**Why:** This is an environment-specific build contract in the current Vite configuration.

**How to apply:** Set the artifact's actual base path and a valid port in local/CI build commands without adding secrets to source.