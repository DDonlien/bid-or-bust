# 04. Content and World Guide

> 文档职责：约束世界观、物品、藏品、角色、技能和文本风格。  
> 目标是让后续内容扩展时保持一致，而不是变成互不相关的旧货清单或过重神秘学设定。

---

## 1. World Premise

《Bid or Bust》的世界是一个“平庸奇幻”的旧货经济世界。

大多数东西都普通、二手、破旧、可以估价。偶尔出现神秘物，但神秘物也被纳入拍卖、登记、转卖、典当和仓储系统。

核心口味：

> 神秘物不是史诗神器，而是非标资产。  
> 它可能很值钱，也可能只是麻烦；可能能解锁高级拍卖场，也可能带来登记费、保管费或买家扯皮。

---

## 2. Tone

### 2.1 Desired Tone

关键词：

- 日常
- 旧货
- 市侩
- 轻松
- 荒诞
- 拍卖综艺感
- 港口 / 仓库 / 清仓 / 典当
- 神秘物调查很随便
- 神迹也要看成色和买家

### 2.2 Avoid

避免：

- 过重克苏鲁恐怖。
- 纯 SCP 风格严肃收容。
- 史诗魔法装备。
- 过度赛博朋克。
- 黑暗到让玩家感到压抑。
- 纯搞笑无风险。

### 2.3 Example Tone

好的描述：

```text
一台没有接口的异常电池。登记员说它“理论上不该放电”，但它确实把仓库灯泡点亮了三天。
```

```text
旧船钟，铜锈均匀，走时慢十二分钟。某些买家坚持说它慢的是“今天”。
```

不推荐：

```text
远古深渊之神的心脏，凡人凝视即会疯狂。
```

---

## 3. Item Design Goals

物品设计要服务于竞价推理。

每件物品应至少满足一个目的：

1. 提供清晰的价值锚点。
2. 与其他物品共享轮廓，制造不确定性。
3. 作为藏品资质。
4. 作为 Oddity 或 Contraband 风险。
5. 产生开箱情绪。
6. 扩展世界观。

---

## 4. Item Data Fields

建议每件物品包含：

```text
id
name
shortName
flavorText
categoryTags
quality
baseValue
liquidationValue
shapeId
gridSize
candidateGroup
isCredential
isKeepable
isOddity
isContraband
riskTags
sourceTags
```

### 4.1 Required Tags

基础分类：

```text
Household      日用品
Industrial     工业零件
Collectible    收藏品
Oddity         神秘物 / 非标资产
Contraband     未登记 / 违规货物
Credential     准入资质
```

一个物品可拥有多个标签。

示例：

```text
Unregistered Whisper Pearl
Tags: Oddity, Contraband, Credential, Collectible
```

---

## 5. Quality Design

品质用于帮助玩家估值，但不能完全决定价格。

### 5.1 Suggested Quality Names

较中性版本：

```text
Common
Uncommon
Rare
Exceptional
Anomalous
```

更贴合世界观版本：

```text
Scrap
Useful
Curious
Rare
Unregistered
```

### 5.2 Quality Rules

品质应影响候选价值区间，但不应直接等于价值。

例：

- Rare Household 可能不如 Useful Oddity 值钱。
- Large Industrial 可能比 Small Collectible 更高价。
- Contraband 可能高估值但有风险。

---

## 6. Shape and Silhouette Design

### 6.1 Purpose

轮廓是玩家估值前的主要视觉线索。

它回答：

```text
这个东西可能是什么？
```

但不直接回答：

```text
它到底值多少钱？
```

### 6.2 Same Shape, Different Value

同一轮廓应对应多个候选物品。

例：2x2 方形轮廓可能是：

- 旧收音机，低价值 Household。
- 船钟，中价值 Collectible。
- 异常电池，高价值 Oddity。

这样玩家看到轮廓后不会立刻知道答案。

### 6.3 Shape + Quality Split

品质和轮廓要分开显示。

好的信息组合：

