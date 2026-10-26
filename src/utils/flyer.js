/*
  Flyer gallery, fed by the "Flyer" column of the events sheet.

  In the "Flyer" column, paste the Google Drive share link of the image or
  PDF (the file must be shared as "Anyone with the link can view"). Any
  other https image URL works too. Rows without a flyer are ignored, and the
  row's "Titel" becomes the image description for screen readers.

  Flyers stay even after their event is over. The bottom row is shown first,
  so the newest flyer is always on top. Like the events, edits can take up
  to ~5 minutes to show.

  To use a separate tab instead: give it the columns Flyer | Titel, publish
  that tab as CSV and paste its URL below.
*/
import { parseCSV } from './csv';
import { EVENTS_CSV_URL } from './events';

const FLYER_CSV_URL = EVENTS_CSV_URL;

const COLUMNS = {
  // not "link": in the events sheet that column holds the event's web page
  image: ['flyer', 'bild', 'image'],
  title: ['titel', 'title'],
};

const MESSAGES = {
  loading: 'Flyer werden geladen …',
  empty: 'Aktuell sind keine Flyer vorhanden.',
  error: 'Die Flyer konnten gerade nicht geladen werden. Bitte versuche es später noch einmal.',
};

// Drive share links (…/file/d/<id>/view, …/open?id=<id>) aren't images
// themselves; Drive's thumbnail endpoint serves them (PDFs as page 1)
const driveId = (url) => {
  if (!/(^|\.)google\.com$/.test(url.hostname)) return null;
  return url.pathname.match(/\/d\/([\w-]{10,})/)?.[1] || url.searchParams.get('id');
};

// returns a function width -> image URL, or null for anything that isn't https
const imageSource = (value = '') => {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const id = driveId(url);
  if (id) {
    return width => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
  }
  return () => url.href;
};

const toFlyers = (rows) => {
  const [header = [], ...body] = rows;
  const keys = header.map(h => h.trim().toLowerCase());
  const index = Object.fromEntries(
    Object.entries(COLUMNS).map(([name, aliases]) => [
      name,
      keys.findIndex(k => aliases.includes(k)),
    ])
  );
  const cell = (row, name) => (index[name] >= 0 ? (row[index[name]] || '').trim() : '');

  return body
    .map((row, i) => {
      const value = cell(row, 'image');
      if (!value) return null;
      const src = imageSource(value);
      if (!src) {
        console.warn(`Flyer: Zeile ${i + 2} übersprungen (ungültiger Bild-Link)`);
        return null;
      }
      return { src, title: cell(row, 'title') };
    })
    .filter(Boolean)
    // newest flyers are added at the bottom of the sheet, but shown first
    .reverse();
};

const renderFlyer = (flyer, openDialog, onBroken) => {
  const item = document.createElement('li');
  item.className = 'flyer-item';

  const button = document.createElement('button');
  button.className = 'flyer-open';
  button.type = 'button';
  button.setAttribute('aria-label', flyer.title ? `${flyer.title} vergrössern` : 'Flyer vergrössern');

  const img = document.createElement('img');
  img.className = 'flyer-img';
  img.src = flyer.src(800);
  img.alt = flyer.title || 'Flyer';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('load', () => item.classList.add('is-loaded'), { once: true });
  // broken link (e.g. the Drive file isn't shared): drop it instead of showing an empty frame
  img.addEventListener('error', () => {
    console.warn(`Flyer: Bild konnte nicht geladen werden (${flyer.title || img.src})`);
    item.remove();
    onBroken();
  }, { once: true });

  button.addEventListener('click', () => openDialog(flyer));
  button.append(img);
  item.append(button);
  return item;
};

// full-size view; closes via the button, Esc or a click next to the image
const setupDialog = (dialog) => {
  if (!dialog || typeof dialog.showModal !== 'function') return null;
  const img = dialog.querySelector('.js-flyer-dialog-img');
  dialog.querySelector('.js-flyer-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => img.removeAttribute('src'));

  return (flyer) => {
    img.src = flyer.src(2000);
    img.alt = flyer.title || 'Flyer';
    dialog.showModal();
  };
};

const flyer = async () => {
  const list = document.querySelector('.js-flyer-list');
  const status = document.querySelector('.js-flyer-status');
  if (!list || !status) return;

  const showStatus = (message) => {
    status.textContent = message;
    status.hidden = false;
  };

  if (!FLYER_CSV_URL) {
    console.info('Flyer: FLYER_CSV_URL ist noch nicht gesetzt (src/utils/flyer.js).');
    showStatus(MESSAGES.empty);
    return;
  }

  showStatus(MESSAGES.loading);
  try {
    // same as the events: skip the browser cache on top of Google's delay
    const res = await fetch(FLYER_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const flyers = toFlyers(parseCSV(await res.text()));
    if (!flyers.length) {
      showStatus(MESSAGES.empty);
      return;
    }
    // without <dialog> support the image opens in a new tab instead
    const openDialog = setupDialog(document.querySelector('.js-flyer-dialog'))
      || (f => window.open(f.src(2000), '_blank', 'noopener'));
    const onBroken = () => {
      if (!list.children.length) showStatus(MESSAGES.empty);
    };
    list.replaceChildren(...flyers.map(f => renderFlyer(f, openDialog, onBroken)));
    status.hidden = true;
  } catch (err) {
    console.error('Flyer: Laden fehlgeschlagen', err);
    showStatus(MESSAGES.error);
  }
};

export default flyer;
