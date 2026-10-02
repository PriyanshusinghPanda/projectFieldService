# Notes on `latent-spaces/brag`, and what Job OS can use from it

Source: `github.com/latent-spaces/brag`, read from a local clone. We only read it as reference material. We did not run its skills, scripts or installers.
Files read: `README.md`, `PRODUCT.md`, `docs/index.html`, `docs/styles.css`, `docs/main.js`, `examples/*/{PRODUCT.md,index.html,styles.css}`, `docs/examples/*` (the newer example sites and their posters), `skills/brag/SKILL.md`, `skills/brag-slim/SKILL.md` and `skills/brag/references/*.md`.

**License:** MIT, "Copyright (c) 2026 Shunit Haviv Hakimi". We can reuse its ideas and code if we keep the copyright notice.
- **SFX:** CC0, from Kenney.
- **Music:** the bundled tracks come from ende.app ("Happy Beats / Business Moves"). The repo's own `assets/music/README.md` says the exact music license terms still need to be verified before anyone redistributes them. Do not ship those MP3s in anything of ours without checking.

---

## 1. What brag is and how it works

`/brag` is an agent skill for Claude Code, Codex, Cursor and similar tools. It reads a project's source code and makes a **15–25 second launch video** (`brag.mp4`), a poster frame (`brag.jpg`) and a one-line caption (`share-copy.txt`).
- **Two versions:**
  - **`/brag --full`** writes a brief and hands it to HeyGen's **Hyperframes**, an HTML-to-video renderer. Hyperframes then builds, checks and renders the video.
  - **`/brag-slim`** is a single-file version for Opus 5.5. The model builds the whole video itself with the tools on the machine. It can also start from a live URL.
- **Hosted version:** `letsbrag.app` does the same thing from a pasted link.

### Pipeline: inspect → plan → compose → deliver

| Step | What happens | Output | Gate before the next step |
|---|---|---|---|
| **1. Inspect** | Reads `index.html` (title, hero, headings, CTAs, testimonials), `styles.css` (`:root` colours, fonts), `README.md`, `package.json`, then routes and key components to find the **user flow: entry → key action → result**. Answers a 9-question rubric: what it is, the best claim, the visual hook, which UI to show, shortest satisfying length, tone, audio, share caption, the user flow. | notes | All 9 questions answered |
| **2. Plan** | Commits to one angle and writes a beat-by-beat storyboard. Each scene has its duration, on-screen text, what appears one by one or what interaction is simulated, an audio intent and a transition mood. | `brag-plan.md` | Scene durations add up to 15–25s |
| **3. Compose** | Writes the brief with the exact copy to show word for word, the colours and fonts taken from the project, the storyboard and the audio direction. Hyperframes (or the model itself in slim) builds it. Music is beat-synced: 1–3 big moments lock to the track's "strong cues" within ±0.15s, and small items that appear in sequence snap to the beat grid within ±0.10s. | `composition-brief.md`, `composition/` | `hyperframes check` passes, including WCAG contrast and text overflow |
| **4. Deliver** | Renders the video. Takes the strongest frame where everything has settled as `brag.jpg` and makes it frame 0, so every platform shows it as the thumbnail. Writes a 1–3 sentence caption in the chosen tone. | `brag.mp4`, `brag.jpg`, `share-copy.txt` | All three exist |

**Rules that apply to every video ("creative laws"):**
- **Short:** 15–25s, ideally 18–22.
- **Readable:** a short label stays on screen ~0.8s after it settles; a sentence gets ~0.3s per word, at least ~1.2s. Pace comes from motion and cuts, never from pulling text away early.
- **Specific:** made for this project, not any project.
- **Show the thing:** at least one scene shows real UI.
- **No generic SaaS language:** "Streamline your workflow" is banned by name.
- **Hook in the first 2s.**
- **Funny only if the product is funny.**
- **Every frame postable.**
- **Default shape:** `Hook (2-3s) → Reveal (2-4s) → 2-3 highlights (5-12s) → Punchline/outro (2-4s)`.
- **Grounding:** names, numbers, capabilities and quotes on screen must appear somewhere in the project. Framing, jokes and connecting lines can be invented.
- **Privacy:** no secrets, internal URLs, real customer names or personal data. Use fictional stand-ins instead.

