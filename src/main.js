// main.js — 装配一切
import { generatePuzzle, DIFFICULTIES } from './generator.js';
import {
  createState, setValue, toggleNote, undo, redo, clearCell,
  selectCell, STATUS, MAX_MISTAKES,
} from './state.js';
import { isSolved } from './validator.js';
import {
  saveGame, loadGame, clearSave, hasSave, recordScore, getScores,
  getSettings, saveSettings,
} from './storage.js';
import { buildBoard, render, updateMeta, updateNumpad, showToast } from './ui.js';
import { bindKeyboard } from './input.js';
import { initTheme, cycleTheme } from './theme.js';
import { sound } from './sound.js';

const N = 9;
const $ = (id) => document.getElementById(id);
const map = { easy: '简单', medium: '中等', hard: '困难' };

let state, cells, numButtons = {}, tick;

// ---------- 渲染入口 ----------
function draw() {
  render(state, cells);
  updateMeta(state, $('diffLabel'), $('mistakeLabel'), $('timerLabel'));
  updateNumpad(state, numButtons);
  $('noteBtn').classList.toggle('active', state.noteMode);
  saveGame(state);
}

// ---------- 计时 ----------
function startTimer() {
  if (tick) clearInterval(tick);
  tick = setInterval(() => {
    if (state.status === STATUS.PLAYING) {
      state.elapsedMs += 1000;
      $('timerLabel').textContent = fmt(state.elapsedMs);
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
  startTimer();
  draw();
  hide($("newModal"));
  showToast(`${map[diff]} 难度,开始!`, $('toast'));
}

function resume() {
  const s = loadGame();
  if (!s) return newGame('medium');
  state = createState({ puzzle: s.puzzle, solution: s.solution, difficulty: s.difficulty });
  state.givens = s.givens; state.notes = s.notes || state.notes;
  state.mistakes = s.mistakes; state.elapsedMs = s.elapsedMs || 0;
  state.status = s.status || STATUS.PLAYING;
  startTimer(); draw();
}

// ---------- 落子核心 ----------
function place(num) {
  if (state.status !== STATUS.PLAYING || !state.selected) return;
  const { r, c } = state.selected;
  if (state.givens[r][c]) return;

  if (state.noteMode) {
    toggleNote(state, r, c, num); sound.note();
  } else {
    const before = state.puzzle[r][c];
    setValue(state, r, c, num);
    const after = state.puzzle[r][c];
    if (after !== before && after !== 0) {
      if (after !== state.solution[r][c]) {
        state.mistakes++; sound.error();
        if (state.mistakes >= MAX_MISTAKES) return lose();
      } else sound.place();
    }
    // 清除同行列宫该数字的笔记
    if (after !== 0) clearPeerNotes(r, c, after);
  }
  afterMove();
}

function erase() {
  if (!state.selected || state.status !== STATUS.PLAYING) return;
  const { r, c } = state.selected;
  if (state.givens[r][c]) return;
  clearCell(state, r, c); sound.erase();
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

function win() {
  state.status = STATUS.WON;
  const isBest = recordScore(state.difficulty, state.elapsedMs, state.mistakes);
  sound.win();
  openEnd('完成!', `用时 ${fmt(state.elapsedMs)}${isBest ? '  · 新纪录!' : ''}`);
}

function lose() {
  state.status = STATUS.LOST;
  sound.lose();
  openEnd('挑战失败', `错误已达 ${MAX_MISTAKES} 次,再来一局?`);
}

// ---------- 提示 ----------
function hint() {
  if (state.status !== STATUS.PLAYING || !state.selected) {
    showToast('请先选中一个空格', $('toast')); return;
  }
  const { r, c } = state.selected;
  if (state.givens[r][c] || state.puzzle[r][c] === state.solution[r][c]) return;
  state.puzzle[r][c] = state.solution[r][c];
  state.notes[r][c] = [];
  state.history.push({ r, c, prev: 0, prevNotes: [] });
  sound.place();
  afterMove();
}

// ---------- 移动选中 ----------
function move(dr, dc) {
  if (!state.selected) { selectCell(state, 0, 0); draw(); return; }
  let { r, c } = state.selected;
  r = Math.max(0, Math.min(8, r + dr));
  c = Math.max(0, Math.min(8, c + dc));
  selectCell(state, r, c); draw();
}

function selectCellClick(r, c) {
  selectCell(state, r, c); draw();
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
});

function toggleNoteMode() {
  state.noteMode = !state.noteMode;
  $('noteBtn').classList.toggle('active', state.noteMode);
}

// ---------- 排行榜 ----------
function showScores() {
  const sc = getScores();
  const list = $('scoresList'); list.innerHTML = '';
  let any = false;
  for (const d of DIFFICULTIES) {
    const row = document.createElement('div'); row.className = 'score-row';
    if (sc[d]) {
      any = true;
      row.innerHTML = `<span>${map[d]}</span><span class="v">${fmt(sc[d].time)}</span>`;
    } else {
      row.innerHTML = `<span>${map[d]}</span><span class="v" style="color:var(--text-muted)">--</span>`;
    }
    list.appendChild(row);
  }
  if (any) {
    const clr = document.createElement('button');
    clr.className = 'ghost'; clr.textContent = '清除记录';
    clr.onclick = () => { localStorage.removeItem('sudoku.scores'); showScores(); };
    list.appendChild(clr);
  }
  show($('scoresModal'));
}

// ---------- 结局面板 ----------
function openEnd(title, text) {
  $('endTitle').textContent = title; $('endText').textContent = text;
  show($('endModal'));
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
    b.className = 'num'; b.dataset.n = n;
    b.innerHTML = `${n}<span class="count">9</span>`;
    b.addEventListener('click', () => place(n));
    pad.appendChild(b); numButtons[n] = b;
  }

  // 按钮
  $('newBtn').onclick = () => show($('newModal'));
  $('resumeBtn').onclick = () => { resume(); hide($('newModal')); };
  $('cancelNew').onclick = () => hide($('newModal'));
  $('scoresBtn').onclick = showScores;
  $('closeScores').onclick = () => hide($('scoresModal'));
  $('themeBtn').onclick = () => { const m = cycleTheme(); showToast(`主题: ${m}`, $('toast')); };
  $('soundBtn').onclick = () => {
    settings.sound = !settings.sound;
    sound.setEnabled(settings.sound); saveSettings(settings);
    $('soundBtn').classList.toggle('off', !settings.sound);
  };
  $('undoBtn').onclick = () => { undo(state); draw(); };
  $('redoBtn').onclick = () => { redo(state); draw(); };
  $('noteBtn').onclick = toggleNoteMode;
  $('hintBtn').onclick = hint;
  $('eraseBtn').onclick = erase;
  document.querySelectorAll('.diff-opt').forEach(b => b.onclick = () => newGame(b.dataset.diff));
  $('endNew').onclick = () => { hide($('endModal')); show($('newModal')); };
  $('endClose').onclick = () => hide($('endModal'));

  // 离开时存档
  window.addEventListener('beforeunload', () => state && saveGame(state));

  // 启动:有存档则续局,否则开局
  if (hasSave()) resume(); else newGame('medium');
}

init();
