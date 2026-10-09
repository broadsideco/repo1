/**
 * Leading Response workers' compensation case review — lr-launch/v1l.
 *
 * Qualification, consent, and the GHL-LR webhook contract live here so the
 * page and the node tests share one implementation.
 *
 * Live consent copy is lr-consent-v2. CONSENT_PLACEHOLDER is that string.
 * Do not fork the wording under a second version id.
 */

export const QUIZ_VERSION = "lr-launch/v1l";

export const CONSENT_VERSION = "lr-consent-v2";

/** Canonical live consent. Identifier: lr-consent-v2. */
export const LR_CONSENT_V2 =
  "I agree that My Employee Rights and its partner law firms may contact me at the phone number and email I provided about this workers' compensation inquiry, including by automated calls, texts, and prerecorded messages. Consent is not required to receive a free case check and is not a condition of any purchase. This form does not create an attorney-client relationship, and My Employee Rights is not a law firm. Message frequency varies. Message and data rates may apply. Reply STOP to opt out of texts and HELP for help.";

/** Token used by the page. Live value is lr-consent-v2, unchanged. */
export const CONSENT_PLACEHOLDER = LR_CONSENT_V2;

export const LEAD_SAVED_EVENT = "brd-lead-saved";

/**
 * Paste the Leading Response GoHighLevel inbound webhook here for launch.
 * Empty means the case check is saved in the browser only (brd-lead-saved
 * still fires) so the page can be reviewed without posting leads.
 */
export const GHL_LR_WEBHOOK_URL = "";

/** Payload keys for the GHL-LR webhook. Values are the JSON field names. */
export const GHL_LR_WEBHOOK_KEYS = Object.freeze({
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  phone: "phone",
  postal_code: "postal_code",
  state: "state",
  on_the_job: "on_the_job",
  federal_employee: "federal_employee",
  has_attorney: "has_attorney",
  incident_date: "incident_date",
  injury_description: "injury_description",
  consent_accepted: "consent_accepted",
  consent_version: "consent_version",
  quiz_version: "quiz_version",
});

export const QUALIFYING_STATES = Object.freeze([
  "FL",
  "GA",
  "IL",
  "PA",
  "NC",
  "OH",
]);

export const STEP_IDS = Object.freeze([
  "on-job",
  "federal",
  "attorney",
  "state",
  "zip",
  "incident",
  "description",
  "first-name",
  "last-name",
  "phone",
  "email",
]);

/** Hard stops. A lead is not saved. */
export const HARD_DQ = Object.freeze([
  "on_job",
  "federal",
  "attorney",
  "state",
  "incident_window",
]);

export const DQ_MESSAGES = Object.freeze({
  on_job:
    "This review is for injuries that happened on the job.",
  federal:
    "Federal employees use a different claim system, so this review cannot cover that injury.",
  attorney:
    "If you already have an attorney for this injury, we are not able to open a second review.",
  state:
    "We currently review injuries in Florida, Georgia, Illinois, Pennsylvania, North Carolina, and Ohio only.",
  incident_window:
    "That incident date is outside the window we can review: 2 years, or 1 year in Ohio.",
  description: "Describe the injury in at least 4 characters.",
  zip: "A ZIP code is required.",
  contact: "Name, phone, and email are required.",
  consent: "Consent is required before we can save this case check.",
});

/**
 * Date shortcuts. Each chip emits a calendar date as mm/dd/yyyy.
 * years, then months, then days, applied to the local today.
 */
export const INCIDENT_CHIPS = Object.freeze([
  { id: "today", label: "Today" },
  { id: "last-week", label: "Last week", days: -7 },
  { id: "last-month", label: "Last month", months: -1 },
  { id: "three-months", label: "3 months ago", months: -3 },
  { id: "six-months", label: "6 months ago", months: -6 },
  { id: "one-year", label: "1 year ago", years: -1 },
  { id: "two-years", label: "2 years ago", years: -2 },
  { id: "over-two-years", label: "Over 2 years ago", years: -2, days: -1 },
]);