### How it uses PRODUCT.md (important nuance)

The brag skill itself never looks for `PRODUCT.md`. Step 1 reads `index.html`, the styles, the README, `package.json` and the route/component code.

The `PRODUCT.md` files in the repo come from **Impeccable** (impeccable.style). That is the design skill used to build the joke demo sites (credited in the README). Each one is the design brief its site was built from. They share a fixed shape:
`Register` · `Users` · `Product Purpose` · `Brand Personality` (ending in "Three words: a, b, c.") · `Anti-references` · `Design Principles` (5 numbered) · `Accessibility & Inclusion`.

**What this means for us:**
- A `PRODUCT.md` does two jobs: it is the design brief for our UI, and it is material a brag run can quote from.
- brag only picks it up as a general project file it reads anyway, so the facts the video should quote also need to be in `README.md` and the real UI copy.
- Our draft is in `docs/design/PRODUCT.md`.
  - All five examples use `Register: brand` (they are landing pages). Ours says `product` because Job OS is an app UI. That value is our inference; nothing in this repo confirms how Impeccable treats it.

### Tones

There are seven presets. A freeform direction is mapped to the nearest preset, and the user's wording is kept.

| Tone | Feel | Scenes / scene length | Typography | Transitions |
|---|---|---|---|---|
| `default` | Playful, clean, postable | 4–5 / 3–5s | Mixed case, comfortable weight | Crossfade, clean slide |
| `polished` | Serious, elegant, restraint as the choice | 3–4 / 4–6s | Mixed case, light–medium, generous letter-spacing | Slow crossfade 0.6–0.8s |
| `yc-parody` | Deadpan startup launch, played straight | 4–5, one claim each | Sentence case, heavy/medium, Courier-like for data | Hard cut or 0.2s crossfade |
| `chaotic` | Fast, loud, ALL CAPS | 6–8, some under 2s, never over 4s | ALL CAPS, heavy, tilted words | Hard/flash/zoom cut (scale 1.2→1.0) |
| `deadpan` | Calm, dry | 3–4 / 4–7s | Large, sparse, one thought at a time | Very slow crossfade 0.8–1.0s |
| `cinematic` | Trailer-scale | 4–5 / 3–5s | ALL CAPS or heavy, full-bleed | Dramatic wipe; scene enters at scale 0.95 → 1.0 |
| `app-store` | Clean, feature-forward, "the product is real" | 4–6, feature name + 1–2 details | Title case, medium weight | Clean slide/wipe 0.35–0.45s |

**For Job OS:** use `polished` with a touch of `app-store`, e.g. *"quiet premium product film, feature cards from the real app"*.

---

## 2. Design concepts brag uses (with concrete values)

### 2a. The launch site (`docs/`)

**Type**
- **Fonts:** Geist (400–900) and Geist Mono (400–700) only, with `font-feature-settings: "ss01","ss03","cv11"` and antialiasing turned on.
- **Hero headline:**
  - `font-size: clamp(64px, 13vw, 200px)`; on desktop `clamp(64px, min(12vw, 17svh), 200px)`;
  - `line-height: 0.86; letter-spacing: -0.04em; font-weight: 900; text-transform: lowercase`.
- **Sub-copy:** `clamp(20px, 2.1vw, 30px)`, `line-height 1.18`, weight 500, `max-width 38ch`, in a softer ink. Only the key phrase is `<strong>` in full ink.
- **Section title:** `clamp(40px, 6vw, 88px)`, line-height 0.95, `-0.03em`, weight 700, `max-width 14ch`.
- **Mono "metadata" layer:** nav, eyebrows, labels, captions, install commands. Fixed small sizes: 11–13px, `letter-spacing 0.06–0.1em`, UPPERCASE for labels.
  - Example: `.gallery-eyebrow { 12px; 0.08em; uppercase; accent colour }`.
