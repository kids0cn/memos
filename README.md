> ✨ Featured sponsor: [CodeRabbit — Industry-leading AI code reviews](https://coderabbit.link/usememos).

# Memos

<img src="./web/public/logo.webp" alt="" width="96" align="right">

**Your thoughts, your data, shared on your terms.**

Memos is a timeline for your notes, and it belongs to you. Write in Markdown, post in seconds, and choose who sees each memo: just you, the people you invite, or anyone with the link.

**[Run with Docker](#quick-start)** · **[Try the live demo](https://demo.usememos.com/)** · [Read the docs](https://usememos.com/docs)

[![GitHub stars](https://img.shields.io/github/stars/usememos/memos?style=flat-square&logo=github&label=Stars)](https://github.com/usememos/memos)
[![Latest release](https://img.shields.io/github/v/release/usememos/memos?style=flat-square&label=Release)](https://github.com/usememos/memos/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/neosmemo/memos?style=flat-square&logo=docker)](https://hub.docker.com/r/neosmemo/memos)
[![MIT license](https://img.shields.io/github/license/usememos/memos?style=flat-square)](LICENSE)

<img src="https://raw.githubusercontent.com/usememos/.github/refs/heads/main/assets/demo.png" alt="The Memos timeline with a memo composer and recent memos" height="512" />

## Why Memos?

- **Write first** — Save a thought without choosing a title or folder. Memos are written in Markdown and can include images and files.
- **Find it later** — Search, filter by tag, or look back through any day on the timeline. Pin what matters and save the filters you reuse as views.
- **Yours to keep** — Self-host Memos with [zero telemetry](https://usememos.com/features/data-ownership), [MIT-licensed source](LICENSE), and a full export of your memos.
- **Share when you choose** — New memos are private. Make one visible to signed-in users or public when you want to share it.

[Explore all features →](https://usememos.com/features)

## Quick Start

Run Memos with Docker:

```bash
docker run -d \
  --name memos \
  -p 5230:5230 \
  -v ~/.memos:/var/opt/memos \
  neosmemo/memos:stable
```

Other install options are in the [deployment guide](https://usememos.com/docs/deploy).

Releases use `YY.MM.N`: each month starts at `26.10.0`, point releases follow as `26.10.1`, and release candidates are
`26.10.0-rc.1`. Calendar release tags have no `v` prefix. The Docker `26.10` tag follows the newest stable release of its
month, `stable` follows stable releases, and `canary` follows development builds. If upgrading from a release before v0.31.0,
run [v0.31.0](https://github.com/usememos/memos/releases/tag/v0.31.0) successfully.
See the [upgrade requirements](store/migration/README.md) for earlier versions.

## Web Clipper

Save pages, selections, and images from your browser straight into Memos as source-linked Markdown. Get the [Memos Web Clipper](https://usememos.com/web-clipper) for [Chrome](https://chromewebstore.google.com/detail/memos-web-clipper/nebaoebnljalfegiidibihhkebeiklbl) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/memos-web-clipper/).

| 日期 | 改动 | 状态 |
|------|------|------|
| 2026-10-13 | 底部日期导航条：列表末尾「回到今天 / ← 上一天 / 回到顶部 / 下一天 →」，按相邻**有内容的日期**跳转且日历窗口同步（46 locale 同步） | ✅ |
| 2026-10-13 | 修手机端日历月份丢失：抽屉关闭会卸载侧栏 → 月份改由 URL 日期筛选派生，浏览 override 提升到 AppSidebarContext | ✅ |
| 2026-10-12 | 日期选择器弹层三级缩放导航（日→月→年，点年份直跳 2013，`0e1f7f43e` 补记） | ✅ |
| 2026-10-12 | 侧栏日历：标题「年月」点选日期（DayPicker）+「只显示有日记的日期」开关（跳空月/空白天占位，localStorage 持久） | ✅ |
| 2026-10-12 | 本地构建管线 deploy-local.sh + install-artifact.sh（服务器零编译，分片上传断连重试） | ✅ |
| 2026-10-12 | fork 立项（kids0cn/memos）+ README 台账 + deploy/deploy.sh 管线 | ✅ |
| 2026-10-12 | 运维加固：运行时迁 /var/lib/shellcrash（代理层，详见服务器 skill shellcrash-proxy） | ✅ |
| 2026-10-11 | 部署基线：源码构建修复（pnpm release 烤入前端）+ systemd 三件套（memos/cloudflared/代理） | ✅ |

## Sponsors

<p>
  <a href="https://coderabbit.link/usememos" target="_blank" rel="noopener"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/usememos/.github/refs/heads/main/assets/sponsors/coderabbit/white-typemark.svg" /><img src="https://raw.githubusercontent.com/usememos/.github/refs/heads/main/assets/sponsors/coderabbit/orange-typemark.svg" alt="CodeRabbit — Cut code review time and bugs in half" height="40" align="middle" /></picture></a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.testmuai.com/?utm_medium=sponsor&utm_source=memos" target="_blank" rel="noopener"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/usememos/.github/refs/heads/main/assets/sponsors/testmuai/white.png" /><img src="https://raw.githubusercontent.com/usememos/.github/refs/heads/main/assets/sponsors/testmuai/black.png" alt="TestMu AI — The world’s first full-stack Agentic AI Quality Engineering platform" height="30" align="middle" /></picture></a>
</p>

Love Memos? [Sponsor the project on GitHub](https://github.com/sponsors/usememos).

## Get Help

Read the [docs](https://usememos.com/docs), join [Discord](https://discord.gg/tfPJa4UmAv), or ask in [GitHub Discussions](https://github.com/usememos/memos/discussions). Found a bug or have an idea? [Open an issue](https://github.com/usememos/memos/issues/new/choose). To contribute, see the [contributing guide](https://usememos.com/docs/development/contributing).

## Star History

<a href="https://www.star-history.com/?repos=usememos%2Fmemos&amp;type=date&amp;legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=usememos/memos&amp;type=date&amp;theme=dark&amp;legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=usememos/memos&amp;type=date&amp;legend=top-left" />
    <img alt="Memos star history chart" src="https://api.star-history.com/chart?repos=usememos/memos&amp;type=date&amp;legend=top-left" />
  </picture>
</a>
