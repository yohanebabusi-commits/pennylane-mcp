#!/usr/bin/env node
// Quick standalone check: calls GET /me with the token from .env and prints the result.
// Usage: node smoke.mjs
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
if (!token || token === "paste-your-token-here") {
  console.error("✗ No token. Edit .env and set PENNYLANE_API_TOKEN, then rerun: node smoke.mjs");
  process.exit(1);
}

const res = await fetch(base.replace(/\/$/, "") + "/me", {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
const body = await res.text();
console.log(`HTTP ${res.status}`);
console.log(body);
process.exit(res.ok ? 0 : 1);
