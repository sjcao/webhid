import { expect, test } from '@playwright/test';

test('opens preview workspace and renders core panels', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '请连接设备' })).toBeVisible();
  await page.getByLabel('语言').click();
  await expect(page.getByRole('heading', { name: 'Pair with New Device' })).toBeVisible();
  await page.getByText(/进入演示模式|Enter Demo Mode/).click();
  await expect(page.getByText(/MOUSE F1 Ultimate 2.0/)).toBeVisible();
  const navigation = page.getByRole('navigation');
  await navigation.getByRole('button', { name: /DPI设置|DPI Settings/ }).click();
  await expect(page.getByText(/协议固定 DPI 档位|Protocol fixed DPI stages/)).toBeVisible();
  await navigation.getByRole('button', { name: /改键设置|Button Mapping/ }).click();
  await expect(page.getByText(/点击鼠标上的按键卡片|Click a mouse button card/)).toBeVisible();
  await navigation.getByRole('button', { name: /快捷指令设置|Shortcut Settings/ }).click();
  await expect(page.getByText(/组合键录制|Combo Recording/)).toBeVisible();
});
