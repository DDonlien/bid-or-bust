# 03. Economy, Meta, and Session Design

> 文档职责：定义拍卖场经济、场次结构、场内资金、场内变现、仓库和藏品资质外循环。  
> 具体拍卖规则见 `01_MVP_RULE_SPEC.md`。

---

## 1. Economy Design Goals

经济系统需要同时服务三个目标：

1. **局内公平**：坐到同一场的玩家不应因为总资产不同而直接碾压他人。
2. **局内压力**：报价、All-in、直接成交必须受到资金上限约束。
3. **局外成长**：玩家长期仍然需要赚钱、保留藏品、解锁高级场。

因此当前设计采用：

```text
外循环总资产决定你能进什么场。
同一场内，玩家使用等额托管资金竞争。
```

---

## 2. Auction Venue / 拍卖场

每个拍卖场是一类 stake 与内容池。

### 2.1 Venue Parameters

拍卖场参数：

```text
venueId
name
entryFee
escrowFunds
lotCount
lotValueRange
bidStep
qualificationRequirements
riskLevel
itemPoolTags
oddityRate
contrabandRate
```

### 2.2 Public Economic Anchors

玩家入场前需要看到：

- 入场费。
- 托管资金。
- 单箱参考估值范围。
- 箱子数量。
- 最低加价单位。
- 准入要求。

这些信息是玩家判断风险的坐标系。

示例：

```text
Estate Backroom
Entry Fee: $4,000
Escrow Funds: $50,000
Lots: 3
Reference Value Per Lot: $25,000 - $70,000
Bid Step: $2,500
Requirement: 1 Collectible credential
```

---

## 3. Entry Fee

### 3.1 Definition

入场费是进入场次时支付的固定成本，不退。

它不是保证金。

### 3.2 Why Not Call It Deposit

如果叫保证金，玩家会自然认为应该退还。

当前机制是不退，因此更适合叫：

- 入场费
- 席位费
- 报名费
- 场地费

### 3.3 Purpose

入场费用于：

- 给玩家进入高级场的成本压力。
- 防止玩家无成本刷场。
- 让玩家必须在一场中赚回固定成本。

---

## 4. Escrow Funds / 托管资金

### 4.1 Definition

托管资金是玩家进入场次后用于报价的局内资金。

同一场次中，所有玩家初始托管资金相同。

### 4.2 Why Equal Escrow

不采用“报价上限 = 玩家总存款”的原因：

- 富者恒富。
- PvP 中资金碾压过强。
- 信息博弈被总资产差距覆盖。
- 新玩家难以和老玩家同桌。

采用等额托管资金的原因：

- 坐到同一桌后局内公平。
- 外循环仍决定你能进哪张桌。
- All-in 边界清楚。
- 更接近 table stakes。

### 4.3 No Negative Funds

不允许负存款或信用报价。

原因：

- 负债报价会削弱资金压力。
- 容易引入网游充值式经济。
- 破产边界模糊。
- 玩家可以无脑超额威胁。

### 4.4 All-in

All-in = 使用全部当前托管资金作为承诺价。

它不是借钱，也不是透支。

---

## 5. Public Money Model

### 5.1 Current Default

普通模式采用资金公开。

公开：

- 每名玩家当前托管资金。
- 每个箱子成交价。
- 每个箱子鉴定总价值。
- 赢家净收益。
- 赢家结算后托管资金。

### 5.2 Why Public

资金公开的好处：

- 玩家知道别人还有多少弹药。
- 多箱局势清楚。
- All-in 更容易理解。
- 公开成交价和箱子总价值后，资金本来也可推算。
- 降低认知负担。

### 5.3 What Remains Private

即使公开资金，仍然隐藏：

- 赢家内容物明细。
- 赢家私查了什么。
- 赢家技能看到了什么。
- 赢家为什么敢买。

这样保留关键的信息差。

### 5.4 Advanced Variant: Blind Ledger

资金模糊可作为高级场规则，而非默认规则。

高级场可隐藏：

- 精确资金。
- 精确箱子总价值。
- 只显示“大赚 / 小赚 / 小亏 / 爆亏”。

这适合高端玩家和特殊场，不适合 MVP 默认模式。

---

## 6. Lot Value Range

### 6.1 Reference Range

每个拍卖场公开单箱参考估值范围。

示例：

```text
Reference Value Per Lot: $80,000 - $140,000
```

### 6.2 Purpose

参考估值范围用于：

- 帮玩家锚定 stake。
- 让玩家判断入场费是否合理。
- 让玩家判断托管资金是否足够。
- 让玩家判断当前最高价是否离谱。
- 让 All-in 风险更可理解。

