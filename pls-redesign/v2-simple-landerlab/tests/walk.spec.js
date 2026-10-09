/* Offline headless walk of the v2-simple LanderLab add-on.
 * Injects quiz.js into the saved 113318 and 112190 pages, mocks every request,
 * and checks the lead payload LanderLab's quiz runtime would POST.
 */
const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FIX = path.join(ROOT, 'fixtures');
const VENDOR = path.join(ROOT, 'vendor');
const SHOTS = path.join(ROOT, 'shots');
const CONSENT = fs.readFileSync(path.join(FIX, 'consent_text-v4.txt'), 'utf8').trim();

const PAGES = {
  built: { file: 'built-113318.html', label: 'built-113318' },
  live: { file: 'live-112190-index.html', label: 'live-112190' }
};

const HOURLY = {
  'What happened at work?': 'I was wrongly fired',
  'Do you still work there?': 'No',
  'When did your job end?': 'Less than 6 months ago',
  'How were you paid?': 'Hourly (W-2)',
  'Who did you work for?': 'Company or Business',
  'Do you already have a lawyer for this?': 'No',
  'Did you sign a severance agreement?': 'No',
  'Was your job in California?': 'Yes',
  'Are you 18 or older?': 'Yes'
};
const MISCLASS = Object.assign({}, HOURLY, {
  'How were you paid?': '1099 contractor',
  'Did the company set your schedule and supervise your work?': 'Yes'
});
const CONTACT = {
  "What's your first name?": 'Ada',
  "What's your last name?": 'Lovelace',
  "What's the best number to reach you?": '4158675309',
  "What's your email?": 'ada@example.com'
};
const BASE_FIELDS = {
  claim_type: 'Wrongful termination',
  situation: 'No I no longer work there',
  separation_timing: 'Less than 6 months ago',
  employer_type: 'Private company or business (non-union)',
  status_check: 'None of these apply to me',
  work_in_ca: 'yes',
  age_18_plus: 'yes',
  postal_code: '',
  employer_name: '',
  employer_address: '',
  case_summary: '',
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone: '4158675309',
  email: 'ada@example.com',
  consent: 'checked'
};
const HOURLY_PAY = 'Hourly employee (W-2)';
const MISCLASS_PAY = 'Paid as a 1099 contractor but the company set my schedule and supervised my work';

const DQS = [
  { name: 'still', q: 'Do you still work there?', choice: 'Yes', field: 'situation', value: 'Yes I still work there', answers: HOURLY },
  { name: 'timing', q: 'When did your job end?', choice: 'More than 3 years ago', field: 'separation_timing', value: 'More than 3 years ago', answers: HOURLY },
  { name: 'uber', q: 'How were you paid?', choice: 'Uber, Lyft, or similar', field: 'pay_type', value: 'App-based driver or delivery (Uber Lyft DoorDash Instacart Amazon Flex etc.)', answers: HOURLY },
  { name: '1099-no', q: 'Did the company set your schedule and supervise your work?', choice: 'No', field: 'pay_type', value: 'Independent contractor running my own business', answers: Object.assign({}, HOURLY, { 'How were you paid?': '1099 contractor' }) },
  { name: 'union', q: 'Who did you work for?', choice: 'Union Job', field: 'employer_type', value: 'Union job (I was a union member)', answers: HOURLY },
  { name: 'government', q: 'Who did you work for?', choice: 'Government agency', field: 'employer_type', value: 'Government agency (city county state or federal)', answers: HOURLY },
  { name: 'tribal', q: 'Who did you work for?', choice: 'Tribal Casino', field: 'employer_type', value: 'Tribal casino', answers: HOURLY },
  { name: 'lawyer', q: 'Do you already have a lawyer for this?', choice: 'Yes', field: 'status_check', value: 'I already have a lawyer for this', answers: HOURLY },
  { name: 'severance', q: 'Did you sign a severance agreement?', choice: 'Yes', field: 'status_check', value: 'I signed a severance agreement', answers: HOURLY },
  { name: 'ca', q: 'Was your job in California?', choice: 'No', field: 'work_in_ca', value: 'no', answers: HOURLY },
  { name: 'age', q: 'Are you 18 or older?', choice: 'No', field: 'age_18_plus', value: 'No', answers: HOURLY }
];

