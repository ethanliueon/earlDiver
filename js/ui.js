// DOM overlays: home screen, journal, boat workshop, pause, run log.
import { SPECIES_BY_ID } from './species.js';
import { speciesIcon } from './creatures_draw.js';
import { SUB_LEVELS } from './player.js';
import { RESOURCES } from './world.js';
import { formatTime } from './util.js';

const $ = (id) => document.getElementById(id);
const RUNLOG_KEY = 'earlDiver.runs.v1';

export class UI {
  constructor(h) {
    this.h = h;
    this.journalDirty = true;
    this.iconCache = new Map();
    $('play').addEventListener('click', () => h.onPlay());
    $('journal-close').addEventListener('click', () => this.toggleJournal(false));
    $('workshop-close').addEventListener('click', () => this.toggleWorkshop(false));
    $('upgrade-btn').addEventListener('click', () => { h.onUpgrade(); this.renderWorkshop(); });
    $('resume').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); });
    $('quit').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); g.earl.o2 = 0; g.mode = 'play'; });
    $('notes').addEventListener('input', (e) => { h.getGame().notes = e.target.value; });
    this.renderRuns();
  }
  typing() { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT'); }
  blurTyping() { document.activeElement && document.activeElement.blur(); }
  anyOpen() { return !$('journal').hidden || !$('workshop').hidden; }
  closeAll() { this.toggleJournal(false); this.toggleWorkshop(false); }

  showGame() {
    $('menu').classList.add('gone');
    $('notes').value = '';
    this.journalDirty = true;
  }
  showMenu(last) {
    this.closeAll();
    $('menu').classList.remove('gone');
    this.setPaused(false);
    this.renderRuns(last);
  }
  setPaused(p) { $('pause').hidden = !p; }

  toggleJournal(force) {
    const el = $('journal');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleWorkshop(false); this.renderJournal(); }
    else this.blurTyping();
  }
  toggleWorkshop(force) {
    const el = $('workshop');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.renderWorkshop(); }
  }

  renderJournal() {
    const g = this.h.getGame();
    $('journal-count').textContent = `${g.journal.size} of 183 recorded`;
    const list = $('journal-list');
    list.innerHTML = '';
    if (g.journal.size === 0) {
      list.innerHTML = '<p class="empty">Nothing recorded yet.<br>Swim close to a creature and press F to observe it.</p>';
      return;
    }
    const entries = [...g.journal.entries()].sort((a, b) => b[1].time - a[1].time);
    for (const [id, info] of entries) {
      const sp = SPECIES_BY_ID[id];
      const row = document.createElement('div');
      row.className = 'entry';
      let icon = this.iconCache.get(id);
      if (!icon) { icon = speciesIcon(sp, 160, 90); this.iconCache.set(id, icon); }
      const img = document.createElement('img');
      img.src = icon.toDataURL(); img.alt = sp.name;
      const txt = document.createElement('div');
      txt.innerHTML = `<h3>${sp.name}</h3><div class="sci">${sp.sci}</div>
        <p>${sp.desc}</p>
        <div class="meta">Seen at ${info.depth} m · lives ${sp.dmin}–${sp.dmax} m · up to ${sp.size}</div>`;
      row.append(img, txt);
      list.append(row);
    }
  }

  renderWorkshop() {
    const g = this.h.getGame();
    const sub = g.sub;
    const cur = SUB_LEVELS[sub.level], next = SUB_LEVELS[sub.level + 1];
    $('ws-status').innerHTML = sub.imploded
      ? 'The submersible is gone.'
      : `Hull rated to <b>${cur.rated} m</b> · air <b>${formatTime(cur.o2)}</b> · refit ${sub.level}/3`;
    const costEl = $('ws-cost');
    costEl.innerHTML = '';
    const btn = $('upgrade-btn');
    if (!next || sub.imploded) {
      costEl.innerHTML = sub.imploded ? '' : '<p>Fully refitted. Nothing more can be done for her.</p>';
      btn.disabled = true; btn.textContent = 'Refit';
    } else {
      let ok = true;
      const head = document.createElement('p');
      head.innerHTML = `Next refit: rated to <b>${next.rated} m</b>, air <b>${formatTime(next.o2)}</b>`;
      costEl.append(head);
      const ul = document.createElement('ul');
      for (const [k, n] of Object.entries(next.cost)) {
        const have = g.inv[k] || 0;
        if (have < n) ok = false;
        const li = document.createElement('li');
        li.className = have >= n ? 'ok' : '';
        li.textContent = `${RESOURCES[k].name}  ${Math.min(have, n)}/${n}`;
        ul.append(li);
      }
      costEl.append(ul);
      btn.disabled = !ok; btn.textContent = ok ? 'Refit the submersible' : 'Not enough materials';
    }
    const inv = $('ws-inv');
    const items = Object.entries(g.inv).filter(([, n]) => n > 0);
    inv.textContent = items.length ? 'Carrying: ' + items.map(([k, n]) => `${RESOURCES[k].name} ${n}`).join(' · ') : 'Carrying nothing.';
  }

  saveRun(log) {
    let runs = [];
    try { runs = JSON.parse(localStorage.getItem(RUNLOG_KEY) || '[]'); } catch (e) { runs = []; }
    runs.unshift(log);
    runs = runs.slice(0, 12);
    try { localStorage.setItem(RUNLOG_KEY, JSON.stringify(runs)); } catch (e) { /* storage unavailable */ }
    this.runs = runs;
  }
  renderRuns(last) {
    let runs = this.runs;
    if (!runs) { try { runs = JSON.parse(localStorage.getItem(RUNLOG_KEY) || '[]'); } catch (e) { runs = []; } }
    this.runs = runs;
    const el = $('runlog');
    if (!runs.length) { el.innerHTML = ''; return; }
    const rows = runs.slice(0, 6).map((r, i) => `
      <tr class="${i === 0 && last ? 'latest' : ''}">
        <td>${formatTime(r.survived)}</td><td>${r.cause}</td><td>${r.maxDepth} m</td><td>${r.species}</td><td>${r.sapphires}/8</td>
      </tr>`).join('');
    el.innerHTML = `<h2>Dive log</h2><table><thead><tr><th>Survived</th><th>Ended</th><th>Deepest</th><th>Species</th><th>Sapphires</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  update(g, dt) {
    if (!$('journal').hidden && this.journalDirty) { this.journalDirty = false; this.renderJournal(); }
    if (!$('workshop').hidden) {
      const e = g.earl;
      if (Math.abs(e.x - 512) > 16 || e.y > 5) this.toggleWorkshop(false);
    }
  }
}