### 6.3 Not a Fixed Total Pool

当前不采用“整场总价值固定”的设计。

原因：

- 每箱价值公开后，玩家可推算剩余价值。
- 游戏会变成算账，而不是信息博弈。
- 容易让后续箱子被数学确定性支配。

改为：

> 每个拍卖场有价值分布和参考范围，但不承诺总价值守恒。

---

## 7. Multi-Lot Session

### 7.1 Current Recommendation

普通主模式：

```text
1 session = 3 lots
1 lot = up to 5 bidding rounds
```

### 7.2 Why Multi-Lot

多箱场次的优点：

- 入场费更有意义。
- 玩家一个箱子亏了还有找回场子机会。
- All-in 后如果成功赚钱，可以继续参与。
- 资金变化形成连续局势。
- 外循环更顺。

### 7.3 Why Not Too Many Lots

箱子太多会导致：

- 单场时间过长。
- 早期领先者滚雪球。
- 落后玩家坐牢。
- 每箱情绪峰值被稀释。

MVP 采用 3 箱较合适。

### 7.4 Single-Lot Mode

单箱模式仍有价值。

适合：

- 快速 PvP。
- Itch Demo 快速体验。
- 教学。
- 直播短局。

但主模式更推荐多箱。

---

## 8. In-Session Liquidation

### 8.1 Rule

每个箱子成交后立即开箱并场内变现。

赢家托管资金更新：

```text
winnerEscrow = winnerEscrow - finalPrice + liquidatedValue
```

如果保留特殊藏品，该藏品价值不转化为 `liquidatedValue`。

### 8.2 Why In-Session Liquidation

场内变现的好处：

- 让多箱场次可持续。
- 让 All-in 不是“赌完休息”。
- 每箱有即时情绪反馈。
- 公开箱子价值后，直接变现更自然。
- 玩家能在后续箱子找回场子。

### 8.3 Tradeoff

缺点：

- 领先玩家可能更快滚雪球。
- 资金规划压力弱于场后统一结算。
- 需要注意多箱平衡。

当前取舍：场内变现优先，因为节奏与体验更好。

---

## 9. Reveal and Value Visibility

### 9.1 Public Result

成交后所有人看到：

- 赢家。
- 成交价。
- 鉴定总价值。
- 净收益。
- 赢家当前托管资金。

### 9.2 Winner-Only Details

只有赢家看到：

- 每件物品名称。
- 每件物品品质。
- 每件物品分类。
- 每件物品价值。
- 哪些物品可保留。

### 9.3 Why This Split

公开总价值：

- 让场内资金变化清楚。
- 制造桌面情绪。
- 减少玩家额外记账。

隐藏内容物：

- 保留图鉴推理空间。
- 降低其他玩家背板速度。
- 保留赢家判断依据的神秘性。

别人知道你赚了，但不知道你为什么敢买。

---

## 10. Warehouse / 仓库

### 10.1 Purpose

仓库承载外循环。

玩家在仓库中：

- 查看保留藏品。
- 出售藏品。
- 查看拍卖场准入条件。
- 管理准入资质。
- 未来可典当、抵押、消耗特殊藏品。

### 10.2 MVP Warehouse

MVP 仓库只需支持：

- 显示现金。
- 显示保留藏品。
- 出售藏品。
- 标记藏品标签。
- 判断高级场解锁。

不需要：

- 装修。
- 仓库容量。
- 复杂库存管理。
- 保管费。
- 典当系统。

### 10.3 No Backpack Management

当前不做背包管理。

原因：

- 网格系统用于竞价前推理，不用于结算后塞背包。
- 背包管理会把核心心流从拍卖拉走。
- Demo 阶段应保持简洁。

---

## 11. Credential Collectibles

### 11.1 Concept

某些藏品不仅有价值，也是进入高级拍卖场的资质证明。

设定逻辑：

> 高级拍卖场不只看你有没有钱，还要看你是不是懂货的人。你需要带着特定藏品、登记记录或行业背书，证明你有资格参加。

### 11.2 Why This Matters

它让玩家在结算时做选择：

```text
卖掉换现金
vs
保留作为高级场门票
```

这比单纯攒钱解锁更有趣。

### 11.3 Requirement Types

可用准入条件：

- 拥有 1 件 Collectible。
- 拥有 1 件 Oddity。
- 拥有某个来源标签的藏品。
- 拥有总价值超过某个门槛的认证藏品。
- 拥有任意 2 件非标准资产。

### 11.4 Avoid Unique Hard Locks

不建议高级场要求唯一指定物品。

原因：

- RNG 卡进度。
- 玩家挫败。
- 商店会被迫做保底。

