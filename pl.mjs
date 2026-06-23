#!/usr/bin/env node
// Tiny CLI for ad-hoc Pennylane API calls.
//   node pl.mjs GET /customers
//   node pl.mjs POST /customer_invoices payload.json
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const txt = readFileSync(join(__dirname, ".env"), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {}

const base = process.env.PENNYLANE_API_BASE || "https://app.pennylane.com/api/external/v2";
const token = process.env.PENNYLANE_API_TOKEN;
const [method = "GET", path = "/me", bodyFile] = process.argv.slice(2);

const init = { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } };
if (bodyFile) {
  init.headers["Content-Type"] = "application/json";
  init.body = readFileSync(bodyFile, "utf8");
}
const res = await fetch(base.replace(/\/$/, "") + "/" + path.replace(/^\//, ""), init);
const text = await res.text();
console.log("HTTP", res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
process.exit(res.ok ? 0 : 1);
