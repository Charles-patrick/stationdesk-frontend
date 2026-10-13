'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Button, Card, Empty, PageHead, useAction } from '@/components/ui';

const LABEL = { void_sale: 'Cancel a sale', edit_sale_qty: 'Change a sale quantity', edit_shift_cash: 'Change cash totals' };

export default function Approvals() {
  const s = useStation();
  const list = useApi('/approvals');
  const [run, busy] = useAction();
  const [note, setNote] = useState({});
  const decide = (r, approve) => run(async () => { await api.post(`/approvals/${r.id}/decide`, { approve, note: note[r.id] || null }); await list.reload(); await s.loadMe(); }, approve ? 'Approved and applied' : 'Rejected');
  return (
    <div>
      <PageHead title="Approvals" sub="Closed shifts are locked. Staff ask here when something needs fixing." />
      <Async state={list} empty={<Empty title="Nothing to approve" />}>
        {(rows) => (
          <div className="stack">
            {rows.map((r) => (
              <Card key={r.id}>
                <div className="row between"><strong>{LABEL[r.type]}</strong><Badge tone={r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'good' : 'bad'}>{r.status}</Badge></div>
                <p className="small muted" style={{ margin: '4px 0' }}>{r.requested_by_name} · {s.dt(r.created_at)}</p>
                {r.sale && <p>{r.sale.qty} × {r.sale.product_name} ({s.money(r.sale.amount)}){r.type === 'edit_sale_qty' ? `, change quantity to ${r.payload.qty}` : ''}</p>}
                {r.type === 'edit_shift_cash' && <p>New totals: cash {s.money(r.payload.cash)}, transfers {s.money(r.payload.transfer)}, POS {s.money(r.payload.pos)}</p>}
                <p><span className="muted">Reason:</span> {r.reason}</p>
                {r.status === 'pending' ? (
                  <div className="row">
                    <input className="input" style={{ maxWidth: 280 }} placeholder="Note (optional)" value={note[r.id] || ''} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} />
                    <Button variant="brand" loading={busy} onClick={() => decide(r, true)}>Approve</Button>
                    <Button variant="ghost" disabled={busy} onClick={() => decide(r, false)}>Reject</Button>
                  </div>
                ) : <p className="small muted">Decided by {r.decided_by_name}{r.decision_note ? `: ${r.decision_note}` : ''}</p>}
              </Card>
            ))}
          </div>
        )}
      </Async>
    </div>
  );
}
