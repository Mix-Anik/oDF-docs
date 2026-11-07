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
* `docs/plugins/api/` **generated, not committed**: the client and server plugin API reference. `npm start` / `npm run build` run
  `scripts/gen-api.mjs`, which asks the engine repo (oDFe-upstream) for its API as data (`code/plugin_api/gen_api.py --json`,
  from `client.api` and `server.api`) and renders the pages with `scripts/render-api.mjs`. The engine only says *what* the API
  is; how it looks (badges, tables, links) is decided here. The reference always matches the engine it was generated from.

The engine repo is looked up at `ODFE_DIR` (default `../oDFe-upstream`); the Python interpreter can be set with `PYTHON`.

## Publishing

`.github/workflows/deploy.yml` builds and deploys on every push to `main`, and can be started by hand (with the engine branch or
tag to take the API from) or by a `repository_dispatch` of type `engine-changed`. In the repository settings, Pages needs the
source **GitHub Actions**.
