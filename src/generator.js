// generator.js — 生成完整合法解 + 按难度挖空(保证唯一解)
import { countSolutions, isLegal } from './solver.js';

const N = 9;
function clone(b) { return b.map(row => row.slice()); }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 回溯生成一个随机完整解
function generateFull() {
  const board = Array.from({ length: N }, () => new Array(N).fill(0));
  function fill(idx) {
    if (idx === N * N) return true;
    const r = (idx / N) | 0, c = idx % N;
    for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isLegal(board, r, c, n)) {
        board[r][c] = n;
        if (fill(idx + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }
  fill(0);
  return board;
}

// 难度 -> 保留的给定数(挖空数 = 81 - givens)
// 标准参考: 入门55+/简单45-50/中等32-36/困难25-30
const DIFF = {
  beginner: 55,  // 入门: 挖 26 — 新手友好
  easy: 50,      // 简单: 挖 31 — 休闲放松
  medium: 36,    // 中等: 挖 45 — 有点意思
  hard: 28,      // 困难: 挖 53 — 烧脑挑战
};

// 闯关模式: 20 关, 从超简单逐步加难
export const MAX_LEVEL = 20;
// Level 1 = 60 给定(只挖21格, 超简单)
// Level 20 = 30 给定(挖51格, 接近困难)
export function levelGivens(level) {
  return Math.max(30, Math.round(60 - (level - 1) * 1.6));
}

// 挖空: 随机移除单元格, 保证剩余仍有唯一解
function dig(board, givens) {
  const puzzle = clone(board);
  const cells = shuffle(Array.from({ length: N * N }, (_, i) => i));
  let remaining = N * N;
  for (const idx of cells) {
    if (remaining <= givens) break;
    const r = (idx / N) | 0, c = idx % N;
    const backup = puzzle[r][c];
    if (backup === 0) continue;
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) === 1) {
      remaining--;
    } else {
      puzzle[r][c] = backup; // 去掉会多解, 恢复
    }
  }
  return puzzle;
}

// 自由模式: 按难度生成
export function generatePuzzle(difficulty = 'medium') {
  const solution = generateFull();
  const puzzle = dig(solution, DIFF[difficulty] || DIFF.medium);
  return { puzzle, solution, difficulty };
}

// 闯关模式: 按关卡生成
export function generateLevel(level) {
  const solution = generateFull();
  const givens = levelGivens(level);
  const puzzle = dig(solution, givens);
  return { puzzle, solution, difficulty: 'level', level };
}

export const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard'];
