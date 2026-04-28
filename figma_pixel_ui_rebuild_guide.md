# Figma 像素风 UI 拆层重建指南（适配 Bid-or-Bust 三张截图）

目标：把 3 张截图放入你的 Figma 文件中作为底图参考，并把 **UI（面板/按钮/文字/图标/列表/格子等）重建为可编辑图层与可复用组件**；**插画背景**（海岛地图、港口场景等）保留位图。

> 注：你提供的字体为 Fusion Pixel Font（TakWolf）。要在 Figma 里正确显示，必须在本机安装字体，并启用 Figma Font Helper（桌面端）。

---

## 0) 前置准备（必须做）

### 字体：Fusion Pixel Font
1. 打开并下载字体：  
   https://github.com/TakWolf/fusion-pixel-font
2. 安装字体（Windows/macOS/Linux 常规安装方式均可）。
3. 如果你用的是 **Figma 桌面端**：安装并运行 **Figma Font Helper**（Figma 会提示）。
4. 重启 Figma（或至少重启桌面端应用）。

### 建议的 Figma 偏好设置
- 开启 *Snap to pixel grid* / 像素对齐（若有）。
- 视图缩放建议用 100% / 200% / 400% 做像素检查。

---

## 1) 文件结构（强烈建议）

在你的 Figma 文件里建 3 个 Page：

1. `00_Screens`：三张界面重建后的最终 Frame（每张图一个 Frame）
2. `01_Components`：可复用组件库（按钮、面板、徽章、格子、图标等）
3. `02_Styles`：颜色/文字样式展示区（也可不建 Page，只建 Styles）

命名建议（用 “/” 形成层级）：
- `Button/Primary`, `Button/Secondary`, `Button/Icon`
- `Panel/Sidebar`, `Panel/Card`, `Panel/Inset`
- `Badge/Number`, `Badge/Star`, `Badge/Tag`
- `Slot/Inventory`
- `Text/Title`, `Text/Heading`, `Text/Body`, `Text/Label`, `Text/Number`
- `Icon/Trophy`, `Icon/Gear`, `Icon/Anchor` …

---

## 2) 导入 3 张截图并建立对应 Frame（尺寸对齐）

对每一张截图做一次：

1. 在 `00_Screens` Page，创建一个 Frame（`F`）
2. 将截图拖入画布（或 `Place image…`），把截图放进 Frame 内
3. **确保 Frame 尺寸 = 截图像素尺寸**  
   - 选中截图，看右侧面板的 W/H  
   - 把 Frame 的 W/H 改成完全一致
4. 将截图图层命名为 `__reference` 并 **Lock**  
5. 把 `__reference` 放在最底层
6. Frame 命名：
   - `Screen/Home`
   - `Screen/Bidding`
   - `Screen/Result`

建议：给每个 Screen Frame 加一个 `Layout grid`，用于做像素对齐参考：
- Grid size 可先用 `2px` 或 `4px`（看你后续拆层精度需求）

---

## 3) 重建策略（最省时且好维护）

### 三层法（推荐）
每个 Screen Frame 内按这三层组织：

1. `BG`：背景位图（截图中地图/场景区域），保留位图或用截图裁切  
2. `UI`：所有 UI 结构（面板、按钮、分隔线、装饰边框、格子）  
3. `TEXT`：所有文字（必须可编辑，使用 Fusion Pixel Font）

### 先组件后拼装（推荐）
不要在 Screen 里直接画到死：  
先在 `01_Components` 把组件做完 → 再回到 `00_Screens` 拼装 → 只对“布局/容器”做少量专用结构。

---

## 4) 颜色 / 描边 / 阴影（保持像素风的关键）

### 颜色样式（Color Styles）
用吸管（`I`）从截图里取色，建立样式（示例命名）：
- `Color/Ink/900`（最深描边）
- `Color/Ink/700`（深面板底）
- `Color/Paper/100`（浅纸张底）
- `Color/Gold/500`（金色按钮/高亮）
- `Color/Green/500`（金额正数）
- `Color/Red/500`（金额负数）

### 描边（Stroke）
像素风 UI 常见做法：
- 外描边：1px–2px 深色
- 内高光：1px 浅色（可用额外矩形实现“内框”）

### 阴影（Effects）
尽量用“硬阴影”：
- Offset 2–4px
- Blur 0–1px
- 低透明度深色

