#!/bin/bash
set -eu

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
for candidate in \
  "${PYTHON:-}" \
  "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" \
  "$(command -v python3 2>/dev/null || true)" \
  /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    exec "$candidate" -B "$PROJECT_DIR/scripts/start_local.py" "$@"
  fi
done

printf 'Для запуска PYlearn нужен Python 3. Установи его и открой этот файл ещё раз.\n'
read -r -p 'Нажми Enter, чтобы закрыть окно.'
