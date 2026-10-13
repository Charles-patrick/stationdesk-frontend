'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { num } from '@/lib/format';
import { Async, Badge, Button, Card, Empty, Field, Modal, PageHead, Tabs, useAction, useToast } from '@/components/ui';

export default function SuppliersPage() {
  const s = useStation();
  const toast = useToast();
  const [tab, setTab] = useState('po');
  const sup = useApi('/suppliers');
  const pos = useApi('/suppliers/purchase-orders');
  const products = useApi('/catalog/products?active=1');
  const forecourt = useApi('/forecourt');
  const suggestions = useApi('/reports/reorder-suggestions');
  const [supModal, setSupModal] = useState(null);
  const [po, setPo] = useState(null);
  const [recv, setRecv] = useState(null);
  const [run, busy] = useAction();

  const saveSup = () => run(async () => {
    const body = { name: supModal.name, phone: supModal.phone || null, email: supModal.email || null, notes: supModal.notes || null };
    if (supModal.id) await api.patch(`/suppliers/${supModal.id}`, body); else await api.post('/suppliers', body);
    setSupModal(null); await sup.reload();
  }, 'Saved');

  const fromSuggestions = () => {
    const items = (suggestions.data || []).filter((r) => r.suggested_qty > 0).map((r) => ({ product_id: String(r.id), qty: String(r.suggested_qty), unit_cost: '', tank_id: '' }));
    if (!items.length) return toast.error('Nothing needs reordering right now');
    setPo({ supplier_id: '', note: '', items });
  };
  const savePo = () => run(async () => {
    await api.post('/suppliers/purchase-orders', {
      supplier_id: po.supplier_id ? Number(po.supplier_id) : null, note: po.note || null,
      items: po.items.filter((i) => i.product_id && Number(i.qty) > 0).map((i) => ({ product_id: Number(i.product_id), tank_id: i.tank_id ? Number(i.tank_id) : null, qty: Number(i.qty), unit_cost: i.unit_cost === '' ? null : Number(i.unit_cost) })),
    });
    setPo(null); await pos.reload();
  }, 'Purchase order created');
  const act = (o, what) => run(async () => {
    const r = await api.post(`/suppliers/purchase-orders/${o.id}/${what}`, what === 'receive' ? { waybill: recv?.waybill || null } : {});
    setRecv(null); await Promise.all([pos.reload(), products.reload()]);
    if (what === 'send' && r.emailed === false) toast.ok('Marked as sent. Email is not set up or the supplier has no email, so contact them yourself.');
  }, what === 'receive' ? 'Received and added to stock' : what === 'send' ? 'Marked as sent' : 'Cancelled');
  const setItem = (i, k, v) => setPo((p) => ({ ...p, items: p.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const prodById = (id) => (products.data || []).find((p) => String(p.id) === String(id));

  return (
    <div>
      <PageHead title="Suppliers and purchase orders">
        {tab === 'po' ? <><Button variant="ghost" onClick={fromSuggestions}>Order what is running low</Button><Button variant="brand" onClick={() => setPo({ supplier_id: '', note: '', items: [{ product_id: '', qty: '', unit_cost: '', tank_id: '' }] })}>New purchase order</Button></>
          : <Button variant="brand" onClick={() => setSupModal({ name: '' })}>Add supplier</Button>}
      </PageHead>
      <Tabs tabs={[{ key: 'po', label: 'Purchase orders' }, { key: 'sup', label: 'Suppliers' }]} value={tab} onChange={setTab} />
      {tab === 'sup' && (
        <Async state={sup} empty={<Empty title="No suppliers yet" />}>
          {(rows) => <div className="tablewrap"><table className="table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th /></tr></thead>
            <tbody>{rows.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.phone}</td><td>{x.email}</td><td className="right"><Button size="sm" variant="ghost" onClick={() => setSupModal({ ...x })}>Edit</Button></td></tr>)}</tbody></table></div>}
        </Async>
      )}
      {tab === 'po' && (
        <Async state={pos} empty={<Empty title="No purchase orders yet">Create one when you need to restock.</Empty>}>
          {(rows) => (
            <div className="stack">
              {rows.map((o) => (
                <Card key={o.id} title={`Order #${o.id}${o.supplier_name ? ` · ${o.supplier_name}` : ''}`} actions={<Badge tone={{ draft: '', sent: 'info', received: 'good', cancelled: 'bad' }[o.status]}>{o.status}</Badge>}>
                  <div className="small muted mb">{s.dt(o.created_at)}</div>
                  {o.items.map((i) => <div key={i.id} className="row between"><span>{i.name}</span><span>{num(i.qty)} {i.unit}</span></div>)}
                  {o.note && <p className="muted small mt">{o.note}</p>}
                  {(o.status === 'draft' || o.status === 'sent') && (
                    <div className="row mt">
                      {o.status === 'draft' && <Button size="sm" variant="ghost" loading={busy} onClick={() => act(o, 'send')}>Send to supplier</Button>}
                      <Button size="sm" variant="brand" onClick={() => setRecv({ ...o, waybill: '' })}>Mark as received</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(o, 'cancel')}>Cancel</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Async>
      )}

      <Modal open={!!supModal} onClose={() => setSupModal(null)} title={supModal?.id ? 'Edit supplier' : 'Add a supplier'}
        footer={<><Button variant="ghost" onClick={() => setSupModal(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!supModal?.name} onClick={saveSup}>Save</Button></>}>
        {supModal && <div className="form-grid">
          <Field label="Name"><input className="input" value={supModal.name || ''} onChange={(e) => setSupModal({ ...supModal, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={supModal.phone || ''} onChange={(e) => setSupModal({ ...supModal, phone: e.target.value })} /></Field>
          <Field label="Email (purchase orders are sent here)"><input className="input" value={supModal.email || ''} onChange={(e) => setSupModal({ ...supModal, email: e.target.value })} /></Field>
          <Field label="Notes"><input className="input" value={supModal.notes || ''} onChange={(e) => setSupModal({ ...supModal, notes: e.target.value })} /></Field>
        </div>}
      </Modal>

      <Modal open={!!po} onClose={() => setPo(null)} title="Purchase order" wide
        footer={<><Button variant="ghost" onClick={() => setPo(null)}>Cancel</Button><Button variant="brand" loading={busy} onClick={savePo}>Create order</Button></>}>
        {po && (
          <div className="stack">
            <Field label="Supplier"><select className="input" value={po.supplier_id} onChange={(e) => setPo({ ...po, supplier_id: e.target.value })}><option value="">Choose</option>{(sup.data || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            {po.items.map((it, i) => {
              const p = prodById(it.product_id);
              const tanks = (forecourt.data?.tanks || []).filter((t) => p && t.product_id === p.id);
              return (
                <div key={i} className="form-grid">
                  <Field label="Product"><select className="input" value={it.product_id} onChange={(e) => setItem(i, 'product_id', e.target.value)}><option value="">Choose</option>{(products.data || []).filter((x) => x.sale_type !== 'service').map((x) => <option key={x.id} value={x.id}>{x.name}{x.variant ? ` ${x.variant}` : ''}</option>)}</select></Field>
                  {p?.sale_type === 'metered' && <Field label="Into tank"><select className="input" value={it.tank_id} onChange={(e) => setItem(i, 'tank_id', e.target.value)}><option value="">Choose</option>{tanks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
                  <Field label={`Quantity${p ? ` (${p.unit})` : ''}`}><input className="input" inputMode="decimal" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
                  <Field label="Unit cost (optional)"><input className="input" inputMode="decimal" value={it.unit_cost} onChange={(e) => setItem(i, 'unit_cost', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
                </div>
              );
            })}
            <div><Button size="sm" variant="ghost" onClick={() => setPo({ ...po, items: [...po.items, { product_id: '', qty: '', unit_cost: '', tank_id: '' }] })}>Add another product</Button></div>
            <Field label="Note to the supplier"><input className="input" value={po.note} onChange={(e) => setPo({ ...po, note: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!recv} onClose={() => setRecv(null)} title={`Receive order #${recv?.id || ''}`}
        footer={<><Button variant="ghost" onClick={() => setRecv(null)}>Cancel</Button><Button variant="brand" loading={busy} onClick={() => act(recv, 'receive')}>Add to stock</Button></>}>
        {recv && <div className="stack"><p>This adds everything on the order to your stock.</p>{recv.items.some((i) => !i.tank_id && /litre/i.test(i.unit)) && <p className="muted small">Fuel items need a tank chosen on the order before they can be received.</p>}
          <Field label="Waybill or delivery number"><input className="input" value={recv.waybill} onChange={(e) => setRecv({ ...recv, waybill: e.target.value })} /></Field></div>}
      </Modal>
    </div>
  );
}
