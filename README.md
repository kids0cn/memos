# memos-fork · 个人 Memos 改造项目

> 本 fork 基于 [usememos/memos](https://github.com/usememos/memos)（**MIT 协议**，版权声明保留在 `README.upstream.md` 及各源文件头部）。
> 目标：把 Memos 改造成"13 年日记 + 个人知识库"最顺手的形态。
> **本 README 兼项目台账**：任务目标、改进状态、部署说明都在这，每次改动追加日志。

---

## 任务目标（Roadmap）

- [x] **P0 部署基线**：源码自建 + 前端烤入（pnpm release）+ systemd 三件套（2026-10-11）
- [ ] **P1 日历打点**：CalendarView 只高亮有 `#日记` 的日期（点日期直达当天）——翻13年日记不用滚动
- [ ] P2 随机翻一天旧日记 / 按年份跳转
- [ ] P3 更多想法（随缘追加）

**P1 技术线索**（给开发机的你/AI 助手）：
- 组件：`web/src/components/CalendarView/CalendarGrid.tsx`（React19 + TS + Vite + Tailwind v4）
- 数据：app 内已有 memo 查询 hooks；"哪些天有日记"可一次拉 `#日记` 列表聚合日期集合（约630个日期）
- 判定：`createTime`（迁移时已对齐真实日记日期，2013-01→2026-10）

## 分支约定

- `feature/diary-calendar` ← **当前开发分支**（开发机 clone 后在此干活）
- 基线：上游 main @ `d775160`（2026-10-11）；上游同步=rebase，可选不追

## 工作流（开发 → 部署）

```
# 1) 开发机 clone
git clone https://github.com/kids0cn/memos.git
cd memos && git checkout feature/diary-calendar

# 2) 本地开发（AI 辅助随意：Claude Code / Cursor 都行）
#    前端预览：cd web && pnpm install && pnpm dev   (API 代理到测试实例自定)

# 3) push 到你的 fork
git push origin feature/diary-calendar

# 4) SSH 到服务器部署（一条命令：拉代码→前端→后端→重启→健康检查）
ssh openclaw@<服务器> '~/projects/memos/deploy/deploy.sh'

# 4') 本地构建部署（**服务器零编译 · 弱服务器推荐**）：
#     本机 pnpm release + go build → 分片上传 → 服务器只替换+重启+健康检查
./deploy/deploy-local.sh
```

## 部署管线说明

`deploy/deploy.sh` 在服务器（本机）执行：
1. `git pull` 当前分支（默认 `feature/diary-calendar`，可传参）
2. `web/`：pnpm install + **pnpm release**（SPA 产物 → `server/frontend/dist`，被 go:embed 烤入）
3. `go build` → 安装到 `~/.local/lib/memos/memos-bin`
4. `systemctl restart memos.service` + 健康检查（API + 前端 assets + 公网域名）
- 服务器环境已就绪：node26（corepack pnpm）、go1.x（~/.local/go）、GOPROXY= goproxy.cn
- 服务：`memos.service`（127.0.0.1:5230，公网 `memos.hack4fun.asia` 走 cloudflared 隧道）

`deploy/deploy-local.sh` 在**开发机**执行（弱服务器推荐，与 deploy.sh 二选一）：
1. 本机 `pnpm release` + `go build`（前端 go:embed 烤入二进制）
2. 分片上传（4MB/片 + 3 次重试，绕开大文件传输断连）+ 远端 md5 校验
3. 服务器 `deploy/install-artifact.sh`：原子替换 → 重启 → 健康检查（**不拉代码、不编译**）
- 前提：本机 node/pnpm + Go（≥ go.mod 版本）；`ssh-copy-id` 免密已配；不拉代码也能部署（二进制自带前端与源码状态无关）

**通道三 · 产物走 GitHub Release 资产**（手动，无脚本；**SSH 不通时用**，例：本机代理 TUN 掐断 22 端口裸 TCP）：
1. 开发机 `pnpm release` + `go build -trimpath -ldflags "-s -w" -o memos-bin ./cmd/memos`
2. 用 GitHub API 发布 Release 资产 `memos-bin`，tag 形如 `deploy-YYYYMMDD-<shortsha>`
3. 部署机（无需 token、不拉代码）：`curl -L -o /tmp/memos-bin <资产 URL> && ~/projects/memos/deploy/install-artifact.sh /tmp/memos-bin`
- 仓库公开 → 资产公开可下（二进制只含代码 + 前端 dist，**不含日记数据/密钥**）
- 最近资产：`deploy-20261013-7c0d131a5`（67,211,527 bytes，md5 `1e502b6ec31050f75b7832142ce3e999`）

## 改进状态日志

| 日期 | 改动 | 状态 |
|------|------|------|
| 2026-10-13 | 部署通道三：产物打成 GitHub Release 资产（本机 SSH 被代理 TUN 掐断时的替代路径；资产 `deploy-20261013-7c0d131a5`，md5 `1e502b6e…`，下载侧已验字节一致） | ✅ |
| 2026-10-13 | 底部日期导航条：列表末尾「回到今天 / ← 上一天 / 回到顶部 / 下一天 →」，按相邻**有内容的日期**跳转且日历窗口同步（46 locale 同步） | ✅ |
| 2026-10-13 | 修手机端日历月份丢失：抽屉关闭会卸载侧栏 → 月份改由 URL 日期筛选派生，浏览 override 提升到 AppSidebarContext | ✅ |
| 2026-10-12 | 日期选择器弹层三级缩放导航（日→月→年，点年份直跳 2013，`0e1f7f43e` 补记） | ✅ |
| 2026-10-12 | 侧栏日历：标题「年月」点选日期（DayPicker）+「只显示有日记的日期」开关（跳空月/空白天占位，localStorage 持久） | ✅ |
| 2026-10-12 | 本地构建管线 deploy-local.sh + install-artifact.sh（服务器零编译，分片上传断连重试） | ✅ |
| 2026-10-12 | fork 立项（kids0cn/memos）+ README 台账 + deploy/deploy.sh 管线 | ✅ |
| 2026-10-12 | 运维加固：运行时迁 /var/lib/shellcrash（代理层，详见服务器 skill shellcrash-proxy） | ✅ |
| 2026-10-11 | 部署基线：源码构建修复（pnpm release 烤入前端）+ systemd 三件套（memos/cloudflared/代理） | ✅ |

## 数据与隐私

- 数据目录：`~/.hermes/memos-data/`（sqlite + PAT），**不在本仓库**
- 本仓库只含代码；日记正文永不入库
