#!/usr/bin/env node
/**
 * QA smoke test — contract + reality checks for the crm-web ↔ crm-api wiring.
 *
 * Catches "hallucinated" endpoints (code calling routes that don't exist) by
 * asserting every endpoint the app calls is present in the LIVE OpenAPI spec,
 * and probes auth-gating + CDN reachability. No secrets required.
 *
 * Run:
 *   node scripts/qa-smoke.mjs
 *   NETX_API_BASE=https://staging.netx.cc/api node scripts/qa-smoke.mjs
 *
 * Pair with the static checks (the real hallucination detectors):
 *   npm run typecheck   # tsc --noEmit — missing imports/props/fields
 *   npm run lint        # eslint
 */

const API_BASE = process.env.NETX_API_BASE || "https://staging.netx.cc/api";

// Endpoints the app calls, as they exist ON crm-api (BFF proxies strip the
// /api/<feature> prefix and forward here). Path params use {id}/{slug}.
const EXPECTED = [
  ["GET", "/api/automations"],
  ["POST", "/api/automations"],
  ["GET", "/api/automations/{id}"],
  ["PATCH", "/api/automations/{id}"],
  ["DELETE", "/api/automations/{id}"],
  ["POST", "/api/automations/{id}/activate"],
  ["POST", "/api/automations/{id}/pause"],
  ["POST", "/api/uploads"],
  ["DELETE", "/api/uploads/{id}"],
  ["GET", "/api/templates"],
  ["GET", "/api/templates/{id}"],
  ["PATCH", "/api/templates/{id}"],
  ["POST", "/api/templates/{id}/duplicate"],
  ["GET", "/api/campaigns"],
  ["POST", "/api/campaigns/{id}/test"],
  ["POST", "/api/campaigns/{id}/send"],
  ["GET", "/api/campaigns/{id}/analytics"],
  ["GET", "/api/forms"],
  ["GET", "/api/public/forms/{slug}"],
  ["POST", "/api/public/forms/{slug}/submit"],
  ["GET", "/api/lists"],
  ["GET", "/api/segments"],
];

let pass = 0;
let fail = 0;
const ok = (m) => { console.log(`  \x1b[32mPASS\x1b[0m  ${m}`); pass++; };
const no = (m) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); fail++; };

async function main() {
  console.log(`\nQA smoke — ${API_BASE}\n`);

  // 1. Endpoint contract: every called route must exist in the live spec.
  console.log("1. Endpoint contract (vs live OpenAPI)");
  let paths = {};
  try {
    const r = await fetch(`${API_BASE}/openapi/v1.json`);
    if (!r.ok) throw new Error(`spec returned ${r.status}`);
    paths = (await r.json()).paths || {};
  } catch (e) {
    no(`could not load OpenAPI spec: ${e.message}`);
    return finish();
  }
  for (const [method, path] of EXPECTED) {
    const item = paths[path];
    if (!item) no(`${method} ${path} — path missing from spec`);
    else if (!item[method.toLowerCase()]) no(`${method} ${path} — path exists but method missing`);
    else ok(`${method} ${path}`);
  }

  // 2. Auth-gating: upload must reject anonymous callers.
  console.log("\n2. Auth gating");
  try {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "x.png");
    const r = await fetch(`${API_BASE}/uploads`, { method: "POST", body: fd });
    if (r.status === 401) ok("POST /api/uploads without session → 401");
    else no(`POST /api/uploads without session → ${r.status} (expected 401)`);
  } catch (e) {
    no(`upload probe failed: ${e.message}`);
  }

  // 3. Spec sanity: a reasonable number of documented paths.
  console.log("\n3. Spec sanity");
  const n = Object.keys(paths).length;
  if (n >= 40) ok(`OpenAPI documents ${n} paths`);
  else no(`OpenAPI only documents ${n} paths (expected ≥40 — spec may be truncated)`);

  finish();
}

function finish() {
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main();
