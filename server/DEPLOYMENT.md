# PVP 常驻服务部署

多人后端现已部署到 Vultr 东京，通过 https://pvp.joyehuang.app 接入，详见 [Vultr 运维说明](VULTR.md)。原 Render 地址 https://paperstrike-pvp.onrender.com 保留作回滚，尚未停用。前端 `/pvp` 在没有配置服务地址时显示准备中，原单人模式不受影响。

## 架构与范围

Vercel 托管静态前端；独立 Node.js + Colyseus 进程维护房间，通过 HTTPS/WSS 接入。首版每房间 2–4 人，废稿堆场、三分钟自由混战、准备/房主开局/结算/重开、四把枪和补给。服务器裁定移动、伤害、弹药、复活，30 Hz 服务端模拟（每次四个物理子步），对局快照 15 Hz、大厅 5 Hz；事件只发送当前批次。位置包直接交给渲染器，避免整页 React 跟随刷新。

移动端和电脑端使用独立匹配池，房间码加入也经过服务器校验。依据 User-Agent 和触控提示分类；这不能防止伪造设备信息，也无法可靠识别手机外接鼠标键盘。已支持自由混战、累计三杀换枪、一枪到底三种房间规则；快速匹配按设备和玩法共同分池。占点尚未实现。

客户端使用带序号的输入位置历史做确认位置纠正，昵称使用投影到屏幕的 DOM 标签，HUD 显示 FPS 和 RTT；完整输入重放、射击延迟补偿、真实手机操作和高延迟体验仍需验证。不要把当前原型当作已完成竞技公平性验收的版本。

## Render 部署步骤

1. 登录 Render，选择 New → Blueprint，连接 `https://github.com/joyehuang/paperstrike-arena`，使用 main 分支根目录的 `render.yaml`。
2. 审核资源和账单后创建。配置建议为单实例 `0.5c-512mb`（0.5 CPU / 512 MB），新加坡地区；这是小规模试玩的起点，未经并发压测，不承诺承载人数。创建前根据玩家主要地区选择节点，地区创建后不能直接修改。
3. 构建命令 `npm ci --include=dev`，启动命令 `npm run pvp:server`，Node 24.18.0。服务监听平台注入的 `PORT` 和 `0.0.0.0`。无需另起 PM2，平台维护这个进程。
4. 健康检查 `/health` 应返回 `{"status":"ok","service":"paperstrike-pvp","protocol":2}`。使用平台实际分配的 HTTPS 地址，不要猜测服务域名。
5. 在 Vercel 的 paperstrike-arena 项目添加 Production 环境变量 `NEXT_PUBLIC_PVP_SERVER_URL=https://实际服务域名.onrender.com`，重新部署前端。该地址是公开配置，SDK 会建立 WSS 连接。
6. `ALLOWED_ORIGINS` 已包含 `https://joyehuang.app,https://paperstrike-arena.vercel.app`。添加其他正式前端域名时同时更新；预览域名不会自动放行。
7. 用两台同类设备验证快速匹配、房间码、准备/开局、射击/补给/复活、短暂断网重连；再用手机和电脑验证互相无法进入房间。覆盖 30/100/200 ms 延迟、抖动、房主退出和同时拾取/击杀，再对外开放测试。

前端保持 Git push 自动部署。后端配置 `autoDeployTrigger: off`，避免每次前端修改都重启进行中的房间；后端有更新时在空闲窗口手动 Deploy latest commit，并同步前后端协议版本。

## 连接、成本与扩容边界

Render WebSocket 没有固定连接时长上限，但网络切换、维护和发布仍会断开。当前有 5 秒心跳和 20 秒房间重连保留；重连仅适用于原进程仍在运行。房间状态在内存中，进程重启会丢失本局，没有跨重启恢复。不能把它描述成永不断线。

免费 Render 服务在无入站 HTTP/WebSocket 消息 15 分钟后休眠，唤醒有等待，因此正式试玩建议付费常驻实例。费用以创建页为准；当前服务规格为 0.5c-512mb；升级前先依据真实对局指标判断瓶颈。

先保持单实例，默认最多 32 个房间只是防止无限创建的保护上限，不是容量承诺；可通过 `MAX_ROOMS` 调整。上线后观察 CPU、内存、事件循环延迟、网络流量和房间数。扩大到多进程/多实例前，需要 Colyseus 共享 presence/driver、房间路由和相应压测，不能直接开启通用负载均衡。账号和战绩可后续入库，逐帧状态不写数据库。

## 本地开发与检查

两个终端分别执行 `npm run pvp:server` 和 `npm run dev`，打开本地 `/pvp`。本地主机自动连接 2567 端口。局域网真机需要显式配置可访问的服务器地址和允许的前端 Origin。

`npx tsc --noEmit` 和 `node --test tests/*.test.mjs` 检查类型、规则与真实 WebSocket 房间生命周期。自动化检查不能替代真实设备的画面和手感验收。

## 官方资料（2026-09-06 核对）

- [Render WebSocket 与部署断线](https://render.com/docs/websocket)
- [Render 免费实例休眠规则](https://render.com/docs/free)
- [Render Blueprint 配置和地区/实例规格](https://render.com/docs/blueprint-spec)
- [Colyseus 匹配过滤](https://docs.colyseus.io/matchmaker)
- [Colyseus 多进程扩容](https://docs.colyseus.io/scalability)
- [Vercel WebSocket 当前说明](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)：现在支持 WebSocket，但连接仍受 Function 生命周期限制；本方案采用独立房间进程。
