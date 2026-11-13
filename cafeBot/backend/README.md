# Backend Architecture Specification (Future Phase)

This directory is reserved for the future CafeBot backend API server.

## Planned Endpoints

- `GET /api/menu` — Serves validated menu items from `../data/menu.json`.
- `POST /api/chat` — Combines `../prompts/system-prompt.md` + `menu.json` + current order state and queries the configured LLM provider.
- `POST /api/orders` — Persists an explicitly confirmed order into `../data/orders.json` with a timestamp and unique order ID.
- `GET /api/orders` — Feeds the future Staff Dashboard with pending and completed orders.

## Guardrails

- Never save an order as confirmed without explicit customer confirmation.
- Validate every ordered `id` and `price` against `data/menu.json` on the server before persisting.
