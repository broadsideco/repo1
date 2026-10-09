# Builder edits for lrc-wa-v1.0

Paste `quiz.js` into LanderLab Quiz builder, Settings, Custom Code, JavaScript. Replace the whole box. Do not wrap it in HTML tags. Do not rename blocks and do not add or remove blocks. The script skips steps it no longer shows.

`quiz.css` is optional. The script injects its own theme. Rollback the new look by setting `CONFIG.site.on` to `false` and pasting again. That restores the native builder screens, including buy versus lease.

## Required

1. Replace the `consent_checked` checkbox label with the wa-lemon-c2 paragraph in `inputs/consent_wa-lemon-c2.txt` (the paragraph under the Version line, word for word). A link on the words "Privacy Policy" to `https://lemonrepaircheck.com/privacy` is fine. The script compares the visible text, not the HTML.
2. Leave the submit button label as **Submit**. The consent sentence names that button. Do not rename it to "Agree and Continue".
3. Leave `#brd-top-strip` on the page. The script hides `#brd-header` and `#brd-headline-band` only.

## Logo and favicon

Header logo and favicon URLs live on `CONFIG.site`:

- `logoUrl` is the one logo URL. It is currently `assets/lemon-repair-check_logo-horizontal_color.svg` (about 32px tall on mobile and 44px on desktop).
- `faviconUrl` is `assets/favicon.svg`.

Before go-live, host those two files from `assets/` and point the two constants at the hosted URLs. An empty `logoUrl` falls back to a small inline mark.

## What the script changes without a builder edit

- Buy versus lease stays in the builder and is left blank.
- ZIP is asked on the acquire step. The ZIP block still lives on `q14-contact`.
- Year, make, and model are one screen on `q4-year`. `q5-make` and `q6-model` are not shown.
- Defects are four groups written into the existing `defect_category` options. The description box stays blank.
- Contact is one native field per screen, then email plus the native consent box and the native Submit button.
- "Change my last answer" on not-qualified is unchanged.
