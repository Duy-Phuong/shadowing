// Run in the browser pane with javascript_tool while a page on https://phuongdocs.notion.site is open.
// Set PAGE_IDS to the dashed Notion page ids to export (or call listDatabase() first).
// Result: window.__export = [{id, title, md, imgs:[{block,url}]}]; return it in slices with
//   JSON.stringify(__export.slice(0, 60))   (large outputs are saved to a tool-results file).
const SPACE = '5404e5ec-e304-4fad-bebe-7f816b5a589d';
const DB = { collection: '079662eb-b9d7-4323-b12b-d33f268fd05a', view: '0896b6f5-29ad-4ac5-a80b-44fb64f51300' };
const V = b => b && (b.value && b.value.value ? b.value.value : b.value);
const rt = a => (a || []).map(x => { let t = x[0]; for (const z of (x[1] || [])) { if (z[0] === 'b') t = '**' + t + '**'; else if (z[0] === 'a') t += ' <' + z[1] + '>'; } return t === '‣' ? '' : t; }).join('');
const post = (p, body) => fetch('/api/v3/' + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

async function listDatabase() {   // all pages of the "English grammar" database, newest first
  const j = await post('queryCollection', { collection: { id: DB.collection }, collectionView: { id: DB.view },
    loader: { type: 'reducer', reducers: { collection_group_results: { type: 'results', limit: 1000 } }, searchQuery: '', userTimeZone: 'Asia/Ho_Chi_Minh' } });
  return j.result.reducerResults.collection_group_results.blockIds.map(id => {
    const v = V(j.recordMap.block[id]); return { id, title: rt((v.properties || {}).title), created: new Date(v.created_time).toISOString().slice(0, 10) };
  });
}
async function loadAll(pageId) {
  const blocks = {}; let cursor = { stack: [] }, n = 0;
  do { const j = await post('loadPageChunk', { pageId, limit: 100, cursor, chunkNumber: n, verticalColumns: false });
       Object.assign(blocks, (j.recordMap || {}).block || {}); cursor = j.cursor || { stack: [] }; n++; } while (cursor.stack && cursor.stack.length && n < 40);
  return blocks;
}
function render(id, blocks, depth, out, imgs) {
  const v = V(blocks[id]); if (!v) return; const p = v.properties || {}, ind = '  '.repeat(depth), T = rt(p.title);
  const H = { header: '\n# ', sub_header: '\n## ', sub_sub_header: '\n### ', bulleted_list: ind + '- ', numbered_list: ind + '1. ', to_do: ind + '- [ ] ', toggle: ind + '> ', quote: ind + '| ', callout: ind + '[callout] ', text: ind };
  if (v.type === 'image') {
    let src = (v.format && v.format.display_source) || (p.source && p.source[0][0]) || '';
    const proxied = src.includes('attachment:') || src.includes('amazonaws.com');   // Notion-hosted → must go through the proxy
    imgs.push({ block: id, url: proxied ? 'https://phuongdocs.notion.site/image/' + encodeURIComponent(src) + '?table=block&id=' + id + '&spaceId=' + SPACE + '&width=1300&cache=v2' : src });
    out.push(ind + '[IMAGE #' + imgs.length + ']' + (p.caption ? ' caption: ' + rt(p.caption) : ''));
  } else if (v.type === 'table') {
    const order = (v.format && v.format.table_block_column_order) || [];
    for (const rid of (v.content || [])) { const rp = (V(blocks[rid]) || {}).properties || {}; out.push(ind + '| ' + order.map(c => rt(rp[c]).replace(/\n/g, ' / ')).join(' | ') + ' |'); }
    return;
  } else if (H[v.type] !== undefined) out.push(H[v.type] + T);
  else if (v.type === 'code') out.push('```\n' + T + '\n```');
  else if (v.type === 'bookmark') out.push(ind + '[bookmark] ' + rt(p.link));
  else if (v.type === 'page') { out.push(ind + '[subpage] ' + T); return; }
  else if (!['column_list', 'column', 'divider'].includes(v.type)) out.push(ind + '[' + v.type + '] ' + T);
  const flat = ['column_list', 'column'].includes(v.type);
  for (const k of (v.content || [])) render(k, blocks, flat ? depth : depth + 1, out, imgs);
}
async function exportPages(ids) {
  window.__export = []; let i = 0;
  async function worker() { while (i < ids.length) { const id = ids[i++]; const blocks = await loadAll(id); const pv = V(blocks[id]);
    const out = [], imgs = []; for (const k of ((pv && pv.content) || [])) render(k, blocks, 0, out, imgs);
    __export.push({ id, title: rt(((pv || {}).properties || {}).title), md: out.join('\n'), imgs }); } }
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  return __export.map(p => `${p.title} | ${p.md.length} chars | ${p.imgs.length} imgs`).join('\n');
}
