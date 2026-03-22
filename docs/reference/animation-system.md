# Animation & Motion System

**Status:** Implemented · March 2026

---

## 1. Übersicht

Jede Section wird beim Scrollen eingeblendet. Interaktive Elemente haben
Hover-Feedback. Das System verwendet ausschließlich Vanilla CSS + einen globalen
IntersectionObserver — keine externen Libraries.

### Dateien

| Datei                                      | Zweck                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `styles/global.css`                        | CSS-Klassen für Scroll-Reveals, Hover-Effekte, Spezial-Animationen |
| `components/layout/ScrollAnimations.astro` | Globaler IntersectionObserver + Counter-Animation                  |
| `layouts/BaseLayout.astro`                 | Bindet ScrollAnimations einmal ein                                 |

---

## 2. Scroll-Reveal-System

### Funktionsweise

1. Element bekommt `data-animate="variant"` im HTML
2. CSS setzt `opacity: 0` + einen `transform`-Ausgangszustand
3. IntersectionObserver beobachtet das Element (threshold 15%, 50px bottom
   margin)
4. Beim Eintreten in den Viewport: Klasse `is-visible` wird hinzugefügt
5. CSS-Transition animiert `opacity` und `transform` zum Endzustand

### Varianten

| Attribut-Wert | Effekt                            | Wann verwenden                                             |
| ------------- | --------------------------------- | ---------------------------------------------------------- |
| `fade-up`     | Von unten einblenden (40px)       | **Standard.** Grids, Cards, Sections — Apple-Style.        |
| `fade-up-lg`  | Von unten einblenden (60px, 0.9s) | Eigenständige CTA-Boxen — langsamer und deutlicher.        |
| `fade-left`   | Von links einblenden              | Linke Spalte in Split-Layouts, Ping-Pong mit `fade-right`. |
| `fade-right`  | Von rechts einblenden             | Rechte Spalte, Gegenrichtung zu `fade-left`.               |
| `fade-down`   | Von oben einblenden               | Selten. Sticky-Filter die von oben „einfallen".            |
| `fade`        | Nur Opacity, keine Bewegung       | Dezentes Einblenden ohne Richtung.                         |
| `scale`       | Von 92% auf 100% zoomen           | Einzelne hervorgehobene Blöcke (z.B. Pull-Quotes).         |
| `scale-up`    | Zoom + nach oben (92%, 30px)      | Stat-Tiles — kombiniert Aufmerksamkeit mit Bewegung.       |
| `bounce`      | Elastic bounce-in (0.6→1.08→1.0)  | Nur Thank-You-Seite Check-Icon.                            |
| `line-grow`   | Vertikale Linie wächst von oben   | Nur ProcessSteps Timeline-Linie.                           |

### Verzögerung (Delay)

Explizite Delays via `data-animate-delay="wert"`:

```html
<!-- Erstes Element: kein Delay (sofort) -->
<div data-animate="fade-up">...</div>

<!-- Zweites Element: 200ms Delay -->
<div data-animate="fade-up" data-animate-delay="200">...</div>
```

Verfügbare Werte: `100`, `150`, `200`, `300`, `400`, `450`, `500`, `600`.

### Stagger (Eltern-gesteuert)

`data-animate-stagger` auf einem Parent-Element verteilt automatisch steigende
Delays auf direkte Kinder (50ms, 120ms, 190ms, ..., bis Kind 8).

```html
<ul data-animate-stagger>
  <li data-animate="fade-up">Card 1</li>
  <!-- delay: 50ms -->
  <li data-animate="fade-up">Card 2</li>
  <!-- delay: 120ms -->
  <li data-animate="fade-up">Card 3</li>
  <!-- delay: 190ms -->
</ul>
```

### ⚠️ Wichtige Regel: Kein Hover + Scroll-Animation auf demselben Element

CSS `transition` ist eine Shorthand-Property. Wenn `.hover-scale`
(`transition: scale 0.3s`) und `[data-animate]`
(`transition: opacity 0.7s, transform 0.7s`) auf demselben Element liegen,
überschreibt eines das andere komplett.

**Lösung:** Immer auf getrennte Elemente verteilen:

```html
<!-- ✅ RICHTIG -->
<li data-animate="fade-up">
  <!-- Scroll-Animation -->
  <div class="hover-scale">
    <!-- Hover-Effekt -->
    <Card />
  </div>
</li>

<!-- ❌ FALSCH — Transition-Konflikt -->
<li data-animate="fade-up" class="hover-scale">
  <Card />
</li>
```

### Reduced Motion

Bei `prefers-reduced-motion: reduce` werden alle Transforms deaktiviert und
Transitions auf 0.01s verkürzt. Der Inhalt erscheint sofort sichtbar ohne
Bewegung. Implementiert via `[data-animate][data-animate]` (doubled selector für
erhöhte Specificity ohne `!important`).

