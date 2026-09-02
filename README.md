# 数独 Sudoku

纯静态、浏览器内运行的在线数独游戏,部署于 GitHub Pages。

## 特性
- 三档难度(简单 / 中等 / 困难),回溯算法生成,保证唯一解
- 严格错误模式:错误次数达 3 即判负
- 笔记(铅笔标记)、提示、撤销、擦除
- 选中高亮 + 同数字高亮 + 冲突标红
- 自动存档,刷新可续玩
- 浅色 / 暗色 / 跟随系统 三种主题
- WebAudio 轻音效(填数 / 错误 / 胜负),无需音频文件
- 本地最佳成绩排行榜(按难度,仅零失误计入)
- 键盘 + 鼠标 + 触屏操作

## 本地运行
无需构建,任一静态服务器即可:
```bash
npx serve .
# 或
python -m http.server 8000
```

## 目录结构
```
sudoku-game/
├── index.html
├── styles.css
├── src/
│   ├── generator.js   # 回溯生成 + 挖空(唯一解校验)
│   ├── solver.js      # 回溯求解 + 解计数
│   ├── validator.js   # 行列宫冲突检测
│   ├── state.js       # 棋盘/笔记/计时/错误/撤销
│   ├── storage.js     # 存档/排行榜/设置
│   ├── ui.js          # DOM 渲染 + 高亮
│   ├── input.js       # 键盘控制
│   ├── theme.js       # 主题切换
│   ├── sound.js       # WebAudio 音效
│   └── main.js        # 装配入口
├── .nojekyll
```

## 部署
GitHub Pages 从 `main` 分支根目录部署,
访问 `https://<用户名>.github.io/sudoku-game/`。

## 操作
| 键 | 功能 |
|----|------|
| 1-9 | 填数 |
| 0 / Backspace / Delete | 擦除 |
| N | 笔记模式 |
| H | 提示 |
| Z / Y | 撤销 / 重做 |
| 方向键 | 移动选中 |
