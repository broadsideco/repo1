/* Lemon Repair Check WA lemon quiz Custom Code lrc-wa-v0.1 sha256:cd89d553726b (built 10/4/2026, 8:30:19 PM PT).
 * PASTE EVERYTHING INTO: LanderLab Quiz builder > Settings > Custom Code / JavaScript. It is raw JavaScript:
  * do NOT wrap it in HTML script tags. Source: src/wa-quiz.js (edit there, run `node build.js`). */
  /* WA lemon quiz glue for ONE LanderLab page (Prestige Legal Solutions, P.C. pilot). Broadside Co.
   * RAW JAVASCRIPT: LanderLab runs the quiz Custom Code box with Function(code)(), so paste it as-is.
    * Never wrap it in HTML script tags (that is a SyntaxError there and the whole file silently does nothing).
     * It sends nothing anywhere. LanderLab's own webhook delivers the lead. It writes nothing to the browser console or any analytics data layer.
      * Every handler is wrapped in try/catch: a bug here can never block LanderLab's own validation or submit. */
      (function (factory) {
        var api = factory();
          if (typeof module === 'object' && module && module.exports) module.exports = api;
            if (typeof window !== 'undefined' && window.document && !window.BRD_WA_NO_AUTO) { try { api.install(window); } catch (_) {} }
            })(function () {
              'use strict';

                // ------------------------------------------------------------------ CONFIG (edit here, `node build.js`, re-paste)
                  var CONFIG = {
                      brand: 'Lemon Repair Check',            // THE brand constant (Tom, 10/4 8:08 PM PT). Alt was 'Broadside Auto Help'.
                          domain: 'lemonrepaircheck.com',         // not bought yet
                              pageVersion: 'lrc-wa-v0.1',
                              funnel: 'wa-lemon-quiz',
                              campaignDefault: 'BRD-WA-LEMON-PILOT',
                              state: 'WA',
                              buyer: 'Prestige Legal Solutions, P.C.',
                              consentVersion: 'wa-lemon-c1',
                              // Prestige intake line for the consent sentence. '' until Cameron confirms it; the page then shows the placeholder
                              // and every lead is held (route_status = hold_placeholder). Must equal what is typed in the consent label.
                              intakePhone: '',
                              zipMin: 98001, zipMax: 99403,
                              steps: { form: 'q14-contact', success: 'thank-you', dq: 'not-qualified' },
                              submitBlock: 'submit',
                              consentBlock: 'consent_checked'
                              };
                              var PHONE_PLACEHOLDER = '{{PRESTIGE_INTAKE_PHONE}}';

                              // Approved consent text (spec 4.1, version wa-lemon-c1; Ilan 10/4: approved as written). Compared with what the page renders.
                              function expectedConsent(cfg) {
                              cfg = cfg || CONFIG;
                              return 'By checking this box and clicking "Submit," I give my express written consent for ' + cfg.buyer +
                              ' to contact me about my vehicle warranty and lemon law inquiry by calls, text messages, and emails at the phone number and email address I provided,' +
                              ' including calls and texts that may use an automatic telephone dialing system, an artificial or prerecorded voice, or an AI-generated voice,' +
                              ' even if my number is on a state or federal Do-Not-Call list. My consent is not a condition of hiring a lawyer or purchasing anything;' +
                              ' instead, I can call the firm directly at ' + (cfg.intakePhone || PHONE_PLACEHOLDER) + '. Message frequency varies. Message and data rates may apply.' +
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

                              // ------------------------------------------------------------------ answers and routing (spec section 3)
                              // Order = spec order; the first match becomes dq_reason. Mirrors the per-option "go to not-qualified" navigation.
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
                              // Fields this script owns. The page may NOT set them from the URL (LanderLab fills any block from a same-name URL parameter).
                              var OWNED = ['lead_id', 'page_version', 'funnel', 'state', 'buyer', 'landing_page', 'started_at', 'time_zone', 'zip_state',
                              'zip_mismatch_seen', 'phone_10', 'consent_text', 'consent_version', 'consent_hash', 'consent_checked_at', 'route_status',
                              'dq_reason', 'lead_summary', 'is_test'];
                              // Ad-tracking fields that DO come from the URL (cleaned).
                              var TRACKING = ['campaign_id', 'adset_id', 'ad_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
                              var VALID = {
                              purchase_state_wa: ['yes'], acquisition_type: ['purchased', 'leased'], purchase_type: ['new', 'used', 'cpo'],
                              warranty_status: ['yes'], repair_visits: ['2', '3', '4plus'], defect_unresolved: ['yes', 'unsure'],
                              repair_docs: ['yes', 'can_get'], represented: ['no'], age_18_plus: ['yes']
                              };

                              function str(v) { return v == null ? '' : String(v); }
                              function trim(v) { return str(v).replace(/\s+/g, ' ').trim(); }
                              function low(v) { return trim(v).toLowerCase(); }

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
                              if (/^(\d)\1{9}$/.test(d)) return false;                       // all the same digit
                              if (d.slice(3, 6) === '555' && d.slice(6, 8) === '01') return false; // 555-01xx fictional range
                              return true;
                              }
                              function validEmail(s) { return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(trim(s)); }
                              function validOlderYear(s) { return /^(199\d|200\d|201[0-5])$/.test(trim(s)); }
                              function isChecked(v) { v = low(v); return v === 'checked' || v === 'true' || v === 'yes' || v === 'on' || v === '1'; }
                              // Unexpanded ad macros ({{campaign.id}}) or junk must never reach a hidden field.
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
                              // Everything Exhibit A needs (plus the page's own required fields) is present and valid.
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
                              // route_status: ok = deliverable. Anything else is held by GHL (never sent to Prestige).
                              // Extra hold values beyond the spec's ok|dq|no_consent: incomplete, hold_placeholder, hold_consent_mismatch.
                              function routeStatus(a, consent) {
                              var r = dqReason(a);
                              if (r) return { status: 'dq', reason: r };
                              if (missing(a).length) return { status: 'incomplete', reason: '' };
                              if (!consent.checked) return { status: 'no_consent', reason: '' };
                              if (consent.placeholder) return { status: 'hold_placeholder', reason: '' };
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

                              // ------------------------------------------------------------------ SHA-256 (synchronous, no crypto.subtle needed)
                              function sha256(ascii) {
                              function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
                              var bytes = [], i, j, s = unescape(encodeURIComponent(str(ascii)));   // UTF-8
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

                              // ------------------------------------------------------------------ LanderLab glue
                              var CSS = '.brd-zip-prompt{margin:8px 0 4px;padding:12px 14px;border:1px solid #f0c36d;background:#fff7e6;border-radius:10px;font-size:15px;line-height:1.4;color:#1d2433}' +
                              '.brd-zip-prompt button{min-height:48px;margin:10px 10px 0 0;padding:10px 14px;border-radius:10px;border:1px solid #c9ced8;background:#fff;font-size:15px;cursor:pointer}' +
                              '.brd-gate-hint{margin:6px 0 0;font-size:14px;color:#6b4e00;text-align:center}' +
                              '.brd-gated{opacity:.55;cursor:not-allowed}';

                              function install(win, cfg) {
                              cfg = cfg || CONFIG;
                              if (win.__brdWaQuiz) return win.__brdWaQuiz;
                              var doc = win.document, q = null, busy = false, lastSubmit = null, gateReasons = [], fixed = {};
                              var params = null; try { params = new win.URLSearchParams(win.location.search); } catch (_) { params = { get: function () { return null; } }; }

                              function blk(name) { try { return q ? q.getBlock(name) : null; } catch (_) { return null; } }
                              function get(name) { var b = blk(name); if (!b) return ''; try { var v = b.getValue(); return v == null ? '' : String(v); } catch (_) { return ''; } }
                              function set(name, v) { var b = blk(name); if (!b) return; v = v == null ? '' : String(v); try { if (str(b.getValue()) !== v) b.setValue(v); } catch (_) {} }
                              function el(name) { var b = blk(name); try { return b ? doc.getElementById(b.blockID) : null; } catch (_) { return null; } }
                              function answers() { var a = {}; ANSWER_KEYS.concat(CONTACT_KEYS).forEach(function (k) { a[k] = get(k); }); a.zip_state = zipState(a.zip); return a; }
                              function uuid() {
                              try { if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID(); } catch (_) {}
                              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
                              }

                              // ---- consent: exact rendered text of the checkbox label
                              function consentLabelEl() { var e = el(cfg.consentBlock); return e ? (e.querySelector('.ll-quiz-block-checkbox-label') || e.querySelector('label')) : null; }
                              function renderedConsent() {
                              var l = consentLabelEl(); if (l) return trim(l.textContent);
                              var b = blk(cfg.consentBlock); if (!b) return '';
                              try { var t = doc.createElement('div'); t.innerHTML = b.getLabel(); return trim(t.textContent); } catch (_) { return ''; }
                              }
                              function consentState() {
                              var text = renderedConsent();
                              return { text: text, checked: isChecked(get(cfg.consentBlock)), placeholder: !text || hasPlaceholder(text),
                              match: !!text && text === trim(expectedConsent(cfg)) };
                              }

                              // ---- recompute every derived field (idempotent, cheap)
                              function refresh() {
                              if (!q || busy) return;
                              busy = true;
                              try {
                              applyFixed();
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
                              } catch (_) {} finally { busy = false; }
                              }

                              // ---- submit gate: button disabled until consent is checked, ZIP is WA and the phone passes our checks
                              // LanderLab renders buttons as <a class="ll-quiz-submit-button">. Its own disable() sets the attribute disabled="true"
                              // (CSS: pointer-events none). We set the same attribute, tagged, so we only ever remove what we added.
                              function submitBtn() { var e = el(cfg.submitBlock); return e ? e.querySelector('.ll-quiz-submit-button') : null; }
                              function gate(a, c) {
                              var reasons = [];
                              if (!c.checked && blk(cfg.consentBlock)) reasons.push(TEXT.consentHint);   // no consent block found -> don't gate (native 'required' still applies)
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
                              try { btn.setAttribute('data-tf-element-role', 'submit'); } catch (_) {}
                              }
                              if (wrap) {
                              var hint = doc.getElementById('brd-gate-hint');
                              if (!hint) { hint = doc.createElement('p'); hint.id = 'brd-gate-hint'; hint.className = 'brd-gate-hint'; hint.setAttribute('aria-live', 'polite'); wrap.parentNode.insertBefore(hint, wrap.nextSibling); }
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
                              try { ev.preventDefault(); var i = z.querySelector('input'); if (i) { i.focus(); if (i.select) i.select(); } } catch (_) {}
                              });
                              out.addEventListener('click', function (ev) {
                              try {
                              ev.preventDefault();
                              set('zip_state', 'non_WA'); set('zip_mismatch_seen', 'yes'); set('route_status', 'dq'); set('dq_reason', 'non_wa_zip');
                              q.navigation.goToStep(cfg.steps.dq);
                              } catch (_) {}
                              });
                              }
                              box.style.display = '';
                              }

                              // ---- TrustedForm tagged consent (use_tagged_consent=true): mark the label, the firm name, the box and the button
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
                              } catch (_) {}
                              }

                              // Values fixed at page load. LanderLab copies a same-name URL parameter into hidden and checkbox blocks in a
                              // setTimeout(0) AFTER ll-quiz-init, so these are re-asserted on every refresh, not just set once.
                              function initFields() {
                              fixed.lead_id = 'BRD-' + uuid();
                              fixed.started_at = new Date().toISOString();
                              var tz = ''; try { tz = win.Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
                              fixed.time_zone = tz;
                              var lp = ''; try { lp = String(win.location.href).split('#')[0]; } catch (_) {}
                              fixed.landing_page = /\{\{|\}\}|%7b%7b|%7d%7d/i.test(lp) ? lp.replace(/\{\{[^}]*\}\}|%7b%7b.*?%7d%7d/gi, '') : lp;
                              fixed.landing_page = fixed.landing_page.slice(0, 2000);
                              // Tracking fields: from the URL, cleaned (unexpanded {{macros}} become empty).
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
                              // The consent box must start unchecked even if the URL tried to pre-fill it (?consent_checked=checked).
                              function resetConsent() {
                              var cb = blk(cfg.consentBlock);
                              if (!cb || !isChecked(get(cfg.consentBlock))) return;
                              try { cb.reset(); } catch (_) {}
                              if (isChecked(get(cfg.consentBlock))) set(cfg.consentBlock, '');
                              try { var i = el(cfg.consentBlock); i = i && i.querySelector('input[type=checkbox]'); if (i) i.checked = false; } catch (_) {}
                              }

                              function css() {
                              try { if (doc.getElementById('brd-wa-css')) return; var s = doc.createElement('style'); s.id = 'brd-wa-css'; s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s); } catch (_) {}
                              }

                              function on(type, fn) { win.addEventListener(type, function (e) { try { var d = (e && e.detail) || {}; if (d.llQuizApi) q = d.llQuizApi; fn(d); } catch (_) {} }); }

                              on('ll-quiz-init', function () {
                              css(); initFields(); tagConsent(); refresh();
                              // after LanderLab's own setTimeout(0) URL fill (see initFields)
                              [0, 300].forEach(function (ms) { win.setTimeout(function () { try { resetConsent(); refresh(); } catch (_) {} }, ms); });
                              });
                              on('ll-quiz-value-change', function (d) {
                              if (OWNED.indexOf(d.blockName) >= 0 || TRACKING.indexOf(d.blockName) >= 0) return;   // our own writes
                              refresh();
                              });
                              on('ll-quiz-step-view', function (d) {
                              if (d.stepName === cfg.steps.form) { tagConsent(); refresh(); }
                              if (d.stepName === cfg.steps.success) thankYou(d.stepId);
                              });
                              // Fires on Continue/Submit clicks BEFORE LanderLab validates and saves: make sure every field is current.
                              on('ll-quiz-button-click', function () { refresh(); });
                              on('ll-quiz-submit', function (d) {
                              var f = d.fieldsSimple || {};
                              lastSubmit = { route_status: str(f.route_status || get('route_status')), consent: isChecked(f[cfg.consentBlock] || get(cfg.consentBlock)),
                              first: trim(f.first_name || get('first_name')).slice(0, 40) };
                              });

                              // LanderLab fires ll-quiz-value-change for typed text only on blur/change, so also refresh while the user types
                              // (the ZIP prompt and the Submit gate then react immediately).
                              try {
                              var pending = false;
                              doc.addEventListener('input', function (e) {
                              try {
                              if (pending || !e.target || !e.target.closest || !e.target.closest('.ll-quiz')) return;
                              pending = true; win.setTimeout(function () { pending = false; refresh(); }, 0);
                              } catch (_) {}
                              }, true);
                              } catch (_) {}

                              // Enter in a form field (keydown) or on the focused Submit link (keypress) triggers LanderLab's submit directly,
                              // and a script click ignores pointer-events. Stop all three while the gate is closed, before LanderLab sees them.
                              try {
                              var stopKey = function (e) {
                              try {
                              if (e.key !== 'Enter' || !gateReasons.length || !q) return;
                              if (q.getCurrentStepName && q.getCurrentStepName() !== cfg.steps.form) return;
                              if (e.target && e.target.closest && e.target.closest('.ll-quiz')) { e.preventDefault(); e.stopPropagation(); }
                              } catch (_) {}
                              };
                              doc.addEventListener('keydown', stopKey, true);
                              doc.addEventListener('keypress', stopKey, true);
                              doc.addEventListener('click', function (e) {
                              try {
                              if (!gateReasons.length) return;
                              var w = el(cfg.submitBlock);
                              if (w && e.target && w.contains(e.target)) { e.preventDefault(); e.stopPropagation(); }
                              } catch (_) {}
                              }, true);
                              } catch (_) {}

                              // Thank-you: (1) LanderLab's {{first_name}} variable. LanderLab clears the quiz right after the submit navigation and
                              // its live-variable listener then puts the literal "{{first_name}}" back. We freeze the name into plain text (or drop
                              // ", {{first_name}}" if there is no name) so braces can never show. (2) Fallback line when the lead isn't deliverable.
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
                              } catch (_) {}
                              };
                              run();
                              [0, 50, 250, 1000].forEach(function (ms) { win.setTimeout(run, ms); });
                              }

                              var handle = { refresh: refresh, gateReasons: function () { return gateReasons.slice(); } };
                              win.__brdWaQuiz = handle;
                              return handle;
                              }

                              return { CONFIG: CONFIG, TEXT: TEXT, PHONE_PLACEHOLDER: PHONE_PLACEHOLDER, expectedConsent: expectedConsent, DQ_RULES: DQ_RULES,
                              OWNED: OWNED, TRACKING: TRACKING, zipState: zipState, phoneDigits: phoneDigits, validPhone: validPhone, validEmail: validEmail,
                              validOlderYear: validOlderYear, clean: clean, hasPlaceholder: hasPlaceholder, dqReason: dqReason, missing: missing,
                              routeStatus: routeStatus, summary: summary, isTest: isTest, sha256: sha256, isChecked: isChecked, install: install };
                              });
