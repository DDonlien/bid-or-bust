Original prompt: 为我创建这个游戏仓库的基础内容和框架。项目是《Bid or Bust》，一个 TypeScript/JavaScript MVP：竞拍博弈 + 心理策略 + 模拟经营，P2P WebRTC/PeerJS，Host as Server，未来可能迁移到 Godot + 权威服务器。

## Progress

- 2026-04-25: 仓库为空，仅有 `.git`。读取了项目需求和附件对话，确认 MVP 优先验证 5 轮竞价、碎片化信息、动态技能、延迟公开情报、10 件以上集装箱网格物品、PeerJS P2P 壳。
- 2026-04-25: 选择 Vite + TypeScript + vanilla DOM/canvas。核心规则与 UI/PeerJS 分离，方便未来把核心逻辑迁到 Node 权威服务器或 Godot 客户端。
- 2026-04-25: 已创建 README、设计文档、架构文档、路线图、内容指南。
- 2026-04-25: 已实现 core 规则：动态期望池生成、集装箱网格物品、免费查看、随机技能、下一轮公开、5 轮 Raise/Follow/Fold 状态机、自动结算。
- 2026-04-25: 已实现 H5 Demo：canvas 像素网格、热座玩家面板、情报/日志/竞价控件、PeerJS Host/Join 基础壳、`render_game_to_text` 与 `advanceTime`。
- 2026-04-25: 验证完成：`npm run typecheck`、`npm run test`、`npm run build` 均通过；Playwright 客户端截图正常；额外 UI 自动化确认“选物品 -> 查看 -> 技能 -> 开始竞价 -> Raise”无 console error。

## TODO

- 继续扩展角色技能池、经济系统与落后补偿机制。
- 把 P2P 从“框架壳”推进到完整多人体验：座位锁定、快照裁剪、重连、房主迁移或掉线处理。
- 增加图鉴界面，让玩家在竞价时能查看同轮廓候选和价值分布。
- 细化第 5 轮是否保持公开 Raise/Fold，或改成更有高潮感的最终暗标。
- 决定入场费的最终语义：单场门票、每箱桌费，还是两者都有。
