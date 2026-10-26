# QA Answers: "Account Information" Billing Widget

**Context.** A **global** SaaS company uses this widget to collect card payments. I reviewed it as a mock-up: what is on the screen, and also what should be there and isn't. I connected each finding to a real user, business or compliance impact.

**Severity scale**

| Severity | Meaning |
|----------|---------|
| **Critical** | Blocks payment for a large group of users, or creates direct fraud/compliance exposure. Release blocker. |
| **High** | Causes failed or incorrect payments, chargebacks, legal risk, or major conversion loss. |
| **Medium** | Noticeable friction, inconsistency, or a risk with a workaround. |
| **Low** | Cosmetic or minor polish. |

---

## a. Problems found

### Summary (sorted by severity)

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | No Country field: the address model is US-only | Internationalization / Functional | **Critical** |
| 2 | No CVV / security code field | Security & Compliance | **Critical** |
| 3 | No Strong Customer Authentication (3-D Secure) flow | Security & Compliance | **High** |
| 4 | Payment amount has no currency | Functional / i18n | **High** |
| 5 | Card data collected in plain page fields (PCI-DSS scope) | Security & Compliance | **High** |
| 6 | "State or Province" is required, but many countries have none | Internationalization | **High** |
| 7 | Postal code is required and "no dashes" | Internationalization / Validation | **High** |
| 8 | No protection against double submission | Functional | **High** |
| 9 | No recurring-billing / terms consent | Functional / Compliance | **High** |
| 10 | No protection against card-testing bots | Security | **High** |
| 11 | Payment amount may be trusted from the client | Security | **High** |
| 12 | Manual Card Type selector is redundant and can contradict the card number | Functional / Usability | **Medium** |
| 13 | "No dashes or spaces" pushes formatting work onto the user | Usability / Validation | **Medium** |
| 14 | Expiration Month not marked as required; no expiry validation rules | Validation | **Medium** |
| 15 | First / MI / Last name split doesn't fit the card or global names | i18n / Usability | **Medium** |
| 16 | "Continue" is ambiguous: no review step, no "Pay" wording | Usability | **Medium** |
| 17 | No autocomplete / input-mode attributes | Usability / Performance | **Medium** |
| 18 | Required state shown only by a red asterisk; unlabeled fields | Accessibility | **Medium** |
| 19 | Confusing visual layout and likely tab order | Usability / Accessibility | **Medium** |
| 20 | No defined error states, loading state or timeout handling | Usability / Performance | **Medium** |
| 21 | Single huge State list with no filtering | Performance / Usability | **Low** |
| 22 | Field widths don't fit real data | Usability | **Low** |
| 23 | Misleading title and a weak Cancel flow | Usability | **Low** |

---

### Functional / Business Logic

**1. No Country field: the address model is US-only. (Critical)**
The form asks for Street, City, "State or Province" and a numeric-style postal code, with no Country. For a *global* company this means:
- users outside the US/Canada cannot enter a valid billing address, so the payment is blocked or declined;
- Address Verification (AVS) cannot work correctly, so issuers decline more cards and fraud risk rises;
- the company cannot work out sales tax / VAT / GST, which is a legal and tax-compliance risk in the EU, UK, Australia and elsewhere.
This blocks revenue from every non-US market.

**4. Payment amount has no currency. (High)**
"30.00" could be USD, EUR, GBP or ILS. A global customer can't tell what they will be charged, and the bank statement may show a different amount (FX). This leads to disputes and chargebacks, and it conflicts with consumer-protection rules that require a clear total price. It also needs a defined format per locale (`30.00` vs `30,00`).

**8. No protection against double submission. (High)**
Nothing shows that "Continue" is disabled while the payment is processing, or that the backend uses an idempotency key. If the gateway is slow, users click twice or refresh, which can create **duplicate charges**, refunds, support tickets and chargebacks.

**9. No recurring-billing / terms consent. (High)**
This is a SaaS product, so the charge is probably a subscription. There is no billing period ("/month"?), no renewal disclosure, no Terms/Privacy checkbox or link, and no cancellation info. Auto-renewal laws (e.g. California ARL, EU consumer rules) require clear disclosure and consent. Without them, refunds and chargebacks ("I didn't agree to this") go up.

