/* Node unit tests for lemon-redesign/v1/quiz.js. No dependencies and no network. */
var fs = require('fs');
var path = require('path');
var api = require('../quiz.js');

var failed = 0;
function check(name, ok) {
  if (ok) console.log('PASS ' + name);
  else { console.log('FAIL ' + name); failed++; }
}

var root = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(root, 'quiz.js'));
var text = src.toString('utf8');
var consentRaw = fs.readFileSync(path.join(root, 'inputs', 'consent_wa-lemon-c2.txt'), 'utf8');
var builder = JSON.parse(fs.readFileSync(path.join(root, 'inputs', 'live-quiz-builder-data.json'), 'utf8'));

var c2 = consentRaw.slice(consentRaw.indexOf('\n\n') + 2).replace(/\s+$/, '');
check('c2 text === expectedConsent()', api.expectedConsent() === c2);
check('consent version', api.CONFIG.consentVersion === 'wa-lemon-c2');
check('page version', api.CONFIG.pageVersion === 'lrc-wa-v1.0');

['PRESTIGE_INTAKE_PHONE', 'hold_placeholder', 'intakePhone'].forEach(function (token) {
  check('quiz.js has no ' + token, text.indexOf(token) < 0);
});

var ascii = true;
for (var bi = 0; bi < src.length; bi++) if (src[bi] > 127) ascii = false;
check('quiz.js is ASCII', ascii);
check('quiz.js has no script tag', text.toLowerCase().indexOf('<script') < 0);

var prestige = text.split('Prestige').length - 1;
check('Prestige only in CONFIG.buyer', prestige === 1 && text.indexOf("buyer: 'Prestige Legal Solutions, P.C.'") >= 0);

var disclaimer = 'This shows what a buyback can include under Washington law. It isn\'t an estimate of your claim. Whether a vehicle qualifies, and any amount, is decided by the manufacturer, an arbitrator or a court.';
var stripped = text.split(disclaimer).join('');
check('disclaimer present', text.indexOf(disclaimer) >= 0);
check('no estimate outside disclaimer', stripped.toLowerCase().indexOf('estimate') < 0);
check('no up to', text.toLowerCase().indexOf('up to') < 0);
check('no guarantee', text.toLowerCase().indexOf('guarantee') < 0);
check('no worth', text.toLowerCase().indexOf('worth') < 0);
check('repair paid storage key', text.indexOf('lrc_repair_paid') >= 0);
check('logo url is one config field', text.indexOf('logoUrl:') >= 0);

function optionsOf(node, set) {
  if (!node || typeof node !== 'object') return;
  if (Object.prototype.toString.call(node) === '[object Array]') {
    for (var i = 0; i < node.length; i++) optionsOf(node[i], set);
    return;
  }
  if (node.options && Object.prototype.toString.call(node.options) === '[object Array]') {
    for (var j = 0; j < node.options.length; j++) {
      if (node.options[j] && node.options[j].value != null) set[String(node.options[j].value)] = 1;
    }
  }
  for (var k in node) if (Object.prototype.hasOwnProperty.call(node, k) && k !== 'options') optionsOf(node[k], set);
}
var options = {};
optionsOf(builder, options);

function atoms(v) {
  return String(v).split(',').map(function (s) { return s.replace(/^\s+|\s+$/g, ''); }).filter(Boolean);
}
function subset(values, label) {
  var i, parts, p;
  for (i = 0; i < values.length; i++) {
    parts = atoms(values[i]);
    for (p = 0; p < parts.length; p++) {
      if (!options[parts[p]]) { check(label + ' ' + parts[p], false); return; }
    }
  }
  check(label, true);
}
subset(Object.keys(api.PAID_MAP).map(function (k) { return api.PAID_MAP[k]; }), 'PAID_MAP values in builder options');
subset(Object.keys(api.DEFECT_MAP).map(function (k) { return api.DEFECT_MAP[k]; }), 'DEFECT_MAP values in builder options');

var flowValues = [];
api.FLOW.forEach(function (step) {
  (step.answers || []).forEach(function (a) { flowValues.push(a.v); });
  (step.years || []).forEach(function (y) { flowValues.push(y); });
  (step.makes || []).forEach(function (m) { flowValues.push(m); });
});
subset(flowValues, 'FLOW answer values in builder options');

check('FLOW has 15 screens', api.FLOW.length === 15);
var hosts = api.FLOW.map(function (s) { return s.host; });
var expectHosts = ['q1-state', 'q2-acquire', 'q3-condition', 'q4-year', 'q9-defect', 'q8-visits', 'q7-warranty', 'q10-unresolved', 'q11-docs', 'q12-lawyer', 'q13-age', 'q14-contact', 'q14-contact', 'q14-contact', 'q14-contact'];
check('FLOW hosts', hosts.join('|') === expectHosts.join('|'));

check('pct screen 1 is 0', api.pct(1) === 0);
check('pct screen 2 is 7', api.pct(2) === 7);
check('pct screen 15 is 93', api.pct(15) === 93);
check('pct formula', api.pct(8) === Math.round(7 / 15 * 100));

