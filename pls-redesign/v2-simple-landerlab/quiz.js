/* PLS / My Employee Rights — v2-simple LanderLab custom code (Oct 9 2026, Broadside Co.)
 * ONE file. Paste the whole thing into LanderLab → Quiz → Settings → Custom Code → JavaScript
 * (raw JS, no <script> tags), on test page 113318 first, then live 112190.
 * Replaces the small lead-id snippet that used to live there (that snippet is included below).
 * Page-level Custom Code also works if the old snippet stays; lead fields are only filled when empty.
 *
 * What it does: the approved offline prototype (one question per screen, big percent bar,
 * contact split, consent v4 on the email step) drawn over LanderLab's own quiz.
 * Leads still save through LanderLab's submit, so the webhook, TrustedForm, and field names stay.
 *
 * ROLLBACK: set CONFIG.enabled to false and republish. The builder quiz comes back as-is.
 * Or, before this file loads, set window.PLS_V2_PRESET = { enabled: false }.
 *
 * Old step 8 (ZIP, employer name, employer address, summary) is not asked. Those fields are
 * posted as ''. Nothing here invents a ZIP, employer, or story.
 * No settlement or money language.
 */
(function (window, document) {
  'use strict';

  var CONFIG = {
    enabled: true,
    version: 'v2-simple'
  };
  try {
    if (window.PLS_V2_PRESET && window.PLS_V2_PRESET.enabled === false) CONFIG.enabled = false;
  } catch (e) {}

  // Live consent v4, word for word (consent_text-v4.txt). Only "Privacy Policy" is a link.
  var CONSENT_TEXT = "I agree that Lawyers for Employee and Consumer Rights APC and its intake partner, Preferred Legal Support LLC, may call, text, or email me, including automated calls and texts, even if I'm on a Do-Not-Call list. Not required to hire a lawyer; call (323) 375-5101 instead. Msg & data rates may apply. Reply STOP to opt out. Privacy Policy";
  var PRIVACY_URL = 'https://myemployeerightsca.com/privacy';
  var LOGO_URL = 'https://myemployeerightsca.com/my-employee-rights_logo_600w.png';
  var SITUATION_NO = 'No I no longer work there';

  // Same screens, labels, posted values, and DQ flags as the approved prototype.
  var STEPS = [
    { id: 'claim', q: 'What happened at work?', field: 'claim_type', choices: [
      ['I was wrongly fired', 'Wrongful termination'],
      ['I was sexually harassed', 'Sexual harassment'],
      ['I was discriminated against', 'Discrimination'],
      ['I had unpaid wages or breaks', 'Unpaid wages overtime or missed meal/rest breaks'],
      ['Other', 'Something else']
    ] },
    { id: 'still', q: 'Do you still work there?', field: 'situation', choices: [
      ['Yes', 'Yes I still work there', true],
      ['No', SITUATION_NO]
    ] },
    { id: 'timing', q: 'When did your job end?', field: 'separation_timing', choices: [
      ['Less than 6 months ago', 'Less than 6 months ago'],
      ['6 to 12 months ago', '6 to 12 months ago'],
      ['1 to 2 years ago', '1 to 2 years ago'],
      ['2 to 3 years ago', '2 to 3 years ago'],
      ['More than 3 years ago', 'More than 3 years ago', true]
    ] },
    { id: 'pay', q: 'How were you paid?', field: 'pay_type', choices: [
      ['Hourly (W-2)', 'Hourly employee (W-2)'],
      ['Salaried', 'Salaried employee'],
      ['1099 contractor', '__1099__'],
      ['Uber, Lyft, or similar', 'App-based driver or delivery (Uber Lyft DoorDash Instacart Amazon Flex etc.)', true]
    ] },
    { id: 'pay1099', q: 'Did the company set your schedule and supervise your work?', field: '_pay1099',
      when: function (a) { return a.pay_type === '__1099__'; }, choices: [
        ['Yes', 'Paid as a 1099 contractor but the company set my schedule and supervised my work'],
        ['No', 'Independent contractor running my own business', true]
      ] },
    { id: 'employer', q: 'Who did you work for?', hint: 'Public school or college? Choose Government agency.', field: 'employer_type', choices: [
      ['Company or Business', 'Private company or business (non-union)'],
      ['Nonprofit', 'Nonprofit organization (non-union)'],
      ['Union Job', 'Union job (I was a union member)', true],
      ['Government agency', 'Government agency (city county state or federal)', true],
      ['Tribal Casino', 'Tribal casino', true]
    ] },
    { id: 'lawyer', q: 'Do you already have a lawyer for this?', field: '_lawyer', choices: [
      ['Yes', 'yes', true], ['No', 'no']
    ] },
    { id: 'severance', q: 'Did you sign a severance agreement?', field: '_severance', choices: [
      ['Yes', 'yes', true], ['No', 'no']
    ] },
    { id: 'ca', q: 'Was your job in California?', field: 'work_in_ca', choices: [
      ['Yes', 'yes'], ['No', 'no', true]
    ] },
    { id: 'age', q: 'Are you 18 or older?', field: 'age_18_plus', choices: [
      ['Yes', 'yes'], ['No', 'No', true]
    ] },
    { id: 'first', q: "What's your first name?", field: 'first_name', input: 'text', autocomplete: 'given-name', placeholder: 'First name' },
    { id: 'last', q: "What's your last name?", field: 'last_name', input: 'text', autocomplete: 'family-name', placeholder: 'Last name' },
    { id: 'phone', q: "What's the best number to reach you?", field: 'phone', input: 'tel', autocomplete: 'tel', placeholder: '(555) 555-5555' },
    { id: 'email', q: "What's your email?", field: 'email', input: 'email', autocomplete: 'email', placeholder: 'name@example.com', consent: true, button: 'See If I Have a Case' }
  ];

  // Which builder block a screen writes. Sub-screens share a block, so Back stays on that step.
  var BLOCK_OF = {
    claim: 'claim_type', still: 'situation', timing: 'separation_timing', pay: 'pay_type', pay1099: 'pay_type',
    employer: 'employer_type', lawyer: 'status_check', severance: 'status_check', ca: 'work_in_ca', age: 'age_18_plus',
    first: 'first_name', last: 'last_name', phone: 'phone', email: 'email'
  };

  function validate(step, v) {
    v = (v || '').trim();
    if (step.input === 'text') return v.length >= 1 && /[A-Za-z]/.test(v) ? '' : 'Please enter your ' + (step.field === 'first_name' ? 'first' : 'last') + ' name.';
    if (step.input === 'tel') {
      var d = v.replace(/\D/g, '');
      if (d.length === 11 && d[0] === '1') d = d.slice(1);
      return d.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? '' : 'Please enter a valid 10-digit U.S. phone number.';
    }
    if (step.input === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.';
    return '';
  }
  function phoneDigits(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    return d;
  }
  function visibleSteps(a) { return STEPS.filter(function (s) { return !s.when || s.when(a); }); }
  function isDQ(step, value) {
    if (!step.choices) return false;
    for (var i = 0; i < step.choices.length; i++) if (step.choices[i][1] === value) return !!step.choices[i][2];
    return false;
  }
  function percent(idx, a) {
    var n = visibleSteps(a).length;
    return Math.round(idx / n * 100);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function consentHTML() {
    return esc(CONSENT_TEXT.replace(/ Privacy Policy$/, '')) + ' <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener noreferrer">Privacy Policy</a>';
  }

  var CSS = [
    'html body.pls-v2{--navy:#0c2340;--navy9:#081627;--gold:#f3b33d;--ink:#0f1b2d;--muted:#5b6474;--line:#d8dee8;--bg:#f3f5f9;--accent:#1b4677;',
    '--font:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
    'margin:0;background:var(--bg);font-family:var(--font);color:var(--ink);-webkit-font-smoothing:antialiased}',
    'html body.pls-v2 .ll-quiz{display:none !important}',
    'html body.pls-v2 .mer-strip{background:var(--navy9);color:rgba(255,255,255,.82);text-align:center;padding:6px 14px;font:400 12px/1.45 var(--font)}',
    'html body.pls-v2 .mer-strip strong,html body.pls-v2 .mer-strip b,html body.pls-v2 .mer-firm,html body.pls-v2 .mer-intake-line{font-weight:400;color:inherit}',
    'html body.pls-v2 .mer-dot{opacity:.55;margin:0 .45em}',
    'html body.pls-v2 .mer-brand{background:#fff;border-bottom:1px solid #e7ebf2;padding:10px 16px}',
    'html body.pls-v2 .mer-brand-inner{max-width:640px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}',
    'html body.pls-v2 .mer-brand img{height:34px;width:auto}',
    'html body.pls-v2 .mer-intake{display:none !important}',
    'html body.pls-v2 .mer-call{font:600 13px/1.2 var(--font);color:var(--navy);text-decoration:none;white-space:nowrap}',
    'html body.pls-v2 .mer-eyebrow,html body.pls-v2 .mer-chips{display:none !important}',
    'html body.pls-v2 .mer-hero{background:transparent !important;color:inherit !important;text-align:center;padding:22px 18px 4px !important;max-width:640px;margin:0 auto}',
    'html body.pls-v2:not([data-step="claim"]) .mer-hero{display:none !important}',
    'html body.pls-v2 .mer-hero h1{margin:0 0 6px;max-width:none !important;font:800 26px/1.2 var(--font) !important;color:var(--navy) !important;letter-spacing:0 !important}',
    'html body.pls-v2 .mer-sub,html body.pls-v2 .mer-hero p{margin:0;color:var(--muted) !important;font-size:15px !important;font-weight:400 !important}',
    'html body.pls-v2 .pls-wrap{max-width:640px;margin:0 auto;padding:16px 14px 28px}',
    'html body.pls-v2 .pls-card{background:#fff;border:1px solid #e3e8f0;border-radius:16px;box-shadow:0 6px 24px rgba(12,35,64,.07);padding:20px 18px 22px}',
    'html body.pls-v2 .pls-bar-top{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}',
    'html body.pls-v2 .pls-pct{font:800 30px/1 var(--font);color:var(--navy)}',
    'html body.pls-v2 .pls-pct-l{font:600 13px/1 var(--font);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}',
    'html body.pls-v2 .pls-track{height:14px;background:#e6ebf3;border-radius:99px;overflow:hidden;margin-bottom:20px}',
    'html body.pls-v2 .pls-fill{height:100%;width:0;background:linear-gradient(90deg,var(--accent),#2f6db3);border-radius:99px;transition:width .35s ease}',
    'html body.pls-v2 .pls-q{margin:0 0 16px;font:800 23px/1.25 var(--font);color:var(--ink)}',
    'html body.pls-v2 .pls-q-sm{font-size:19px}',
    'html body.pls-v2 .pls-hint{margin:-8px 0 14px;color:var(--muted);font-size:14px}',
    'html body.pls-v2 .pls-choices{display:grid;gap:10px}',
    'html body.pls-v2 .pls-yn{grid-template-columns:1fr 1fr}',
    'html body.pls-v2 .pls-choice{min-height:56px;padding:14px 16px;border:1.5px solid var(--line);border-radius:12px;background:#fff;font:600 17px/1.25 var(--font);color:var(--ink);text-align:left;cursor:pointer}',
    'html body.pls-v2 .pls-yn .pls-choice{text-align:center;font-size:18px}',
    'html body.pls-v2 .pls-choice.is-on{border-color:var(--accent);background:#eef4fc;box-shadow:inset 0 0 0 1px var(--accent)}',
    'html body.pls-v2 .pls-input{width:100%;height:56px;padding:0 16px;border:1.5px solid var(--line);border-radius:12px;font:500 18px var(--font);color:var(--ink);background:#fff;box-sizing:border-box}',
    'html body.pls-v2 .pls-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(27,70,119,.15)}',
    'html body.pls-v2 .pls-err{min-height:18px;margin:6px 2px 4px;color:#b42318;font-size:14px}',
    'html body.pls-v2 .pls-next{width:100%;min-height:56px;border:0;border-radius:12px;background:var(--gold);color:var(--navy9);font:800 18px var(--font);cursor:pointer;margin-top:6px}',
    'html body.pls-v2 .pls-next:disabled{opacity:.7;cursor:wait}',
    'html body.pls-v2 .pls-back{display:block;margin:14px auto 0;background:none;border:0;color:var(--muted);font:600 15px var(--font);cursor:pointer;text-decoration:underline}',
    'html body.pls-v2 .pls-consent{display:flex;align-items:flex-start;gap:8px;margin:4px 0 8px;cursor:pointer}',
    'html body.pls-v2 .pls-consent input{width:18px;height:18px;min-width:18px;margin:1px 0 0}',
    'html body.pls-v2 .pls-consent span{font-size:12px;line-height:1.35;color:#5b6474}',
    'html body.pls-v2 .pls-consent a,html body.pls-v2 .pls-privacy a{color:#3a5a85}',
    'html body.pls-v2 .pls-privacy{font-size:11.5px;line-height:1.4;color:#6b7383;margin:0 0 8px}',
    'html body.pls-v2 .pls-body{color:#334155;font-size:15px;line-height:1.5}',
    'html body.pls-v2 .pls-trust{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin:14px 0 0;padding:0;list-style:none;color:var(--muted);font:600 13px var(--font)}',
    'html body.pls-v2 .pls-trust li:before{content:"\\2713  ";color:#1f7a4d}',
    'html body.pls-v2 #mer-behind,html body.pls-v2 #brd-disclosure-footer{max-width:640px}',
    '@media (min-width:768px){html body.pls-v2 .mer-strip{font-size:13px}html body.pls-v2 .mer-hero h1{font-size:32px !important}html body.pls-v2 .pls-card{padding:28px 30px}html body.pls-v2 .pls-q{font-size:26px}}'
  ].join('');

  // ---- LanderLab lead stamp (the snippet this file replaces). Fills only empty hidden fields.
  function uuid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function setIfEmpty(q, name, v) {
    try { var b = q.getBlock(name); if (b && !b.getValue() && v) b.setValue(v); } catch (e) {}
  }
  function stampLead(q) {
    try {
      var p = new URLSearchParams(location.search);
      setIfEmpty(q, 'lead_id', 'BRD-' + uuid());
      setIfEmpty(q, 'started_at', new Date().toISOString());
      try { setIfEmpty(q, 'time_zone', Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) {}
      setIfEmpty(q, 'click_id', p.get('fbclid') || p.get('gclid') || p.get('click_id') || '');
      setIfEmpty(q, 'source', p.get('source') || p.get('utm_source') || (document.referrer ? new URL(document.referrer).hostname : 'direct'));
      setIfEmpty(q, 'landing_page', location.origin + location.pathname);
      ['campaign_id', 'adset_id', 'ad_id', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        setIfEmpty(q, k, p.get(k) || '');
      });
    } catch (err) { if (window.console) window.console.warn('quiz init', err); }
  }

  var api = null;
  var STEP = { details: 'q8-details', contact: 'q9-contact', nq: 'not-qualified', ty: 'thank-you' };
  var answers = {};
  var history = [];
  var cur = 0;
  var mode = 'ask'; // ask | sending | nq | ty
  var lock = false;
  var app = null;
  var sendError = '';

  function block(name) {
    try { return api.getBlock(name); } catch (e) { return null; }
  }
  function stepNameForBlock(blockName) {
    try {
      var steps = api.getSteps();
      for (var i = 0; i < steps.length; i++) {
        var blocks = api.getBlocksByStep(steps[i].id) || [];
        for (var j = 0; j < blocks.length; j++) if (blocks[j].variableName === blockName) return steps[i].name;
      }
    } catch (e) {}
    return '';
  }
  function stepIdByName(name) {
    try {
      var steps = api.getSteps();
      for (var i = 0; i < steps.length; i++) if (steps[i].name === name) return steps[i].id;
    } catch (e) {}
    return '';
  }
  function mapSteps() {
    var details = stepNameForBlock('postal_code');
    var contact = stepNameForBlock('email');
    if (details) STEP.details = details;
    if (contact) STEP.contact = contact;
    var steps = [];
    try { steps = api.getSteps(); } catch (e) {}
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].name === 'not-qualified' || steps[i].name === 'nq') STEP.nq = steps[i].name;
      if (steps[i].name === 'thank-you' || steps[i].name === 'thanks') STEP.ty = steps[i].name;
    }
  }
  function builderStep(screenId) { return stepNameForBlock(BLOCK_OF[screenId] || '') || ''; }
  function currentStepName() {
    try { return api.getCurrentStep().name || ''; } catch (e) { return ''; }
  }

  function setBlockValue(name, value) {
    var w = block(name);
    if (!w || !w.setValue) return w;
    var want = value == null ? '' : String(value);
    try { w.setValue(want); } catch (e) {}
    if (String(w.getValue() == null ? '' : w.getValue()) !== want && w.block) {
      try {
        w.block.value = want;
        if (w.block.handleValidations) w.block.handleValidations();
        var input = w.block.getInputInsideBlock && w.block.getInputInsideBlock();
        if (input && 'value' in input) input.value = want;
      } catch (e2) {}
    }
    return w;
  }

  // "No I no longer work there" is not a builder option. GHL stores situation as text, so we add it
  // on the live select and the runtime accepts it. Rollback (add-on off) leaves the builder list as published.
  function ensureSituationOption() {
    var w = block('situation');
    var b = w && w.block;
    if (!b || !b.options) return;
    var known = false;
    for (var i = 0; i < b.options.length; i++) if (b.options[i].value === SITUATION_NO) known = true;
    if (!known) b.options.push({ id: 'pls-situation-no', label: 'No', value: SITUATION_NO, selected: false });
    var input = b.getInputInsideBlock && b.getInputInsideBlock();
    if (input && input.tagName === 'SELECT') {
      var found = false;
      for (var j = 0; j < input.options.length; j++) if (input.options[j].value === SITUATION_NO) found = true;
      if (!found) input.add(new Option('No', SITUATION_NO));
    }
    if (b.choices && typeof b.choices.setChoices === 'function') {
      try { b.choices.setChoices([{ value: SITUATION_NO, label: 'No' }], 'value', 'label', false); } catch (e) {}
    }
  }

  // LanderLab's phone block posts E.164 (+1…). The prototype posts 10 digits. Keep the block valid
  // for the phone checker, and report 10 digits from getState, which is what the lead POST reads.
  function pinPhone(digits) {
    var w = block('phone');
    var b = w && w.block;
    if (!b) return;
    b.__plsDigits = digits;
    if (b.__plsPinned) return;
    b.__plsPinned = true;
    var orig = b.getState;
    b.getState = function () {
      var s = orig.call(b);
      if (b.__plsDigits) s.value = b.__plsDigits;
      return s;
    };
  }
  function setPhone(raw) {
    var digits = phoneDigits(raw);
    var w = block('phone');
    if (!w) return;
    try { w.setValue(digits); } catch (e) {}
    pinPhone(digits);
    if (w.block) w.block.formattedValue = digits;
  }
  // intl-tel-input loads its checker a moment after the contact step opens. A number can be
  // valid and still look invalid until that checker is ready, so wait briefly before leaving
  // the phone step or submitting.
  function ensurePhone(raw) {
    var digits = phoneDigits(raw);
    return new Promise(function (resolve) {
      var tries = 0;
      (function tick() {
        setPhone(raw);
        var w = block('phone');
        var iti = w && w.block && w.block.iti;
        var valid = false;
        try { valid = !!(iti && iti.isValidNumber && iti.isValidNumber() === true); } catch (e) {}
        if (valid) return resolve(true);
        if (!iti && tries >= 8) return resolve(true);
        if (++tries > 40) return resolve(false);
        setTimeout(tick, 100);
      })();
    });
  }
  function setVisible(name, on) {
    var w = block(name);
    if (!w || !w.visibility) return;
    try { on ? w.visibility.show() : w.visibility.hide(); } catch (e) {}
  }
  function blankDetails() {
    ['postal_code', 'employer_name', 'employer_address', 'case_summary'].forEach(function (n) {
      setBlockValue(n, '');
    });
  }
  function statusValue() {
    if (answers._lawyer === 'yes') return 'I already have a lawyer for this';
    if (answers._severance === 'yes') return 'I signed a severance agreement';
    if (answers._lawyer === 'no' && answers._severance === 'no') return 'None of these apply to me';
    return '';
  }
  function applyAnswer(screen) {
    var id = screen.id;
    var v = answers[screen.field];
    if (id === 'pay') {
      if (v && v !== '__1099__') setBlockValue('pay_type', v);
      return;
    }
    if (id === 'pay1099') { setBlockValue('pay_type', v || ''); return; }
    if (id === 'lawyer' || id === 'severance') {
      var sc = statusValue();
      if (sc) setBlockValue('status_check', sc);
      return;
    }
    if (id === 'still') { ensureSituationOption(); setBlockValue('situation', v || ''); return; }
    if (id === 'ca') { setBlockValue('work_in_ca', v || ''); return; }
    if (id === 'age') { setVisible('age_18_plus', true); setBlockValue('age_18_plus', v || ''); return; }
    if (id === 'phone') { setPhone(v || ''); return; }
    if (id === 'email') { setBlockValue('email', (v || '').trim()); return; }
    var field = BLOCK_OF[id];
    if (field && v != null && String(v).indexOf('__') !== 0) setBlockValue(field, v);
  }
  function applyContact() {
    setBlockValue('first_name', (answers.first_name || '').trim());
    setBlockValue('last_name', (answers.last_name || '').trim());
    setPhone(answers.phone || '');
    setBlockValue('email', (answers.email || '').trim());
    if (answers.consent) setBlockValue('consent', true);
    blankDetails();
  }
  function writeConsentLabel() {
    var nodes = document.querySelectorAll('.ll-quiz-block--checkbox-field .ll-quiz-block-checkbox-label');
    for (var i = 0; i < nodes.length; i++) nodes[i].innerHTML = '<p>' + consentHTML() + '</p>';
  }

  function waitForStep() {
    return new Promise(function (resolve) {
      var done = false;
      function finish(name) {
        if (done) return;
        done = true;
        window.removeEventListener('ll-quiz-step-view', onView);
        resolve(name || currentStepName());
      }
      function onView(e) {
        var d = e.detail || {};
        finish(d.stepName || currentStepName());
      }
      window.addEventListener('ll-quiz-step-view', onView);
      setTimeout(function () { finish(currentStepName()); }, 2500);
    });
  }
  function clickInActive(sel) {
    var step = document.querySelector('.ll-quiz-step[data-active-step="true"]');
    var btn = step && step.querySelector(sel);
    if (!btn) return false;
    btn.click();
    return true;
  }
  function skipDetailsForward(name) {
    var guard = 0;
    function loop(current) {
      if (current !== STEP.details || guard++ > 3) return Promise.resolve(current);
      blankDetails();
      var p = waitForStep();
      if (!clickInActive('.ll-quiz-continue-button')) return Promise.resolve(currentStepName());
      return p.then(loop);
    }
    return loop(name);
  }
  function forward() {
    var p = waitForStep();
    if (!clickInActive('.ll-quiz-continue-button')) return Promise.resolve(currentStepName());
    return p.then(skipDetailsForward);
  }
  function backAcrossDetails(name) {
    var guard = 0;
    function loop(current) {
      if (current !== STEP.details || guard++ > 3) return Promise.resolve(current);
      var p = waitForStep();
      if (!clickInActive('.ll-quiz-previous-button')) return Promise.resolve(currentStepName());
      return p.then(loop);
    }
    return loop(name);
  }
  function backBuilder() {
    var p = waitForStep();
    if (!clickInActive('.ll-quiz-previous-button')) return Promise.resolve(currentStepName());
    return p.then(backAcrossDetails);
  }
  function forceNQ() {
    if (currentStepName() === STEP.nq) return Promise.resolve(STEP.nq);
    var p = waitForStep();
    var id = stepIdByName(STEP.nq);
    try {
      if (api.navigation && api.navigation.host && id) api.navigation.host.goToStep(id);
      else api.navigation.goToStep(STEP.nq);
    } catch (e) {}
    return p;
  }
  function fieldErrors() {
    var out = [];
    try {
      var blocks = api.getCurrentStepBlocks() || [];
      for (var i = 0; i < blocks.length; i++) {
        var errs = blocks[i].getErrors ? blocks[i].getErrors() : [];
        if (errs && errs.length) out.push((blocks[i].variableName || 'field') + ': ' + errs[0]);
      }
    } catch (e) {}
    return out;
  }

  function setBar(p) {
    var pct = document.getElementById('pls-pct');
    var fill = document.getElementById('pls-fill');
    if (pct) pct.textContent = p + '%';
    if (fill) fill.style.width = p + '%';
  }
  function tyHTML() {
    return '<h2 class="pls-q">You\'re all set, ' + esc(answers.first_name || '') + '. Your info has been received.</h2>' +
      '<p class="pls-body"><strong>Watch for a phone call shortly.</strong> The intake team at Lawyers for Employee and Consumer Rights APC will call to go over your answers and tell you if you may have a case. Keep your phone close and pick up when they call.</p>';
  }
  function nqHTML() {
    return '<h2 class="pls-q pls-q-sm">Thanks for sharing. Based on your answers, this inquiry may not fit the Firm\'s current intake criteria.</h2>' +
      '<p class="pls-body">Based on what you shared, this campaign can\'t take your inquiry. That does not mean you don\'t have a claim, and it is not legal advice about your situation.</p>' +
      '<p class="pls-body">You may wish to speak with another attorney, or find a State Bar-certified lawyer referral service through the State Bar of California.</p>' +
      '<p class="pls-body">Deadlines may apply to legal claims, so don\'t wait to get advice.</p>' +
      '<button type="button" class="pls-back" id="pls-change">Change my last answer</button>';
  }
  function render() {
    if (!app) return;
    var steps = visibleSteps(answers);
    if (cur < 0) cur = 0;
    if (cur > steps.length - 1) cur = steps.length - 1;
    var s = steps[cur];
    document.body.dataset.step = mode === 'ask' || mode === 'sending' ? s.id : mode;
    if (s && (s.id === 'ca' || s.id === 'age')) setVisible('age_18_plus', true);
    if (mode === 'ty') { setBar(100); app.innerHTML = tyHTML(); window.scrollTo(0, 0); return; }
    if (mode === 'nq') {
      app.innerHTML = nqHTML();
      var ch = document.getElementById('pls-change');
      if (ch) ch.addEventListener('click', changeAnswer);
      window.scrollTo(0, 0);
      return;
    }
    setBar(percent(cur, answers));
    var h = '<h2 class="pls-q">' + esc(s.q) + '</h2>' + (s.hint ? '<p class="pls-hint">' + esc(s.hint) + '</p>' : '');
    if (s.choices) {
      h += '<div class="pls-choices' + (s.choices.length === 2 ? ' pls-yn' : '') + '">';
      s.choices.forEach(function (c, i) {
        h += '<button type="button" class="pls-choice' + (answers[s.field] === c[1] ? ' is-on' : '') + '" data-i="' + i + '">' + esc(c[0]) + '</button>';
      });
      h += '</div>';
    } else {
      var sending = mode === 'sending';
      h += '<form class="pls-form" novalidate><input class="pls-input" id="pls-in" name="' + esc(s.field) + '" type="' + s.input + '" autocomplete="' + s.autocomplete + '"' +
        (s.input === 'tel' ? ' inputmode="tel"' : '') + ' placeholder="' + esc(s.placeholder) + '" value="' + esc(answers[s.field] || '') + '"' +
        (sending ? ' disabled' : '') + '><p class="pls-err" id="pls-err" role="alert">' + esc(sendError || '') + '</p>';
      if (s.consent) {
        h += '<label class="pls-consent"><input type="checkbox" id="pls-consent" required' + (answers.consent ? ' checked' : '') + (sending ? ' disabled' : '') + '><span>' + consentHTML() + '</span></label>' +
          '<p class="pls-privacy">Privacy notice: We collect your name, contact information, and answers about your employment situation to send your inquiry to Lawyers for Employee and Consumer Rights APC. We do not sell or share your personal information. See our <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Privacy Policy</a> for details and your California privacy rights.</p>';
      }
      h += '<button type="submit" class="pls-next"' + (sending ? ' disabled' : '') + '>' + esc(sending ? 'Sending\u2026' : (s.button || 'Continue')) + '</button></form>';
    }
    if (cur > 0 && mode === 'ask') h += '<button type="button" class="pls-back">Back</button>';
    app.innerHTML = h;
    if (s.choices) {
      var buttons = app.querySelectorAll('.pls-choice');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function (ev) {
          var btn = ev.currentTarget;
          choose(s, s.choices[+btn.getAttribute('data-i')][1], btn);
        });
      }
    } else if (mode === 'ask') {
      var form = app.querySelector('form');
      var input = document.getElementById('pls-in');
      form.addEventListener('submit', function (e) { e.preventDefault(); nextInput(s, input.value); });
      if (!('ontouchstart' in window)) { try { input.focus(); } catch (e) {} }
    }
    var bk = app.querySelector('.pls-back');
    if (bk) bk.addEventListener('click', back);
    window.scrollTo(0, 0);
  }

  function choose(screen, value, btn) {
    if (lock || mode !== 'ask') return;
    var all = app.querySelectorAll('.pls-choice');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-on');
    if (btn) btn.classList.add('is-on');
    answers[screen.field] = value;
    var dq = isDQ(screen, value);
    lock = true;
    setTimeout(function () {
      Promise.resolve(commitChoice(screen, value, dq)).then(function () { lock = false; }, function () { lock = false; });
    }, 220);
  }
  function commitChoice(screen, value, dq) {
    applyAnswer(screen);
    if (dq) {
      if (screen.id === 'ca') setVisible('age_18_plus', false);
      return forward().then(function (name) {
        if (name !== STEP.nq) return forceNQ();
        return name;
      }).then(function () { mode = 'nq'; render(); });
    }
    if (screen.id === 'pay' && value === '__1099__') { history.push(cur); cur++; render(); return; }
    if (screen.id === 'lawyer' && value === 'no') { history.push(cur); cur++; render(); return; }
    if (screen.id === 'ca' && value === 'yes') { setVisible('age_18_plus', true); history.push(cur); cur++; render(); return; }
    return forward().then(function (name) {
      if (name === STEP.nq) { mode = 'nq'; render(); return; }
      if (name && builderStep(visibleSteps(answers)[Math.min(cur + 1, visibleSteps(answers).length - 1)].id) &&
          name !== currentStepName()) {
        /* already moved */
      }
      var errs = fieldErrors();
      if (errs.length && currentStepName() !== stepNameForBlock(BLOCK_OF[visibleSteps(answers)[cur].id] || '')) {
        sendError = errs[0];
      }
      history.push(cur);
      cur++;
      render();
    });
  }
  function nextInput(screen, raw) {
    if (lock || mode !== 'ask') return;
    var err = validate(screen, raw);
    var box = document.getElementById('pls-consent');
    if (!err && screen.consent && (!box || !box.checked)) err = 'Please check the box to submit your information to the Firm.';
    sendError = '';
    var errEl = document.getElementById('pls-err');
    if (err) { if (errEl) errEl.textContent = err; return; }
    answers[screen.field] = String(raw || '').trim();
    if (screen.id === 'phone') {
      lock = true;
      ensurePhone(answers.phone).then(function (ok) {
        lock = false;
        if (!ok) {
          var errEl = document.getElementById('pls-err');
          if (errEl) errEl.textContent = 'Please enter a valid 10-digit U.S. phone number.';
          return;
        }
        history.push(cur);
        cur++;
        render();
      });
      return;
    }
    applyAnswer(screen);
    if (screen.consent) {
      answers.consent = true;
      doSubmit();
      return;
    }
    history.push(cur);
    cur++;
    render();
  }
  function back() {
    if (lock || !history.length || mode !== 'ask') return;
    var stepsNow = visibleSteps(answers);
    var fromId = stepsNow[cur] && stepsNow[cur].id;
    var prevIdx = history[history.length - 1];
    var prevId = stepsNow[prevIdx] && stepsNow[prevIdx].id;
    history.pop();
    cur = prevIdx;
    sendError = '';
    if (builderStep(fromId) && builderStep(prevId) && builderStep(fromId) !== builderStep(prevId)) {
      lock = true;
      backBuilder().then(function () { lock = false; render(); }, function () { lock = false; render(); });
      return;
    }
    render();
  }
  function changeAnswer() {
    if (lock) return;
    lock = true;
    mode = 'ask';
    backBuilder().then(function () {
      setVisible('age_18_plus', true);
      lock = false;
      render();
    }, function () { lock = false; render(); });
  }
  function saveOk(resp) {
    if (resp == null) return false;
    if (typeof resp === 'object') {
      if (resp.success === false || resp.ok === false) return false;
      if (resp.error && resp.success !== true) return false;
    }
    return true;
  }
  function waitSubmit() {
    return new Promise(function (resolve) {
      var done = false;
      function finish(v) {
        if (done) return;
        done = true;
        window.removeEventListener('ll-quiz-submit', onSubmit);
        resolve(v);
      }
      function onSubmit(e) { finish(e.detail && e.detail.response); }
      window.addEventListener('ll-quiz-submit', onSubmit);
      setTimeout(function () { finish(null); }, 20000);
    });
  }
  function clearSubmittedFlag() {
    try {
      var id = api.getInfo().quizId;
      var raw = JSON.parse(window.localStorage.getItem('quiz-' + id) || '{}');
      delete raw.submitted;
      window.localStorage.setItem('quiz-' + id, JSON.stringify(raw));
    } catch (e) {}
  }
  function doSubmit() {
    lock = true;
    mode = 'sending';
    sendError = '';
    render();
    ensurePhone(answers.phone || '').then(function () {
    applyContact();
    var pending = waitSubmit();
    var clicked = clickInActive('.ll-quiz-submit-button');
    if (!clicked) {
      lock = false;
      mode = 'ask';
      sendError = 'The form could not be sent. Please try again.';
      render();
      return;
    }
    pending.then(function (resp) {
      if (saveOk(resp)) {
        mode = 'ty';
        lock = false;
        render();
        return;
      }
      // Validation refused the click, or the lead API failed. LanderLab still jumps to thank-you
      // after a failed save (the submit block's next action). Put the visitor back on the email step.
      var backToEmail = currentStepName() === STEP.ty ? forceGo(STEP.contact) : Promise.resolve(currentStepName());
      backToEmail.then(function () {
        clearSubmittedFlag();
        try { if (api.navigation.host && api.navigation.host.localStorage) { /* flag already cleared */ } } catch (e) {}
        applyContact();
        mode = 'ask';
        lock = false;
        sendError = currentStepName() === STEP.contact && fieldErrors().length
          ? fieldErrors()[0]
          : 'Sorry \u2014 we couldn\u2019t send your information. Please press See If I Have a Case to try again.';
        // Land on the email screen even if the index drifted.
        var steps = visibleSteps(answers);
        for (var i = 0; i < steps.length; i++) if (steps[i].id === 'email') cur = i;
        render();
      });
    });
    });
  }
  function forceGo(name) {
    if (currentStepName() === name) return Promise.resolve(name);
    var p = waitForStep();
    var id = stepIdByName(name);
    try {
      if (api.navigation && api.navigation.host && id) api.navigation.host.goToStep(id);
      else api.navigation.goToStep(name);
    } catch (e) {}
    return p;
  }

  function ensureChrome() {
    if (!document.getElementById('mer-top')) {
      var header = document.createElement('header');
      header.id = 'mer-top';
      header.innerHTML = '<div class="mer-strip">Attorney advertising<span class="mer-dot">·</span>Paid ad for Lawyers for Employee and Consumer Rights APC, Burbank, CA<span class="mer-dot">·</span>(323)&nbsp;375&#8209;5101</div>' +
        '<div class="mer-brand"><div class="mer-brand-inner"><img src="' + LOGO_URL + '" alt="My Employee Rights" width="600" height="96"></div></div>' +
        '<section class="mer-hero"><h1>Treated unfairly at work in California?</h1><p class="mer-sub">See if you qualify for a free case review.</p></section>';
      document.body.insertBefore(header, document.body.firstChild);
    }
    var brand = document.querySelector('.mer-brand-inner') || document.querySelector('.mer-brand');
    if (brand && !brand.querySelector('a[href^="tel:"]')) {
      var a = document.createElement('a');
      a.className = 'mer-call';
      a.href = 'tel:+13233755101';
      a.textContent = '(323) 375-5101';
      brand.appendChild(a);
    }
  }
  function ensureShell() {
    if (document.getElementById('pls-app')) {
      app = document.getElementById('pls-app');
      return;
    }
    ensureChrome();
    var style = document.createElement('style');
    style.id = 'pls-v2-css';
    style.textContent = CSS;
    document.head.appendChild(style);
    document.body.classList.add('pls-v2');
    var root = document.createElement('main');
    root.className = 'pls-wrap';
    root.innerHTML = '<div class="pls-card"><div class="pls-bar-top"><span class="pls-pct" id="pls-pct">0%</span><span class="pls-pct-l">complete</span></div>' +
      '<div class="pls-track"><div class="pls-fill" id="pls-fill"></div></div><div id="pls-app"></div></div>' +
      '<ul class="pls-trust"><li>Free case review</li><li>No obligation</li><li>Never shared with other law firms</li></ul>';
    var quiz = document.querySelector('.ll-quiz');
    if (quiz && quiz.parentNode) quiz.parentNode.insertBefore(root, quiz);
    else document.body.appendChild(root);
    app = document.getElementById('pls-app');
  }

  function start(q) {
    if (!CONFIG.enabled || window.__plsV2Started) return;
    window.__plsV2Started = true;
    api = q;
    mapSteps();
    ensureSituationOption();
    writeConsentLabel();
    ensureShell();
    // If a republish ever opens on a later step, start the visitor on the first question.
    try {
      if (currentStepName() && currentStepName() !== stepNameForBlock('claim_type') && stepIdByName(stepNameForBlock('claim_type'))) {
        api.navigation.host.goToStep(stepIdByName(stepNameForBlock('claim_type')));
      }
    } catch (e) {}
    mode = 'ask';
    cur = 0;
    history = [];
    answers = {};
    render();
    window.PLS_V2.api = api;
    window.PLS_V2.answers = answers;
  }

  window.PLS_V2 = {
    CONFIG: CONFIG,
    CONSENT_TEXT: CONSENT_TEXT,
    STEPS: STEPS,
    validate: validate,
    visibleSteps: visibleSteps,
    isDQ: isDQ,
    percent: percent,
    phoneDigits: phoneDigits
  };

  window.addEventListener('ll-quiz-init', function (e) {
    var q = e.detail && e.detail.llQuizApi;
    if (!q || q.__plsStamped) return;
    q.__plsStamped = true;
    stampLead(q);
    if (!CONFIG.enabled) return;
    start(q);
  });
})(window, document);
