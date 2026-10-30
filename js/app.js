// App controller. Owns the three modes (intro, 3D world, portfolio) and every piece
// of HTML UI. The 3D world is loaded lazily and only drives navigation; all content
// comes from data.js, so portfolio mode works without Three.js ever loading.
import { person, projects, groups, sections, img, imgThumb } from './data.js';
import { Viewer } from './viewer.js';
import { createMosaic } from './mosaic.js';

const $ = (s, r = document) => r.querySelector(s);
const body = document.body;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) body.classList.add('touch');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const items = (p) => p.sections.flatMap((s) => s.items);
const projectById = (id) => projects.find((p) => p.id === id);
const groupById = (id) => groups.find((g) => g.id === id);
// the stop a project is shown at: its group's, if it has one
const stopOf = (id) => projectById(id)?.group ?? id;

const state = {
  mode: 'intro',
  world: null,
  worldPromise: null,
  worldError: null,
  audio: null,
  panel: null,        // { kind: 'project' | 'about', id }
  near: null,         // the stop whose overview is showing
  wantsExplore: false,
};

const viewer = new Viewer($('#viewer'), {
  onOpen: () => state.world?.setInputEnabled(false),
  onClose: () => { if (!state.panel && overlay.hidden) state.world?.setInputEnabled(true); },
});

/* ------------------------------------------------------------------ */
/* Portfolio mode                                                       */
/* ------------------------------------------------------------------ */

// A project's code on GitHub, as rows like the contact links.
function repoLinks(p) {
  return (p.repos || []).map((r) => `<a class="repo" href="${esc(r.href)}" target="_blank" rel="noopener"><img class="ico" src="assets/icons/github.png" alt=""><span class="k">GitHub</span><span class="v">${esc(r.label)}${r.note ? ` · ${esc(r.note)}` : ''}</span><span class="go" aria-hidden="true">↗</span></a>`).join('');
}

function contactLinks(cls) {
  const rows = [
    ...person.contact.links.map((l) => [l.label, l.value, l.href]),
    [person.pdf.label, `Download · ${person.pdf.size}`, person.pdf.href, true],
  ];
  return rows.map(([k, v, href, dl]) => cls === 'grid'
    ? `<a href="${esc(href)}" ${dl ? 'download' : 'target="_blank" rel="noopener"'}><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></a>`
    : `<a href="${esc(href)}" ${dl ? 'download' : 'target="_blank" rel="noopener"'}><span>${esc(k)}</span><span>${esc(v)}</span></a>`).join('');
}

// Brand icons for the contact links (Gmail, LinkedIn, GitHub), keyed by the link's label.
const ICONS = { Email: 'gmail', 'Institute email': 'gmail', LinkedIn: 'linkedin', GitHub: 'github' };
const icon = (label) => ICONS[label] ? `<img class="ico" src="assets/icons/${ICONS[label]}.png" alt="" aria-hidden="true">` : '';

// The date of an entry, shown on the right of its heading: its own `when`, else the part of its
// category after the last "·" (e.g. "Internship · Apr – Jun 2026" -> "Apr – Jun 2026").
const when = (p) => p.when ?? p.category.split('·').pop().trim();

// The mark beside an entry's title: its logo or badge, else its number.
function mark(p) {
  if (p.badge) return `<span class="pf-mark logo"><img src="${p.badge}" alt=""></span>`;
  if (p.logo) return `<span class="pf-mark logo"><img src="${img(p.logo)}" alt=""></span>`;
  return `<span class="pf-mark num">${p.number}</span>`;
}

function shot(p, id, cls) {
  const it = items(p).find((i) => i.id === id);
  return `<figure class="${cls}"><button type="button" data-open="${id}" aria-label="Open ${esc(it.caption)} full screen"><img src="${img(id)}" alt="${esc(it.caption)}" loading="lazy" decoding="async"></button></figure>`;
}

// One entry: a heading row (mark, title, role · place, and the date on the right), the story, then
// its poster laid out as it was made: side panel, centre banner, side panel.
function entryHtml(p) {
  const [left, right] = p.walls || [];
  return `<article class="pf-entry" id="${p.id}" data-project="${p.id}">
    <header class="pf-entry-head rv">
      ${mark(p)}
      <div class="pf-entry-name">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.type)} · ${esc(p.location)}</p>
      </div>
      <time class="pf-entry-date">${esc(when(p))}</time>
    </header>
    <div class="pf-entry-text rv">${p.intro.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
    ${p.repos ? `<div class="pf-repos contact-links rv">${repoLinks(p)}</div>` : ''}
    <div class="pf-poster rv ${left ? 'three' : 'one'}">
      ${left ? shot(p, left, 'side') : ''}${shot(p, p.hero, 'centre')}${right ? shot(p, right, 'side') : ''}
    </div>
  </article>`;
}

// A section: a heading block across the top (number, big title, subtitle, a link per entry), its
// entries beneath, and an optional background image spanning all of it.
function secBar(num, title, members = []) {
  return `<div class="pf-sec-bar" aria-hidden="true"><div class="pf-sec-bar-in">
    <button type="button" class="pf-bar-home" data-top tabindex="-1" title="Back to top">${esc(person.name)}</button>
    <span class="pf-bar-num">${num}</span><strong>${esc(title)}</strong>
    <nav>${members.map((p) => `<a href="#/projects/${p.id}" data-entry="${p.id}" tabindex="-1"><span>${esc(p.title)}</span><time>${esc(when(p))}</time></a>`).join('')}</nav>
    ${iconLinks('pf-icons')}
  </div></div>`;
}