**12. Manual Card Type selector is redundant and can contradict the card number. (Medium)**
The card network can be detected from the first digits of the number (the BIN/IIN). A manual dropdown adds a step and lets the user pick "VISA" for a Mastercard number. The product must define what happens then (reject? override?). The list of supported networks also isn't clear: Amex, Discover, JCB, UnionPay, Maestro and others matter for a global audience.

**16. "Continue" is ambiguous: no review step, no "Pay" wording. (Medium)**
It isn't clear whether "Continue" charges the card or moves to a review page. Best practice is an explicit "Pay $30.00" button, or a confirmation step with an order summary. Otherwise users either hesitate (drop-off) or are surprised by the charge.

**23. Misleading title and a weak Cancel flow. (Low)**
The title "Account Information" describes *payment* details, not the account. "Cancel" has the same visual weight as the main action, sits right next to it, and probably throws away all entered data without asking.

### Security & Compliance (PCI-DSS)

**2. No CVV / security code field. (Critical)**
Card-not-present payments without a CVV/CVC:
- are declined more often by issuers;
- carry a **higher fraud risk**, because a stolen card number + expiry is enough to pay;
- shift more chargeback liability to the merchant.
(Note: PCI-DSS allows *collecting* the CVV for authorization but **forbids storing** it after authorization. The fix has to respect that.)

**3. No Strong Customer Authentication (3-D Secure) flow. (High)**
For European customers, PSD2 requires SCA (3-D Secure 2) on most online card payments. The widget doesn't show a challenge step or a redirect. Without SCA, EU/UK issuers will decline transactions, and fraud liability stays with the merchant.

**5. Card data collected in plain page fields (PCI-DSS scope). (High)**
If these inputs are rendered directly by the company's page, raw card numbers pass through the company's front end and maybe its servers. That puts the whole application in full PCI-DSS scope (SAQ D) and exposes card data to XSS or a malicious third-party script (Magecart-style skimming). Card fields should be hosted by a PCI-compliant provider (iframe or hosted fields), and the company should only receive a **token**. The card number should be masked after entry and must never be logged.

**10. No protection against card-testing bots. (High)**
There is no visible CAPTCHA or bot challenge, and nothing that suggests rate limiting. Payment forms are a classic target for "card testing": bots try thousands of stolen numbers with small amounts. That brings gateway fees, penalties from card networks and account suspension. It needs rate limiting per IP/account/card, bot detection, and velocity rules on the backend.

**11. Payment amount may be trusted from the client. (High)**
"30.00" is shown on the page. If the amount is sent back from the client with the form, an attacker can change it (e.g. to 0.01) in DevTools. The charged amount must come from the server, from the plan/price ID, and never from the submitted form.

### Internationalization (global SaaS)

**6. "State or Province" is required, but many countries have none. (High)**
The UK, France, Israel, Singapore and many other countries have no state/province in their postal addresses. A required dropdown forces users to pick a fake value or abandon the form. It should depend on the country and be optional where it doesn't apply.

**7. Postal code is required and "no dashes". (High)**
- Some countries have **no postal codes** (e.g. UAE, Hong Kong), so a required field blocks them.
- Many formats use **letters and spaces**: UK `SW1A 1AA`, Canada `K1A 0B1`, Netherlands `1012 AB`.
- Some formats **include a dash** by convention: Japan `100-0001`, Poland `00-950`, Brazil `01310-100`.
"No dashes" makes the user reformat their real code. Validation should be per country and accept the common formats, with normalization done on the backend.

**15. First / MI / Last name split doesn't fit the card or global names. (Medium)**
The card has a single "Name on card" line. Many people have no middle name, use one name only (mononyms, e.g. common in Indonesia), have several family names (Spanish/Portuguese), or put the family name first (Chinese, Japanese, Hungarian). A **required Last Name** blocks people with one name. "MI" is a US-specific abbreviation. A single "Name on card" field is simpler and more accurate. Non-Latin characters must be supported too.

### Usability / UX

**13. "No dashes or spaces" pushes formatting work onto the user. (Medium)**
People naturally type the number in groups as printed (`4111 1111 1111 1111`). The form should accept spaces and dashes, strip them automatically, and ideally show the number grouped as the user types. Rejecting input the system could easily clean up is avoidable friction on the most important field.

