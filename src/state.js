// state.js — 游戏状态管理
const N = 9;

export const STATUS = { PLAYING: 'playing', WON: 'won', LOST: 'lost' };
export const MAX_MISTAKES = 3;

export function createState({ puzzle, solution, difficulty }) {
  return {
    puzzle: puzzle.map(r => r.slice()),          // 当前盘面(含用户填入)
    givens: puzzle.map(row => row.map(v => v !== 0)), // 给定值(不可改)
    solution: solution.map(r => r.slice()),
    notes: Array.from({ length: N }, () =>
      Array.from({ length: N }, () => [])),
    difficulty,
    mistakes: 0,
    elapsedMs: 0,
    startedAt: Date.now(),
    selected: null,        // {r,c}
    noteMode: false,
    status: STATUS.PLAYING,
    history: [],           // 用于撤销
    future: [],           // 用于重做
  };
}

export function setValue(state, r, c, num) {
  if (state.givens[r][c] || state.status !== STATUS.PLAYING) return false;
  const prev = state.puzzle[r][c];
  const prevNotes = state.notes[r][c].slice();
  if (prev === num) num = 0; // 再次按同数 = 清除
  // 记入历史(撤销)
  state.history.push({ r, c, prev, prevNotes });
  state.future = [];
  state.puzzle[r][c] = num;
  if (num !== 0) state.notes[r][c] = [];
  return true;
}

export function toggleNote(state, r, c, num) {
  if (state.givens[r][c] || state.puzzle[r][c] !== 0) return false;
  const notes = state.notes[r][c];
  const i = notes.indexOf(num);
  if (i >= 0) notes.splice(i, 1);
  else notes.push(num);
  state.history.push({ r, c, prev: state.puzzle[r][c], prevNotes: notes.slice() });
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
  // 还原到该操作之后的状态较复杂,这里做简化:仅重做值设置
  state.puzzle[nxt.r][nxt.c] = nxt.prev === 0 ? 0 : nxt.prev;
  state.history.push(nxt);
  return true;
}

export function clearCell(state, r, c) {
  if (state.givens[r][c] || state.status !== STATUS.PLAYING) return false;
  const prev = state.puzzle[r][c];
  const prevNotes = state.notes[r][c].slice();
  if (prev === 0 && prevNotes.length === 0) return false;
  state.history.push({ r, c, prev, prevNotes });
  state.future = [];
  state.puzzle[r][c] = 0;
  state.notes[r][c] = [];
  return true;
}

export function selectCell(state, r, c) { state.selected = { r, c }; }
