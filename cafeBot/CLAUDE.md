# CLAUDE.md — Permanent Project Instructions for CafeBot

Follow these rules on every task in this repository:

1. **Read Before Editing**: Always inspect existing files before making changes.
2. **One Task at a Time**: Focus on one specific file, module, or feature per step.
3. **Minimal Scope**: Modify only the files necessary for the current task. Never rewrite unrelated working files.
4. **Simplicity First**: Keep code clean, modular, readable, and beginner-friendly.
5. **Verify Every Change**: Test and validate every edit (JSON syntax, TypeScript/JS checks, UI behavior) before moving on.
6. **Zero Hardcoded Secrets**: Never hardcode API keys, passwords, tokens, or credentials. Always use environment variables.
7. **Minimal Dependencies**: Avoid unnecessary third-party libraries.
8. **Token-Efficient Workflow**: Keep changes tightly bounded, avoid redundant boilerplate, and preserve existing working functionality.
9. **Menu Grounding Rule**: The ordering assistant must read products, prices, ingredients, options, allergens, and availability strictly from `data/menu.json`. Never invent products, prices, or availability.
10. **Explicit Confirmation Rule**: Never mark or save an order as confirmed without explicit customer confirmation.
11. **Brief Explanations**: Summarize important changes concisely after verification.
