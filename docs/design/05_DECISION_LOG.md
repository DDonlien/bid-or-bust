# 05. Design Decision Log

> 文档职责：保留关键讨论、设计取舍、被放弃方案和未来可能回收的方向。  
> 这不是规则规格书，而是“为什么当前设计是这样”的记录。

---

## 1. Why Split the Design Docs

早期完整 GDD 很适合作为一次性总结，但不适合长期维护。随着规则、经济、内容、外循环、工程计划不断变化，单一文档会变得难以更新。

当前拆分为：

- Product GDD：项目方向。
- Rule Spec：可实现规则。
- Information and Bidding：核心信息博弈。
- Economy and Meta：资金、场次、仓库和外循环。
- Content Guide：世界观和内容扩展。
- Decision Log：保留取舍。
- MVP Scope：排期和阶段。

这样每个有价值的讨论都有归属，不会在拆分中丢失。

---

## 2. BidKing Learnings

### 2.1 Observed Useful Mechanics

从 BidKing 体验中得到的有效机制：

1. 盲标或半盲标能形成心理战。
2. 直接成交阈值非常有驱动力。
3. 每轮公开报价能加快节奏。
4. 开箱逐件揭示是强情绪反馈。
5. 单箱局节奏很快、刺激强。
6. 玩家大多数时候会关注其他人的报价，并和自己的信息对比。

### 2.2 Observed Problems

BidKing 中暴露的问题：

1. 每轮报价完全公开后，玩家可能搭便车。
2. 如果能随意调低报价，前几轮判断失误没有代价。
3. 数字输入导致计算疲劳。
4. 不限制报价额度或允许负存款，会削弱资金边界。
5. 道具系统存在感低且啰嗦。
6. 自动技能不如主动技能能产生清晰心理信号。

### 2.3 Design Response

《Bid or Bust》当前吸收：

- 直接成交阈值。
- 快节奏单箱拍卖手感。
- 开箱逐件揭示。
- 角色信息技能。

当前不照搬：

- 不公开每个人完整报价。
- 不允许承诺价降低。
- 不允许负债报价。
- 不做独立道具系统。
- 不把一局只固定为 1 个箱子。

---

## 3. Decision: Single-Lot vs Multi-Lot Sessions

### Options

#### A. 一场只拍 1 个集装箱

优点：

- 节奏最快。
- 容易理解。
- 适合 PvP 快局。
- 适合 demo 和直播。

缺点：

- 入场费 / 托管资金意义弱。
- 一个箱子爆了就结束。
- 找回场子空间少。
- 外循环连接较薄。

#### B. 一场拍多个集装箱

优点：

- 入场费更合理。
- 玩家可以前亏后赢。
- 场内资金变化更有戏。
- 更适合藏品、仓库和外循环。

缺点：

- 单场时间更长。
- 滚雪球风险更高。
- 需要场内变现支撑。

### Current Decision

主模式采用多箱场次，MVP 推荐 3 箱。

快速模式可保留 1 箱局。

### Reason

用户明确认为多箱玩法和保证金 / 入场费更搭，而且能提供“损失一个箱子，在其他箱子找回场子”的空间。当前设计把“箱子”定义为一个短促手牌，把“场”定义为多个手牌组成的 session。

---

## 4. Decision: Follow vs Commitment Bid

### Original Direction

早期版本包含：

- 前 4 轮可以 Follow。
- 第 5 轮最终竞争。

### Problem Found

Follow 或可自由调价会带来：

- 玩家可等待别人把局拖到后面。
- 前几轮可以乱报高价但不承担代价。
- 如果之后能降价，前几轮判断失误没有成本。
- 玩家只需要瞄准“不触发直接成交”的价格制造噪音。

### Current Decision

改为承诺价系统：

- 每名玩家有当前承诺价。
- 承诺价只能保持或提高。
- 不能降低。
- Hold 表示维持承诺价。
- Fold 后退出本箱。

### Reason

报价必须代表承诺。诈唬可以存在，但不能免费。

---

## 5. Decision: Fixed Step vs Free Numeric Input

### Free Numeric Input

问题：

- 高级场金额大时，玩家可能 1 元 1 元加价。
- 决策疲劳。
- 玩家过度关注精确数值而非信息判断。
- UI 和节奏难控制。

### Fixed Step

优点：

- 决策清楚。
- 更易平衡。
- 场所等级可以通过 step 体现。
- 玩家只需选择加价强度。

### Current Decision

Raise 使用固定 step，可一次加多个 step。

示例：

```text
+1 step
+2 steps
+3 steps
All-in
```

---

## 6. Decision: Direct Sale Mechanic

### Observed Driver

BidKing 最强驱动力之一是：

- 我要不要直接成交？
- 如果我不出高价，别人会不会直接成交？

### Current Decision

保留并强化直接成交机制。

推荐阈值：

```text
Round 1: 200%
Round 2: 160%
Round 3: 130%
Round 4: 110%
Round 5: highest wins
```

### Reason

直接成交让前 4 轮都有终局压力，避免玩家无成本拖到最后一轮。

---

## 7. Decision: All-in

### Problem

如果 All-in 仍必须满足普通直接成交阈值，则它只有风险，没有足够奖励。

### Current Decision

All-in 后若成为当前最高价，本箱立即成交，无视阈值。

### Reason

All-in 的本质是：

> 我放弃后续资金弹性，换取立刻锁定箱子的能力。

这让 All-in 有明确进攻价值。

---

## 8. Decision: Negative Funds / Credit Bidding

### Option Considered

BidKing 似乎允许报价超过存款，甚至负存款。

### Rejected

不允许负债报价。

### Reason

负债报价会：

