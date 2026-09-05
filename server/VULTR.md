# 东京多人后端

2026-09-06 部署到用户创建的 Vultr 东京实例：1 vCPU / 2 GB，Ubuntu 24.04 LTS x64。
后端地址 `https://pvp.joyehuang.app`；前端继续由 Vercel 托管于 `https://joyehuang.app`。
域名 A 记录由 Vercel DNS 管理。服务器后台价格为 $10/月，未启用付费备份和额外 DDoS 套餐；税费、流量超额和最终账单以供应商为准。

## 已安装

- Node 24.18.0 官方 x64 二进制（部署时校验官方 SHA256）。
- Caddy 2.11.4 官方 Ubuntu 软件源，自动签发和续期 HTTPS 证书，并代理 WebSocket。
- 游戏目录 `/opt/paperstrike`，运行账号 `paperstrike` 为无登录 shell 的服务账号。
- 首次运行的游戏提交 `be00b537c31fa5e9b1684755cd6d3ae095c6ce8f`。
- `paperstrike-pvp.service` 和 `caddy.service` 已设为开机启动，游戏异常退出自动重启。
- UFW 允许 TCP 22/80/443，默认拒绝其他入站；2567 为代理上游，不对公网开放。
- 部署使用现有管理账户临时登录，没有添加部署用的持久 SSH 公钥。

配置文件保存在 [deploy/paperstrike-pvp.service](deploy/paperstrike-pvp.service) 和 [deploy/Caddyfile](deploy/Caddyfile)。

## 检查服务

```sh
sudo systemctl status paperstrike-pvp caddy --no-pager
sudo journalctl -u paperstrike-pvp -n 80 --no-pager
curl -f https://pvp.joyehuang.app/health
```

健康检查应返回 `{"status":"ok","service":"paperstrike-pvp","protocol":2}`。
部署验收已经覆盖真实 WSS 双人私人房间、准备/开局、昵称数据、移动、锁定武器和手机/电脑隔离。
当前测试线路 12 次 RTT 采样中位数 235 ms、p95 237 ms，快照约 15.2 次/秒。
这不是国内玩家测速、并发压测或浏览器帧率验收，不代表迁移后必然低延迟。

## 更新后端

前端 push 仍会自动触发 Vercel 部署。Vultr 后端不会随 push 自动重启，避免中断房间；涉及后端或共享规则的修改必须由维护者在空闲时更新。

先确认 `/opt/paperstrike` 没有未提交修改，记录当前 `git rev-parse HEAD` 作回滚版本。然后以服务账号拉取、检出已经验证的目标提交，安装锁定依赖并重启：

```sh
cd /opt/paperstrike
sudo -u paperstrike git status --short
sudo -u paperstrike git rev-parse HEAD
sudo -u paperstrike git fetch origin main
# 将 VERIFIED_COMMIT 换成已经验证的完整提交 SHA。
sudo -u paperstrike git checkout --detach VERIFIED_COMMIT
sudo -u paperstrike /usr/local/bin/npm ci --include=dev --no-audit --no-fund
sudo systemctl restart paperstrike-pvp
curl -f https://pvp.joyehuang.app/health
```

依赖安装或健康检查失败时不要继续切换前端；检出记录的旧提交、重新安装其锁定依赖并重启。
房间状态只在内存中，重启会结束正在进行的对局。当前只运行一个进程，不能直接复制多实例并套通用负载均衡。

## 前端切换和回滚

Vercel Production 变量 `NEXT_PUBLIC_PVP_SERVER_URL` 设为 `https://pvp.joyehuang.app`，更改后必须重新构建部署前端。
如果实际玩家线路更差，可把同一变量恢复为 `https://paperstrike-pvp.onrender.com` 并重新部署。
原 Render 服务尚未停用，两边都会继续计费。确认东京节点满足真实玩家需求后，再决定是否停用 Render。

## 东京前端测试入口

`https://play.joyehuang.app/pvp` 是现有 Vultr 上的静态前端镜像，A 记录指向 `45.32.255.230`。正式入口仍为 Vercel；两个入口连接同一个 `pvp.joyehuang.app` 后端。

2026-09-06 首次镜像来自提交 `4259798fe69a13778d1e7e8fc645dd318a7d271d`，静态产物约 9.2 MB。此镜像不会随 Git push 自动更新。维护者更新后端 checkout 和依赖后，可运行 `bash server/deploy/update-preview.sh` 构建并更新 `/srv/paperstrike-preview/current`；此脚本不拉取代码，也不重启游戏。后端繁忙时避免在同一台机器上构建。

仓库中的 Caddyfile 展示合并配置。实际服务器通过 `/etc/caddy/sites/paperstrike-preview.caddy` 和主配置的 import 加载前端站点；后端通过 systemd 的 `preview-origin.conf` drop-in 增加镜像 Origin。两种配置形式不要重复应用。

本地线路已验证镜像浏览器建房、真实 WSS 双人加入/开局/移动、六位房间码及设备隔离。HTML 请求 5 次的 TTFB 中位数：Vercel 31 ms，Vultr 248 ms；镜像入口游戏 RTT 中位数 234 ms、p95 236 ms。两站初始 18 个 JS/CSS 资源均成功，解压后共 1,452,155 字节。这些不是国内测试，也不是完整页面渲染耗时。

国内探测和解释见 [NETWORK_TEST_2026-09-06.md](NETWORK_TEST_2026-09-06.md)。仅换前端不会改变玩家到现有游戏后端的路径；只有使玩家可以关闭绕路代理时，才可能间接改善游戏延迟。
