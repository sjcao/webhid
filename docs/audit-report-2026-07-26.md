# 项目全面审计报告

- **日期**:2026-07-26
- **范围**:全部源码、构建配置、CI、仓库卫生。`src/protocol/mouse/**`(控制协议)按约定冻结,本报告不含任何对协议本身的修改建议,所有修复方案均在协议层之外完成。
- **方法**:6 个维度并行深读源码(宏面板 / 按键面板 / 页面路由 / 状态层 / HID 服务 / 工程卫生),83 条原始发现经去重后逐条对抗性核实(核实者通读目标文件全文、主动尝试推翻结论),最终 **确认 76 条**(高 16 / 中 38 / 低 22),驳回 5 条误报。
- **说明**:同一根因被多个维度独立发现时,下文合并为一条并列出全部相关位置,故条目数少于 76。

---

## 一、高严重度

### H1. HID 接收路径疑似整体失效:reportId 未拼回,冻结 parser 永远拒收
**位置**:`src/services/hid/browser-hid-service.ts:41`
**问题**:按 WebHID 规范,`event.data` 是**不含 report ID** 的 payload(ID 单独放在 `event.reportId`)。冻结的 parser(`parser.ts:12`)要求恰好 17 字节且 `packet[0] === 0x09`,因此规范实现下 16 字节 payload 永远抛 "Invalid mouse packet format"。发送路径已处理该不对称(`commands.ts` 构造 17 字节后切掉 ID 再 `sendReport`),接收路径没有。另有两个伴生问题:直接 `new Uint8Array(event.data.buffer)` 忽略了 DataView 的 `byteOffset/byteLength`;未按 `event.reportId` 过滤,同 collection 的无关输入报告也会进 parser。
**影响**:DPI / 版本 / 配置档 / 按键读取及写入 ack 全部无法入库,工作区显示的其实是硬编码默认值(DPI 1600、v1.0)。
**修复**(仅动 service):`const view = event.data; const payload = new Uint8Array(view.buffer, view.byteOffset, view.byteLength); const packet = new Uint8Array(payload.length + 1); packet[0] = event.reportId; packet.set(payload, 1);`,且仅当 `event.reportId` 匹配协议 reportId 时转发。
**注意**:若真机实测读取正常,说明该设备/系统的行为偏离规范,此条需重新核实后再动。

### H2. 全项目无 `navigator.hid disconnect` 监听,拔掉鼠标不被感知
**位置**:`src/services/hid/browser-hid-service.ts:6`、`src/stores/device-store.ts:39`
**问题**:grep 全 src 无任何 `disconnect`/`connect` 事件订阅。拔掉设备后 `this.device` 指向死对象,`currentDevice` 仍在,界面持续显示"已连接"(`device-info-panel.tsx:37`),后续所有操作在控制台里静默 reject。连接页的已授权设备列表也不随插拔刷新。
**修复**:service 或 device-store 初始化时注册 `navigator.hid.addEventListener('disconnect', …)`,匹配当前设备则清空状态、提示并回到连接页;连接页监听 connect/disconnect 刷新列表。

### H3. 连接失败照样进入"假连接"工作区
**位置**:`src/stores/device-store.ts:72`、`src/features/mouse/connect-page.tsx:33-38`
**问题**:`connectDevice` 把所有异常吞掉只写 error 字符串,不抛出也不返回成败;`openWorkspace` 因此无条件 `navigate('/workspace')`。`device.open()` 被其它程序占用等常见失败后,用户仍被带进 currentDevice=null 的工作区:渲染出伪造默认值、显示"已连接",错误横幅留在刚离开的连接页上无人看见。若此前进过演示模式(见 M8),还会静默变成演示数据冒充真机。
**修复**:`connectDevice` 返回布尔(或抛出),`openWorkspace` 仅在成功时导航。

### H4. `/workspace` 路由无守卫,F5 刷新后渲染假连接页面
**位置**:`src/routes/router.tsx:16`
**问题**:WebHID 打开状态不跨刷新存活,而路由无 `beforeLoad` 守卫。工作区内按 F5(或直接输 URL)后页面照常挂载,mount effect 的 `void refreshInitialState()` 抛 "No HID device is connected." 成为未处理 rejection,页面继续用默认值假装已连接。
**修复**:workspaceRoute 加 `beforeLoad`:无 currentDevice 且非 previewMode 时重定向 `/`;可先尝试 `navigator.hid.getDevices()` 静默重连已授权设备。

