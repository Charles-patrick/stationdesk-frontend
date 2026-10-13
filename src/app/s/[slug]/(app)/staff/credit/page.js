'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Button, Card, Empty, Field, Modal, PageHead, Stat, useAction, useToast } from '@/components/ui';

export default function CreditPage() {
  const s = useStation();
  const toast = useToast();
  const list = useApi('/credit/customers');
  const summary = useApi('/credit/summary', { skip: s.role !== 'admin' });
  const [pay, setPay] = useState(null);
  const [amount, setAmount] = useState('');
  const [ledger, setLedger] = useState(null);
  const ledgerData = useApi(ledger ? `/credit/customers/${ledger.id}` : null, { skip: !ledger });
  const [edit, setEdit] = useState(null);
  const [run, busy] = useAction();
  const reload = () => Promise.all([list.reload(), summary.reload()]);

  const savePay = () => run(async () => { await api.post(`/credit/customers/${pay.id}/payment`, { amount: Number(amount) }); setPay(null); setAmount(''); await reload(); }, 'Payment recorded');
  const saveCustomer = () => run(async () => {
    const body = { name: edit.name, company: edit.company || null, phone: edit.phone || null, email: edit.email || null, credit_limit: Number(edit.credit_limit || 0), notes: edit.notes || null };
    if (edit.id) await api.patch(`/credit/customers/${edit.id}`, body); else await api.post('/credit/customers', body);
    setEdit(null); await reload();
  }, 'Saved');
  const remind = (c) => run(async () => { const r = await api.post(`/credit/customers/${c.id}/reminder`); toast[r.sent ? 'ok' : 'error'](r.sent ? 'Reminder emailed' : 'Email is not set up on the server, so nothing was sent'); });

  return (
    <div>
      <PageHead title="Credit customers" sub="People who buy now and pay later.">
        {s.role === 'admin' && <Button variant="brand" onClick={() => setEdit({ name: '', credit_limit: 0 })}>Add customer</Button>}
      </PageHead>
      {summary.data && <div className="grid c3 mb"><Stat label="Total owed to you" value={s.money(summary.data.total_owed)} /><Stat label="Customers who owe" value={summary.data.debtors} /></div>}
      <Async state={list} empty={<Empty title="No credit customers yet">{s.role === 'admin' ? 'Add the people you sell to on credit.' : 'Ask the admin to add credit customers.'}</Empty>}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Customer</th><th>Phone</th><th className="num">Owes</th><th className="num">Limit</th><th /></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}{c.company ? <span className="muted"> · {c.company}</span> : null}{!c.active && <> <Badge>Inactive</Badge></>}</td><td>{c.phone}</td>
                <td className="num" style={{ fontWeight: 650, color: c.balance > 0 ? 'var(--bad)' : undefined }}>{s.money(c.balance)}</td>
                <td className="num">{c.credit_limit ? s.money(c.credit_limit) : 'No limit'}</td>
                <td className="right nowrap">
                  <Button size="sm" variant="ghost" onClick={() => { setPay(c); setAmount(''); }}>Record payment</Button>{' '}
                  <Button size="sm" variant="ghost" onClick={() => setLedger(c)}>Ledger</Button>
                  {s.role === 'admin' && <>{' '}<Button size="sm" variant="ghost" onClick={() => setEdit({ ...c })}>Edit</Button>{c.balance > 0 && <>{' '}<Button size="sm" variant="ghost" onClick={() => remind(c)}>Remind</Button></>}</>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>

      <Modal open={!!pay} onClose={() => setPay(null)} title={`Payment from ${pay?.name || ''}`}
        footer={<><Button variant="ghost" onClick={() => setPay(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!amount} onClick={savePay}>Record payment</Button></>}>
        <p className="muted">They owe {s.money(pay?.balance)}. The payment counts toward your cash on this shift.</p>
        <Field label="Amount received"><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} /></Field>
      </Modal>

      <Modal open={!!ledger} onClose={() => setLedger(null)} title={`Ledger: ${ledger?.name || ''}`} wide>
        <Async state={ledgerData}>
          {(d) => (
            <div className="stack">
              <Stat label="Balance owed" value={s.money(d.balance)} />
              <div className="tablewrap"><table className="table">
                <thead><tr><th>Date</th><th>What</th><th className="num">Amount</th></tr></thead>
                <tbody>{d.entries.map((e) => <tr key={e.id}><td>{s.dt(e.created_at)}</td><td>{e.type === 'payment' ? 'Payment received' : e.description}</td><td className="num" style={{ color: e.type === 'payment' ? 'var(--good)' : undefined }}>{e.type === 'payment' ? '−' : ''}{s.money(e.amount)}</td></tr>)}</tbody>
              </table></div>
            </div>
          )}
        </Async>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit customer' : 'Add a credit customer'}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!edit?.name} onClick={saveCustomer}>Save</Button></>}>
        {edit && (
          <div className="form-grid">
            <Field label="Name"><input className="input" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Company"><input className="input" value={edit.company || ''} onChange={(e) => setEdit({ ...edit, company: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Email (for reminders)"><input className="input" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label="Credit limit" hint="Use 0 for no limit."><input className="input" inputMode="decimal" value={edit.credit_limit ?? 0} onChange={(e) => setEdit({ ...edit, credit_limit: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
            <Field label="Notes"><input className="input" value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