- **One emphasis device:** the key word is set italic in a knocked-out block (ink background, accent text):
  `.emph { font-style: italic; background: var(--hero-ink); color: var(--hero-bg); padding: 0 0.06em }`.
  It is used on "brag." in the hero, the outro and the slim tagline, and nowhere else.

**Colour.** Everything comes from a single hue in OKLCH:
```css
--hue: 35;
--hero-bg:   oklch(64% 0.22 var(--hue));   /* saturated orange field */
--hero-ink:  oklch(16% 0.06 var(--hue));   /* near-black, tinted to the hue */
--hero-ink-soft: oklch(28% 0.06 var(--hue));
--hero-tint: oklch(96% 0.02 var(--hue));   /* paper */
--dark-bg:   oklch(14% 0.03 var(--hue));
--dark-bg-elev: oklch(18% 0.04 var(--hue));
--dark-ink-soft: oklch(72% 0.04 var(--hue));
--dark-rule: oklch(26% 0.03 var(--hue));
--dark-accent: oklch(72% 0.22 var(--hue));
```
- **Page bands:** orange hero → paper `/brag-slim` band → dark gallery → orange outro.
- **Tinted neutrals:** every neutral is tinted with the brand hue (chroma 0.02–0.06), so nothing is a dead grey.
- **One off-hue colour:** the "copied" success state, `oklch(58% 0.18 145)`.

**Shape, space, motion**
- **Radii:** `--radius-sm 6px`, `--radius-md 12px`, `--radius-lg 18px`.
- **Widths:** `--max-page 1480px`, `--max-line 64ch`.
- **Spacing:** fluid throughout, e.g. section padding `clamp(60px, 8vw, 120px)` and gaps `clamp(18px, 1.8vw, 26px)`.
- **Easing:** one curve, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.
  - Durations: 180ms for hovers and opacity, 220ms for controls, 320ms for card lift.
- **Hover:** cards lift `translateY(-3px)`, the border turns accent, and they get a soft shadow `0 24px 60px -24px`.
- **Playful tilts:** `rotate(2.5deg)` on the hero video, `-2deg` on the slim video, `-1.5deg` on the letsbrag box, `-6deg` on the "new" tag. These are turned off below 720–900px.
- **Live dot:** a small 7px dot pulses on a 2.4s cycle.
- **Reduced motion:** a `prefers-reduced-motion` block reduces all animations and transitions to ~0, and the JS pauses the hero video and shows the poster.

**How it shows the product (video frames)**
- **Gallery cards:** 16:9 media, `border: 1px solid var(--dark-rule)`, radius 12px, on a raised dark surface.
- **Under each video:** a caption row with a mono number ("01"), a lowercase name and an uppercase mono category on the right, plus a 58×34px thumbnail of the source site that links to it.
- **Hero:** the video sits in a 9:16 tilted "device" tile with a 4px scanline overlay and glassy pill controls: `backdrop-filter: blur(8px)`, 1px translucent border, 11px uppercase mono label "tap for sound".
- **CTA card:** the "your brag here" card fills the slot with the accent colour and 45° hairline stripes.

### 2b. The example product sites (`examples/`, the originals)

These are the most useful for us: each one is a "real product UI shown as the hero".

| Site | Fonts | Palette idea | How the product is framed |
|---|---|---|---|
| Taxi for Taxis | Geist + Geist Mono | Near-black warm night `oklch(15% 0.006 90)`, one accent "electric yellow" `oklch(86% 0.175 90)`, text ramp `--text` 95% → `--text-4` 48% | A **live dispatch panel** is the hero centrepiece: 14px radius, 1px line border, a mono status bar ("DISPATCH · LIVE", 0.6875rem, 0.14em tracking), a map, a floating ETA card, an event feed in mono |
| Psychologists for Chatbots | Hanken Grotesk only | Warm putty paper `oklch(96.5% 0.012 78)`, warm ink `oklch(26% 0.022 70)`, **one** saturated accent cobalt `oklch(48% 0.155 258)` + pale tint | A **real intake form** is the hero: card `border-radius:14px`, layered soft shadow tinted with the accent, a form ID badge, chips, one featured field on a pale-accent panel |
| Bicycles for Snakes | Barlow / Barlow Condensed / Semi Condensed | Blueprint cream + cool ink + cyan `oklch(60% 0.155 233)` | Spec sheets, hard offset shadow `6px 6px 0 var(--cyan-wash)` |
| Horse Tinder | Libre Baskerville + Figtree | All neutrals tinted to amber | Swipe profile cards |
| Fish Flight School | EB Garamond + Archivo | Sky blues + navy + one warm accent | Curriculum cards |

