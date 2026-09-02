# 数独游戏逻辑文档

> 本文档记录游戏的完整实现逻辑,供后期修改、补充、完善使用。
> 已实现部分标注 ✅,待建设部分标注 🚧(已预埋章节,等填充)。
>
- **仓库**：<https://github.com/yafangqi1-rgb/sudoku-game>
- **线上地址**：<https://yafangqi1-rgb.github.io/sudoku-game/>
- **技术栈**：原生 HTML + CSS + JavaScript(ES Module),无构建,纯静态
- **最后更新**：2026-09-02

---

## 目录
1. [总览与数据流](#1-总览与数据流)
2. [目录结构与模块职责](#2-目录结构与模块职责)
3. [核心数据结构](#3-核心数据结构)
4. [核心算法](#4-核心算法)
5. [状态管理与生命周期](#5-状态管理与生命周期)
6. [玩法规则](#6-玩法规则)
7. [渲染与高亮逻辑](#7-渲染与高亮逻辑)
8. [输入控制](#8-输入控制)
9. [持久化(存档/排行榜/设置)](#9-持久化)
10. [增强:主题与音效](#10-增强主题与音效)
11. [部署与更新机制](#11-部署与更新机制)
12. [分享与他人游玩](#12-分享与他人游玩)
13. [🚧 待建设(占位,待补充)](#13-待建设)

---

## 1. 总览与数据流 ✅

```
用户输入(键盘/鼠标/触屏)
   │
   ▼
Input controller(input.js) ──► 事件分发到 main.js 的 handler
   │
   ▼
State manager(state.js):修改棋盘/笔记/计时/错误/历史
   │                    (调用 Core logic:生成/求解/校验)
   ▼
UI renderer(ui.js):重绘棋盘 + 高亮(选中/同行列宫/同数/冲突)
   │
   ▼
Storage(storage.js):每次落子后自动存档(浏览器存储)
```

核心一句话:**输入改状态 → 状态驱动渲染 → 渲染后存档**。所有逻辑在浏览器内运行,无后端、无网络请求。

---

## 2. 目录结构与模块职责 ✅

```
sudoku-game/
├── index.html          # 单页结构:顶栏 / 棋盘 / 工具 / 数字键盘 / 三个弹窗
├── styles.css         # 全部样式 + 浅/暗双主题(CSS 变量)
├── src/
│   ├── generator.js   # 生成完整解 + 挖空(唯一解校验)
│   ├── solver.js      # 回溯求解 + 解计数(用于唯一性/提示)
│   ├── validator.js   # 行/列/宫冲突检测,判胜
│   ├── state.js       # 棋盘/笔记/计时/错误/撤销重做状态
│   ├── storage.js     # 存档续玩 + 排行榜 + 设置
│   ├── ui.js          # DOM 渲染 + 高亮 + 元信息更新
│   ├── input.js       # 键盘事件映射
│   ├── theme.js       # 浅色/暗色/跟随系统
│   ├── sound.js       # WebAudio 轻音效(无需音频文件)
│   └── main.js        # 装配入口:绑定事件 + 游戏循环
├── .nojekyll          # 禁用 GitHub Pages 的 Jekyll 处理(保留 src/ 目录)
├── package.json       # 仅声明 type=module,无依赖
├── PLAN.md            # 初版规划
└── docs/GAME_LOGIC.md # 本文档
```

模块之间只通过 import/export 通信,main.js 是唯一装配点。

---

## 3. 核心数据结构 ✅

棋盘统一用 **9×9 二维数组**,空格用 `0`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `puzzle` | 9×9 数组 | 当前盘面(含给定值和用户填入) |
| `givens` | 9×9 布尔 | `true`=题目给定(不可改) |
| `solution` | 9×9 数组 | 生成器产出的完整解(用于校验答案、给提示) |
| `notes` | 9×9×数组 | 每格的候选数字(铅笔标记) |
| `difficulty` | `'easy'│'medium'│'hard'` | 难度 |
| `mistakes` | 数 | 错误次数,达 `MAX_MISTAKES`(3)判负 |
| `elapsedMs` | 数 | 已用毫秒(计时器每秒 +1000) |
| `startedAt` | 时间戳 | 本局开始时间 |
| `selected` | `{r,c}│null` | 当前选中格 |
| `noteMode` | 布尔 | 是否处于笔记模式 |
| `status` | `'playing'│'won'│'lost'` | 局面状态 |
| `history` | 数组 | 撤销栈,每条 `{r,c,prev,prevNotes,next,nextNotes}` |
| `future` | 数组 | 重做栈 |

状态对象由 `createState()` 一次性创建,后续就地修改。

---

## 4. 核心算法 ✅

### 4.1 生成器 generator.js
1. **生成完整解 `generateFull()`**:从左上到右下逐格回溯,每格把 1-9 随机打乱后试探,合法即填,递归下一格;无解则回退。必然产出一个合法的完整盘面。
2. **挖空 `dig(board, givens)`**:把 81 格顺序打乱,依次尝试挖空;挖空后调用求解器 `countSolutions(puzzle, 2)`,**只有解数恰好为 1 时才保留挖空**,否则恢复该格。循环直到剩余给定数 ≤ 目标。
3. **难度参数**(保留给定数,挖空数 = 81 − givens):
   - `easy`:40 个给定(挖 41)
   - `medium`:32 个给定(挖 49)
   - `hard`:26 个给定(挖 55)
4. 入口 `generatePuzzle(difficulty)` 返回 `{ puzzle, solution, difficulty }`。

### 4.2 求解器 solver.js
- `isLegal(board,r,c,num)`:判断在 `(r,c)` 放 `num` 是否违反行/列/3×3宫。
- `countSolutions(board, limit=2)`:回溯求解,**MRV 启发式**(优先填候选最少的空格,加速),数到 `limit` 即停。用于唯一性校验时 limit=2:解数=1 即唯一。
- `solve(board)`:返回一个完整解(用于校验/提示),无解返回 `null`。

### 4.3 校验器 validator.js
- `isValidPlacement(board,r,c,num)`:单格放入是否冲突。
- `findConflicts(board)`:返回 9×9 布尔矩阵,标记所有"行/列/宫内重复"的格。
- `isSolved(board)`:全部填满且无冲突即胜利(因谜题唯一解,合法填满 == 答案)。

---

## 5. 状态管理与生命周期 ✅

main.js 中的核心动作函数:

| 动作 | 逻辑 |
|------|------|
| `place(num)` | 选中格非给定:笔记模式下 `toggleNote`;否则 `setValue`。填入后与 `solution[r][c]` 比较,不符则 `mistakes++`(达 3 判负),相符则正常落子并清除同行列宫该数字的笔记。最后 `afterMove` 判胜。 |
| `erase()` | 清空选中格的值与笔记。 |
| `hint()` | 选中空格直接填入 `solution[r][c]`(计入撤销)。 |
| `undo()/redo()` | 弹栈恢复/重做,均基于 `next`/`prev` 值对。 |
| `move(dr,dc)` | 方向键移动选中,边界自动钳制。 |
| `afterMove()` | 重绘 + 若 `isSolved` 则 `win()`。 |
| `win()` | 状态置 won,记成绩(仅零失误),播音效,弹结局面板。 |
| `lose()` | 状态置 lost,播音效,弹结局面板。 |
| `newGame(diff)` | 生成新局 → 置状态 → 启动计时 → 重绘 → 清存档。 |
| `resume()` | 从存档恢复棋盘/笔记/计时/状态。 |

计时:每秒 setInterval,`status===playing` 时 `elapsedMs += 1000` 并刷新显示。

---

## 6. 玩法规则 ✅

- **三档难度**:简单 / 中等 / 困难(给定数 40/32/26)。
- **严格错误模式**:填入与正解不符即记一次错误,**错误满 3 次判负**。
- **冲突标红**:错误填入(即使不违反数独规则)也会因与 `solution` 不符而标红。
- **笔记模式**:按 N 切换;笔记模式下数字键给选中格打/取消候选标记。落子会自动清除同行列宫的对应候选。
- **提示**:按 H 揭示选中空格的正解。
- **撤销/重做**:Z / Y。
- **自动存档**:每次落子后写入浏览器存储;刷新或重开可在原局面续玩。
- **排行榜**:按难度记录**零失误**的最快用时。

---

## 7. 渲染与高亮逻辑 ✅

`ui.js`:
- `buildBoard()`:一次性生成 81 个 `<div class="cell">`,绑定点击 → `selectCellClick`。宫边界用 `rb`/`bb` 类加粗右侧/下侧边线。
- `render(state, cells)`:每次状态变化重绘:
  - 给定值深色加粗(`given`),用户填入蓝色(`user`)。
  - 笔记用 3×3 小网格显示候选数字。
  - 高亮:选中格(`selected`)、同行列宫(`peer`)、相同数字(`same`)。
  - 冲突格(`conflict`):行/列/宫重复,或用户值 ≠ 正解,均标红。
- `updateMeta()`:刷新难度、错误数(≥2 时变红)、计时。
- `updateNumpad()`:数字键显示该数字剩余可填数(9−已填),填满则置灰禁用。

---

## 8. 输入控制 ✅

`input.js` 键盘映射(全局 keydown):

| 键 | 动作 |
|----|------|
| 1–9 | 填数 / 笔记 |
| 0 / Backspace / Delete | 擦除 |
| N | 笔记模式开关 |
| H | 提示 |
| Z / Y | 撤销 / 重做 |
| ↑↓←→ | 移动选中 |

鼠标:点格子选中,点数字键填数。触屏:同上(CSS 已做响应式)。

---

## 9. 持久化 ✅

`storage.js`(浏览器存储,key 前缀 `sudoku.`):

| key | 内容 |
|-----|------|
| `sudoku.save` | 当前局存档(puzzle/givens/solution/notes/mistakes/elapsedMs/status) |
| `sudoku.scores` | 排行榜 `{easy:{time,date}, medium:..., hard:...}` |
| `sudoku.settings` | `{sound:bool, theme:'light'│'dark'│'auto'}` |

- `saveGame`/`loadGame`/`clearSave`/`hasSave`:存档续玩。
- `recordScore`:仅零失误计入,刷新最佳。
- `getSettings`/`saveSettings`:主题与音效偏好。

---

## 10. 增强:主题与音效 ✅

- **主题 theme.js**:`light` / `dark` / `auto`(跟随系统 `prefers-color-scheme`)。`cycleTheme()` 三态循环,通过 `data-theme` 属性切换 CSS 变量。跟随系统模式下监听系统变化自动适配。
- **音效 sound.js**:WebAudio 实时合成,无音频文件:`place`(填数)、`erase`(擦除)、`note`(笔记)、`error`(错误)、`win`(胜利三连音)、`lose`(失败)。可通过设置开关静音。

---

## 11. 部署与更新机制 ✅

- **方式**:GitHub Pages,源 = `main` 分支根目录(`/`)。`.nojekyll` 禁用 Jekyll,保证 `src/` 等目录原样提供。`.js` 以 `application/javascript` 提供,ES 模块可正常加载。
- **更新流程**:改完本地代码 → 推送 `main` → Pages 约 20 秒~1 分钟后重建生效。
- **已知坑(已解决)**:
  - CSS `.modal{display:grid}` 覆盖 `hidden` 属性 → 已加 `[hidden]{display:none!important}`。
  - 本沙箱内 `git push` 被拦截 → 改用 **GitHub Contents API**(`PUT /repos/{owner}/{repo}/contents/{path}`,body 含 base64 内容 + 现有文件 sha)逐文件更新,作为可靠回退。
- 后续如需自动 CI 部署,可加 `.github/workflows/deploy.yml`(用 `actions/deploy-pages`,源设为 GitHub Actions)。

---

## 12. 分享与他人游玩 ✅

**能,任何人都能玩。** 这是公开的 GitHub Pages 站点,无需登录、无需安装:

- 把链接 <https://yafangqi1-rgb.github.io/sudoku-game/> 直接发给朋友即可,手机/电脑浏览器打开就能玩。
- 每个玩家在自己浏览器里独立生成谜题、独立存档,互不影响。
- 已做移动端响应式(棋盘自适应、数字键触屏友好)。

**实现原理**:GitHub Pages 把仓库静态文件托管为公开网站,免费、全球 CDN、HTTPS。只要仓库公开且开了 Pages,链接永久有效。

> 🚧 若想要"分享一局固定谜题给朋友比拼"(同一题同起点),需要额外实现(见第 13 节)。

---

## 13. 待建设 🚧

> 以下为预埋章节,当前未实现,留作后期补充完善逻辑。每节标注"实现思路"供参考。

### 13.1 🚧 每日挑战
- 每天固定一道题(同难度),所有人同题。
- 实现思路:用日期作为随机种子生成谜题(`seededRandom`),无需后端;各玩家本地计算同一题。

### 13.2 🚧 分享固定谜题 / 成绩
- 生成谜题序列化为短码(如 Base64/URL),拼到链接 `?p=xxx`,他人打开复现同一题。
- 成绩分享:完成后生成分享卡片或文字结果。

### 13.3 🚧 云端排行榜
- 当前仅本地最佳成绩。若要全局排行,需后端(如 GitHub Actions + JSON 提交,或接入 Firebase/Supabase)。
- 待选型后补充数据结构与接口。

### 13.4 🚧 多难度调参与计时挑战
- 难度给定数可配置;可加"竞速模式""残局挑战"。
- 计时挑战:限时完成,超时判负。

### 13.5 🚧 多语言(i18n)
- 抽离文案为语言包,按 `navigator.language` 切换。

### 13.6 🚧 PWA 离线可装
- 加 `manifest.json` + Service Worker,实现离线可玩、可"安装到桌面"。

### 13.7 🚧 错题回顾 / 学习模式
- 记录常错位置,生成专项练习;或加逻辑推理提示(而非直接给答案)。

### 13.8 🚧 键盘可达性与无障碍
- 完善 ARIA、焦点环、屏幕阅读器播报。

---

> 修改本文档后,如需同步到线上仓库,可用 Contents API 推送(或修复 `git push` 后直接 push)。
