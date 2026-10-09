import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CONSENT_PLACEHOLDER,
  CONSENT_VERSION,
  DQ_MESSAGES,
  GHL_LR_WEBHOOK_KEYS,
  HARD_DQ,
  INCIDENT_CHIPS,
  LR_CONSENT_V2,
  QUALIFYING_STATES,
  QUIZ_VERSION,
  STEP_IDS,
  buildGhlLrPayload,
  chipToMmDdYyyy,
  evaluateLead,
  formatMmDdYyyy,
  incidentLimitYears,
  isWithinIncidentWindow,
  parseMmDdYyyy,
  postGhlLrLead,
} from "./quiz.js";

const today = new Date(2026, 9, 9);
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("./quiz.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function qualified(overrides = {}) {
  return {
    onJob: "Yes",
    federal: "No",
    attorney: "No",
    state: "FL",
    incidentDate: "10/09/2026",
    description: "Hurt my back lifting",
    zip: "33101",
    firstName: "Ana",
    lastName: "Lopez",
    phone: "(305) 555-0134",
    email: "Ana@Example.com",
    consent: true,
    ...overrides,
  };
}

test("consent placeholder is the unchanged lr-consent-v2 copy", () => {
  assert.equal(CONSENT_VERSION, "lr-consent-v2");
  assert.equal(CONSENT_PLACEHOLDER, LR_CONSENT_V2);
  assert.ok(LR_CONSENT_V2.length > 80);
  assert.match(html, /CONSENT_PLACEHOLDER/);
  assert.match(html, /data-consent-version="lr-consent-v2"/);
  assert.doesNotMatch(html, /landerlab/i);
  assert.doesNotMatch(source, /landerlab/i);
});

test("page keeps the firm hero and placeholder logo notes", () => {
  assert.match(html, /Injured at work\? You could be sitting on a huge settlement/);
  assert.match(html, /Free check/);
  assert.match(html, /No commitment/);
  assert.match(html, /Pay nothing/);
  assert.match(html, /My Employee Rights/);
  assert.match(html, /TOM_LOGO/);
  assert.match(html, /TOM_PHOTO/);
  assert.match(css, /TOM_PHOTO/);
  assert.equal(html.match(/data-step="([^"]+)"/g).map((item) => item.slice(11, -1)).join(","), STEP_IDS.join(","));
});

