import test from 'node:test';import assert from 'node:assert/strict';
import {createFeatureNavigation} from './feature-navigation.mjs';
import {resolvePublicFeatureStatus} from './public-feature-status.mjs';
function documentStub(){
 return {createElement(tag){return {tag,children:[],attributes:{},textContent:'',className:'',href:'',append(child){this.children.push(child)},setAttribute(key,value){this.attributes[key]=value}}}};
}
test('navigation has a badge for every public feature',()=>{
 const nav=createFeatureNavigation(documentStub());
 assert.equal(nav.tag,'nav');assert.equal(nav.attributes['aria-label'],'Cartoon Universe features');
 assert.equal(nav.children.length,resolvePublicFeatureStatus().length);
 assert.ok(nav.children.every(link=>link.children.length===1&&link.children[0].textContent==='UNKNOWN'));
});
test('navigation badges match confirmed effective statuses',()=>{
 const options={routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance'}};
 const nav=createFeatureNavigation(documentStub(),options);
 assert.deepEqual(nav.children.map(link=>link.children[0].textContent),resolvePublicFeatureStatus(options).map(item=>item.status));
 assert.equal(nav.children[0].children[0].attributes['aria-label'],'Home Page: LIVE');
});
test('master override prevents LIVE badge',()=>{
 const nav=createFeatureNavigation(documentStub(),{routingConfirmed:true,masterMaintenance:true,routeStates:{home:'live'}});
 assert.ok(nav.children.every(link=>link.children[0].textContent==='MAINTENANCE'));
});
