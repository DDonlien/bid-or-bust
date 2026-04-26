# 06. MVP Scope and Roadmap

> 文档职责：定义当前 Demo / MVP 应该做什么、不做什么，以及后续阶段如何扩展。  
> 这份文档关注设计范围，不替代工程 `docs/ROADMAP.md`。

---

## 1. MVP Goal

MVP 的目标不是完整商业版，而是验证核心心流：

```text
轮廓推理
→ 信息差
→ 承诺价竞价
→ 直接成交压力
→ All-in 高潮
→ 开箱结算
→ 场内资金变化
→ 藏品保留
```

MVP 成功的标准：玩家愿意因为“刚才那箱如果我多顶一步就赢了”而马上再来一场。

---

## 2. MVP Must-Have Features

### 2.1 Session

- 一场 3 个集装箱。
- 每场有入场费。
- 每场有等额托管资金。
- 玩家资金公开。
- 场次显示单箱参考估值范围。
- 场次显示最低加价单位。

### 2.2 Container

- 每箱至少 10 件物品。
- 每箱最多 5 轮报价。
- 所有玩家看到物品轮廓、位置、尺寸。
- 内容物真实信息隐藏。

### 2.3 Information

- 每轮系统公开 1 条结构化公共信息。
- 每名 active 玩家每轮私查 1 件物品。
- 显示公共已知保底价值。
- 显示玩家自己的已知保底价值。
- 技能信息下一轮公开。

### 2.4 Bidding

- 每名玩家有承诺价。
- 承诺价只能保持或提高。
- Hold / Raise / Fold / All-in。
- Raise 使用固定 step。
- Fold 后退出当前箱子。
- All-in 若成为最高价立刻成交。
- 非 All-in 使用直接成交阈值。
- 第 5 轮最高价自然成交。

### 2.5 Reveal and Settlement

- 成交价公开。
- 箱子鉴定总价值公开。
- 赢家净收益公开。
- 赢家当前托管资金公开。
- 赢家看到完整内容物。
- 其他玩家不看到内容物明细。
- 普通物场内变现。
- 特殊藏品可保留或出售。

### 2.6 Meta

- 仓库显示保留藏品。
- 保留藏品可出售。
- 部分藏品可作为拍卖场准入资质。
- 至少 2 个拍卖场。

### 2.7 Content

- 至少 30 个物品。
- 至少 3 个角色。
- 每个角色 4 个动态技能。
- 至少 3 个可保留资质藏品。
- 至少少量 Oddity。
- 每个 shape group 至少 3 个候选物。

---

## 3. MVP Should-Have Features

这些功能很有价值，但如果时间紧，可以降级或简化：

- 角色被动。
- 开箱逐件动画。
- 更清楚的图鉴候选 UI。
- 简单声音反馈。
- 数字跳动反馈。
- 对局日志。
- Hotseat 测试模式。
- PeerJS Host-as-Server 联机壳。
- 简单重连。

---

## 4. MVP Won't-Have Features

MVP 暂不做：

- 独立道具系统。
- 特殊藏品局内消耗。
- 商店。
- 典当 / 抵押。
- 仓库容量。
- 保管费。
- 复杂 Contraband 惩罚。
- 高级场资金模糊。
- 负债报价。
- 任意数字输入报价。
- 可降价报价。
- 完整 AI 对手。
- 完整反作弊。
- Godot 客户端。
- 权威服务器。
- Steam 集成。

---

## 5. Suggested Implementation Order

### Step 1: Rule Core Update

更新 core 状态机：

- 移除 Follow 作为核心动作。
- 加入承诺价。
- 加入 Hold / Raise / Fold / All-in。
- 承诺价只升不降。
- 加入直接成交阈值。
- 加入 All-in 最高即成交。
- 加入场内变现。

### Step 2: Economy Model

实现：

- Venue 参数。
- Entry fee。
- Escrow funds。
- Public money。
- Lot value range。
- Bid step。

### Step 3: Information Model

实现：

- Public intel。
- Private look。
- Delayed skill intel。
- Public known floor。
- Player known floor。

### Step 4: Settlement

实现：

- Winner-only item reveal。
- Public total value reveal。
- Liquidation。
- Keep / Sell special items。
- Warehouse update。

### Step 5: Content Expansion

扩充：

- 30-40 个物品。
- 3-4 个角色。
- 12-16 个技能。
- 2 个拍卖场。
- 3-5 个 shape group。

### Step 6: UX Pass

改进：

- 报价按钮。
- 直接成交状态提示。
- All-in 警告。
- 开箱节奏。
- 保底价值展示。
- 玩家资金面板。

### Step 7: Multiplayer Shell

PeerJS / WebRTC：

- Host owns full state。
- Clients submit commands。
- Host validates and broadcasts snapshots。
- Demo 阶段信任房主。

---

## 6. Core Tests Needed

### Bidding Tests

- Raise increases by step。
- Raise cannot exceed escrow。
- Commitment bid cannot decrease。
- Fold exits current lot。
- Folded player cannot act again in same lot。
- Hold preserves commitment bid。
- All-in sets bid to escrow funds。
- All-in highest immediately sells。
- All-in not highest does not sell。

### Direct Sale Tests

- Round 1 threshold 200%。
- Round 2 threshold 160%。
- Round 3 threshold 130%。
- Round 4 threshold 110%。
- Round 5 highest wins。
- Single active player wins。
- Tie Break triggers on equal highest bid。

### Information Tests