const DESCRIPTION_MIN = 4;

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatMmDdYyyy(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}/${day}/${year}`;
}

export function parseMmDdYyyy(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function maskDate(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function chipToMmDdYyyy(chipId, today = new Date()) {
  const chip = INCIDENT_CHIPS.find((item) => item.id === chipId);
  if (!chip) return null;
  const date = startOfDay(today);
  if (chip.years) date.setFullYear(date.getFullYear() + chip.years);
  if (chip.months) date.setMonth(date.getMonth() + chip.months);
  if (chip.days) date.setDate(date.getDate() + chip.days);
  return formatMmDdYyyy(date);
}

export function incidentLimitYears(state) {
  return String(state || "").toUpperCase() === "OH" ? 1 : 2;
}

export function isWithinIncidentWindow(incidentDate, state, today = new Date()) {
  const incident = parseMmDdYyyy(incidentDate);
  if (!incident) return false;
  const todayStart = startOfDay(today);
  if (incident.getTime() > todayStart.getTime()) return false;
  const years = incidentLimitYears(state);
  const cutoff = new Date(
    todayStart.getFullYear() - years,
    todayStart.getMonth(),
    todayStart.getDate(),
  );
  return incident.getTime() >= cutoff.getTime();
}

export function normalizeZip(value) {
  const match = /^(\d{5})(?:-(\d{4}))?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return match[2] ? `${match[1]}-${match[2]}` : match[1];
}

export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!/^[2-9]\d{9}$/.test(national)) return null;
  return national;
}

export function normalizeEmail(value) {
  const email = String(value ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function fail(code, step) {
  return { ok: false, code, step, message: DQ_MESSAGES[code] };
}

/**
 * Full qualification check. A saved lead must pass every gate:
 * on-job Yes, federal No, attorney No, incident within 2 years
 * (1 year in Ohio), description at least 4 characters, state in
 * FL/GA/IL/PA/NC/OH, ZIP present, contact complete, consent given.
 */
export function evaluateLead(input, today = new Date()) {
  const answers = input || {};
  if (answers.onJob !== "Yes" && answers.onJob !== "No") return fail("on_job", "on-job");
  if (answers.onJob !== "Yes") return fail("on_job", "on-job");
  if (answers.federal !== "Yes" && answers.federal !== "No") return fail("federal", "federal");
  if (answers.federal !== "No") return fail("federal", "federal");
  if (answers.attorney !== "Yes" && answers.attorney !== "No") return fail("attorney", "attorney");
  if (answers.attorney !== "No") return fail("attorney", "attorney");

  const state = String(answers.state || "").trim().toUpperCase();
  if (!QUALIFYING_STATES.includes(state)) return fail("state", "state");

  const zip = normalizeZip(answers.zip);
  if (!zip) return fail("zip", "zip");

  if (!parseMmDdYyyy(answers.incidentDate)) return fail("incident_window", "incident");
  if (!isWithinIncidentWindow(answers.incidentDate, state, today)) {
    return fail("incident_window", "incident");
  }

  const description = String(answers.description ?? "").trim();
  if (description.length < DESCRIPTION_MIN) return fail("description", "description");

  const firstName = String(answers.firstName ?? "").trim();
  if (!firstName) return fail("contact", "first-name");
  const lastName = String(answers.lastName ?? "").trim();
  if (!lastName) return fail("contact", "last-name");
  const phone = normalizePhone(answers.phone);
  if (!phone) return fail("contact", "phone");
  const email = normalizeEmail(answers.email);
  if (!email) return fail("contact", "email");

  if (answers.consent !== true) return fail("consent", "email");

  const keys = GHL_LR_WEBHOOK_KEYS;
  const payload = {
    [keys.first_name]: firstName,
    [keys.last_name]: lastName,
    [keys.email]: email,
    [keys.phone]: phone,
    [keys.postal_code]: zip,
    [keys.state]: state,
    [keys.on_the_job]: "Yes",
    [keys.federal_employee]: "No",
    [keys.has_attorney]: "No",
    [keys.incident_date]: String(answers.incidentDate).trim(),
    [keys.injury_description]: description,
    [keys.consent_accepted]: "Yes",
    [keys.consent_version]: CONSENT_VERSION,
    [keys.quiz_version]: QUIZ_VERSION,
  };

  return { ok: true, payload };
}

export function buildGhlLrPayload(input, today = new Date()) {
  const result = evaluateLead(input, today);
  if (!result.ok) {
    const error = new Error(result.code);
    error.code = result.code;
    throw error;
  }
  return result.payload;
}

export async function postGhlLrLead(payload, fetchImpl = globalThis.fetch, url = GHL_LR_WEBHOOK_URL) {
  if (url) {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("GHL-LR webhook failed");
    }
  }
  return payload;
}

export function windowHint(state) {
  if (String(state || "").toUpperCase() === "OH") {
    return "In Ohio, the incident needs to be within the last year.";
  }
  if (QUALIFYING_STATES.includes(String(state || "").toUpperCase())) {
    return "The incident needs to be within the last 2 years.";
  }
  return "Select the state first. The review window is 2 years, or 1 year in Ohio.";
}

function init() {
  const form = document.getElementById("case-form");
  if (!form) return;

  const steps = [...form.querySelectorAll(".step")];
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const progressBar = document.getElementById("progress-bar");
  const stepMeta = document.getElementById("step-meta");
  const backBtn = document.getElementById("back");
  const continueBtn = document.getElementById("continue");
  const shareBtn = document.getElementById("share-step");
  const shareStatus = document.getElementById("share-status");
  const result = document.getElementById("result");
  const resultTitle = document.getElementById("result-title");
  const resultBody = document.getElementById("result-body");
  const startOver = document.getElementById("start-over");
  const consentCopy = document.getElementById("consent-copy");
  const incidentInput = document.getElementById("incident-date");
  const incidentEmitted = document.getElementById("incident-emitted");
  const windowHintEl = document.getElementById("window-hint");
  const stateSelect = document.getElementById("state");

  if (consentCopy) consentCopy.textContent = CONSENT_PLACEHOLDER;

  let index = 0;
  let saving = false;

  function readAnswers() {
    const selected = (name) =>
      form.querySelector(`input[name="${name}"]:checked`)?.value || "";
    return {
      onJob: selected("on_the_job"),
      federal: selected("federal_employee"),
      attorney: selected("has_attorney"),
      state: stateSelect.value,
      incidentDate: incidentInput.value.trim(),
      description: document.getElementById("description").value,
      zip: document.getElementById("zip").value,
      firstName: document.getElementById("first-name").value,
      lastName: document.getElementById("last-name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      consent: document.getElementById("consent").checked,
    };
  }

  function clearStepError(stepEl) {
    const error = stepEl.querySelector(".step-error");
    if (error) error.textContent = "";
    stepEl.querySelectorAll("[aria-invalid='true']").forEach((el) => {
      el.removeAttribute("aria-invalid");
    });
  }

  function showStepError(stepEl, message) {
    const error = stepEl.querySelector(".step-error");
    if (error) error.textContent = message;
    const field = stepEl.querySelector("input, select, textarea");
    if (field) field.setAttribute("aria-invalid", "true");
  }

  function showStep(nextIndex, { focus = false } = {}) {
    index = nextIndex;
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      step.hidden = !active;
      if (!active) clearStepError(step);
    });
    const id = steps[index].dataset.step;
    const percent = Math.round(((index + 1) / steps.length) * 100);
    progressText.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(percent));
    progressBar.setAttribute("aria-valuetext", `${percent} percent`);
    stepMeta.textContent = `Step ${index + 1} of ${steps.length}`;
    backBtn.hidden = index === 0;
    continueBtn.textContent = id === "email" ? "Agree and Continue" : "Continue";
    if (id === "incident" && windowHintEl) {
      windowHintEl.textContent = windowHint(stateSelect.value);
    }
    const url = new URL(location.href);
    url.hash = id;
    history.replaceState({ step: id }, "", url);
    document.title = `Step ${index + 1} of ${steps.length} · My Employee Rights`;
    if (focus) {
      const target = steps[index].querySelector("input, select, textarea");
      target?.focus();
    }
  }

  function showResult(outcome, title, message) {
    form.hidden = true;
    result.hidden = false;
    result.dataset.outcome = outcome;
    resultTitle.textContent = title;
    resultBody.textContent = message;
    startOver.hidden = outcome === "saved";
    document.title =
      outcome === "saved"
        ? "Case check received · My Employee Rights"
        : "Case review · My Employee Rights";
  }

  function showDq(code) {
    showResult("dq", "We can't review this one", DQ_MESSAGES[code] || "");
    result.dataset.reason = code;
  }

  function validateCurrent() {
    const step = steps[index];
    const id = step.dataset.step;
    const answers = readAnswers();
    clearStepError(step);

    if (id === "on-job") {
      if (!answers.onJob) return { error: "Select an answer to continue." };
      if (answers.onJob !== "Yes") return { dq: "on_job" };
      return { ok: true };
    }
    if (id === "federal") {
      if (!answers.federal) return { error: "Select an answer to continue." };
      if (answers.federal !== "No") return { dq: "federal" };
      return { ok: true };
    }
    if (id === "attorney") {
      if (!answers.attorney) return { error: "Select an answer to continue." };
      if (answers.attorney !== "No") return { dq: "attorney" };
      return { ok: true };
    }
    if (id === "state") {
      if (!answers.state) return { error: "Select the state where you were injured." };
      if (!QUALIFYING_STATES.includes(answers.state)) return { dq: "state" };
      if (answers.incidentDate && parseMmDdYyyy(answers.incidentDate)) {
        if (!isWithinIncidentWindow(answers.incidentDate, answers.state, new Date())) {
          return { dq: "incident_window" };
        }
      }
      return { ok: true };
    }
    if (id === "incident") {
      const incident = parseMmDdYyyy(answers.incidentDate);
      if (!incident) return { error: "Enter the incident date as MM/DD/YYYY." };
      if (incident.getTime() > startOfDay(new Date()).getTime()) {
        return { error: "The incident date cannot be in the future." };
      }
      if (!isWithinIncidentWindow(answers.incidentDate, answers.state, new Date())) {
        return { dq: "incident_window" };
      }
      return { ok: true };
    }
    if (id === "description") {
      if (answers.description.trim().length < DESCRIPTION_MIN) {
        return { error: DQ_MESSAGES.description };
      }
      return { ok: true };
    }
    if (id === "zip") {
      if (!normalizeZip(answers.zip)) return { error: "Enter a 5-digit ZIP code." };
      return { ok: true };
    }
    if (id === "first-name") {
      if (!answers.firstName.trim()) return { error: "Enter your first name." };
      return { ok: true };
    }
    if (id === "last-name") {
      if (!answers.lastName.trim()) return { error: "Enter your last name." };
      return { ok: true };
    }
    if (id === "phone") {
      if (!normalizePhone(answers.phone)) return { error: "Enter a 10-digit phone number." };
      return { ok: true };
    }
    if (id === "email") {
      if (!normalizeEmail(answers.email)) return { error: "Enter a valid email address." };
      if (!answers.consent) return { error: DQ_MESSAGES.consent };
      return { ok: true };
    }
    return { ok: true };
  }

  function resetQuiz() {
    form.reset();
    saving = false;
    continueBtn.disabled = false;
    incidentEmitted.textContent = "—";
    form.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    steps.forEach(clearStepError);
    result.hidden = true;
    result.dataset.outcome = "";
    result.dataset.reason = "";
    delete document.documentElement.dataset.brdLeadSaved;
    form.hidden = false;
    showStep(0);
  }

  function syncEmittedDate() {
    const formatted = incidentInput.value.trim();
    incidentEmitted.textContent = parseMmDdYyyy(formatted) ? formatted : "—";
    const matched = INCIDENT_CHIPS.some((chip) => chipToMmDdYyyy(chip.id, new Date()) === formatted);
    if (!matched) {
      form.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    }
  }

  form.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const formatted = chipToMmDdYyyy(chip.dataset.chip, new Date());
      if (!formatted) return;
      incidentInput.value = formatted;
      incidentEmitted.textContent = formatted;
      form.querySelectorAll(".chip").forEach((other) => {
        other.setAttribute("aria-pressed", other === chip ? "true" : "false");
      });
      clearStepError(steps[index]);
    });
  });

  incidentInput.addEventListener("input", () => {
    const next = maskDate(incidentInput.value);
    if (next !== incidentInput.value) incidentInput.value = next;
    syncEmittedDate();
  });

  backBtn.addEventListener("click", () => {
    if (index > 0) showStep(index - 1, { focus: true });
  });

  continueBtn.addEventListener("click", async () => {
    if (saving) return;
    const outcome = validateCurrent();
    if (outcome.error) {
      showStepError(steps[index], outcome.error);
      return;
    }
    if (outcome.dq) {
      showDq(outcome.dq);
      return;
    }
    if (index < steps.length - 1) {
      showStep(index + 1, { focus: true });
      return;
    }

    const evaluated = evaluateLead(readAnswers(), new Date());
    if (!evaluated.ok) {
      if (HARD_DQ.includes(evaluated.code)) {
        showDq(evaluated.code);
        return;
      }
      const target = steps.findIndex((step) => step.dataset.step === evaluated.step);
      if (target >= 0) {
        showStep(target, { focus: true });
        showStepError(steps[target], evaluated.message);
      }
      return;
    }

    saving = true;
    continueBtn.disabled = true;
    continueBtn.textContent = "Sending...";
    try {
      const webhook = document.querySelector('meta[name="ghl-lr-webhook"]')?.content?.trim() || GHL_LR_WEBHOOK_URL;
      await postGhlLrLead(evaluated.payload, globalThis.fetch, webhook);
      document.dispatchEvent(
        new CustomEvent(LEAD_SAVED_EVENT, { detail: evaluated.payload, bubbles: true }),
      );
      document.documentElement.dataset.brdLeadSaved = "true";
      showResult(
        "saved",
        "We have your case check",
        "A reviewer will contact you about the next step. There is nothing to pay for this check.",
      );
    } catch {
      saving = false;
      continueBtn.disabled = false;
      continueBtn.textContent = steps[index].dataset.step === "email" ? "Agree and Continue" : "Continue";
      showStepError(steps[index], "We could not save this case check. Please try again.");
    }
  });

  shareBtn.addEventListener("click", async () => {
    const url = new URL(location.href);
    url.hash = steps[index].dataset.step;
    const value = url.toString();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    shareStatus.textContent = "Link copied";
    window.setTimeout(() => {
      shareStatus.textContent = "";
    }, 1600);
  });

  startOver.addEventListener("click", resetQuiz);

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
      continueBtn.click();
    }
  });

  const requested = location.hash.replace("#", "");
  const start = steps.findIndex((step) => step.dataset.step === (requested === "consent" ? "email" : requested));
  showStep(start >= 0 ? start : 0);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
