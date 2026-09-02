// main.js — 装配一切
import { generatePuzzle, generateLevel, DIFFICULTIES, MAX_LEVEL } from './generator.js';
import {
  createState, setValue, toggleNote, undo, redo, clearCell,
  selectCell, usePowerup, STATUS, MAX_MISTAKES, MAX_HINTS,
} from './state.js';
import { isSolved } from './validator.js';
import {
  saveGame, loadGame, clearSave, hasSave, recordScore, getScores,
  getSettings, saveSettings, getPlayerName, setPlayerName, hasName,
  getLevelProgress, getUnlockedLevel, recordLevelResult, calcStars,
} from './storage.js';
import {
  buildBoard, render, updateMeta, updateNumpad, updatePowerups,
  showTaunt, showToast,
} from './ui.js';
import { bindKeyboard } from './input.js';
import { initTheme, cycleTheme } from './theme.js';
import { sound } from './sound.js';
import { randomTaunt } from './taunts.js';
import { calcIQ, iqLabel } from './iq.js';

const N = 9;
const $ = (id) => document.getElementById(id);
const map = { beginner: '入门', easy: '简单', medium: '中等', hard: '困难', level: '闯关' };

let state, cells, numButtons = {}, pwButtons = {}, tick;
let scoreRecorded = false;

// ---------- 渲染入口 ----------
function draw() {
  render(state, cells);
  // 关卡模式显示"第X关"
  if (state.level) {
    $('diffLabel').textContent = `第${state.level}关`;
  } else {
    $('diffLabel').textContent = map[state.difficulty] || '中等';
  }
  $('mistakeLabel').textContent = `${state.mistakes}/${MAX_MISTAKES}`;
  $('mistakeLabel').style.color = state.mistakes >= 2 ? 'var(--conflict)' : '';
  const t = Math.floor(state.elapsedMs / 1000);
  $('timerLabel').textContent = `${String((t/60)|0).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
  updateNumpad(state, numButtons);
  updatePowerups(state, pwButtons);
  updateHintCount();
  $('noteBtn').classList.toggle('active', state.noteMode);
  saveGame(state);
}

function updateHintCount() {
  const left = MAX_HINTS - state.hintsUsed;
  $('hintCount').textContent = left;
  $('hintBtn').classList.toggle('depleted', left <= 0);
}

// ---------- 计时 ----------
function startTimer() {
  if (tick) clearInterval(tick);
  tick = setInterval(() => {
    if (state.status === STATUS.PLAYING) {
      if (Date.now() < state.frozenUntil) {
        const left = Math.ceil((state.frozenUntil - Date.now()) / 1000);
        $('timerLabel').textContent = `\u2744 ${left}s`;
      } else {
        state.elapsedMs += 1000;
        const t = Math.floor(state.elapsedMs / 1000);
        $('timerLabel').textContent = `${String((t/60)|0).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
      }
    }
  }, 1000);
}

