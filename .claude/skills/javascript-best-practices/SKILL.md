---
name: javascript-best-practices
description: Best practices for JavaScript and TypeScript code quality, security, performance, and maintainability analysis.
---

# JavaScript & TypeScript Best Practices Skill

## Security Checks
- Avoid `eval()`, `Function()`, or unsanitized SQL/shell string concatenation.
- Validate and sanitize all external user inputs.
- Never hardcode secrets, tokens, or API keys in source code.

## Performance & Maintainability
- Prefer `const` and `let` over `var`; use strict equality (`===`).
- Avoid unbounded loops, N+1 queries, and synchronous I/O in request paths.
- Handle all `async/await` and Promise rejections explicitly with structured error handling.
- Keep functions small, single-purpose, and strongly typed in TypeScript (avoid `any`).
