# Memory Garden

**Mac で Anki の復習を、もっと心地よく。**

Memory Garden は HTML・CSS・JavaScript 製の、ローカルで動作する Anki 復習用インターフェースです。[AnkiConnect](https://github.com/amikey/anki-connect) を介して公式デスクトップ版 Anki と連携し、復習間隔の計算・学習履歴・AnkiWeb との同期は Anki 本体に任せます。

**ドキュメント：** [English](README.md) · 日本語 · [简体中文](README.zh-CN.md)

> [!NOTE]
> 本プロジェクトは非公式のプロトタイプです。すべての Anki バージョンやカードテンプレートでの動作確認は完了していません。

## 主な機能

- シンプルなホーム画面、ライト／ダークテーマ、1 日の目標（5〜30 回）。
- デッキ一覧、復習予定数、当日の復習回数、直近 7 日間の記録（一部は AnkiConnect の対応状況による）。
- カードの表裏表示、Anki 本体を利用した復習評価。
- キーボード操作：`Space` で解答表示、`1`〜`4` で評価。
- Anki に接続できない場合のデモカード（実際のデータには影響しません）。
- 一般的な画像・音声を扱う、スクリプト実行を禁止したカード表示領域。
- **Mac 用ワンクリック起動：** 必要に応じて Anki とローカルサーバーを起動し、ブラウザを開きます。

## 必要な環境

- macOS と[公式 Anki デスクトップ版](https://apps.ankiweb.net/)。
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) アドオン（コード `2055492159`）。
- ローカル HTTP サーバー用の Python 3。アプリを動かすための Node.js や `npm install` は不要です。
- Safari、Chrome、Firefox などのブラウザ。

第三者製の **AnkiApp／AlgoApp** は公式 Anki とは別製品であり、この連携方式には対応していません。

## Mac でのインストール（推奨）

1. リポジトリをクローンします。

   ```sh
   git clone https://github.com/14101Bits/memory-garden.git
   cd memory-garden
   ```

2. 自分の Mac 上でランチャーを作成・インストールします（初回のみ）。

   ```sh
   bash macos/install.command
   ```

3. `~/Applications/Memory Garden.app` を Dock に追加します。クリックすると、Anki が未起動の場合は起動を試み、`127.0.0.1:4173` のサーバーを再利用または新規起動し、ブラウザで画面を開きます。Anki がインストールされていない場合もデモ表示は利用できます。

4. Anki の **ツール → アドオン → AnkiConnect → 設定** を開き、既存の JSON 設定を維持したまま、`webCorsOriginList` に以下の URL を追加します。

   ```json
   "webCorsOriginList": ["http://127.0.0.1:4173", "http://localhost:4173"]
   ```

   この部分だけで設定ファイル全体を置き換えないでください。ブラウザからのアクセス時に AnkiConnect 側の許可確認が表示される場合があります。実際のカードを復習する間は Anki を起動しておいてください。

サーバーだけを停止する場合：

```sh
bash macos/stop.command
```

プロジェクトのフォルダーを移動した場合は、インストーラーを再実行してください。古いランチャーはバックアップとして残します。通常の `git pull` では、Web 側の変更がそのまま反映されます。

このランチャーは一般ユーザー権限で動作し、`sudo` や macOS のセキュリティ機能の無効化を必要としません。初回実行時に警告が出た場合は、内容を確認し、必要に応じて **システム設定 → プライバシーとセキュリティ** の通常の確認手順を利用してください。ログイン時の自動起動は設定しません。

## 手動起動

リポジトリのルートで以下を実行します。

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

次に <http://127.0.0.1:4173> を開きます。従来の `start.command` も利用できます。`file://` で `index.html` を直接開く方式ではローカル API と連携できません。

## 連携の仕組み

```text
Memory Garden（ローカル Web UI :4173）
      ↓ AnkiConnect API（127.0.0.1:8765）
Anki Desktop（復習間隔・学習履歴）
      ↓ Anki 標準の同期
AnkiWeb → ほかの公式 Anki クライアント
```

Memory Garden 自身は AnkiWeb にログインせず、学習データを外部サービスへ送信しません。画面の「Sync AnkiWeb」は Anki 本体に同期を依頼する機能であり、完了の確認は Anki 側で行ってください。ブラウザには表示テーマと 1 日の目標のみを保存します。

## 制限事項と注意点

- 実際のカード復習にはデスクトップ版 Anki の起動が必要です。Anki 本体と本 Web 画面で同じカードを同時操作しないでください。
- JavaScript、TTS、動画、特殊なアドオンに依存するカードは、正しく表示されない場合があります。
- 一部の統計値は AnkiConnect の実装に依存し、未対応の場合は `—` と表示されます。
- HTTP サーバーは `127.0.0.1` のみにバインドします。AnkiConnect のポート `8765` を外部に公開しないでください。
- ポート `4173` が別のアプリに使われている場合、既存プロセスを停止せずエラーを表示します。
- Mac 再起動後は、必要なときに Dock のアプリをクリックして起動します。常駐の自動起動は初期設定では無効です。

## トラブルシューティング

| 症状 | 確認事項 |
| --- | --- |
| Python 3 が見つからない | Python 3 をインストールしてください。 |
| Anki に接続できない | AnkiConnect の有効化と `webCorsOriginList` を確認してください。 |
| ポート `4173` が使用中 | 競合サービスを停止するか、`bash macos/stop.command` を実行してください。 |
| フォルダーが見つからない | 移動後のリポジトリで `bash macos/install.command` を再実行してください。 |
| サーバーが起動しない | `~/Library/Logs/MemoryGarden/server.log` を確認してください。 |

## 開発

Web UI は `index.html`、`styles.css`、`main.js`、`lib.js` で構成されています。追加のビルドは不要です。テストのみ Node.js が必要です。

```sh
npm test
```

Mac ランチャーのソースは `macos/` にあります。生成した `.app` は Git にコミットしません。
