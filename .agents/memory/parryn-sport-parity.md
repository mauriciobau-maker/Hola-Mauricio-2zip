---
name: Parryn sport parity
description: Product requirement for consistent Parryn prompts and suggestions across supported sports.
---

Parryn must provide coherent, sport-specific suggestions for pádel, tennis, and football rather than treating every non-football sport as pádel.

**Why:** The product owner wants the existing Parryn suggestions to work appropriately for each supported sport; current code applies some Drive/Revés and Americana language to tennis.

**How to apply:** When changing Parryn, check each operation and its UI quick prompts, Gemini instructions, and no-AI fallback against the active sport. Treat weather advice as guidance unless a real forecast provider is connected.
