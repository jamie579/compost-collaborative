#!/usr/bin/env python3
"""Check a built site using Python's standard library; no network or deployment."""
import json
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

BASE = 'https://compostcollaborative.online/'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.title = ''
        self.description = []
        self.canonical = []
        self.refs = []
        self.ids = set()
        self.h1 = 0
        self.main = 0
        self.images_missing_alt = 0
        self.redirect = False
        self.structured = []
        self._title = False
        self._json = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.add(a['id'])
        self.h1 += tag == 'h1'
        self.main += tag == 'main'
        if tag == 'title':
            self._title = True
        if tag == 'meta':
            if a.get('name') == 'description':
                self.description.append(a.get('content', ''))
            if a.get('http-equiv', '').lower() == 'refresh':
                self.redirect = True
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a.get('href', ''))
        if tag in ('a', 'link') and a.get('href'):
            self.refs.append(a['href'])
        if tag in ('img', 'script', 'source', 'video') and a.get('src'):
            self.refs.append(a['src'])
        if tag == 'img' and 'alt' not in a:
            self.images_missing_alt += 1
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self._json = ''

    def handle_endtag(self, tag):
        if tag == 'title':
            self._title = False
        if tag == 'script' and self._json is not None:
            self.structured.append(json.loads(self._json))
            self._json = None

    def handle_data(self, text):
        if self._title:
            self.title += text
        if self._json is not None:
            self._json += text


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else 'public').resolve()
    errors = []
    pages = {p: Page(p) for p in root.rglob('*.html')}
    if not pages:
        raise SystemExit(f'No HTML in {root}; run hugo first.')
    titles, descriptions = [], []
    for file, page in pages.items():
        relative = file.relative_to(root).as_posix()
        url = urljoin(BASE, relative.removesuffix('index.html'))
        if not page.redirect:
            titles.append(page.title)
            descriptions += page.description
            if not page.title.strip():
                errors.append(f'{relative}: empty title')
            if len(page.description) != 1 or not page.description[0].strip():
                errors.append(f'{relative}: missing/duplicate description')
            if page.canonical != [url]:
                errors.append(f'{relative}: canonical {page.canonical}, expected {url}')
            if page.h1 != 1 or page.main != 1:
                errors.append(f'{relative}: expected one h1/main, found {page.h1}/{page.main}')
            if not page.structured:
                errors.append(f'{relative}: missing structured data')
        if page.images_missing_alt:
            errors.append(f'{relative}: image without alt attribute')
        for ref in page.refs:
            parsed = urlsplit(urljoin(url, ref))
            if parsed.scheme not in ('http', 'https') or parsed.netloc != urlsplit(BASE).netloc:
                continue
            target = root / unquote(parsed.path).lstrip('/')
            if target.is_dir():
                target /= 'index.html'
            if not target.exists():
                errors.append(f'{relative}: broken internal target {ref}')
            elif parsed.fragment and target in pages and unquote(parsed.fragment) not in pages[target].ids:
                errors.append(f'{relative}: missing fragment {ref}')
    for kind, values in [('title', titles), ('description', descriptions)]:
        for value, count in Counter(values).items():
            if count > 1:
                errors.append(f'duplicate {kind} ({count}): {value}')
    sitemap = ET.parse(root / 'sitemap.xml')
    urls = [e.text for e in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    for url in urls:
        if not url.startswith(BASE):
            errors.append(f'sitemap contains non-canonical domain: {url}')
        target = root / urlsplit(url).path.lstrip('/')
        if target.is_dir():
            target /= 'index.html'
        if not target.exists():
            errors.append(f'sitemap target missing: {url}')
    normal_urls = {p.canonical[0] for p in pages.values() if not p.redirect and p.canonical}
    for url in normal_urls - set(urls):
        errors.append(f'page missing from sitemap: {url}')
    robots = (root / 'robots.txt').read_text()
    if f'Sitemap: {BASE}sitemap.xml' not in robots:
        errors.append('robots.txt has missing/non-canonical sitemap')
    if errors:
        print('\n'.join(errors))
        raise SystemExit(1)
    print(f'PASS: {len(pages)} HTML files, {len(urls)} sitemap URLs; internal links/fragments/assets, unique titles/descriptions, canonical URLs, JSON-LD, h1/main landmarks and image alt attributes.')


if __name__ == '__main__':
    main()