---

## 3. Hover-Effekte

Alle Hover-Effekte sind in `@media (hover: hover)` eingebettet — sie greifen nur
auf Geräten mit Maus/Trackpad.

### Wann welchen Hover verwenden

| Effekt              | CSS-Klasse                 | Verwenden auf                                                     | Nicht verwenden auf                        |
| ------------------- | -------------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| **Card Scale**      | `hover-scale`              | Cards die vollständig klickbar sind (Stretched Link/Button)       | Cards die nur ein Subelement als CTA haben |
| **Icon Float**      | `hover-icon-float`         | Dekorative Icon-Gruppen (USP-Icons)                               | Interaktive Icons (die wären Buttons)      |
| **Button Shimmer**  | `hover-shine`              | Primary Buttons (`Button.astro variant="primary"`)                | Karten, Container, Bilder                  |
| **Link Underline**  | `animated-underline`       | Links und Buttons die direkt gehovered werden (NavLink, TextLink) | Links innerhalb klickbarer Cards           |
| **Group Underline** | `group-animated-underline` | Dekorativer CTA-Text in vollständig klickbaren Cards              | Standalone-Links                           |

### Entscheidungsbaum: Braucht dieses Element einen Hover?

```
Ist das Element interaktiv (klickbar)?
├── Nein → KEIN Hover-Effekt
└── Ja → Ist die gesamte Card klickbar (Stretched Link)?
    ├── Ja → hover-scale auf Card-Container
    │        + group-animated-underline auf dekorativen CTA-Text
    └── Nein → Ist es ein Button?
        ├── Ja → hover-shine (primary) oder native Tailwind-Hover (secondary)
        └── Nein → Ist es ein Text-Link?
            └── Ja → animated-underline
```

---

## 4. Spezial-Animationen

### Ken-Burns (HeroFullscreen)

Klasse `hero-ken-burns` auf dem Section-Element. Hintergrundbild/-video zoomt
langsam (scale 1.0 → 1.06, 20s, infinite alternate).

### FAQ Smooth Expand

Klasse `faq-content` auf dem Content-Wrapper innerhalb von `<details>`. Nutzt
den `grid-template-rows: 0fr → 1fr` Trick für sanftes Auf-/Zuklappen statt
hartem Toggle.

### PullQuote Border-Grow

Klasse `pullquote-animate` + `data-animate="fade"` auf dem `<figure>`. Die linke
Border wächst via `clip-path` Animation von oben nach unten.

### Counter Countup

Attribut `data-countup` auf Stat-Zahlen. Der Observer (threshold 0.5) startet
eine 2s ease-out-cubic Animation von 0 zum Zielwert. Erkennt automatisch `+` und
`%` Suffixe.

---

## 5. Card-Pattern (Konsistenz-Regel)

Alle interaktiven Cards folgen demselben Aufbau:

```
┌─ Container (group relative, hover-scale)
│  ├─ Invisible Stretched Link/Button (absolute inset-0)
│  ├─ Card Content (flex-1 für gleichmäßige Höhe)
│  └─ Visible CTA Button (relative z-10, über stretched link)
└─
```

| Card                 | Stretched Element           | Sichtbarer CTA       |
| -------------------- | --------------------------- | -------------------- |
| ServiceCard          | `<a>` in `<h3>`             | Button "Get Started" |
| CoachCardExpanded    | `<button absolute inset-0>` | Button "Meet {name}" |
| CoachCardCompact     | `<button absolute inset-0>` | Button "Meet {name}" |
| SuccessStoryGridCard | `<a>` in `<h3>`             | Text "Read story →"  |

---

## 6. Seitenspezifische Zuordnung

### Homepage

| Section                         | Scroll-Animation                                                             | Hover                              |
| ------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------- |
| Hero (HeroSplit)                | Headline: `fade-right`, Body: `fade-right` +200ms, Image: `fade-left` +100ms | —                                  |
| We Get Your Struggles (Content) | Headline: `fade-left`, Body: `fade-left` +100ms, Image: `fade-up`            | —                                  |
| Services                        | Header: `fade-up`, Cards: `fade-up` + stagger                                | `hover-scale` auf Card-Wrapper     |
| Stats                           | Header: `fade-up`, Tiles: `scale-up` + stagger + countup                     | —                                  |
| USPs                            | Container: `fade-up` + stagger, je Card: `fade-up`                           | `hover-icon-float` auf innerer div |
| Coaches                         | Cards: `fade-up` mit expliziten Delays (0, 200, 400ms)                       | `hover-scale` auf innerer div      |
| Success Stories                 | Slider-Container: `fade-up`                                                  | — (Cards nicht einzeln klickbar)   |
| Final CTA                       | `fade-up-lg`                                                                 | —                                  |

