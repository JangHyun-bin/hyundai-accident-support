#!/bin/zsh
set -e
TASK_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$TASK_DIR"
echo 'Browser에서 http://127.0.0.1:8765 를 여세요. 종료: Ctrl+C'
python3 serve.py
