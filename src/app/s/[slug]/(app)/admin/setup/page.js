'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStation } from '@/lib/station';
import { api } from '@/lib/api';
import { Banner, Button, Card, Check, Field, PageHead, useAction } from '@/components/ui';

const TEMPLATES = [
  ['fuel', 'Fuel only', 'Pumps and tanks. You can add other products later.'],
  ['fuel_lube', 'Fuel and lubricants', 'Adds categories for drums, kegs and lubricant packs.'],
  ['fuel_shop', 'Fuel and shop', 'Adds a miscellaneous category for drinks, lamps and other items.'],
  ['full', 'Fuel, lubricants and shop', 'Everything above.'],
];
const FUELS = [['pms', 'Petrol (PMS)'], ['ago', 'Diesel (AGO)'], ['dpk', 'Kerosene (DPK)']];

export default function SetupWizard() {
  const s = useStation();
  const router = useRouter();
  const [run, busy] = useAction();
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState('full');
  const [fuels, setFuels] = useState({});

  const toggle = (k) => setFuels((f) => {
    const n = { ...f };
    if (n[k]) delete n[k];
    else n[k] = { price: '', tanks: [{ name: 'Tank 1', capacity: '', litres: '' }], pumps: [{ name: 'Pump 1', reading: '', tank: 0 }] };
    return n;
  });
  const upd = (k, fn) => setFuels((f) => ({ ...f, [k]: fn(f[k]) }));

  const finish = () => run(async () => {
    const body = {
      template,
      fuels: Object.entries(fuels).map(([key, f]) => ({
        key, price: Number(f.price || 0),
        tanks: f.tanks.filter((t) => t.name).map((t) => ({ name: t.name, capacity: Number(t.capacity || 0), litres: Number(t.litres || 0) })),
        pumps: f.pumps.filter((p) => p.name).map((p) => ({ name: p.name, reading: Number(p.reading || 0), tank: Number(p.tank || 0) })),
      })),
    };
    await api.post('/station/setup', body);
    router.replace(s.href('/admin/products'));
  }, 'Your station is set up');

  const bad = Object.values(fuels).some((f) => !f.price || f.tanks.some((t) => !t.name) || f.pumps.some((p) => !p.name));

  return (
    <div>
      <PageHead title="Set up your station" sub={`Step ${step} of 3. About half an hour in total.`} />
      {step === 1 && (
        <Card title="What does your station sell?">
          <div className="stack">
            {TEMPLATES.map(([k, label, desc]) => (
              <label key={k} className="card check" style={{ marginTop: 0, borderColor: template === k ? 'var(--ink)' : undefined }}>
                <input type="radio" name="tpl" checked={template === k} onChange={() => setTemplate(k)} />
                <span><span className="t">{label}</span><span className="d" style={{ display: 'block' }}>{desc}</span></span>
              </label>
            ))}
            <Button variant="brand" onClick={() => setStep(2)}>Next</Button>
          </div>
        </Card>
      )}
      {step === 2 && (
        <div className="stack">
          <Banner tone="info">Enter today&apos;s pump price, how much each tank holds, how much is in it now, and the number showing on each pump meter right now.</Banner>
          {FUELS.map(([k, label]) => (
            <Card key={k} title={label} actions={<Check title="We sell this" checked={!!fuels[k]} onChange={() => toggle(k)} />}>
              {fuels[k] && (
                <div className="stack">
                  <Field label="Price per litre"><input className="input" style={{ maxWidth: 200 }} inputMode="decimal" value={fuels[k].price} onChange={(e) => upd(k, (f) => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') }))} /></Field>
                  <h4>Tanks</h4>
                  {fuels[k].tanks.map((t, i) => (
                    <div key={i} className="form-grid">
                      <Field label="Name"><input className="input" value={t.name} onChange={(e) => upd(k, (f) => ({ ...f, tanks: f.tanks.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} /></Field>
                      <Field label="Capacity (litres)"><input className="input" inputMode="decimal" value={t.capacity} onChange={(e) => upd(k, (f) => ({ ...f, tanks: f.tanks.map((x, j) => (j === i ? { ...x, capacity: e.target.value.replace(/[^0-9.]/g, '') } : x)) }))} /></Field>
                      <Field label="In the tank now (litres)"><input className="input" inputMode="decimal" value={t.litres} onChange={(e) => upd(k, (f) => ({ ...f, tanks: f.tanks.map((x, j) => (j === i ? { ...x, litres: e.target.value.replace(/[^0-9.]/g, '') } : x)) }))} /></Field>
                    </div>
                  ))}
                  <div><Button size="sm" variant="ghost" onClick={() => upd(k, (f) => ({ ...f, tanks: [...f.tanks, { name: `Tank ${f.tanks.length + 1}`, capacity: '', litres: '' }] }))}>Add another tank</Button></div>
                  <h4>Pumps</h4>
                  {fuels[k].pumps.map((p, i) => (
                    <div key={i} className="form-grid">
                      <Field label="Name"><input className="input" value={p.name} onChange={(e) => upd(k, (f) => ({ ...f, pumps: f.pumps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} /></Field>
                      <Field label="Meter reading now"><input className="input" inputMode="decimal" value={p.reading} onChange={(e) => upd(k, (f) => ({ ...f, pumps: f.pumps.map((x, j) => (j === i ? { ...x, reading: e.target.value.replace(/[^0-9.]/g, '') } : x)) }))} /></Field>
                      <Field label="Draws from tank">
                        <select className="input" value={p.tank} onChange={(e) => upd(k, (f) => ({ ...f, pumps: f.pumps.map((x, j) => (j === i ? { ...x, tank: Number(e.target.value) } : x)) }))}>
                          {fuels[k].tanks.map((t, ti) => <option key={ti} value={ti}>{t.name || `Tank ${ti + 1}`}</option>)}
                        </select>
                      </Field>
                    </div>
                  ))}
                  <div><Button size="sm" variant="ghost" onClick={() => upd(k, (f) => ({ ...f, pumps: [...f.pumps, { name: `Pump ${f.pumps.length + 1}`, reading: '', tank: 0 }] }))}>Add another pump</Button></div>
                </div>
              )}
            </Card>
          ))}
          <div className="row"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button variant="brand" disabled={bad} onClick={() => setStep(3)}>Next</Button></div>
        </div>
      )}
      {step === 3 && (
        <Card title="Ready to finish?">
          <div className="stack">
            <p>Template: <strong>{TEMPLATES.find((t) => t[0] === template)[1]}</strong></p>
            <p>Fuels: {Object.keys(fuels).length ? Object.keys(fuels).map((k) => FUELS.find((f) => f[0] === k)[1]).join(', ') : 'none (you can add them later under Tanks and pumps)'}</p>
            <p className="muted">After this you can add lubricants and shop items under Products, and your team under Team. You can paste a whole product list from a spreadsheet.</p>
            <div className="row"><Button variant="ghost" onClick={() => setStep(2)}>Back</Button><Button variant="brand" loading={busy} onClick={finish}>Finish setup</Button></div>
          </div>
        </Card>
      )}
    </div>
  );
}
