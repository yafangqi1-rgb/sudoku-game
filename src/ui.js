// ui.js — DOM 棋盘渲染与高亮
import { findConflicts } from './validator.js';
const N = 9;

export function buildBoard(el, onCellClick) {
  el.innerHTML = '';
  const cells = [];
  for (let r = 0; r < N; r++) {
    cells.push([]);
    for (let c = 0; c < N; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.dataset.r = r; cell.dataset.c = c;
      // 宫边粗线(右边/下边)
      const cls = [];
      if (c % 3 === 2 && c !== 8) cls.push('rb');
      if (r % 3 === 2 && r !== 8) cls.push('bb');
      if (cls.length) cell.classList.add(...cls);
      cell.addEventListener('click', () => onCellClick(r, c));
      el.appendChild(cell);
      cells[r].push(cell);
    }
  }
  return cells;
}

// 完整重绘 + 高亮(选中、同数、同行列宫、冲突)
export function render(state, cells) {
  const conflict = findConflicts(state.puzzle);
  const sel = state.selected;
  const selVal = sel ? state.puzzle[sel.r][sel.c] : 0;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = cells[r][c];
      const v = state.puzzle[r][c];
      cell.classList.remove('given', 'user', 'selected', 'peer', 'same', 'conflict');

      // 内容
      const notes = state.notes[r][c];
      if (v !== 0) {
        cell.textContent = v;
        cell.classList.add(state.givens[r][c] ? 'given' : 'user');
      } else if (notes && notes.length) {
        let html = '<div class="note">';
        for (let n = 1; n <= 9; n++) html += `<span>${notes.includes(n) ? n : ''}</span>`;
        html += '</div>';
        cell.innerHTML = html;
      } else {
        cell.textContent = '';
      }

      // 高亮逻辑
      if (sel) {
        const sameBox = ((r / 3 | 0) === (sel.r / 3 | 0) && (c / 3 | 0) === (sel.c / 3 | 0));
        if (r === sel.r && c === sel.c) cell.classList.add('selected');
        else if (r === sel.r || c === sel.c || sameBox) cell.classList.add('peer');
        if (selVal !== 0 && v === selVal) cell.classList.add('same');
      }
      if (conflict[r][c] && v !== 0) cell.classList.add('conflict');
      // 严格模式:用户填入但与答案不符,也标红(即使不违反数独规则)
      if (v !== 0 && !state.givens[r][c] && v !== state.solution[r][c]) cell.classList.add('conflict');
    }
  }
}

export function updateMeta(state, diffLabel, mistakeLabel, timerLabel) {
  const map = { easy: '简单', medium: '中等', hard: '困难' };
  diffLabel.textContent = map[state.difficulty] || '中等';
  mistakeLabel.textContent = `${state.mistakes}/3`;
  if (mistakeLabel.classList.contains('danger')) {}
  mistakeLabel.style.color = state.mistakes >= 2 ? 'var(--conflict)' : '';
  const t = Math.floor(state.elapsedMs / 1000);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  timerLabel.textContent = `${mm}:${ss}`;
}

// 数字键盘各数字剩余数量
export function updateNumpad(state, numButtons) {
  const count = new Array(10).fill(0);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) if (state.puzzle[r][c]) count[state.puzzle[r][c]]++;
  for (let n = 1; n <= 9; n++) {
    const left = 9 - count[n];
    numButtons[n].classList.toggle('done', left === 0);
    const cnt = numButtons[n].querySelector('.count');
    if (cnt) cnt.textContent = left;
  }
}

export function showToast(msg, el) {
  el.textContent = msg; el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 1600);
}