- Private look only visible to viewer。
- Public intel visible to all。
- Skill result private on current round。
- Skill result public next round。
- Public floor value updates。
- Player known floor differs by private intel。

### Economy Tests

- Entry fee deducted。
- Escrow initialized equally。
- Winner pays final price。
- Liquidated value added to winner escrow。
- Kept item does not convert to escrow cash。
- Public total value visible to all。
- Item details visible only to winner。

### Content Tests

- Each lot has at least 10 items。
- Shape candidates exist。
- Credential items unlock venue requirements。

---

## 7. Playtest Questions

MVP playtest should answer：

1. 玩家是否理解承诺价只能升不能降？
2. 玩家是否理解 All-in 最高即成交？
3. 直接成交是否让前几轮更紧张？
4. 玩家是否会因为别人使用技能而改变报价？
5. 私查 1 件是否足够制造信息差？
6. 公共信息是否太强或太弱？
7. 已知保底价值是否有帮助？
8. 公开最高价是否让游戏太可算？
9. 资金公开是否降低了不必要负担？
10. 每场 3 箱是否节奏合适？
11. 场内变现是否让输家还有参与感？
12. All-in 是否过强？
13. 玩家是否愿意保留藏品而不是全部卖掉？
14. 玩家是否能感受到与 BidKing 的差异？

---

## 8. Metrics to Track

如果后续做日志，可记录：

### Per Lot

- 成交轮次。
- 是否直接成交。
- 是否 All-in 成交。
- 成交价 / 总价值。
- 净收益。
- 每轮最高价。
- 每轮 active 玩家数。
- Fold 轮次。
- 技能使用次数。
- 公共保底与最终价值差距。

### Per Player

- 平均利润。
- All-in 次数。
- All-in 成功率。
- 私查价值偏差。
- 技能使用率。
- Fold 率。
- 保留藏品次数。

### Per Session

- 总时长。
- 赢家资金曲线。
- 最大资金差距。
- 是否出现坐牢玩家。
- 是否滚雪球明显。

---

## 9. Balance Red Flags

需要警惕：

1. 大多数箱子都第 5 轮成交：直接成交压力不足。
2. 大多数箱子第 1 轮 All-in：All-in 过强或 UI 误导。
3. 玩家很少使用技能：技能不够强或代价过高。
4. 玩家总是使用技能后 Fold：技能结果太随机或废信息太多。
5. 最高价公开导致玩家只跟锚点：物品推理不足。
6. 场内变现导致领先者不可追：滚雪球过强。
7. 玩家不保留藏品：外循环诱因不足。
8. 玩家只保留藏品不卖：现金压力不足。
9. 私查后估值过准：物品太少或信息太强。
10. 玩家抱怨要算太多：UI 辅助不足。

---

## 10. Phase Plan

### Phase 0: Rule Rewrite Prototype

目标：本地热座跑通新规则。

范围：

- 承诺价。
- Fixed-step Raise。
- All-in。
- 直接成交。
- 场内变现。
- 公开资金。

### Phase 1: Playable Core Demo

目标：2-4 人热座可玩。

范围：

- 3 箱场次。
- 公共信息。
- 私查。
- 技能下一轮公开。
- 基础开箱。
- 仓库保留藏品。

### Phase 2: Itch Multiplayer Demo

目标：PeerJS Host-as-Server 联机验证。

范围：

- 房间创建 / 加入。
- Host 权威状态。
- Client command。
- 简单断线处理。
- 可信朋友局，不承诺反作弊。

### Phase 3: Retention Test

目标：验证玩家是否愿意反复玩。

范围：

- 更多物品。
- 更多角色。
- 更多拍卖场。
- 统计日志。
- 平衡 All-in、直接成交、滚雪球。

### Phase 4: Commercial Track

目标：准备 Steam 版本。

范围：

- Godot 客户端。
- Node.js / Go 权威服务器。
- 私有情报裁剪。
- 正式房间 / 匹配 / 断线重连。
- Steam 集成。

---

## 11. Issue Breakdown Suggestions

可拆 GitHub issues：

### Core

- Replace Follow with Hold / Raise / Fold / All-in。
- Add commitment bid model。
- Add direct sale threshold table。
- Add all-in immediate sale rule。
- Add fixed-step raise validation。
- Add in-session liquidation。

### Economy

- Add venue config。
- Add entry fee and escrow funds。
- Add public money model。
- Add lot reference value range。
- Add warehouse kept items。

### Information

- Add public intel generator。
- Add private look state。
- Add delayed skill reveal。
- Add known floor value calculation。

### UI

- Replace numeric bid input with step buttons。
- Add highest bid display。
- Add gap description display。
- Add direct sale warning。
- Add all-in confirmation。
- Add post-lot public result screen。
- Add winner-only reveal screen。

### Content

- Add item tags and quality。
- Add shape candidate groups。
- Add credential items。
- Add second venue。
- Add initial characters and skill pools。

---

## 12. Current MVP Definition of Done

MVP 可认为完成，当：

1. 4 名玩家热座可以完整玩一场 3 箱拍卖。
2. 每箱至少 10 件物品。
3. 每轮能公开信息、私查、可选技能、报价。
4. 直接成交和 All-in 均可触发。
5. 成交后能开箱、公开总价值、结算资金。
6. 赢家能看到内容物，其他人看不到明细。
7. 特殊藏品能保留进仓库。
8. 场结束能显示总收益和保留藏品。
9. 至少有 2 个拍卖场和基础准入条件。
10. 至少完成一轮真实多人 playtest，并记录问题。