### Coaches-Seite

| Section                   | Scroll-Animation                                                         | Hover                         |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| Hero (HeroSplit)          | Standard Split-Animation, Stats: `scale-up` + stagger + countup          | —                             |
| Why Team Beats Individual | Zwei-Spalten: `fade-left` / `fade-right`, PullQuote: `pullquote-animate` | —                             |
| Testimonial               | Image: `fade-left`, Quote: `fade-right` +150ms                           | —                             |
| Meet the Champions        | Cards: `fade-up` mit expliziten Delays (0, 200, 400ms)                   | `hover-scale` auf innerer div |
| CTA                       | `fade-up-lg`                                                             | —                             |

### Services-Seite

| Section               | Scroll-Animation                                                   | Hover                          |
| --------------------- | ------------------------------------------------------------------ | ------------------------------ |
| Hero (HeroFullscreen) | Gestaffelt: `fade-up` 300/450/600ms, Ken-Burns Background          | —                              |
| ServicesCatalog       | Header: `fade-up`, Tabs: `fade` +200ms, Cards: `fade-up` + stagger | `hover-scale` auf Card-Wrapper |
| Bottom CTA            | `fade-up-lg`                                                       | —                              |

### How It Works

| Section               | Scroll-Animation                                                                | Hover |
| --------------------- | ------------------------------------------------------------------------------- | ----- |
| Hero (HeroFullscreen) | Gestaffelt: `fade-up`, Ken-Burns                                                | —     |
| ProcessSteps          | Header: `fade-up`, Steps: `fade-left` mit steigenden Delays, Lines: `line-grow` | —     |
| FAQ                   | Header: `fade-up`, Items: `fade-up` + stagger, Smooth expand/collapse           | —     |
| CTA                   | `fade-up-lg`                                                                    | —     |

### Success Stories (Index)

| Section               | Scroll-Animation                                                           | Hover                                  |
| --------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| Hero (HeroFullscreen) | Gestaffelt: `fade-up`, Ken-Burns                                           | —                                      |
| Stories Grid          | Header: `fade-up`, Filter: `fade-down` +200ms, Cards: `scale-up` + stagger | `hover-scale` auf SuccessStoryGridCard |
| Testimonial Grid      | Spalten: `fade-up` mit Delays (0, 150, 300ms)                              | —                                      |
| CTA                   | `fade-up-lg`                                                               | —                                      |

### Success Story Detail

| Section      | Scroll-Animation              | Hover |
| ------------ | ----------------------------- | ----- |
| Back-Link    | `fade-left`                   | —     |
| Story Header | `fade-up`                     | —     |
| Before/After | `fade-up`                     | —     |
| Pull Quote   | `scale` + `pullquote-animate` | —     |
| Story Body   | `fade-up`                     | —     |
| CTA          | `fade-up-lg`                  | —     |
| Navigation   | `fade-up`                     | —     |

### Contact

| Section      | Scroll-Animation                                                                 | Hover                           |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------- |
| Contact Info | Headline: `fade-left`, Intro: `fade-left` +100ms, Methods: `fade-left` + stagger | —                               |
| Form         | `fade-right` +200ms                                                              | `hover-shine` auf Submit-Button |

### Thank You

| Section    | Scroll-Animation |
| ---------- | ---------------- |
| Check-Icon | `bounce`         |
| Headline   | `fade-up` +200ms |
| Text       | `fade-up` +300ms |
| Button     | `fade-up` +400ms |

---

## 7. Wartungshinweise

### Neues Element animieren

1. `data-animate="fade-up"` auf das Element setzen (Standard)
2. Optional: `data-animate-delay="200"` für Verzögerung
3. Prüfen: Hat das Element auch eine Hover-Klasse? → Auf getrennte Elemente
   verteilen

### Neue Card-Komponente erstellen

1. `group relative` auf den äußeren Container
2. Stretched Link/Button mit `absolute inset-0` für Klickbarkeit
3. Sichtbarer CTA-Button mit `relative z-10`
4. `hover-scale` auf einen Wrapper **zwischen** `data-animate` und Card-Content
5. `flex-1` auf den Content-Bereich für gleichmäßige Höhe

### Neuen Hover-Effekt hinzufügen

1. In `@media (hover: hover)` in global.css definieren
2. Matching Rule in `@media (prefers-reduced-motion: reduce)` hinzufügen
3. Nie auf demselben Element wie `data-animate` verwenden

### Performance-Regeln

- Nur `transform`, `opacity`, und `scale` animieren (GPU-composited)
- Kein `width`, `height`, `margin`, `padding` animieren
- `will-change: opacity, transform` ist bereits auf `[data-animate]` gesetzt
- IntersectionObserver unobserves nach Trigger → kein Scroll-Overhead
