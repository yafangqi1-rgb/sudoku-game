// storage.js — 本地存档 / 排行榜 / 设置
const KEY = 'sudoku.save';
const SCORE_KEY = 'sudoku.scores';
const SET_KEY = 'sudoku.settings';
const NAME_KEY = 'sudoku.player';
const MAX_RECORDS = 5;

export function saveGame(state) {
  try {
    const data = {
      puzzle: state.puzzle, givens: state.givens, solution: state.solution,
      notes: state.notes, difficulty: state.difficulty, mistakes: state.mistakes,
      hintsUsed: state.hintsUsed, powerupsUsed: state.powerupsUsed,
      powerups: state.powerups, shieldActive: state.shieldActive,
      frozenUntil: state.frozenUntil,
      elapsedMs: state.elapsedMs, status: state.status,
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

// ---- 玩家名字 ----
export function getPlayerName() {
  try { return localStorage.getItem(NAME_KEY) || ''; }
  catch (e) { return ''; }
}
export function setPlayerName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
}

// ---- 排行榜: 每难度 Top5, 含完整统计 ----
export function getScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORE_KEY)) || {};
    // 迁移旧格式(单个对象) -> 数组
    for (const d of Object.keys(raw)) {
      if (!Array.isArray(raw[d])) {
        const old = raw[d];
        raw[d] = [{
          time: old.time, mistakes: 0, hints: 0, powerups: 0,
          name: '旧记录', date: old.date || Date.now(),
          score: Math.floor(old.time / 1000),
        }];
      }
    }
    return raw;
  } catch (e) { return {}; }
}

export function recordScore(difficulty, { time, mistakes, hints, powerups, name }) {
  const scores = getScores();
  if (!scores[difficulty]) scores[difficulty] = [];
  // 综合评分: 基础秒数 + 提示x30s + 道具x20s + 错误x60s, 越低越好
  const score = Math.floor(time / 1000) + (hints || 0) * 30 + (powerups || 0) * 20 + (mistakes || 0) * 60;
  const entry = {
    time, mistakes: mistakes || 0, hints: hints || 0, powerups: powerups || 0,
    name: name || '匿名玩家', date: Date.now(), score,
  };
  scores[difficulty].push(entry);
  scores[difficulty].sort((a, b) => a.score - b.score);
  scores[difficulty] = scores[difficulty].slice(0, MAX_RECORDS);
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(scores)); } catch (e) {}
  return scores[difficulty].includes(entry);
}

// ---- 设置 ----
export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SET_KEY)) || { sound: true, theme: 'auto' }; }
  catch (e) { return { sound: true, theme: 'auto' }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) {}
}
