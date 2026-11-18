# Memory Garden — Mac 端 Anki 自定义复习界面

一个无需构建步骤、无需 Node 依赖的本地 HTML/CSS/JavaScript 项目。界面是自己的，复习调度仍来自官方 Anki 的复习器。

## 功能

- 自定义浅色/深色 UI；可以设置每天目标 5/10/15/20/30 张。
- 读取 Anki 牌组、各牌组待复习数、今日复习数、七日回顾（通过 AnkiConnect）。
- 开始复习、显示问题/答案、按原版 Anki 的可用选项评分，并由 Anki 记录复习。
- 键盘快捷键：`Space` 翻面，数字 `1`～`4` 评分。
- 沙箱 iframe 隔离 Anki 卡片 HTML；常见图片和音频文件通过 AnkiConnect 读取。
- Anki 没开启时可试用示例卡片，示例卡片不会写入 Anki。
- 点击 `同步 AnkiWeb` 触发桌面 Anki 发起同步，**必须在 Anki 内确认是否完成**。

## 安装

1. 安装官方 [Anki Desktop](https://apps.ankiweb.net/)（不是第三方 AnkiApp / AlgoApp）。
2. 打开 Anki → **工具 → 插件 → 获取插件**。安装 **AnkiConnect**，插件代码 `2055492159`（请以 Anki 插件页面为准）。重新启动 Anki。
3. Anki → **工具 → 插件 → AnkiConnect → 配置**。在现有 JSON 设置中，找到 `webCorsOriginList`，确保包含：

   ```json
   "webCorsOriginList": ["http://127.0.0.1:4173", "http://localhost:4173"]
   ```

   注意：这里只展示需要修改的 JSON 字段，**不要整份替换原来的配置**。AnkiConnect 首次收到浏览器的访问请求时，可能会弹出授权对话框。
4. 保持 Anki 在 Mac 上运行，打开本项目，双击 `start.command`。若 macOS 阻止执行，可在终端运行：

   ```fish
   cd /path/to/memory-garden
   python3 -m http.server 4173 --bind 127.0.0.1
   ```

   然后访问 <http://127.0.0.1:4173>。即使使用 fish shell，上述命令也直接可用。
5. 页面会尝试自动连接。连接成功后选择牌组复习。官方 Anki 保持运行即可（可让它处于浏览器后面）。

## 同步原理

```text
Memory Garden (http://127.0.0.1:4173)
      ↓ JSON API
AnkiConnect (http://127.0.0.1:8765)
      ↓ 内置 Anki reviewer、复习历史、FSRS/SM-2
Anki Desktop → AnkiWeb → 其他官方 Anki 客户端
```

**Memory Garden 本身不直接登录 AnkiWeb，也不会托管你的牌组。** 如果需要在手机和 Mac 之间保持一致，需要正常使用 Anki 的同步账号和同步流程。

## 注意事项 / 已知限制

- 本工具是 Mac 上的**原型**，尚未在你的真实 Anki 卡片集上进行端到端验证。
- 复习操作通过 `guiDeckReview`、`guiCurrentCard`、`guiShowAnswer` 和 `guiAnswerCard` 调用 Anki **原生复习器**，因此必须保持桌面 Anki 运行；原版复习窗口也会切换相同卡片。
- HTML 内容被放进**禁用脚本执行**的沙箱 iframe。依赖 JavaScript 的高级 Anki 卡片模板可能无法正常工作。字体、布局可能不同于原版。
- 支持常见 `img` 和 `[sound:...]` 资源，但 TTS、视频脚本、绘图插件等高级功能可能需要回到原版 Anki。
- 牌组待复习计数取自 `getDeckStats`，如果你的 AnkiConnect 版本不支持，显示 `—`；但可以正常选择牌组。
- AnkiConnect 默认服务只应绑定 `127.0.0.1`。不要把 8765 端口暴露给公网，也不要把插件授权给不信任的网页。
- 浏览器可能需要在 AnkiConnect 插件中批准这个来源。不能通过 `file://` 双击 `index.html` 使用 API，请运行本地 HTTP 服务。
- 本项目没有任何账号系统或第三方分析。`localStorage` 仅保留目标数量和主题偏好。
- **避免同时在此网页和 Anki 原版复习窗口操作同一张卡**，以免界面状态不同步。

## 代码结构

- `index.html`：外壳 / 导航
- `styles.css`：响应式、深浅色设计
- `main.js`：AnkiConnect API、页面和评分交互
- `lib.js`：可单元测试的纯函数
- `tests/lib.test.js`：Node 内建测试（可运行 `node --test`）
- `start.command`：Mac 本地启动脚本

## 想放到 GitHub？

先在 GitHub 新建一个空的仓库，比如 `memory-garden`，再从本地运行：

```fish
git init
git add .
git commit -m "feat: create memory garden prototype"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/memory-garden.git
git push -u origin main
```

如果你直接把仓库 URL 发给 ChatGPT，也可以把这个项目放入你明确指定的仓库中。不要直接推到其他无关的项目。
