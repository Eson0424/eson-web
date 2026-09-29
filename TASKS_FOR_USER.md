# TASKS_FOR_USER

最后更新：2026-09-29（公安备案 Footer 上线 + 人工验收记录 + 推送完成）

## 任务状态

| # | 平台·入口 | 要做什么 | 怎么点（分步） | 状态 | 做完回传什么 |
|---|---|---|---|---|---|
| 1 | 电脑 → 终端（GitHub 网络恢复后） | 推送本次 2 个 commit 和 `v1.3.1` tag 到 GitHub | 已执行：`git push origin main v1.3.1` | ✅ 已完成 | 推送输出：`1fd896e..e3e1336 main -> main`、`* [new tag] v1.3.1 -> v1.3.1`（2026-09-29） |
| 2 | 浏览器 → `https://esonji.cn` → Footer | 人工确认「粤公网安备44030002017573号」跳转 | 用户已在普通浏览器执行 | ✅ 已完成 | 用户已于普通浏览器访问 https://esonji.cn，在网站 Footer 点击「粤公网安备44030002017573号」，确认可以正常跳转至公安备案查询页面（2026-09-29） |
| 3 | Explorer → `E:\Projects\Eson_web\docker\caddy\Caddyfile` | 决定本地未提交的 www 跳转改动怎么处理（线上 www→apex 的 301 已由 Caddy 自动 HTTPS 生效，该改动疑似冗余） | 第1步：跑 `cd E:\Projects\Eson_web; git diff docker/caddy/Caddyfile`；第2步：确认是否还要保留这段 `www.{$SITE_DOMAIN}` 站点块；第3步：告诉我「提交」或「丢弃」 | ⏳待做 | 回传你的选择（提交 / 丢弃 / 先不动） |

## 已完成（无需你操作，仅备查）

| 项 | 结果 |
|---|---|
| Footer 公安备案 | 生产 `https://esonji.cn/` 底部已同时展示 ICP 与「图标 + 粤公网安备44030002017573号」 |
| 公安备案链接 | `https://beian.mps.gov.cn/#/query/webSearch?code=44030002017573`（`target="_blank"` + `rel="noopener noreferrer"`） |
| 图标资源 | `https://esonji.cn/beian.png` → 200 image/png，与桌面原图 SHA256 一致 |
| 部署 | 前端镜像已重建、容器 healthy；后端 / 数据库 / Caddy 未改动（无 migration） |
| 人工验收 | 用户于 2026-09-29 在普通浏览器确认公安备案编号可正常跳转至查询页面 |
| 本地产物 | 截图与探测报告：`E:\Agent\Codex\.codex\visualizations\2026\09\29\01a0eb70-99f2-7351-9a03-bbefee2a2e0d\` |
