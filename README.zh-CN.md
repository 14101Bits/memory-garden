# Memory Garden

**在 Mac 上，用更舒服的方式复习 Anki。**

Memory Garden 是一个基于 HTML、CSS 和 JavaScript 的本地 Anki 复习界面。它通过 [AnkiConnect](https://github.com/amikey/anki-connect) 连接官方 Anki 桌面端，复习间隔、学习历史和 AnkiWeb 同步仍由 Anki 本身管理。

**文档语言：** [English](README.md) · [日本語](README.ja.md) · 简体中文

> [!NOTE]
> 这是一个独立的非官方原型，尚未在所有 Anki 版本和卡片模板上完成实际测试。

## 功能

- 简洁的复习首页、浅色／深色主题、每日目标（5～30 次）。
- 牌组列表、待复习数量、今日完成量与最近七天的数据（部分依赖 AnkiConnect 版本）。
- 翻面、评分，并保留 Anki 原本的复习调度。
- 键盘快捷键：`Space` 显示答案，`1`～`4` 评分。
- 无法连接 Anki 时仍可体验示例卡片；示例操作不会修改真实牌组。
- 隔离卡片脚本执行，支持常见图片、音频。
- **Mac 一键启动：** 自动检查 Anki，按需启动本地网页服务，并打开浏览器。不需要每次手动开终端。

## 环境要求

- macOS 和[官方 Anki 桌面版](https://apps.ankiweb.net/)。
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 插件（安装代码 `2055492159`）。
- Python 3，用于提供本地 HTTP 服务。正常使用不需要安装 Node.js 或执行 `npm install`。
- Safari、Chrome、Firefox 等现代浏览器。

注意：第三方应用 **AnkiApp／AlgoApp** 并非官方 Anki，不能通过此方案同步。

## Mac 安装方式（推荐）

1. 将项目克隆到你准备长期保留的目录：

   ```sh
   git clone https://github.com/14101Bits/memory-garden.git
   cd memory-garden
   ```

2. 在你的 Mac 上生成并安装启动器（只需第一次操作）：

   ```sh
   bash macos/install.command
   ```

3. 到 `~/Applications` 找到 **Memory Garden.app**，拖到 Dock。以后点击图标就会自动：

   - 检查 Anki，没运行时尝试打开；如果没安装 Anki，网页仍能进入演示模式。
   - 检查本地 `127.0.0.1:4173` 服务；已有服务就复用，没有就后台启动。
   - 使用默认浏览器打开 <http://127.0.0.1:4173>。

   反复点击不会主动重复启动相同端口的服务。关掉浏览器后，后台服务器仍会运行。

4. 在 Anki 中打开 **工具 → 插件 → AnkiConnect → 配置**，保留原本的 JSON，确保 `webCorsOriginList` 包含：

   ```json
   "webCorsOriginList": ["http://127.0.0.1:4173", "http://localhost:4173"]
   ```

   这里仅是 **一个 JSON 字段**，不要用它覆盖完整的插件配置。AnkiConnect 可能会弹窗请求授权。复习真实卡片时，请保持 Anki 运行。

要停止网页服务器、但保留 Anki 运行：

```sh
bash macos/stop.command
```

如果移动了项目目录，需要重新运行安装命令以更新路径。安装脚本会备份旧启动器；平时 `git pull` 更新网页代码不需要重装。

这个启动器以普通用户权限运行，不使用 `sudo`，也不会关闭 macOS 安全功能。如果系统提示未验证的 App，请先检查脚本，再按 **系统设置 → 隐私与安全性** 中的正常流程决定是否允许。本项目默认**不设置开机自启**，避免无意义的后台耗电。

## 不安装启动器也可以使用

在仓库目录执行：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

浏览器打开 <http://127.0.0.1:4173>。旧版 `start.command` 仍然可用。不要通过 `file://` 直接打开 `index.html`，否则无法使用本地 API。

## 同步原理

```text
Memory Garden（本地网页 :4173）
      ↓ AnkiConnect API（127.0.0.1:8765）
Anki Desktop（卡片、复习算法、学习记录）
      ↓ Anki 自带同步功能
AnkiWeb → 其他官方 Anki 客户端
```

Memory Garden 不直接登录 AnkiWeb，也不会把牌组上传到其他服务。网页上的 **Sync AnkiWeb** 按钮会请求桌面版 Anki 同步，最终结果需要在 Anki 中确认。浏览器本地只记录主题和每日目标。

## 已知限制与安全说明

- 复习真实卡片时必须开启桌面版 Anki；不要同时在原版 Anki 和网页操作同一张卡。
- 使用 JavaScript、TTS、视频或特殊插件的高级卡片可能无法完全正确显示。
- 一些统计字段依赖 AnkiConnect 的额外接口，不支持时会显示 `—`。
- 网页服务只绑定 `127.0.0.1`；**不要将 AnkiConnect 的 `8765` 端口暴露到公网。**
- 如果 `4173` 端口已被其他应用占用，启动器会报错，不会结束别人的进程。
- Mac 重启后服务默认不运行；需要使用时点击 Dock 图标即可。

## 常见问题

| 现象 | 排查方向 |
| --- | --- |
| 提示缺少 Python 3 | 安装 Python 3 后重新点击启动器。 |
| 显示 Anki 未连接 | 检查 Anki 是否打开、AnkiConnect 是否启用以及 `webCorsOriginList` 配置。 |
| 提示 `4173` 端口占用 | 关闭冲突服务，或执行 `bash macos/stop.command` 停止本项目启动的服务。 |
| 提示找不到项目 | 项目移动后，重新执行 `bash macos/install.command`。 |
| 服务启动失败 | 查看 `~/Library/Logs/MemoryGarden/server.log`。 |

## 开发

网页核心文件为 `index.html`、`styles.css`、`main.js`、`lib.js`，无需构建。运行测试需要 Node.js：

```sh
npm test
```

Mac 启动器的源码位于 `macos/`。生成的 `.app` 保存在你自己的 `~/Applications`，不提交到 Git。
