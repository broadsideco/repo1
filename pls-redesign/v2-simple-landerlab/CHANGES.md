# PLS v2-simple → LanderLab custom code (offline)

One JavaScript file for the approved v2-simple funnel. Paste it into LanderLab quiz custom code on test page **113318** first, then live **112190**. Nothing here was published, and the offline test makes no real network calls.

- **File:** `pls-redesign/v2-simple-landerlab/quiz.js`
- **Rollback:** set `CONFIG.enabled` to `false` at the top of that file and republish. The builder quiz comes back. `window.PLS_V2_PRESET = { enabled: false }` before the file loads does the same thing.
- The file includes the old lead-id / UTM stamp (`setIfEmpty`), so it can replace the snippet that is in the quiz custom-code box today.

## What the visitor sees

The prototype flow, labels, order, DQ rules, thank-you copy, and card. One question per screen. The bar reads **0%** on the first question. Claim answers are: I was wrongly fired / I was sexually harassed / I was discriminated against / I had unpaid wages or breaks / Other. 1099 gets the follow-up screen. The employer screen has the public-school hint. California and 18+ are separate screens. Contact is one field per screen, and the consent checkbox sits on the email step, unchecked and required. The button says **See If I Have a Case**.

Old step 8 (ZIP, employer name, employer address, summary) is not asked. Those four fields are posted as `''`.

## What gets posted

LanderLab’s own quiz still submits, so the webhook, TrustedForm cert, and field names stay. Posted values match the prototype:

| Field | Qualified example |
|---|---|
| claim_type | Wrongful termination (and the other four prototype values) |
| situation | `No I no longer work there` (new text value; “Yes I still work there” still DQs) |
| separation_timing | same five windows |
| pay_type | hourly, salaried, the live misclassification sentence, the app-based sentence, or the pure-1099 sentence |
| employer_type | live values; union, government, and tribal casino DQ |
| status_check | `None of these apply to me`, or lawyer, or signed severance. Offered severance is not asked. |
| work_in_ca | `yes` / `no` |
| age_18_plus | `yes` / `No` |
| postal_code, employer_name, employer_address, case_summary | `''` |
| first_name, last_name, email | what was typed |
| phone | 10 digits |
| consent | LanderLab’s own checkbox value `checked` (the box is required). The prototype’s offline harness used the string `true` for the same checked box. Posting `true` would fail LanderLab’s required-checkbox check, and the live page already stores `checked`. |

`situation` is not in the builder’s option list. The add-on adds `No I no longer work there` on the live select at runtime. GHL’s situation field is text, so the new value does not need a builder option. With the add-on off, that option is not added.

Consent **text** on screen is v4, word for word, including on the older 113318 copy whose builder checkbox still has the pre-v4 paragraph. The visible label is replaced. The posted consent field stays the checkbox state, not the paragraph.

## Builder changes custom code cannot make

None are required for 113318 or 112190 as saved. Both already have the same 11 steps, the same block names, and a submit button whose next action is the thank-you step. The add-on hides the builder UI and skips step 8.

Optional, so the builder preview matches if the add-on is turned off:

1. **113318 header** is the older strip (“ATTORNEY ADVERTISING”, “Paid joint ad”, “Firm intake”). Live 112190 already matches the prototype strip. Paste the current header snippet if 113318’s strip should match before anyone turns the add-on off.
2. **113318 consent block** still has the pre-v4 paragraph in the builder. The add-on overwrites the visible words. Updating the builder checkbox to v4 keeps the preview honest if the add-on is off.
3. Do not delete the submit block, the TrustedForm script, the hidden fields, or step 8. Step 8 is skipped in the UI and posted blank. Deleting it is unnecessary.
4. Do not add steps. Lawyer and severance share `status_check`. California and age share the location step. The 1099 follow-up is not a builder step.
5. Webhook and the GHL `consent_text` value stay as they are. This file does not add a `consent_text` field.

## Offline test

`npm test` in this folder. Playwright injects `quiz.js` into `fixtures/built-113318.html` and `fixtures/live-112190-index.html` at 390×844, mocks every request (the quiz runtime is the saved file in `vendor/`), walks the hourly qualify path, the 1099 qualify path, and each of the 11 DQ paths, and checks the JSON LanderLab would POST to `/api/v2/leads/event`.

Last run: **3 passed** (built-113318 walk, live-112190 walk, `CONFIG.enabled` false). `quiz.js` md5 `77bb3abb8c5755543aa82468cdada55c`.

Phone screenshots are in `shots/`:

- built-113318: first screen through thank-you (`00`–`14`), the unchecked-consent error, the 1099 follow-up (`04b`), and all 11 DQ screens.
- live-112190: first screen, 1099 follow-up, consent, thank-you, and all 11 DQ screens.
