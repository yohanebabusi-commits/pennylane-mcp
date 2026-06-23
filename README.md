# pennylane-mcp

A small local **MCP server** that exposes the [Pennylane Company API (v2)](https://pennylane.readme.io/docs/getting-started)
as tools for Claude Code (or any MCP client).

This is a standalone project — it has nothing to do with any other repo.

## Tools

| Tool | What it does |
|------|--------------|
| `pennylane_test_connection` | `GET /me` — verify the token works |
| `pennylane_list_customer_invoices` | List sales invoices (`limit`, `cursor`, `filter`) |
| `pennylane_get_customer_invoice` | Get one invoice by `id` |
| `pennylane_create_customer_invoice` | **Create** an invoice (write) |
| `pennylane_list_customers` | List customers |
| `pennylane_request` | Generic call to any v2 endpoint (`method`, `path`, `query`, `body`) |

## Setup

```bash
npm install
```

Then put your token in `.env` (already created, gitignored):

```
PENNYLANE_API_TOKEN=your-real-token-here
```

> The token is read only from `.env` (or the real environment). It is never committed.

### Quick check (no MCP client needed)

```bash
node smoke.mjs
```

This calls `GET /me` and prints the result — a fast way to confirm the token is valid.

## Use it in Claude Code

Open Claude Code **in this folder** and it will pick up `.mcp.json` automatically
(the tools appear as `mcp__pennylane__*`). Approve the server when prompted, then restart the session if needed.

To use it from **any** folder instead, register it globally:

```bash
claude mcp add pennylane --scope user -- node "$(pwd)/server.mjs"
```

## Security

- `.env` is gitignored — never commit your token.
- `pennylane_create_customer_invoice` and non-GET `pennylane_request` calls **write real data** to your Pennylane account. Review payloads before running them.

## API reference

- Base URL: `https://app.pennylane.com/api/external/v2`
- Auth: `Authorization: Bearer <token>`
- Docs: https://pennylane.readme.io/docs/getting-started
