# 01. MVP Rule Specification

> 文档职责：定义当前 MVP 的可实现规则。  
> 本文应作为 core 状态机、UI 流程、网络命令和测试用例的主要依据。

---

## 1. Definitions

### 1.1 Auction Session / 场次

一场拍卖由多个集装箱组成。MVP 推荐一场 3 个集装箱。

场次有以下参数：

- `entryFee`：入场费，不退。
- `escrowFunds`：托管资金，所有玩家等额带入。
- `lotCount`：本场箱子数量。
- `lotValueRange`：单箱参考估值范围。
- `bidStep`：最低加价单位。
- `qualificationRequirements`：准入要求。

### 1.2 Lot / Container / 集装箱

每个集装箱是一个独立拍卖对象。

特点：

- 包含至少 10 件物品。
- 所有玩家看到物品轮廓、网格位置、尺寸。
- 真实名称、品质、价值、分类默认隐藏。
- 每个箱子最多 5 轮报价。

### 1.3 Bidding Round / 报价轮

每个箱子最多 5 轮。

每轮包含：

1. 公共信息公开。
2. 私人查看。
3. 可选主动技能。
4. 报价行动。
5. 轮末公开。
6. 成交判定。

### 1.4 Commitment Bid / 承诺价

每名玩家对当前箱子拥有一个承诺价。

规则：

- 承诺价代表该玩家当前愿意为箱子支付的最高价格。
- 承诺价只能保持或提高。
- 承诺价不能降低。
- 成交时，最高承诺价者支付自己的承诺价。

### 1.5 Escrow Funds / 托管资金

玩家在当前场次中可用于报价的资金。

规则：

- 所有玩家进入同一场时初始托管资金相同。
- 报价不能超过当前托管资金。
- 不允许负债报价。
- 箱子结算后，赢家托管资金更新。

---

## 2. Session Setup

### 2.1 Entering a Session

玩家进入拍卖场时：

1. 检查是否满足验资要求。
2. 检查是否满足藏品准入要求。
3. 支付入场费。
4. 从玩家总资产划转固定托管资金。
5. 进入场次。

### 2.2 Public Session Parameters

进入场次前应公开：

- 入场费。
- 托管资金。
- 单箱参考估值范围。
- 箱子数量。
- 最低加价单位。
- 场次风险等级。
- 主要准入要求。

示例：

```text
Oddity Overflow
Entry Fee: $10,000
Escrow Funds: $100,000
Lots: 3
Reference Value Per Lot: $60,000 - $160,000
Bid Step: $5,000
Qualification: 1 Oddity credential item
```

---

## 3. Lot Setup

每个箱子开始时：

1. 生成物品列表。
2. 布局到网格。
3. 向所有玩家公开轮廓、位置、尺寸和基础箱子信息。
4. 初始化每名玩家对该箱子的状态。

玩家箱子状态：

```text
active: true
folded: false
commitmentBid: 0
lookUsedThisRound: false
skillUsedThisRound: false
privateIntel: []
```

箱子状态：

```text
round: 1
maxRounds: 5
publicIntel: []
delayedIntel: []
highestBid: 0
secondBid: 0
sold: false
winner: null
```

---

## 4. Round Flow

每轮按以下顺序执行。

### 4.1 Publish Round Public Intel

系统公开一条结构化公共信息。

示例：

- 随机 2 件物品的品质。
- 最大物品的分类。
- 箱中是否存在 Oddity。
- 一个未知物品的最低可能价值。

该信息加入 `publicIntel`。

### 4.2 Reveal Due Delayed Intel

上一轮由技能产生、到期应公开的信息加入 `publicIntel`。

推荐时机：下一轮开始时公开。

### 4.3 Private Look

每名仍在局内的玩家可以查看 1 件物品。

MVP 版本中，查看直接给该玩家：

- 真实名称。
- 品质。
- 分类。
- 价值。
- 是否可保留。

该信息只加入玩家的 `privateIntel`。

### 4.4 Optional Skill Use

每名仍在局内的玩家可选择是否使用主动技能。