### H5. 无命令队列:并发宏上传交错,把损坏的宏写进鼠标固件
**位置**:`src/services/hid/browser-hid-service.ts:63`、`src/stores/mouse-store.ts:144`、`src/features/mouse/buttons-panel.tsx:796`
**问题**:`send()` 无序列化;`bindMacroToButton` 按动作逐帧上传 + 结尾终止帧,期间 Bind 按钮不禁用且调用是 `void` 的。双击、或第一个宏未传完就点第二个,两个循环的帧在线上交错,设备按接收顺序落盘 → **固件里存下混合两个宏的坏宏,关页面也不消失**。10 命令的 `refreshInitialState` 突发同样可能与用户写操作交错。
**修复**:service 内加 promise 链队列(`this.tail = this.tail.then(...)`)使所有 send 串行;store 加 in-flight 标志,上传期间禁用 Bind。

### H6. 所有写设备操作乐观更新 + `void` 吞异常,失败无回滚无提示
**位置**:`src/stores/mouse-store.ts:117-170` 各 action;调用点 `workspace-page.tsx:154/235`、`dpi-panel.tsx:53`、`buttons-panel.tsx:153/300/519/796`、`reset-panel.tsx:54`
**问题**:selectProfile / updateDpi / setButtonMapping / bindComboToButton / bindMacroToButton / resetButtons / resetAll 全部先 `set()` 再裸 `await send`,调用点一律 `void`。发送失败(拔线、设备占用)后 UI 自信显示新值,硬件没收到,错误只出现在 devtools。`lastError` 字段在失败路径上根本不被设置。
**修复**:在 action 或 `sendOrPreview` 内 try/catch:失败时设置 lastError 并在 UI 呈现(toast/横幅),回滚乐观状态或重发对应读命令纠偏。

### H7. 宏绑定用数组下标当设备槽位,删宏后 UI 与设备错位
**位置**:`src/features/mouse/buttons-panel.tsx:796/350/770`、`src/stores/macro-store.ts:89-93`
**问题**:绑定时传宏在数组中的当前位置作为 macroId,展示用 `macros[config.index]`、高亮用 `config.index === idx`;而 `deleteMacro` 按 id 过滤使后续下标全部前移,`saveMacro/duplicateMacro` 追加,均不重同步既有绑定。删除 0 号宏后:画布标签显示错误宏名、列表高亮错行、再点 Bind 写进另一个设备槽位,旧槽位还保留着老程序。
**修复**:按稳定 id 追踪绑定(`buttonId -> macro.id`,或首次绑定时在 SavedMacro 上持久化槽位号),显示与高亮改用 `macros.find(m => m.id === boundId)`,设备槽位取持久化值而非 `.map((macro, idx))`。

### H8. 宏编辑器:行 key 含可变 timestamp,延迟输入框每敲一键失焦
**位置**:`src/features/mouse/macro-panel.tsx:575`
**问题**:行 key 为 `${keyName}-${timestamp}-${idx}`。在 DelayInput 每敲一个字符触发 `handleDelayChange`(298 行)重写本行及后续所有行的 timestamp → key 变化 → React 卸载重挂正在输入的行。输入 250 要重新点三次输入框;按键改绑同样导致整行重挂。
**修复**:改用稳定标识作 key(创建/加载时给 MacroAction 生成 id,或退回纯 index key——行序变化本就是整组重建)。

### H9. 宏编辑器:开始录制不清理改绑/插入状态,双监听器同时生效污染宏
**位置**:`src/features/mouse/macro-panel.tsx:517`(录制按钮)、157-183 / 186-217(两个捕获 effect)
**问题**:录制按钮只 `setRecording(toggle)`。若此时 `editingActionIndex` 或 `isInsertingKey` 已设(录制按钮在这些模式下并未禁用),按一个键会同时:改绑正在编辑的行 + 追加录制的 Down 动作;插入模式下一次按键产生 3 个动作。
**修复**:录制开启时重置 `editingActionIndex / isInsertingKey / insertMouseMenuOpen`(83-86 行的切宏 effect 已有同样的清理逻辑可复用)。

