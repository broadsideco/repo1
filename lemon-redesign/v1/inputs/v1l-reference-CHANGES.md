# LR WC quiz v1l: ZIP after state + consent on the email step (OFFLINE, Thu 10/8/2026 ~8:45 PM PT)

Tom: put the consent on the last contact field (like justiceguys' email step, "Agree and Continue"), and ask ZIP right
after the state question. Nothing was pasted into LanderLab and nothing was sent.

- **File:** `v1l/quiz.js`, 179974 bytes, md5 `41621b0c057359ddba20711fee728aff` (from contact-split build `b7a44f45aef14f258d1d6fca16483f09`, kept as `quiz.js.bak-pre-consentemail`)
- **Diff:** `quiz.js.zipmove-consentemail.diff`
- **New order (11 screens):** ... date, state, **ZIP**, what happened, first name, last name, phone, **email + consent**.
- **ZIP screen:** on the q-description builder step, before the textarea (same step, so DQ/routing untouched). Required: 5 digits,
  a real ZIP, and in the chosen state (same rule as validateContact, incl. test ZIP 96950 only with the test token). Value
  goes into the builder `zip` block in the contact step (hidden there), so the webhook key is unchanged.
  Mismatch message: "That ZIP looks like it's in Ohio, but you picked Florida. Please check your ZIP, or go Back to change your state."
  Safety net: if ZIP is somehow invalid/mismatched at submit, the visitor goes back to the ZIP screen.
- **Email screen:** email field, lr-consent-v2 checkbox (word for word; test checks shown text == CONSENT_CHECKBOX_LABEL,
  consent_version lr-FL-consent-v2, hash b482f922), Privacy / No-thanks links, and #brd-submit relabeled **"Agree and Continue"**.
  Box still required (onSubmit's own error if unchecked; it clears when the box is checked).
- Failed-save message now says "Please press Continue to try again." (was "...press Submit again").
- **Tests:** unit 264/264, v1k 53/53, repro/run-v1l-zipstate.out.txt (full FL walk, mocked POSTs, thank-you, brd-lead-saved x1,
  69 keys, zip=32801), repro/run-v1l-zipstate-badzip.out.txt (bad ZIP at submit -> ZIP screen).
- **Shots (`shots/`):** v1l-11a-zip-after-state.png, v1l-11b-zip-mismatch.png, v1l-11c-zip-filled.png, v1l-12-description.png,
  v1l-13a-contact-1-first.png, v1l-13d-email-consent.png, v1l-13e-email-consent-error.png, v1l-13f-email-consent-checked.png,
  v1l-08-after-submit.png. Old 5-screen contact shots moved to shots/pre-zipmove/.

---

# v1l update: contact split into ONE FIELD PER SCREEN (OFFLINE, Thu 10/8/2026 ~8:45 PM PT)

Tom liked the firm-site look. The only change he asked for: make the end of the funnel go question by question, like
justiceguys, instead of one contact form that feels like an official submission. Offline only. Nothing was pasted into
LanderLab and nothing was sent.

- **File:** `v1l/quiz.js`, 167598 bytes, md5 `b7a44f45aef14f258d1d6fca16483f09` (built from v1l `8dc5629ddbd3a7e1cec2161e57166e81`, saved as
  `quiz.js.bak-pre-contactsplit`). Diff: `quiz.js.contactsplit.diff`.
- **Screens (one field each, big orange Continue, small "← Back"):**
  1. What's your first name?
  2. What's your last name?
  3. What's a good number to reach you at?
  4. What's your email?
  5. What's your ZIP code? This screen also shows the lr-consent-v2 checkbox and the big Submit button.
- Each Continue checks only that field, using the same validators the submit uses (name 2+ letters, valid 10-digit US
  phone, email format, 5-digit ZIP). Enter key = Continue. Back keeps what was typed. Back on screen 1 returns to "What happened?".
- **Progress bar:** the contact step now counts as 5 steps, so the flow is "Step n of 11". Example: q-onjob 8%, first
  name 58%, ZIP 92% "Last step!".
- **ZIP stays required** and is still checked against the state at submit. A mismatch shows on the ZIP screen, next to
  the field (shot 07b). Coming back to contact with everything filled (ZIP fix or a failed save) opens the ZIP screen.
- **How:** LanderLab still has ONE contact step. The new add-on at the end of quiz.js hides all but one field per screen.
  The only edit to existing code is in the v1k progress helper: it now counts contact as 5 steps and exposes `progress()`.
  Rollback: `CONFIG.v1l.contactSplit = false` brings back the one-page contact form.
- **Fixed along the way:** on the old one-page contact, LanderLab's own "← Back" link did not navigate offline, even
  before this change. It's hidden now, and our Back uses the runtime's goBack.
- **Unchanged:** consent text (shown == CONSENT_CHECKBOX_LABEL, `lr-FL-consent-v2`, hash b482f922), DQ/routing/windows,
  webhook (69 keys), chips → real mm/dd/yyyy, description 4+ chars, onSubmit, brd-lead-saved (fired once on a mocked 200).
- **Tests:** tests/unit-test.out.txt 264/264, tests/v1k-test.out.txt 53/53, repro/run-v1l-fl.out.txt (full FL walk to
  thank-you with mocked POSTs), repro/run-v1l-zipmismatch.out.txt.
- **New shots (390px phone, full page, `v1l/shots/`):** v1l-06a-contact-1-first.png, v1l-06b-contact-2-last.png,
  v1l-06c-contact-3-phone.png, v1l-06d-contact-4-email.png, v1l-06e-contact-5-zip.png, plus v1l-06c2-contact-3-phone-error.png,
  v1l-07-contact-5-zip-consent.png, v1l-07b-zip-mismatch.png, and v1l-08-after-submit.png. The old one-page contact shots
  were moved to shots/pre-split/.
- Still open from v1l: confirm the stock photo license and re-host it, and get Ilan's OK on the final consent before go-live.

---

# LR WC quiz v1l: firm-site look (OFFLINE build, Thu 10/8/2026 ~8:20 PM PT)

Tom on v1k: "still feels like a quiz." He wants it to feel like the sample (workerscompcounsel.com/case-evaluation/):
a professional company website, one easy question at a time. This build is offline only. Nothing was pasted into LanderLab
and nothing was sent.

- **File:** `v1l/quiz.js`, 154424 bytes, md5 `8dc5629ddbd3a7e1cec2161e57166e81` (built from v1k `03221c5e7ff925d80dad172d1b7cd063`)
- **Diff:** `v1l/quiz.js.v1k-to-v1l.diff`. The only changes are a new `CONFIG.v1l` block, a header note, and one add-on appended at the end.
- **head.html / footer.html / quiz.css / consent_text-v2.txt:** byte-identical to v1k
- **Rollback:** set `CONFIG.v1l.site = false` to get the v1k look back, or paste v1k/quiz.js.

## What we took from the sample
- **Header:** dark nav with the firm logo, menu links, and a "Consult Now" button.
- **Hero:** a full-width photo with a dark overlay, a pill badge, the "Injured at Work? You Could Be Sitting on a Huge Settlement" headline, and a "free, no commitment, pay nothing" subline.
- **Card:** a white rounded card that overlaps the hero, with a thick percent bar ("10%") at the top and one numbered question ("1. Were you injured at work?") with Yes/No buttons and Next.
- **Trust:** "100% Privacy Guaranteed" under the card, then a row of Yelp/Google/Trustpilot ratings.
- **Not copied on purpose:** ">98% of our clients win", the 5-star badges, "major payout", and the fake firm menu (Our Services / Contact Us). We can't back those up, and My Employee Rights is not a law firm.

## v1l changes (all visual or marketing copy)
1. **Top nav (sticky, white):** My Employee Rights logo (600w PNG inlined as a data URI, about 18 KB, so it needs no hosting) on the left. Links on the right: "How it works" (anchor, desktop only) and "Privacy" (workinjuryquestions.com/privacy). Set from `CONFIG.v1l.navLinks` / `logoUrl`.
2. **Photo hero (first screen):** full width, a stock office photo of people in suits at a contract signing, a navy overlay, a "Free workers' comp case evaluation" pill, the "INJURED AT WORK?" kicker, "You could be sitting on a **huge settlement.**", and "Answer a few quick questions, one at a time. Free, confidential, no commitment. You pay nothing." The headline still says "could" and gives no amount, per Ilan. A small "Stock photo" label sits top right.
3. **Later steps:** the hero shrinks to a slim "Free Case Evaluation" photo band, so each question stays above the fold. Thank-you and DQ pages also get the slim band. The page scrolls to the top on each step.
4. **Card:** the v1k big percent bar is now the top of a white card (40px number, 20px bar), and the question is the bottom of the same card, overlapping the hero like the sample. It's still one question per screen, and the builder's own headline is hidden on step 1 because the hero carries it.
5. **Under the card:** "Your information is private and secure." On the first screen only, a 3-step "How it works": Answer a few questions / Your answers are checked / If you qualify, a workers' comp attorney may reach out.
6. Light corporate palette (#F4F7FB page, white cards, navy text, orange accent). The v1k light theme is unchanged.

## Unchanged (verified offline: tests/unit-test.out.txt 264/264, tests/v1k-test.out.txt 53/53, repro/run-v1l-fl.out.txt)
- **Consent:** lr-consent-v2 word for word. The test checks the shown text against `CONSENT_CHECKBOX_LABEL`, and `consent_version` is `lr-FL-consent-v2`. There's no settlement language near the consent.
- **DQ, states, windows, and evaluateAnswers:** untouched. These are v1k code paths.
- **ZIP:** still required (5 digits) and still checked against the state.
- **Webhook:** 69 keys, the same as v1k.
- **Chips to date:** the "2-6 months" chip, then Aug, gives incident_date 08/15/2026.
- **Description:** "abc" (3 chars) is blocked, and 4 or more characters passes.
- **brd-lead-saved:** fires once, on a mocked 200.

## Before launch / open items
- **Photo hosting:** the photo is Unsplash `photo-1758518731462-d091b0b4ed0d` ("Business people signing a contract at a table"). It came from a free-license-filtered search, but I could not open the photo page to confirm the license. Before launch, confirm the free Unsplash License and re-host the file on our CDN, then set `CONFIG.v1l.heroImg`. Setting heroImg to '' gives a plain navy hero.
- **Ilan, FYI:** the page now looks like a firm site, with a lawyer-style photo and "attorney may reach out." The footer still says it's an advertisement and that Broadside is not a law firm, and the photo is labeled "Stock photo." Ask Ilan whether he wants any more disclosure near the hero. Consent text is unchanged, and he still needs to OK the final consent before go-live.

## Shots (`v1l/shots/`, 390px phone unless noted)
- v1l-00-mobile-firstscreen.png: the first screen on a phone, above the fold
- v1l-00-desktop-firstscreen.png / v1l-00-desktop-step2.png: 1280px
- v1l-01-hero.png (full page), v1l-02-federal.png, v1l-03-date-chips.png, v1l-04-date-months.png, v1l-05-description.png, v1l-06-contact-empty.png, v1l-07-contact-filled.png, v1l-08-after-submit.png
