/* Lemon Repair Check WA lemon quiz Custom Code lrc-wa-v1.0.
 * PASTE INTO: LanderLab Quiz builder > Settings > Custom Code / JavaScript.
 * Raw JavaScript. LanderLab runs this with Function(code)(). Do not wrap it in HTML tags.
 * It sends nothing. LanderLab's webhook delivers the lead. Nothing is written to the console.
 * Every handler is wrapped in try/catch so a bug here cannot block LanderLab submit.
 * Rollback the firm-site UI with CONFIG.site.on = false (native builder look).
 */
(function (factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { try { window.__brdLrcApi = api; } catch (e) {} }
  if (typeof window !== 'undefined' && window.document && !window.BRD_WA_NO_AUTO) { try { api.install(window); } catch (e2) {} }
})(function () {
  'use strict';

  var CONFIG = {
    brand: 'Lemon Repair Check',
    domain: 'lemonrepaircheck.com',
    pageVersion: 'lrc-wa-v1.0',
    funnel: 'wa-lemon-quiz',
    campaignDefault: 'BRD-WA-LEMON-PILOT',
    state: 'WA',
    buyer: 'Prestige Legal Solutions, P.C.',
    consentVersion: 'wa-lemon-c2',
    zipMin: 98001, zipMax: 99403,
    steps: { form: 'q14-contact', success: 'thank-you', dq: 'not-qualified' },
    submitBlock: 'submit',
    consentBlock: 'consent_checked',
    site: {
      on: true,
      /* Swap the header logo by editing this one URL. Empty falls back to an inline mark. */
      logoUrl: 'assets/lemon-repair-check_logo-horizontal_color.svg',
      faviconUrl: 'assets/favicon.svg',
      heroImg: '',
      privacyUrl: 'https://lemonrepaircheck.com/privacy'
    }
  };

  function expectedConsent(cfg) {
    cfg = cfg || CONFIG;
    return 'By checking this box and clicking "Submit," I give my express written consent for ' + cfg.buyer +
      ' to contact me about my vehicle warranty and lemon law inquiry by calls, text messages, and emails at the phone number and email address I provided,' +
      ' including calls and texts that may use an automatic telephone dialing system, an artificial or prerecorded voice, or an AI-generated voice,' +
      ' even if my number is on a state or federal Do-Not-Call list. My consent is not a condition of hiring a lawyer or purchasing anything.' +
      ' Message frequency varies. Message and data rates may apply.' +
      ' I can opt out at any time by replying STOP to any text or by telling the caller, and I can reply HELP for help. I have read the Privacy Policy.';
  }

  var TEXT = {
    consentHint: 'Please check the box to continue.',
    zipHint: 'Please enter a Washington ZIP code to continue.',
    phoneHint: 'Please enter a valid 10-digit U.S. mobile number.',
    zipPrompt: 'That ZIP doesn\u2019t look like Washington. This service is only for vehicles and owners in Washington.',
    fixZip: 'Fix my ZIP',
    notWa: 'I don\u2019t live in Washington',
    thanksNotOk: 'Thanks. We can\u2019t send your information to anyone unless you agree to be contacted.'
  };

  var DQ_RULES = [
    ['purchase_state_wa', 'no', 'out_of_state_purchase'],
    ['warranty_status', 'no', 'no_warranty_repair'],
    ['warranty_status', 'unsure', 'warranty_unsure'],
    ['repair_visits', '0', 'under_2_visits'],
    ['repair_visits', '1', 'under_2_visits'],
    ['defect_unresolved', 'no', 'defect_fixed'],
    ['repair_docs', 'no', 'no_repair_docs'],
    ['represented', 'yes', 'already_represented'],
    ['age_18_plus', 'no', 'under_18'],
    ['zip_state', 'non_WA', 'non_wa_zip']
  ];
  var ANSWER_KEYS = ['purchase_state_wa', 'acquisition_type', 'purchase_type', 'vehicle_year', 'vehicle_year_older', 'vehicle_make',
    'vehicle_make_other', 'vehicle_model', 'warranty_status', 'repair_visits', 'defect_category', 'defect_description',
    'defect_unresolved', 'repair_docs', 'represented', 'age_18_plus'];
  var CONTACT_KEYS = ['first_name', 'last_name', 'phone', 'email', 'zip'];
  var OWNED = ['lead_id', 'page_version', 'funnel', 'state', 'buyer', 'landing_page', 'started_at', 'time_zone', 'zip_state',
    'zip_mismatch_seen', 'phone_10', 'consent_text', 'consent_version', 'consent_hash', 'consent_checked_at', 'route_status',
    'dq_reason', 'lead_summary', 'is_test'];
  var TRACKING = ['campaign_id', 'adset_id', 'ad_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var VALID = {
    purchase_state_wa: ['yes'], purchase_type: ['new', 'used', 'cpo'],
    warranty_status: ['yes'], repair_visits: ['2', '3', '4plus'], defect_unresolved: ['yes', 'unsure'],
    repair_docs: ['yes', 'can_get'], represented: ['no'], age_18_plus: ['yes']
  };

  /* Paid-for-repairs token -> warranty_status option value. none and some both qualify. */
  var PAID_MAP = { none: 'yes', some: 'yes', yes: 'no' };
  /* Single-select groups -> defect_category option values (comma + space). */
  var DEFECT_MAP = {
    engine_or_transmission: 'engine, transmission',
    electrical_battery_or_charging: 'electrical_battery, ev_battery_charging',
    brakes_steering_or_safety: 'brakes, steering_suspension, airbags_safety',
    something_else: 'something_else'
  };
  var YEARS = ['2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015_or_older'];
  var MAKES = ['BMW', 'Chevrolet', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Jeep', 'Kia', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Ram', 'Rivian', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'other'];
  var CHECKLIST = [
    { n: 'Purchase price', at: 1 },
    { n: 'Taxes, license and registration fees', at: 3 },
    { n: 'Certain incidental costs', at: 5 },
    { n: 'Minus an allowance for your use of the vehicle', at: 7 }
  ];
  var FLOW = [
    { n: 1, host: 'q1-state', q: 'Where did you buy or lease your vehicle?', block: 'purchase_state_wa', answers: [
      { t: 'In Washington', v: 'yes' },
      { t: 'In another state', v: 'no', dq: 1 }
    ]},
    { n: 2, host: 'q2-acquire', kind: 'zip', q: 'What\'s your ZIP code?' },
    { n: 3, host: 'q3-condition', q: 'Was it new or used?', block: 'purchase_type', answers: [
      { t: 'New', v: 'new' },
      { t: 'Used', v: 'used' },
      { t: 'Certified pre-owned', v: 'cpo' }
    ]},
    { n: 4, host: 'q4-year', kind: 'vehicle', q: 'Tell us about your vehicle', years: YEARS, makes: MAKES },
    { n: 5, host: 'q9-defect', q: 'What\'s been going wrong?', block: 'defect_category', answers: [
      { t: 'Engine or transmission', v: DEFECT_MAP.engine_or_transmission, icon: 'engine' },
      { t: 'Electrical, battery or charging', v: DEFECT_MAP.electrical_battery_or_charging, icon: 'bolt' },
      { t: 'Brakes, steering or safety', v: DEFECT_MAP.brakes_steering_or_safety, icon: 'wheel' },
      { t: 'Something else', v: DEFECT_MAP.something_else, icon: 'dots' }
    ]},
    { n: 6, host: 'q8-visits', q: 'How many times has the dealer tried to fix it?', block: 'repair_visits', answers: [
      { t: 'None yet', v: '0', dq: 1 },
      { t: 'Once', v: '1', dq: 1 },
      { t: '2 times', v: '2' },
      { t: '3 times', v: '3' },
      { t: '4 or more', v: '4plus' }
    ]},
    { n: 7, host: 'q7-warranty', kind: 'paid', q: 'Did you pay for the repairs?', help: 'Factory warranty, not an extended service contract.', block: 'warranty_status', answers: [
      { t: 'No, it was under warranty', v: 'yes', paid: 'none' },
      { t: 'Some of them', v: 'yes', paid: 'some' },
      { t: 'Yes, I paid', v: 'no', paid: 'yes', dq: 1 }
    ]},
    { n: 8, host: 'q10-unresolved', q: 'Was it still happening after they said they fixed it?', block: 'defect_unresolved', answers: [
      { t: 'Yes', v: 'yes' },
      { t: 'No', v: 'no', dq: 1 },
      { t: 'Not sure', v: 'unsure' }
    ]},
    { n: 9, host: 'q11-docs', q: 'Do you have your repair orders?', block: 'repair_docs', answers: [
      { t: 'Yes', v: 'yes' },
      { t: 'I can get them', v: 'can_get' },
      { t: 'No', v: 'no', dq: 1 }
    ]},
    { n: 10, host: 'q12-lawyer', q: 'Already have a lawyer for this?', block: 'represented', answers: [
      { t: 'No', v: 'no' },
      { t: 'Yes', v: 'yes', dq: 1 }
    ]},
    { n: 11, host: 'q13-age', q: 'Are you 18 or older?', block: 'age_18_plus', answers: [
      { t: 'Yes', v: 'yes' },
      { t: 'No', v: 'no', dq: 1 }
    ]},
    { n: 12, host: 'q14-contact', kind: 'contact', field: 'first_name', q: 'What\'s your first name?' },
    { n: 13, host: 'q14-contact', kind: 'contact', field: 'last_name', q: 'And your last name?' },
    { n: 14, host: 'q14-contact', kind: 'contact', field: 'phone', q: 'Best phone number to reach you?' },
    { n: 15, host: 'q14-contact', kind: 'contact', field: 'email', q: 'What\'s your email?' }
  ];

  var repairPaidMemo = '';

  function str(v) { return v == null ? '' : String(v); }
  function trim(v) { return str(v).replace(/\s+/g, ' ').trim(); }
  function low(v) { return trim(v).toLowerCase(); }

  function repairPaid() {
    if (repairPaidMemo === 'none' || repairPaidMemo === 'some' || repairPaidMemo === 'yes') return repairPaidMemo;
    try {
      if (typeof sessionStorage !== 'undefined') {
        var s = sessionStorage.getItem('lrc_repair_paid');
        if (s === 'none' || s === 'some' || s === 'yes') { repairPaidMemo = s; return s; }
      }
    } catch (e) {}
    return '';
  }
  function setRepairPaid(v) {
    repairPaidMemo = (v === 'none' || v === 'some' || v === 'yes') ? v : '';
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('lrc_repair_paid', repairPaidMemo);
    } catch (e) {}
    return repairPaidMemo;
  }

  function zipState(z) {
    z = trim(z);
    if (z === '') return '';
    if (!/^\d{5}$/.test(z)) return 'invalid';
    var n = parseInt(z, 10);
    return (n >= CONFIG.zipMin && n <= CONFIG.zipMax) ? 'WA' : 'non_WA';
  }
  function phoneDigits(s) {
    var d = str(s).replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    return d;
  }
  function validPhone(s) {
    var d = phoneDigits(s);
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return false;
    if (/^(\d)\1{9}$/.test(d)) return false;
    if (d.slice(3, 6) === '555' && d.slice(6, 8) === '01') return false;
    return true;
  }
  function validEmail(s) { return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(trim(s)); }
  function validOlderYear(s) { return /^(199\d|200\d|201[0-5])$/.test(trim(s)); }
  function validName(s) {
    var t = trim(s);
    var letters = t.replace(/[^A-Za-z]/g, '');
    return letters.length >= 2;
  }
  function isChecked(v) { v = low(v); return v === 'checked' || v === 'true' || v === 'yes' || v === 'on' || v === '1'; }
  function clean(v) {
    v = trim(v);
    if (/\{\{|\}\}|%7b%7b|%7d%7d/i.test(v)) return '';
    v = v.replace(/[\u0000-\u001f\u007f<>]/g, '');
    return v.slice(0, 200);
  }
  function hasPlaceholder(s) { return /\{\{[^}]*\}\}|\[[A-Z][A-Z0-9 _-]{2,}\]/.test(str(s)); }

  function dqReason(a) {
    for (var i = 0; i < DQ_RULES.length; i++) if (low(a[DQ_RULES[i][0]]) === low(DQ_RULES[i][1])) return DQ_RULES[i][2];
    return '';
  }
  function missing(a) {
    var m = [];
    for (var k in VALID) if (VALID[k].indexOf(low(a[k])) < 0) m.push(k);
    var y = low(a.vehicle_year);
    if (y === '2015_or_older') { if (!validOlderYear(a.vehicle_year_older)) m.push('vehicle_year_older'); }
    else if (!/^20(1[6-9]|2[0-7])$/.test(y)) m.push('vehicle_year');
    if (!trim(a.vehicle_make)) m.push('vehicle_make');
    else if (low(a.vehicle_make) === 'other' && !trim(a.vehicle_make_other)) m.push('vehicle_make_other');
    var mdl = trim(a.vehicle_model); if (!mdl || mdl.length > 40) m.push('vehicle_model');
    if (!trim(a.first_name)) m.push('first_name');
    if (!trim(a.last_name)) m.push('last_name');
    if (!validPhone(a.phone)) m.push('phone');
    if (!validEmail(a.email)) m.push('email');
    if (zipState(a.zip) !== 'WA') m.push('zip');
    return m;
  }
  function routeStatus(a, consent) {
    var r = dqReason(a);
    if (r) return { status: 'dq', reason: r };
    if (missing(a).length) return { status: 'incomplete', reason: '' };
    if (!consent.checked) return { status: 'no_consent', reason: '' };
    if (!consent.match) return { status: 'hold_consent_mismatch', reason: '' };
    return { status: 'ok', reason: '' };
  }

  var LABELS = {
    acquisition_type: { purchased: 'Bought', leased: 'Leased' },
    purchase_type: { 'new': 'New', used: 'Used', cpo: 'CPO' },
    defect_category: { engine: 'Engine', transmission: 'Transmission', electrical_battery: 'Electrical / battery',
      ev_battery_charging: 'EV battery or charging', brakes: 'Brakes', steering_suspension: 'Steering or suspension',
      airbags_safety: 'Air bags / safety systems', screens_infotainment: 'Screens, cameras or infotainment',
      leaks_water: 'Leaks or water', something_else: 'Something else' }
  };
  function lbl(k, v) { var m = LABELS[k] || {}; return m[low(v)] || trim(v); }
  function summary(a) {
    var year = low(a.vehicle_year) === '2015_or_older' ? trim(a.vehicle_year_older) || '2015 or older' : trim(a.vehicle_year);
    var make = low(a.vehicle_make) === 'other' ? trim(a.vehicle_make_other) || 'Other make' : trim(a.vehicle_make);
    var vehicle = [year, make, trim(a.vehicle_model)].filter(Boolean).join(' ');
    var defects = str(a.defect_category).split(/[,|;]+/).map(function (x) { return lbl('defect_category', x); }).filter(Boolean).join(', ');
    var parts = [];
    function add(label, v) { if (trim(v)) parts.push(label ? label + ': ' + trim(v) : trim(v)); }
    add('WA purchase', a.purchase_state_wa);
    add('', a.acquisition_type ? lbl('acquisition_type', a.acquisition_type) : '');
    add('', a.purchase_type ? lbl('purchase_type', a.purchase_type) : '');
    add('', vehicle);
    add('Warranty repair', a.warranty_status);
    add('Paid for repairs', repairPaid());
    add('Visits', a.repair_visits);
    add('Still happening', a.defect_unresolved);
    add('Docs', a.repair_docs);
    add('Represented', a.represented);
    add('18+', a.age_18_plus);
    add('Defects', defects);
    return parts.join(' | ').slice(0, 1000);
  }
  function isTest(params, a) {
    if (params && (params.get('test') === '1')) return true;
    var n = (str(a.first_name) + ' ' + str(a.last_name)).toLowerCase().replace(/[^a-z]/g, '');
    return n.indexOf('zztest') >= 0;
  }

  function pct(i) { return Math.round((Number(i) - 1) / 15 * 100); }
  function unlockedItems(answeredCount) {
    var n = Number(answeredCount) || 0;
    var out = [], i;
    for (i = 0; i < CHECKLIST.length; i++) if (n >= CHECKLIST[i].at) out.push(CHECKLIST[i]);
    return out;
  }

  function sha256(ascii) {
    function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
    var bytes = [], i, j, s = unescape(encodeURIComponent(str(ascii)));
    for (i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
    var K = [], H = [], primes = 0, cand = 2;
    while (primes < 64) {
      var isP = true; for (j = 2; j * j <= cand; j++) if (cand % j === 0) { isP = false; break; }
      if (isP) { if (primes < 8) H[primes] = (Math.pow(cand, 1 / 2) * 4294967296) | 0; K[primes] = (Math.pow(cand, 1 / 3) * 4294967296) | 0; primes++; }
      cand++;
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    for (i = 0; i < bytes.length; i += 64) {
      var w = [], a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        if (j < 16) w[j] = (bytes[i + j * 4] << 24) | (bytes[i + j * 4 + 1] << 16) | (bytes[i + j * 4 + 2] << 8) | bytes[i + j * 4 + 3];
        else {
          var x = w[j - 15], y = w[j - 2];
          w[j] = (w[j - 16] + (rr(x, 7) ^ rr(x, 18) ^ (x >>> 3)) + w[j - 7] + (rr(y, 17) ^ rr(y, 19) ^ (y >>> 10))) | 0;
        }
        var t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0;
        var t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = ''; for (i = 0; i < 8; i++) out += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
    return out;
  }

  var CSS = '.brd-zip-prompt{margin:8px 0 4px;padding:12px 14px;border:1px solid #f0c36d;background:#fff7e6;border-radius:10px;font-size:15px;line-height:1.4;color:#1F2B33}' +
    '.brd-zip-prompt button{min-height:52px;margin:10px 10px 0 0;padding:10px 14px;border-radius:10px;border:1px solid #c9ced8;background:#fff;font-size:15px;cursor:pointer}' +
    '.brd-gate-hint{margin:6px 0 0;font-size:14px;color:#3E4C57;text-align:center}' +
    '.brd-gated{opacity:.55;cursor:not-allowed}';

  function install(win, cfg) {
    cfg = cfg || CONFIG;
    if (win.__brdWaQuiz) return win.__brdWaQuiz;
    var doc = win.document, q = null, busy = false, lastSubmit = null, gateReasons = [], fixed = {};
    var params = null; try { params = new win.URLSearchParams(win.location.search); } catch (e) { params = { get: function () { return null; } }; }

    function blk(name) { try { return q ? q.getBlock(name) : null; } catch (e) { return null; } }
    function get(name) { var b = blk(name); if (!b) return ''; try { var v = b.getValue(); return v == null ? '' : String(v); } catch (e) { return ''; } }
    function set(name, v) { var b = blk(name); if (!b) return; v = v == null ? '' : String(v); try { if (str(b.getValue()) !== v) b.setValue(v); } catch (e) {} }
    function el(name) { var b = blk(name); try { return b ? doc.getElementById(b.blockID) : null; } catch (e) { return null; } }
    function answers() { var a = {}; ANSWER_KEYS.concat(CONTACT_KEYS).forEach(function (k) { a[k] = get(k); }); a.zip_state = zipState(a.zip); return a; }
    function uuid() {
      try { if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID(); } catch (e) {}
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    }

    function consentLabelEl() { var e = el(cfg.consentBlock); return e ? (e.querySelector('.ll-quiz-block-checkbox-label') || e.querySelector('label')) : null; }
    function renderedConsent() {
      var l = consentLabelEl(); if (l) return trim(l.textContent);
      var b = blk(cfg.consentBlock); if (!b) return '';
      try { var t = doc.createElement('div'); t.innerHTML = b.getLabel(); return trim(t.textContent); } catch (e) { return ''; }
    }
    function consentState() {
      var text = renderedConsent();
      return { text: text, checked: isChecked(get(cfg.consentBlock)), match: !!text && text === trim(expectedConsent(cfg)) };
    }

    function refresh() {
      if (!q || busy) return;
      busy = true;
      try {
        applyFixed();
        if (cfg.site && cfg.site.on) {
          set('acquisition_type', '');
          set('defect_description', '');
        }
        var a = answers(), c = consentState();
        set('page_version', cfg.pageVersion); set('funnel', cfg.funnel); set('state', cfg.state); set('buyer', cfg.buyer);
        set('zip_state', a.zip_state);
        if (a.zip_state === 'non_WA') set('zip_mismatch_seen', 'yes');
        else if (get('zip_mismatch_seen') !== 'yes') set('zip_mismatch_seen', 'no');
        set('phone_10', phoneDigits(a.phone).length === 10 ? phoneDigits(a.phone) : '');
        set('consent_text', c.text);
        set('consent_hash', c.text ? sha256(c.text) : '');
        set('consent_version', c.match ? cfg.consentVersion : (c.text ? cfg.consentVersion + '-mismatch' : ''));
        if (!c.checked) set('consent_checked_at', '');
        else if (!get('consent_checked_at')) set('consent_checked_at', new Date().toISOString());
        var r = routeStatus(a, c);
        set('route_status', r.status); set('dq_reason', r.reason);
        set('lead_summary', summary(a));
        set('is_test', isTest(params, a) ? 'yes' : 'no');
        gate(a, c);
      } catch (e) {} finally { busy = false; }
    }

    function submitBtn() { var e = el(cfg.submitBlock); return e ? e.querySelector('.ll-quiz-submit-button') : null; }
    function gate(a, c) {
      var reasons = [];
      if (!c.checked && blk(cfg.consentBlock)) reasons.push(TEXT.consentHint);
      if (a.zip_state === 'non_WA') reasons.push(TEXT.zipHint);
      if (trim(a.phone) && !validPhone(a.phone)) reasons.push(TEXT.phoneHint);
      gateReasons = reasons;
      var btn = submitBtn(), wrap = el(cfg.submitBlock);
      if (btn) {
        if (reasons.length) {
          if (!btn.hasAttribute('disabled')) { btn.setAttribute('disabled', 'true'); btn.setAttribute('data-brd-disabled', '1'); }
          btn.setAttribute('aria-disabled', 'true'); btn.classList.add('brd-gated');
        } else if (btn.getAttribute('data-brd-disabled') === '1') {
          btn.removeAttribute('disabled'); btn.removeAttribute('data-brd-disabled'); btn.removeAttribute('aria-disabled'); btn.classList.remove('brd-gated');
        }
        try { btn.setAttribute('data-tf-element-role', 'submit'); } catch (e) {}
      }
      if (wrap && wrap.parentNode) {
        var hint = doc.getElementById('brd-gate-hint');
        if (!hint) { hint = doc.createElement('p'); hint.id = 'brd-gate-hint'; hint.className = 'brd-gate-hint'; hint.setAttribute('aria-live', 'polite'); }
        if (hint.previousSibling !== wrap) wrap.parentNode.insertBefore(hint, wrap.nextSibling);
        hint.textContent = reasons.length ? reasons[0] : '';
        hint.style.display = reasons.length ? '' : 'none';
      }
      zipPrompt(a.zip_state === 'non_WA');
    }
    function zipPrompt(show) {
      var z = el('zip'); if (!z) return;
      var box = doc.getElementById('brd-zip-prompt');
      if (!show) { if (box) box.style.display = 'none'; return; }
      if (!box) {
        box = doc.createElement('div'); box.id = 'brd-zip-prompt'; box.className = 'brd-zip-prompt'; box.setAttribute('role', 'alert');
        var p = doc.createElement('div'); p.textContent = TEXT.zipPrompt; box.appendChild(p);
        var fix = doc.createElement('button'); fix.type = 'button'; fix.id = 'brd-fix-zip'; fix.textContent = TEXT.fixZip;
        var out = doc.createElement('button'); out.type = 'button'; out.id = 'brd-not-wa'; out.textContent = TEXT.notWa;
        box.appendChild(fix); box.appendChild(out);
        z.parentNode.insertBefore(box, z.nextSibling);
        fix.addEventListener('click', function (ev) {
          try { ev.preventDefault(); var i = z.querySelector('input'); if (i) { i.focus(); if (i.select) i.select(); } } catch (e) {}
        });
        out.addEventListener('click', function (ev) {
          try {
            ev.preventDefault();
            set('zip_state', 'non_WA'); set('zip_mismatch_seen', 'yes'); set('route_status', 'dq'); set('dq_reason', 'non_wa_zip');
            q.navigation.goToStep(cfg.steps.dq);
          } catch (e) {}
        });
      }
      box.style.display = '';
    }

    function tagConsent() {
      try {
        var l = consentLabelEl(); if (!l) return;
        var wrap = el(cfg.consentBlock);
        l.setAttribute('data-tf-element-role', 'consent-language');
        var box = wrap && wrap.querySelector('input[type=checkbox]');
        if (box) box.setAttribute('data-tf-element-role', 'consent-opted-advertiser-input-1');
        if (!l.querySelector('[data-tf-element-role="consent-opted-advertiser-name-1"]')) {
          var walker = doc.createTreeWalker(l, 4, null), node;
          while ((node = walker.nextNode())) {
            var i = node.nodeValue.indexOf(cfg.buyer);
            if (i >= 0) {
              var span = doc.createElement('span'); span.setAttribute('data-tf-element-role', 'consent-opted-advertiser-name-1');
              var rest = node.splitText(i); rest.splitText(cfg.buyer.length);
              rest.parentNode.insertBefore(span, rest); span.appendChild(rest);
              break;
            }
          }
        }
      } catch (e) {}
    }

    function initFields() {
      fixed.lead_id = 'BRD-' + uuid();
      fixed.started_at = new Date().toISOString();
      var tz = ''; try { tz = win.Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      fixed.time_zone = tz;
      var lp = ''; try { lp = String(win.location.href).split('#')[0]; } catch (e) {}
      fixed.landing_page = /\{\{|\}\}|%7b%7b|%7d%7d/i.test(lp) ? lp.replace(/\{\{[^}]*\}\}|%7b%7b.*?%7d%7d/gi, '') : lp;
      fixed.landing_page = fixed.landing_page.slice(0, 2000);
      TRACKING.forEach(function (k) { fixed[k] = clean(params.get(k)); });
      if (!fixed.campaign_id) fixed.campaign_id = cfg.campaignDefault;
      fixed.click_id = clean(params.get('fbclid')) || clean(params.get('click_id'));
      fixed.source = clean(params.get('utm_source')) || 'direct';
      fixed.original_source = clean(params.get('utm_source'));
      ['zip_state', 'phone_10', 'consent_text', 'consent_version', 'consent_hash', 'consent_checked_at', 'route_status', 'dq_reason', 'lead_summary'].forEach(function (k) { set(k, ''); });
      set('zip_mismatch_seen', 'no'); set('is_test', 'no');
      resetConsent();
    }
    function applyFixed() { for (var k in fixed) if (Object.prototype.hasOwnProperty.call(fixed, k)) set(k, fixed[k]); }
    function resetConsent() {
      var cb = blk(cfg.consentBlock);
      if (!cb || !isChecked(get(cfg.consentBlock))) return;
      try { cb.reset(); } catch (e) {}
      if (isChecked(get(cfg.consentBlock))) set(cfg.consentBlock, '');
      try { var i = el(cfg.consentBlock); i = i && i.querySelector('input[type=checkbox]'); if (i) i.checked = false; } catch (e) {}
    }

    function css() {
      try { if (doc.getElementById('brd-wa-css')) return; var s = doc.createElement('style'); s.id = 'brd-wa-css'; s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s); } catch (e) {}
    }

    function on(type, fn) { win.addEventListener(type, function (e) { try { var d = (e && e.detail) || {}; if (d.llQuizApi) q = d.llQuizApi; fn(d); } catch (err) {} }); }

    on('ll-quiz-init', function () {
      css(); initFields(); tagConsent(); refresh();
      [0, 300].forEach(function (ms) { win.setTimeout(function () { try { resetConsent(); refresh(); } catch (e) {} }, ms); });
    });
    on('ll-quiz-value-change', function (d) {
      if (OWNED.indexOf(d.blockName) >= 0 || TRACKING.indexOf(d.blockName) >= 0) return;
      refresh();
    });
    on('ll-quiz-step-view', function (d) {
      if (d.stepName === cfg.steps.form) { tagConsent(); refresh(); }
      if (d.stepName === cfg.steps.success) thankYou(d.stepId);
    });
    on('ll-quiz-button-click', function () { refresh(); });
    on('ll-quiz-submit', function (d) {
      var f = d.fieldsSimple || {};
      lastSubmit = { route_status: str(f.route_status || get('route_status')), consent: isChecked(f[cfg.consentBlock] || get(cfg.consentBlock)),
        first: trim(f.first_name || get('first_name')).slice(0, 40) };
    });

    try {
      var pending = false;
      doc.addEventListener('input', function (e) {
        try {
          if (pending || !e.target || !e.target.closest || !e.target.closest('.ll-quiz')) return;
          pending = true; win.setTimeout(function () { pending = false; refresh(); }, 0);
        } catch (err) {}
      }, true);
    } catch (e) {}

    try {
      var stopKey = function (e) {
        try {
          if (e.key !== 'Enter' || !gateReasons.length || !q) return;
          if (q.getCurrentStepName && q.getCurrentStepName() !== cfg.steps.form) return;
          if (cfg.site && cfg.site.on && win.__brdLrcScreen && win.__brdLrcScreen < 15) return;
          var t = e.target;
          if (!t || !t.closest) return;
          if (t.closest('.ll-quiz') || t.closest('#lrc-card') || t.closest('#lrc-native')) { e.preventDefault(); e.stopPropagation(); }
        } catch (err) {}
      };
      doc.addEventListener('keydown', stopKey, true);
      doc.addEventListener('keypress', stopKey, true);
      doc.addEventListener('click', function (e) {
        try {
          if (!gateReasons.length) return;
          var w = el(cfg.submitBlock);
          if (w && e.target && w.contains(e.target)) { e.preventDefault(); e.stopPropagation(); }
        } catch (err) {}
      }, true);
    } catch (e) {}

    function freezeVars(step) {
      var spans = step.querySelectorAll('.ll-quiz-variable');
      for (var i = 0; i < spans.length; i++) {
        var sp = spans[i], txt = trim(sp.textContent), v = /\{\{|\}\}/.test(txt) ? '' : txt;
        if (!v && sp.getAttribute('data-variable') === 'first_name' && lastSubmit) v = lastSubmit.first;
        if (v) { sp.parentNode.replaceChild(doc.createTextNode(v), sp); continue; }
        var prev = sp.previousSibling;
        if (prev && prev.nodeType === 3) prev.nodeValue = prev.nodeValue.replace(/,\s*$/, '');
        sp.parentNode.removeChild(sp);
      }
    }
    function thankYou(stepId) {
      var step = doc.getElementById(stepId); if (!step) return;
      var run = function () {
        try {
          freezeVars(step);
          if (!lastSubmit || (lastSubmit.route_status === 'ok' && lastSubmit.consent)) return;
          var blocks = step.querySelectorAll('.ll-quiz-block');
          for (var i = 0; i < blocks.length; i++) blocks[i].style.display = 'none';
          var p = doc.getElementById('brd-thanks-fallback');
          if (!p) { p = doc.createElement('p'); p.id = 'brd-thanks-fallback'; p.style.cssText = 'text-align:center;font-size:18px;margin:24px 0'; step.appendChild(p); }
          p.textContent = TEXT.thanksNotOk;
        } catch (e) {}
      };
      run();
      [0, 50, 250, 1000].forEach(function (ms) { win.setTimeout(run, ms); });
    }

    var handle = { refresh: refresh, gateReasons: function () { return gateReasons.slice(); }, lastSubmit: function () { return lastSubmit; } };
    win.__brdWaQuiz = handle;
    return handle;
  }

  return {
    CONFIG: CONFIG, TEXT: TEXT, expectedConsent: expectedConsent, DQ_RULES: DQ_RULES,
    OWNED: OWNED, TRACKING: TRACKING, zipState: zipState, phoneDigits: phoneDigits, validPhone: validPhone, validEmail: validEmail,
    validOlderYear: validOlderYear, validName: validName, clean: clean, hasPlaceholder: hasPlaceholder, dqReason: dqReason, missing: missing,
    routeStatus: routeStatus, summary: summary, isTest: isTest, sha256: sha256, isChecked: isChecked, install: install,
    PAID_MAP: PAID_MAP, DEFECT_MAP: DEFECT_MAP, FLOW: FLOW, YEARS: YEARS, MAKES: MAKES, CHECKLIST: CHECKLIST,
    pct: pct, unlockedItems: unlockedItems, setRepairPaid: setRepairPaid, repairPaid: repairPaid
  };
});