**19. Confusing visual layout and likely tab order. (Medium)**
The two-column layout mixes payment and address data: Payment Amount and Expiration sit on the right next to Card Number, and "Cardholder Name" is a heading on the left above a row that spans both columns. Expiration is far from the card number, so keyboard users will probably jump back and forth between columns. The second address line also has no label.

**20. No defined error states, loading state or timeout handling. (Medium)**
The mock-up doesn't show inline validation, error messages, what happens on a declined card, a spinner/"Processing…" state, or what happens on gateway timeout or network loss. These states drive most of the support load and the drop-off on payment screens.

**22. Field widths don't fit real data. (Low)**
The Postal Code box is very short (international codes can have up to 10 characters including spaces). The Card Number box should fit up to 19 digits. MI is a very small field with an unclear purpose.

### Validation

**14. Expiration Month not marked as required; no expiry validation rules. (Medium)**
Only Year has an asterisk, but a card can't be charged without the month. That's inconsistent and confusing. The rules also need to be defined:
- the year list should start at the current year and cover about 15–20 years ahead;
- a month/year in the past (e.g. last month of this year) must be rejected *before* sending to the gateway;
- the card number must be checked for length per network and with the **Luhn checksum** on the client, so that obviously invalid numbers never reach the gateway.

### Accessibility

**18. Required state shown only by a red asterisk; unlabeled fields. (Medium)**
- "Required" is shown by a red asterisk only. Screen readers need `aria-required` / `required`, and color shouldn't be the only signal (WCAG 1.4.1).
- Address line 2 has no visible label, and "MI" is unclear for screen-reader users.
- Labels such as "Month"/"Year" must be tied to their selects in code (`<label for>`), and errors must be announced (`aria-live`, `aria-describedby`).
- The grey text and borders on a light textured background look low-contrast (WCAG 1.4.3 / 1.4.11).

### Performance

**17. No autocomplete / input-mode attributes. (Medium)**
Without `autocomplete="cc-number"`, `cc-exp-month`, `cc-name`, `postal-code` etc., browsers and password managers can't autofill. That is the biggest speed boost for completing a payment form, especially on mobile. `inputmode="numeric"` should open the number keypad on mobile.

