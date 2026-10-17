'use client';
import { useState } from 'react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Button, Check, Empty, Field, Modal, PageHead, Tabs, useAction, useToast } from '@/components/ui';

const LABEL = { customer: 'Customers', staff: 'Staff', admin: 'Admins' };

export default function HelpGuides() {
  const toast = useToast();
  const guides = useApi('/help/manage');
  const [tab, setTab] = useState('customer');
  const [edit, setEdit] = useState(null);
  const [run, busy] = useAction();

  const save = () => run(async () => {
    const body = { audience: edit.audience, title: edit.title, body: edit.body, video_url: edit.video_url || null, sort: Number(edit.sort || 0), published: edit.published !== false };
    if (edit.id) await api.put(`/help/manage/${edit.id}`, body); else await api.post('/help/manage', body);
    setEdit(null); await guides.reload();
  }, 'Saved');
  const del = async (g) => {
    if (!(await toast.confirm({ title: `Delete "${g.title}"?`, message: 'People will no longer see this guide. You can bring back the standard guides with Restore defaults.', confirm: 'Delete', danger: true }))) return;
    run(async () => { await api.del(`/help/manage/${g.id}`); await guides.reload(); }, 'Deleted');
  };
  const restore = async (overwrite) => {
    if (overwrite && !(await toast.confirm({ title: 'Replace all standard guides?', message: 'Every standard guide goes back to the latest default text. Guides you wrote yourself are kept.', confirm: 'Replace them' }))) return;
    run(async () => { const r = await api.post('/help/manage/restore-defaults', { overwrite }); await guides.reload(); toast.ok(overwrite ? 'Guides reset' : `${r.restored} guide${r.restored === 1 ? '' : 's'} restored`); });
  };

  const rows = (guides.data || []).filter((g) => g.audience === tab);
  return (
    <div>
      <PageHead title="Help guides" sub="What your customers, staff and admins see. Add, edit or delete guides when things change.">
        <Button variant="ghost" loading={busy} onClick={() => restore(false)}>Restore deleted</Button>
        <Button variant="ghost" loading={busy} onClick={() => restore(true)}>Reset to latest defaults</Button>
        <Button variant="brand" onClick={() => setEdit({ audience: tab, title: '', body: '', video_url: '', sort: 50, published: true })}>Add a guide</Button>
      </PageHead>
      <Tabs tabs={Object.entries(LABEL).map(([k, l]) => ({ key: k, label: l }))} value={tab} onChange={setTab} />
      <Async state={guides}>
        {() => rows.length === 0 ? <Empty title="No guides for this group">Add one, or restore the defaults.</Empty> : (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Title</th><th>Video</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((g) => (
              <tr key={g.id}><td>{g.title}</td><td>{g.video_url ? 'Yes' : ''}</td><td>{g.published ? <Badge tone="good">Shown</Badge> : <Badge tone="warn">Hidden</Badge>}</td>
                <td className="right nowrap"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...g, video_url: g.video_url || '' })}>Edit</Button>{' '}<Button size="sm" variant="ghost" onClick={() => del(g)}>Delete</Button></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit guide' : 'Add a guide'} wide
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!edit?.title || !edit?.body} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="stack">
            <div className="form-grid">
              <Field label="Who sees it"><select className="input" value={edit.audience} onChange={(e) => setEdit({ ...edit, audience: e.target.value })}>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="Order" hint="Smaller numbers come first."><input className="input" inputMode="numeric" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: e.target.value.replace(/\D/g, '') })} /></Field>
            </div>
            <Field label="Title"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Video link (optional)" hint="An MP4 file or an embed link for a screen recording."><input className="input" value={edit.video_url} onChange={(e) => setEdit({ ...edit, video_url: e.target.value })} /></Field>
            <Field label="Text" hint="Leave a blank line between paragraphs. Start lines with 1. 2. 3. for numbered steps."><textarea className="input" style={{ minHeight: 220 }} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <Check title="Shown to people" checked={edit.published !== false} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
