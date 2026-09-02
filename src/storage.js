// storage.js — 本地存档 / 排行榜 / 设置
const KEY = 'sudoku.save';
const SCORE_KEY = 'sudoku.scores';
const SET_KEY = 'sudoku.settings';

export function saveGame(state) {
  try {
    const data = {
      puzzle: state.puzzle, givens: state.givens, solution: state.solution,
      notes: state.notes, difficulty: state.difficulty, mistakes: state.mistakes,
      elapsedMs: state.elapsedMs,
      status: state.status,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) { /* 忽略配额错误 */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function clearSave() { localStorage.removeItem(KEY); }

export function hasSave() { return !!localStorage.getItem(KEY); }

// 排行榜:按难度记录最佳成绩(用时少者优先,且 mistakes=0)
export function getScores() {
  try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || {}; }
  catch (e) { return {}; }
}

export function recordScore(difficulty, elapsedMs, mistakes) {
  if (mistakes > 0) return false; // 仅零失误计入最佳
  const scores = getScores();
  const prev = scores[difficulty];
  const entry = { time: elapsedMs, date: Date.now() };
  if (!prev || elapsedMs < prev.time) {
    scores[difficulty] = entry;
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    return true; // 新纪录
  }
  return false;
}

// 设置:主题、音效开关
export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SET_KEY)) || { sound: true, theme: 'auto' }; }
  catch (e) { return { sound: true, theme: 'auto' }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) { }
}
