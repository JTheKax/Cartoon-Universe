import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {cutoverPlan,prepareCutoverBundle} from '../scripts/prepare-maintenance-cutover.mjs';
const target='https://cartoon-universe-gateway-candidate.onrender.com'; // Test string, not an allocated service.
async function temporary(t){const dir=await mkdtemp(join(tmpdir(),'cu-cutover-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
test('cutover plan rejects loops, insecure targets and ambiguous destinations',()=>{
 for(const value of ['https://cartoon-universe-3.onrender.com','http://example.com','https://*.onrender.com','https://example.com/path','https://example.com?redirect=elsewhere'])assert.throws(()=>cutoverPlan(value));
});
test('review bundle publishes no original HTML, scripts, assets or credentials',async t=>{
 const parent=await temporary(t),directory=join(parent,'review');
 const {plan}=await prepareCutoverBundle(target,directory);
 assert.deepEqual(await readdir(join(directory,'public')),['cutover.txt']);
 assert.deepEqual(JSON.parse(await readFile(join(directory,'render-routes.review.json'),'utf8')),[{type:'redirect',source:'/',destination:target+'/'},{type:'redirect',source:'/*',destination:target+'/*'}]);
 assert.equal(plan.sourceServiceId,'srv-dbeg2nu7bikc738b8ulg');assert.equal(plan.productionGatewayEnabled,false);assert.equal(plan.maintenanceActivation,'locked');
 assert.equal(plan.autoDeployTrigger,'off');assert.equal(plan.status,'review-only');
 assert.ok(plan.verifyPaths.includes('/static/cartoon-carnival.png'));assert.ok(plan.verifyPaths.includes('/login.html?type=recovery'));
 assert.doesNotMatch(await readFile(join(directory,'cutover.review.json'),'utf8'),/sb_(?:secret|publishable)_|access_token|refresh_token/);
});
test('nonempty output is never overwritten and existing website files remain intact',async t=>{
 const dir=await temporary(t);await writeFile(join(dir,'index.html'),'Existing website');
 await assert.rejects(prepareCutoverBundle(target,dir),/nonempty/);
 assert.equal(await readFile(join(dir,'index.html'),'utf8'),'Existing website');
 assert.deepEqual(await readdir(dir),['index.html']);
});
test('an existing empty directory can be used, but a second generation is rejected',async t=>{
 const parent=await temporary(t),directory=join(parent,'empty');await mkdir(directory);
 await prepareCutoverBundle(target,directory);
 await assert.rejects(prepareCutoverBundle(target,directory),/nonempty/);
});
test('CLI requires an explicit target and output and creates only the review bundle',async t=>{
 const parent=await temporary(t),directory=join(parent,'cli');
 const script=fileURLToPath(new URL('../scripts/prepare-maintenance-cutover.mjs',import.meta.url));
 const missing=spawnSync(process.execPath,[script],{encoding:'utf8'});assert.equal(missing.status,1);assert.match(missing.stderr,/Usage/);
 const result=spawnSync(process.execPath,[script,'--target',target,'--output',directory],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).status,'review-only');assert.deepEqual(await readdir(join(directory,'public')),['cutover.txt']);
});
