# Lemon Repair Check v1 (lrc-wa-v1.0)

Offline only. Nothing was pasted into LanderLab and nothing was sent.

## (1) For Ilan — qualification / DQ

- The warranty question is now "Did you pay for the repairs?" Helper: "Factory warranty, not an extended service contract."
- "No, it was under warranty" qualifies (`warranty_status=yes`, paid = none).
- "Some of them" qualifies (`warranty_status=yes`, paid = some).
- "Yes, I paid" is a DQ, same as the old "No" (`warranty_status=no`, reason `no_warranty_repair`, paid = yes).
- The old "Not sure" DQ answer is no longer offered. The `warranty_status=unsure` rule is still in the list and simply cannot be reached.
- The buy versus lease question is removed from the flow. It was never a DQ. `acquisition_type` stays blank.
- Defect is a single choice of four groups. It is never a DQ. The optional defect description is not shown and is left blank.
- ZIP is screen 2, with the same Washington range as before (98001–99403). A non-Washington ZIP can still DQ as `non_wa_zip`.
- Age and lawyer questions are unchanged.
- The button stays **Submit**. "Agree and Continue" would need a consent edit.
- Headline for his OK: "See how much you might be owed for your lemon." No dollar figure, and no "up to", "guarantee", "worth", or "estimate" outside the thin disclaimer.

Consent on the checkbox is wa-lemon-c2, word for word, from `inputs/consent_wa-lemon-c2.txt`.

## (2) For Joe — field values

- `acquisition_type` is always blank, so the buy-versus-lease value is omitted. No block was added or removed.
- `purchase_type` is still new, used, or cpo.
- `defect_category` arrives as one grouped comma list: `engine, transmission` or `electrical_battery, ev_battery_charging` or `brakes, steering_suspension, airbags_safety` or `something_else`.
- `defect_description` is blank.
- `warranty_status` is only `yes` or `no`.
- `lead_summary` adds `Paid for repairs: none|some|yes` (from `lrc_repair_paid`) and drops the acquisition part when it is blank.
- `consent_version` is `wa-lemon-c2`, with a new `consent_text` and `consent_hash`.
- `route_status` is `ok`, `dq`, `no_consent`, `incomplete`, or `hold_consent_mismatch`. It does not use a placeholder hold.
- `page_version` is `lrc-wa-v1.0`.

## Look

Firm-site shell in the spirit of the workers' comp v1l reference: sticky nav, hero on screen 1, white card, big percent bar, one question at a time. The buyback checklist sits in the card between the bar and the question and unlocks by answered count only (1, 3, 5, 7). It does not overlay the answers.

Header logo is `CONFIG.site.logoUrl` (`assets/lemon-repair-check_logo-horizontal_color.svg`), about 32px tall on mobile and 44px on desktop. Favicon is `assets/favicon.svg`. Text is ink `#1F2B33`. Lemon gold `#D4A017` is an accent only (bar and pill), not body text on white. Teal `#0B4F45` is the hero and the primary button. Page background is `#F4F7FB`.
