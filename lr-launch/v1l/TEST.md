# Test lr-launch/v1l

Open `index.html` over HTTP (ES modules do not load from `file://` in every browser):

```bash
cd lr-launch/v1l
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

Automated contract checks:

```bash
node --test lr-launch/v1l/quiz.test.mjs
```

## What to look at

- Header text logo says **My Employee Rights**. Comments `TOM_LOGO` and `TOM_PHOTO` mark the logo and the hero photograph.
- Hero sentence is "Injured at work? You could be sitting on a huge settlement", followed by Free check, No commitment, and Pay nothing.
- One question is on screen. The percent in the bar is large. **Copy step link** copies a URL ending in the step hash.
- Shareable steps: `#on-job`, `#federal`, `#attorney`, `#state`, `#incident`, `#description`, `#first-name`, `#last-name`, `#phone`, `#email`, `#zip`.
- Contact stays one field per step, in this order: first name, last name, phone, email, ZIP. ZIP is still required and that step shows only the ZIP question.
- The email step shows the email field, the consent checkbox, and the `lr-consent-v2` paragraph. Its button reads **Agree and Continue**. Unchecked consent stays on the email step.

## Disqualification

These answers end the review and do **not** dispatch `brd-lead-saved`:

| Step | Answer | Reason code |
| --- | --- | --- |
| On the job | No | `on_job` |
| Federal employee | Yes | `federal` |
| Already has an attorney | Yes | `attorney` |
| State | Anything other than FL, GA, IL, PA, NC, OH | `state` |
| Incident date | Older than 2 years, or older than 1 year when the state is OH | `incident_window` |

These stay on the step until fixed (a lead is still not saved):

- Description shorter than 4 characters after trim.
- ZIP missing or not 5 digits / ZIP+4.
- Empty name, phone that is not 10 digits, or an invalid email.
- Consent unchecked.

Boundary dates use local calendar days. On a review dated 2026-10-09, `10/09/2024` qualifies in FL and does not qualify in OH. `10/09/2025` qualifies in OH. `10/08/2024` does not qualify in FL.

## Chips, consent, save

- On `#incident`, each chip fills the date box and **Recorded date** as `mm/dd/yyyy` (for example `10/09/2026`). ISO dates are rejected.
- The consent paragraph is on the email step. It starts as the token `CONSENT_PLACEHOLDER` in the HTML and is replaced with `lr-consent-v2`, word for word. The version attribute stays `lr-consent-v2`.
- A full qualifying path (on-job Yes, federal No, attorney No, a covered state, an in-window date, 4+ character description, ZIP, name, phone, email, consent) shows "We have your case check".
- `document.documentElement.dataset.brdLeadSaved` becomes `"true"`.
- The `brd-lead-saved` event `detail` contains only these keys: `first_name`, `last_name`, `email`, `phone`, `postal_code`, `state`, `on_the_job`, `federal_employee`, `has_attorney`, `incident_date`, `injury_description`, `consent_accepted`, `consent_version`, `quiz_version`.
- `incident_date` is `mm/dd/yyyy`. `consent_version` is `lr-consent-v2`. `quiz_version` is `lr-launch/v1l`. `phone` is 10 digits.
- With the webhook meta tag empty, nothing is posted. A non-empty `ghl-lr-webhook` meta tag or `GHL_LR_WEBHOOK_URL` POSTs that JSON. A failed response does not fire `brd-lead-saved`.
