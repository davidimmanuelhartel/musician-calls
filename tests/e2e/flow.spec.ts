import { test, expect, type Page } from '@playwright/test';

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
);
async function signIn(page: Page, email: string, next = '/en/ensembles') {
  let messageId = '';
  await expect
    .poll(async () => {
      const result = await page.request.get('http://127.0.0.1:55324/api/v1/messages');
      const data = await result.json();
      messageId =
        data.messages.find((message: { ID: string; To: { Address: string }[] }) =>
          message.To.some((to) => to.Address === email),
        )?.ID || '';
      return messageId;
    })
    .not.toBe('');
  const message = await (
    await page.request.get(`http://127.0.0.1:55324/api/v1/message/${messageId}`)
  ).json();
  const link = message.HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  expect(link).toContain('/auth/confirm');
  await page.goto(link);
  await page.waitForURL(`**${next}`);
}

test('mobile: bilingual draft, PDF, verified publish, anonymous response, selection', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const suffix = crypto.randomUUID().slice(0, 8);
  const organizer = `organizer-${suffix}@example.com`;
  await page.goto('/en/calls/new');
  await expect(page).toHaveURL(/\/en\/login/);
  await page.getByLabel('Email').fill(organizer);
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible();
  await signIn(page, organizer);
  await page.getByRole('link', { name: 'Create an ensemble', exact: true }).click();
  await page.getByLabel('Ensemble name').fill(`Test Orchestra ${suffix}`);
  await page.getByLabel('Venue / location').fill('Frederiksberg Musikhus');
  await page.getByRole('combobox', { name: 'Compensation', exact: true }).selectOption('paid');
  await page.getByLabel('Amount').fill('800');
  await page.getByLabel('Your name').fill('Test Organizer');
  await page.getByRole('button', { name: 'Create an ensemble', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Test Orchestra ${suffix}`, exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Find a substitute', exact: true }).last().click();
  await expect(page.getByLabel('Ensemble name')).toHaveCount(0);
  await expect(page.getByLabel('Your name')).toHaveCount(0);
  await page.getByLabel('Instrument', { exact: false }).selectOption('trombone');
  await page.getByLabel('Position / chair').fill('2nd Trombone');
  await page.getByLabel('Date', { exact: false }).fill(tomorrow);
  await page.getByLabel('Call time').fill('16:30');
  await page.getByLabel('Performance time').fill('19:30');
  await page
    .getByLabel('Add PDFs')
    .setInputFiles({ name: 'Beethoven5.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByText('Your draft is saved on this device.')).toBeVisible();
  await page.getByRole('link', { name: 'DA', exact: true }).click();
  await expect(page.getByLabel('Stemme / plads')).toHaveValue('2nd Trombone');
  await expect(page.getByText('Beethoven5.pdf', { exact: false }).first()).toBeVisible();
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page.getByLabel('Position / chair')).toHaveValue('2nd Trombone');
  await page.route('**/storage/v1/object/call-pdfs/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Simulated upload failure' }),
    }),
  );
  await page.getByRole('button', { name: 'Publish call', exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('A PDF could not be uploaded.');
  await expect(page).toHaveURL(/\/en\/calls\/new\?ensemble=/);
  await expect(page.getByText('Beethoven5.pdf', { exact: false }).first()).toBeVisible();
  await page.unroute('**/storage/v1/object/call-pdfs/**');
  await page.getByRole('button', { name: 'Publish call', exact: true }).click();
  await expect(page.getByText('Call published', { exact: false }).first()).toBeVisible();
  const callId = new URL(page.url()).pathname.split('/').pop()!;
  await expect(page.getByText('800 DKK', { exact: true })).toBeVisible();
  const musician = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await musician.newPage();
  await mp.goto(`${process.env.APP_URL}/da/calls/${callId}`);
  await expect(mp.locator('html')).toHaveAttribute('lang', 'da');
  const link = mp.getByRole('link', { name: 'Beethoven5.pdf' });
  const pdfResult = await mp.request.get((await link.getAttribute('href'))!);
  expect(pdfResult.status()).toBe(200);
  expect((await pdfResult.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await mp.getByRole('button', { name: 'Jeg kan spille', exact: true }).click();
  await mp.getByLabel('Dit navn').fill('David Musician');
  await mp.getByLabel('E-mail').fill(`musician-${suffix}@example.com`);
  await mp.getByLabel('Besked').fill('I can arrive at 16:15.');
  await mp.getByRole('button', { name: 'Send svar', exact: true }).click();
  await expect(mp.getByText('Tak, fordi du vil spille med.')).toBeVisible();
  const stale = await musician.newPage();
  await stale.goto(`${process.env.APP_URL}/da/calls/${callId}`);
  await stale.getByRole('button', { name: 'Jeg kan spille', exact: true }).click();
  await stale.getByLabel('Dit navn').fill('Late musician');
  await stale.getByLabel('E-mail').fill(`late-${suffix}@example.com`);
  await page.goto(`/en/dashboard/${callId}`);
  await expect(page.getByRole('heading', { name: 'David Musician', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select musician', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm selection', exact: true }).click();
  await expect(page.getByText('Position filled', { exact: true })).toBeVisible();
  await stale.getByRole('button', { name: 'Send svar', exact: true }).click();
  await expect(stale.locator('main [role="alert"]')).toContainText(
    'Dette opslag modtager ikke længere svar.',
  );
  await mp.reload();
  await expect(mp.getByText('Pladsen er besat', { exact: true })).toBeVisible();
  await expect(mp.getByRole('button', { name: 'Jeg kan spille', exact: true })).toHaveCount(0);
  await mp.goto(`${process.env.APP_URL}/en`);
  await expect(mp.getByText(`Test Orchestra ${suffix}`, { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await musician.close();
});

test('language detection, remembered choice, desktop and mobile layouts', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'da-DK' });
  const page = await context.newPage();
  await page.goto(`${process.env.APP_URL}/`);
  await expect(page).toHaveURL(/\/da$/);
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await page.goto(`${process.env.APP_URL}/`);
  await expect(page).toHaveURL(/\/en$/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await context.close();
});
