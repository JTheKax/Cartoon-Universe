#!/usr/bin/env python3
"""Regenerate the public appearance catalog from checked-in asset files."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def entries(folder, extensions):
    directory = root / 'assets' / folder
    result = []
    if directory.exists():
        for path in sorted(directory.iterdir()):
            if not path.is_file() or path.suffix.lower() not in extensions:
                continue
            if not re.fullmatch(r'[A-Za-z0-9_-]+', path.stem):
                continue
            name = path.stem.replace('-', ' ').replace('_', ' ').title()
            result.append({'id': path.stem.lower(), 'name': name, 'kind': 'file',
                           'path': 'assets/' + folder + '/' + path.name})
    return result

catalog = {'logos': entries('logos', {'.png', '.jpg', '.jpeg', '.webp', '.svg'}),
           'themes': entries('themes', {'.css'})}
target = root / 'assets' / 'appearance-catalog.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(catalog, indent=2) + '\n', encoding='utf-8')
print('Indexed', len(catalog['logos']), 'logos and', len(catalog['themes']), 'themes')