更好：要求类别或组合。

---

## 12. Shop and Pawning

### 12.1 Shop Role

商店应是补齐资质的昂贵保底，不应比拍卖更优。

可能形式：

- 高溢价固定商店。
- 随机旧货商人。
- 典当行。
- 回购系统。

### 12.2 MVP Decision

MVP 暂不做商店。

理由：

- 核心拍卖尚未完全验证。
- 商店会引入额外平衡负担。
- 先验证藏品保留是否有吸引力。

---

## 13. Special Collectibles as Items

### 13.1 Future Direction

独立道具系统暂不做。未来如果需要道具，应与特殊藏品融合。

规则思路：

```text
特殊藏品可在局内消耗，产生一次性效果。
使用等于烧掉资产。
```

### 13.2 Why Better Than Generic Items

优点：

- 成本自然：道具有出售价值。
- 与外循环绑定。
- 不增加独立消耗品层级。
- 玩家会在“卖 / 留 / 用”之间做选择。

### 13.3 Examples

```text
会漏墨的估价单
价值：$1,200
局内消耗：额外揭示 2 件随机物品品质
```

```text
旧拍卖槌
价值：$800
局内消耗：本轮额外显示第二名与最高价是否接近
```

```text
盐渍登记牌
价值：$1,500
局内消耗：确认箱中是否存在 Oddity
```

MVP 不实现，只保留设计方向。

---

## 14. Venue Progression Examples

### 14.1 Rusty Harbor Clearance

```text
Entry Fee: $1,000
Escrow: $20,000
Lot Range: $8,000 - $18,000
Bid Step: $500
Lots: 3
Requirement: None
Main Tags: Household, Industrial, Low Collectible
Oddity Rate: Very Low
```

### 14.2 Estate Backroom

```text
Entry Fee: $4,000
Escrow: $50,000
Lot Range: $25,000 - $70,000
Bid Step: $2,500
Lots: 3
Requirement: 1 Collectible credential
Main Tags: Collectible, Household, Antique
Oddity Rate: Low
```

### 14.3 Municipal Oddities Overflow

```text
Entry Fee: $10,000
Escrow: $100,000
Lot Range: $60,000 - $160,000
Bid Step: $5,000
Lots: 3
Requirement: 1 Oddity or 2 Non-standard Assets
Main Tags: Oddity, Industrial, Contraband Risk
Oddity Rate: Medium
```

### 14.4 Private Salvage Board

```text
Entry Fee: $30,000
Escrow: $300,000
Lot Range: $200,000 - $600,000
Bid Step: $20,000
Lots: 3
Requirement: High-value Collectible + Oddity credential
Main Tags: High Collectible, Oddity, Contraband
Oddity Rate: High
```

---

## 15. Economy Risks

### 15.1 Snowballing

风险：早期大赚玩家获得更多场内资金，后续可压制对手。

当前缓解：

- 同场初始托管资金等额。
- 场次箱数控制在 3。
- 高级场后续可增加风险规则。

未来可加：

- 领先者压力事件。
- 高额资金税。
- 高风险高回报箱子。
- 落后玩家信息补偿。

### 15.2 Too Much Accounting

风险：玩家需要算太多钱。

当前缓解：

- 资金公开。
- 箱子价值公开。
- 自动计算净收益。
- 显示已知保底价值。
- 报价用固定 step。

### 15.3 Credential Bottleneck

风险：玩家迟迟拿不到准入藏品。

当前缓解：

- 准入用类别，而非唯一物品。
- 后续可加入高溢价商店。
- 允许多个低级藏品组合解锁。

---

## 16. MVP Economy Summary

MVP 经济规则：

```text
玩家选择拍卖场。
满足验资和藏品条件后，支付不退入场费。
系统划转固定托管资金。
所有玩家同场初始托管资金相同，且公开。
一场包含 3 个箱子。
每箱成交后立刻开箱并场内变现。
箱子总价值、成交价、净收益公开。
赢家内容物明细私有。
普通物自动变现。
特殊藏品可保留，保留则不转化为场内资金。
场结束后，剩余托管资金和保留藏品回到仓库。
```

---

## 17. Open Questions

1. 保留藏品是否应影响本场资金，还是只影响场后仓库？当前建议影响本场资金：保留则不变现。
2. 是否需要给保留藏品设置数量上限？MVP 不需要。
3. 入场费是否计入最终胜负？建议计入总收益，但不影响场内托管资金。
4. 是否需要验资要求高于托管资金？建议需要，防止玩家所有钱都被锁进一场。
5. 高级场是否启用资金模糊？作为未来特殊规则。
6. 商店何时加入？核心拍卖验证后。
