---
name: rtk-sync
description: >
  1-Click synchronization of RTK Token Saver rules across Antigravity and Gemini agent config files.
  Activate when the user types /rtk-sync, /sync-rules, "sync rtk rules", or asks to
  update/propagate token saving rules for Gemini and Antigravity.
---

# Antigravity & Gemini Rule Sync (/rtk-sync)

Synchronize and inject the latest RTK Token Saver optimization rules and Headroom CCR directives into target AI configuration files for Antigravity and Gemini.

## Target Config Files
- **Workspace:** `AGENTS.md`, `GEMINI.md`, and `.agents/rules/antigravity-rtk-rules.md`
- **Global Gemini Config:** `~/.gemini/config/rules/AGENTS.md` and `~/.gemini/config/rules/GEMINI.md`

## Actions
1. Ensure the RTK Token Saver rule block is present and up-to-date with current compression directives.
2. Ensure skills are organized in `.agents/skills/`.
3. Confirm sync completion across Gemini and Antigravity targets without generating configs for other IDEs/tools.