- 只知道轮廓，不知道品质。
- 只知道某个未知物品是 Rare，但只显示为 1 格标记。
- 知道分类但不知道真实名称。

这能让信息更有层次。

---

## 7. Item Count Per Container

每箱至少 10 件物品。

原因：

- 5 轮私查不会导致完全明牌。
- 玩家只能局部抽样。
- 样本偏差会导致不同玩家做出不同判断。

建议：

```text
低级场：10-12 件
中级场：12-16 件
高级场：16-20 件
```

---

## 8. Oddity Design

### 8.1 What Is an Oddity

Oddity 是非标准神秘资产。

它可以：

- 很值钱。
- 需要登记。
- 被某些高级拍卖场认可为资质。
- 带有额外风险。
- 有古怪但日常的用途。

### 8.2 Oddity Should Not Be Always Best

Oddity 不应简单等于“最高价值”。

可能情况：

- 价值高但难卖。
- 估值高但有登记风险。
- 可作为准入资质但现金价值一般。
- 看起来神秘但其实只是低级异常垃圾。

### 8.3 Oddity Examples

```text
Sealed Anomaly Battery
Tags: Oddity, Industrial, Credential
Shape: 2x2
Value: High
Flavor: 没有接口，但每隔几小时会让附近的电表倒转一小格。
```

```text
Yesterday Compass
Tags: Oddity, Collectible
Shape: 1x2
Value: Medium-High
Flavor: 总是指向昨天停泊过的地方。对找车没用，对卖故事有用。
```

```text
Unregistered Whisper Pearl
Tags: Oddity, Contraband, Credential
Shape: 1x1
Value: High
Flavor: 靠近耳边时会小声报出一个陌生人的出价。
```

```text
Self-Reporting Radio
Tags: Oddity, Household
Shape: 2x1
Value: Medium
Flavor: 没电也会播报天气，但只播三天前的。
```

---

## 9. Contraband and Risk

Contraband 是未登记、违规或难处理物品。

MVP 中可先只作为标签与估值因素，不做复杂惩罚。

未来可扩展：

- 登记费。
- 没收费。
- 拍卖场禁止携带。
- 高级黑市准入资质。

不要过早加入过多负收益，避免新手体验过于惩罚。

---

## 10. Credential Items

### 10.1 Purpose

Credential 物品用于解锁更高级拍卖场。

它们既是资产，也是身份背书。

### 10.2 Good Credential Requirements

推荐要求类别，而不是唯一物品。

好：

```text
拥有 1 件 Oddity。
拥有 1 件 Rare Collectible。
拥有 2 件 Non-standard Assets。
```

不好：

```text
必须拥有 “Blue Harbor Stamp #17”。
```

除非有商店保底，否则唯一物品会造成 RNG 卡进度。

---

## 11. Item Examples by Category

### 11.1 Household

```text
Old Toaster
Shape: 2x2
Quality: Common
Value: Low
Flavor: 烤面包很慢，烤保险丝很快。
```

```text
Box of Mismatched Cups
Shape: 2x1
Quality: Common
Value: Low
Flavor: 有三只写着不同公司年会。
```

### 11.2 Industrial

```text
Salted Pump Motor
Shape: 3x2
Quality: Useful
Value: Medium
Flavor: 转起来像咳嗽，但买家说还能用。
```

```text
Brass Valve Assembly
Shape: 2x2
Quality: Useful
Value: Medium
Flavor: 黄铜件，沉，容易让新手误判成更贵的东西。
```

### 11.3 Collectible

```text
Retired Auction Gavel
Shape: 1x2
Quality: Rare
Value: Medium-High
Flavor: 柄上刻着三家倒闭拍卖行的名字。
```

```text
First Print Harbor Map
Shape: 2x2
Quality: Rare
Value: High
Flavor: 地图上有两个已经不存在的码头和一个不存在但还在收费的码头。
```

### 11.4 Oddity

见第 8 节。

### 11.5 Contraband

```text
Unlabeled Blue Seal
Shape: 1x1
Quality: Curious
Value: Medium
Flavor: 看起来像证物标签。最好不要问它原来贴在哪里。
```

