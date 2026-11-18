#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "请先安装 Python 3；或者在项目目录运行其他本地 HTTP 服务器。"
  read -r -p "按 Enter 退出"
  exit 1
fi
(sleep 1; open 'http://127.0.0.1:4173') &
echo 'Memory Garden 正在 http://127.0.0.1:4173 运行。按 Ctrl+C 停止。'
exec python3 -m http.server 4173 --bind 127.0.0.1