function sectionHtml(sec, i) {
  const members = sec.members.map(projectById);
  return `<section class="pf-sec sec-${sec.id}" id="${sec.id}">
    ${secBar(String(i + 1).padStart(2, '0'), sec.title, members)}
    <div class="pf-sec-bg" ${sec.bg ? `style="--bg:url('${new URL(`assets/bg/${sec.bg}`, document.baseURI)}')"` : ''} aria-hidden="true"></div>
    <div class="pf-wrap">
      <header class="pf-sec-head rv">
        <span class="pf-sec-num">${String(i + 1).padStart(2, '0')}</span>
        <h2>${esc(sec.title)}</h2>
        <p>${esc(sec.sub)}</p>
        <nav class="pf-sec-jump" aria-label="${esc(sec.title)}">${members.map((p) => `<a href="#/projects/${p.id}"><span>${esc(p.title)}</span><time>${esc(when(p))}</time></a>`).join('')}</nav>
      </header>
      ${members.map(entryHtml).join('')}
    </div>
  </section>`;
}

function iconLinks(cls) {
  return `<div class="${cls}">${person.contact.links.filter((l) => l.label !== 'Institute email').map((l) => `<a href="${esc(l.href)}" ${l.href.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"'} aria-label="${esc(l.label)}" title="${esc(l.label)}">${icon(l.label)}</a>`).join('')}<a class="cv" href="${person.pdf.href}" download>CV</a></div>`;
}

function aboutHtml() {
  const rows = (list) => `<ul class="pf-rows">${list.map((r) => `<li><div><strong>${esc(r.title)}</strong><span>${esc(r.place)}${r.note ? ` · ${esc(r.note)}` : ''}</span></div><time>${esc(r.years)}</time></li>`).join('')}</ul>`;
  return `<section class="pf-sec sec-about" id="about">
    ${secBar(String(sections.length + 1).padStart(2, '0'), 'About')}
    <div class="pf-wrap">
      <header class="pf-sec-head rv">
        <span class="pf-sec-num">${String(sections.length + 1).padStart(2, '0')}</span>
        <h2>About</h2>
        <p>${esc(person.role)}</p>
      </header>
      <div class="pf-about-grid">
        <img class="rv" src="${img(person.portrait)}" alt="Portrait of ${esc(person.name)}" loading="lazy">
        <div class="lead rv">${person.about.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      </div>
      <div class="pf-facts">
        <div class="rv"><h3>All experience</h3>${rows(person.experience)}</div>
        <div class="rv"><h3>Recognition</h3><ul class="pf-rows plain">${person.awards.map((a) => `<li><div>${esc(a)}</div></li>`).join('')}</ul>
          <h3>Software</h3><div class="tags">${person.software.map((s) => `<span>${esc(s)}</span>`).join('')}</div></div>
      </div>
    </div>
  </section>`;
}

function renderPortfolio() {
  const main = $('#portfolio');
  const nav = [...sections, { id: 'about', title: 'About' }, { id: 'contact', title: 'Contact' }];
  main.innerHTML = `
    <header class="pf-header">
      <button class="wordmark" type="button" data-go="intro">${esc(person.name)}</button>
      <nav class="pf-nav" aria-label="Portfolio">${nav.map((s) => `<a href="#/projects/${s.id}">${esc(s.title)}</a>`).join('')}</nav>
      <div class="pf-header-end">
        ${iconLinks('pf-icons')}
        <button class="btn btn-primary" type="button" data-go="explore" ${state.worldError ? 'hidden' : ''}>Explore in 3D</button>
      </div>
    </header>
    <section class="pf-hero">
      <div class="pf-wrap">
        <div class="pf-hero-top">
          <img class="pf-hero-logo" src="assets/icons/iit-kgp.png" alt="IIT Kharagpur">
          <div class="pf-hero-name">
            <p class="pf-kicker">${esc(person.title)} · ${esc(person.years)}</p>
            <h1>${esc(person.name)}</h1>
            <p class="tagline">${esc(person.tagline)}</p>
          </div>
        </div>
        <ol class="pf-flow">${person.flow.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('')}</ol>
        ${iconLinks('pf-icons big')}
        <nav class="pf-chapters" aria-label="Sections">${sections.map((s, i) => `<a href="#/projects/${s.id}" ${s.bg ? `class="has-bg" style="--bg:url('${new URL(`assets/bg/${s.bg}`, document.baseURI)}')"` : ''}><span>${String(i + 1).padStart(2, '0')}</span><strong>${esc(s.title)}</strong><em>${s.members.length} ${s.members.length === 1 ? 'entry' : 'entries'}</em></a>`).join('')}</nav>
      </div>
    </section>
    ${sections.map(sectionHtml).join('')}
    ${aboutHtml()}
    <footer class="pf-contact" id="contact">
      <div class="pf-wrap">
        <p class="pf-kicker">Contact</p>
        <h2>${esc(person.signoff)}</h2>
        <div class="pf-contact-grid">${person.contact.links.map((l) => `<a href="${esc(l.href)}" ${l.href.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"'}>${icon(l.label)}<span class="k">${esc(l.label)}</span><span class="v">${esc(l.value)}</span></a>`).join('')}
          <a href="${person.pdf.href}" download><span class="k">${esc(person.pdf.label)}</span><span class="v">Download · ${esc(person.pdf.size)}</span></a></div>
        <nav class="pf-nav foot" aria-label="Portfolio sections">${nav.map((s) => `<a href="#/projects/${s.id}">${esc(s.title)}</a>`).join('')}</nav>
        <div class="pf-foot"><span>© ${esc(person.name)} · ${esc(person.role)}</span>${state.worldError ? '' : '<button type="button" data-go="explore">Drive through the work in 3D</button>'}</div>
        <p class="pf-credits">3D scene: sky, textures, rocks, plants, lanterns, the ship and buoys from <a href="https://polyhaven.com" target="_blank" rel="noopener">Poly Haven</a> (CC0).
          <a href="https://sketchfab.com/3d-models/coconut-palm-26e787f2ff2e4c0fb004c3b0210805a3" target="_blank" rel="noopener">Coconut Palm</a> and
          <a href="https://sketchfab.com/3d-models/curly-palm-00f2b57dd0e844edbeb116034fa471ec" target="_blank" rel="noopener">Curly Palm</a> by evolveduk,
          all <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, optimised for the web.
          The car: Ferrari 458 Italia model by vicent091036, from the <a href="https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf" target="_blank" rel="noopener">three.js examples</a>, repainted.</p>
      </div>
    </footer>`;
  portfolioMotion(main);
}

// Scrolling the 2D portfolio: blocks rise into place as they come into view, and each section's
// background (pinned behind it for its whole length) drifts slowly as you read through it.
let motionDone = null;
function portfolioMotion(main) {
  motionDone?.();
  const blocks = main.querySelectorAll('.rv');
  if (reducedMotion || !('IntersectionObserver' in window)) { blocks.forEach((b) => b.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { root: main, rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  blocks.forEach((b) => io.observe(b));
  const bgs = [...main.querySelectorAll('.pf-sec-bg')];
  const secs = [...main.querySelectorAll('.pf-sec')];
  const header = main.querySelector('.pf-header');
  let queued = false;
  const drift = () => {
    queued = false;
    const h = main.clientHeight;
    // once a section's heading block has scrolled away, its slim bar takes over the top bar
    const cur = secs.find((s) => s.querySelector('.pf-sec-head').getBoundingClientRect().bottom < 70 && s.getBoundingClientRect().bottom > 70);
    for (const s of secs) {
      const bar = s.querySelector('.pf-sec-bar');
      bar.classList.toggle('on', s === cur);
      if (s !== cur) continue;
      const read = [...s.querySelectorAll('.pf-entry')].filter((e) => e.getBoundingClientRect().top < 160).pop();
      bar.querySelectorAll('[data-entry]').forEach((a) => a.classList.toggle('here', a.dataset.entry === read?.id));
    }
    header.classList.toggle('away', !!cur);
    for (const bg of bgs) {
      const r = bg.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) continue;
      bg.style.setProperty('--p', Math.min(1, Math.max(0, (h - r.top) / (r.height + h))).toFixed(3));
    }
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(drift); } };
  main.addEventListener('scroll', onScroll, { passive: true });
  drift();
  motionDone = () => { io.disconnect(); main.removeEventListener('scroll', onScroll); };
}

$('#portfolio').addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) {
    const art = open.closest('[data-project]');
    const p = projectById(art.dataset.project);
    const list = items(p);
    viewer.open(list, Math.max(0, list.findIndex((i) => i.id === open.dataset.open)));
    return;
  }
  if (e.target.closest('[data-top]')) { $('#portfolio').scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); return; }
  const go = e.target.closest('[data-go]')?.dataset.go;
  if (go === 'intro') location.hash = '';
  if (go === 'explore') location.hash = '#/explore';
});

/* ------------------------------------------------------------------ */
/* Panel (3D mode)                                                      */
/* ------------------------------------------------------------------ */

const panel = $('#panel');

function projectPanel(p) {
  const i = projects.indexOf(p);
  const prev = projects[i - 1];
  const next = projects[i + 1];
  const [first, ...rest] = p.intro;
  return `
    <button class="panel-close" type="button" aria-label="Close">×</button>
    <p class="eyebrow">${p.number} / ${String(projects.length).padStart(2, '0')} — ${esc(p.category)}</p>
    <h2 class="project-title" id="panel-title">${esc(p.title)}</h2>
    <p class="meta">${esc(p.type)} · ${esc(p.location)}</p>
    <div class="intro">
      <p>${esc(first)}</p>
      ${rest.length ? `<div class="more" hidden>${rest.map((t) => `<p>${esc(t)}</p>`).join('')}</div><button class="more-btn" type="button">Read more</button>` : ''}
    </div>
    ${p.repos ? `<h3 class="eyebrow panel-section-title">Code on GitHub</h3><div class="contact-links">${repoLinks(p)}</div>` : ''}
    ${p.sections.map((s) => `
      <h3 class="eyebrow panel-section-title">${esc(s.title || 'Visuals & results')}</h3>
      <div class="thumbs">${s.items.map((it) => `
        <button class="thumb ${it.kind}" type="button" data-open="${it.id}">
          <span class="frame"><img src="${img(it.id)}" alt="" loading="lazy">${it.kind !== 'render' ? `<span class="badge">${it.kind === 'board' ? 'Metrics' : 'Diagram'}</span>` : ''}</span>
          <span class="cap">${esc(it.caption)}</span>
        </button>`).join('')}
      </div>`).join('')}
    <div class="panel-nav">
      ${prev ? `<button type="button" data-goto="${prev.id}">← Previous<small>${esc(prev.title)}</small></button>` : '<span></span>'}
      ${next ? `<button type="button" data-goto="${next.id}">Next →<small>${esc(next.title)}</small></button>` : `<button type="button" data-goto="pier">Next →<small>About & contact</small></button>`}
    </div>`;
}

function aboutPanel() {
  const [first, ...rest] = person.about;
  return `
    <button class="panel-close" type="button" aria-label="Close">×</button>
    <p class="eyebrow">The pier — About</p>
    <h2 class="project-title" id="panel-title">${esc(person.name)}</h2>
    <p class="meta">${esc(person.role)}</p>
    <div class="intro">
      <img class="about-portrait" src="${img(person.portrait)}" alt="Portrait of ${esc(person.name)}">
      <p>${esc(first)}</p>
      <div class="more" hidden>${rest.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      <button class="more-btn" type="button">Read more</button>
    </div>
    <h3 class="eyebrow panel-section-title" style="clear:both">Education & experience</h3>
    <ul class="about-list">
      ${[...person.education.slice(0, 1), ...person.experience].map((r) => `<li><span class="yr">${esc(r.years)}</span>${esc(r.title)} — ${esc(r.place)}</li>`).join('')}
    </ul>
    <h3 class="eyebrow panel-section-title">Contact</h3>
    <div class="contact-links">${contactLinks('list')}</div>
    <p class="signoff">${esc(person.signoff)}</p>
    <div class="panel-nav">
      <button type="button" data-goto="${projects[projects.length - 1].id}">← Previous<small>${esc(projects[projects.length - 1].title)}</small></button>
      <button type="button" data-go="portfolio">Full portfolio →<small>All projects on one page</small></button>
    </div>`;
}

function openPanel(kind, id) {
  state.panel = { kind, id };
  panel.innerHTML = kind === 'project' ? projectPanel(projectById(id)) : aboutPanel();
  panel.hidden = false;
  panel.scrollTop = 0;
  overview.classList.remove('show');
  hideFinale();
  state.world?.setInputEnabled(false); // the wheel scrolls the sheet, not the journey
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
  panel.querySelector('.panel-close').focus({ preventScroll: true });
}

function closePanel() {
  if (!state.panel) return;
  state.panel = null;
  panel.classList.remove('open');
  setTimeout(() => { if (!state.panel) panel.hidden = true; }, 560);
  state.world?.setInputEnabled(true);
  if (state.near) onNear(state.near);
}

panel.addEventListener('click', (e) => {
  if (e.target.closest('.panel-close')) return closePanel();
  const more = e.target.closest('.more-btn');
  if (more) {
    const box = more.previousElementSibling;
    box.hidden = !box.hidden;
    more.textContent = box.hidden ? 'Read more' : 'Read less';
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open && state.panel?.kind === 'project') {
    const list = items(projectById(state.panel.id));
    viewer.open(list, list.findIndex((i) => i.id === open.dataset.open));
    return;
  }
  const to = e.target.closest('[data-goto]')?.dataset.goto;
  if (to) {
    if (state.panel?.kind === 'project' && projectById(to) && stopOf(to) === stopOf(state.panel.id)) return openPanel('project', to);
    closePanel();
    return travelTo(to);
  }
  if (e.target.closest('[data-go="portfolio"]')) location.hash = '#/projects';
});

/* ------------------------------------------------------------------ */
/* Overview card: appears as the buggy arrives at a stop                */
/* ------------------------------------------------------------------ */

const overview = $('#overview');

const MODEL_STOP = '--model';  // a project's 3D building stop is "<project id>--model"

function overviewHtml(id) {
  if (groupById(id)) return groupHtml(groupById(id));
  if (id.endsWith(MODEL_STOP)) return modelHtml(projectById(id.slice(0, -MODEL_STOP.length)));
  const p = projectById(id);
  const all = items(p);
  const strip = [p.hero, ...(p.walls || [])].slice(0, 3);
  return `
    <div class="ov-head"><span class="ov-num">${p.number}</span><h2 class="project-title">${esc(p.title)}</h2></div>
    <p class="meta">${esc(p.type)} · ${esc(when(p))}</p>
    <div class="ov-strip">${strip.map((sid) => `<button type="button" data-open="${sid}" aria-label="Open ${esc(all.find((i) => i.id === sid)?.caption || '')}"><img src="${imgThumb(sid)}" alt=""></button>`).join('')}</div>
    <div class="ov-actions"><button class="btn btn-primary btn-pulse" type="button" data-detail="${p.id}"><i class="live-dot" aria-hidden="true"></i>Read more</button>${p.repos ? `<a class="btn btn-ghost ov-code" href="${esc(p.repos[0].href)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}</div>`;
}

// A group stop: its buildings stand on both sides of the road; a card for each opens it.
function groupHtml(g) {
  const members = g.members.map(projectById);
  return `
    <div class="ov-head"><span class="ov-num">${g.range}</span><h2 class="project-title">${esc(g.title)}</h2></div>
    <div class="ov-members">${members.map((p) => `
      <button type="button" data-detail="${p.id}">
        <img src="${imgThumb(p.hero)}" alt="">
        <span class="ov-num sm">${p.number}</span>
        <span class="t">${esc(p.title)}</span>
      </button>`).join('')}
    </div>`;
}

// Her SketchUp building, as its own stop: the original file opens in SketchUp. A local file
// downloads (then opens in SketchUp); a link elsewhere (Google Drive) opens in a new tab.
function modelHtml(p) {
  const external = /^https?:/.test(p.skp.href);
  return `
    <p class="eyebrow">${p.number} — 3D model</p>
    <h2 class="project-title">${esc(p.title)}</h2>
    <p class="meta">${esc(p.type)} · modelled in SketchUp</p>
    <p class="summary">The building as modelled. Open the original SketchUp file to walk through every space.</p>
    <div class="ov-actions">
      <a class="btn btn-primary btn-pulse" href="${esc(p.skp.href)}" ${external ? 'target="_blank" rel="noopener"' : 'download'}>Open SketchUp file · .skp ${esc(p.skp.size)}</a>
      <button class="btn btn-ghost" type="button" data-detail="${p.id}">Photos & drawings</button>
    </div>`;
}

let overviewTimer = 0;
// The overview waits for the image's light sweep to pass, then fades in.
function showOverview(id, delay = 650) {
  clearTimeout(overviewTimer);
  if (state.panel) return;
  overviewTimer = setTimeout(() => {
    if (state.near !== id || state.panel) return;
    overview.innerHTML = overviewHtml(id);
    overview.classList.toggle('group', !!groupById(id));
    overview.hidden = false;
    overview.classList.remove('show');
    void overview.offsetWidth; // restart the entrance
    overview.classList.add('show');
  }, reducedMotion ? 0 : delay);
}

function hideOverview() {
  clearTimeout(overviewTimer);
  overview.classList.remove('show');
}

overview.addEventListener('click', (e) => {
  const d = e.target.closest('[data-detail]')?.dataset.detail;
  if (d) return openPanel('project', d);
  const open = e.target.closest('[data-open]');
  if (open && state.near && state.near !== 'pier' && projectById(state.near)) {
    const list = items(projectById(state.near));
    viewer.open(list, Math.max(0, list.findIndex((i) => i.id === open.dataset.open)));
  }
});

/* ------------------------------------------------------------------ */
/* Finale at the pier: who this is, front and centre                    */
/* ------------------------------------------------------------------ */

const finale = $('#finale');
const firstSentences = (text, n) => text.split(/(?<=\.)\s+/).slice(0, n).join(' ');

function finaleHtml() {
  const c = person.contact;
  return `
    <div class="finale-card">
      <div class="finale-bg"></div>
      <div class="finale-edge" aria-hidden="true"></div>
      <div class="finale-glare" aria-hidden="true"></div>
      <div class="finale-content">
      <img class="finale-portrait" src="${img(person.portrait)}" alt="Portrait of ${esc(person.name)}">
      <h2 id="finale-title">${esc(person.name)}</h2>
      <p class="meta">${esc(person.role)}</p>
      <div class="finale-contact">
        ${c.links.filter((l) => l.label !== 'Institute email').map((l) => `<a href="${esc(l.href)}" ${l.href.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"'}>${icon(l.label)}<span>${esc(l.label)}</span></a>`).join('')}
      </div>
      <div class="finale-actions">
        <a class="btn btn-primary" href="${person.pdf.href}" download>Download ${esc(person.pdf.label)}</a>
        <button class="btn btn-ghost" type="button" data-finale="about">About ${esc(person.first)}</button>
      </div>
      </div>
    </div>`;
}

// The card leans towards the pointer; the glare follows it.
let tiltRaf = 0;
finale.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || reducedMotion) return;
  const card = finale.querySelector('.finale-card');
  if (!card) return;
  cancelAnimationFrame(tiltRaf);
  tiltRaf = requestAnimationFrame(() => {
    const r = card.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const cx = Math.max(-1.4, Math.min(1.4, dx)), cy = Math.max(-1.4, Math.min(1.4, dy));
    finale.style.setProperty('--ry', (cx * 11).toFixed(2));
    finale.style.setProperty('--rx', (-cy * 8).toFixed(2));
    card.style.setProperty('--gx', `${((dx + 1) / 2) * 100}%`);
    card.style.setProperty('--gy', `${((dy + 1) / 2) * 100}%`);
  });
});
finale.addEventListener('pointerleave', () => {
  finale.style.setProperty('--ry', '0');
  finale.style.setProperty('--rx', '0');
});

// The opening volley of fireworks goes up over the sea first; then the card.
let finaleTimer = 0;
function showFinale() {
  clearTimeout(finaleTimer);
  if (state.panel) return;
  if (!finale.innerHTML) finale.innerHTML = finaleHtml();
  finale.hidden = false;
  finaleTimer = setTimeout(() => finale.classList.add('show'), reducedMotion ? 0 : 2900);
}
function hideFinale() {
  clearTimeout(finaleTimer);
  finale.classList.remove('show');
}
finale.addEventListener('click', (e) => {
  const act = e.target.closest('[data-finale]')?.dataset.finale;
  if (act === 'about') openPanel('about', 'pier');
  if (act === 'projects') location.hash = '#/projects';
});

function onNear(id) {
  state.near = id;
  railTicks.forEach((b) => b.classList.toggle('active', b.dataset.stop === id));
  if (id === 'pier') { hideOverview(); showFinale(); }
  else if (id) { hideFinale(); showOverview(id); }
  else { hideOverview(); hideFinale(); }
}

/* ------------------------------------------------------------------ */
/* Projects overlay + journey rail (3D mode)                            */
/* ------------------------------------------------------------------ */

const overlay = $('#projects-overlay');
overlay.innerHTML = `
  <div class="glass overlay-card">
    <div class="overlay-head"><h2>Projects along the shore</h2><button class="panel-close" type="button" aria-label="Close" style="float:none;margin:0;position:static">×</button></div>
    <div class="overlay-grid">
      ${projects.map((p) => `<button class="overlay-item" type="button" data-goto="${p.id}"><img src="${imgThumb(p.hero)}" alt="" loading="lazy"><span><span class="eyebrow">${p.number}</span><span class="project-title" style="display:block">${esc(p.title)}</span><span class="t">${esc(p.type)} · ${esc(p.location)}</span></span></button>`).join('')}
      <button class="overlay-item wide" type="button" data-goto="pier"><span><span class="eyebrow">The pier</span><span class="project-title" style="display:block">About & Contact</span></span></button>
    </div>
  </div>`;
const openOverlay = () => { overlay.hidden = false; state.world?.setInputEnabled(false); overlay.querySelector('[data-goto]').focus(); };
const closeOverlay = () => { overlay.hidden = true; if (!state.panel) state.world?.setInputEnabled(true); };
overlay.addEventListener('click', (e) => {
  const to = e.target.closest('[data-goto]')?.dataset.goto;
  if (to) { closeOverlay(); return travelTo(to); }
  if (e.target === overlay || e.target.closest('.panel-close')) closeOverlay();
});

// The rail is a slim scroll track: stops are ticks at their real distance, the red dot is the buggy.
const rail = $('#rail');
const railTrack = rail.querySelector('.rail-track');
const railDot = rail.querySelector('.rail-dot');
const railFill = rail.querySelector('.rail-fill');
const stopsList = [['start', '—', 'Start'], ...projects.flatMap((p) => {
  if (!p.group) return [[p.id, p.number, p.title]];
  const g = groupById(p.group);
  return g.members[0] === p.id ? [[g.id, g.range.split(' ')[0], `${g.title} · ${g.range}`]] : [];
}), ['pier', '∞', 'About & contact']];
railTrack.insertAdjacentHTML('beforeend', stopsList.map(([id, num, title]) => `<button class="rail-tick" type="button" data-stop="${id}" aria-label="${esc(title)}"><span class="num">${num}</span><span class="lbl">${esc(title)}</span></button>`).join(''));
let railTicks = [...rail.querySelectorAll('.rail-tick')];
rail.addEventListener('click', (e) => {
  const id = e.target.closest('[data-stop]')?.dataset.stop;
  if (id) travelTo(id);
});

// Ticks sit at each stop's real distance. Her 3D buildings (only on capable machines) get a
// smaller tick of their own, added once the beach knows where they are.
function placeRailTicks() {
  const w = state.world;
  if (!w) return;
  for (const st of w.stops.filter((x) => x.kind === 'model')) {
    if (rail.querySelector(`[data-stop="${st.id}"]`)) continue;
    const p = projectById(st.id.slice(0, -MODEL_STOP.length));
    railTrack.insertAdjacentHTML('beforeend', `<button class="rail-tick minor" type="button" data-stop="${st.id}" aria-label="${esc(p.title)}: 3D model"><span class="lbl">3D model</span></button>`);
  }
  railTicks = [...rail.querySelectorAll('.rail-tick')];
  const at = Object.fromEntries([['start', 0], ...w.stops.map((st) => [st.id, st.s / w.length])]);
  railTicks.forEach((b) => { const t = at[b.dataset.stop] ?? 0; b.style.top = `${t * 100}%`; b.dataset.t = t; });
}

function setRouteProgress(t) {
  const p = Math.min(1, Math.max(0, t)) * 100;
  railDot.style.top = `${p}%`;
  railFill.style.height = `${p}%`;
  railTicks.forEach((b) => b.classList.toggle('passed', Number(b.dataset.t) <= t + 0.002));
}

async function travelTo(id) {
  const w = state.world;
  if (!w) return;
  id = stopOf(id);
  hideOverview();
  hideFinale();
  body.classList.add('hint-done');
  if (w.distanceTo(id) < 160 || reducedMotion) {
    w.goTo(id, reducedMotion);
    return;
  }
  const fade = $('#fade');
  fade.classList.add('on');
  await new Promise((r) => setTimeout(r, 320));
  w.goTo(id, true);
  setTimeout(() => fade.classList.remove('on'), 80);
}

/* ------------------------------------------------------------------ */
/* Loading screen                                                       */
/* ------------------------------------------------------------------ */

// A wall of hundreds of small pieces of the work fills in as the beach loads (see mosaic.js).
const mosaic = createMosaic($('#pl-mosaic'), { reducedMotion });
mosaic.start();

// a ring cursor; the enter button leans towards the pointer
const cursor = $('#pl-cursor');
const enterBtn = $('#btn-explore');
let px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py;
window.addEventListener('pointermove', (e) => {
  px = e.clientX;
  py = e.clientY;
  if (state.mode === 'intro') cursor.style.setProperty('--dx', '0px');
});
(function loop() {
  if (state.mode === 'intro') {
    const k = reducedMotion ? 1 : 0.18;
    cx += (px - cx) * k;
    cy += (py - cy) * k;
    cursor.style.setProperty('--cx', `${cx}px`);
    cursor.style.setProperty('--cy', `${cy}px`);
    cursor.style.setProperty('--dx', `${px - cx}px`);
    cursor.style.setProperty('--dy', `${py - cy}px`);
    if (!reducedMotion && !body.classList.contains('leaving')) {
      const r = enterBtn.getBoundingClientRect();
      const bx = px - (r.left + r.width / 2) + Number.parseFloat(enterBtn.style.getPropertyValue('--bx') || 0);
      const by = py - (r.top + r.height / 2) + Number.parseFloat(enterBtn.style.getPropertyValue('--by') || 0);
      const near = Math.hypot(bx * 0.6, by) < 110 && !enterBtn.disabled;
      enterBtn.style.setProperty('--bx', `${near ? bx * 0.16 : 0}px`);
      enterBtn.style.setProperty('--by', `${near ? by * 0.22 : 0}px`);
      cursor.classList.toggle('big', near);
    }
  }
  requestAnimationFrame(loop);
})();

// progress: the big counter eases towards the real value; status lines rotate while it loads
const loadNum = $('#load-num');
const loadLabel = $('#loader-label');
let shown = 0, actual = 0;
(function count() {
  shown += (actual - shown) * 0.06;
  if (actual >= 1 && shown > 0.995) shown = 1;
  loadNum.textContent = Math.round(shown * 100);
  if (shown < 1 && !state.worldError) requestAnimationFrame(count);
  else if (shown >= 1) readyToBegin();
})();

function readyToBegin() {
  if (!state.world) return setTimeout(readyToBegin, 100);
  exploreBtn.disabled = false;
  $('#btn-explore-label').textContent = 'Start the drive';
  loadLabel.textContent = 'Ready · click anywhere';
  loadLabel.style.opacity = 1;
  mosaic.ready();
  placeRailTicks();
  body.classList.add('world-ready');
}

/* ------------------------------------------------------------------ */
/* World + audio                                                        */
/* ------------------------------------------------------------------ */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

const exploreBtn = $('#btn-explore');

function worldFailed(err, message = '3D isn’t available on this device — showing the portfolio instead.') {
  console.warn('[world]', err);
  state.worldError = err || new Error('unavailable');
  body.classList.add('no-world');
  exploreBtn.hidden = true;
  $('#intro-hint').textContent = '3D isn’t supported here';
  loadLabel.textContent = 'The full portfolio is one click away';
  if (state.mode === 'world' || state.wantsExplore) {
    notice(message);
    location.hash = '#/projects';
  }
  if (!$('#portfolio').hidden) renderPortfolio();
}

function loadWorld() {
  if (state.worldPromise) return state.worldPromise;
  if (!hasWebGL()) {
    worldFailed(new Error('no WebGL2'));
    return (state.worldPromise = Promise.reject(state.worldError));
  }
  state.worldPromise = import('./world/world.js')
    .then((m) => m.createWorld({
      canvas: $('#world'),
      projects,
      reducedMotion,
      isTouch,
      onProgress: (f) => { actual = Math.max(actual, f); mosaic.setProgress(f); },
      onNear,
      onPick: (id) => (id.startsWith('link:') ? window.open(id.slice(5), id.startsWith('link:mailto:') ? '_self' : '_blank', 'noopener') : openPanel('project', id)),
      onDrive: ({ t, speed }) => { setRouteProgress(t); state.audio?.setEngine(speed); },
      onFirstScroll: () => body.classList.add('hint-done'),
      onFreeView: (free) => body.classList.toggle('free-view', free),
      onFirework: (kind, distance, flight) => state.audio?.firework(kind, distance, flight),
      onFail: (err) => worldFailed(err, 'The 3D view stopped working — here is the portfolio instead.'),
    }))
    .then((w) => {
      state.world = w;
      w.setMode(state.mode === 'world' ? 'drive' : state.mode === 'intro' ? 'intro' : 'paused');
      return w;
    })
    .catch((err) => { worldFailed(err); throw err; });
  state.worldPromise.catch(() => {});
  return state.worldPromise;
}

async function startAudio() {
  if (state.audio) return state.audio.resume();
  try {
    const { createAudio } = await import('./audio.js');
    state.audio = createAudio();
    syncSoundButton();
  } catch (err) { console.warn('[audio]', err); }
}

function syncSoundButton() {
  $('#hud-sound').setAttribute('aria-pressed', String(!(state.audio?.muted)));
  $('#hud-sound').setAttribute('aria-label', state.audio?.muted ? 'Turn sound on' : 'Turn sound off');
}

/* ------------------------------------------------------------------ */
/* Modes + routing                                                      */
/* ------------------------------------------------------------------ */

function setMode(mode) {
  const prev = state.mode;
  state.mode = mode;
  if (prev === 'intro' && mode === 'world' && !reducedMotion) {
    body.classList.add('leaving');
    setTimeout(() => body.classList.remove('leaving'), 2200);
  }
  if (mode === 'intro') mosaic.start();
  else if (prev === 'intro' && mode === 'world') mosaic.leave(); // stops once the tiles have fallen
  else mosaic.stop();
  body.classList.remove('mode-intro', 'mode-world', 'mode-portfolio');
  body.classList.add(`mode-${mode}`);
  $('#portfolio').hidden = mode !== 'portfolio';
  if (mode !== 'world') { closePanel(); closeOverlay(); hideOverview(); hideFinale(); }
  if (mode === 'portfolio') state.audio?.suspend();
  state.world?.setMode(mode === 'world' ? 'drive' : mode === 'intro' ? 'intro' : 'paused');
}

async function route_() {
  const h = location.hash;
  if (h.startsWith('#/projects')) {
    if ($('#portfolio').innerHTML === '' || state.worldError) renderPortfolio();
    setMode('portfolio');
    const target = h.split('/')[2];
    const el = target ? document.getElementById(target) : null;
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }));
    else $('#portfolio').scrollTop = 0;
    return;
  }
  if (h === '#/explore') {
    state.wantsExplore = true;
    if (state.mode !== 'world') setMode('intro');
    try { await loadWorld(); } catch { return; }
    if (location.hash !== '#/explore') return;
    setMode('world');
    state.audio?.resume();
    return;
  }
  setMode('intro');
  if (!state.worldError) loadWorld();
}

window.addEventListener('hashchange', route_);

function beginJourney() {
  if (guide.hidden) return openGuide(true); // the controls first, then the beach
  closeGuide();
  startAudio(); // needs this click (browsers only allow sound after a user gesture)
  if (location.hash === '#/explore') route_();
  else location.hash = '#/explore';
}

/* ------------------------------------------------------------------ */
/* How to explore: every control, before entering and on demand          */
/* ------------------------------------------------------------------ */

const guide = $('#guide');
const GUIDE = isTouch ? [
  [['Swipe up'], 'Drive forward', 'Swipe down to go back'],
  [['Tap', 'a building'], 'Read more', 'Opens its full story and images'],
  [['Tap', 'the track'], 'Jump to a stop', 'The gold track on the right: 01, 02, 03 …'],
  [['Drag'], 'Look around', 'Swing the view, up to the sky'],
  [['Projects'], 'All projects', 'The list, top right'],
  [['Portfolio view'], 'Read it as a page', 'The same work, without the drive'],
] : [
  [['↑', 'Space'], 'Drive forward', 'Drives on to the next building'],
  [['↓'], 'Drive back', 'Back to the one before'],
  [['Drag'], 'Look around', 'Hold the mouse and move it: sideways to turn round the car, up to see the sky'],
  [['Scroll'], 'Zoom', 'Scroll over anything to zoom in on it. Or the + and − keys'],
  [['Click'], 'Read more', 'Click a building, a poster or "Read more" for the full story'],
  [['01 · 02 · 03'], 'Jump to a stop', 'Click a number on the gold track on the right'],
  [['Esc'], 'Close', 'Closes a panel or the projects list'],
];
function guideHtml(entering) {
  return `<div class="guide-card">
    <p class="guide-kicker">Before you drive</p>
    <h2 id="guide-title">How to explore the beach</h2>
    <p class="guide-sub">A car drives along the shore and stops at each building: education, internships, projects, competitions, then contact at the pier.</p>
    <ul class="guide-list">${GUIDE.map(([keys, what, note]) => `<li><span class="keys">${keys.map((k) => k === '+' ? '<b>+</b>' : `<kbd>${esc(k)}</kbd>`).join('')}</span><span class="what"><strong>${esc(what)}</strong><small>${esc(note)}</small></span></li>`).join('')}</ul>
    <p class="guide-menu"><strong>Top menu</strong> Controls · Projects (every stop) · About · Sound · Portfolio view</p>
    <div class="guide-actions"><button class="btn guide-go" type="button" data-guide="go">${entering ? 'Enter the beach' : 'Back to the drive'}</button>${!isTouch ? '<span class="guide-tip">Press <kbd>?</kbd> any time to see this again</span>' : ''}</div>
  </div>`;
}
let guideEntering = false;
function openGuide(entering = false) {
  guideEntering = entering;
  guide.innerHTML = guideHtml(entering);
  guide.hidden = false;
  state.world?.setInputEnabled(false);
  requestAnimationFrame(() => guide.classList.add('show'));
  guide.querySelector('[data-guide="go"]').focus();
}
function closeGuide() {
  guide.classList.remove('show');
  guide.hidden = true;
  if (state.mode === 'world' && !state.panel && overlay.hidden) state.world?.setInputEnabled(true);
}
guide.addEventListener('click', (e) => {
  if (e.target.closest('[data-guide="go"]')) { if (guideEntering) beginJourney(); else closeGuide(); return; }
  if (e.target === guide && !guideEntering) closeGuide();
});
window.addEventListener('keydown', (e) => {
  if (!guide.hidden && e.key === 'Escape') { e.stopImmediatePropagation(); if (!guideEntering) closeGuide(); return; }
  if (!guide.hidden && e.key === 'Enter' && guideEntering && !e.target.closest?.('a, button')) { e.preventDefault(); e.stopImmediatePropagation(); beginJourney(); return; }
  if (e.key === '?' && state.mode === 'world' && guide.hidden) openGuide(false);
}, true);
exploreBtn.addEventListener('click', beginJourney);
// once the beach has loaded, a click anywhere on the intro (or Enter) begins too
$('#intro').addEventListener('click', (e) => {
  if (state.mode === 'intro' && !exploreBtn.disabled && !e.target.closest('a, button')) beginJourney();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.mode === 'intro' && !exploreBtn.disabled && !e.target.closest?.('a, button, input')) beginJourney();
});
$('#btn-projects').addEventListener('click', () => { location.hash = '#/projects'; });
$('#hud-home').addEventListener('click', () => travelTo('start'));
$('#btn-drive').addEventListener('click', () => travelTo(projects[0].id));
$('#btn-reset-view').addEventListener('click', () => state.world?.resetView());
$('#hud-projects').addEventListener('click', openOverlay);
$('#hud-guide').addEventListener('click', () => openGuide(false));
$('#hud-about').addEventListener('click', () => travelTo('pier'));
$('#hud-portfolio').addEventListener('click', () => {
  const id = state.panel?.kind === 'project' ? state.panel.id : state.near && state.near !== 'pier' ? groupById(state.near)?.members[0] ?? state.near.replace(MODEL_STOP, '') : null;
  location.hash = id ? `#/projects/${id}` : '#/projects';
});
$('#hud-sound').addEventListener('click', () => {
  if (!state.audio) return startAudio();
  state.audio.setMuted(!state.audio.muted);
  syncSoundButton();
});

window.addEventListener('keydown', (e) => {
  if (state.mode !== 'world' || e.key !== 'Escape') return;
  if (!overlay.hidden) closeOverlay();
  else if (state.panel) closePanel();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) state.audio?.suspend();
  else if (state.mode === 'world') state.audio?.resume();
});

/* ------------------------------------------------------------------ */

function notice(text) {
  const n = document.createElement('div');
  n.className = 'notice';
  n.setAttribute('role', 'status');
  n.textContent = text;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 5200);
}

route_();