---

## 12. Character Design

### 12.1 Character Role

角色需要给玩家稳定倾向，而不是只提供随机技能。

每个角色应包含：

- 名称。
- 职业 / 背景。
- 被动倾向。
- 动态技能池。
- 擅长信息类型。

### 12.2 Character Passive

被动能力用于定义稳定打法。

示例：

```text
Old Yard Appraiser
Passive: 你查看 Collectible 时额外知道其最低候选价值。
```

```text
Harbor Salvager
Passive: 你查看 3 格以上大件物品时，有概率额外知道分类。
```

```text
Registry Clerk
Passive: 公共信息首次显示 Oddity 相关信息时，你额外知道其风险标签。
```

MVP 可先实现少量简单被动。

### 12.3 Dynamic Skill Pool

每个角色 4 个动态技能，使用时随机触发。

技能原则：

- 信息型为主。
- 尽量结构化。
- 不直接给推荐出价。
- 下一轮公开。
- 可产生废信息与诈唬空间。

---

## 13. Skill Design Examples

### 13.1 Appraiser

```text
1. 显示随机 2 件物品的品质。
2. 显示当前箱最高价值物品的品质。
3. 显示一个已知轮廓物品的最低候选价值。
4. 显示你的已知保底价值增加了多少。
```

### 13.2 Salvager

```text
1. 显示最大轮廓物品的分类。
2. 显示某个大件物品是否为 Industrial。
3. 显示一个区域内最高品质物品位置。
4. 显示是否存在高密度金属物。
```

### 13.3 Registry Clerk

```text
1. 显示箱中是否存在 Oddity。
2. 显示一个 Oddity 的品质。
3. 显示是否存在 Contraband。
4. 显示一件非标准资产的最低价值。
```

### 13.4 Auction Shark

```text
1. 显示当前最高价是否高于公共保底 2 倍。
2. 显示第二名与最高价是否接近。
3. 显示本轮有多少玩家 Raise。
4. 显示某名玩家是否查看过高品质物品。
```

---

## 14. Writing Style

### 14.1 Item Flavor

物品描述应短、具体、有生活感。

好：

```text
封口处贴着三张不同年份的登记失败标签。
```

不好：

```text
这是一个来自远古时代的神秘强大造物。
```

### 14.2 UI Text

UI 文案要清楚，不要过度文学化。

例如：

```text
Public Floor Value: $18,000
Your Floor Value: $32,000
Highest Bid: $45,000
Gap: Close
```

可以搭配风味，但不要遮挡规则信息。

---

## 15. Content Expansion Rules

新增物品时检查：

1. 是否有明确分类。
2. 是否有价值区间。
3. 是否与某些轮廓共享候选组。
4. 是否过度唯一，导致一看轮廓就知道答案。
5. 是否适合当前场所。
6. 是否有资格 / 外循环意义。
7. 是否风格符合平庸奇幻。

新增技能时检查：

1. 是否结构化。
2. 是否能下一轮公开。
3. 是否不会直接替玩家出价。
4. 是否有废信息可能。
5. 是否能制造心理信号。

新增拍卖场时检查：

1. 是否有清晰 stake。
2. 是否有内容池差异。
3. 是否有准入条件。
4. 是否有风险变化。
5. 是否需要特殊公开规则。

---

## 16. MVP Content Targets

MVP 建议：

- 2 个拍卖场。
- 30-40 个物品。
- 3-4 个角色。
- 每角色 4 个动态技能。
- 3-5 个基础 shape group。
- 每个 shape group 至少 3 个候选物。
- 至少 6 件可保留藏品。
- 至少 3 件 Credential 藏品。
- 少量 Oddity，保持稀有感。

---

## 17. Future Content Directions

- 高级场更多 Oddity。
- Contraband 风险。
- 特殊藏品局内消耗。
- 商店高溢价资质物。
- 典当行。
- 拍卖场主持人风格。
- 角色台词。
- 仓库藏品展示。
- 高级场资金模糊规则。
