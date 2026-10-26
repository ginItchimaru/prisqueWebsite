# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page static website for Priska Mueller ("Prisque"), with an events timeline, two topics and a flyer gallery: **BlütenZart** and **heilSphaere**. Content on the page is in German. It is built with plain HTML, CSS and vanilla JS on Vite. There is no framework, linter or test suite.

## Commands

- `npm run dev`: start the Vite dev server
- `npm run build`: production build into `dist/`
- `npm run preview`: serve the built `dist/`

## Architecture

- **`index.html`** contains all of the page markup (header, mobile nav, hero, events, topics, products, about, flyer, contact, footer). Content is written directly in the HTML, except for the events list and the flyer images.
- **`src/main.js`** is the single entry point. It imports every stylesheet in cascade order (normalize, then general, then the files in `components/*`, with `utils.css` last) and then runs the init functions from `src/utils/`. To add a new stylesheet, import it here; `index.html` has no `<link>` tags for local CSS.
- **`src/utils/*.js`** each export one default function that queries the DOM and attaches behavior:
  - `mobile-nav.js` uses the `js-` prefixed hooks: `.js-bars` (toggle button), `.js-mobile-nav`, `.js-mobile-nav-link`. Keep these classes when restyling.
  - `dark-mode.js` is the theme toggle. Dark is the default. Light mode is the `light-mode` class on `<body>`, which overrides the CSS custom properties (see `.light-mode` in `styles/general.css`). The choice is saved in `localStorage` under the `theme` key. The script binds every `#theme-toggle` through `querySelectorAll`, because the header and the mobile nav both use that same id.
  - `events.js` fetches a published Google Sheet as CSV (`EVENTS_CSV_URL` at the top of the file) and renders it into `.js-events-list` as a timeline. Upcoming events are edited in the sheet, not in the repo. Past events are filtered out on the client. The column headers (`Datum`, `Bis`, `Uhrzeit`, `Titel`, `Ort`, `Beschreibung`, `Link`) are matched case-insensitively. Sheet content is inserted via `textContent` only, and links are limited to http(s)/mailto. While the URL is empty, the section shows the "no events" message.
  - `flyer.js` renders the `Flyer` column of the events sheet (`FLYER_CSV_URL` defaults to `EVENTS_CSV_URL`; only the events tab is published) into `.js-flyer-list` as a two-column image grid with a `<dialog>` lightbox. A cell holds a Google Drive share link (turned into a `drive.google.com/thumbnail` URL) or any https image URL, and the row's `Titel` becomes the alt text. Rows without a flyer are ignored, and flyers ignore the past-event filter. Rows are shown in reverse order, so the bottom row (the newest) comes first. Images that fail to load are removed. Don't add `link` as an image alias, because that column holds event web pages.
  - `csv.js` holds the RFC 4180 `parseCSV` shared by `events.js` and `flyer.js`.
  - `lazy-loading.js` uses an IntersectionObserver on `img.lazy`. It moves `data-src` into `src` and swaps the `.loading` class for `.loaded` (the blur transition for both lives in `styles/utils.css`).
- **`styles/general.css`** defines the design tokens on `:root`: colors `--clr-*` (the semantic ones are `--clr-soft/base/deep/vivid`, plus `--clr-light/dark`) and the type scale `--size-*`. Component CSS should use these tokens. Media queries are mobile-first with `min-width` breakpoints that follow Tailwind's: 475 / 640 / 768 / 1024 / 1280 / 1536px.
- **Vertical spacing:** the large `margin-top` that keeps the hero alone on the first screen lives on `.events` (the section right after the hero). Don't add the `.section` utility class to sections that set their own `margin-top`; `utils.css` loads last and overrides it.
- **`public/`** holds the static assets, referenced from the HTML by root paths such as `/bluetenzart.png`.
- **`data/projects.js`** is left over from the developer-portfolio template this site started from. Nothing imports it.
- **`notes.txt`** is a personal scratchpad with color notes.

Much of the copy is still placeholder text: the anime character bios in the heilSphaere and About sections, plus `href="????????"` / `"#"` links. The mobile nav links (`#featured`) don't match the header/section ids (`#topics`, `#products`, `#about`, `#contact`).
