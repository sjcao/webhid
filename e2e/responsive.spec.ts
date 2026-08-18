import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 1024, height: 768, sidebar: '72px' },
  { width: 1366, height: 768, sidebar: '228px' },
]) {
  test(`keeps the full workspace accessible at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.getByRole('button', { name: '进入演示模式' }).click();

    const workspaceGrid = page.locator('main > div.flex');
    await expect.poll(async () => workspaceGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns)).toContain(viewport.sidebar);
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    for (const target of ['左键', '右键', '中键', '前进', '后退', 'DPI']) {
      await expect(page.locator(`button[aria-label="${target}"]`)).toBeVisible();
    }

    await page.getByRole('button', { name: '关闭功能库' }).click();
    await expect(page.getByRole('button', { name: '打开功能库' })).toBeVisible();
    await page.getByRole('button', { name: '打开功能库' }).click();
    await expect(page.getByRole('textbox', { name: '搜索功能按键' })).toBeVisible();

    const profileSelector = page.getByRole('button', { name: /板载配置 P1/ });
    await profileSelector.click();
    await expect(page.getByRole('button', { name: 'P2', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'P2', exact: true }).click();

    const driver = page.locator('.driver-theme-scope');
    const lightBackground = await driver.evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.getByRole('button', { name: '暗色' }).click();
    const darkBackground = await driver.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(darkBackground).not.toBe(lightBackground);
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });
}

test('protects unsaved shortcut edits and confirms deletion', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./');
  await page.getByRole('button', { name: '进入演示模式' }).click();
  await page.getByRole('navigation').getByRole('button', { name: '快捷指令设置' }).click();
  await page.getByRole('button', { name: '新建快捷指令' }).first().click();

  const nameInput = page.getByRole('textbox', { name: '指令名称' });
  await nameInput.fill('Unsaved Macro');
  await expect(page.getByText('未保存', { exact: true })).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'DPI设置' }).click();
  const discardDialog = page.getByRole('dialog');
  await expect(discardDialog).toContainText('当前快捷指令有未保存的修改');
  await discardDialog.getByText('取消', { exact: true }).click();
  await expect(nameInput).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'DPI设置' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '放弃更改' }).click();
  await expect(page.getByRole('button', { name: 'DPI 1' })).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: '快捷指令设置' }).click();
  await page.getByRole('button', { name: '删除 M1' }).click();
  await expect(page.getByRole('dialog')).toContainText('永久删除');
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(page.getByText('M1', { exact: true })).not.toBeVisible();
});

test('keeps the workspace usable on a 390px phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: '进入演示模式' }).click();

  const mobileNavigation = page.getByRole('navigation', { name: '鼠标配置' });
  await expect(mobileNavigation).toBeVisible();
  await expect(page.getByRole('button', { name: '打开功能库' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await page.getByRole('button', { name: '中键', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '搜索功能按键' })).toBeVisible();
  await page.getByRole('button', { name: '关闭功能库' }).click();

  const profileSelector = page.getByRole('button', { name: /板载配置 P1/ });
  await profileSelector.click();
  await page.getByRole('button', { name: 'P2', exact: true }).click();

  await mobileNavigation.getByRole('button', { name: 'DPI设置' }).click();
  await expect(page.getByRole('button', { name: 'DPI 6' })).toBeVisible();

  await mobileNavigation.getByRole('button', { name: '配置管理' }).click();
  await expect(page.getByRole('button', { name: 'Profile 4' })).toBeVisible();

  await mobileNavigation.getByRole('button', { name: '快捷指令设置' }).click();
  await page.getByRole('button', { name: '新建快捷指令' }).first().click();
  await expect(page.getByRole('textbox', { name: '指令名称' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await page.setViewportSize({ width: 320, height: 720 });
  await expect(mobileNavigation).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
