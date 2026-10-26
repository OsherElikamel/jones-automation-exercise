/**
 * Jones Automation Exercise
 *
 * Fills the lead form on https://test.netlify.app/, switches "Number of Employees"
 * to 51-500, takes a full-page screenshot, submits, and confirms the Thank You page.
 *
 * Run:  npm test              (headless)
 *       npm run test:headed   (visible browser)
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://test.netlify.app/';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const HEADED = process.argv.includes('--headed');

const testData = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '+1 555 123 4567',
  company: 'Acme Testing Ltd.',
  // The field is <input type="url">, so the browser rejects a value without a scheme.
  website: 'https://www.example.com',
  employees: '51-500',
};

// Filesystem-safe timestamp, e.g. 2026-10-26T09-15-30-123Z
const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const screenshot = async (page, name) => {
  const file = path.join(SCREENSHOTS_DIR, `${name}-${timestamp()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(process.cwd(), file);
};

describe('Jones lead form', function () {
  this.timeout(60_000);

  let browser;
  let page;

  before(async () => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    browser = await chromium.launch({ headless: !HEADED });
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      const file = await screenshot(page, 'error').catch(() => null);
      if (file) console.error(`    Error screenshot: ${file}`);
    }
    await page.close();
  });

  after(async () => {
    await browser?.close();
  });

  it('submits the form with 51-500 employees and reaches the Thank You page', async () => {
    await page.goto(BASE_URL);

    await page.getByLabel('Name *').fill(testData.name);
    await page.getByLabel('Email *').fill(testData.email);
    await page.getByLabel('Phone *').fill(testData.phone);
    await page.getByLabel('Company').fill(testData.company);
    await page.getByLabel('Website').fill(testData.website);

    const employees = page.getByRole('combobox', { name: 'Number of Employees' });
    await employees.selectOption(testData.employees);
    assert.equal(await employees.inputValue(), testData.employees);

    console.log(`    Screenshot saved: ${await screenshot(page, 'before-submit')}`);

    await page.getByRole('button', { name: 'Request a call back' }).click();

    // Confirm both the navigation and the visible content, not just one of them.
    await page.waitForURL(/\/thank-you\.html/);
    await page.getByRole('heading', { name: 'Thank You!' }).waitFor();

    // The form submits with GET, so the URL shows what the server actually received.
    const submitted = new URL(page.url()).searchParams;
    assert.equal(submitted.get('name'), testData.name);
    assert.equal(submitted.get('number_of_employees'), testData.employees);

    console.log(`    ✅ Reached Thank You page: ${page.url()}`);
  });
});
