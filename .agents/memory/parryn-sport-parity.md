---
name: Parryn sport parity
description: Product requirement for consistent Parryn prompts and suggestions across supported sports.
---

Parryn must use the only active sport automatically; when a club has two or more active sports, show a selector and use its choice for prompts, fallbacks, and UI suggestions. Keep pádel, tennis, and football language distinct.

**Why:** The product owner confirmed that multi-sport clubs need an explicit sport selector. Existing Parryn paths applied Drive/Revés and Americana language to tennis.

**How to apply:** When changing Parryn, check each operation and its UI quick prompts, Gemini instructions, and no-AI fallback against the active sport. Treat weather advice as guidance unless a real forecast provider is connected.