### H10. 按键面板 sync effect 依赖整个 `buttonConfigs`,抢 tab、清空未保存表单
**位置**:`src/features/mouse/buttons-panel.tsx:57-109`;根因配合 `mouse-store.ts:53-63`
**问题**:effect 依赖 `[selectedButton, buttonConfigs]`,而 `applyResponse` 每收到一条 HID 报告就整体替换 buttonConfigs 对象,**其它按键**的响应也触发本 effect;effect 每次无条件 `setActiveTab` 并用存量配置覆写连发/组合键表单。挂载时 `refreshInitialState` 发 6 条 readButton,6 个错峰响应逐个把用户手选的 tab 拽回去、清掉正在输入的草稿。
**修复**:改订阅单个配置 `s.buttonConfigs[selectedButton]` 并以其为依赖;自动切 tab 拆到仅以 `selectedButton` 为依赖的独立 effect,被动刷新不再覆盖手选 tab。

### H11. 仓库提交了 ~800KB 第三方参考站抓取物
**位置**:`dom.html`、`elements.json`、`demo_elements.json`、`mouse_detail_elements.json`、`demo_device_list.png`、`initial_hub.png`、`mouse_main.png`(均已 tracked)
**问题**:dom.html 是外部 ATK HUB 站点的完整抓取(含其百度统计脚本与 CDN 引用),json 是同站 DOM/文案 dump(连广告文案都在),png 是其截图。`docs/PROJECT_MEMORY.md:27` 明确要求参考站品牌不得出现在本项目,而其完整 DOM 就躺在 git 里。构建与运行均不依赖这些文件。
**修复**:`git rm` 全部七个文件;仍需参考就移出仓库或放入 ignored 目录。

### H12. `vite base: '/'` 与文档宣称的 GitHub Pages `/webhid/` 部署矛盾
**位置**:`vite.config.ts:9`;对照 `README.md:1`、`docs/PROJECT_MEMORY.md:193`
**问题**:README 与项目文档均称部署于 `https://sjcao.github.io/webhid/`,但 base 为 `/`,构建产物以根绝对路径引用 `/app.js`、`/logo.svg`,在 project-page 部署下全部 404。router 已从 `import.meta.env.BASE_URL` 取 basepath,只有 vite base 不对。CI 会把这个 dist 部署上 Pages。
**修复**:`base: '/webhid/'`(或走环境变量),并把 README / PROJECT_MEMORY 与真实路径对齐。

### H13. CI 每次构建下载并部署 ~10MB 无人使用的 pyodide
**位置**:`.github/workflows/build.yml:20-21`
**问题**:每次 push 都 wget pyodide-core-0.26.2 解压到 `public/pyodide`,vite 原样拷进 dist 并上到 Pages;全项目 grep 零引用,属其它模板残留(`.gitignore:1-5` 的 hidapi/hid.py 同源)。
**修复**:删除该步骤;顺手清掉 .gitignore 的 python 时代条目。

---

## 二、中严重度

### 连接与设备通信健壮性

**M1. 读设备无超时、无 ack 匹配、无重试**(`mouse-store.ts:98`)——`send` 只保证写出 OUTPUT 报告,不代表设备应答。设备不应答时工作区安静地保持硬编码初值并当真值展示,写操作同样无确认。建议:请求/响应助手(订阅对应 ParamType + buttonId,~500ms 超时竞速,重试一两次),超时置"设备无响应"状态并渲染。

**M2. `disconnectDevice` 无错误处理,close() 失败把用户困在工作区**(`device-store.ts:78`、`browser-hid-service.ts:46-54`)——service 里 `this.device = null` 在 `await device.close()` 之后,close reject(拔线瞬间)则设备引用滞留、`set({ currentDevice: null })` 不执行;调用点 `void leaveWorkspace()` 吞掉异常,点 Home 无反应。建议:service 先清引用后 close 并 catch;store 侧 try/finally 保证清态与导航总会执行。

**M3. `previewMode` 永不清除,`leavePreviewMode` 是死代码**(`device-store.ts:78/84`、`workspace-page.tsx:60-67`)——离开工作区只调 `disconnectDevice`,previewMode 保持 true 直到下次成功真连。叠加 H3:演示模式 → 回首页 → 点真设备失败 → 进入的工作区仍在演示模式,演示数据冒充所选设备。建议:disconnectDevice 一并清 previewMode(或 leaveWorkspace 调 leavePreviewMode);若仍无人调用则删掉该 action。