const MONEY = /settlement|payout|compensation|\bcash\b|\$\s?\d|you could be owed/i;

let server;
let base;
const results = [];

function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

function startServer() {
  return new Promise(function (resolve) {
    const srv = http.createServer(function (req, res) {
      const url = (req.url || '/').split('?')[0];
      if (url === '/pls-quiz.js') {
        res.setHeader('content-type', 'text/javascript; charset=utf-8');
        res.end(fs.readFileSync(path.join(ROOT, 'quiz.js')));
        return;
      }
      const key = url.replace(/^\//, '');
      const page = PAGES[key];
      if (!page) { res.statusCode = 404; res.end('not found'); return; }
      let html = fs.readFileSync(path.join(FIX, page.file), 'utf8');
      html = html.replace(/<\/body>/i, '<script src="/pls-quiz.js"></script></body>');
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(html);
    });
    srv.listen(0, '127.0.0.1', function () {
      const addr = srv.address();
      resolve({ srv: srv, base: 'http://127.0.0.1:' + addr.port });
    });
  });
}

test.beforeAll(async function () {
  fs.mkdirSync(SHOTS, { recursive: true });
  const started = await startServer();
  server = started.srv;
  base = started.base;
});

test.afterAll(async function () {
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ consent: CONSENT, results: results }, null, 2));
  await new Promise(function (resolve) { server.close(resolve); });
});

function fieldMap(body) {
  const payload = JSON.parse(body);
  const map = {};
  (payload.data || []).forEach(function (row) { map[row.key] = row.value; });
  return { eventType: payload.eventType, map: map, url: '' };
}

