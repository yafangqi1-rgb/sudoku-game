// solver.js — 回溯求解器:求一个解 / 计数解的数量(用于唯一性校验)

const N = 9;

function clone(b) {
  const r = new Array(N);
  for (let i = 0; i < N; i++) r[i] = b[i].slice();
  return r;
}

// 在 (r,c) 放 num 是否合法(忽略该格自身)
export function isLegal(board, r, c, num) {
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

// 返回解的数量,最多数到 limit(默认 2,够判断唯一性)
export function countSolutions(board, limit = 2) {
  const b = clone(board);
  let count = 0;

  function backtrack() {
    if (count >= limit) return;
    // 找候选最少的空格(MRV),加速
    let best = -1, bestCands = null, br = 0, bc = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (b[r][c] !== 0) continue;
        const cands = [];
        for (let n = 1; n <= 9; n++) if (isLegal(b, r, c, n)) cands.push(n);
        if (best === -1 || cands.length < bestCands.length) {
          best = r * N + c;
          bestCands = cands;
          br = r; bc = c;
          if (cands.length === 0) return; // 死格
          if (cands.length === 1) break;
        }
      }
      if (bestCands && bestCands.length === 1) break;
    }
    if (best === -1) { // 没有空格 = 已解
      count++;
      return;
    }
    for (const n of bestCands) {
      b[br][bc] = n;
      backtrack();
      b[br][bc] = 0;
      if (count >= limit) return;
    }
  }

  backtrack();
  return count;
}

// 返回一个完整解(用于校验/提示),无解返回 null
export function solve(board) {
  const b = clone(board);
  function backtrack() {
    let best = -1, bestCands = null;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (b[r][c] !== 0) continue;
        const cands = [];
        for (let n = 1; n <= 9; n++) if (isLegal(b, r, c, n)) cands.push(n);
        if (cands.length === 0) return false;
        if (best === -1 || cands.length < bestCands.length) {
          best = r * N + c; bestCands = cands;
          if (cands.length === 1) { r = N; break; }
        }
      }
    if (best === -1) return true;
    const r = (best / N) | 0, c = best % N;
    for (const n of bestCands) {
      b[r][c] = n;
      if (backtrack()) return true;
      b[r][c] = 0;
    }
    return false;
  }
  return backtrack() ? b : null;
}
