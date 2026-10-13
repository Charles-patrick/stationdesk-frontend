'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Button, Field, Modal, PageHead, useAction, useToast } from '@/components/ui';

export default function TeamPage() {
  const s = useStation();
  const toast = useToast();
  const team = useApi('/users?role=staff,admin');
  const [modal, setModal] = useState(null);
  const [run, busy] = useAction();
  const d = modal?.data || {};
  const set = (k, v) => setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const save = () => run(async () => {
    if (modal.kind === 'add') await api.post('/users', { name: d.name, username: d.username, role: d.role, password: d.password, pin: d.pin || undefined, email: d.email || null, phone: d.phone || null });
    if (modal.kind === 'password') await api.patch(`/users/${d.id}`, { password: d.password });
    if (modal.kind === 'pin') await api.patch(`/users/${d.id}`, { pin: d.pin });
    setModal(null); await team.reload();
  }, 'Saved');
  const setStatus = async (u, status) => {
    if (status === 'blocked' && !(await toast.confirm({ title: `Turn off ${u.name}?`, message: 'They will not be able to log in. Their past records stay.', confirm: 'Turn off', danger: true }))) return;
    run(async () => { await api.patch(`/users/${u.id}`, { status }); await team.reload(); });
  };

  return (
    <div>
      <PageHead title="Team" sub="Everyone has their own login, so every action is tied to a name.">
        <Button variant="brand" onClick={() => setModal({ kind: 'add', data: { name: '', username: '', role: 'staff', password: '', pin: '', email: '', phone: '' } })}>Add a person</Button>
      </PageHead>
      <Async state={team}>
        {(list) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last login</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.open_shift_id && <> <Badge tone="info">On shift</Badge></>}</td><td>{u.username}</td><td>{u.role === 'admin' ? 'Admin' : 'Staff'}</td>
                <td>{u.last_login ? s.dt(u.last_login) : 'Never'}</td>
                <td><Badge tone={u.status === 'active' ? 'good' : 'bad'}>{u.status === 'active' ? 'Active' : 'Off'}</Badge></td>
                <td className="right nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'password', data: { id: u.id, name: u.name, password: '' } })}>New password</Button>{' '}
                  {u.role === 'staff' && <><Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'pin', data: { id: u.id, name: u.name, pin: '' } })}>{u.has_pin ? 'Change PIN' : 'Set PIN'}</Button>{' '}</>}
                  {u.id !== s.user.id && (u.status === 'active' ? <Button size="sm" variant="ghost" onClick={() => setStatus(u, 'blocked')}>Turn off</Button> : <Button size="sm" variant="ghost" onClick={() => setStatus(u, 'active')}>Turn on</Button>)}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
      <Modal open={!!modal} onClose={() => setModal(null)} title={{ add: 'Add a person', password: `New password for ${d.name}`, pin: `PIN for ${d.name}` }[modal?.kind] || ''}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="brand" loading={busy} onClick={save}>Save</Button></>}>
        {modal?.kind === 'add' && (
          <div className="form-grid">
            <Field label="Full name"><input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Username" hint="Lowercase, no spaces."><input className="input" value={d.username} onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} /></Field>
            <Field label="Role"><select className="input" value={d.role} onChange={(e) => set('role', e.target.value)}><option value="staff">Staff (attendant)</option><option value="admin">Admin</option></select></Field>
            <Field label="Password" hint="At least 6 characters."><input className="input" type="text" value={d.password} onChange={(e) => set('password', e.target.value)} /></Field>
            {d.role === 'staff' && <Field label="Quick PIN (optional)" hint="4 to 6 digits, for shared tablets."><input className="input" inputMode="numeric" value={d.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>}
            <Field label="Email (optional)"><input className="input" value={d.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone (optional)"><input className="input" value={d.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          </div>
        )}
        {modal?.kind === 'password' && <Field label="New password" hint="At least 6 characters. Tell the person privately."><input className="input" value={d.password} onChange={(e) => set('password', e.target.value)} /></Field>}
        {modal?.kind === 'pin' && <Field label="PIN" hint="4 to 6 digits."><input className="input" inputMode="numeric" value={d.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>}
      </Modal>
    </div>
  );
}