/* Firm-site UI. CONFIG.site.on = false leaves the native builder look. Checklist stays in normal flow. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.document) return;
  var api = window.__brdLrcApi;
  if (!api || !api.CONFIG || !api.CONFIG.site || !api.CONFIG.site.on) return;
  var win = window, doc = win.document, cfg = api.CONFIG;
  var q = null, maxAnswered = 0, bannerItem = null, bannerFor = 0;
  var desired = 1, desiredHost = 'q1-state', navLock = '', navLockAt = 0, hops = 0;
  var lastStepId = '', moved = [], advancing = false, booted = false;
  var lastSubmit = null;
  var DISCLAIMER = "This shows what a buyback can include under Washington law. It isn't an estimate of your claim. Whether a vehicle qualifies, and any amount, is decided by the manufacturer, an arbitrator or a court.";
  var HIDDEN_NAMES = ['lead_id', 'campaign_id', 'adset_id', 'ad_id', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'click_id', 'started_at', 'time_zone', 'landing_page', 'page_version', 'funnel', 'original_source', 'state', 'zip_state', 'zip_mismatch_seen', 'phone_10', 'buyer', 'consent_text', 'consent_version', 'consent_hash', 'consent_checked_at', 'route_status', 'dq_reason', 'lead_summary', 'is_test'];

  function esc(s) {
    return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function str(s) { return s == null ? '' : String(s); }
  function tick() { return String.fromCharCode(0x2713); }
  function screenByN(n) {
    var i; for (i = 0; i < api.FLOW.length; i++) if (api.FLOW[i].n === n) return api.FLOW[i];
    return null;
  }
  function blockEl(name) {
    try { var b = q && q.getBlock(name); return b ? doc.getElementById(b.blockID) : null; } catch (e) { return null; }
  }
  function setBlock(name, value) {
    try {
      var b = q && q.getBlock(name); if (!b) return;
      var cur = ''; try { cur = b.getValue(); } catch (e) { cur = ''; }
      if (str(cur) !== str(value)) b.setValue(value);
      else { try { if (win.__brdWaQuiz && win.__brdWaQuiz.refresh) win.__brdWaQuiz.refresh(); } catch (e2) {} }
    } catch (err) {}
  }
  function arm(step) { desiredHost = step; navLock = step; navLockAt = Date.now(); }
  function go(step) {
    arm(step);
    try { q.navigation.goToStep(step); } catch (e) {}
  }
  function pairDq(block, value) {
    var i, rules = api.DQ_RULES;
    for (i = 0; i < rules.length; i++) if (rules[i][0] === block && String(rules[i][1]).toLowerCase() === String(value).toLowerCase()) return true;
    return false;
  }

  var UI_CSS = [
    'body.lrc-live{background:#F4F7FB;color:#1F2B33}',
    'body.lrc-live #brd-header,body.lrc-live #brd-headline-band{display:none!important}',
    'body.lrc-live #brd-zip-prompt{display:none!important}',
    'body.lrc-live:not(.lrc-final) #brd-gate-hint{display:none!important}',
    '#lrc-nav,#lrc-hero,#lrc-after,#lrc-card,#lrc-card *{box-sizing:border-box}',
    '#lrc-nav,#lrc-hero,#lrc-after,#lrc-card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    '#lrc-nav{position:sticky;top:0;z-index:40;background:#fff;border-bottom:1px solid #E4E9EE}',
    '.lrc-nav-inner{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap;max-width:1040px;margin:0 auto;padding:8px 14px}',
    '.lrc-logo{display:block;height:32px;width:auto;max-width:100%}',
    '.lrc-logo-fallback{display:flex;align-items:center;gap:8px;color:#1F2B33;font-weight:800;font-size:15px;letter-spacing:-.02em}',
    '.lrc-links{display:flex;align-items:center;gap:12px;flex:0 0 auto;margin-left:auto}',
    '.lrc-links a{color:#1F2B33;text-decoration:none;font-weight:650;font-size:14px;min-height:52px;display:flex;align-items:center}',
    '#lrc-hero{position:relative;background:#0B4F45;color:#fff;overflow:hidden}',
    '.lrc-hero-bg{position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(165deg,#0B4F45 0%,#14685B 58%,#1F2B33 100%)}',
    '.lrc-hero-full,.lrc-slim-label{position:relative;z-index:1}',
    '.lrc-hero-full{max-width:720px;margin:0 auto;padding:22px 18px 64px}',
    '.lrc-pill{display:inline-block;background:#D4A017;color:#1F2B33;font-size:12px;font-weight:800;letter-spacing:.02em;border-radius:99px;padding:6px 10px}',
    '.lrc-kicker{margin:12px 0 0;font-size:12px;font-weight:800;letter-spacing:.08em}',
    '.lrc-hero-full h1{margin:8px 0 0;font-size:28px;line-height:1.15;letter-spacing:-.03em;font-weight:800}',
    '.lrc-sub{margin:10px 0 0;font-size:16px;line-height:1.4;max-width:34em}',
    '.lrc-photo-tag{position:absolute;top:10px;right:10px;z-index:2;font-size:11px;font-weight:700;background:rgba(31,43,51,.55);color:#fff;border-radius:99px;padding:4px 8px}',
    '.lrc-car{position:absolute;right:8%;bottom:18px;opacity:.35}',
    '.lrc-slim-label{display:none;padding:14px 16px;font-size:15px;font-weight:800;letter-spacing:.01em}',
    'body.lrc-slim #lrc-hero .lrc-hero-full,body.lrc-slim #lrc-hero .lrc-photo-tag,body.lrc-slim #lrc-hero .lrc-car{display:none}',
    'body.lrc-slim .lrc-slim-label{display:block}',
    'body.lrc-slim #lrc-hero{min-height:0}',
    'body.lrc-live .ll-quiz{max-width:560px;margin:-40px auto 0;padding:0 14px;position:relative;z-index:2}',
    'body.lrc-slim.lrc-live .ll-quiz{margin-top:12px}',
    '#lrc-card{background:#fff;color:#1F2B33;border-radius:16px;padding:18px 16px 16px;box-shadow:0 12px 32px rgba(31,43,51,.08)}',
    '.lrc-pct{display:block;font-size:40px;line-height:1;font-weight:800;letter-spacing:-.03em;color:#1F2B33}',
    '.lrc-pct.last{font-size:28px;letter-spacing:-.02em}',
    '.lrc-bar{height:20px;background:#E7EDF2;border-radius:99px;overflow:hidden;margin:10px 0 0}',
    '.lrc-bar i{display:block;height:100%;width:0;background:#D4A017;border-radius:99px;transition:width .35s ease}',
    '.lrc-check{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0;font-size:13px;font-weight:700;color:#1F2B33}',
    '.lrc-dots{display:inline-flex;gap:4px}',
    '.lrc-dot{width:10px;height:10px;border-radius:99px;background:#E7EDF2;display:inline-block}',
    '.lrc-dot.on{background:#0B4F45}',
    '.lrc-banner{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#E8F2EF;color:#1F2B33;font-weight:750;border-left:3px solid #D4A017;animation:lrcDrop .35s ease}',
    '@keyframes lrcDrop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
    '.lrc-q h2{margin:0 0 8px;font-size:22px;line-height:1.25;letter-spacing:-.02em;font-weight:800;color:#1F2B33}',
    '.lrc-help{margin:0 0 12px;font-size:14px;line-height:1.4;color:#3E4C57}',
    '.lrc-choice,.lrc-tile{width:100%;min-height:52px;margin:0 0 8px;padding:14px 14px;border-radius:12px;border:1px solid #D5DDE4;background:#fff;color:#1F2B33;font-size:16px;font-weight:700;text-align:left;cursor:pointer}',
    '.lrc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.lrc-grid .lrc-tile{margin:0;min-height:92px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px}',
    '.lrc-tile svg{display:block}',
    '.lrc-field{margin:0 0 10px}',
    '.lrc-field span,.lrc-sr{display:block;font-size:13px;font-weight:700;margin:0 0 6px;color:#1F2B33}',
    '.lrc-field input,.lrc-field select,#lrc-native input,#lrc-native select{width:100%;min-height:52px;font-size:16px;border-radius:12px;border:1px solid #C9D2DA;padding:12px 14px;color:#1F2B33;background:#fff}',
    '#lrc-continue,#lrc-native .ll-quiz-submit-button{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;margin-top:8px;background:#0B4F45;color:#fff;border:0;border-radius:12px;font-size:17px;font-weight:800;text-decoration:none;cursor:pointer}',
    '#lrc-continue:disabled{opacity:.5;cursor:not-allowed}',
    '.lrc-back{display:inline-flex;align-items:center;min-height:52px;padding:0 2px;background:transparent;border:0;color:#1F2B33;font-size:15px;font-weight:700;cursor:pointer}',
    '.lrc-err{margin:8px 0 0;font-size:14px;color:#8C2F2F;font-weight:650}',
    '.lrc-zipbox{margin-top:8px;padding:12px;border:1px solid #E4C56A;background:#FFF8E8;border-radius:12px;color:#1F2B33}',
    '.lrc-zipbox p{margin:0 0 8px;font-size:15px;line-height:1.4}',
    '.lrc-zipbox button{min-height:52px;margin:8px 8px 0 0;padding:10px 14px;border-radius:12px;border:1px solid #C9D2DA;background:#fff;color:#1F2B33;font-size:15px;font-weight:700;cursor:pointer}',
    '.lrc-off{display:none!important}',
    '#lrc-native .ll-quiz-block--checkbox-field,#lrc-native .ll-quiz-block--checkbox-field label,.lrc-card .ll-quiz-block-checkbox-label{font-size:13px;line-height:1.45;color:#3E4C57;font-weight:450}',
    '#lrc-native .ll-quiz-block--paragraph{font-size:12px;line-height:1.45;color:#4A5964}',
    '#lrc-after{max-width:560px;margin:14px auto 28px;padding:0 16px;color:#1F2B33}',
    '.lrc-trust{margin:0;font-size:14px;font-weight:700;text-align:center}',
    '.lrc-how{margin-top:18px}',
    '.lrc-how h2{margin:0 0 10px;font-size:16px;font-weight:800}',
    '.lrc-how ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
    '.lrc-how li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.35}',
    '.lrc-how i{flex:0 0 26px;height:26px;border-radius:99px;background:#0B4F45;color:#fff;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px}',
    '.lrc-disc{margin:16px 0 0;font-size:12px;line-height:1.45;color:#4A5964}',
    '.lrc-done{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}',
    '.lrc-done li{display:flex;gap:10px;align-items:flex-start;font-size:15px;font-weight:650;line-height:1.35}',
    '.lrc-tick{flex:0 0 22px;width:22px;height:22px;border-radius:99px;background:#0B4F45;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}',
    '.lrc-thanks h2{margin:0 0 8px;font-size:24px;line-height:1.2;font-weight:800}',
    '.lrc-thanks p{margin:0 0 10px;font-size:16px;line-height:1.4}',
    '.lrc-strong{font-weight:800}',
    '.lrc-fallback{margin:8px 0;font-size:18px;line-height:1.4;text-align:center}',
    '@media (min-width:768px){',
    '.lrc-logo{height:44px}',
    '.lrc-links a{font-size:15px}',
    '.lrc-hero-full{padding:48px 24px 92px}',
    '.lrc-hero-full h1{font-size:40px}',
    '#lrc-card{padding:26px 26px 22px}',
    '}'
  ].join('\n');

  function icon(name) {
    if (name === 'engine') return '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="6" y="10" width="20" height="14" rx="2" fill="none" stroke="#0B4F45" stroke-width="2"/><path d="M10 10 V6 H14 V10 M18 10 V6 H22 V10 M10 24 V28 H14 V24 M18 24 V28 H22 V24" fill="none" stroke="#0B4F45" stroke-width="2"/></svg>';
    if (name === 'bolt') return '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M18 3 L8 18 H16 L13 29 L25 13 H16 Z" fill="none" stroke="#0B4F45" stroke-width="2" stroke-linejoin="round"/></svg>';
    if (name === 'wheel') return '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><circle cx="16" cy="16" r="10" fill="none" stroke="#0B4F45" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="none" stroke="#0B4F45" stroke-width="2"/><path d="M16 6 V10 M16 22 V26 M6 16 H10 M22 16 H26" stroke="#0B4F45" stroke-width="2"/></svg>';
    return '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><circle cx="8" cy="16" r="2" fill="#0B4F45"/><circle cx="16" cy="16" r="2" fill="#0B4F45"/><circle cx="24" cy="16" r="2" fill="#0B4F45"/></svg>';
  }
  function logoHTML() {
    var url = cfg.site.logoUrl;
    if (url) return '<img class="lrc-logo" src="' + esc(url) + '" alt="Lemon Repair Check">';
    return '<span class="lrc-logo-fallback"><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#D4A017"/><path d="M9 16 l5 5 9-10" fill="none" stroke="#1F2B33" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Lemon Repair Check</span></span>';
  }
  function ensureCss() {
    if (doc.getElementById('lrc-css')) return;
    var s = doc.createElement('style'); s.id = 'lrc-css'; s.textContent = UI_CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }
  function ensureFavicon() {
    if (!cfg.site.faviconUrl) return;
    var link = doc.getElementById('lrc-favicon');
    if (!link) { link = doc.createElement('link'); link.id = 'lrc-favicon'; link.rel = 'icon'; (doc.head || doc.documentElement).appendChild(link); }
    link.href = cfg.site.faviconUrl;
  }
  function hideLegacy() {
    var ids = ['brd-header', 'brd-headline-band'], i, n;
    for (i = 0; i < ids.length; i++) { n = doc.getElementById(ids[i]); if (n) n.style.display = 'none'; }
  }
  function shell() {
    ensureCss(); ensureFavicon(); hideLegacy();
    doc.body.classList.add('lrc-live');
    if (!doc.getElementById('lrc-nav')) {
      var nav = doc.createElement('header'); nav.id = 'lrc-nav';
      nav.innerHTML = '<div class="lrc-nav-inner"><a href="#lrc-top">' + logoHTML() + '</a><nav class="lrc-links"><a href="#lrc-how">How it works</a><a href="' + esc(cfg.site.privacyUrl) + '">Privacy</a></nav></div>';
      var strip = doc.getElementById('brd-top-strip');
      if (strip && strip.parentNode) strip.parentNode.insertBefore(nav, strip.nextSibling);
      else doc.body.insertBefore(nav, doc.body.firstChild);
    }
    if (!doc.getElementById('lrc-hero')) {
      var hero = doc.createElement('section'); hero.id = 'lrc-hero';
      hero.innerHTML = '<div class="lrc-hero-bg" id="lrc-hero-bg"></div>' +
        '<div class="lrc-photo-tag" id="lrc-photo-tag">Photo placeholder</div>' +
        '<svg class="lrc-car" viewBox="0 0 120 48" width="120" height="48" aria-hidden="true"><path d="M12 32 H28 L38 18 H78 L90 32 H108" fill="none" stroke="#fff" stroke-width="2"/><circle cx="38" cy="34" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="86" cy="34" r="6" fill="none" stroke="#fff" stroke-width="2"/></svg>' +
        '<div class="lrc-hero-full"><span class="lrc-pill">Free Washington lemon law check</span><p class="lrc-kicker">CAR KEEPS GOING BACK TO THE SHOP?</p><h1>See how much you might be owed for your lemon.</h1><p class="lrc-sub">Washington\'s lemon law could get you a buyback. Answer a few quick questions. Free, no obligation.</p></div>' +
        '<div class="lrc-slim-label">Free Lemon Law Check</div>';
      var navEl = doc.getElementById('lrc-nav');
      if (navEl && navEl.parentNode) navEl.parentNode.insertBefore(hero, navEl.nextSibling);
      else doc.body.insertBefore(hero, doc.body.firstChild);
    }
    if (!doc.getElementById('lrc-card')) {
      var card = doc.createElement('div'); card.id = 'lrc-card';
      card.innerHTML = '<span class="lrc-pct" id="lrc-pct">0%</span><div class="lrc-bar" aria-hidden="true"><i id="lrc-bar-fill"></i></div><div class="lrc-check" id="lrc-check"></div><div id="lrc-banner"></div><div class="lrc-q" id="lrc-q"></div><div id="lrc-native"></div><div class="lrc-actions" id="lrc-actions"></div>';
      var quiz = doc.querySelector('.ll-quiz');
      if (quiz) quiz.insertBefore(card, quiz.firstChild);
      else doc.body.appendChild(card);
    }
    if (!doc.getElementById('lrc-after')) {
      var after = doc.createElement('div'); after.id = 'lrc-after';
      after.innerHTML = '<p class="lrc-trust" id="lrc-trust">Your information is private and secure.</p>' +
        '<section class="lrc-how" id="lrc-how"><h2>How it works</h2><ol><li><i>1</i><span>Answer a few questions</span></li><li><i>2</i><span>Your answers are checked</span></li><li><i>3</i><span>If it fits, a lemon law firm may reach out</span></li></ol></section>' +
        '<p class="lrc-disc" id="lrc-disc"></p>';
      after.querySelector('#lrc-disc').textContent = DISCLAIMER;
      var quiz2 = doc.querySelector('.ll-quiz');
      if (quiz2 && quiz2.parentNode) quiz2.parentNode.insertBefore(after, quiz2.nextSibling);
      else doc.body.appendChild(after);
    }
    paintHeroImage();
  }
  function paintHeroImage() {
    var bg = doc.getElementById('lrc-hero-bg'); if (!bg) return;
    var tag = doc.getElementById('lrc-photo-tag');
    if (cfg.site.heroImg) {
      bg.style.backgroundImage = 'linear-gradient(180deg,rgba(11,79,69,.78),rgba(11,79,69,.82)),url("' + str(cfg.site.heroImg).replace(/"/g, '') + '")';
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center';
      if (tag) tag.style.display = 'none';
    }
  }
  function placeCard(step) {
    var card = doc.getElementById('lrc-card'); if (!card) return;
    if (step && card.parentNode !== step) step.insertBefore(card, step.firstChild);
  }
  function stepEl(id) {
    if (id && doc.getElementById(id)) return doc.getElementById(id);
    if (lastStepId && doc.getElementById(lastStepId)) return doc.getElementById(lastStepId);
    var nodes = doc.querySelectorAll('.ll-quiz-step'), i;
    for (i = 0; i < nodes.length; i++) if (nodes[i].offsetParent !== null) return nodes[i];
    return nodes.length ? nodes[0] : null;
  }
  function hiddenId(id) {
    var i, b;
    if (!q) return false;
    for (i = 0; i < HIDDEN_NAMES.length; i++) {
      try { b = q.getBlock(HIDDEN_NAMES[i]); } catch (e) { b = null; }
      if (b && b.blockID === id) return true;
    }
    return false;
  }
  function isHidden(el) {
    var c = ' ' + str(el.className) + ' ';
    if (c.indexOf('hidden') >= 0) return true;
    return hiddenId(el.id || '');
  }
  function releaseFields() {
    var i, el, home, next;
    for (i = 0; i < moved.length; i++) {
      el = moved[i]; home = el.__lrcHome; next = el.__lrcNext;
      if (!home) continue;
      try {
        if (next && next.parentNode === home) home.insertBefore(el, next);
        else home.appendChild(el);
      } catch (e) {}
    }
    moved = [];
  }
  function moveIn(el) {
    var slot = doc.getElementById('lrc-native'); if (!el || !slot) return;
    if (!el.__lrcHome) { el.__lrcHome = el.parentNode; el.__lrcNext = el.nextSibling; }
    el.classList.remove('lrc-off');
    el.style.display = '';
    if (el.parentNode !== slot) slot.appendChild(el);
    moved.push(el);
  }
  function hideStepBlocks(step) {
    if (!step) return;
    var nodes = step.querySelectorAll('.ll-quiz-block'), i;
    for (i = 0; i < nodes.length; i++) {
      if (isHidden(nodes[i])) continue;
      if (nodes[i].id === 'lrc-card' || (nodes[i].closest && nodes[i].closest('#lrc-card'))) continue;
      nodes[i].classList.add('lrc-off');
    }
  }
  function revealParagraphs(step, bits) {
    if (!step) return;
    var nodes = step.querySelectorAll('.ll-quiz-block'), i, j, t;
    for (i = 0; i < nodes.length; i++) {
      t = str(nodes[i].textContent);
      for (j = 0; j < bits.length; j++) {
        if (t.indexOf(bits[j]) >= 0) { nodes[i].classList.remove('lrc-off'); nodes[i].style.display = ''; moveIn(nodes[i]); break; }
      }
    }
  }
  function quietLabels(root) {
    if (!root || root.querySelector('input[type=checkbox]')) return;
    var labs = root.querySelectorAll('label'), i, lab;
    for (i = 0; i < labs.length; i++) {
      lab = labs[i];
      if (str(lab.className).indexOf('checkbox') >= 0) continue;
      lab.classList.add('lrc-sr');
      lab.style.position = 'absolute';
      lab.style.width = '1px';
      lab.style.height = '1px';
      lab.style.overflow = 'hidden';
      lab.style.clip = 'rect(0 0 0 0)';
    }
  }

  function setPct(n, mode) {
    var num = doc.getElementById('lrc-pct'), bar = doc.getElementById('lrc-bar-fill');
    var label, width;
    if (mode === 'thanks') { label = '100%'; width = '100%'; }
    else if (mode === 'dq') { label = ''; width = api.pct(n || 1) + '%'; }
    else if (n === 15) { label = 'Last step!'; width = api.pct(15) + '%'; }
    else { label = api.pct(n) + '%'; width = api.pct(n) + '%'; }
    if (num) {
      num.textContent = label;
      num.className = 'lrc-pct' + (n === 15 && mode !== 'thanks' ? ' last' : '');
      num.style.display = label ? '' : 'none';
    }
    if (bar) bar.style.width = width;
    var row = doc.querySelector('.lrc-bar'); if (row) row.style.display = mode === 'bad' ? 'none' : '';
    if (mode === 'bad' && num) num.style.display = 'none';
  }
  function setCheck(mode) {
    var el = doc.getElementById('lrc-check'); if (!el) return;
    if (mode === 'hide' || mode === 'bad') { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    var count = mode === 'all' ? 4 : api.unlockedItems(maxAnswered).length;
    var dots = '', i;
    for (i = 0; i < 4; i++) dots += '<i class="lrc-dot' + (i < count ? ' on' : '') + '"></i>';
    el.innerHTML = '<span>Buyback checklist</span><span class="lrc-dots">' + dots + '</span><span>' + count + ' of 4</span>';
  }
  function setBanner(n) {
    var slot = doc.getElementById('lrc-banner'); if (!slot) return;
    if (bannerItem && bannerFor === n) slot.innerHTML = '<div class="lrc-banner" role="status">' + tick() + ' Unlocked: ' + esc(bannerItem.n) + '</div>';
    else slot.innerHTML = '';
  }
  function markAnswered(n) {
    var before = maxAnswered;
    if (n > maxAnswered) maxAnswered = n;
    var all = api.unlockedItems(100), i, it;
    for (i = 0; i < all.length; i++) {
      it = all[i];
      if (it.at > before && it.at <= maxAnswered) { bannerItem = it; bannerFor = n + 1; }
    }
  }
  function showHow(on) {
    var how = doc.getElementById('lrc-how'); if (how) how.style.display = on ? '' : 'none';
  }
  function showExtras(on) {
    var trust = doc.getElementById('lrc-trust'), disc = doc.getElementById('lrc-disc');
    if (trust) trust.style.display = on ? '' : 'none';
    if (disc) disc.style.display = on ? '' : 'none';
  }
  function heroMode(mode) {
    if (mode === 'full') doc.body.classList.remove('lrc-slim');
    else doc.body.classList.add('lrc-slim');
  }

  function actionsHTML(screen, withContinue) {
    var html = '';
    if (withContinue) html += '<button type="button" id="lrc-continue">Continue</button>';
    if (screen && screen.n > 1) html += '<button type="button" class="lrc-back" id="lrc-back">' + '\u2190 Back' + '</button>';
    return html;
  }
  function choiceHTML(screen) {
    var grid = screen.n === 5;
    var html = '<h2>' + esc(screen.q) + '</h2>';
    if (screen.help) html += '<p class="lrc-help">' + esc(screen.help) + '</p>';
    html += grid ? '<div class="lrc-grid">' : '<div>';
    var i, a, cls = grid ? 'lrc-tile' : 'lrc-choice';
    for (i = 0; i < screen.answers.length; i++) {
      a = screen.answers[i];
      html += '<button type="button" class="' + cls + '" data-n="' + screen.n + '" data-v="' + esc(a.v) + '" data-paid="' + esc(a.paid || '') + '" data-dq="' + (a.dq ? '1' : '0') + '">';
      if (a.icon) html += icon(a.icon);
      html += '<span>' + esc(a.t) + '</span></button>';
    }
    html += '</div><p class="lrc-err" id="lrc-err" style="display:none"></p>';
    return html;
  }
  function zipHTML(screen) {
    return '<h2>' + esc(screen.q) + '</h2><label class="lrc-field"><span>ZIP code</span><input id="lrc-zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="5 digits"></label><div id="lrc-zipbox" class="lrc-zipbox" style="display:none" role="alert"><p id="lrc-zipmsg"></p><button type="button" id="lrc-fix"></button><button type="button" id="lrc-notwa"></button></div><p class="lrc-err" id="lrc-err" style="display:none"></p>';
  }
  function yearLabel(v) { return v === '2015_or_older' ? '2015 or older' : v; }
  function makeLabel(v) { return v === 'other' ? 'Other' : v; }
  function vehicleHTML(screen) {
    var html = '<h2>' + esc(screen.q) + '</h2>';
    html += '<label class="lrc-field"><span>Year</span><select id="lrc-year"><option value="">Select year</option>';
    var i;
    for (i = 0; i < screen.years.length; i++) html += '<option value="' + esc(screen.years[i]) + '">' + esc(yearLabel(screen.years[i])) + '</option>';
    html += '</select></label>';
    html += '<label class="lrc-field" id="lrc-older-wrap" style="display:none"><span>Model year (1990 to 2015)</span><input id="lrc-older" inputmode="numeric" maxlength="4" placeholder="e.g. 2012"></label>';
    html += '<label class="lrc-field"><span>Make</span><select id="lrc-make"><option value="">Select make</option>';
    for (i = 0; i < screen.makes.length; i++) html += '<option value="' + esc(screen.makes[i]) + '">' + esc(makeLabel(screen.makes[i])) + '</option>';
    html += '</select></label>';
    html += '<label class="lrc-field" id="lrc-other-wrap" style="display:none"><span>Vehicle make</span><input id="lrc-other" maxlength="40" placeholder="Type the make"></label>';
    html += '<label class="lrc-field"><span>Model</span><input id="lrc-model" maxlength="40" placeholder="e.g. Camry"></label>';
    html += '<p class="lrc-err" id="lrc-err" style="display:none"></p>';
    return html;
  }
  function contactHTML(screen) {
    return '<h2>' + esc(screen.q) + '</h2><p class="lrc-err" id="lrc-err" style="display:none"></p>';
  }

  function bindZip() {
    var msg = doc.getElementById('lrc-zipmsg'), fix = doc.getElementById('lrc-fix'), out = doc.getElementById('lrc-notwa');
    if (msg) msg.textContent = api.TEXT.zipPrompt;
    if (fix) fix.textContent = api.TEXT.fixZip;
    if (out) out.textContent = api.TEXT.notWa;
    syncZip();
  }
  function syncZip() {
    var input = doc.getElementById('lrc-zip'); if (!input) return;
    var z = str(input.value).replace(/\D/g, '').slice(0, 5);
    if (input.value !== z) input.value = z;
    var st = api.zipState(z);
    var box = doc.getElementById('lrc-zipbox');
    if (box) box.style.display = (z.length === 5 && st === 'non_WA') ? '' : 'none';
    var btn = doc.getElementById('lrc-continue');
    if (btn) btn.disabled = st !== 'WA';
  }
  function syncVehicle() {
    var year = val('lrc-year'), make = val('lrc-make');
    var older = doc.getElementById('lrc-older-wrap'), other = doc.getElementById('lrc-other-wrap');
    if (older) older.style.display = year === '2015_or_older' ? '' : 'none';
    if (other) other.style.display = make === 'other' ? '' : 'none';
    var btn = doc.getElementById('lrc-continue');
    if (btn) btn.disabled = !vehicleOk();
  }
  function val(id) { var el = doc.getElementById(id); return el ? str(el.value) : ''; }
  function vehicleOk() {
    var year = val('lrc-year'), make = val('lrc-make'), model = str(val('lrc-model')).trim();
    if (!year || !make || !model || model.length > 40) return false;
    if (year === '2015_or_older' && !api.validOlderYear(val('lrc-older'))) return false;
    if (make === 'other' && !str(val('lrc-other')).trim()) return false;
    return true;
  }
  function showErr(msg) {
    var el = doc.getElementById('lrc-err'); if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? '' : 'none';
  }
  function fieldNode(name) { return blockEl(name); }
  function fieldInput(name) {
    var el = fieldNode(name); if (!el) return null;
    return el.querySelector('input, textarea, select');
  }
  function fieldValue(name) {
    var input = fieldInput(name);
    if (input && input.value != null && str(input.value) !== '') return input.value;
    try { var b = q.getBlock(name); return b ? str(b.getValue()) : ''; } catch (e) { return ''; }
  }
  function commitField(name) {
    var input = fieldInput(name);
    var v = input ? str(input.value) : fieldValue(name);
    setBlock(name, v);
    return v;
  }

  function normList(v) {
    if (v == null) return [];
    if (typeof v === 'string') return v.split(/[,|;]+/).map(function (s) { return s.replace(/^\s+|\s+$/g, ''); }).filter(Boolean);
    if (typeof v.length === 'number') {
      var out = [], i; for (i = 0; i < v.length; i++) out.push(str(v[i]).replace(/^\s+|\s+$/g, ''));
      return out.filter(Boolean);
    }
    return [str(v)];
  }
  function sameList(a, b) {
    if (a.length !== b.length) return false;
    var i; for (i = 0; i < a.length; i++) if (b.indexOf(a[i]) < 0) return false;
    return true;
  }
  function setDefect(csv) {
    var want = normList(csv);
    var b = null; try { b = q.getBlock('defect_category'); } catch (e) { b = null; }
    if (!b) return;
    function cur() { try { return normList(b.getValue()); } catch (e) { return []; } }
    try { b.setValue(csv); } catch (e) {}
    if (!sameList(cur(), want)) { try { b.setValue(want); } catch (e2) {} }
    if (!sameList(cur(), want)) clickDefect(want);
    setBlock('defect_description', '');
  }
  function clickDefect(want) {
    var el = blockEl('defect_category'); if (!el) return;
    var inputs = el.querySelectorAll('input[type=checkbox]'), i, inp, val, should;
    for (i = 0; i < inputs.length; i++) {
      inp = inputs[i]; val = inp.value || inp.getAttribute('data-value') || '';
      if (inp.checked && want.indexOf(val) < 0) { try { inp.click(); } catch (e) {} }
    }
    for (i = 0; i < inputs.length; i++) {
      inp = inputs[i]; val = inp.value || inp.getAttribute('data-value') || '';
      should = want.indexOf(val) >= 0;
      if (should && !inp.checked) { try { inp.click(); } catch (e) {} }
    }
  }

  function advance(n) {
    if (advancing) return;
    advancing = true;
    win.setTimeout(function () { advancing = false; }, 200);
    markAnswered(n);
    var next = screenByN(n + 1), cur = screenByN(n);
    if (!next) return;
    desired = next.n;
    if (cur && next.host === cur.host) renderScreen(next.n);
    else go(next.host);
  }

  function onChoice(btn) {
    var n = Number(btn.getAttribute('data-n'));
    var v = btn.getAttribute('data-v') || '';
    var paid = btn.getAttribute('data-paid') || '';
    var dq = btn.getAttribute('data-dq') === '1';
    var screen = screenByN(n); if (!screen) return;
    var next = screenByN(n + 1);
    if (paid) api.setRepairPaid(paid);
    if (dq || pairDq(screen.block, v)) {
      arm('not-qualified');
      if (screen.block === 'defect_category') setDefect(v); else setBlock(screen.block, v);
      go('not-qualified');
      return;
    }
    markAnswered(n);
    if (next) arm(next.host);
    if (screen.block === 'defect_category') setDefect(v); else setBlock(screen.block, v);
    if (next && screen.host === next.host) renderScreen(next.n);
    else if (next) go(next.host);
  }
  function onContinue() {
    var n = win.__brdLrcScreen || 0;
    var screen = screenByN(n); if (!screen) return;
    if (screen.kind === 'zip') {
      var z = val('lrc-zip');
      if (api.zipState(z) !== 'WA') { syncZip(); return; }
      setBlock('zip', z);
      advance(n);
      return;
    }
    if (screen.kind === 'vehicle') {
      if (!vehicleOk()) { showErr('Please complete year, make, and model.'); return; }
      var year = val('lrc-year'), make = val('lrc-make');
      arm('q9-defect');
      setBlock('vehicle_year_older', year === '2015_or_older' ? val('lrc-older') : '');
      setBlock('vehicle_make', make);
      setBlock('vehicle_make_other', make === 'other' ? str(val('lrc-other')).trim() : '');
      setBlock('vehicle_model', str(val('lrc-model')).trim());
      setBlock('vehicle_year', year);
      advance(n);
      return;
    }
    if (screen.kind === 'contact' && screen.n < 15) {
      var v = commitField(screen.field), ok = false, msg = 'Please check that answer.';
      if (screen.field === 'first_name' || screen.field === 'last_name') { ok = api.validName(v); msg = 'Please enter at least 2 letters.'; }
      else if (screen.field === 'phone') { ok = api.validPhone(v); msg = api.TEXT.phoneHint; }
      if (!ok) { showErr(msg); return; }
      showErr('');
      advance(n);
    }
  }
  function onBack() {
    var n = win.__brdLrcScreen || 1;
    if (n <= 1) return;
    var prev = screenByN(n - 1), cur = screenByN(n);
    if (!prev) return;
    desired = prev.n;
    if (cur && prev.host === cur.host) renderScreen(prev.n);
    else go(prev.host);
  }
  function onNotWa() {
    setBlock('zip_state', 'non_WA');
    setBlock('zip_mismatch_seen', 'yes');
    setBlock('route_status', 'dq');
    setBlock('dq_reason', 'non_wa_zip');
    var z = val('lrc-zip'); if (z) setBlock('zip', z);
    go('not-qualified');
  }
  function onFixZip() {
    var input = doc.getElementById('lrc-zip');
    if (input) { try { input.focus(); if (input.select) input.select(); } catch (e) {} }
  }

  function renderScreen(n) {
    var screen = screenByN(n); if (!screen) return;
    shell();
    win.__brdLrcScreen = n;
    desired = n;
    desiredHost = screen.host;
    doc.body.classList.add('lrc-live');
    doc.body.classList.remove('lrc-dq', 'lrc-thanks');
    if (n === 15) doc.body.classList.add('lrc-final'); else doc.body.classList.remove('lrc-final');
    heroMode(n === 1 ? 'full' : 'slim');
    var cardNow = doc.getElementById('lrc-card');
    if (cardNow && cardNow.getAttribute('data-lrc-screen') === String(n) && doc.getElementById('lrc-q') && doc.getElementById('lrc-q').childNodes.length) {
      setPct(n, 'step');
      setCheck('dots');
      setBanner(n);
      showHow(n === 1);
      showExtras(true);
      return;
    }
    var step = stepEl(lastStepId);
    releaseFields();
    placeCard(step);
    hideStepBlocks(step);
    setPct(n, 'step');
    setCheck('dots');
    setBanner(n);
    var qEl = doc.getElementById('lrc-q'), act = doc.getElementById('lrc-actions');
    if (screen.answers) qEl.innerHTML = choiceHTML(screen);
    else if (screen.kind === 'zip') qEl.innerHTML = zipHTML(screen);
    else if (screen.kind === 'vehicle') qEl.innerHTML = vehicleHTML(screen);
    else qEl.innerHTML = contactHTML(screen);
    var cont = !(screen.answers) && screen.n !== 15;
    act.innerHTML = actionsHTML(screen, cont);
    if (screen.kind === 'contact') {
      var node = fieldNode(screen.field);
      moveIn(node);
      quietLabels(node);
      if (screen.n === 15) {
        moveIn(fieldNode('consent_checked'));
        moveIn(fieldNode('submit'));
        revealParagraphs(step, ['Law firm:', 'TrustedForm', 'Privacy notice']);
        try { if (win.__brdWaQuiz && win.__brdWaQuiz.refresh) win.__brdWaQuiz.refresh(); } catch (e) {}
      }
    }
    if (screen.kind === 'zip') bindZip();
    if (screen.kind === 'vehicle') syncVehicle();
    showHow(n === 1);
    showExtras(true);
    var card = doc.getElementById('lrc-card');
    if (card) card.setAttribute('data-lrc-screen', String(n));
    try { win.scrollTo(0, 0); } catch (e2) {}
  }

  function listHTML() {
    var items = api.unlockedItems(7), html = '<ul class="lrc-done">', i;
    for (i = 0; i < items.length; i++) html += '<li><span class="lrc-tick" aria-hidden="true">' + tick() + '</span><span>' + esc(items[i].n) + '</span></li>';
    html += '</ul>';
    return html;
  }
  function submitOk() {
    var s = lastSubmit;
    try { if (win.__brdWaQuiz && win.__brdWaQuiz.lastSubmit && win.__brdWaQuiz.lastSubmit()) s = win.__brdWaQuiz.lastSubmit() || s; } catch (e) {}
    if (!s) return false;
    return s.route_status === 'ok' && !!s.consent;
  }
  function firstName() {
    var s = lastSubmit;
    try { if (win.__brdWaQuiz && win.__brdWaQuiz.lastSubmit && win.__brdWaQuiz.lastSubmit()) s = win.__brdWaQuiz.lastSubmit() || s; } catch (e) {}
    var name = s && s.first ? s.first : fieldValue('first_name');
    return str(name).replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  function renderThanks(stepId) {
    shell();
    var step = stepEl(stepId);
    releaseFields();
    placeCard(step);
    doc.body.classList.add('lrc-live', 'lrc-slim', 'lrc-thanks');
    doc.body.classList.remove('lrc-dq', 'lrc-final');
    heroMode('slim');
    win.__brdLrcScreen = 0;
    var ok = submitOk();
    var qEl = doc.getElementById('lrc-q'), act = doc.getElementById('lrc-actions'), ban = doc.getElementById('lrc-banner');
    if (act) act.innerHTML = '';
    if (ban) ban.innerHTML = '';
    if (!ok) {
      setPct(15, 'bad');
      setCheck('hide');
      if (qEl) qEl.innerHTML = '<p class="lrc-fallback" id="lrc-fallback"></p>';
      var fb = doc.getElementById('lrc-fallback'); if (fb) fb.textContent = api.TEXT.thanksNotOk;
      showHow(false); showExtras(false);
      var glue = doc.getElementById('brd-thanks-fallback'); if (glue) glue.style.display = 'none';
      if (step) {
        var blocks = step.querySelectorAll('.ll-quiz-block'), i;
        for (i = 0; i < blocks.length; i++) if (!isHidden(blocks[i])) blocks[i].classList.add('lrc-off');
      }
      return;
    }
    setPct(15, 'thanks');
    setCheck('hide');
    var name = firstName();
    var hello = name ? ('You\'re all set, ' + name + '. Your info has been received.') : 'You\'re all set. Your info has been received.';
    if (qEl) {
      qEl.innerHTML = '<div class="lrc-thanks"><h2 id="lrc-hello"></h2><p class="lrc-strong">The law firm\'s intake team may call you shortly to go over your answers. Keep your phone close and pick up.</p><p>Tip: have your repair orders and your purchase or lease paperwork handy.</p>' + listHTML() + '</div>';
      var h = doc.getElementById('lrc-hello'); if (h) h.textContent = hello;
    }
    if (step) hideStepBlocks(step);
    var glue2 = doc.getElementById('brd-thanks-fallback'); if (glue2) glue2.style.display = 'none';
    showHow(false); showExtras(true);
  }
  function laterThanks(stepId) {
    [0, 80, 300, 1200].forEach(function (ms) {
      win.setTimeout(function () {
        try {
          var name = q && q.getCurrentStepName && q.getCurrentStepName();
          if (name && name !== 'thank-you') return;
          renderThanks(stepId);
        } catch (err) {}
      }, ms);
    });
  }
  function renderDq(stepId) {
    shell();
    var step = stepEl(stepId);
    releaseFields();
    placeCard(step);
    doc.body.classList.add('lrc-live', 'lrc-slim', 'lrc-dq');
    doc.body.classList.remove('lrc-final');
    heroMode('slim');
    win.__brdLrcScreen = 0;
    setPct(desired || 1, 'dq');
    setCheck('hide');
    var ban = doc.getElementById('lrc-banner'); if (ban) ban.innerHTML = '';
    var qEl = doc.getElementById('lrc-q'); if (qEl) qEl.innerHTML = '';
    var act = doc.getElementById('lrc-actions'); if (act) act.innerHTML = '';
    if (step) {
      hideStepBlocks(step);
      var nodes = step.querySelectorAll('.ll-quiz-block'), i, c, t;
      for (i = 0; i < nodes.length; i++) {
        c = ' ' + str(nodes[i].className) + ' ';
        t = str(nodes[i].textContent);
        if (c.indexOf('headline') >= 0 || c.indexOf('paragraph') >= 0 || c.indexOf('previous') >= 0 || t.indexOf('Change my last answer') >= 0 || t.indexOf('Thanks for checking') >= 0) {
          nodes[i].classList.remove('lrc-off');
          nodes[i].style.display = '';
          moveIn(nodes[i]);
        }
      }
    }
    showHow(false); showExtras(true);
  }

  function onStep(d) {
    if (d.llQuizApi) q = d.llQuizApi;
    if (d.stepId) lastStepId = d.stepId;
    var name = d.stepName || '';
    if (!booted) { booted = true; shell(); }
    if (name === 'thank-you' || name === 'not-qualified') navLock = '';
    if (navLock && name && name !== navLock && (Date.now() - navLockAt) < 2000 && hops < 8) {
      hops++;
      try { q.navigation.goToStep(navLock); } catch (e) {}
      return;
    }
    hops = 0;
    if (name === 'thank-you') { renderThanks(d.stepId); laterThanks(d.stepId); return; }
    if (name === 'not-qualified') { renderDq(d.stepId); return; }
    if (name === 'q5-make' || name === 'q6-model') {
      if (hops < 6) { hops++; go(desiredHost && desiredHost !== name ? desiredHost : 'q9-defect'); }
      return;
    }
    var i, use = 0, group = [];
    for (i = 0; i < api.FLOW.length; i++) if (api.FLOW[i].host === name) group.push(api.FLOW[i]);
    if (!group.length) return;
    use = group[0].n;
    for (i = 0; i < group.length; i++) if (group[i].n === desired) use = group[i].n;
    renderScreen(use);
  }

  function boot() {
    shell();
    win.addEventListener('ll-quiz-init', function (e) { try { onStep((e && e.detail) || {}); } catch (err) {} });
    win.addEventListener('ll-quiz-step-view', function (e) { try { onStep((e && e.detail) || {}); } catch (err) {} });
    win.addEventListener('ll-quiz-submit', function (e) {
      try {
        var d = (e && e.detail) || {};
        var f = d.fieldsSimple || {};
        lastSubmit = {
          route_status: str(f.route_status || ''),
          consent: api.isChecked(f.consent_checked),
          first: str(f.first_name || '').replace(/^\s+|\s+$/g, '').slice(0, 40)
        };
      } catch (err) {}
    });
    doc.addEventListener('click', function (e) {
      try {
        var t = e.target; if (!t || !t.closest) return;
        if (t.closest('.ll-quiz-block--previous') || t.closest('#lrc-back')) { navLock = ''; navLockAt = 0; }
        if (t.closest('#lrc-continue')) { e.preventDefault(); onContinue(); return; }
        if (t.closest('#lrc-back')) { e.preventDefault(); onBack(); return; }
        if (t.closest('.lrc-choice') || t.closest('.lrc-tile')) { e.preventDefault(); onChoice(t.closest('.lrc-choice') || t.closest('.lrc-tile')); return; }
        if (t.closest('#lrc-fix')) { e.preventDefault(); onFixZip(); return; }
        if (t.closest('#lrc-notwa')) { e.preventDefault(); onNotWa(); return; }
        if ((win.__brdLrcScreen || 0) === 15) {
          var w = blockEl('submit');
          if (w && w.contains(t)) {
            var email = commitField('email');
            if (!api.validEmail(email) || !api.validName(fieldValue('first_name')) || !api.validName(fieldValue('last_name')) || !api.validPhone(fieldValue('phone'))) {
              e.preventDefault(); e.stopPropagation();
              if (!api.validEmail(email)) showErr('Please enter a valid email address.');
            }
          }
        }
      } catch (err) {}
    });
    doc.addEventListener('keydown', function (e) {
      try {
        if (!e || e.key !== 'Enter') return;
        var n = win.__brdLrcScreen || 0;
        var screen = screenByN(n);
        if (!screen) return;
        if (n >= 15) return;
        if (screen.kind === 'zip' || screen.kind === 'vehicle' || screen.kind === 'contact') {
          e.preventDefault(); e.stopPropagation(); onContinue();
        }
      } catch (err) {}
    }, true);
    doc.addEventListener('input', function (e) {
      try {
        if (!e.target) return;
        if (e.target.id === 'lrc-zip') syncZip();
        if (e.target.id === 'lrc-year' || e.target.id === 'lrc-older' || e.target.id === 'lrc-make' || e.target.id === 'lrc-other' || e.target.id === 'lrc-model') syncVehicle();
      } catch (err) {}
    });
    doc.addEventListener('change', function (e) {
      try {
        if (!e.target) return;
        if (e.target.id === 'lrc-year' || e.target.id === 'lrc-make') syncVehicle();
      } catch (err) {}
    });
  }
  try { boot(); } catch (e) {}
})();
