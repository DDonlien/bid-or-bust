# Architecture

## 目标

第一阶段用 TypeScript H5 快速验证玩法；如果 Demo 受欢迎，再迁移到 Godot 客户端和 Node.js/Go 权威服务器。

因此当前仓库按三层拆分：

```text
core rules   -> serializable state, pure functions, deterministic tests
web demo     -> DOM + canvas rendering, hotseat controls
p2p adapter  -> PeerJS/WebRTC room shell, host owns state
```

## 纯规则核心

`src/core` 只维护游戏事实：

- 玩家资金、角色、已看情报。
- 集装箱物品、网格位置、真实价值。
- 5 轮报价状态机。
- `Raise`、`Follow`、`Fold` 合法性。
- 技能随机触发和延迟公开。
- 动态期望池生成。

这层不应该导入：

- DOM
- Canvas
- CSS
- PeerJS
- Vite-only API

## Demo 表现层

`src/ui` 负责：

- 绘制集装箱网格和像素轮廓。
- 根据当前视角玩家显示私有情报。
- 显示公开情报、报价日志、玩家资金。
- 把按钮和输入转换为 core action。
- 暴露 `window.render_game_to_text()` 和 `window.advanceTime(ms)`，方便浏览器自动化测试。

## P2P 模型

MVP 使用 PeerJS：

- Host 创建 PeerJS 房间并持有完整 `GameState`。
- Client 只发送命令：查看、使用技能、报价动作。
- Host 校验命令、推进状态机、广播快照。
- Demo 阶段默认“相信房主”，不承诺反作弊。

这能验证多人心流，但不是商业版本的安全架构。

## 未来权威服务器迁移

商业版本建议：

- Godot 负责 UI、动画、Steam 集成。
- Node.js/Go 权威服务器复用或移植当前 core 规则。
- 服务器按玩家定向下发私有情报。
- 客户端永远拿不到未公开的真实物品列表。

## 状态同步原则

网络消息分两类：

- `ClientCommand`: 玩家意图，例如 `look`、`useSkill`、`bid`。
- `ServerSnapshot`: Host/Server 下发的已校验状态。

后续如果做强反作弊，公开快照需要裁剪掉其他玩家不可见的私有情报。当前 P2P Demo 为开发便利保留完整快照。
