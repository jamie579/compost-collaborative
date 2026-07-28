# The Compost Collaborative — site

Hugo source for compostcollaborative.online (currently staging at
https://jamie579.github.io/compost-collaborative/ until the domain moves).
Replaces the old Wix site.

- **People pages** are synced from the canonical Google Doc
  "Compost Collaborative — Member Dossiers" — edit there, Jamie syncs here.
- **Epigraphs and news** live in `data/epigraphs.yaml` and `data/news.yaml`.
- **The organism** (tentacular mycelium that grows through every page) is
  `static/js/organism.js` — no dependencies. Per-page density via
  `organism: full|sparse|off` in front matter.
- Deploys automatically via GitHub Actions on push to `main`.
- At DNS cutover: change `baseURL` in `hugo.toml`, add `static/CNAME`
  containing `compostcollaborative.online`.

Open items: Kieran Sheehan artist profile (group decision), Patrick Martin /
Rae on People (group decision), Imperative full text, contact form
replacement, news refresh.
