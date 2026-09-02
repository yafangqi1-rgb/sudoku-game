// state.js — 游戏状态管理
const N = 9;

export const STATUS = { PLAYING: 'playing', WON: 'won', LOST: 'lost' };
export const MAX_MISTAKES = 3;
export const MAX_HINTS = 3;

// 道具配置: 每局初始数量
export const POWERUP_CONFIG = {
  sweep:  { initial: 2, label: '排雷', icon: '\uD83D\uDD0D' },
  freeze: { initial: 1, label: '冻结', icon: '\u26A1' },
  shield: { initial: 1, label: '护盾', icon: '\uD83D\uDEE1\uFE0F' },
};

export function createState({ puzzle, solution, difficulty, level }) {
  return {
    puzzle: puzzle.map(r => r.slice()),
    givens: puzzle.map(row => row.map(v => v !== 0)),
    solution: solution.map(r => r.slice()),
    notes: Array.from({ length: N }, () =>
      Array.from({ length: N }, () => [])),
    difficulty,
    level: level || null,  // null = 自由模式
    mistakes: 0,
    hintsUsed: 0,
    powerupsUsed: 0,
    powerups: {
      sweep: POWERUP_CONFIG.sweep.initial,
      freeze: POWERUP_CONFIG.freeze.initial,
      shield: POWERUP_CONFIG.shield.initial,
    },
    shieldActive: false,
    frozenUntil: 0,   // timestamp, 0 = not frozen
    elapsedMs: 0,
    startedAt: Date.now(),
    selected: null,
    noteMode: false,
    status: STATUS.PLAYING,
    history: [],
    future: [],
  };
}

export function setValue(state, r, c, num) {
  if (state.givens[r][c] || state.status !== STATUS.PLAYING) return false;
  const prev = state.puzzle[r][c];
  const prevNotes = state.notes[r][c].slice();
  if (prev === num) num = 0;
  state.puzzle[r][c] = num;
  if (num !== 0) state.notes[r][c] = [];
  state.history.push({ r, c, prev, prevNotes, next: num, nextNotes: state.notes[r][c].slice() });
  state.future = [];
  return true;
}

export function toggleNote(state, r, c, num) {
  if (state.givens[r][c] || state.puzzle[r][c] !== 0) return false;
  const prev = state.puzzle[r][c];
  const prevNotes = state.notes[r][c].slice();
  const notes = state.notes[r][c];
  const i = notes.indexOf(num);
  if (i >= 0) notes.splice(i, 1);
  else notes.push(num);
  state.history.push({ r, c, prev, prevNotes, next: prev, nextNotes: notes.slice() });
  state.future = [];
  return true;
}

export function undo(state) {
  if (!state.history.length) return false;
  const last = state.history.pop();
  state.puzzle[last.r][last.c] = last.prev;
  state.notes[last.r][last.c] = last.prevNotes;
  state.future.push(last);
  return true;
}

export function redo(state) {
  if (!state.future.length) return false;
  const nxt = state.future.pop();
  state.puzzle[nxt.r][nxt.c] = nxt.next;
  state.notes[nxt.r][nxt.c] = nxt.nextNotes;
  state.history.push(nxt);
  return true;
}

export function clearCell(state, r, c) {
  if (state.givens[r][c] || state.status !== STATUS.PLAYING) return false;
  const prev = state.puzzle[r][c];
  const prevNotes = state.notes[r][c].slice();
  if (prev === 0 && prevNotes.length === 0) return false;
  state.puzzle[r][c] = 0;
  state.notes[r][c] = [];
  state.history.push({ r, c, prev, prevNotes, next: 0, nextNotes: [] });
  state.future = [];
  return true;
}

export function usePowerup(state, type) {
  if (state.status !== STATUS.PLAYING) return false;
  if (!state.powerups[type] || state.powerups[type] <= 0) return false;
  state.powerups[type]--;
  state.powerupsUsed++;
  return true;
}

export function selectCell(state, r, c) { state.selected = { r, c }; }
