# Bid or Bust

`Bid or Bust` 是一个竞价博弈游戏 MVP。玩家扮演打捞员，在一个“平庸奇幻”的世界里竞拍海上、废墟、旧货渠道流出的集装箱。箱子里大多是普通旧物，偶尔混入不太讲道理的神秘物品。

第一阶段目标不是做完整商业游戏，而是用 TypeScript H5 Demo 验证核心心流：

- 5 轮固定报价。
- 前 4 轮允许 `Follow` 保留竞标权，第 5 轮只剩最终加价或放弃。
- 每位玩家每轮可以免费查看 1 件真实物品，其他玩家不知道你看了什么。
- 角色可以选择“使用技能”，但实际触发哪一个技能由系统随机决定。
- 技能情报只有 1 轮优势，会在下一轮报价公开给所有玩家。
- 每个箱子至少 10 件物品，玩家主要通过网格轮廓、材质暗示和图鉴候选进行估值。
- Demo 联机路线为 PeerJS / WebRTC，房主浏览器作为权威主机。

## 快速开始

```bash
npm install
npm run dev
```

常用脚本：

```bash
npm run test
npm run typecheck
npm run build
```

## 目录

```text
src/core/     纯规则核心：状态机、竞价、生成器、图鉴、技能
src/ui/       H5 Demo 表现层：DOM HUD + Canvas 网格
src/net/      PeerJS Host-as-Server 联机适配层
docs/         设计文档、架构说明、路线图
tests/        核心规则测试
```

## 架构原则

核心规则不能引用 DOM、Canvas 或 PeerJS。现在的 TypeScript 核心将来可以迁到：

- Node.js / Go 权威服务器。
- Godot 客户端的网络协议参考。
- 自动化平衡测试脚本。

H5 Demo 只负责表现、输入和快速验证玩法。