规则：

- 玩家只能选择“使用技能”，不能选择具体技能。
- 系统从该角色技能池随机触发一个技能。
- 技能结果立即只给该玩家。
- 技能信息加入 `delayedIntel`，下一轮公开。

若本轮直接成交，未公开技能信息通常不再影响该箱子；可在开箱日志中作为回放信息显示，但非必需。

### 4.5 Bidding Action

每名仍在局内的玩家选择一个行动：

- `Hold`
- `Raise(nSteps)`
- `Fold`
- `AllIn`

行动可同时提交，也可按座次提交。MVP 可优先做同时提交，简化等待体验。

---

## 5. Bidding Actions

### 5.1 Hold

保持当前承诺价。

合法条件：

- 玩家仍在局内。
- 玩家未 Fold。

效果：

```text
commitmentBid unchanged
```

### 5.2 Raise

按固定 step 提高承诺价。

输入：

```text
nSteps: integer >= 1
```

计算：

```text
newBid = currentCommitmentBid + nSteps * bidStep
```

合法条件：

- 玩家仍在局内。
- `newBid <= player.escrowFunds`。
- 玩家未 Fold。

效果：

```text
commitmentBid = newBid
```

### 5.3 Fold

退出当前箱子。

合法条件：

- 玩家仍在局内。

效果：

```text
active = false
folded = true
```

Fold 后：

- 本箱后续轮次不能重新加入。
- 不支付承诺价。
- 不退入场费。
- 不额外扣款，除非未来加入 Fold 手续费。

### 5.4 All-in

将全部当前托管资金作为承诺价。

合法条件：

- 玩家仍在局内。
- 玩家未 Fold。
- `escrowFunds > currentCommitmentBid`。

效果：

```text
commitmentBid = escrowFunds
allIn = true
```

成交判定：

- 若 All-in 后该玩家是当前最高承诺价，本箱立刻成交。
- All-in 成交无视直接成交阈值。
- 若 All-in 未成为最高承诺价，则不成交，只是该玩家承诺价变为全部托管资金。

---

## 6. End of Round Reveal

每轮报价阶段结束后公开：

- 当前最高承诺价金额。
- 第一名与第二名的差距描述。
- 是否接近直接成交。
- 是否有人 Fold。
- 是否有人 All-in。
- 到期技能信息。

不公开：

- 当前最高价是谁。
- 每个玩家的具体承诺价。
- 完整排名。
- 私人查看内容。

注意：箱子最终成交后会公开赢家、成交价、总价值、净收益和赢家资金。

---

## 7. Direct Sale Rules

### 7.1 Non-All-in Direct Sale

第 1～4 轮结束时，如果最高承诺价达到第二名承诺价的一定比例，则直接成交。

推荐阈值：

```text
Round 1: highest >= second * 2.00
Round 2: highest >= second * 1.60
Round 3: highest >= second * 1.30
Round 4: highest >= second * 1.10
Round 5: highest wins naturally
```

如果只有一名玩家仍 active，则该玩家以当前承诺价成交。

### 7.2 All-in Direct Sale

若任意玩家 All-in 后成为当前最高承诺价，则本箱立即成交，无视当前轮次阈值。

设计解释：

All-in 是玩家用全部场内资金换取立即锁定箱子的能力。如果 All-in 仍需满足普通阈值，则风险大于奖励，不值得使用。

### 7.3 Round 5 Natural Sale

第 5 轮结束后，最高承诺价者成交。

若最高价平价，进入 Tie Break。

---

## 8. Tie Break

MVP 推荐：

1. 只有最高价平价玩家进入加轮。
2. 加轮中玩家只能 `Raise` 或 `Fold`。
3. 如果有人 Raise 且成为唯一最高价，该玩家成交。
4. 如果所有人都无法 Raise 或继续平价，可随机决定或按座位顺序决定。

更优但更复杂的未来版本：

- 平价玩家进入一次密封最终报价。
- 平价玩家按剩余托管资金高者胜。
- 平价玩家共同触发二次拍卖事件。

