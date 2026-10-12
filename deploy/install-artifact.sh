#!/bin/bash
# ============================================================
# memos-fork 服务器安装（产物版）—— 通常由 deploy-local.sh 远程调用，也可手动跑
# 流程: 取 ~/memos-bin.upload → 原子替换 → 重启 → 健康检查（不拉代码、不编译）
# 用法:  ~/projects/memos/deploy/install-artifact.sh [产物路径]
# 注意: 二进制已 go:embed 前端，服务器源码树是否最新不影响运行
# ============================================================
set -e

SRC_TMP="${1:-$HOME/memos-bin.upload}"
BIN_DIR="$HOME/.local/lib/memos"
LOG_PREFIX=">>"

if [ ! -f "$SRC_TMP" ]; then
    echo "$LOG_PREFIX ❌ 找不到产物 $SRC_TMP（先跑 deploy-local.sh 或手动 scp）"
    exit 1
fi

echo "$LOG_PREFIX [1/2] 安装 + 重启服务 ..."
mkdir -p "$BIN_DIR"
# 原子替换: 运行中的二进制不能直接覆写(Text file busy), cp 到临时名再 mv 改名
cp "$SRC_TMP" "$BIN_DIR/memos-bin.new"
chmod +x "$BIN_DIR/memos-bin.new"
mv -f "$BIN_DIR/memos-bin.new" "$BIN_DIR/memos-bin"
rm -f "$SRC_TMP"
sudo systemctl restart memos.service
sleep 5

echo "$LOG_PREFIX [2/2] 健康检查 ..."
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
