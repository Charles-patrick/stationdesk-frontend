'use client';
import { useState } from 'react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { num, reading } from '@/lib/format';
import { Async, Badge, Button, Card, Empty, Field, Lcd, Modal, PageHead, ProgressBar, useAction } from '@/components/ui';

export default function Forecourt() {
  const fc = useApi('/forecourt');
  const products = useApi('/catalog/products');
  const [modal, setModal] = useState(null); // {kind, data}
  const [run, busy] = useAction();
  const fuels = (products.data || []).filter((p) => p.sale_type === 'metered');
  const close = () => setModal(null);
  const set = (k, v) => setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));
  const d = modal?.data || {};

  const save = () => run(async () => {
    if (modal.kind === 'tank') await api.post('/forecourt/tanks', { product_id: Number(d.product_id), name: d.name, capacity_litres: Number(d.capacity || 0), litres: Number(d.litres || 0) });
    if (modal.kind === 'pump') await api.post('/forecourt/pumps', { product_id: Number(d.product_id), tank_id: d.tank_id ? Number(d.tank_id) : null, name: d.name, reading: Number(d.reading || 0) });
    if (modal.kind === 'reset') await api.post(`/forecourt/pumps/${d.id}/reset-meter`, { reading: Number(d.reading), reason: d.reason });
    if (modal.kind === 'fuel') await api.post('/catalog/products', { name: d.name, sale_type: 'metered', unit: d.unit || 'litre', selling_price: Number(d.price || 0) });
    close(); await Promise.all([fc.reload(), products.reload()]);
  }, 'Saved');
  const toggle = (kind, row) => run(async () => { await api.patch(`/forecourt/${kind}/${row.id}`, { active: !row.active }); await fc.reload(); });

  const tanksFor = (pid) => (fc.data?.tanks || []).filter((t) => String(t.product_id) === String(pid));

  return (
    <div>
      <PageHead title="Tanks and pumps" sub="Set these up once. Staff pick their pumps when they start a shift.">
        <Button variant="ghost" onClick={() => setModal({ kind: 'fuel', data: { name: '', unit: 'litre', price: '' } })}>Add a fuel</Button>
        <Button variant="ghost" onClick={() => setModal({ kind: 'tank', data: { product_id: fuels[0]?.id || '', name: '', capacity: '', litres: '' } })}>Add tank</Button>
        <Button variant="brand" onClick={() => setModal({ kind: 'pump', data: { product_id: fuels[0]?.id || '', tank_id: '', name: '', reading: '' } })}>Add pump</Button>
      </PageHead>
      <Async state={fc}>
        {({ tanks, pumps }) => (
          <div className="stack">
            <Card title="Tanks">
              {tanks.length === 0 ? <Empty title="No tanks yet">Add a tank for each fuel you store.</Empty> : (
                <div className="grid c3">{tanks.map((t) => (
                  <div key={t.id} className="pumpcard" style={{ opacity: t.active ? 1 : 0.5 }}>
                    <div className="row between"><h4>{t.name}</h4><span className="small muted">{t.product_name}</span></div>
                    <div className="row between"><strong>{num(t.current_litres)} L</strong><span className="small muted">capacity {num(t.capacity_litres)} L</span></div>
                    <ProgressBar value={t.current_litres} max={t.capacity_litres} />
                    <Button size="sm" variant="ghost" onClick={() => toggle('tanks', t)}>{t.active ? 'Turn off' : 'Turn on'}</Button>
                  </div>
                ))}</div>
              )}
            </Card>
            <Card title="Pumps">
              {pumps.length === 0 ? <Empty title="No pumps yet">Add each pump with its current meter reading.</Empty> : (
                <div className="pumpgrid">{pumps.map((p) => (
                  <div key={p.id} className="pumpcard" style={{ opacity: p.active ? 1 : 0.5 }}>
                    <div className="row between"><h4>{p.name}</h4><span className="small muted">{p.product_name}{p.tank_name ? ` · ${p.tank_name}` : ''}</span></div>
                    <Lcd caption="Last closing reading" value={reading(p.current_reading)} />
                    {p.on_shift ? <Badge tone="info">On {p.on_shift.user_name}&apos;s shift</Badge> : <Badge>Free</Badge>}
                    <div className="row">
                      <Button size="sm" variant="ghost" disabled={!!p.on_shift} onClick={() => setModal({ kind: 'reset', data: { id: p.id, name: p.name, reading: '', reason: '' } })}>Reset meter</Button>
                      <Button size="sm" variant="ghost" disabled={!!p.on_shift} onClick={() => toggle('pumps', p)}>{p.active ? 'Turn off' : 'Turn on'}</Button>
                    </div>
                  </div>
                ))}</div>
              )}
            </Card>
          </div>
        )}
      </Async>

      <Modal open={!!modal} onClose={close} title={{ tank: 'Add a tank', pump: 'Add a pump', reset: `Reset meter: ${d.name || ''}`, fuel: 'Add a fuel' }[modal?.kind] || ''}
        footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="brand" loading={busy} onClick={save}>Save</Button></>}>
        {modal?.kind === 'fuel' && (
          <div className="stack">
            <p className="muted">For other products sold through a meter, such as gas by the litre.</p>
            <Field label="Name"><input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Gas (LPG)" /></Field>
            <Field label="Unit"><input className="input" value={d.unit} onChange={(e) => set('unit', e.target.value)} /></Field>
            <Field label="Price per unit"><input className="input" inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
          </div>
        )}
        {modal?.kind === 'tank' && (
          <div className="stack">
            <Field label="Fuel"><select className="input" value={d.product_id} onChange={(e) => set('product_id', e.target.value)}>{fuels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Tank name"><input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Capacity (litres)"><input className="input" inputMode="decimal" value={d.capacity} onChange={(e) => set('capacity', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
            <Field label="In the tank now (litres)"><input className="input" inputMode="decimal" value={d.litres} onChange={(e) => set('litres', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
          </div>
        )}
        {modal?.kind === 'pump' && (
          <div className="stack">
            <Field label="Fuel"><select className="input" value={d.product_id} onChange={(e) => { set('product_id', e.target.value); set('tank_id', ''); }}>{fuels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Draws from tank"><select className="input" value={d.tank_id} onChange={(e) => set('tank_id', e.target.value)}><option value="">Not linked</option>{tanksFor(d.product_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Pump name"><input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Meter reading now"><input className="input" inputMode="decimal" value={d.reading} onChange={(e) => set('reading', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
          </div>
        )}
        {modal?.kind === 'reset' && (
          <div className="stack">
            <p>Use this when a meter is replaced or goes back to zero. The new starting reading is not counted as sales.</p>
            <Field label="New starting reading"><input className="input" inputMode="decimal" value={d.reading} onChange={(e) => set('reading', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
            <Field label="Reason (required)"><input className="input" value={d.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Meter replaced by the technician" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
