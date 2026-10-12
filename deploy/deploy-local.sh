#!/bin/bash
# ============================================================
# memos-fork 部署管线（本地构建版 · 弱服务器推荐）
# 在开发机执行：本地 pnpm release + go build → scp 产物 → 服务器只做替换+重启+健康检查
# 用法:  ./deploy/deploy-local.sh
#   DEPLOY_SSH=openclaw@192.168.1.20   目标机（默认如左）
#   REMOTE_SRC=~/projects/memos        服务器仓库路径（install-artifact.sh 所在处）
# 前提: 本机 node/pnpm + Go(版本≥go.mod)；已 ssh-copy-id 免密；服务器 sudo 免密
# 对比 deploy.sh（服务器端全流程）：服务器零编译，最重的 pnpm/go build 都在本机
# ============================================================
set -euo pipefail

DEPLOY_SSH="${DEPLOY_SSH:-openclaw@192.168.1.20}"
REMOTE_SRC="${REMOTE_SRC:-\$HOME/projects/memos}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 与服务器 go.mod / 本机安装位置对齐
export PATH="$HOME/.local/go/bin:$PATH"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
export GOTOOLCHAIN=local

echo ">> [1/4] 前端构建 (pnpm release → server/frontend/dist) ..."
cd "$REPO_DIR/web"
pnpm release 2>&1 | tail -2

echo ">> [2/4] 后端构建 (go build，前端 go:embed 烤入) ..."
cd "$REPO_DIR"
go build -trimpath -ldflags "-s -w" -o memos-bin ./cmd/memos
ls -la memos-bin | awk '{print "    产物:", $5, "bytes"}'

echo ">> [3/4] 分片上传 $DEPLOY_SSH:~/memos-bin.upload ..."
# 大文件单流传输会 Broken pipe → 4MB 分片 + 每片 3 次重试，远端合并后 md5 校验
CHUNK_DIR="$(mktemp -d)"
split -b 4m -d memos-bin "$CHUNK_DIR/p_"
for f in "$CHUNK_DIR"/p_*; do
    ok=0
    for i in 1 2 3; do
        if scp -q "$f" "$DEPLOY_SSH:memos-bin.upload.$(basename "$f")"; then ok=1; break; fi
        echo "    分片 $(basename "$f") 断连，重传 ($i)"; sleep 1
    done
    if [ "$ok" != 1 ]; then echo "❌ 分片上传失败: $f"; rm -rf "$CHUNK_DIR"; exit 1; fi
done
rm -rf "$CHUNK_DIR"
LOCAL_MD5="$(md5sum memos-bin | awk '{print $1}')"
REMOTE_MD5="$(ssh "$DEPLOY_SSH" 'cat $HOME/memos-bin.upload.p_* > $HOME/memos-bin.upload && rm -f $HOME/memos-bin.upload.p_* && md5sum $HOME/memos-bin.upload' | awk '{print $1}')"
if [ "$LOCAL_MD5" != "$REMOTE_MD5" ]; then echo "❌ md5 不一致: $LOCAL_MD5 != $REMOTE_MD5"; exit 1; fi
echo "    md5 校验通过: $LOCAL_MD5"

echo ">> [4/4] 服务器: 原子替换 + 重启 + 健康检查 ..."
ssh "$DEPLOY_SSH" "bash ${REMOTE_SRC}/deploy/install-artifact.sh"
