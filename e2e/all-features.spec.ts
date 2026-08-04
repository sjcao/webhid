import { expect, test } from '@playwright/test';

test('runs all features end-to-end to ensure perfect stability', async ({ page }) => {
  // 1. 进入首页
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '请连接设备' })).toBeVisible();

  // 2. 语言切换测试 (中文 -> 英文 -> 中文)
  const langBtn = page.getByTitle(/语言|Language/);
  await expect(langBtn).toBeVisible();
  
  // 切换为英文
  await langBtn.click();
  await expect(page.getByRole('heading', { name: 'Pair with New Device' })).toBeVisible();
  
  // 切换回中文
  await langBtn.click();
  await expect(page.getByRole('heading', { name: '请连接设备' })).toBeVisible();

  // 3. 进入演示模式
  await page.getByText('进入演示模式').click();
  await expect(page.getByText('MOUSE F1 Ultimate 2.0')).toBeVisible();

  // 4. 板载配置切换测试 (P1 -> P2 -> P1)
  const profileSelector = page.getByRole('button', { name: '板载配置' });
  await expect(profileSelector).toBeVisible();
  
  // 切换至 P2
  await profileSelector.click();
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  await expect(profileSelector).toContainText('P2');
  
  // 切换回 P1
  await profileSelector.click();
  await page.getByRole('button', { name: 'P1', exact: true }).click();
  await expect(profileSelector).toContainText('P1');

  const navigation = page.getByRole('navigation');

  // 5. DPI 设置测试
  await navigation.getByRole('button', { name: 'DPI设置' }).click();
  await expect(page.getByText('协议固定 DPI 档位')).toBeVisible();
  
  // 点击 DPI 3 (3200) 并检查更新
  await page.getByRole('button', { name: 'DPI 3' }).click();
  await expect(page.getByRole('button', { name: 'DPI 3' })).toHaveAttribute('aria-pressed', 'true');
  
  // 检查侧边栏中的当前 DPI
  await expect(page.getByText('当前 DPI: 3200')).toBeVisible();

  // 6. 快捷指令 (宏) 设置测试
  await navigation.getByRole('button', { name: '快捷指令设置' }).click();
  await expect(page.getByText('快捷指令库')).toBeVisible();
  
  // 新建快捷指令
  await page.getByRole('button', { name: '新建快捷指令' }).first().click();
  
  // 修改指令名称为 MyMacro
  const nameInput = page.locator('input[type="text"]').first();
  await expect(nameInput).toHaveValue('M1');
  await nameInput.fill('MyMacro');
  
  // 修改循环方式为“按住循环” (Value 对应 240)
  await page.locator('select').selectOption('240');

  
  // 手动插入鼠标动作 (左键按下)
  await page.getByRole('button', { name: '插入鼠标按键' }).click();
  await page.getByRole('button', { name: '↓ 左键按下' }).click();
  await expect(page.getByRole('button', { name: '左键按下' })).toBeVisible();
  
  // 保存宏
  await page.getByRole('button', { name: '保存' }).click();
  
  // 克隆复制宏
  await page.getByRole('button', { name: '复制' }).click();
  await expect(page.getByText('MyMacro 副本')).toBeVisible();
  
  // 删除克隆宏
  await page.getByRole('button', { name: '删除 MyMacro 副本' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(page.getByText('MyMacro 副本')).not.toBeVisible();

  // 7. 改键设置测试
  await navigation.getByRole('button', { name: '改键设置' }).click();
  await expect(page.getByText('点击鼠标上的按键卡片')).toBeVisible();
  
  // 选中右键
  await page.getByRole('button', { name: '右键', exact: false }).first().click();
  
  // 7.1 键盘功能映射 (映射为 Q)
  await page.getByRole('tab', { name: '键盘' }).click();
  await page.getByRole('button', { name: 'Q', exact: true }).click();
  // 检查右键卡片上的绑定文字是否更新为 Q
  await expect(page.getByRole('button', { name: '右键', exact: false }).locator('span').nth(1)).toHaveText('Q');

  // 7.2 特殊功能之火力键配置
  await page.getByRole('tab', { name: '特殊' }).click();
  await page.locator('input[type="number"]').first().fill('50'); // 设置点击间隔 50ms
  await page.locator('input[type="number"]').nth(1).fill('10'); // 设置点击 10 次
  await page.getByRole('button', { name: '保存并设置' }).first().click();
  // 验证绑定文本更新为 10次/50ms
  await expect(page.getByRole('button', { name: '右键', exact: false }).locator('span').nth(1)).toHaveText('连点 10次/50ms');

  // 7.3 特殊功能之组合键配置
  await page.getByRole('button', { name: 'R Ctrl', exact: true }).click();
  // 单独点击保存并设置 (组合键保存按钮是第2个)
  await page.getByRole('button', { name: '保存并设置' }).nth(1).click();
  // 验证右侧修饰键不会被误判为普通按键
  await expect(page.getByRole('button', { name: '右键', exact: false }).locator('span').nth(1)).toHaveText('R Ctrl');

  // 7.4 快捷指令 (宏) 绑定配置
  await page.getByRole('tab', { name: '快捷指令', exact: true }).click();

  await page.getByRole('button', { name: '绑定' }).click();
  // 验证绑定文本更新为 MyMacro
  await expect(page.getByRole('button', { name: '右键', exact: false }).locator('span').nth(1)).toHaveText('MyMacro');

  // 8. 其他设置与重置功能测试
  await navigation.getByRole('button', { name: '其他设置' }).click();
  await expect(page.getByText('仅提供协议支持的恢复操作。')).toBeVisible();
  
  // 恢复按键设置
  await page.getByRole('button', { name: '恢复按键设置' }).click();
  await page.getByRole('button', { name: '确认' }).click();
  
  // 恢复全部设置
  await page.getByRole('button', { name: '恢复全部设置' }).click();
  await page.getByRole('button', { name: '确认' }).click();

  // 9. 返回首页 (设备连接页)
  await page.getByRole('button', { name: '首页' }).click();
  await expect(page.getByRole('heading', { name: '请连接设备' })).toBeVisible();
});
