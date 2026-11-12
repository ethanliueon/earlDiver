#!/usr/bin/env python3
"""Stamp the game's version on every script it loads (run after bumping js/version.js).

Browsers keep scripts in their cache, and an update could run new files next to old ones (a player on
2.6.0 had the cabin script from 2.4). index.html carries an import map that sends every module to
"js/name.js?v=<version>", so each version's files are fetched fresh, once. Usage: python3 tools/stamp.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = re.search(r"VERSION = '([^']+)'", open(os.path.join(ROOT, 'js', 'version.js')).read()).group(1)
# every module in js/ and data/ (the species lists change between versions too: 4.19.3)
mods = [f'js/{f}' for f in sorted(os.listdir(os.path.join(ROOT, 'js'))) if f.endswith('.js')] + \
       [f'data/{f}' for f in sorted(os.listdir(os.path.join(ROOT, 'data'))) if f.endswith('.js')]
lines = ',\n'.join(f'    "./{m}": "./{m}?v={ver}"' for m in mods)
block = f'<!-- stamp:start (tools/stamp.py) -->\n  <script type="importmap">\n  {{ "imports": {{\n{lines}\n  }} }}\n  </script>\n  <script type="module" src="js/main.js?v={ver}"></script>\n  <!-- stamp:end -->'
p = os.path.join(ROOT, 'index.html')
html = open(p).read()
if '<!-- stamp:start' in html:
    html = re.sub(r'<!-- stamp:start.*?<!-- stamp:end -->', lambda m: block, html, flags=re.S)
else:
    html = html.replace('<script type="module" src="js/main.js"></script>', block)
open(p, 'w').write(html)
print('stamped', ver, len(mods), 'modules')
