# 国内为主的多人部署建议

核对日期：2026-09-06。当前多数玩家在中国大陆，少数玩家在欧洲/澳洲；现有 Render 房间位于新加坡，0.5 CPU / 512 MB。此前测试线路 RTT 为 233–244 ms，这不是国内用户的实测结果。

## 推荐决策

优先短期测试腾讯云 Lighthouse 香港节点（或同类阿里云香港轻量），不要先升级 Render CPU。香港是基于玩家分布的候选，并不保证所有中国运营商的线路都优于新加坡。至少让电信、联通、移动中实际参与游戏的玩家分别在晚间测试，比较中位数 RTT、p95 RTT、抖动、断线次数与游戏手感。一个便宜但高抖动的线路不适合 FPS。

| 方案 | 公开费用参考（美元） | 优点与边界 |
| --- | --- | --- |
| 当前 Render 新加坡 | 现有 0.5 CPU / 512 MB 为 $7/月，Hobby 含 5 GB 出站 | 运维方便，当前无需迁移；升级 CPU 不会改变跨境路由 |
| 腾讯云 Lighthouse 香港 | 国际站文档：2 核 / 2 GB / 40 GB SSD / 20 Mbps / 512 GB 为 $6/月；更高流量档 $8.50/月 | 适合做国内玩家优先的低成本测试；最终价格、库存、账号地区、续费价以购买页为准，需要自己维护进程与系统 |
| AWS Lightsail 东京或新加坡 | IPv4 Linux：1 GB 为 $7/月、2 GB 为 $12/月；流量额度因地区而异 | 套餐流量较多；便宜不代表中国大陆线路更好，必须同样实测 |

CPU 数字不能直接当作持续性能对比，共享/突发型实例要观察实际服务端循环耗时。当前小规模房间不需要数据库、Redis或多实例，只保留一个房间进程；多人规模扩大后再做有房间路由的水平扩展。

## 迁移步骤（尚未购买或执行）

1. 先选一个月或供应商允许的短期试用，创建香港 Linux 实例，建议 2 GB 内存留出系统和部署空间。
2. 安装 Node 24，拉取现有公开仓库，运行 `npm ci --include=dev`；以 systemd 或 Docker restart policy 常驻执行 `npm run pvp:server`。
3. 用 Caddy/Nginx 在 443 端口终止 HTTPS/WSS，转发到本机 2567。证书需要一个已验证归属的子域名；不要把裸 HTTP 接到 HTTPS 游戏页。
4. 设置 `ALLOWED_ORIGINS=https://joyehuang.app,https://paperstrike-arena.vercel.app`，确认 `/health` 和双人私人房间都正常。
5. 邀请国内及海外玩家一起测试；通过后才改 Vercel 的 `NEXT_PUBLIC_PVP_SERVER_URL` 并重新部署。保留 Render 作为回滚，确认稳定后再停用，避免两边长期重复计费。

同一房间仍由一个地区的服务器裁定。大多数人在国内时，优先照顾国内线路，欧洲/澳洲的少数玩家仍需要接受距离带来的延迟；把同一房间分别放在多个地区不会自动消除它。未来可按房间选择地区，但不是把一个房间复制成多份独立状态。

## 如何判断卡在哪里

- 低 FPS：浏览器渲染/设备问题。先用“流畅画质”，测同场景下改善幅度；这不影响网络 RTT。
- FPS 正常、RTT 或抖动高：线路问题。改变节点和供应商进行对照，增加 CPU 通常无效。
- RTT 不高但多人一起卡、服务器 CPU 长时间高或模拟耗时接近每帧预算：先定位服务端热点，再扩大单实例。
- RTT 高时射击判定拖后、偶尔位置纠正：还需要完整预测/输入重放及有上限的命中回溯。当前输入历史位置纠正不是完整延迟补偿，不把网络体验描述为已经解决。

不要用一次 HTTP 健康检查或空房间平均 RTT 宣称多人性能合格。验收需要持续移动、射击、复活，以及真实晚间网络下的两人/四人对局。全球玩家同时低延迟不能仅靠低价服务器保证。

## 官方来源

- [腾讯云 Lighthouse 价格表](https://intl-sg.tencent-cloud.com/document/product/1103/47794)
- [腾讯云官方 Lighthouse 文档 PDF](https://staticintl.cloudcachetci.com/doc/pdf/product/pdf/tencent-cloud_1103_41252_en.pdf)
- [AWS Lightsail 价格](https://aws.amazon.com/lightsail/pricing/)
- [AWS Lightsail 流量规则](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-data-transfer-allowance.html)
- [阿里云轻量实例规格与香港可用区域](https://www.alibabacloud.com/help/en/simple-application-server/product-overview/instance-families/)
- [Render 价格](https://render.com/pricing)
- [Render 出站流量](https://render.com/docs/outbound-bandwidth)
