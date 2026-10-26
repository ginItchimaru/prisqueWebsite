/*
  Events timeline, fed by a published Google Sheet.

  Setup (once):
    1. Google Sheet with a header row:
         Datum | Bis | Uhrzeit | Titel | Ort | Beschreibung | Link
       Only "Datum" and "Titel" are required. "Bis" is the end date for
       multi-day events. Dates as DD.MM.YYYY (or YYYY-MM-DD).
       In "Beschreibung", \n starts a new line.
    2. File -> Settings -> Locale: Germany/Switzerland, so date cells
       export as DD.MM.YYYY.
    3. File -> Share -> Publish to web -> the sheet tab -> "CSV" -> Publish,
       and paste the URL below.

  Past events are hidden automatically. Edits can take up to ~5 minutes to
  show: Google's servers update the published CSV with a delay, and until
  then different requests may return old and new versions.
*/
import { parseCSV } from './csv';

export const EVENTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCBce9HuaZwOIr2eIFQWjbn6z_gPrMJ4ug0x095QG15kmBlKCL5fVbKFJiVCS55nqvGH-UaqFHfOV4/pub?output=csv';

const COLUMNS = {
  date: ['datum', 'date'],
  end: ['bis', 'ende', 'end'],
  time: ['uhrzeit', 'zeit', 'time'],
  title: ['titel', 'title'],
  location: ['ort', 'location'],
  description: ['beschreibung', 'description'],
  link: ['link', 'url'],
};

const MESSAGES = {
  loading: 'Events werden geladen …',
  empty: 'Aktuell sind keine Events geplant. Schau bald wieder vorbei!',
  error: 'Die Events konnten gerade nicht geladen werden. Bitte versuche es später noch einmal.',
};

const LOCALE = 'de-CH';
const fmtDay = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const fmtRange = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth = new Intl.DateTimeFormat(LOCALE, { month: 'short' });

const parseDate = (value = '') => {
  const v = value.trim();
  let m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  let y, mo, d;
  if (m) {
    [, d, mo, y] = m;
  } else if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    [, y, mo, d] = m;
  } else {
    return null;
  }
  const date = new Date(+y, +mo - 1, +d);
  // rejects overflow like 31.02.
  return date.getMonth() === +mo - 1 ? date : null;
};

