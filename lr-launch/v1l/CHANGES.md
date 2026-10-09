# lr-launch/v1l

Firm-site redesign of the Leading Response workers' compensation case review. `lr-launch/v1k` and `lr-launch/v1j` are not in this repo, so v1l was created from the launch spec rather than copied forward.

No LanderLab. The page is static HTML, CSS, and one module.

## Look

- Law-firm page, not a quiz skin: white header, serif wordmark, practice section, and a case-review card.
- One question per step. Each step has a hash (`#on-job`, `#federal`, `#attorney`, `#state`, `#zip`, `#incident`, `#description`, `#first-name`, `#last-name`, `#phone`, `#email`) and a **Copy step link** control.
- ZIP comes immediately after the state question. That step asks only for the ZIP code, and ZIP stays required.
- First name, last name, phone, and email stay one field per step. The email step holds the consent checkbox and the `lr-consent-v2` text, with an **Agree and Continue** button.
- Header text logo reads **My Employee Rights**. `TOM_LOGO` marks where Tom's logo file replaces the lockup.
- Hero photo is a CSS gradient (office light and a figure shape). `TOM_PHOTO` in `index.html` and `styles.css` marks where Tom's photograph replaces it.
- Hero: "Injured at work? You could be sitting on a huge settlement", with Free check, No commitment, and Pay nothing.
- Progress is a tall bar with a large percent.

## Kept from the Leading Response contract

- Disqualify unless the injury was on the job (Yes).
- Disqualify federal employees (answer must be No).
- Disqualify anyone who already has an attorney (answer must be No).
- Incident window is 2 years, and 1 year in Ohio. Dates on the cutoff still qualify. Future dates do not.
- Injury description must be at least 4 characters after trim.
- Qualifying states only: FL, GA, IL, PA, NC, OH.
- ZIP is required (5 digits, or ZIP+4).
- Consent token `CONSENT_PLACEHOLDER` is the live `lr-consent-v2` string. There is no second consent version.
- Incident chips write `mm/dd/yyyy` into the date field and the recorded-date output.
- A qualified save dispatches `brd-lead-saved` with the webhook payload. A disqualification does not.
- Webhook body keys are exactly the `GHL_LR_WEBHOOK_KEYS` set. Set the URL in `GHL_LR_WEBHOOK_URL` or the `ghl-lr-webhook` meta tag. An empty URL still saves locally and fires `brd-lead-saved` so the page can be reviewed without posting a lead.

## Files

- `index.html` — page
- `styles.css` — firm-site styles
- `quiz.js` — steps, qualification, consent, webhook
- `quiz.test.mjs` — contract tests
- `TEST.md` — how to verify