**What all of them share:**
- **Spacing scale:** a 4-based `--s1:4px … --s9:96–128px`.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Fast states:** buttons and hovers take 140–160ms.
- **Eyebrows:** mono or small caps, `0.16–0.2em` tracking, in the accent colour.
- **Headings:** `text-wrap: balance` and negative tracking, `-0.02` to `-0.035em`.
- **Measure:** 26–46ch on body copy.
- **Section dividers:** 1px hairlines between sections instead of boxes.
- **Numbering:** steps and services numbered "01 / 02 / 03" in the accent.
- **Accent:** one saturated accent; everything else is neutral.

The newer sites in `docs/examples/` (used for the /brag-slim videos) are louder and illustrated, with Bungee, Shrikhand and Big Shoulders Stencil fonts, hex palettes and cartoon mascots. Every poster uses the same layout:
- a mono eyebrow;
- a huge 2–3 line headline;
- the last word knocked out in a tilted accent block ("TAXI.", "FLY.", "soulmare.");
- one real UI fragment as a pill/card ("#4821 · requested pickup", ETA 3:08).

### 2c. Video composition rules (from `references/`)

- **Formats:** landscape 1920×1080 by default; vertical 1080×1920 or square 1080×1080; 30fps.
- **What to show, in order of preference:**
  1. recreate a moment from the working app;
  2. recreate a UI element;
  3. animate the core concept;
  4. text-forward.

  At most **one** stat-card or hero block, used as a frame around the flow. Never abstract filler, colour washes or generic motion.
- **Make it alive:** items appear one by one, and clicks, swipes and typing are simulated. Text that appears in sequence is never faster than reading speed, so on fast beats it reveals on every other beat.
- **Timing:** entrances and transitions take 0.3–0.6s, then the text holds ("fast-in, then hold").
- **Crossfades:** never crossfade two busy layouts, which makes a muddy double exposure. Stagger them (old out, then new in) or dip through the background.
- **Audio:** one music bed plus a few motion-matched SFX, kept quiet. Audio-reactive glow and presence are allowed, but no waveforms, EQ bars or strobing.
- **Thumbnail:** the poster is baked in as frame 0.

---

## 3. What transfers to the Job OS app UI, and what doesn't

### Transfers (adopt)

1. **Two-voice typography.** Use a sans for content and a mono (or tabular) voice for metadata: job numbers, times, statuses, table headers, eyebrows. Taxi for Taxis shows this is exactly how a dispatch tool should look.
   - **Fonts:** Geist + Geist Mono fits our "professional, minimal" goal. Alternatively, keep Inter and add `font-variant-numeric: tabular-nums` plus a mono for IDs and times.
   - **Label style:** 11–12px uppercase, `0.06–0.1em` tracking. The examples go up to `0.2em`; in a dense app, stay near `0.06em`.
2. **A hierarchy with real contrast, but app-sized.**
   - Use negative tracking on headings (`-0.02em` to `-0.03em`) and `text-wrap: balance`.
   - Keep the soft-ink / full-ink split: secondary copy in `--ink-2`, with only the key figure or phrase in full `--ink`.
   - Body measure stays at 46–64ch.
   - Do not import the 200px / weight-900 display scale.
3. **One accent, tinted neutrals.**
   - Our brand colour is runtime-set (`--brand`). Generate the rest of the ramp from it in OKLCH, the way `--hue` drives everything on the brag site. Neutrals then carry a hint (chroma ≈ 0.005–0.02) of the brand hue instead of flat `#6b7280` grey.
   - Use the accent sparingly: the primary button, the selected state, the eyebrow, a "live" dot.
   - Status colours (green, amber, red) are the only other hues, as with brag's single off-hue "copied" green.
