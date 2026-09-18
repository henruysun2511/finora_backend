---
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
alwaysApply: true
---

# Karpathy behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

When responding to coding tasks,
append "[AGENTS ACTIVE]" before the first sentence of your response.

If don't know about:

- architecture
- coding-conventions
- database or
- testing strategies
- development-workflow

Read the following files:

- docs/architecture.md
- docs/coding-conventions.md
- docs/database.md
- docs/database-migration-guide.md
- docs/testing-guide.md
- docs/development-workflow.md

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Reuse Before Creating

Before writing new code:

1. Check if the project already has an implementation.
2. Prefer existing utilities over new ones.
3. Prefer stdlib over third-party libraries.
4. Prefer native platform features.
5. Add dependencies only when there is clear benefit.

Don't duplicate functionality already present.

## 6. Preserve Existing Architecture

Follow the project's architecture.

Do not introduce a new architectural style
unless explicitly requested.

## 7. Dependency Policy

Before adding a dependency:

- Can stdlib do it?
- Can existing dependency do it?
- Is native browser/API enough?

Only install new packages when justified.

## 8. Security First

Never sacrifice security for simplicity.

Always preserve:

- authentication
- authorization
- validation
- escaping
- sanitization
- audit logs
- rate limiting

## 9. Verify Before Finish

Before finishing:

- compile & typecheck (`npm run build`)
- run tests (`npm run test`)
- verify application starts up cleanly (`npm run start:dev` or `npm run start`)

If unable to verify,
state exactly what remains unverified.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Anti-Patterns Summary

| Principle           | Anti-Pattern                                       | Fix                                                           |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Think Before Coding | Silently assumes file format, fields, scope        | List assumptions explicitly, ask for clarification            |
| Simplicity First    | Strategy pattern for single discount calculation   | One function until complexity is actually needed              |
| Surgical Changes    | Reformats quotes, adds type hints while fixing bug | Only change lines that fix the reported issue                 |
| Goal-Driven         | "I'll review and improve the code"                 | "Write test for bug X → make it pass → verify no regressions" |

## Key Insight

The "overcomplicated" examples aren't obviously wrong—they follow design patterns and best practices. The problem is **timing**: they add complexity before it's needed, which:

- Makes code harder to understand
- Introduces more bugs
- Takes longer to implement
- Harder to test

The "simple" versions are:

- Easier to understand
- Faster to implement
- Easier to test
- Can be refactored later when complexity is actually needed

**Good code is code that solves today's problem simply, not tomorrow's problem prematurely.**