**M4. 宏上传中途失败无恢复,设备留下截断宏而 UI 显示"已绑定"**(`mouse-store.ts:144`)——乐观置态在前,循环中任一帧失败则后续帧含终止帧全不发送,异常在 `void` 调用点被丢弃。截断宏缺 key-up 终止,播放可能出现按键卡住。建议:catch 后回滚该按钮配置、报错,重试时从第 0 帧全量重传。

**M5. `lastError` 只写不读**(`mouse-store.ts:82`)——CRC/解析失败全部进了没人订阅的字段,配合 H1 意味着整类通信失败完全不可见。建议:工作区渲染 lastError(可关闭横幅),或至少 dev 构建 console.warn。

### 宏编辑器正确性

**M6. keyup 录入从未按下的键**(`macro-panel.tsx:129-144`)——handleKeyUp 不查 pressedKeys 成员即录入。确定性复现:焦点在"开始录制"按钮上按 Enter,keydown 触发按钮,keyup 落进新监听器,宏第一条动作是不成对的 "Enter Up"。建议:`if (!pressedKeys.current.delete(event.code)) return;`。

**M7. 第 0 行延迟是设备收不到的无效控件**(`macro-panel.tsx:568`)——UI 语义是"动作前延迟",行 0 显示录制前的等待秒数(常为数秒);设备侧 `getMacroDelay` 用"动作后间隔"(`actions[i+1].ts - actions[i].ts`),首动作绝对时间根本不传输,编辑行 0 平移全部时间戳、任何间隔不变。建议:停止录制时归一化(全体减去首动作时间戳),行 0 延迟隐藏或禁用,或改标签匹配协议语义。

**M8. 拖拽取消无 onDragEnd,行永久停留半透明虚线态**(`macro-panel.tsx:577`)——只在 onDrop 清 draggedIndex,Esc 或拖出列表释放则样式卡死。建议:行上加 `onDragEnd={() => setDraggedIndex(null)}`。

**M9. 旧版数据迁移会复活已删除的宏**(`macro-store.ts:36`)——迁移后从不删 legacy key,且"空数组"被当成"未迁移":老用户删光宏 → 刷新 → 全部带新 UUID 复活。建议:迁移成功后 `removeItem(LEGACY_KEY)`,并区分"键不存在"与"空数组"。

**M10. 迁移在模块 import 时执行且不校验形状,一条坏 localStorage 白屏整个应用**(`macro-store.ts:54/80`)——合法 JSON 但形状不符(无 actions 数组等)时 `.map` 在 React 挂载前抛 TypeError,每次加载都白屏,除非手清 localStorage。建议:迁移体 try/catch 返回 []、`Array.isArray` 校验,或把迁移挪出模块作用域到组件 effect。

**M11. 鼠标动作把中文标签当标识符持久化**(`macro-panel.tsx:788`)——英文界面下插入鼠标动作也存 `item.nameZh`('左键按下')进 localStorage,渲染靠 6 条硬编码反查表回翻,表外/改名即向英文用户漏中文。建议:动作存语言无关标识(left/right/middle + 方向),渲染时查统一映射。

### 按键面板正确性

**M12. 组合键录制监听器跨 tab/按键存活,吞掉包括搜索框在内的全部键盘输入**(`buttons-panel.tsx:112-144`)——isRecordingCombo 在切按键、切 tab、sync effect 改 tab 时都不重置,录制 UI 隐藏后监听器仍 `preventDefault()` 一切按键;Esc 也不取消而是被当组合键录入(0x29)。建议:chooseButton 与切 tab 时 `setIsRecordingCombo(false)`;handleKeyDown 先处理 Escape=取消。

**M13. 连发间隔/次数只 clamp 下限,>255 被协议字节掩码静默截断**(`buttons-panel.tsx:599/646`)——输 300ms,设备收到 `300 & 0xff = 44ms`,UI 还显示 300;另 `Number('') === 0` 被拍成 1,字段无法清空重输。建议:`Math.min(255, Math.max(1, …))`;本地留原始字符串、blur/保存时再 clamp。

