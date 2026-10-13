'use client';
import { useMemo, useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { AVAIL_LABEL, AVAIL_TONE, num } from '@/lib/format';
import { Async, Badge, Banner, Button, Card, Check, Empty, Field, Modal, PageHead, useAction, useToast } from '@/components/ui';

const SALE_TYPES = [['bulk', 'Bulk (drums, kegs, by container or litre)'], ['packaged', 'Packaged (fixed size packs)'], ['item', 'Individual item'], ['service', 'Service (no stock)'], ['metered', 'Metered (sold through a pump)']];
const blank = { name: '', variant: '', category_id: '', sale_type: '', unit: '', selling_price: '', cost_price: '', reorder_level: '', opening_stock: '', sku: '', orderable: false };
const SAMPLE = 'category\tname\tvariant\tunit\tprice\tstock\treorder_level\torderable\nLubricant Drums\tQ 7000 Drum\t\tdrum\t1700000\t6\t2\tyes\nMiscellaneous\tBottled water 75cl\t\tpiece\t300\t40\t10\tno';

function parseRows(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((l) => {
    const cells = l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const r = Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
    return { category: r.category, name: r.name, variant: r.variant || null, unit: r.unit || null, price: Number(String(r.price || r.selling_price || 0).replace(/,/g, '')),
      stock: Number(String(r.stock || 0).replace(/,/g, '')), reorder_level: Number(r.reorder_level || 0), orderable: /^(yes|true|1)$/i.test(r.orderable || '') };
  }).filter((r) => r.category && r.name);
}

export default function ProductsPage() {
  const s = useStation();
  const toast = useToast();
  const products = useApi('/catalog/products');
  const cats = useApi('/catalog/categories');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [edit, setEdit] = useState(null);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [run, busy] = useAction();
  const [newCat, setNewCat] = useState(null);

  const rows = useMemo(() => (products.data || []).filter((p) => (!catFilter || String(p.category_id) === catFilter) && `${p.name} ${p.variant || ''}`.toLowerCase().includes(search.toLowerCase())), [products.data, search, catFilter]);
  const parsed = useMemo(() => parseRows(text), [text]);
  const reload = () => Promise.all([products.reload(), cats.reload()]);

  const save = () => run(async () => {
    const body = {
      name: edit.name, variant: edit.variant || null, category_id: edit.category_id ? Number(edit.category_id) : null, sale_type: edit.sale_type || undefined,
      unit: edit.unit || undefined, selling_price: Number(edit.selling_price || 0), cost_price: edit.cost_price === '' || edit.cost_price == null ? null : Number(edit.cost_price),
      reorder_level: Number(edit.reorder_level || 0), sku: edit.sku || null, orderable: !!edit.orderable,
    };
    if (edit.id) await api.patch(`/catalog/products/${edit.id}`, { ...body, active: edit.active });
    else await api.post('/catalog/products', { ...body, opening_stock: Number(edit.opening_stock || 0) });
    setEdit(null); await reload();
  }, 'Product saved');
  const doImport = () => run(async () => {
    const r = await api.post('/catalog/products/import', { rows: parsed });
    setImporting(false); setText(''); await reload();
    toast.ok(`${r.created} added${r.skipped ? `, ${r.skipped} skipped because they already exist` : ''}`);
  });
  const addCat = () => run(async () => { await api.post('/catalog/categories', newCat); setNewCat(null); await cats.reload(); }, 'Category added');

  const catSale = (id) => (cats.data || []).find((c) => String(c.id) === String(id))?.sale_type;
  const effectiveType = edit ? edit.sale_type || catSale(edit.category_id) : '';

  return (
    <div>
      <PageHead title="Products" sub="Everything you sell, with prices and stock levels.">
        <Button variant="ghost" onClick={() => setNewCat({ name: '', sale_type: 'item' })}>Add category</Button>
        <Button variant="ghost" onClick={() => setImporting(true)}>Import from spreadsheet</Button>
        <Button variant="brand" onClick={() => setEdit({ ...blank })}>Add product</Button>
      </PageHead>
      <div className="row mb">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
        <select className="input" style={{ maxWidth: 240 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>{(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Async state={products} empty={<Empty title="No products yet">Add one, or import a whole list from a spreadsheet.</Empty>}>
        {() => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th><th>Online</th><th /></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'voided'}>
                <td>{p.name}{p.variant ? ` ${p.variant}` : ''}</td><td className="muted">{p.category}</td>
                <td className="num">{s.money(p.selling_price)}{p.sale_type === 'metered' ? '/L' : ''}</td>
                <td className="num">{p.sale_type === 'service' ? '' : `${num(p.stock_qty)} ${p.unit}`}</td>
                <td>{p.sale_type !== 'service' && <Badge tone={AVAIL_TONE[p.stock_status]}>{AVAIL_LABEL[p.stock_status]}</Badge>}</td>
                <td>{p.orderable ? <Badge tone="info">Orderable</Badge> : ''}</td>
                <td className="right"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...p, category_id: p.category_id || '', variant: p.variant || '', cost_price: p.cost_price ?? '', sku: p.sku || '' })}>Edit</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit product' : 'Add a product'} wide
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!edit?.name} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="stack">
            <div className="form-grid">
              <Field label="Name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Size or variant" hint="For example 5L, 4L or 1L."><input className="input" value={edit.variant} onChange={(e) => setEdit({ ...edit, variant: e.target.value })} /></Field>
              <Field label="Category">
                <select className="input" value={edit.category_id} onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}>
                  <option value="">None</option>{(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              {!edit.id && !edit.category_id && (
                <Field label="How is it sold?"><select className="input" value={edit.sale_type} onChange={(e) => setEdit({ ...edit, sale_type: e.target.value })}><option value="">Choose</option>{SALE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              )}
              <Field label="Unit" hint="drum, keg, pack, piece, litre..."><input className="input" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="Default for its type" /></Field>
              <Field label="Selling price" hint={edit.id ? 'Changing this records a price change in the history.' : undefined}><input className="input" inputMode="decimal" value={edit.selling_price} onChange={(e) => setEdit({ ...edit, selling_price: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
              <Field label="Cost price (optional)" hint="Used for profit estimates."><input className="input" inputMode="decimal" value={edit.cost_price} onChange={(e) => setEdit({ ...edit, cost_price: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
              {effectiveType !== 'metered' && effectiveType !== 'service' && <Field label="Reorder level" hint="You are alerted at or below this."><input className="input" inputMode="decimal" value={edit.reorder_level} onChange={(e) => setEdit({ ...edit, reorder_level: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>}
              {!edit.id && effectiveType !== 'metered' && effectiveType !== 'service' && <Field label="Stock you have now"><input className="input" inputMode="decimal" value={edit.opening_stock} onChange={(e) => setEdit({ ...edit, opening_stock: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>}
              <Field label="Code (optional)"><input className="input" value={edit.sku} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></Field>
            </div>
            {effectiveType !== 'metered' && <Check title="Customers can order this online" checked={!!edit.orderable} onChange={(e) => setEdit({ ...edit, orderable: e.target.checked })} />}
            {edit.id && <Check title="Active" desc="Turn off to hide it from sales and the shop without deleting it." checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />}
            {edit.id && !edit.image_url && <p className="muted small">Product photos can be added from the shop later.</p>}
          </div>
        )}
      </Modal>

      <Modal open={importing} onClose={() => setImporting(false)} title="Import from a spreadsheet" wide
        footer={<><Button variant="ghost" onClick={() => setImporting(false)}>Cancel</Button><Button variant="brand" loading={busy} disabled={parsed.length === 0} onClick={doImport}>Import {parsed.length} product{parsed.length === 1 ? '' : 's'}</Button></>}>
        <div className="stack">
          <p>Copy the rows from Excel or Google Sheets, including the header row, and paste them below. Columns: <code>category, name, variant, unit, price, stock, reorder_level, orderable</code>. Products that already exist are skipped. New categories are created for you.</p>
          <div><Button size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>Show an example</Button></div>
          <textarea className="input" style={{ minHeight: 200, fontFamily: 'monospace', fontSize: '0.85rem' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste here" />
          {text && <Banner tone={parsed.length ? 'good' : 'warn'}>{parsed.length ? `${parsed.length} rows ready. First: ${parsed[0].name} at ${s.money(parsed[0].price)}.` : 'No valid rows found. Check that the header row is included.'}</Banner>}
        </div>
      </Modal>

      <Modal open={!!newCat} onClose={() => setNewCat(null)} title="Add a category"
        footer={<><Button variant="ghost" onClick={() => setNewCat(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!newCat?.name} onClick={addCat}>Add</Button></>}>
        {newCat && (
          <div className="stack">
            <Field label="Name"><input className="input" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} /></Field>
            <Field label="How are these products sold?"><select className="input" value={newCat.sale_type} onChange={(e) => setNewCat({ ...newCat, sale_type: e.target.value })}>{SALE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
