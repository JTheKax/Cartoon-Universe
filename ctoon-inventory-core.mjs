// Pure, read-only CToon collection projection. Never grant ownership in the browser.
// Server must authorize inventory reads for the authenticated account using RLS.
export function buildCtoonCollection(catalog, inventory, options = {}) {
  if (!Array.isArray(catalog) || !Array.isArray(inventory)) throw new TypeError('Expected arrays');
  const owned = new Map();
  for (const row of inventory) {
    if (!row || typeof row.ctoon_id !== 'string' || !Number.isSafeInteger(row.quantity) || row.quantity < 0) continue;
    owned.set(row.ctoon_id, (owned.get(row.ctoon_id) || 0) + row.quantity);
  }
  const seen = new Set();
  const items = [];
  for (const row of catalog) {
    if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const quantity = owned.get(row.id) || 0;
    items.push({id:row.id, name:String(row.name || row.id), series:String(row.series || 'Misc'),
      category:String(row.category || 'Misc'), quantity, status:quantity > 0 ? 'Owned' : 'Need',
      duplicates:Math.max(0, quantity - 1)});
  }
  const query = String(options.query || '').trim().toLocaleLowerCase();
  const status = options.status || 'All';
  const filtered = items.filter(item => (!query || [item.name,item.series,item.category].some(s=>s.toLocaleLowerCase().includes(query)))
    && (status === 'All' || item.status === status));
  return {items:filtered, totals:{unique:items.length, owned:items.filter(x=>x.quantity>0).length,
    needed:items.filter(x=>x.quantity===0).length, copies:items.reduce((n,x)=>n+x.quantity,0),
    duplicates:items.reduce((n,x)=>n+x.duplicates,0)}};
}
