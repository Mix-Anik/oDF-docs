# oDF-docs

Documentation of the oDFs mod and the oDFe engine, built with [Docusaurus](https://docusaurus.io) and published with GitHub Pages
at <https://mix-anik.github.io/oDF-docs/>.

```sh
npm install
npm start        # dev server with live reload
npm run build    # static site into build/
```

## Layout

* `docs/` the pages (markdown; `.md` is plain markdown, so C code and braces are safe). Add a page and list it in `sidebars.js`.
* `src/components/Diagrams.js` the architecture figures (inline SVG, styled by `.dg` in `src/css/custom.css`, so they follow the light
  and dark theme), used by `docs/plugins/architecture.mdx`. A figure is a claim about the system: when the engine changes how a call
  crosses the sandbox, change the figure with it.
* `content/examples/` the example pages, written by hand. A line `{{source name.c}}` in one is replaced by that file of the
  engine's SDK examples (`code/plugin_api/sdk/examples`), so the code shown is the code the engine's CI builds.
* `content/param-notes.txt` what each parameter of the API is for (`Function.parameter: text`), the Description column of the
  reference. A note for a function or parameter that no longer exists fails the build; a new parameter just has no note yet.
* `docs/plugins/api/` and `docs/plugins/examples/` **generated, not committed**. `npm start` / `npm run build` run
  `scripts/generate.mjs`, which takes from the engine repo (oDFe-upstream)
  * the functions, handlers, events and capabilities, as data (`code/plugin_api/gen_api.py --json`, from `client.api` and
    `server.api`) -> `scripts/render-api.mjs`;
  * the structures and constants, read from its type headers (`odfc_types.h`, `odfs_types.h`; their comments are the
    descriptions) -> `scripts/render-types.mjs`;
  * the example sources -> `scripts/render-examples.mjs`.

  The engine only says *what* the API is; how it looks (badges, tables, links between pages) is decided here. A link to a
  function or an anchor that no longer exists in the engine fails the build, so the pages cannot silently go out of date.

The engine repo is looked up at `ODFE_DIR` (default `../oDFe-upstream`); the Python interpreter can be set with `PYTHON`.

## Publishing

`.github/workflows/deploy.yml` builds and deploys on every push to `master`, and can be started by hand (with the engine branch or
tag to take the API from) or by a `repository_dispatch` of type `engine-changed`. In the repository settings, Pages needs the
source **GitHub Actions**.
