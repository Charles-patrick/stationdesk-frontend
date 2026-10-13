'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { enqueue } from '@/lib/offline';
import { uuid } from '@/lib/format';
import { Async, Button, Card, Check, Empty, Field, Modal, PageHead, useAction, useToast } from '@/components/ui';

export default function ExpensesPage() {
  const s = useStation();
  const toast = useToast();
  const cats = useApi('/expenses/categories');
  const list = useApi('/expenses');
  const [f, setF] = useState({ category: '', amount: '', note: '', from_till: false });
  const [receipt, setReceipt] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [reason, setReason] = useState('');
  const [run, busy] = useAction();

  const save = (e) => {
    e.preventDefault();
    const payload = { category: f.category, amount: Number(f.amount), note: f.note || null, from_till: f.from_till, client_id: uuid() };
    run(async () => {
      try {
        const row = await api.post('/expenses', payload);
        if (receipt) await api.upload(`/expenses/${row.id}/receipt`, receipt).catch(() => toast.error('Saved, but the receipt photo did not upload'));
      } catch (err) {
        if (!err.network) throw err;
        enqueue(s.slug, { path: '/expenses', payload, label: `${f.category} expense` });
        toast.ok('No network. Saved on this phone and will send automatically.');
      }
      setF({ category: '', amount: '', note: '', from_till: false }); setReceipt(null);
      await list.reload();
    }, 'Expense saved');
  };
  const doVoid = () => run(async () => { await api.post(`/expenses/${voiding.id}/void`, { reason }); setVoiding(null); setReason(''); await list.reload(); }, 'Expense cancelled');

  return (
    <div>
      <PageHead title="Expenses" sub="Generator fuel, wages, repairs and other costs." />
      <Card title="Add an expense">
        <form className="stack" onSubmit={save}>
          <div className="form-grid">
            <Field label="Category">
              <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} required>
                <option value="">Choose</option>{(cats.data || []).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Amount"><input className="input" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') })} required /></Field>
            <Field label="Note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          </div>
          <Check title="Paid from the till" desc="Tick this if the money came out of the cash you are holding. It is taken off what you are expected to hand over." checked={f.from_till} onChange={(e) => setF({ ...f, from_till: e.target.checked })} />
          <Field label="Receipt photo (optional)"><input type="file" accept="image/*" capture="environment" onChange={(e) => setReceipt(e.target.files?.[0] || null)} /></Field>
          <div><Button type="submit" variant="brand" loading={busy}>Save expense</Button></div>
        </form>
      </Card>
      <Card title="Recent expenses" className="mt">
        <Async state={list} empty={<Empty title="No expenses yet" />}>
          {(rows) => (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>Date</th><th>Category</th><th className="num">Amount</th><th>Note</th><th>By</th><th /></tr></thead>
              <tbody>{rows.map((x) => (
                <tr key={x.id}><td>{s.dd(x.spent_at)}</td><td>{x.category}{x.from_till ? ' (till)' : ''}</td><td className="num">{s.money(x.amount)}</td><td>{x.note}{x.receipt_url && <> · <a href={x.receipt_url} target="_blank" rel="noreferrer">receipt</a></>}</td><td>{x.user_name}</td>
                  <td className="right"><Button size="sm" variant="ghost" onClick={() => { setVoiding(x); setReason(''); }}>Cancel</Button></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Async>
      </Card>
      <Modal open={!!voiding} onClose={() => setVoiding(null)} title="Cancel this expense?"
        footer={<><Button variant="ghost" onClick={() => setVoiding(null)}>Keep it</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={doVoid}>Cancel expense</Button></>}>
        <Field label="Why?"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}
