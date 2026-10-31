import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts'/'build_appearance_catalog.py'

class AppearanceCatalogTests(unittest.TestCase):
    def test_script_and_catalog_are_valid(self):
        subprocess.run([sys.executable,str(SCRIPT)],cwd=ROOT,check=True)
        data=json.loads((ROOT/'assets'/'appearance-catalog.json').read_text())
        self.assertEqual(set(data),{'logos','themes'})
        for category in ('logos','themes'):
            self.assertIsInstance(data[category],list)
            for item in data[category]:
                self.assertEqual(item['kind'],'file')
                self.assertTrue((ROOT/item['path']).is_file())

    def test_owner_switcher_and_homepage_wiring(self):
        owner=(ROOT/'owner.html').read_text()
        home=(ROOT/'index.html').read_text()
        for section in ('owner-logo-options','owner-theme-options'):
            self.assertIn(section,owner)
        for page in (owner,home):
            self.assertIn('logo-preferences.js',page)
            self.assertIn('theme.js',page)
        self.assertIn('id="nav-owner-tab" hidden',home)
        self.assertIn('src="admin-nav.js"',home)

if __name__=='__main__':
    unittest.main()
