// input.js — 键盘控制
export function bindKeyboard(handler) {
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k >= '1' && k <= '9') { handler('num', +k); e.preventDefault(); }
    else if (k === '0' || k === 'Backspace' || k === 'Delete') { handler('erase'); e.preventDefault(); }
    else if (k === 'n' || k === 'N') { handler('note'); }
    else if (k === 'h' || k === 'H') { handler('hint'); }
    else if (k === 'z' || k === 'Z') { handler('undo'); }
    else if (k === 'y' || k === 'Y') { handler('redo'); }
    else if (k === 's' || k === 'S') { handler('powerup', 'sweep'); }
    else if (k === 'f' || k === 'F') { handler('powerup', 'freeze'); }
    else if (k === 'd' || k === 'D') { handler('powerup', 'shield'); }
    else if (k === '?' || k === '/') { handler('help'); }
    else if (k === 'ArrowUp') { handler('move', -1, 0); e.preventDefault(); }
    else if (k === 'ArrowDown') { handler('move', 1, 0); e.preventDefault(); }
    else if (k === 'ArrowLeft') { handler('move', 0, -1); e.preventDefault(); }
    else if (k === 'ArrowRight') { handler('move', 0, 1); e.preventDefault(); }
  });
}