**M14. `isOptionActive` 与冻结的 `findKeyOption` 匹配语义不一致,侧栏高亮与画布标签互相矛盾**(`buttons-panel.tsx:268-277`)——本地实现要求 values 长度全等,而 findKeyOption 对 `values: []` 的选项(Mouse/Profile/DPI/Wheel 全类)故意忽略响应携带的 padding 字节。同一绑定画布显示"Left Click"而列表无高亮。建议:删掉本地比较,委托 `findKeyOption(...)?.id === option.id`。

### i18n 体系

**M15. 73 处内联 `locale === 'zh-CN' ? … : …` 三元绕过 i18n**(`buttons-panel.tsx` 45 处、`macro-panel.tsx` ~28 处)——大量文案与 messages.ts 已有 key 重复且措辞已漂移(如内联左键警告 ≠ `mouse.leftClickWarning`);加第三语言等于重写组件。建议:全部收进 messages.ts(复用现有 key),keymap 数据的 label/labelZh 用统一 `pickLabel()` 包一层。

**M16. messages.ts 54 个死键**(`messages.ts:5` 起)——约 120 个 key 中 54 个零引用(app.subtitle、connect.enter、49 个 mouse.* 等),多数正是被内联三元取代的字符串。建议:随 M15 收敛时复活可用的,其余从两个语言树删除。

**M17. en 目录不做类型约束,漏翻静默显示中文**(`use-i18n.ts:9`、`messages.ts:140-277`)——TranslationKey 只从 zh-CN 派生,en 缺键编译期无感、运行时回退中文。建议:`const en = {…} satisfies typeof messages['zh-CN']`。

**M18. `document.title` 硬编码于 providers 且与 app.title 不一致**(`providers.tsx:14`)——产品名出现三种写法('鼠标网页驱动' / 'Mouse HID Hub' / 'MOUSE GEAR')。建议:加 `app.htmlTitle` key 统一。

### 组件结构与重复

**M19. `buttons-panel.tsx` 872 行单体,五个清晰拆分缝**(`buttons-panel.tsx:27`)——鼠标画布、侧栏 chrome、选项列表、连发表单、组合键表单、宏绑定列表共居一个组件;搜索框/连发输入每敲一键全树重渲染;巨型 sync effect(H10)正是不相关子功能共享单组件状态的产物。建议:拆 MouseCanvas / MappingSidebar / KeyOptionGroups / BurstFireForm / ComboKeyForm / MacroBindList,各表单自持状态,单体 effect 自然瓦解。

**M20. `macro-panel.tsx` 940 行单体,每敲一键全部动作行重渲染**(`macro-panel.tsx:11`)——侧栏/工具栏/动作行/空态/插入栏五段可拆;每行每渲染新建 ~8 个闭包,鼠标键名映射表在 IIFE 里逐行重建,插入菜单表每渲染重建。长宏(录制每击键产 2 动作,100+ 行常见)下名称/延迟输入卡顿。建议:拆分 + memo 化 MacroActionRow + 常量提升到模块级。

**M21. 组合键解析与 HID 反查名逻辑双份、modifier 值表重复 5 次**(`buttons-panel.tsx:83-99 与 335-347`;`[0xe0..0xe3]` 出现于 83/87/124/335/337)——建议:提取 `MODIFIER_VALUES`、`parseComboValues()`、`hidValueToName()` 三个助手,三处共用。

**M22. systemGroups / keyboardGroups 两个 useMemo 同算法两抄**(`buttons-panel.tsx:198-224 / 227-265`)——建议:单个 `buildGroups(specs, query)`。

**M23. 系统 tab 与键盘 tab 选项列表 JSX 近乎相同的两份**(`buttons-panel.tsx:503-535 / 538-570`)——建议:提取 `<KeyOptionGroups>` 组件。

**M24. 桌面/移动 profile 弹窗无 Esc、无点外关闭、无焦点管理**(`workspace-page.tsx:133-168 / 185-200 / 216-244`)——键盘用户可 tab 穿透弹窗且无法关闭。建议:换 @radix-ui/react-popover(已是依赖),或补 Esc + 遮罩 + aria 接线。

### 工程 / CI / 依赖

**M25. CI 不跑任何测试、`npm install` 不用 lockfile、actions 版本过旧**(`build.yml:26-29`)——vitest 与 Playwright 套件存在但 CI 从不执行,协议回归可以直接合并并自动部署;install 不锁版本。建议:`npm ci` + `npm run test` 前置,actions 升 v4 并开 npm cache。