var ats = api.unlockedItems(100).map(function (it) { return it.at; });
check('unlock thresholds 1/3/5/7', ats.join(',') === '1,3,5,7');
check('unlock 0', api.unlockedItems(0).length === 0);
check('unlock 1', api.unlockedItems(1).length === 1 && api.unlockedItems(1)[0].n === 'Purchase price');
check('unlock 2', api.unlockedItems(2).length === 1);
check('unlock 3', api.unlockedItems(3).length === 2);
check('unlock 4', api.unlockedItems(4).length === 2);
check('unlock 5', api.unlockedItems(5).length === 3);
check('unlock 6', api.unlockedItems(6).length === 3);
check('unlock 7', api.unlockedItems(7).length === 4);
check('unlock names', api.unlockedItems(7).map(function (it) { return it.n; }).join('|') === 'Purchase price|Taxes, license and registration fees|Certain incidental costs|Minus an allowance for your use of the vehicle');

function base() {
  return {
    purchase_state_wa: 'yes',
    purchase_type: 'new',
    vehicle_year: '2020',
    vehicle_year_older: '',
    vehicle_make: 'Toyota',
    vehicle_make_other: '',
    vehicle_model: 'Camry',
    warranty_status: 'yes',
    repair_visits: '2',
    defect_category: 'engine, transmission',
    defect_description: '',
    defect_unresolved: 'yes',
    repair_docs: 'yes',
    represented: 'no',
    age_18_plus: 'yes',
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone: '2065551234',
    email: 'ada@example.com',
    zip: '98101',
    zip_state: 'WA'
  };
}
check('phone fixture valid', api.validPhone('2065551234') === true);
check('zip fixture WA', api.zipState('98101') === 'WA');
check('zip non WA', api.zipState('10001') === 'non_WA');
check('missing ok without acquisition_type', api.missing(base()).length === 0);
var blankAcq = base(); blankAcq.acquisition_type = '';
check('missing ok with blank acquisition_type', api.missing(blankAcq).length === 0);
var stillNeedsPhone = base(); stillNeedsPhone.phone = '';
check('missing still flags phone', api.missing(stillNeedsPhone).indexOf('phone') >= 0);

var okConsent = { checked: true, match: true };
check('route ok', api.routeStatus(base(), okConsent).status === 'ok');

var c1 = 'By checking this box and clicking "Submit," I give my express written consent for Prestige Legal Solutions, P.C. to contact me about my vehicle warranty and lemon law inquiry by calls, text messages, and emails at the phone number and email address I provided, including calls and texts that may use an automatic telephone dialing system, an artificial or prerecorded voice, or an AI-generated voice, even if my number is on a state or federal Do-Not-Call list. My consent is not a condition of hiring a lawyer or purchasing anything; instead, I can call the firm directly at {{PRESTIGE_INTAKE_PHONE}}. Message frequency varies. Message and data rates may apply. I can opt out at any time by replying STOP to any text or by telling the caller, and I can reply HELP for help. I have read the Privacy Policy.';
check('c1 is not c2', c1 !== api.expectedConsent());
check('route hold_consent_mismatch', api.routeStatus(base(), { checked: true, match: c1 === api.expectedConsent() }).status === 'hold_consent_mismatch');
check('route no_consent', api.routeStatus(base(), { checked: false, match: true }).status === 'no_consent');
check('route incomplete', api.routeStatus(stillNeedsPhone, okConsent).status === 'incomplete');

api.DQ_RULES.forEach(function (rule) {
  var a = base();
  a[rule[0]] = rule[1];
  if (rule[0] === 'zip_state') a.zip_state = rule[1];
  var got = api.routeStatus(a, okConsent);
  check('route dq ' + rule[0] + '=' + rule[1], got.status === 'dq' && got.reason === rule[2]);
});
check('unsure rule kept', api.DQ_RULES.some(function (r) { return r[0] === 'warranty_status' && r[1] === 'unsure' && r[2] === 'warranty_unsure'; }));

api.setRepairPaid('some');
var sum = api.summary(blankAcq);
check('summary paid some', sum.indexOf('Paid for repairs: some') >= 0);
check('summary drops blank acquisition', sum.indexOf('Bought') < 0 && sum.indexOf('Leased') < 0);
var withAcq = base(); withAcq.acquisition_type = 'purchased';
check('summary keeps acquisition when set', api.summary(withAcq).indexOf('Bought') >= 0);
api.setRepairPaid('none');
check('summary paid none', api.summary(base()).indexOf('Paid for repairs: none') >= 0);
api.setRepairPaid('');
check('summary omits blank paid', api.summary(base()).indexOf('Paid for repairs') < 0);

check('sha256 hex', /^[0-9a-f]{64}$/.test(api.sha256(api.expectedConsent())));
check('validName two letters', api.validName('Li') === true && api.validName('A') === false);
check('site logo constant', api.CONFIG.site.logoUrl === 'assets/lemon-repair-check_logo-horizontal_color.svg');
check('favicon constant', api.CONFIG.site.faviconUrl === 'assets/favicon.svg');
check('site on by default', api.CONFIG.site.on === true);

console.log(failed ? ('FAILED ' + failed) : 'ALL PASS');
process.exit(failed ? 1 : 0);
