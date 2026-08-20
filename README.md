# Saldantia — site

Static marketing site. No framework, no build step, no dependencies: HTML, four
stylesheets and one script.

## Structure

| Path | Role |
|---|---|
| `index.html` | The whole page. |
| `css/base.css` | Design tokens, reset, utilities. |
| `css/hero.css` | Opening section. |
| `css/servicios.css` | Services grid. |
| `css/secciones.css` | Remaining blocks. |
| `js/scroll.js` | Reveal-on-scroll and navigation state. |

## Running it

Open `index.html`, or serve the directory:

```sh
python3 -m http.server 8000
```

## Quality audit

[`AUDITORIA_CALIDAD.md`](AUDITORIA_CALIDAD.md) records a full pass over the
site: every class in the markup accounted for, render verified at 1024, 768 and
480 px with no horizontal overflow, all seven form controls given a valid
`label[for]`, decorative SVGs hidden from the accessibility tree, and normal
text held at 4.5:1 contrast or better against every surface it sits on.

Two colour changes came out of it: `--text-faint` was lightened, and
`--accent-text` was introduced so small red text could meet contrast without
altering the red used on buttons and filled surfaces.
