# The Compost Collaborative — site

Hugo source for [compostcollaborative.online](https://compostcollaborative.online/).
The source is `content/`, `layouts/`, `assets/`, `data/` and `static/`; `public/`
is generated and ignored. The former Wix site has been replaced and the custom
domain is already set in `hugo.toml` and `static/CNAME`.

## Local review

Hugo Extended is the only build dependency. CI uses 0.154.5.

```sh
hugo --gc --minify
python3 scripts/check_site.py public
hugo server --bind 127.0.0.1 --port 1314
```

For a build outside the checkout, use `hugo --gc --minify --destination
../previews/compost`, then pass that directory to the check script. Use a local
static server for previews if you want to retain production canonical URLs.

The workflow in `.github/workflows/hugo.yml` builds on a push to `main` or a
manual workflow dispatch, and publishes the result to `gh-pages`. Review work
belongs on a working branch. **Do not push to `main` or dispatch the deployment
workflow while preparing a review.**

## People: canonical source and manual synchronisation

[Compost Collaborative — Member Dossiers](https://docs.google.com/document/d/1BXne0kX8Y8eei6ah-f2XibOI87EzYmXSEC5pn8rYpoY/edit)
is the stated canonical source. The repository contains no Google Docs fetcher,
sync script, scheduled sync, or sync workflow: “Jamie syncs here” means a manual
editorial step. The July 2026 dossier and later website revisions have diverged;
a bulk copy of the old dossier would overwrite newer profiles.

For a member change:

1. Read the current dossier section and `content/people/<member>.md` together.
2. Update that member's proposed bio in the dossier, preserving their own
   positionality wording and unrelated members' sections.
3. Copy the agreed biography into the member Markdown file; keep website-only
   links, photo and layout metadata unless the change explicitly replaces them.
4. Build and review the member page, People grid and structured data on a branch.

On 30 October 2026 Jamie's proposed bio was updated in the dossier and manually
synchronised to `content/people/jamie.md`. Other members' biographies were not
rewritten or bulk-resynchronised. Member identifiers used in structured data
are also shown as visible links on their pages.

## Content homes

- **About** introduces the collective and links to the existing **Positionality**
  statement. Its URL remains `/positionality/` and it is also in the footer.
- **Projects** explains ongoing collaborations and creative work; **Published
  works** is the bibliography; **Activities** is the dated event record. These
  are distinct destinations with cross-links, and their URLs have not moved.
- **News from the heap** uses `data/news.yaml` for brief summaries, ordering,
  event/announcement dates and links. Detail lives in `content/news/`; homepage
  and news index use the same list. Dates describe the event or original source
  announcement, not an invented publication date for the website page.
- **Epigraphs** live in `data/epigraphs.yaml`.
- **The organism** lives in `static/js/organism.js`, with no dependencies.
  Per-page density is `organism: full|sparse|off` in front matter.

## Search and permissions

`static/robots.txt` retains the existing allow-all policy and canonical sitemap
URL. This permits search crawlers and does not opt out of model-training
crawlers. Search access and training preferences are separate decisions; this
review does not change the established policy. No `llms.txt` is required for
this site to be readable or crawlable.

## Open editorial items

- The full Imperative text is unavailable. The existing page remains and links
  to published work; the homepage no longer promises the missing full text.
- The preserved *Constantly Becoming With* film is not yet served here. No
  release date is promised.
- The collective's positionality statement includes roster-wide assertions
  (for example, “we are all nurses” and “we are all abled”) that the group should
  review in light of its present membership. These self-descriptions have not
  been silently rewritten.
