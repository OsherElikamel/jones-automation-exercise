# Jones Automation Exercise

Playwright + Mocha automation for the lead form at <https://test.netlify.app/>, plus answers to the billing-widget QA questions.

## What the test does

1. Launches Chromium and opens the site.
2. Fills **Name**, **Email**, **Phone**, **Company** and **Website**.
3. **Bonus:** changes **Number of Employees** from `1-10` to `51-500` and asserts the new value is selected.
4. Saves a full-page screenshot to `screenshots/before-submit-<timestamp>.png`.
5. Clicks **Request a call back**.
6. Waits for the Thank You page (URL `thank-you.html` **and** the visible "Thank You!" heading), asserts the submitted name and employee count, and logs:
   `✅ Reached Thank You page: <url>`

If the test fails, Mocha reports the failed step and the test saves `screenshots/error-<timestamp>.png`.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) 18 or later (tested on Node 24, Playwright 1.64, Mocha 12)

## Install

```bash
npm install
npx playwright install chromium
```

On a fresh Linux/WSL machine, Chromium may also need system libraries: `sudo npx playwright install-deps chromium`.

## Run

```bash
npm test              # headless
npm run test:headed   # visible browser window
```

### Example output

```
  Jones lead form
    Screenshot saved: screenshots/before-submit-2026-10-26T14-59-55-190Z.png
    ✅ Reached Thank You page: https://test.netlify.app/thank-you.html?name=Jane+Doe&...&number_of_employees=51-500
    ✔ submits the form with 51-500 employees and reaches the Thank You page (1482ms)

  1 passing
```

An example screenshot from a real run is in [`screenshots/example-before-submit.png`](screenshots/example-before-submit.png).

## Project structure

| File | Purpose |
|------|---------|
| `test/lead-form.test.js` | The automation flow. Test data lives in the `testData` object at the top. |
| `screenshots/` | Screenshots from each run (git-ignored, except the example). |
| `QA_Answers.md` | Answers to the billing-widget QA questions. |

## Implementation notes

- **Mocha:** the flow is a Mocha test with `node:assert`, so a broken step fails the run with a clear message and a non-zero exit code (ready for CI).
- **Selectors:** accessible locators only (`getByLabel`, `getByRole`). No XPath or CSS position selectors.
- **No fixed sleeps:** the test relies on Playwright's auto-waiting plus explicit waits (`waitForURL`, heading visibility).
- **Website field:** it is an `<input type="url">`, so the value includes `https://`. Without it, the browser's built-in validation would block the submit.
- **Observation:** the form submits with `GET`, so the user's name, email and phone end up in the Thank You page URL (browser history, server logs, analytics, referrers). In a real product I would report this as a privacy bug.
