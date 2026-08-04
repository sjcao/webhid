# Mouse HID Hub

基于 React、WebHID 和鼠标私有协议实现的网页驱动，可配置按键映射、固定 DPI 档位、板载配置和宏快捷指令。

在线版本：[https://sjcao.github.io/webhid/](https://sjcao.github.io/webhid/)

## 运行要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 支持 WebHID 的 Chrome 或 Edge
- WebHID 仅能在 HTTPS 或 `localhost` 等安全上下文使用；首次连接需要用户在浏览器设备选择器中授权

## 本地开发

```bash
npm ci
npm run dev
```

开发服务器会按 Vite 输出的地址启动。也可以在 Windows 上运行 `run_dev.bat`。

## 质量检查

```bash
npm run lint
npm run test
npm run e2e
npm run build
npm audit
```

端到端测试会自动启动本地 Vite 服务，并使用 Chromium 验证预览模式下的主要流程与响应式布局。

## 协议与部署

- 当前实现以 [网页驱动通信协议_20250905.docx](docs/网页驱动通信协议_20250905.docx) 为准，HID Report ID 为 `0x09`，完整报文为 17 字节。
- Vite 的部署基路径为 `/webhid/`，`main` 分支由 GitHub Actions 构建并发布到 GitHub Pages。
- 未连接实体设备时可从首页进入演示模式，检查界面与配置流程。
