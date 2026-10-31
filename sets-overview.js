// Unified Ctoon Sets Overview. Catalog is the source of truth; no invented ownership totals.
const grid = document.getElementById('sets-grid');
const slug = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function makeCard(name, category, isCategory = false) {
  const link = document.createElement('a');
  link.className = 'set-card';
  link.href = 'set-detail.html?series=' + encodeURIComponent(category) + (isCategory ? '' : '&subseries=' + encodeURIComponent(name));
  const img = document.createElement('img');
  img.className = 'set-logo';
  img.alt = name + ' logo';
  img.src = 'static/series-logos/' + slug(name) + '.png';
  img.hidden = true;
  const fallback = document.createElement('span');
  fallback.className = 'set-wordmark';
  fallback.textContent = name;
  img.addEventListener('load', () => { img.hidden = false; fallback.hidden = true; });
  img.addEventListener('error', () => { img.remove(); fallback.hidden = false; });
  const title = document.createElement('h2');
  title.textContent = name;
  link.append(img, fallback, title);
  return link;
}
async function loadSets() {
  try {
    const response = await fetch('data/ctoon-series-plan.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Catalog request failed (' + response.status + ')');
    const catalog = await response.json();
    if (!Array.isArray(catalog.categories)) throw new Error('Invalid catalog');
    grid.replaceChildren();
    for (const category of catalog.categories) {
      const section = document.createElement('section');
      section.className = 'set-category';
      const heading = document.createElement('h2');
      heading.textContent = category.name;
      section.append(heading, makeCard(category.name, category.name, true));
      if (category.series.length) {
        const subgrid = document.createElement('div');
        subgrid.className = 'sets-grid';
        for (const name of category.series) subgrid.append(makeCard(name, category.name));
        section.append(subgrid);
      } else {
        const note = document.createElement('p');
        note.className = 'sets-note';
        note.textContent = 'Coming Soon — no series published yet.';
        section.append(note);
      }
      grid.append(section);
    }
  } catch (error) {
    grid.textContent = 'Unable to load the Ctoon catalog. Please try again later.';
    console.error('Ctoon catalog:', error);
  }
}
loadSets();
