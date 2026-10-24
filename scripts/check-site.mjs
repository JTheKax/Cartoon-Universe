import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/<html lang="en">/i,'English language tag required');
assert.match(html,/<meta name="viewport"/i,'Responsive viewport required');
for(const path of ['styles.css','script.js','auth.js','login.html','register.html','account.html'])assert.ok(fs.existsSync(path),path+' is missing');
for(const anchor of ['home','explore','roadmap','about'])assert.ok(html.includes('id="'+anchor+'"'),anchor+' section missing');
assert.ok(html.includes('href="login.html"'),'Account dropdown must link to Login');
assert.ok(html.includes('href="register.html"'),'Account dropdown must link to Register');
for(const path of ['login.html','register.html']){
 const page=fs.readFileSync(path,'utf8');
 for(const id of ['login','signup','forgot','password-update','profile','logout'])assert.ok(page.includes('id="'+id+'"'),path+': missing account control '+id);
 assert.ok(page.includes('src="auth.js"'),path+': missing auth script');
 assert.ok(!page.includes('PLAYER PORTAL'),path+': obsolete Player Portal heading');
}
const legacy=fs.readFileSync('account.html','utf8');
assert.ok(legacy.includes('login.html'),'Legacy account links must redirect to Login');
assert.ok(!legacy.includes('PLAYER PORTAL'),'Player Portal must be removed');
assert.ok(fs.existsSync('supabase/schema.sql'),'Missing account database schema');
assert.ok(fs.existsSync('PHASE2_SETUP.md'),'Missing account setup instructions');
console.log('Website checks passed');