test("contact fields are one step each, in order, and ZIP stays required", () => {
  const contactOrder = ["first-name", "last-name", "phone", "email", "zip"];
  const ids = [...html.matchAll(/data-step="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids.filter((id) => contactOrder.includes(id)), contactOrder);
  for (const id of contactOrder) {
    const block = html.split(`data-step="${id}"`)[1].split("data-step=")[0];
    const fields = block.match(/<(input|textarea|select)\b/g) || [];
    assert.equal(fields.length, 1, id);
    assert.match(block, /<h2/);
  }
  assert.equal(evaluateLead(qualified({ zip: "" }), today).code, "zip");
  assert.equal(evaluateLead(qualified({ zip: "33101" }), today).ok, true);
});

test("injury chips emit mm/dd/yyyy", () => {
  assert.equal(chipToMmDdYyyy("today", today), "10/09/2026");
  assert.equal(chipToMmDdYyyy("last-week", today), "10/02/2026");
  assert.equal(chipToMmDdYyyy("last-month", today), "09/09/2026");
  assert.equal(chipToMmDdYyyy("three-months", today), "07/09/2026");
  assert.equal(chipToMmDdYyyy("six-months", today), "04/09/2026");
  assert.equal(chipToMmDdYyyy("one-year", today), "10/09/2025");
  assert.equal(chipToMmDdYyyy("two-years", today), "10/09/2024");
  assert.equal(chipToMmDdYyyy("over-two-years", today), "10/08/2024");
  for (const chip of INCIDENT_CHIPS) {
    assert.match(chipToMmDdYyyy(chip.id, today), /^\d{2}\/\d{2}\/\d{4}$/);
    assert.ok(parseMmDdYyyy(chipToMmDdYyyy(chip.id, today)));
  }
  assert.equal(formatMmDdYyyy(today), "10/09/2026");
  assert.equal(parseMmDdYyyy("2026-10-09"), null);
  assert.equal(parseMmDdYyyy("02/31/2026"), null);
});

test("disqualifies on-job, federal, attorney, window, description, and state", () => {
  assert.equal(evaluateLead(qualified({ onJob: "No" }), today).code, "on_job");
  assert.equal(evaluateLead(qualified({ federal: "Yes" }), today).code, "federal");
  assert.equal(evaluateLead(qualified({ attorney: "Yes" }), today).code, "attorney");
  assert.equal(evaluateLead(qualified({ state: "TX" }), today).code, "state");
  assert.equal(evaluateLead(qualified({ state: "FL", incidentDate: "10/08/2024" }), today).code, "incident_window");
  assert.equal(evaluateLead(qualified({ state: "OH", incidentDate: "10/08/2025" }), today).code, "incident_window");
  assert.equal(evaluateLead(qualified({ description: "abc" }), today).code, "description");
  assert.equal(evaluateLead(qualified({ description: "  ab" }), today).code, "description");
  assert.equal(evaluateLead(qualified({ zip: "" }), today).code, "zip");
  assert.equal(evaluateLead(qualified({ zip: "3310" }), today).code, "zip");
  assert.equal(evaluateLead(qualified({ consent: false }), today).code, "consent");
  for (const code of HARD_DQ) assert.ok(DQ_MESSAGES[code]);
});

test("qualifies the six states inside the right window", () => {
  for (const state of QUALIFYING_STATES) {
    const incidentDate = state === "OH" ? "10/09/2025" : "10/09/2024";
    const result = evaluateLead(qualified({ state, incidentDate }), today);
    assert.equal(result.ok, true, state);
    assert.equal(result.payload.incident_date, incidentDate);
    assert.equal(result.payload.state, state);
  }
  assert.equal(incidentLimitYears("OH"), 1);
  assert.equal(incidentLimitYears("FL"), 2);
  assert.equal(isWithinIncidentWindow("10/09/2024", "FL", today), true);
  assert.equal(isWithinIncidentWindow("10/09/2024", "OH", today), false);
  assert.equal(isWithinIncidentWindow("10/10/2026", "FL", today), false);
  const edge = evaluateLead(qualified({ description: "abcd" }), today);
  assert.equal(edge.ok, true);
});

test("saved payload uses only GHL-LR webhook keys and fires brd-lead-saved contract", () => {
  const payload = buildGhlLrPayload(qualified(), today);
  assert.deepEqual(Object.keys(payload).sort(), Object.values(GHL_LR_WEBHOOK_KEYS).sort());
  assert.equal(payload.phone, "3055550134");
  assert.equal(payload.postal_code, "33101");
  assert.equal(payload.email, "Ana@Example.com");
  assert.equal(payload.on_the_job, "Yes");
  assert.equal(payload.federal_employee, "No");
  assert.equal(payload.has_attorney, "No");
  assert.equal(payload.consent_accepted, "Yes");
  assert.equal(payload.consent_version, "lr-consent-v2");
  assert.equal(payload.quiz_version, QUIZ_VERSION);
  assert.match(payload.incident_date, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.match(source, /brd-lead-saved/);
  assert.throws(() => buildGhlLrPayload(qualified({ onJob: "No" }), today), /on_job/);
});

test("posts the GHL-LR body only when a webhook URL is set", async () => {
  const payload = buildGhlLrPayload(qualified({ zip: "30301-1234" }), today);
  assert.equal(payload.postal_code, "30301-1234");
  let called = false;
  await postGhlLrLead(payload, () => {
    called = true;
    return { ok: true };
  }, "");
  assert.equal(called, false);

  let body = "";
  await postGhlLrLead(payload, async (_url, options) => {
    body = options.body;
    return { ok: true };
  }, "https://example.test/ghl-lr");
  assert.deepEqual(Object.keys(JSON.parse(body)).sort(), Object.values(GHL_LR_WEBHOOK_KEYS).sort());

  await assert.rejects(
    postGhlLrLead(payload, async () => ({ ok: false }), "https://example.test/ghl-lr"),
    /GHL-LR webhook failed/,
  );
});