把常用阴影做成 Effect Style：
- `Effect/Shadow/HardSm`
- `Effect/Shadow/HardMd`

---

## 5) 组件清单（按截图可复用的最小集合）

下面是我建议你优先做的组件（做完后 3 张屏基本都能拼出来）：

### 5.1 Buttons
1. `Button/Primary`（如 “START AUCTION”、橙色大按钮）
2. `Button/Secondary`（深色/灰色按钮，如 “FOLD”）
3. `Button/Small`（小尺寸：`+ $500`, `+ $1,000`, `MAX`）
4. `Button/Icon`（右上角 Trophy/Collection/Missions/Settings 那类）

建议做 Variants：
- `State=Default | Hover | Pressed | Disabled`
- `Size=Sm | Md | Lg`

### 5.2 Panels / Cards
1. `Panel/Sidebar`（左侧竖向菜单容器）
2. `Panel/Card`（信息卡片，如右侧城市介绍、Container Info）
3. `Panel/Inset`（内嵌浅底区域，如纸张质感信息区）
4. `Divider/Ornament`（带装饰的分割线）

### 5.3 Badges / Tags
1. `Badge/Number`（地点编号 1/2/3…）
2. `Badge/Stars`（星级展示，可用 1 个 Star Icon + Auto layout 重复）
3. `Tag/Status`（如 Risk Level: MEDIUM）

### 5.4 Inventory / Grid
1. `Slot/Inventory`（右侧仓库格子：边框 + 底色 + 角落数量）
2. `Slot/Locked`（锁住的格子：灰色+锁图标）
3. `Counter/Stack`（右上角数字角标）

### 5.5 Progress / Meter
1. `Bar/Progress`（XP 条）
2. `Chip/Currency`（金额显示：图标+数字）

### 5.6 Icons（尽量组件化）
优先把 UI 里重复出现的做成 `Icon/*`：
- Trophy / Gear / Anchor / Coins / Crate / Hourglass / Eye / etc.

> 图标的“像素风”通常不适合自动矢量化。更稳的做法是：  
> - 用 Pen/Vector 重新勾一版“块状/直角”的轮廓  
> - 或用 1px 网格手工像素化（工作量大，但最像素）

---

## 6) 文字样式（Text Styles）

创建以下 Text Styles，并统一使用 Fusion Pixel Font：
- `Text/Title`（大标题，如 BID OR BUST）
- `Text/Heading`（面板标题，如 AUCTION ROUND / AUCTION COMPLETE）
- `Text/Body`（描述正文）
- `Text/Label`（字段名：RISK LEVEL / TYPICAL FINDS）
- `Text/NumberLg`（大数字：$6,500 / $7,750）
- `Text/NumberSm`（小数字：24/24, 18/28, 00:45）

建议：所有数字用同一套数字样式，确保对齐一致。

---

## 7) 在 Screen 中拼装（按优先级）

对每个 Screen，按这个顺序做：
1. 放并锁定 `__reference`
2. 用 `Panel/*` 把主要 UI 容器搭出来（左侧栏、右侧栏、中央卡片/画布）
3. 填充按钮、标签、列表、格子（全部用组件）
4. 最后替换文字（确保全部可编辑，并套用 Text Styles）
5. 移除不必要的“截图残影”：UI 只保留你画的矢量结构

---

## 8) 交付检查清单（你可以用来验收）

每张 Screen：
- [ ] 截图底图在最底层并锁定
- [ ] UI 面板/按钮/格子都不是位图（可单独选中、修改颜色/尺寸）
- [ ] 所有文字可编辑，字体为 Fusion Pixel Font
- [ ] 重复元素均来自 `01_Components` 的组件实例
- [ ] 组件命名规范统一（`Button/*`, `Panel/*`, `Icon/*` …）

---

## 9) 如果你希望我继续“自动化操作 Figma”

我需要你保持浏览器焦点在当前任务窗口，否则会出现“用户切到别的任务，浏览器不可用”的错误，导致我无法继续自动化编辑。

你可以：
1. 先在这个环境里登录好 Figma（确保页面不再出现 Sign up/Continue with Google）
2. 然后告诉我“已登录并停留在文件编辑器里”，我再继续执行：导入三张图 → 建 Frame → 开始组件拆层。