function fmt(ms) {
  const t = Math.floor(ms / 1000);
  return `${String((t / 60) | 0).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// ---------- 新局 / 续局 ----------
function newGame(diff) {
  const gen = generatePuzzle(diff);
  state = createState(gen);
  clearSave();
  scoreRecorded = false;
  startTimer();
  draw();
  hide($('newModal'));
  showToast(`${map[diff]} 难度，开始！`, $('toast'));
}

function newLevel(level) {
  const gen = generateLevel(level);
  state = createState(gen);
  clearSave();
  scoreRecorded = false;
  startTimer();
  draw();
  hide($('newModal'));
  showToast(`第 ${level} 关，开始！`, $('toast'));
}

function resume() {
  const s = loadGame();
  if (!s) { showNewGame(); return; }
  state = createState({ puzzle: s.puzzle, solution: s.solution, difficulty: s.difficulty, level: s.level });
  state.givens = s.givens;
  state.notes = s.notes || state.notes;
  state.mistakes = s.mistakes;
  state.hintsUsed = s.hintsUsed || 0;
  state.powerupsUsed = s.powerupsUsed || 0;
  state.powerups = s.powerups || state.powerups;
  // 迁移旧存档: sweep → autofill
  if (state.powerups.autofill === undefined) {
    state.powerups.autofill = state.powerups.sweep ?? 2;
    delete state.powerups.sweep;
  }
  state.shieldActive = s.shieldActive || false;
  state.frozenUntil = s.frozenUntil || 0;
  state.elapsedMs = s.elapsedMs || 0;
  state.status = s.status || STATUS.PLAYING;
  startTimer();
  draw();
}

// ---------- 落子核心 ----------
function place(num) {
  if (state.status !== STATUS.PLAYING || !state.selected) return;
  const { r, c } = state.selected;
  if (state.givens[r][c]) return;

  if (state.noteMode) {
    toggleNote(state, r, c, num);
    sound.note();
    afterMove();
    return;
  }

  const before = state.puzzle[r][c];

  // 护盾拦截错误
  if (num !== 0 && num !== before && num !== state.solution[r][c] && state.shieldActive) {
    state.shieldActive = false;
    sound.erase();
    showTaunt('护盾抵消！逃过一劫', $('taunt'), '\uD83D\uDEE1\uFE0F');
    draw();
    return;
  }

  setValue(state, r, c, num);
  const after = state.puzzle[r][c];

  if (after !== before && after !== 0) {
    if (after !== state.solution[r][c]) {
      state.mistakes++;
      sound.error();
      showTaunt(randomTaunt('error'), $('taunt'), '\u274C');
      if (state.mistakes >= MAX_MISTAKES) return lose();
    } else {
      sound.place();
    }
    clearPeerNotes(r, c, after);
  }
  afterMove();
}

function erase() {
  if (!state.selected || state.status !== STATUS.PLAYING) return;
  const { r, c } = state.selected;
  if (state.givens[r][c]) return;
  clearCell(state, r, c);
  sound.erase();
  afterMove();
}

function clearPeerNotes(r, c, num) {
  for (let i = 0; i < N; i++) {
    removeNote(state.notes[r][i], num);
    removeNote(state.notes[i][c], num);
  }
  const br = (r / 3 | 0) * 3, bc = (c / 3 | 0) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    removeNote(state.notes[br + i][bc + j], num);
}
function removeNote(arr, n) { const i = arr.indexOf(n); if (i >= 0) arr.splice(i, 1); }

function afterMove() {
  draw();
  if (state.status === STATUS.PLAYING && isSolved(state.puzzle)) win();
}

// ---------- 道具 ----------
function powerupAutofill() {
  if (!usePowerup(state, 'autofill')) return;
  // 找所有空格, 随机选一个填入正确答案
  const empties = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (state.puzzle[r][c] === 0) empties.push({ r, c });
  if (empties.length === 0) {
    showToast('没有空格可填了！', $('toast'));
    return;
  }
  const pick = empties[Math.floor(Math.random() * empties.length)];
  const prev = state.puzzle[pick.r][pick.c];
  const prevNotes = state.notes[pick.r][pick.c].slice();
  state.puzzle[pick.r][pick.c] = state.solution[pick.r][pick.c];
  state.notes[pick.r][pick.c] = [];
  state.history.push({ r: pick.r, c: pick.c, prev, prevNotes, next: state.solution[pick.r][pick.c], nextNotes: [] });
  state.future = [];
  // 高亮自动填入的格子
  cells[pick.r][pick.c].classList.add('autofill-flash');
  setTimeout(() => cells[pick.r][pick.c].classList.remove('autofill-flash'), 1500);
  clearPeerNotes(pick.r, pick.c, state.solution[pick.r][pick.c]);
  showTaunt(randomTaunt('powerup'), $('taunt'), '\uD83C\uDFAF');
  sound.place();
  afterMove();
}

function powerupFreeze() {
  if (!usePowerup(state, 'freeze')) return;
  state.frozenUntil = Date.now() + 30000;
  showTaunt(randomTaunt('powerup'), $('taunt'), '\u26A1');
  sound.place();
  draw();
}

function powerupShield() {
  if (!usePowerup(state, 'shield')) return;
  state.shieldActive = true;
  showTaunt('护盾已激活，下次错误免疫！', $('taunt'), '\uD83D\uDEE1\uFE0F');
  sound.place();
  draw();
}

// ---------- 提示 ----------
function hint() {
  if (state.status !== STATUS.PLAYING || !state.selected) {
    showToast('请先选中一个空格', $('toast'));
    return;
  }
  if (state.hintsUsed >= MAX_HINTS) {
    showToast('提示已用完！', $('toast'));
    return;
  }
  const { r, c } = state.selected;
  if (state.givens[r][c] || state.puzzle[r][c] === state.solution[r][c]) return;
  const prev = state.puzzle[r][c];
  const prevNotes = state.notes[r][c].slice();
  state.puzzle[r][c] = state.solution[r][c];
  state.notes[r][c] = [];
  state.hintsUsed++;
  state.history.push({ r, c, prev, prevNotes, next: state.solution[r][c], nextNotes: [] });
  state.future = [];
  sound.place();
  showTaunt(randomTaunt('hint'), $('taunt'), '\uD83D\uDCA1');
  afterMove();
}

// ---------- 移动选中 ----------
function move(dr, dc) {
  if (!state.selected) { selectCell(state, 0, 0); draw(); return; }
  let { r, c } = state.selected;
  r = Math.max(0, Math.min(8, r + dr));
  c = Math.max(0, Math.min(8, c + dc));
  selectCell(state, r, c);
  draw();
}

function selectCellClick(r, c) {
  selectCell(state, r, c);
  draw();
}

// ---------- 胜负 ----------
function win() {
  state.status = STATUS.WON;
  sound.win();

  // 立即记录排行榜(含闯关模式), 防止刷新丢失
  recordIfNeeded();

  const h = state.hintsUsed, p = state.powerupsUsed, m = state.mistakes;
  let verdict;
  if (m === 0 && h === 0 && p === 0) verdict = '满分通关！你是人形计算器吗？';
  else if (m === 0 && h === 0) verdict = '零失误零提示，稳如老狗';
  else if (m === 0) verdict = '零失误，可圈可点';
  else verdict = randomTaunt('win');

  // 关卡模式: 记录星级
  let stars = 0;
  if (state.level) {
    const result = recordLevelResult(state.level, {
      time: state.elapsedMs, mistakes: m, hints: h, powerups: p,
    });
    stars = result.stars;
    // 未通关的后续关卡解锁提示
    const next = state.level + 1;
    if (next <= MAX_LEVEL) {
      setTimeout(() => showToast(`第 ${next} 关已解锁！`, $('toast')), 500);
    }
  }

  $('endTitle').textContent = state.level ? `第${state.level}关 通关！` : '完成！';
  $('endTaunt').textContent = verdict;
  // 星级显示
  const starsEl = $('endStars');
  if (state.level && stars) {
    starsEl.textContent = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
  } else {
    starsEl.textContent = '';
  }
  $('endTime').textContent = fmt(state.elapsedMs);
  $('endMistakes').textContent = m;
  $('endHints').textContent = h;
  $('endPowerups').textContent = p;
  showIQ();

  show($('endModal'));
}

function lose() {
  state.status = STATUS.LOST;
  sound.lose();
  scoreRecorded = true; // 失败不计分

  $('endTitle').textContent = '挑战失败';
  $('endTaunt').textContent = randomTaunt('lose');
  $('endStars').textContent = '';
  $('endTime').textContent = fmt(state.elapsedMs);
  $('endMistakes').textContent = `${state.mistakes}/${MAX_MISTAKES}`;
  $('endHints').textContent = state.hintsUsed;
  $('endPowerups').textContent = state.powerupsUsed;
  showIQ();

  show($('endModal'));
}

// ---------- 智商评分(娱乐向) ----------
function showIQ() {
  const iq = calcIQ(state);
  const { label } = iqLabel(iq);
  const box = $('iqBox');
  const scoreEl = $('iqValue').parentElement; // .iq-score
  $('iqValue').textContent = iq;
  $('iqDesc').textContent = label;
  box.hidden = false;
  // 重触发弹跳动画
  scoreEl.classList.remove('bump');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('bump');
}

function recordIfNeeded() {
  if (scoreRecorded) return;
  scoreRecorded = true;
  const name = getPlayerName() || '匿名玩家';
  const diff = state.level ? 'level' : state.difficulty;
  recordScore(diff, {
    time: state.elapsedMs,
    mistakes: state.mistakes,
    hints: state.hintsUsed,
    powerups: state.powerupsUsed,
    name,
  });
}

// ---------- 键盘分发 ----------
bindKeyboard((kind, a, b) => {
  if (kind === 'num') place(a);
  else if (kind === 'erase') erase();
  else if (kind === 'note') toggleNoteMode();
  else if (kind === 'hint') hint();
  else if (kind === 'undo') { undo(state); draw(); }
  else if (kind === 'redo') { redo(state); draw(); }
  else if (kind === 'move') move(a, b);
  else if (kind === 'help') toggleHelp();
  else if (kind === 'powerup') {
    if (a === 'autofill') powerupAutofill();
    else if (a === 'freeze') powerupFreeze();
    else if (a === 'shield') powerupShield();
  }
});

function toggleNoteMode() {
  state.noteMode = !state.noteMode;
  $('noteBtn').classList.toggle('active', state.noteMode);
}

// ---------- 关卡网格渲染 ----------
function renderLevelGrid() {
  const grid = $('levelGrid');
  grid.innerHTML = '';
  const progress = getLevelProgress();
  const unlocked = getUnlockedLevel();

  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const data = progress[lv];
    const cell = document.createElement('div');
    const isLocked = lv > unlocked;
    cell.className = 'level-cell' + (isLocked ? ' locked' : '') + (data ? ' completed' : '');
    cell.dataset.level = lv;

    const numEl = document.createElement('div');
    numEl.className = 'lv-num';
    numEl.textContent = isLocked ? '\uD83D\uDD12' : lv;
    cell.appendChild(numEl);

    if (data && data.stars) {
      const starsEl = document.createElement('div');
      starsEl.className = 'lv-stars';
      starsEl.textContent = '\u2B50'.repeat(data.stars);
      cell.appendChild(starsEl);
    }

    if (!isLocked) {
      cell.addEventListener('click', () => newLevel(lv));
    }
    grid.appendChild(cell);
  }
}

// ---------- Tab 切换 ----------
function switchTab(which) {
  const isCampaign = which === 'campaign';
  $('tabCampaign').classList.toggle('active', isCampaign);
  $('tabFree').classList.toggle('active', !isCampaign);
  $('panelCampaign').classList.toggle('active', isCampaign);
  $('panelFree').classList.toggle('active', !isCampaign);
  if (isCampaign) renderLevelGrid();
}

// ---------- 新游戏弹窗 ----------
function showNewGame() {
  renderLevelGrid();
  show($('newModal'));
}

// ---------- 帮助 ----------
function toggleHelp() {
  const el = $('helpModal');
  if (el.hidden) { show(el); } else { hide(el); }
}

// ---------- 名字门控 ----------
function showNameGate() {
  $('nameInputGate').value = getPlayerName();
  updateNameConfirm();
  show($('nameModal'));
  setTimeout(() => $('nameInputGate').focus(), 100);
}
function updateNameConfirm() {
  const val = $('nameInputGate').value.trim();
  $('nameConfirm').disabled = val.length === 0;
}

// ---------- 排行榜 ----------
function showScores() {
  const sc = getScores();
  const list = $('scoresList');
  list.innerHTML = '';
  let any = false;

  for (const d of [...DIFFICULTIES, 'level']) {
    const section = document.createElement('div');
    section.className = 'score-section';
    const title = document.createElement('div');
    title.className = 'score-section-title';
    title.textContent = map[d];
    section.appendChild(title);

    const entries = sc[d] || [];
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'score-empty';
      empty.textContent = '暂无记录，快来打榜！';
      section.appendChild(empty);
    } else {
      any = true;
      entries.forEach((e, i) => {
        const row = document.createElement('div');
        row.className = 'score-row';
        const rankCls = i === 0 ? 'rank gold' : 'rank';
        const badges = [];
        if (e.mistakes) badges.push(`<span class="badge-err">\u274C${e.mistakes}</span>`);
        if (e.hints) badges.push(`<span class="badge-hint">\uD83D\uDCA1${e.hints}</span>`);
        if (e.powerups) badges.push(`<span class="badge-pw">\uD83C\uDFAE${e.powerups}</span>`);
        if (!e.mistakes && !e.hints && !e.powerups) badges.push('<span class="badge-perfect">\u2728\u6EE1\u5206</span>');
        row.innerHTML =
          `<span class="${rankCls}">${i + 1}</span>` +
          `<span class="name">${escapeHtml(e.name || '匿名')}</span>` +
          `<span class="time">${fmt(e.time)}</span>` +
          `<span class="badges">${badges.join('')}</span>`;
        section.appendChild(row);
      });
    }
    list.appendChild(section);
  }

  if (any) {
    const clr = document.createElement('button');
    clr.className = 'ghost';
    clr.textContent = '清除所有记录';
    clr.onclick = () => { localStorage.removeItem('sudoku.scores'); showScores(); };
    list.appendChild(clr);
  }

  show($('scoresModal'));
}

function escapeHtml(s) {
  return String(s).replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- 工具函数 ----------
function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

// ---------- 初始化 ----------
function init() {
  const settings = getSettings();
  sound.setEnabled(settings.sound);
  $('soundBtn').classList.toggle('off', !settings.sound);
  initTheme();

  cells = buildBoard($('board'), selectCellClick);

  // 数字键盘
  const pad = $('numpad');
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement('button');
    b.className = 'num';
    b.dataset.n = n;
    b.innerHTML = `${n}<span class="count">9</span>`;
    b.addEventListener('click', () => place(n));
    pad.appendChild(b);
    numButtons[n] = b;
  }

  // 道具按钮
  pwButtons.autofill = $('pwAutofill');
  pwButtons.freeze = $('pwFreeze');
  pwButtons.shield = $('pwShield');

  // 按钮绑定
  $('newBtn').onclick = showNewGame;
  $('resumeBtn').onclick = () => { resume(); hide($('newModal')); };
  $('cancelNew').onclick = () => hide($('newModal'));
  $('scoresBtn').onclick = showScores;
  $('scoresBtn2').onclick = showScores;
  $('closeScores').onclick = () => hide($('scoresModal'));
  $('helpBtn').onclick = toggleHelp;
  $('closeHelp').onclick = () => hide($('helpModal'));
  $('themeBtn').onclick = () => { const m = cycleTheme(); showToast(`主题: ${m}`, $('toast')); };
  $('soundBtn').onclick = () => {
    settings.sound = !settings.sound;
    sound.setEnabled(settings.sound);
    saveSettings(settings);
    $('soundBtn').classList.toggle('off', !settings.sound);
  };
  $('undoBtn').onclick = () => { undo(state); draw(); };
  $('redoBtn').onclick = () => { redo(state); draw(); };
  $('noteBtn').onclick = toggleNoteMode;
  $('hintBtn').onclick = hint;
  $('eraseBtn').onclick = erase;
  $('pwAutofill').onclick = powerupAutofill;
  $('pwFreeze').onclick = powerupFreeze;
  $('pwShield').onclick = powerupShield;

  // Tab 切换
  $('tabCampaign').onclick = () => switchTab('campaign');
  $('tabFree').onclick = () => switchTab('free');

  // 自由模式难度按钮
  document.querySelectorAll('.diff-opt').forEach(b =>
    b.onclick = () => newGame(b.dataset.diff));

  // 名字门控
  $('nameInputGate').addEventListener('input', updateNameConfirm);
  $('nameInputGate').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && $('nameConfirm').disabled === false) confirmName();
  });
  $('nameConfirm').onclick = confirmName;

  // 结局面板
  $('endNew').onclick = () => { recordIfNeeded(); hide($('endModal')); showNewGame(); };
  $('endClose').onclick = () => { recordIfNeeded(); hide($('endModal')); };

  // 离开时存档
  window.addEventListener('beforeunload', () => state && saveGame(state));

  // 启动流程: 没名字 → 门控; 有名字 → 续局或新游戏
  if (!hasName()) {
    showNameGate();
  } else if (hasSave()) {
    resume();
  } else {
    showNewGame();
  }
}

function confirmName() {
  const name = $('nameInputGate').value.trim();
  if (!name) return;
  setPlayerName(name);
  hide($('nameModal'));
  if (hasSave()) resume();
  else showNewGame();
}

init();