**M26. deploy-pages 传无效参数 + 任意分支 push 都部署线上**(`build.yml:45-48`、`build.yml:2-7`)——`github_token`/`publish_dir` 均非 actions/deploy-pages@v4 的输入,SENJUCAO secret 实为死配置;无分支门禁,任何 feature 分支覆盖生产 Pages。建议:删两行无效输入,`on.push.branches: [main]` 或 deploy job 加 ref 条件。

**M27. 无 ESLint / Prettier / lint 脚本**(`package.json:6`)——React 19 重 hooks 代码库无 rules-of-hooks / exhaustive-deps 检查——本报告多条 effect 类 bug 正是这类工具能拦下的。建议:eslint + typescript-eslint + eslint-plugin-react-hooks + lint 脚本入 CI。

**M28. 三个依赖零引用**(`package.json:15/24/26`)——react-hook-form、@hookform/resolvers、zod 无任何 import(PROJECT_MEMORY 还写着它们是技术栈)。建议:卸载并更新文档。

**M29. entry 构建为无 hash 的 `app.js`,部署后客户端拿旧缓存**(`vite.config.ts:13-21`)——CSS 有 hash 而 JS 没有,Pages 的 max-age=600 + 浏览器启发式缓存造成 index.html 与 app.js 版本错配。建议:去掉 entryFileNames 覆盖,恢复默认 hash 产物。

**M30. `dist.tar.gz` 未被 ignore 且内容已过期**(`.gitignore:19`)——一次 `git add .` 就会把 300KB 旧构建收进版本库。建议:删文件并 ignore `*.tar.gz`。

**M31. `components.json` 是老 Vue 项目的 shadcn-vue 配置**——schema 指向 shadcn-vue,aliases 指向不存在的路径,tailwind.config.js 不存在(Tailwind 4 走 vite 插件)。跑 shadcn CLI 会按 Vue 约定往错误路径注入代码。建议:删除或换成匹配 src/shared/ui 的 React 版配置。

### 测试缺口

**M32. mouse-store 核心路径零测试**(`mouse-store.ts:77`)——handleInputReport/applyResponse 的响应入库、bindMacroToButton 的字节编码(repeatType 0xf4 翻译、delay 计算、key-up 归一化、终止帧)、refreshInitialState 的 preview/真机分支均无测试;这些恰是会把错数据写进硬件的路径。建议:构造 17 字节包喂 handleInputReport 断言状态;mock hidService 断言精确字节序列。

**M33. macro-store 迁移与工具函数零测试**(`macro-store.ts:35`)——migrateLegacyMacros(一次性用户数据转换)、updateMacro / duplicateMacro、getMacroDelay(直接决定发往硬件的延迟字节,含 [0,65535] clamp 与末元素归零规则)均无测试。建议:localStorage 种 legacy fixture 断言迁移形状 + 边界用例。

---