async function installRoutes(page, posts) {
  await page.route('**/*', async function (route) {
    const req = route.request();
    const url = req.url();
    if (url.startsWith(base)) return route.continue();
    if (url.indexOf('landerlab-quiz.pages.dev/index.umd.min.js') !== -1) {
      return route.fulfill({ path: path.join(VENDOR, 'landerlab-quiz.umd.js'), contentType: 'text/javascript' });
    }
    if (url.indexOf('landerlab-quiz.pages.dev/style.css') !== -1) {
      return route.fulfill({ path: path.join(VENDOR, 'landerlab-quiz.css'), contentType: 'text/css' });
    }
    if (req.method() === 'POST' || url.indexOf('/leads/') !== -1) {
      posts.push({ url: url, method: req.method(), body: req.postData() || '' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
    if (req.resourceType() === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(url)) {
      return route.fulfill({ path: path.join(VENDOR, 'pixel.png'), contentType: 'image/png' });
    }
    return route.fulfill({ status: 204, body: '' });
  });
}

async function shot(page, name) {
  const file = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  return 'pls-redesign/v2-simple-landerlab/shots/' + name + '.png';
}

async function openPage(page, which, posts) {
  posts.length = 0;
  // LanderLab sets localStorage quiz-<id>.submitted after a save and then refuses another
  // submit. Each walk is a new visitor, so clear storage before the page scripts run.
  await page.addInitScript(function () {
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  });
  await page.goto(base + '/' + which, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#pls-pct', { timeout: 20000 });
  await page.waitForFunction(function () { return window.PLS_V2 && window.PLS_V2.api; });
  await page.evaluate(function () {
    var host = window.PLS_V2.api.navigation.host;
    host.config.settings.general.userBehavior.submitMinLoadingTime = { enabled: false, seconds: 0 };
  });
}

async function question(page) {
  return norm(await page.locator('#pls-app .pls-q').innerText());
}

async function waitQuestionChange(page, prev) {
  await page.waitForFunction(function (old) {
    var el = document.querySelector('#pls-app .pls-q');
    return el && el.textContent.replace(/\s+/g, ' ').trim() !== old;
  }, prev, { timeout: 15000 });
}

async function clickChoice(page, label) {
  const prev = await question(page);
  await page.locator('#pls-app .pls-choice').getByText(label, { exact: true }).click();
  await waitQuestionChange(page, prev);
}

async function assertNoMoney(page) {
  const blob = await page.evaluate(function () {
    var bits = [];
    document.querySelectorAll('.mer-hero, .pls-wrap, #pls-app').forEach(function (el) { bits.push(el.innerText || ''); });
    return bits.join('\n');
  });
  expect(blob).not.toMatch(MONEY);
}

async function walkUntil(page, answers, opts) {
  const seen = [];
  for (let guard = 0; guard < 20; guard++) {
    const q = await question(page);
    seen.push(q);
    if (/may not fit the Firm/.test(q)) return { kind: 'nq', seen: seen };
    if (/all set/.test(q)) return { kind: 'ty', seen: seen };
    if (opts.shotAt && opts.shotAt[q]) await shot(page, opts.shotAt[q]);
    if (Object.prototype.hasOwnProperty.call(CONTACT, q)) {
      if (q.indexOf('email') !== -1 && opts.onEmail) await opts.onEmail(page);
      await page.locator('#pls-in').fill(CONTACT[q]);
      if (q.indexOf('email') !== -1) {
        await page.locator('#pls-consent').check();
        await page.locator('#pls-app .pls-next').click();
      } else {
        await page.locator('#pls-app .pls-next').click();
      }
      if (q.indexOf('email') !== -1) {
        await page.waitForFunction(function () {
          var el = document.querySelector('#pls-app .pls-q');
          return el && /all set|couldn/.test(el.textContent);
        }, null, { timeout: 20000 });
      } else {
        await waitQuestionChange(page, q);
      }
      if (opts.afterContact && opts.afterContact[q]) await opts.afterContact[q](page, q);
      continue;
    }
    const choice = answers[q];
    if (!choice) throw new Error('No scripted answer for “' + q + '”. Seen: ' + seen.join(' | '));
    if (opts.beforeChoice && opts.beforeChoice[q]) await opts.beforeChoice[q](page, q);
    await clickChoice(page, choice);
  }
  throw new Error('Flow did not finish. Seen: ' + seen.join(' | '));
}

function lastLead(posts, eventType) {
  const parsed = posts.map(function (p) {
    try { return Object.assign(fieldMap(p.body), { url: p.url }); } catch (e) { return null; }
  }).filter(Boolean);
  const hits = parsed.filter(function (p) { return !eventType || p.eventType === eventType; });
  return hits[hits.length - 1] || null;
}

function expectFields(map, expected) {
  Object.keys(expected).forEach(function (key) {
    expect(map[key], key).toBe(expected[key]);
  });
}

async function boot(page, which) {
  const posts = [];
  const errors = [];
  page.on('pageerror', function (err) { errors.push(String(err)); });
  await installRoutes(page, posts);
  await openPage(page, which, posts);
  return { posts: posts, errors: errors };
}

test.describe('v2-simple on saved LanderLab pages', function () {
  for (const which of ['built', 'live']) {
    const label = PAGES[which].label;

    test(label + ' qualify, 1099, and every DQ', async function ({ page }) {
      test.setTimeout(180000);
      const ctx = await boot(page, which);

      await test.step('first screen is 0% and matches the prototype', async function () {
        await expect(page.locator('#pls-pct')).toHaveText('0%');
        await expect(page.locator('#pls-fill')).toHaveAttribute('style', /width:\s*0%/);
        await expect(page.locator('#pls-app .pls-q')).toHaveText('What happened at work?');
        const labels = await page.locator('#pls-app .pls-choice').allInnerTexts();
        expect(labels.map(norm)).toEqual([
          'I was wrongly fired',
          'I was sexually harassed',
          'I was discriminated against',
          'I had unpaid wages or breaks',
          'Other'
        ]);
        await expect(page.locator('.mer-hero')).toBeVisible();
        await expect(page.locator('.mer-call')).toHaveAttribute('href', 'tel:+13233755101');
        await expect(page.locator('.ll-quiz')).toBeHidden();
        const height = await page.locator('.pls-choice').first().evaluate(function (el) { return el.getBoundingClientRect().height; });
        expect(height).toBeGreaterThanOrEqual(56);
        await assertNoMoney(page);
        const pct = await page.evaluate(function () { return window.PLS_V2.percent(0, {}); });
        expect(pct).toBe(0);
        results.push({ page: label, shot: await shot(page, label + '-00-first') });
      });

      await test.step('hourly qualify posts the prototype values', async function () {
        await openPage(page, which, ctx.posts);
        const shots = {};
        if (which === 'built') {
          shots['What happened at work?'] = label + '-01-claim';
          shots['Do you still work there?'] = label + '-02-still';
          shots['When did your job end?'] = label + '-03-timing';
          shots['How were you paid?'] = label + '-04-pay';
          shots['Who did you work for?'] = label + '-05-employer';
          shots['Do you already have a lawyer for this?'] = label + '-06-lawyer';
          shots['Did you sign a severance agreement?'] = label + '-07-severance';
          shots['Was your job in California?'] = label + '-08-ca';
          shots['Are you 18 or older?'] = label + '-09-age';
          shots["What's your first name?"] = label + '-10-first';
          shots["What's your last name?"] = label + '-11-last';
          shots["What's the best number to reach you?"] = label + '-12-phone';
        }
        let backed = false;
        const end = await walkUntil(page, HOURLY, {
          shotAt: shots,
          beforeChoice: {
            'Who did you work for?': async function () {
              await expect(page.locator('.pls-hint')).toHaveText('Public school or college? Choose Government agency.');
              await expect(page.locator('#pls-app .pls-choice', { hasText: 'Public school' })).toHaveCount(0);
            }
          },
          afterContact: which === 'built' ? {
            "What's your first name?": async function () {
              await expect(page.locator('#pls-app .pls-q')).toHaveText("What's your last name?");
              await page.locator('.pls-back').click();
              await expect(page.locator('#pls-app .pls-q')).toHaveText("What's your first name?");
              await expect(page.locator('#pls-in')).toHaveValue('Ada');
              await page.locator('#pls-app .pls-next').click();
              await expect(page.locator('#pls-app .pls-q')).toHaveText("What's your last name?");
              backed = true;
            }
          } : null,
          onEmail: async function (p) {
            await expect(p.locator('#pls-consent')).not.toBeChecked();
            await expect(p.locator('#pls-consent')).toHaveAttribute('required', '');
            expect(norm(await p.locator('.pls-consent').innerText())).toBe(CONSENT);
            await assertNoMoney(p);
            const before = ctx.posts.length;
            await p.locator('#pls-in').fill(CONTACT["What's your email?"]);
            await p.locator('#pls-app .pls-next').click();
            await expect(p.locator('#pls-err')).toHaveText('Please check the box to submit your information to the Firm.');
            await expect(p.locator('#pls-consent')).not.toBeChecked();
            const submits = ctx.posts.slice(before).filter(function (x) { return /"eventType":"submit"/.test(x.body); });
            expect(submits).toHaveLength(0);
            if (which === 'built') await shot(p, label + '-13-email-consent-error');
            await shot(p, label + '-13-email-consent');
          }
        });
        if (which === 'built') expect(backed).toBe(true);
        expect(end.kind).toBe('ty');
        await expect(page.locator('#pls-pct')).toHaveText('100%');
        await expect(page.locator('#pls-app')).toContainText('Watch for a phone call shortly.');
        await expect(page.locator('#pls-app')).toContainText('Ada');
        await assertNoMoney(page);
        await expect(page.locator('.mer-hero')).toBeHidden();
        const lead = lastLead(ctx.posts, 'submit');
        expect(lead, 'submit payload').toBeTruthy();
        expect(lead.url).toContain('/leads/');
        expectFields(lead.map, Object.assign({ pay_type: HOURLY_PAY }, BASE_FIELDS));
        expect(lead.map['Hidden Field']).toBe('mer-ca-v1.1');
        expect(lead.map.situation).not.toBe('I applied but was never hired');
        results.push({ page: label, path: 'qualify-hourly', fields: lead.map, shot: await shot(page, label + '-14-thank-you') });
      });

      await test.step('1099 yes posts the misclassification value', async function () {
        await openPage(page, which, ctx.posts);
        const end = await walkUntil(page, MISCLASS, {
          shotAt: { 'Did the company set your schedule and supervise your work?': label + '-04b-1099' },
          onEmail: async function (p) {
            expect(norm(await p.locator('.pls-consent').innerText())).toBe(CONSENT);
            await expect(p.locator('#pls-consent')).not.toBeChecked();
          }
        });
        expect(end.kind).toBe('ty');
        const lead = lastLead(ctx.posts, 'submit');
        expect(lead).toBeTruthy();
        expectFields(lead.map, Object.assign({}, BASE_FIELDS, { pay_type: MISCLASS_PAY }));
        results.push({ page: label, path: 'qualify-1099', pay_type: lead.map.pay_type });
      });

      for (const dq of DQS) {
        await test.step('DQ ' + dq.name, async function () {
          await openPage(page, which, ctx.posts);
          const answers = Object.assign({}, dq.answers, { [dq.q]: dq.choice });
          const end = await walkUntil(page, answers, {});
          expect(end.kind).toBe('nq');
          await expect(page.locator('#pls-app')).toContainText("this campaign can't take your inquiry");
          await expect(page.locator('#pls-app')).toContainText('State Bar of California');
          await expect(page.locator('#pls-app')).toContainText("don't wait to get advice");
          await expect(page.locator('#pls-change')).toHaveText('Change my last answer');
          await assertNoMoney(page);
          const submits = ctx.posts.filter(function (p) { return /"eventType":"submit"/.test(p.body || ''); });
          expect(submits, 'DQ must not submit').toHaveLength(0);
          const lead = lastLead(ctx.posts, 'pageview');
          expect(lead, 'pageview payload').toBeTruthy();
          expect(lead.map[dq.field]).toBe(dq.value);
          const shotPath = await shot(page, label + '-dq-' + dq.name);
          results.push({ page: label, path: 'dq-' + dq.name, field: dq.field, value: lead.map[dq.field], shot: shotPath });
          if (which === 'built' && dq.name === 'still') {
            await page.locator('#pls-change').click();
            await expect(page.locator('#pls-app .pls-q')).toHaveText('Do you still work there?');
            await clickChoice(page, 'No');
            await expect(page.locator('#pls-app .pls-q')).toHaveText('When did your job end?');
          }
        });
      }

      const realErrors = ctx.errors.filter(function (e) { return !/favicon/i.test(e); });
      expect(realErrors, realErrors.join('\n')).toEqual([]);
    });
  }

  test('CONFIG.enabled false leaves the builder quiz', async function ({ page }) {
    const posts = [];
    await page.addInitScript(function () { window.PLS_V2_PRESET = { enabled: false }; });
    await installRoutes(page, posts);
    await page.goto(base + '/built', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ll-quiz-continue-button', { timeout: 20000 });
    await expect(page.locator('#pls-app')).toHaveCount(0);
    await expect(page.locator('.ll-quiz')).toBeVisible();
    await expect(page.locator('.ll-quiz h1').first()).toHaveText('What happened at work?');
    await expect(page.getByText('I was wrongly fired')).toHaveCount(0);
    results.push({ page: 'built-113318', path: 'rollback', plsApp: false });
  });
});