4. **Hairlines over boxes.**
   - Use 1px `--line` dividers between sections and table rows, with fewer nested cards.
   - Lift elevation only for the thing that matters: the open job, a modal, the "featured field".
   - Use layered, soft, slightly tinted shadows like the psychologists form card. Avoid heavy grey drop shadows.
5. **The "featured field" device.** One item per screen gets the accent-pale panel, the way the apology slider does on the intake form. For us that is:
   - the recommended quote option;
   - the blocking proof-of-work gate on the tech app;
   - the "needs you" item on Home.
6. **Numbered steps "01 / 02 / 03"** in the accent, for the quote options (good / better / best), onboarding and the go-live checklist.
7. **Motion tokens.**
   - One easing: `cubic-bezier(0.22, 1, 0.36, 1)` or `(0.16, 1, 0.3, 1)`.
   - 140–180ms for hover and press, ~220–320ms for panels.
   - Hover lift of 1–3px at most.
   - A small pulsing "live" dot for live state, e.g. a technician en route or an offline queue syncing.
   - Always respect `prefers-reduced-motion`.
8. **Product framing for screenshots and marketing (our own docs, the sales demo, a future landing page).**
   - Show the real screen as the hero inside a frame: 12–14px radius, a 1px border and a slim mono status bar (e.g. `DISPATCH · TODAY · 6 TECHS`).
   - Add at most one floating detail card (the Taxi ETA card pattern), e.g. "Marco · on my way · 09:40".
   - The phone (tech app) goes in a tall 9:16 tile.
   - Captions follow the gallery pattern: number, name, category.
9. **Copy rules.**
   - Specific beats generic. No "streamline / elevate / supercharge / unlock".
   - Use our own nouns: job, visit, quote, deposit, proof of work, plan.
   - Short sentences in the operational voice used on the Taxi site ("Driver confirms. Both vehicles proceed at standard rate.").
10. **Accessibility baseline.** All examples state WCAG 2.1 AA. brag's render gate fails on contrast, and we should hold the app to the same bar: visible `:focus-visible` outlines, a skip link and keyboard-reachable controls.

### Doesn't transfer (video- or marketing-only)

- Giant lowercase 900-weight headlines, knocked-out italic emphasis words and tilted (`rotate(±2deg)`) tiles. That is launch-page attitude. In an app it reads as noise and hurts scanning.
- Full-bleed saturated colour fields such as the orange `oklch(64% 0.22 35)` page background, and the alternating bands of section colour.
- Scanline overlays, 45° stripe fills and illustrated mascots.
- Hook / reveal / highlights / punchline structure, the 15–25s length, reading-time floors, beat-grid sync, music, SFX, audio-reactive glow, flash and zoom cuts, the tone presets as pacing rules, and baking the poster into frame 0. These matter only if we make the video.
- The "funny earns its place" and absurd-product deadpan concepts. Job OS is a serious tool, so its tone is `polished`.

---

## 4. If we make a launch video later

**Preparation**
- Keep `docs/design/PRODUCT.md` (draft) current.
- Make sure the README's one-liner and the real UI copy carry the claims we want on screen, because brag only puts on screen what it can find in the project.
- Use only the fictional demo data ("Summit Heating & Plumbing", tech "Marco Diaz").
- Do not use the bundled music until its license is confirmed.

**Suggested angle** (`polished`, 4 scenes, ~20s, landscape 1920×1080):
1. **Hook (3s):** "One job. First call to next visit." over the Inbox showing the missed call that was texted back.
2. **Quote (5s):** good / better / best options arrive one by one; the customer taps "Approve" and the deposit is paid.
3. **Dispatch → tech app (7s):**
   - the job is dragged onto Marco; "Suggest best slot" explains its choice;
   - the phone tile shows the checklist → photos → signature gate turning green;
   - an "Offline · 2 queued" pill syncs.
4. **Outro (5s):**
   - an invoice is paid with Tap to Pay;
   - the plan books its own next visit;
   - end card "Job OS. Make it yours." + "Built from what 73 paying field-service builders made on Emergent."
