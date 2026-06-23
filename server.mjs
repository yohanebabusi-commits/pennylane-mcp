#!/usr/bin/env node
// Pennylane MCP server — exposes the Pennylane Company API (v2) as MCP tools.
// Token is read from a local .env file (PENNYLANE_API_TOKEN) and never committed.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- tiny .env loader (no dependency) -------------------------------------
function loadEnv() {
  try {
    const txt = readFileSync(join(__dirname, ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    /* no .env file — token may come from the real environment instead */
  }
}
loadEnv();

const API_BASE =
  process.env.PENNYLANE_API_BASE || "https://app.pennylane.com/api/external/v2";

function getToken() {
  const t = process.env.PENNYLANE_API_TOKEN;
  if (!t || t === "paste-your-token-here") {
    throw new Error(
      "PENNYLANE_API_TOKEN is not set. Edit the .env file in this project and paste your Pennylane Company API token."
    );
  }
  return t;
}

// --- HTTP helper ----------------------------------------------------------
async function apiRequest(method, path, { query, body } = {}) {
  const token = getToken();
  const url = new URL(
    API_BASE.replace(/\/$/, "") + "/" + String(path).replace(/^\//, "")
  );
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const init = { method, headers };
  if (body !== undefined && body !== null && method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function ok(r) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ status: r.status, ok: r.ok, data: r.data }, null, 2),
      },
    ],
    isError: !r.ok,
  };
}
function fail(e) {
  return {
    content: [{ type: "text", text: String((e && e.message) || e) }],
    isError: true,
  };
}
async function run(fn) {
  try {
    return ok(await fn());
  } catch (e) {
    return fail(e);
  }
}

// --- MCP server -----------------------------------------------------------
const server = new McpServer({ name: "pennylane", version: "1.0.0" });

server.tool(
  "pennylane_test_connection",
  "Verify the Pennylane API token by calling GET /me. Returns the authenticated company/user info. Use this first to confirm the connector works.",
  {},
  () => run(() => apiRequest("GET", "/me"))
);

server.tool(
  "pennylane_list_customer_invoices",
  "List customer (sales) invoices. Optional pagination/filter params.",
  {
    limit: z.number().int().positive().max(100).optional().describe("Page size"),
    cursor: z.string().optional().describe("Pagination cursor returned by a previous call"),
    filter: z.string().optional().describe("Raw v2 filter expression, if any"),
  },
  ({ limit, cursor, filter }) =>
    run(() => apiRequest("GET", "/customer_invoices", { query: { limit, cursor, filter } }))
);

server.tool(
  "pennylane_get_customer_invoice",
  "Get a single customer invoice by its id.",
  { id: z.union([z.string(), z.number()]).describe("Customer invoice id") },
  ({ id }) => run(() => apiRequest("GET", `/customer_invoices/${id}`))
);

server.tool(
  "pennylane_create_customer_invoice",
  "Create a customer invoice (WRITE — creates real data in Pennylane). Pass the full payload object expected by POST /customer_invoices.",
  { invoice: z.record(z.any()).describe("Invoice payload as per the Pennylane v2 API") },
  ({ invoice }) => run(() => apiRequest("POST", "/customer_invoices", { body: invoice }))
);

server.tool(
  "pennylane_list_customers",
  "List customers (clients).",
  {
    limit: z.number().int().positive().max(100).optional(),
    cursor: z.string().optional(),
    filter: z.string().optional(),
  },
  ({ limit, cursor, filter }) =>
    run(() => apiRequest("GET", "/customers", { query: { limit, cursor, filter } }))
);

server.tool(
  "pennylane_request",
  "Make an arbitrary authenticated request to the Pennylane Company API v2. Use for any endpoint not covered by a dedicated tool. Non-GET methods write real data — use with care.",
  {
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .describe("Path after /api/external/v2, e.g. /customers or /customer_invoices/123"),
    query: z.record(z.any()).optional().describe("Query string params"),
    body: z.record(z.any()).optional().describe("JSON request body for write methods"),
  },
  ({ method, path, query, body }) =>
    run(() => apiRequest(method, path, { query, body }))
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`pennylane-mcp ready — base ${API_BASE}`);
