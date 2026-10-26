// Review-only, public-safe status registry. Actual availability must be confirmed by routing.
export const PUBLIC_FEATURES=Object.freeze([
 {id:'home',label:'Home Page',path:'/'},
 {id:'arcade',label:'Arcade',path:'/arcade/'},
 {id:'shop',label:'Cartoon Coin Shop',path:'/shop/'},
 {id:'profiles',label:'Player Profiles',path:'/profiles/'},
 {id:'leaderboards',label:'Leaderboards',path:'/leaderboards/'}
]);
export function resolvePublicFeatureStatus({features=PUBLIC_FEATURES,masterMaintenance=true,routeStates={},routingConfirmed=false}={}){
 return features.map(feature=>{
  const state=routeStates[feature.id];
  const status=!routingConfirmed?'UNKNOWN':masterMaintenance?'MAINTENANCE':state==='live'?'LIVE':state==='maintenance'?'MAINTENANCE':'UNKNOWN';
  return {...feature,status};
 });
}