// only allow real web/mail links from the sheet
const safeLink = (value = '') => {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const toEvents = (rows) => {
  const [header = [], ...body] = rows;
  const keys = header.map(h => h.trim().toLowerCase());
  const index = Object.fromEntries(
    Object.entries(COLUMNS).map(([name, aliases]) => [
      name,
      keys.findIndex(k => aliases.includes(k)),
    ])
  );
  const cell = (row, name) => (index[name] >= 0 ? (row[index[name]] || '').trim() : '');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return body
    .map((row, i) => {
      const start = parseDate(cell(row, 'date'));
      const title = cell(row, 'title');
      if (!start || !title) {
        if (row.some(c => c.trim())) {
          console.warn(`Events: Zeile ${i + 2} übersprungen (Datum oder Titel fehlt/ungültig)`);
        }
        return null;
      }
      const endDate = parseDate(cell(row, 'end'));
      const end = endDate && endDate > start ? endDate : null;
      return {
        start,
        end,
        title,
        time: cell(row, 'time'),
        location: cell(row, 'location'),
        // a typed "\n" becomes a line break (real line breaks in the cell work too)
        description: cell(row, 'description').replace(/\s*\\n\s*/g, '\n'),
        link: safeLink(cell(row, 'link')),
      };
    })
    .filter(e => e && (e.end || e.start) >= today)
    .sort((a, b) => a.start - b.start);
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const isoDate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const renderEvent = (event, i) => {
  const item = el('li', `timeline-item ${i % 2 ? 'timeline-item--right' : 'timeline-item--left'}`);
  if (i === 0) item.classList.add('is-next');

  const marker = el('time', 'timeline-marker');
  marker.dateTime = isoDate(event.start);
  marker.append(
    el('span', 'timeline-day', String(event.start.getDate()).padStart(2, '0')),
    el('span', 'timeline-month', fmtMonth.format(event.start).replace('.', ''))
  );

  const card = el('article', 'timeline-card');
  if (i === 0) card.append(el('span', 'timeline-badge', 'Nächstens'));

  const when = event.end ? fmtRange.formatRange(event.start, event.end) : fmtDay.format(event.start);
  const meta = el('div', 'timeline-meta');
  meta.append(el('p', 'timeline-when', [when, event.time].filter(Boolean).join(' · ')));
  // usually a full address, so it gets its own line
  if (event.location) meta.append(el('p', 'timeline-location', event.location));
  card.append(meta, el('h3', 'timeline-title', event.title));

  if (event.description) {
    card.append(el('p', 'timeline-description', event.description));
  }
  if (event.link) {
    const link = el('a', 'timeline-link btn', 'Mehr erfahren');
    link.href = event.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    card.append(link);
  }

  item.append(marker, card);
  return item;
};

const render = (list, events) => {
  let year = events[0].start.getFullYear();
  const items = [];
  events.forEach((event, i) => {
    const eventYear = event.start.getFullYear();
    if (eventYear !== year) {
      year = eventYear;
      items.push(el('li', 'timeline-year', String(year)));
    }
    items.push(renderEvent(event, i));
  });
  list.replaceChildren(...items);
};

// small floating buttons that jump to the start / end of a long timeline
const JUMP_MIN_EVENTS = 4;

const jumpButtons = (section, list, container, count) => {
  if (!container || count < JUMP_MIN_EVENTS) return;
  const startBtn = container.querySelector('.js-events-jump-start');
  const endBtn = container.querySelector('.js-events-jump-end');
  container.hidden = false;

  const state = { inSection: false, atStart: false, atEnd: false };
  const update = () => {
    startBtn.classList.toggle('is-shown', state.inSection && !state.atStart);
    endBtn.classList.toggle('is-shown', state.inSection && !state.atEnd);
  };
  const watch = (target, key, options) => {
    new IntersectionObserver(([entry]) => {
      state[key] = entry.isIntersecting;
      update();
    }, options).observe(target);
  };

  // section counts as "being scrolled" once it reaches the upper 60% of the screen
  watch(section, 'inSection', { rootMargin: '0px 0px -40% 0px' });
  // each button hides once its target is already on screen
  watch(section.querySelector('.events-header'), 'atStart');
  watch(list.lastElementChild, 'atEnd');

  const jump = block => () => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ block, behavior: smooth ? 'smooth' : 'auto' });
  };
  startBtn.addEventListener('click', jump('start'));
  endBtn.addEventListener('click', jump('end'));
};

// fade items in as they scroll into view
const reveal = (list) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  list.classList.add('timeline--animate');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  list.querySelectorAll('.timeline-item').forEach(item => observer.observe(item));
};

const events = async () => {
  const list = document.querySelector('.js-events-list');
  const status = document.querySelector('.js-events-status');
  if (!list || !status) return;

  const showStatus = (message) => {
    status.textContent = message;
    status.hidden = false;
  };

  if (!EVENTS_CSV_URL) {
    console.info('Events: EVENTS_CSV_URL ist noch nicht gesetzt (src/utils/events.js).');
    showStatus(MESSAGES.empty);
    return;
  }

  showStatus(MESSAGES.loading);
  try {
    // Google sends max-age=300; skip the browser cache so visitors never add
    // their own 5 minutes on top of Google's publish delay
    const res = await fetch(EVENTS_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const upcoming = toEvents(parseCSV(await res.text()));
    if (!upcoming.length) {
      showStatus(MESSAGES.empty);
      return;
    }
    render(list, upcoming);
    status.hidden = true;
    reveal(list);
    jumpButtons(list.closest('.events'), list, document.querySelector('.js-events-jump'), upcoming.length);
  } catch (err) {
    console.error('Events: Laden fehlgeschlagen', err);
    showStatus(MESSAGES.error);
  }
};

export default events;
