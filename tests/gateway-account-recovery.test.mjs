import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gateway=readFileSync(new URL('../server/gateway-candidate.mjs',import.meta.url),'utf8');
const auth=readFileSync(new URL('../auth.js',import.meta.url),'utf8');
const login=readFileSync(new URL('../login.html',import.meta.url),'utf8');
test('protected account dependencies and forgot password remain usable',()=>{
 assert.match(gateway,/ARCADE_FILES=new Set\(\[[^\]]*'config\.js'/);
 assert.match(gateway,/script-src 'self' https:\/\/esm\.sh/);
 assert.match(auth,/from '\.\/config\.js'/);
 assert.match(auth,/from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2'/);
 assert.match(login,/data-show="forgot"/);
 assert.match(auth,/resetPasswordForEmail/);
 assert.match(auth,/location\\.pathname\\.startsWith\\('\\/__maintenance\\/arcade\\/'\\)/);
 assert.match(auth,/location\\.origin\\+'\\/__maintenance\\/password-recovery'/);
 assert.match(auth,/redirectTo:location\\.pathname\\.startsWith/);
});
