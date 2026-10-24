import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/<html lang="en">/i,'English language tag required');
assert.match(html,/<meta name="viewport"/i,'Responsive viewport required');
for(const path of ['styles.css','script.js'])assert.ok(fs.existsSync(path),path+' is missing');
for(const anchor of ['home','explore','roadmap','about'])assert.ok(html.includes('id="'+anchor+'"'),anchor+' section missing');
if(fs.existsSync('account.html')){
 const account=fs.readFileSync('account.html','utf8');
 for(const id of ['login','signup','forgot','password-update','profile','logout'])assert.ok(account.includes('id="'+id+'"'),'Missing account control '+id);
 assert.ok(fs.existsSync('supabase/schema.sql'),'Missing account database schema');
 assert.ok(fs.existsSync('PHASE2_SETUP.md'),'Missing account setup instructions');
}
console.log('Website checks passed');
