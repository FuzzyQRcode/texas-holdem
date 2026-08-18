# 在线联机德州扑克

零成本的在线德州扑克游戏，与朋友跨网对战，浏览器即开即玩。

## 快速开始

```bash
npm install
npm start
```

打开 `http://localhost:3000` 即可。

## 与朋友联机

### 方式一：SSH 隧道（最简单，推荐首选）

无需安装任何东西，Windows 自带 SSH。本地启动服务后，开一个新终端：

```bash
ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
```

终端会输出一个公网地址（如 `https://xxx.lhr.life`），在手机或任何设备上打开即可。关掉这个终端隧道就断。

### 方式二：本地局域网
1. 启动后查看你的内网 IP
2. 手机连同一 WiFi，浏览器输入 `http://你的内网IP:3000`

### 方式三：Render.com 免费部署（持久在线）
1. 代码推送到 GitHub
2. 在 render.com 创建 Web Service，连接仓库
3. Build: `npm install`，Start: `node server.js`，Plan: Free
4. 获得公网 URL，发给朋友

### 方式四：Cloudflare Tunnel 本地穿透
```bash
# 本地启动服务后
cloudflared tunnel --url http://localhost:3000
```
获得公网地址，发给朋友即可。

## 玩法

1. 输入昵称，点击「创建房间」
2. 把房间号发给朋友，他们输入昵称 + 房间号加入
3. 房主点击「开始游戏」
4. 系统自动发牌、收取盲注，开始第一手

### 规则速览
- 每人 1000 起始筹码，小盲注 10，大盲注 20
- 四轮下注：翻牌前 → 翻牌（3张公共牌）→ 转牌（第4张）→ 河牌（第5张）
- 动作：弃牌 / 过牌 / 跟注 / 加注 / 全押
- 摊牌后从 7 张牌中选最佳 5 张定胜负

## 项目结构

```
texas-holdem/
├── server.js              # 服务端入口（Express + Socket.io）
├── package.json
├── src/                   # 游戏逻辑（纯模块，可独立测试）
│   ├── Deck.js            # 牌组：洗牌、发牌
│   ├── HandEvaluator.js   # 牌型评估：7选5最佳牌型
│   ├── BettingRound.js    # 下注轮：动作处理、轮次判断
│   ├── Pot.js             # 奖池：底池、边池分配
│   └── GameController.js  # 游戏控制器：串联完整一手
├── test/
│   └── handEvaluator.test.js  # 牌型评估单元测试
└── public/                # 前端
    ├── index.html         # 大厅 + 游戏页面
    ├── css/style.css      # 深绿牌桌主题
    └── js/
        ├── socket.js      # WebSocket 连接管理
        └── ui.js          # UI 渲染与交互
```

## 技术栈

- **后端**: Node.js + Express + Socket.io
- **前端**: 原生 HTML / CSS / JavaScript
- **通信**: WebSocket（Socket.io 封装）
- **存储**: 内存（无数据库，重启后重置）
- **费用**: 0 元

## 运行测试

```bash
npm test
```

验证牌型评估器（皇家同花顺到高牌、A-2-3-4-5 轮子顺子等边界情况）。