## 三、低严重度

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| L1 | `macro-store.ts:81/125` | `loadMacros`、`keyboardEventToMacroAction` 死导出;面板内联重写同逻辑 4 处且已与死助手行为分叉(多了 event.code 回退) | 删 loadMacros;助手升级为面板版语义后四处调用,或删除 |
| L2 | `macro-panel.tsx:507` | 循环次数每击键即 clamp,字段无法清空重输 | 参照 852 行 DelayInput 的"存原始串、blur 时 clamp"模式 |
| L3 | `buttons-panel.tsx:785` | 魔数 0xf0;UntilAssignedKey/UntilAnyKey 宏被错标成 '1x' | switch MacroRepeatType 四态,用现有 repeatHold/repeatAssigned/repeatAny key |
| L4 | 五个面板 header | 同一 header 块复制 5 份且已轻微漂移;IconBadge、StatusItem/InfoRow 同类重复 | 提取 `<PanelHeader title subtitle actions?>` 与 `<IconBadge>` |
| L5 | `device-info-panel.tsx:47` | VID/PID 显示十进制('4489 / 8209'),与所有 USB 资料的十六进制惯例不符 | `0x1189 / 0x2011` 补零大写格式化 |
| L6 | `workspace-page.tsx:133/216` | 桌面/移动 profile 弹窗 JSX 近全量重复且已漂移 | 提取 `ProfilePopover({ onClose, showDpi })` |
| L7 | `slider.tsx` | 零引用死组件,拖着 @radix-ui/react-slider 依赖 | 删组件,确认后卸依赖 |
| L8 | `card.tsx` | Card 系四导出零引用,面板全在手写卡片 div | 删除或让面板采用 |
| L9 | `workspace-page.tsx:54` + `ui-store.ts:46` | activePanel 持久化后又在每次挂载被强制重置为 'buttons',持久化纯做无用功 | 二选一:去 partialize,或去挂载重置 |
| L10 | `connect-page.tsx:80/118` | 连接进行中设备卡片与演示按钮不禁用,可并发发起两次 connect | `disabled={connecting}` + 连接中视觉态 |
| L11 | `connect-page.tsx:145` | 私有 IconButton 与共享 `Button variant="ghost" size="icon"` 重复且焦点样式不一致 | 删 IconButton 用共享 Button |
| L12 | `storage.ts:11` + `macro-store.ts:82-122` | writeJson 裸 setItem;persistMacros 先于 set() 执行,配额/隐私模式异常直接炸进 onClick,内存态也丢 | setItem try/catch;先 set() 后持久化 |
| L13 | `mouse-store.ts:24` | lastError 死状态(见 M5,低危侧面:每条坏报告白 set 一次) | 随 M5 一并处理 |
| L14 | `browser-hid-service.ts:27` | requestDevice 空 filters 列出全系统 HID 设备;connect 不校验设备是否有 0x09 输出报告 | 加 vendor/usage filter 或 connect 时检查 collections,不符则明确报"不支持的设备" |
| L15 | `router.tsx:3` | 无路由级代码分割,451KB 单 bundle,连接页付全部工作区成本 | `lazyRouteComponent(() => import(...))`,router 已配 defaultPreload: 'intent' |
| L16 | `playwright.config.ts:6` | webServer 硬编码 `npm.cmd`,非 Windows 环境 e2e 直接 ENOENT | 改 `npm run dev -- --host 127.0.0.1 --port 4179` |
| L17 | `tsconfig.app.json:29` 等 | include 引用不存在的 service-worker.ts;根 vite-env.d.ts 无 tsconfig 收录属死文件;根 tsconfig 的 compilerOptions 在 solution-style 下完全不生效 | 三处清理 |
| L18 | `docs/PROJECT_MEMORY.md:16/193` | 项目记忆文档与代码矛盾:宣称 RHF+Zod 技术栈(零引用)、宣称 /webhid/ base(实为 /)、给出的 dev URL 是 404 | 随 H12/M28 的决策一并修订 |
| L19 | `ui-store.ts:31` + device-store | ui-store 的脏检查状态机(防丢未保存宏编辑的唯一屏障)与 device-store 全部分支零测试 | 补 vitest:dirty/clean 路径、connect 成败、preview 进出 |

---

## 四、对抗核实中驳回的发现(5 条,供参考)

1. macro-panel 名称含空白保存后卡"未保存"态 —— 复核:updateMacro 换引用触发同步 effect,至多闪一帧。
2. reset-panel 行标题重复渲染 —— git 历史证明是沿袭旧版的有意设计,仅无障碍名重复,属外观级。
3. hex.ts `toHexByte` 导出无外部使用 —— 函数经 toHexString 存活,仅 export 关键字多余,属风格。
4. StrictMode 双挂载导致 10 命令初始化突发发两次 —— 全部为幂等读命令、响应按类型分发,dev-only 且无实害。
5. run_dev.bat 硬编码 Node 路径 —— 是 Windows 默认安装路径且缺失时优雅降级,属偏好。

---

## 五、建议修复路线

1. **先真机验证 H1**(接收路径):它决定"当前读取功能到底有没有在工作",影响后续所有判断。
2. **连接生命周期一揽子**:H2 断连监听 → H3 失败不导航 → H4 路由守卫 → H5 命令队列 → H6 错误呈现与回滚 → M1-M5。
3. **编辑器交互修复**:H7-H10 + M6-M14(多数是几行的定点修复,收益立竿见影)。
4. **CI 与仓库清理**:H11-H13 + M25-M31(pyodide、base path、测试入 CI、分支门禁、依赖卸载、缓存 hash)。
5. **i18n 收敛与组件拆分**:M15-M24,配合 M27 的 lint 上线,防止同类问题回潮。
6. **补测试**:M32/M33/L19,优先覆盖会写坏硬件与用户数据的路径。
