'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { qs } from '@/lib/api';
import { Async, Empty, Modal, PageHead } from '@/components/ui';

export default function AuditPage() {
  const s = useStation();
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [open, setOpen] = useState(null);
  const log = useApi(`/audit${qs({ q: search, entity })}`);
  return (
    <div>
      <PageHead title="Audit trail" sub="Every change, who made it and when. Nothing here can be edited." />
      <div className="row mb">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search person or action" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select className="input" style={{ maxWidth: 220 }} value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Type">
          <option value="">Everything</option>
          {['sale', 'shift', 'product', 'restock', 'order', 'user', 'tank', 'pump', 'station', 'edit_request', 'expense', 'help'].map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
        </select>
      </div>
      <Async state={log} empty={<Empty title="Nothing found" />}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>About</th><th>Reason or note</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => setOpen(r)}>
                <td className="nowrap">{s.dt(r.created_at)}</td><td>{r.user_name}</td><td>{r.action.replace(/_/g, ' ')}</td><td>{r.entity ? `${r.entity.replace('_', ' ')} ${r.entity_id || ''}` : ''}</td><td>{r.note}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? open.action.replace(/_/g, ' ') : ''}>
        {open && (
          <div className="stack">
            <div className="small muted">{s.dt(open.created_at)} · {open.user_name}</div>
            {open.note && <div>{open.note}</div>}
            {open.before && <div><strong>Before</strong><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(open.before, null, 2)}</pre></div>}
            {open.after && <div><strong>After</strong><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(open.after, null, 2)}</pre></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
