import test from 'node:test';import assert from 'node:assert/strict';
import {resolvePublicFeatureStatus,PUBLIC_FEATURES} from './public-feature-status.mjs';
test('unconfirmed routing never advertises LIVE',()=>assert.ok(resolvePublicFeatureStatus({masterMaintenance:false,routeStates:{home:'live'}}).every(x=>x.status==='UNKNOWN')));
test('master maintenance overrides all routes',()=>assert.ok(resolvePublicFeatureStatus({routingConfirmed:true,masterMaintenance:true,routeStates:{home:'live'}}).every(x=>x.status==='MAINTENANCE')));
test('confirmed per-route status is accurate',()=>{const states=resolvePublicFeatureStatus({routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance'}});assert.equal(states[0].status,'LIVE');assert.equal(states[1].status,'MAINTENANCE');assert.equal(states[2].status,'UNKNOWN')});
test('registry has unique identifiers and safe paths',()=>{assert.equal(new Set(PUBLIC_FEATURES.map(x=>x.id)).size,PUBLIC_FEATURES.length);assert.ok(PUBLIC_FEATURES.every(x=>x.path.startsWith('/')))});
