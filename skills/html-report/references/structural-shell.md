# Structural Shell Reference

## Purpose

This file is canon, not steering. Every report uses the same plumbing defined here regardless of design language. CSS that *paints* these elements — colors, fonts, hover states — belongs to the design-language file. Locked: scroll-spy JS (verbatim), sticky-TOC HTML structure, skip-link presence + visually-hidden pattern, progress-bar `--scroll` wiring, marginalia gutter geometry.

---

## Document Head Boilerplate

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{TITLE}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- FONTS — filled by design-language file -->
  <style>
```

---

## Layout Grid

Two-column default (TOC + main). The `--grid-template` variable is the seam for language overrides — a future 4-column named-grid language sets it without touching structural CSS.

```css
  .layout {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 48px;
    display: grid;
    grid-template-columns: var(--grid-template, 240px minmax(0, 1fr));
    gap: 64px;
  }

  @media (max-width: 980px) {
    .layout { grid-template-columns: 1fr; gap: 40px; padding: 0 24px; }
  }
```

---

## Sticky TOC HTML Pattern

Scroll-spy reads `href` attributes on `<a>` elements inside `aside.toc` to discover section IDs. No `data-` attributes needed.

```html
<aside class="toc">
  <h2>Contents</h2>
  <ol>
    <li><a href="#section-id">Section Title</a></li>
    <li><a href="#another-section">Another Section</a></li>
  </ol>
</aside>
```

Locked sticky geometry:

```css
  aside.toc {
    position: sticky;
    top: 32px;
    align-self: start;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
  }

  @media (max-width: 980px) {
    aside.toc { position: static; max-height: none; }
  }
```

The heading text ("Contents" vs "Table of contents"), link colors, hover state, and active-state indicator are steered by the language file.

---

## Reading Progress Bar

Place immediately after `<body>` opens (before skip-link).

```html
<div class="progress"></div>
```

```css
  .progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 100; }
  .progress::after {
    content: ""; display: block; height: 100%;
    width: var(--scroll, 0%);
    transition: width 0.05s linear;
  }
```

Fill color (`.progress::after { background: ... }`) and exact height (1px–3px) come from the language file. `--scroll` is set by the scroll-spy JS.

---

## Skip Link

First child of `<body>`. Visually hidden until focused.

```html
<a class="skip-link" href="#main">Skip to content</a>
```

```css
  .skip-link {
    position: absolute;
    left: -9999px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .skip-link:focus {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
  }
```

Skip-link must be present. Paint (color, background, border) comes from the language file.

---

## Marginalia Gutter Pattern

`<section>` is `position: relative`. The number span is `position: absolute` in the left gutter.

```html
<section id="{SECTION_ID}" style="position: relative;">
  <span class="num">01</span>
  <h2>Section Heading</h2>
  <p>…</p>
</section>
```

```css
  section { position: relative; }

  .num {
    position: absolute;
    left: -64px;
    top: 0;
  }
```

Locked: `position: absolute`, `left: -64px` (±8px tuning per language is acceptable). Free: font family, color, format (`01` vs `i.` vs `§ 1`).

---

## Scroll-Spy JS

Inside `<script>` immediately before `</body>`. Verbatim — do not modify.

```javascript
const root = document.documentElement;
const tocLinks = document.querySelectorAll('aside.toc a[href^="#"]');
const sections = Array.from(tocLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

function updateProgress() {
  const h = document.body.scrollHeight - innerHeight;
  root.style.setProperty('--scroll', h > 0 ? (scrollY / h * 100) + '%' : '0%');
}

function updateActive() {
  const mid = scrollY + innerHeight / 2;
  let current = sections[0];
  for (const s of sections) {
    if (s.offsetTop <= mid) current = s;
  }
  if (current) tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
}

addEventListener('scroll', () => { updateProgress(); updateActive(); }, { passive: true });
updateProgress(); updateActive();
```

---

## What Is Locked (Do Not Vary)

- Scroll-spy JS verbatim (the block above, including the `if (current)` guard).
- Sticky-TOC HTML structure: `<aside class="toc"><ol><li><a href="#...">…</a></li>…</ol></aside>`.
- Skip-link presence and visually-hidden-until-focus pattern.
- Progress-bar wiring: `--scroll` CSS variable updated by JS; `width: var(--scroll, 0%)` in `.progress::after`.
- Marginalia absolute-positioning pattern (`position: absolute; left: -64px ±8px`). The pattern is locked; the exact offset may be tuned within ±8px per language.
- Layout `max-width: 1280px; margin: 0 auto; padding: 0 48px` container geometry.
- Breakpoint at `980px` for single-column collapse.

## What Is Free (Steered by the Design-Language File)

- TOC link colors, hover state, active-state indicator (color/weight/background pill).
- TOC heading text ("Contents" vs "Table of contents" vs "§").
- Progress bar fill color and exact height (1px–3px range).
- Marginalia number font, color, and format (`01` vs `i.` vs `§ 1`).
- Section spacing rhythm and `scroll-margin-top`.
- All CSS custom properties: `var(--accent)`, `var(--rule)`, `var(--serif)`, `var(--sans)`, `var(--mono)`.
