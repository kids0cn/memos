#!/bin/bash
# ============================================================
# memos-fork 部署管线（服务器端）
# 用法:  ~/projects/memos/deploy/deploy.sh [分支名]
# 默认部署: feature/diary-calendar
# 流程: git pull → 前端 pnpm release → go build → 重启 → 健康检查
# ============================================================
set -e

BRANCH="${1:-feature/diary-calendar}"
SRC="$HOME/projects/memos"
BIN_DIR="$HOME/.local/lib/memos"
LOG_PREFIX=">>"

export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOPROXY="https://goproxy.cn,direct"
export GOTOOLCHAIN=local
export COREPACK_NPM_REGISTRY="https://registry.npmmirror.com"
export npm_config_registry="https://registry.npmmirror.com"

echo "$LOG_PREFIX [1/5] 拉取分支 $BRANCH ..."
cd "$SRC"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH" || echo "!! 本地有提交或冲突——请检查 git status"

echo "$LOG_PREFIX [2/5] 前端构建 (pnpm release → server/frontend/dist) ..."
cd "$SRC/web"
pnpm install --registry https://registry.npmmirror.com --silent
pnpm release 2>&1 | tail -3

echo "$LOG_PREFIX [3/5] 后端构建 (go build) ..."
cd "$SRC"
go build -trimpath -ldflags "-s -w" -o "$SRC/memos-bin" ./cmd/memos
ls -la "$SRC/memos-bin" | awk '{print "    产物:", $5, "bytes"}'

echo "$LOG_PREFIX [4/5] 安装 + 重启服务 ..."
mkdir -p "$BIN_DIR"
cp "$SRC/memos-bin" "$BIN_DIR/memos-bin"
sudo systemctl restart memos.service
sleep 5

echo "$LOG_PREFIX [5/5] 健康检查 ..."
API=$(curl -s -m 10 -o /dev/null -w '%{http_code}' 'http://127.0.0.1:5230/api/memos?pageSize=1')
FRONT=$(curl -s -m 10 http://127.0.0.1:5230/ | grep -c 'assets/' || true)
SVC=$(systemctl is-active memos.service)

echo "    服务: $SVC | API: $API | 前端资源引用: $FRONT"
if [ "$SVC" = "active" ] && [ "$API" = "200" ] && [ "$FRONT" -ge 1 ]; then
    echo "$LOG_PREFIX ✅ 部署成功 $(date '+%Y-%m-%d %H:%M:%S')"
else
    echo "$LOG_PREFIX ❌ 健康检查未过——journalctl -u memos -n 30 查日志"
    exit 1
fi