- 削弱资金压力。
- 模糊破产边界。
- 引入网游充值式经济感。
- 让玩家可以无脑超额威胁。

当前采用托管资金上限。

---

## 9. Decision: Escrow Funds

### Options

#### A. 报价上限 = 玩家总存款

问题：

- 富者恒富。
- PvP 资金碾压。
- 外循环财富直接破坏局内公平。

#### B. 每场等额托管资金

优点：

- 同桌公平。
- 外循环仍决定能进什么场。
- All-in 边界清楚。
- 更像 table stakes。

### Current Decision

采用验资 + 等额托管资金。

玩家总资产和藏品决定能否入场；入场后所有玩家使用相同初始托管资金。

---

## 10. Decision: In-Session Liquidation

### Original Consideration

场后统一结算可以增加资金规划压力。

### Problem

如果每箱结束都显示箱子价值，那么强行不场内变现会不自然。

同时，如果 All-in 后不变现，玩家可能后续几箱无事可做。

### Current Decision

每箱成交后立刻开箱并场内变现。

### Reason

- 多箱场次更顺。
- All-in 风险有即时反馈。
- 玩家可以找回场子。
- 每箱都有情绪高潮。

---

## 11. Decision: Public Money and Public Lot Value

### Options

#### A. 箱子价值不公开，只显示大致结果；玩家资金也不完全公开

优点：

- 更盲。
- 更心理战。

缺点：

- 玩家需要猜别人还有多少钱。
- 认知负担更高。
- 和公开成交价、场内变现不连贯。

#### B. 箱子价值公开，玩家资金公开

优点：

- 局势清楚。
- 多箱场次更易读。
- 玩家少做记账。
- All-in 和托管资金更直观。

缺点：

- 更透明。
- 少一些高端心理战。

### Current Decision

普通模式采用 B。

公开：

- 玩家资金。
- 成交价。
- 箱子总价值。
- 净收益。

隐藏：

- 内容物明细。
- 赢家判断依据。

资金模糊作为高级场特殊规则保留。

---

## 12. Decision: Reveal Details

### Options

#### A. 所有人看到完整内容物

问题：

- 学习速度太快。
- 后续箱子推理空间下降。
- 赢家私有信息价值下降。

#### B. 只有赢家看到完整内容物，其他人看到总价值

优点：

- 保留结算透明度。
- 保留图鉴推理不确定性。
- 其他玩家知道结果，但不知道原因。

### Current Decision

采用 B。

---

## 13. Decision: Item / Prop System

### Observed Problem

BidKing 的道具系统存在感低，且和技能、公开信息叠加后显得啰嗦。

### Current MVP Decision

MVP 暂不做独立道具。

### Future Direction

如果需要道具，将其与特殊藏品融合：

- 藏品可出售。
- 藏品可保留作为资质。
- 部分藏品可局内消耗。
- 使用等于烧掉资产。

### Reason

这样道具成本自然，并与外循环绑定。

---

## 14. Decision: Private Look

### Question

每轮有公共信息和技能后，是否还需要每人私查 1 件？

### Current Decision

需要保留。

### Reason

- 即使没有技能也有信息博弈。
- 每个玩家形成不同样本偏差。
- 让加价行为更难解读。
- 支撑“他到底看到了什么”的核心心理。

---

## 15. Decision: Total Value Pool

### Original Idea

一场总期望固定，前面箱子低收益则后面高收益概率提升。

### Problem

如果每箱总价值公开，玩家会推算剩余价值池，游戏容易变成算账。

### Current Decision

不做硬总价值守恒。

改为：

- 每个拍卖场显示单箱参考估值范围。
- 箱子从场所价值分布中生成。
- 可以有轻微动态修正，但不对玩家承诺总池。

---

## 16. Decision: Highest Amount Visibility

### Options

#### A. 公开当前最高价金额

优点：

- 简单。
- 易懂。
- 有价格锚点。
- 方便测试。

缺点：

- 锚点较强。

#### B. 只公开最高价区间或模糊等级

优点：

- 更盲。
- 心理战更强。

缺点：

- 新手更难理解。
- 直接成交更难判断。

### Current Decision

MVP 使用 A。

高级场可使用 B。

---

## 17. Decision: Skill Activation

### BidKing Observation

BidKing 技能偏自动，且信息公开方式不完全相同。

### Current Decision

玩家主动选择是否使用技能，但技能具体效果随机。

技能信息下一轮公开。

### Reason

- 主动使用本身是心理信号。
- 随机技能避免固定最优解。
- 下一轮公开形成一轮优势。
- 玩家可能用废信息诈唬。

---

## 18. Current Resolved Design Summary

当前已定：

- 主模式多箱，MVP 推荐 3 箱。
- 每箱最多 5 轮。
- 每箱至少 10 件物品。
- 每轮公共信息。
- 每人每轮私查 1 件。
- 主动随机技能，下一轮公开。
- 承诺价只能升不能降。
- Raise 固定 step。
- Fold 退出当前箱子。
- All-in 最高即成交。
- 非 All-in 使用递减直接成交阈值。
- 等额托管资金。
- 不允许负债。
- 普通模式资金公开。
- 箱子总价值公开。
- 内容物明细仅赢家可见。
- 场内变现。
- 道具 MVP 暂不做。
- 特殊藏品未来可融合道具效果。

---

## 19. Revisit Later

未来可重新讨论：

1. Fold 手续费。
2. 第 1 轮是否允许 All-in。
3. 高级场资金模糊。
4. 只公开最高价区间。
5. 场后统一结算模式。
6. 特殊藏品局内消耗。
7. 商店和典当。
8. 负面 Contraband 惩罚。
9. 单人 AI。
10. 总价值池轻微动态修正。
