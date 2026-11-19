import { expect, test, type Page } from '@playwright/test';

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name });

test('two partners pair, take turns and stay in sync', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  // Host creates an invitation.
  await host.goto('./');
  await button(host, 'Begin a ritual').click();
  await host.getByPlaceholder('Your name').fill('Elif');
  await button(host, 'Create an invitation').click();
  const codeButton = host.getByRole('button', { name: /Invitation code/ });
  await expect(codeButton).toBeVisible();
  const code = (await codeButton.getAttribute('aria-label'))!.match(/code ([A-Z]{6})/)![1];

  // Guest joins through the invitation link.
  await guest.goto(`./#join=${code}`);
  await expect(guest.getByText('You’ve been invited.')).toBeVisible();
  await guest.getByPlaceholder('Your name').fill('Deniz');
  await button(guest, 'Join your person').click();

  // Both see each other and agree to begin.
  await expect(host.getByText('with Deniz')).toBeVisible({ timeout: 45_000 });
  await expect(guest.getByText('with Elif')).toBeVisible();
  await button(host, 'I’m ready').click();
  await button(guest, 'I’m ready').click();
  await button(host, 'I promise').click();
  await button(guest, 'I promise').click();
  await expect(host.getByText('Dusk', { exact: true }).first()).toBeVisible();
  await button(guest, 'Draw the first card').click();

  // Host holds the first card; the guest must wait.
  await expect(host.getByText('You hold the card.')).toBeVisible();
  await expect(guest.getByText('Elif holds the card.')).toBeVisible();
  await button(host, 'Turn the card over').click();
  await expect(guest.getByText('Listen as Elif answers first.')).toBeVisible();

  // An accidental tap can be undone.
  await button(host, 'I’ve answered').click();
  await button(host, 'Undo').click();
  await expect(button(host, 'I’ve answered')).toBeVisible();

  // Answer for real: the reader first, then the listener. The card passes to the guest.
  await button(host, 'I’ve answered').click();
  await expect(guest.getByText('Your turn to answer.')).toBeVisible({ timeout: 10_000 });
  await button(guest, 'I’ve answered').click();
  await expect(guest.getByText('You hold the card.')).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText('Deniz holds the card.')).toBeVisible();
  await expect(host.getByLabel('Question 2 of 36')).toBeVisible();

  // A refresh on the guest side resumes the same question.
  await guest.reload();
  await expect(guest.getByText('You hold the card.')).toBeVisible({ timeout: 45_000 });
  await button(guest, 'Turn the card over').click();
  await expect(host.getByText('Listen as Deniz answers first.')).toBeVisible();

  // The host loses their saved game entirely; the guest's copy restores it.
  await host.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('b36q:state:')) localStorage.removeItem(key);
  });
  await host.reload();
  await expect(host.getByText('Listen as Deniz answers first.')).toBeVisible({ timeout: 60_000 });
  await expect(host.getByLabel('Question 2 of 36')).toBeVisible();

  await hostCtx.close();
  await guestCtx.close();
});

test('one phone mode plays without any connection', async ({ page, context }) => {
  await page.goto('./');
  await button(page, 'Or play together on one phone').click();
  await page.getByPlaceholder('First person').fill('Elif');
  await page.getByPlaceholder('Second person').fill('Deniz');
  await context.setOffline(true);
  await button(page, 'Begin on this phone').click();

  await expect(page.getByText('one phone')).toBeVisible();
  await button(page, 'Begin the ritual').click();
  await button(page, 'We promise').click();
  await button(page, 'Draw the first card').click();
  await expect(page.getByText('Elif holds the card.')).toBeVisible();
  await button(page, 'Turn the card over').click();
  await expect(page.getByText('Elif, read it aloud and answer first.')).toBeVisible();
  await button(page, 'Elif has answered').click();
  await expect(page.getByText('Deniz, your turn to answer.')).toBeVisible({ timeout: 10_000 });
  await button(page, 'Deniz has answered').click();
  await expect(page.getByText('Deniz holds the card.')).toBeVisible({ timeout: 10_000 });

  // Private notes stay on the device.
  await page.getByRole('button', { name: 'Write a private note' }).click();
  await page.getByPlaceholder('What do you want to remember about this moment?').fill('The dinner guest answer made us laugh.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit your private note' })).toBeVisible();
});
