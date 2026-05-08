/**
 * search.js — shared anatomy search bar UI
 * Index shape: { name, bn, sysKey, sysLabelBn, sysColor, meshes }[]
 */

export function initSearchBar({ inputEl, dropdownEl, onSelect }) {
  let index = [];
  let activeIdx = -1;
  let debounce = null;

  function setIndex(arr) { index = arr; }

  function search(q) {
    const s = q.toLowerCase().trim();
    if (!s) return [];
    return index
      .map(e => {
        const en = e.name.toLowerCase();
        const bn = (e.bn ?? '').toLowerCase();
        let score = 99;
        for (const t of [en, bn]) {
          if (!t) continue;
          if (t === s)            { score = 0; break; }
          if (t.startsWith(s))    { score = Math.min(score, 1); }
          else if (t.includes(s)) { score = Math.min(score, 2); }
        }
        return { ...e, score };
      })
      .filter(e => e.score < 99)
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
      .slice(0, 8);
  }

  function render(results) {
    dropdownEl.innerHTML = '';
    activeIdx = -1;
    if (!results.length) { dropdownEl.hidden = true; return; }
    results.forEach(r => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-search-item';
      btn.innerHTML =
        `<span class="nsi-dot" style="background:${r.sysColor ?? '#888'}"></span>` +
        `<span class="nsi-text">` +
          (r.bn ? `<span class="nsi-bn">${r.bn}</span>` : '') +
          `<span class="nsi-en">${r.name}</span>` +
        `</span>` +
        (r.sysLabelBn ? `<span class="nsi-sys">${r.sysLabelBn}</span>` : '');
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        inputEl.value = r.bn ?? r.name;
        dropdownEl.hidden = true;
        activeIdx = -1;
        onSelect(r);
      });
      dropdownEl.appendChild(btn);
    });
    dropdownEl.hidden = false;
  }

  function close() { dropdownEl.hidden = true; activeIdx = -1; }

  inputEl.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => render(search(inputEl.value)), 150);
  });

  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim()) render(search(inputEl.value));
  });

  inputEl.addEventListener('keydown', e => {
    const items = [...dropdownEl.querySelectorAll('.nav-search-item')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('is-active', i === activeIdx));
      if (activeIdx >= 0) items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
      items.forEach((el, i) => el.classList.toggle('is-active', i === activeIdx));
      if (activeIdx >= 0) items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      items[activeIdx].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      close();
      inputEl.blur();
    }
  });

  document.addEventListener('click', e => {
    const wrap = inputEl.closest('.nav-search');
    if (!wrap || !wrap.contains(e.target)) close();
  });

  return { setIndex };
}