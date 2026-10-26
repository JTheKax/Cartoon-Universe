import test from 'node:test';
import assert from 'node:assert/strict';
import {isSupabaseConfigured} from '../supabase-config.js';
const key='sb_publishable_disposable_test_key_only';
test('browser account setup accepts HTTPS and the exact local Supabase API',()=>{
 for(const url of ['https://example.supabase.co','https://example.supabase.co/','http://127.0.0.1:54321'])
  assert.equal(isSupabaseConfigured(url,key),true,url);
});
test('browser account setup rejects insecure external and ambiguous URLs',()=>{
 for(const url of ['http://example.supabase.co','http://127.0.0.1:9999','http://localhost:54321','https://user:pass@example.supabase.co','https://example.supabase.co/path','https://example.supabase.co?query','https://example.supabase.co#hash','not a URL'])
  assert.equal(isSupabaseConfigured(url,key),false,url);
});
test('browser account setup rejects missing and placeholder keys',()=>{
 for(const value of [undefined,null,'','placeholder'])assert.equal(isSupabaseConfigured('https://example.supabase.co',value),false);
});