**21. Single huge State list with no filtering. (Low)**
If "Select a state" lists every state/province worldwide (thousands of entries), it is slow to render and almost impossible to use. The list should be loaded based on the chosen country (see #1) and support type-ahead.

**Additional performance notes (not shown in the mock-up, but they should be tested):**
- The response time of the "Continue" round trip (tokenization → authorization → 3-DS) should be measured against an SLA, e.g. p95 under 3 seconds before the challenge.
- Third-party payment scripts should load asynchronously so they don't block page render.
- The widget should behave well on slow 3G and on mobile screens.

---

## b. Sample test cases

Test cards are standard gateway sandbox numbers (e.g. `4111 1111 1111 1111` is a valid-Luhn Visa test card).

### TC-01: Successful payment with a valid Visa card (positive, end to end)

| Field | Value |
|-------|-------|
| **Priority** | P1 – Critical |
| **Type** | Positive / E2E |
| **Preconditions** | 1. User is logged in and has picked a plan priced 30.00 USD. 2. Payment gateway is in sandbox mode. 3. The billing widget is open. |
| **Test Data** | Card Type: VISA · Card Number: `4111111111111111` · Expiration: `12` / current year + 2 · First Name: `Jane` · Last Name: `Doe` · Address: `350 Fifth Avenue` · City: `New York` · State: `New York` · Postal Code: `10118` |

**Steps**
1. Check that Payment Amount shows `30.00`.
2. Select **VISA** in Card Type.
3. Enter the card number, then select the expiration month and year.
4. Enter First Name and Last Name. Leave MI empty.
5. Enter Street Address line 1. Leave line 2 empty.
6. Enter City, select State, and enter Postal Code.
7. Click **Continue** once.

**Expected Result**
- No validation errors appear for any field. The optional fields (MI, Address line 2) are accepted empty.
- While processing, **Continue** is disabled and a loading indicator is shown.
- The user lands on a success/confirmation page that shows the amount charged (30.00) and a masked card (`•••• 1111`).
- The gateway sandbox has **exactly one** authorization for 30.00 for this order.
- The DB/logs hold only a payment token and the last 4 digits. They do **not** hold the full card number or the expiry in plain text.
- A receipt email is sent to the account email.

---

### TC-02: Card number fails the Luhn check and an expired date is rejected (negative / validation)

| Field | Value |
|-------|-------|
| **Priority** | P1 – High |
| **Type** | Negative / Field validation |
| **Preconditions** | The billing widget is open. All other required fields are filled with valid data (as in TC-01). |
| **Test Data** | Set A, invalid Luhn: `4111111111111112` with a valid future expiry. · Set B, expired card: `4111111111111111` with Expiration = the previous month of the current year (or previous year if it's January). · Set C, letters: `4111abcd11111111`. |

**Steps**
1. Enter the Set A card number and move focus out of the field (blur).
2. Click **Continue**.
3. Fix the number to `4111111111111111`, then set the Set B expiration.
4. Click **Continue**.
5. Enter the Set C value in Card Number.

**Expected Result**
- **Step 1–2:** An inline error shows next to Card Number, e.g. "Please enter a valid card number". The form is **not** submitted, and no request reaches the payment gateway (check the network tab / gateway logs).
- **Step 3–4:** An inline error shows on Expiration, e.g. "This card has expired". The form is not submitted.
- **Step 5:** Letters are blocked or immediately flagged as invalid.
- Errors are announced to screen readers (`aria-live` / `aria-describedby`), and focus moves to the first invalid field.
- All other entered data is kept. Nothing is cleared after the error.

---

### TC-03: Billing address in a country without states and with alphanumeric postal codes (edge / international)

| Field | Value |
|-------|-------|
| **Priority** | P1 – High |
| **Type** | Edge / Internationalization |
| **Preconditions** | The billing widget is open. The user is in the UK (browser locale `en-GB`). Valid card data as in TC-01. |
| **Test Data** | Name: `Ólafur O'Brien-Smith` · Address: `10 Downing Street` · City: `London` · Postal Code: `SW1A 2AA` (letters + space) · State/Province: *(none applies in the UK)* |

**Steps**
1. Fill in the valid card details.
2. Enter the name with an accent, an apostrophe and a hyphen.
3. Enter the UK address and city.
4. Open **State or Province** and look for a valid UK option.
5. Enter the postal code `SW1A 2AA` exactly as written.
6. Click **Continue**.

**Expected Result** (based on the requirement that a global product accepts valid international addresses)
- The name is accepted and saved exactly as entered, with no garbled characters.
- The State/Province field is **not required** for the UK (or is hidden, or shows UK-relevant options).
- `SW1A 2AA` is accepted. The space is allowed, or normalized silently. The user is not told to remove characters.
- The payment succeeds, and the billing address is passed to the gateway with country = `GB` for AVS.
- The amount shows its currency clearly.

**Actual result on the current mock-up (expected to fail):** there is no Country field, State/Province is required, and the postal code hint says "(no dashes)". So a UK user can't enter a valid address. This test confirms finding #1 / #6 / #7.

---

## c. Product solution for the most severe issue

### The issue: no Country field, so the address model is US-only (Finding #1)

#### Why I rank this as the most severe

| Factor | Impact |
|--------|--------|
| **Revenue** | It blocks or degrades payment for **every non-US customer** of a *global* SaaS company. If 40–60% of traffic is international, a large part of revenue is lost at the last step of the funnel, after the costly acquisition work is already done. |
| **Approval rates** | Without a country, the gateway can't run Address Verification (AVS) properly. Issuers decline more legitimate international cards, so even users who "get through" by entering fake values fail. |
| **Fraud & data quality** | Users who can't enter a real address make one up (fake state, "00000" postal code). The billing data becomes garbage, and fraud rules lose a key signal. |
| **Tax compliance** | The billing country decides VAT/GST (EU, UK, Australia, etc.). Without it the company can't charge or report tax correctly. That is a **legal** exposure, not only a UX problem. |
| **Scope** | It also causes findings #6 (required State), #7 (postal code format) and #21 (huge State list). One fix solves four issues. |

The missing CVV (#2) is also critical. But it raises *risk* on payments that do go through, while the missing Country *prevents* payments for whole markets. It also has a simpler fix (add one field). So the Country issue has the larger business impact.

#### Proposed solution: a country-aware billing address

**UI changes**
1. Add a required **Country** dropdown as the **first** address field.
   - Pre-select it from the user's account country or IP geolocation. The user can change it.
   - It is searchable (type-ahead) and lists the countries the company sells to.
2. **Dynamic address fields** based on the selected country, using a standard address-format dataset (e.g. Google's libaddressinput / CLDR):
   - **State/Province/Region:** shown and required only where it applies (US, CA, AU, BR, IN…). It is hidden for the UK, IL, FR, SG etc. The label follows the country ("State", "Province", "County", "Prefecture").
   - **Postal code:** the label follows the country ("ZIP code", "Postcode", "PIN code"). It accepts letters, spaces and dashes, has a matching placeholder (e.g. `SW1A 1AA`), and is optional for countries without postal codes.
   - The field order follows the country's usual address order.
3. Remove the "(no dashes)" hint. The system normalizes the format.
4. Show the **currency** next to the amount (e.g. "USD 30.00", or the local currency if supported), plus tax where it applies: "Subtotal 30.00 + VAT 20% 6.00 = Total 36.00 GBP". This answers finding #4 too.
5. Add `autocomplete` attributes (`country`, `address-line1`, `postal-code`…) so browser autofill fills the whole address in one click.

**Backend changes**
1. Add `billing_country` (ISO 3166-1 alpha-2) to the billing API and DB. It is **required**.
2. Validate the address on the server with the same per-country rules as the client. The client checks are for UX only, and the server is the source of truth.
3. Normalize postal codes (upper-case, standard spacing) before saving and before sending to the gateway.
4. Pass the full address with country to the payment gateway for **AVS**. Configure AVS rules per region, since many non-US issuers return "AVS not supported", which must not cause a decline.
5. Use the billing country to calculate **tax** (VAT/GST/sales tax) through a tax engine, and show it before the charge.
6. Roll out behind a **feature flag**, starting with a small percentage of traffic, and monitor approval rates.

**How it improves conversion and security**
- **Conversion:** international users can finish payment with their real address. Fewer fields for countries that don't need them, plus autofill, means faster checkout and less abandonment.
- **Approval rate:** correct AVS data leads to fewer false declines from issuers.
- **Security/fraud:** a real billing country enables risk signals such as "card country ≠ billing country ≠ IP country".
- **Compliance:** correct tax collection and clear total-price display.

#### Acceptance criteria

1. A **Country** field is present and required. It is pre-filled from the account/IP and can be changed.
2. Choosing **United States** shows a required "State" list with US states only, and a "ZIP code" field that accepts `12345` and `12345-6789`.
3. Choosing **United Kingdom** hides State/Province, and the "Postcode" field accepts `SW1A 1AA` and `sw1a1aa` (saved as `SW1A 1AA`).
4. Choosing **Canada** shows "Province" (Canadian provinces only), and the postal code accepts `K1A 0B1`.
5. Choosing a country without postal codes (e.g. **Hong Kong**) makes the postal code optional or hidden.
6. Changing the country clears and re-validates the fields that depend on it, and keeps Street and City.
7. Invalid formats show an inline, country-specific error. The server rejects the same invalid input with a clear error, even if the client check is bypassed (API test).
8. The gateway request includes `billing_country` and the full address (checked in sandbox logs).
9. The amount is always shown with its currency, and tax lines appear for countries that need them.
10. Regression: the US payment flow (TC-01) still passes, and the approval rate for US traffic doesn't drop.
11. **Success metrics after release:** checkout completion rate for non-US users goes up, and the "AVS mismatch" decline rate goes down, compared to the baseline, measured over 2–4 weeks with an A/B rollout.

#### How I would verify the fix

- **Data-driven automated tests** (Playwright, parametrized by country): one row per country with valid and invalid addresses: US, CA, UK, DE, FR, JP, BR, IL, HK, AU.
- **API tests** for server-side validation and for the gateway payload.
- **Sandbox payments** with test cards issued in different countries, to check AVS responses and approvals.
- **Accessibility check** of the dynamic fields: changes are announced, and labels update.
- **Monitoring** after release: dashboards for approval rate and checkout drop-off per country.
