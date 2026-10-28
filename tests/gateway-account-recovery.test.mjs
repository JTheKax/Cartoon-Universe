import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gateway=readFileSync(new URL('../server/gateway-candidate.mjs',import.meta.url),'utf8');
const auth=readFileSync(new URL('../auth.js',import.meta.url),'utf8');
const login=readFileSync(new URL('../login.html',import.meta.url),'utf8');
const nav=readFileSync(new URL('../nav-account-controls.js',import.meta.url),'utf8');
test('protected account dependencies and forgot password remain usable',()=>{
 assert.match(gateway,/ARCADE_FILES=new Set\(\[[^\]]*'config\.js'/);
 assert.match(gateway,/script-src 'self' https:\/\/esm\.sh/);
 assert.match(auth,/from '\.\/config\.js'/);
 assert.match(auth,/from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2'/);
 assert.match(login,/data-show="forgot"/);
 assert.match(auth,/resetPasswordForEmail/);
 assert.match(auth,/location\.pathname\.startsWith\('\/__maintenance\/arcade\/'\)/);
 assert.match(auth,/location\.origin\+'\/__maintenance\/password-recovery'/);
 assert.match(auth,/redirectTo:location\.pathname\.startsWith/);
});

test('protected owner logout clears gateway verification before Supabase sign-out',()=>{
 for(const [name,source] of [['account',auth],['navigation',nav]]){
  assert.ok(source.includes("location.pathname.startsWith('/__maintenance/arcade/')"),name+' must detect protected arcade');
  assert.ok(source.includes("fetch('/__maintenance/verify-session',{method:'DELETE',credentials:'same-origin'"),name+' must clear gateway cookie');
  const gateway=source.indexOf('await clearOwnerGatewaySession()');
  const signOut=source.indexOf('await client.auth.signOut()',gateway);
  assert.ok(gateway>=0&&signOut>gateway,name+' must clear gateway access before sign-out');
 }
});
