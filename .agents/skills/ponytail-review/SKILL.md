---
name: ponytail-review
description: >
  Code review focused exclusively on over-engineering. Finds what to delete:
  reinvented standard library, unneeded dependencies, speculative abstractions,
  dead flexibility. One line per finding: location, what to cut, what replaces
  it. Use when the user says "review for over-engineering", "what can we
  delete", "is this over-engineered", "simplify review", or invokes
  /ponytail-review. Complements correctness-focused review, this one only
  hunts complexity.
---

Review diffs for unnecessary complexity. One line per finding: location, what
to cut, what replaces it. The diff's best outcome is getting shorter.

## Format
`L<line>: <tag> <what>. <replacement>.`

Tags:
- `delete:` dead code, unused flexibility, speculative feature.
- `stdlib:` hand-rolled thing the standard library ships.
- `native:` dependency or code doing what the platform already does.
- `yagni:` abstraction with one implementation, layer with one caller.
- `shrink:` same logic, fewer lines.
