// validator.js — 实时冲突检测,供 UI 高亮使用
const N = 9;

// 单格放入 num 是否与现有盘面冲突(不要求该格为空)
export function isValidPlacement(board, r, c, num) {
  if (num === 0) return true;
  for (let i = 0; i < N; i++) {
    if (i !== c && board[r][i] === num) return false;
    if (i !== r && board[i][c] === num) return false;
  }
  const br = (r / 3 | 0) * 3, bc = (c / 3 | 0) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const rr = br + i, cc = bc + j;
      if (!(rr === r && cc === c) && board[rr][cc] === num) return false;
    }
  return true;
}

// 返回所有"有冲突"的格坐标集合(同行/列/宫内重复出现的非空格)
export function findConflicts(board) {
  const conflict = Array.from({ length: N }, () => new Array(N).fill(false));
  const mark = (cells) => {
    const seen = new Map();
    cells.forEach(([r, c]) => {
      const v = board[r][c];
      if (!v) return;
      if (seen.has(v)) {
        conflict[r][c] = true;
        seen.get(v).forEach(([pr, pc]) => { conflict[pr][pc] = true; });
        seen.get(v).push([r, c]);
      } else seen.set(v, [[r, c]]);
    });
  };
  for (let i = 0; i < N; i++) mark(rowCells(i));
  for (let i = 0; i < N; i++) mark(colCells(i));
  for (let i = 0; i < N; i += 3)
    for (let j = 0; j < N; j += 3) mark(boxCells(i, j));
  return conflict;
}

export function isSolved(board) {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (!board[r][c] || !isValidPlacement(board, r, c, board[r][c])) return false;
  return true;
}

function rowCells(i) { return Array.from({ length: N }, (_, c) => [i, c]); }
function colCells(i) { return Array.from({ length: N }, (_, r) => [r, i]); }
function boxCells(br, bc) {
  const cells = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push([br + i, bc + j]);
  return cells;
}