MVP 暂不追求复杂 Tie Break。

---

## 9. Settlement

### 9.1 Winner Payment

成交后：

```text
winner.escrowFunds -= finalPrice
```

### 9.2 Reveal and Appraisal

系统揭示箱子真实内容。

赢家看到完整明细：

- 名称。
- 品质。
- 分类。
- 单件价值。
- 是否可保留。
- 是否为准入藏品。

所有玩家看到：

- 成交价。
- 鉴定总价值。
- 赢家净收益。
- 赢家结算后托管资金。

### 9.3 In-Session Liquidation

普通物自动变现。

特殊藏品可由赢家选择：

- 出售：加入场内资金。
- 保留：进入仓库或待处理区，不加入场内资金。

结算公式：

```text
liquidatedValue = totalValue - keptItemValue
winner.escrowFunds = winner.escrowFunds + liquidatedValue
profit = liquidatedValue + keptItemValue - finalPrice
cashProfit = liquidatedValue - finalPrice
```

UI 应区分：

- 总资产收益。
- 场内现金变化。

MVP 可简化为：

```text
若保留藏品，则该物品价值不转化为场内资金。
普通物全部转化为场内资金。
```

---

## 10. End of Session

场次结束后展示：

- 初始托管资金。
- 结束托管资金。
- 入场费。
- 每箱成交价。
- 每箱总价值。
- 每箱净收益。
- 总收益。
- 保留藏品。
- 解锁进度。

场次结束后：

```text
totalPlayerCash += remainingEscrowFunds
keptItems move to warehouse
```

如果为了简化 MVP，可将场内资金直接回到玩家总资产。

---

## 11. Public / Private Information Matrix

| 信息 | 赢家 | 其他玩家 | 备注 |
| --- | --- | --- | --- |
| 场次参数 | 可见 | 可见 | 入场前公开 |
| 当前托管资金 | 可见 | 可见 | 普通模式公开 |
| 轮廓布局 | 可见 | 可见 | 所有人相同 |
| 公共信息 | 可见 | 可见 | 每轮更新 |
| 私人查看 | 可见 | 不可见 | 只给查看者 |
| 技能即时结果 | 可见 | 不可见 | 下一轮公开 |
| 到期技能信息 | 可见 | 可见 | 下一轮公开 |
| 当前最高价 | 可见 | 可见 | 金额公开 |
| 最高价玩家身份 | 不公开 | 不公开 | 成交前隐藏 |
| 每人具体承诺价 | 自己可见 | 不可见 | 成交前不公开 |
| 成交价 | 可见 | 可见 | 成交后公开 |
| 赢家身份 | 可见 | 可见 | 成交后公开 |
| 箱子总价值 | 可见 | 可见 | 成交后公开 |
| 内容物明细 | 可见 | 不可见 | 赢家完整看 |
| 净收益 | 可见 | 可见 | 成交后公开 |

---

## 12. MVP Test Cases

核心测试应覆盖：

1. 承诺价不能降低。
2. Raise 不能超过托管资金。
3. Fold 后不能重新加入本箱。
4. All-in 若成为最高价立即成交。
5. All-in 若未成为最高价不成交。
6. 第 1～4 轮直接成交阈值正确。
7. 第 5 轮最高价自然成交。
8. 平价进入 Tie Break。
9. 私人查看只进入玩家私有情报。
10. 技能信息下一轮公开。
11. 成交后赢家扣除成交价。
12. 成交后场内变现增加赢家资金。
13. 特殊藏品保留时不转化为场内资金。
14. 其他玩家看不到内容物明细。
15. 每箱至少 10 件物品。

---

## 13. Explicit Non-MVP Rules

以下规则当前不进入 MVP：

- 任意数字输入报价。
- 负债报价。
- 可降价报价。
- 独立道具系统。
- 资金模糊普通模式。
- 场后统一变现。
- 复杂保管费。
- 藏品局内消耗效果。
- 复杂 AI。
- 完整反作弊私有快照裁剪。

这些可以作为未来高级模式或商业版扩展。