/* ==== lrc-wa buyback checklist overlay (append AFTER prestige glue). ASCII-safe. Broadside Co. ====
 * Sticky "What a Washington lemon law buyback can include" card. Visual only.
 * Progress = questions answered only (never drops). No $, up to, totals, or claim estimate.
 * Thin footer disclaimer only - do NOT paste the mockup's fat Ilan review block. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.BRD_LRC_BB) return;
  window.BRD_LRC_BB = true;
  var doc = document, win = window;
  var FLOW = [
    'q1-state', 'q2-acquire', 'q3-condition', 'q4-year', 'q5-make', 'q6-model',
    'q7-warranty', 'q8-visits', 'q9-defect', 'q10-unresolved', 'q11-docs',
    'q12-lawyer', 'q13-age', 'q14-contact'
  ];
  var ENDS = { 'thank-you': 1, 'not-qualified': 1 };
  /* Line items tick by answered-count thresholds only (not by yes/favorable answers). No price field on live -> no $ echo. */
  var ITEMS = [
    { k: 'price', n: 'Purchase price', at: 1 },
    { k: 'taxes', n: 'Taxes, license and registration fees', at: 3 },
    { k: 'incidental', n: 'Certain incidental costs', at: 5 },
    { k: 'allowance', n: 'Minus an allowance for your use of the vehicle', at: 7 }
  ];
  var maxAnswered = 0;
  var seen = {};
  var CSS = [
    '.brd-bb{--bg:#083f35;--bg2:#0d5c4d;--lemon:#F5C518;--ink:#f4fbf8;--mut:#b7e0d4;position:sticky;top:0;z-index:50;max-width:560px;margin:0 auto;padding:10px 12px 8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-sizing:border-box}',
    '.brd-bb *{box-sizing:border-box}',
    '.brd-bb-card{position:relative;overflow:hidden;background:linear-gradient(165deg,#083f35 0%,#0d5c4d 55%,#12705c 100%);border:1px solid rgba(245,197,24,.35);border-radius:16px;padding:14px 14px 12px;box-shadow:0 10px 28px rgba(8,63,53,.35);color:#f4fbf8}',
    '.brd-bb-card:before{content:"";position:absolute;width:140px;height:140px;right:-36px;top:-44px;background:radial-gradient(circle,rgba(245,197,24,.28) 0%,transparent 70%);pointer-events:none}',
    '.brd-bb-title{position:relative;margin:0 0 8px;font-size:15px;font-weight:800;letter-spacing:-.02em;line-height:1.3;color:#fff}',
    '.brd-bb-meta{position:relative;font-size:12px;font-weight:650;color:#F5C518;margin-bottom:10px}',
    '.brd-bb-bar{position:relative;height:6px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden;margin-bottom:12px}',
    '.brd-bb-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#F5C518,#ffe566);transition:width .4s}',
    '.brd-bb-list{position:relative;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}',
    '.brd-bb-li{display:none;align-items:flex-start;gap:10px;padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);font-size:13px;font-weight:600;line-height:1.35;color:#f4fbf8}',
    '.brd-bb-li.on{display:flex;animation:brdbbin .45s ease}',
    '.brd-bb-li .tick{flex:0 0 20px;width:20px;height:20px;border-radius:99px;display:grid;place-items:center;background:#F5C518;color:#083f35;font-size:12px;font-weight:900}',
    '@keyframes brdbbin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    '.brd-bb-foot{max-width:560px;margin:28px auto 16px;padding:0 16px;font-size:11px;line-height:1.45;color:#6b8a80;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center}',
    'body{background:#eef8f4 !important}',
    '.ll-quiz .ll-quiz-continue-button,.ll-quiz .ll-quiz-submit-button{background:linear-gradient(135deg,#0d5c4d,#083f35) !important;color:#fff !important;border:0 !important;border-radius:14px !important}',
    '.ll-quiz .ll-quiz-block--multiple-choice button,.ll-quiz .ll-quiz-block--multiple-choice label,.ll-quiz .ll-quiz-block--multiple-choice [class*=option]{border-radius:14px !important;min-height:52px}',
    '.ll-quiz-step:has(.ll-quiz-block--multiple-choice):not(:has(.ll-quiz-block--text-field)):not(:has(.ll-quiz-block--textarea-field)) .ll-quiz-block--continue{display:none !important}'
  ].join('\n');

  /* Condensed copy (Tom 2026-10-05). Match by text prefix; null = hide. No worth/up to/$/estimate. */
  var COPY = [
    ['h1', 'Same car problem, repaired again', 'Driving a lemon? Check if it may qualify.'],
    ['p', 'Answer a few quick questions about your vehicle', 'Answer a few questions about your car and repairs.'],
    ['li', 'About 1 minute, mostly taps', 'About 1 minute'],
    ['li', 'Your answers go to one law firm only', 'One law firm only, never resold'],
    ['li', 'No obligation to hire anyone', 'No obligation'],
    ['p', 'Takes about a minute. No obligation.', null],
    ['p', 'So the firm knows which vehicle this is.', null],
    ['h1', 'Was it in the shop for repairs while it was still under', 'Repaired under the factory warranty?'],
    ['p', 'This means the factory warranty from the automaker', 'Not an extended service contract.'],
    ['h1', 'How many times has a dealer or manufacturer-authorized shop', 'How many repair tries for the same problem?'],
    ['h1', 'Is the problem still happening after those repairs?', 'Still happening after repairs?'],
    ['h1', 'Do you have the repair orders or paperwork', 'Have your repair orders?'],
    ['p', 'The invoices or repair orders the shop gave you', 'Even if repairs were free.'],
    ['h1', 'Is a lawyer already helping you', 'Already have a lawyer for this?']
  ];
  function tighten() {
    var els = doc.querySelectorAll('#brd-headline-band h1,#brd-headline-band p,#brd-headline-band li,.ll-quiz h1,.ll-quiz p');
    var i, j, el, t;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      if (el.getAttribute('data-brd-t')) continue;
      t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      for (j = 0; j < COPY.length; j++) {
        if (el.tagName.toLowerCase() === COPY[j][0] && t.indexOf(COPY[j][1]) === 0) {
          if (COPY[j][2] === null) el.style.display = 'none'; else el.textContent = COPY[j][2];
          el.setAttribute('data-brd-t', '1');
          break;
        }
      }
    }
  }
  var card, fill, meta;
  function answeredCount() {
    var n = 0, i;
    for (i = 0; i < FLOW.length; i++) if (seen[FLOW[i]]) n++;
    return n;
  }
  function build() {
    try { tighten(); } catch (e) {}
    if (card) return;
    var st = doc.createElement('style'); st.id = 'brd-bb-css'; st.textContent = CSS; doc.head.appendChild(st);
    var quiz = doc.querySelector('.ll-quiz'); if (!quiz) return;
    card = doc.createElement('div'); card.className = 'brd-bb'; card.setAttribute('aria-live', 'polite');
    var tick = String.fromCharCode(0x2713);
    var apos = String.fromCharCode(0x2019);
    var h = '<div class="brd-bb-card"><h2 class="brd-bb-title">What a WA buyback can include</h2>';
    h += '<div class="brd-bb-meta" id="brd-bb-meta">0 of ' + FLOW.length + ' answered</div>';
    h += '<div class="brd-bb-bar"><i id="brd-bb-fill"></i></div><ul class="brd-bb-list">';
    ITEMS.forEach(function (it) {
      h += '<li class="brd-bb-li" data-k="' + it.k + '"><span class="tick" aria-hidden="true">' + tick + '</span><span class="lab">' + it.n + '</span></li>';
    });
    h += '</ul></div>';
    card.innerHTML = h;
    quiz.parentNode.insertBefore(card, quiz);
    var foot = doc.createElement('p'); foot.className = 'brd-bb-foot'; foot.id = 'brd-bb-foot';
    foot.textContent = 'This shows what a buyback can include under Washington law. It isn' + apos + 't an estimate of your claim. Whether a vehicle qualifies, and any amount, is decided by the manufacturer, an arbitrator or a court.';
    if (quiz.nextSibling) quiz.parentNode.insertBefore(foot, quiz.nextSibling); else quiz.parentNode.appendChild(foot);
    fill = doc.getElementById('brd-bb-fill');
    meta = doc.getElementById('brd-bb-meta');
    paint();
  }
  function paint() {
    if (!card) return;
    var n = maxAnswered;
    if (meta) meta.textContent = n + ' of ' + FLOW.length + ' answered';
    if (fill) fill.style.width = Math.round((n / FLOW.length) * 100) + '%';
    ITEMS.forEach(function (it) {
      var el = card.querySelector('[data-k="' + it.k + '"]');
      if (el) el.classList.toggle('on', n >= it.at);
    });
  }
  function onStep(name) {
    build();
    if (!card) return;
    if (ENDS[name]) {
      card.style.display = name === 'thank-you' ? '' : 'none';
      if (name === 'thank-you' && meta) meta.textContent = 'Checklist complete.';
      if (name === 'thank-you' && fill) fill.style.width = '100%';
      return;
    }
    card.style.display = '';
    if (FLOW.indexOf(name) >= 0) {
      var i = FLOW.indexOf(name);
      if (i > maxAnswered) maxAnswered = i;
      seen[name] = 1;
    }
    paint();
  }
  function onValue(blockName) {
    build();
    var map = {
      purchase_state_wa: 'q1-state',
      acquisition_type: 'q2-acquire',
      purchase_type: 'q3-condition',
      vehicle_year: 'q4-year',
      vehicle_year_older: 'q4-year',
      vehicle_make: 'q5-make',
      vehicle_make_other: 'q5-make',
      vehicle_model: 'q6-model',
      warranty_status: 'q7-warranty',
      repair_visits: 'q8-visits',
      defect_category: 'q9-defect',
      defect_description: 'q9-defect',
      defect_unresolved: 'q10-unresolved',
      repair_docs: 'q11-docs',
      represented: 'q12-lawyer',
      age_18_plus: 'q13-age',
      first_name: 'q14-contact',
      last_name: 'q14-contact',
      phone: 'q14-contact',
      email: 'q14-contact',
      zip: 'q14-contact'
    };
    var step = map[blockName];
    if (step) {
      seen[step] = 1;
      var c = answeredCount();
      if (c > maxAnswered) maxAnswered = c;
      paint();
    }
  }
  win.addEventListener('ll-quiz-init', function () { try { build(); } catch (e) {} });
  win.addEventListener('ll-quiz-step-view', function (e) { try { onStep((e.detail || {}).stepName); } catch (x) {} });
  win.addEventListener('ll-quiz-value-change', function (e) {
    try {
      var d = e.detail || {};
      if (d.blockName) onValue(d.blockName);
    } catch (x) {}
  });
  if (doc.readyState !== 'loading') setTimeout(function () { try { build(); } catch (e) {} }, 0);
})();