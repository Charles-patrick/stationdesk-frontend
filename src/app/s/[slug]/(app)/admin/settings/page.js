'use client';
import { useEffect, useState } from 'react';
import { useStation } from '@/lib/station';
import { api } from '@/lib/api';
import { Banner, Button, Card, Check, Field, PageHead, useAction, useToast } from '@/components/ui';

export default function SettingsPage() {
  const s = useStation();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [run, busy] = useAction();
  const [link, setLink] = useState('');
  useEffect(() => { if (s.fullStation) setF({ ...s.fullStation }); }, [s.fullStation]);
  useEffect(() => { setLink(`${window.location.origin}/s/${s.slug}`); }, [s.slug]);
  if (!f) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const save = () => run(async () => {
    const keys = ['name', 'brand_color', 'address', 'phone', 'email', 'ordering_enabled', 'delivery_enabled', 'delivery_note',
      'shift_alert_hours', 'cash_tolerance_pct', 'litre_tolerance_pct', 'summary_enabled', 'summary_hour', 'summary_email', 'timezone'];
    const body = Object.fromEntries(keys.map((k) => [k, f[k] === '' ? null : f[k]]));
    ['shift_alert_hours', 'cash_tolerance_pct', 'litre_tolerance_pct', 'summary_hour'].forEach((k) => { body[k] = Number(body[k]); });
    await api.patch('/station', body);
    await Promise.all([s.loadMe()]);
    window.location.reload();
  }, 'Settings saved');
  const logo = (e) => { const file = e.target.files?.[0]; if (file) run(async () => { await api.upload('/station/logo', file); window.location.reload(); }, 'Logo updated'); };

  return (
    <div>
      <PageHead title="Settings"><Button variant="brand" loading={busy} onClick={save}>Save changes</Button></PageHead>
      <div className="stack">
        <Card title="Your station">
          <div className="form-grid">
            <Field label="Station name"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Brand colour" hint="Used for buttons and highlights.">
              <div className="row"><input type="color" value={f.brand_color} onChange={(e) => set('brand_color', e.target.value)} style={{ width: 52, height: 44, border: '1.5px solid var(--line)', borderRadius: 8, padding: 2 }} aria-label="Brand colour" /><span>{f.brand_color}</span></div>
            </Field>
            <Field label="Logo">{s.station?.logo_url && <img src={s.station.logo_url} alt="Current logo" style={{ height: 48, objectFit: 'contain', alignSelf: 'flex-start' }} />}<input type="file" accept="image/*" onChange={logo} /></Field>
            <Field label="Address"><input className="input" value={f.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><input className="input" value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Time zone" hint="Used for daily summaries and monthly recaps."><input className="input" value={f.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
          </div>
          <div className="stack mt">
            <Banner tone="info" title="Your customer store:">{link} (also opens with the View store button)</Banner>
            <Banner tone="info" title="Your station code:">{s.slug}. Attendants use it on the Login page, on the Staff tab, the first time they log in on a device.</Banner>
          </div>
        </Card>
        <Card title="Online ordering">
          <div className="stack">
            <Check title="Let customers order online" desc="Customers order from your store without an account. Turn this off if you only want to use the sales and stock side." checked={!!f.ordering_enabled} onChange={(e) => set('ordering_enabled', e.target.checked)} />
            <Check title="We deliver" checked={!!f.delivery_enabled} onChange={(e) => set('delivery_enabled', e.target.checked)} />
            {f.delivery_enabled && <Field label="Delivery note shown to customers"><input className="input" value={f.delivery_note || ''} onChange={(e) => set('delivery_note', e.target.value)} placeholder="Delivery within the city only, fee agreed on confirmation" /></Field>}
          </div>
        </Card>
        <Card title="Checks and alerts">
          <div className="form-grid">
            <Field label="Alert me when a shift stays open for (hours)"><input className="input" inputMode="numeric" value={f.shift_alert_hours} onChange={(e) => set('shift_alert_hours', e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Cash difference allowed (%)" hint="A bigger gap is flagged."><input className="input" inputMode="decimal" value={f.cash_tolerance_pct} onChange={(e) => set('cash_tolerance_pct', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
            <Field label="Tank difference allowed (% of litres sold)" hint="A bigger gap between book stock and the dipstick is flagged."><input className="input" inputMode="decimal" value={f.litre_tolerance_pct} onChange={(e) => set('litre_tolerance_pct', e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
          </div>
        </Card>
        <Card title="Daily summary">
          <div className="stack">
            <Check title="Send a summary at the end of the day" desc="Sales, cash, stock alerts and waiting orders, by email and in the app." checked={!!f.summary_enabled} onChange={(e) => set('summary_enabled', e.target.checked)} />
            {f.summary_enabled && (
              <div className="form-grid">
                <Field label="Hour to send (0 to 23)"><input className="input" inputMode="numeric" value={f.summary_hour} onChange={(e) => set('summary_hour', e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
                <Field label="Send to this email"><input className="input" value={f.summary_email || ''} onChange={(e) => set('summary_email', e.target.value)} /></Field>
              </div>
            )}
          </div>
        </Card>
        <div><Button variant="brand" size="lg" loading={busy} onClick={save}>Save changes</Button></div>
      </div>
    </div>
  );
}
