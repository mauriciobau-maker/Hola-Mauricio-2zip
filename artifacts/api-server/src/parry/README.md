# Parry V0.1

Parry is an optional assistant layer for Padel Tracker IA. It is intentionally isolated from the core domain.

## Current scope

- No database migrations.
- No direct database access from Parry.
- No changes to authentication, roles, Elo, matches, encounters, or clubs.
- No AI provider dependency yet.
- No frontend integration yet.
- No write actions.

## Cost-first strategy

The V0.1 skeleton runs without an external AI provider. Domain tools and authorization can be implemented and tested first at zero AI API cost.

When an AI provider is added, it must implement `AIProvider` and remain replaceable. Usage and token accounting should be added before enabling production traffic.

## Security boundary

Parry receives trusted context from the authenticated application user. A club identifier from a prompt must never be treated as authorization.

Every future tool must validate:

1. authenticated user;
2. authorized club context;
3. player ownership or explicit visibility;
4. minimum data required for the requested answer.

## Branch

This work belongs on `p0/parry-v01` and must not be merged into `main` without review.
