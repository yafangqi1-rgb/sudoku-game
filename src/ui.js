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

export function render(state, cells) {
  const conflict = findConflicts(state.puzzle);
  const sel = state.selected;
  const selVal = sel ? state.puzzle[sel.r][sel.c] : 0;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = cells[r][c];
      const v = state.puzzle[r][c];
      cell.classList.remove('given', 'user', 'selected', 'peer', 'same', 'conflict');

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

      if (sel) {
        const sameBox = ((r / 3 | 0) === (sel.r / 3 | 0) && (c / 3 | 0) === (sel.c / 3 | 0));
        if (r === sel.r && c === sel.c) cell.classList.add('selected');
        else if (r === sel.r || c === sel.c || sameBox) cell.classList.add('peer');
        if (selVal !== 0 && v === selVal) cell.classList.add('same');
      }
      if (conflict[r][c] && v !== 0) cell.classList.add('conflict');
      if (v !== 0 && !state.givens[r][c] && v !== state.solution[r][c]) cell.classList.add('conflict');
    }
  }
}

export function updateMeta(state, diffLabel, mistakeLabel, timerLabel) {
  const map = { easy: '简单', medium: '中等', hard: '困难' };
  diffLabel.textContent = map[state.difficulty] || '中等';
  mistakeLabel.textContent = `${state.mistakes}/3`;
  mistakeLabel.style.color = state.mistakes >= 2 ? 'var(--conflict)' : '';
  const t = Math.floor(state.elapsedMs / 1000);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  timerLabel.textContent = `${mm}:${ss}`;
}

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

export function updatePowerups(state, buttons) {
  for (const [type, btn] of Object.entries(buttons)) {
    const count = state.powerups[type] || 0;
    const cnt = btn.querySelector('.pw-count');
    if (cnt) cnt.textContent = count;
    btn.classList.toggle('depleted', count === 0);
    btn.disabled = count === 0 || state.status !== 'playing';
    // 护盾激活态
    if (type === 'shield') {
      btn.classList.toggle('active', state.shieldActive);
    }
  }
}

// 小号 toast (操作提示)
export function showToast(msg, el) {
  el.textContent = msg; el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 1600);
}

// 大号弹幕 (搞笑吐槽)
export function showTaunt(msg, el, emoji) {
  const textEl = el.querySelector('.taunt-text');
  const emojiEl = el.querySelector('.taunt-emoji');
  if (emojiEl) emojiEl.textContent = emoji || '';
  if (textEl) textEl.textContent = msg;
  el.hidden = false;
  el.classList.remove('taunt-out');
  el.classList.add('taunt-in');
  clearTimeout(showTaunt._t);
  showTaunt._t = setTimeout(() => {
    el.classList.add('taunt-out');
    el.classList.remove('taunt-in');
    setTimeout(() => { el.hidden = true; }, 300);
  }, 2200);
}

// 排雷闪烁: 标记所有错误格
export function flashWrongCells(state, cells, duration = 2000) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = state.puzzle[r][c];
      if (v !== 0 && !state.givens[r][c] && v !== state.solution[r][c]) {
        cells[r][c].classList.add('sweep-flash');
      }
    }
  }
  setTimeout(() => {
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        cells[r][c].classList.remove('sweep-flash');
  }, duration);
}
