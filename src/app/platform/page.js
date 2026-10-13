'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, setScope, setToken } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { dateOnly } from '@/lib/format';
import { Async, Badge, Banner, Button, Card, Check, Empty, Field, Loading, Modal, PageHead, Stat, Tabs, useAction, useToast } from '@/components/ui';

const TEMPLATES = [['full', 'Fuel, lubricants and shop'], ['fuel_lube', 'Fuel and lubricants'], ['fuel_shop', 'Fuel and shop'], ['fuel', 'Fuel only']];

export default function PlatformPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('stations');
  useEffect(() => {
    setScope('platform');
    if (!getToken()) router.replace('/platform/login'); else setReady(true);
    const onUnauth = () => router.replace('/platform/login');
    window.addEventListener('sd:unauthorized', onUnauth);
    return () => window.removeEventListener('sd:unauthorized', onUnauth);
  }, [router]);
  if (!ready) return <Loading />;
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand"><span className="logo-fallback">P</span><span>Platform owner</span></span>
        <div className="spacer" />
        <Button size="sm" variant="ghost" style={{ color: '#fff', borderColor: '#5c7080' }} onClick={() => { setToken(null); router.replace('/platform/login'); }}>Log out</Button>
      </header>
      <main className="main" style={{ paddingBottom: 40 }}>
        <PageHead title="Your stations" />
        <Tabs tabs={[{ key: 'stations', label: 'Stations' }, { key: 'admins', label: 'Multi-station owners' }, { key: 'help', label: 'Help centre' }]} value={tab} onChange={setTab} />
        {tab === 'stations' && <Stations />}
        {tab === 'admins' && <Admins />}
        {tab === 'help' && <Help />}
      </main>
    </div>
  );
}

function Stations() {
  const toast = useToast();
  const overview = useApi('/platform/overview');
  const list = useApi('/platform/stations');
  const [modal, setModal] = useState(null);
  const [team, setTeam] = useState(null);
  const teamData = useApi(team ? `/platform/stations/${team.id}/team` : null, { skip: !team });
  const [pw, setPw] = useState({ user_id: '', password: '' });
  const [run, busy] = useAction();
  const d = modal || {};
  const set = (k, v) => setModal((m) => ({ ...m, [k]: v }));

  const create = () => run(async () => {
    await api.post('/platform/stations', { name: d.name, slug: d.slug, template: d.template, brand_color: d.brand_color, address: d.address || null, phone: d.phone || null,
      admin_name: d.admin_name, admin_username: d.admin_username, admin_password: d.admin_password, admin_email: d.admin_email || null });
    setModal(null); await Promise.all([list.reload(), overview.reload()]);
  }, 'Station created');
  const toggle = (st) => run(async () => { await api.patch(`/platform/stations/${st.id}`, { active: !st.active }); await list.reload(); });
  const reset = () => run(async () => { await api.post(`/platform/stations/${team.id}/reset-password`, { user_id: Number(pw.user_id), password: pw.password }); setPw({ user_id: '', password: '' }); }, 'Password reset');

  return (
    <div className="stack">
      {overview.data && (
        <div className="grid c4">
          <Stat label="Stations" value={overview.data.stations.total} sub={`${overview.data.stations.active} active`} />
          <Stat label="Staff" value={overview.data.users.staff} />
          <Stat label="Customers" value={overview.data.users.customers} />
          <Stat label="Open shifts now" value={overview.data.open_shifts} />
        </div>
      )}
      <div><Button variant="brand" onClick={() => setModal({ name: '', slug: '', template: 'full', brand_color: '#F2A900', admin_name: '', admin_username: 'admin', admin_password: '' })}>Add a station</Button></div>
      <Async state={list} empty={<Empty title="No stations yet" />}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Station</th><th>Code</th><th className="num">Team</th><th className="num">Customers</th><th className="num">Products</th><th>Last sale</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((st) => (
              <tr key={st.id}>
                <td><strong>{st.name}</strong></td><td><Link href={`/s/${st.slug}`}>{st.slug}</Link></td><td className="num">{st.team}</td><td className="num">{st.customers}</td><td className="num">{st.products}</td>
                <td>{st.last_sale ? dateOnly(st.last_sale) : 'None yet'}</td><td><Badge tone={st.active ? 'good' : 'bad'}>{st.active ? 'Active' : 'Off'}</Badge></td>
                <td className="right nowrap"><Button size="sm" variant="ghost" onClick={() => setTeam(st)}>Team</Button>{' '}<Button size="sm" variant="ghost" onClick={() => toggle(st)}>{st.active ? 'Turn off' : 'Turn on'}</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>

      <Modal open={!!modal} onClose={() => setModal(null)} title="Add a station" wide
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!d.name || !d.slug || !d.admin_name || !d.admin_username || (d.admin_password || '').length < 6} onClick={create}>Create station</Button></>}>
        {modal && (
          <div className="stack">
            <div className="form-grid">
              <Field label="Station name"><input className="input" value={d.name} onChange={(e) => { set('name', e.target.value); if (!d._slugTouched) set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)); }} /></Field>
              <Field label="Station code" hint="Used in the web address, for example /s/this-code."><input className="input" value={d.slug} onChange={(e) => { setModal({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''), _slugTouched: true }); }} /></Field>
              <Field label="What does it sell?"><select className="input" value={d.template} onChange={(e) => set('template', e.target.value)}>{TEMPLATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="Brand colour"><input type="color" value={d.brand_color} onChange={(e) => set('brand_color', e.target.value)} style={{ width: 52, height: 44 }} /></Field>
              <Field label="Address"><input className="input" value={d.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={d.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            </div>
            <h3>Station admin</h3>
            <div className="form-grid">
              <Field label="Name"><input className="input" value={d.admin_name} onChange={(e) => set('admin_name', e.target.value)} /></Field>
              <Field label="Username"><input className="input" value={d.admin_username} onChange={(e) => set('admin_username', e.target.value.toLowerCase())} /></Field>
              <Field label="Password" hint="At least 6 characters. They can change it later."><input className="input" value={d.admin_password} onChange={(e) => set('admin_password', e.target.value)} /></Field>
              <Field label="Email (for summaries)"><input className="input" value={d.admin_email || ''} onChange={(e) => set('admin_email', e.target.value)} /></Field>
            </div>
            <Banner tone="info">The admin sets up tanks, pumps, prices and products themselves from the setup wizard, or you can do it for them by logging in as them.</Banner>
          </div>
        )}
      </Modal>

      <Modal open={!!team} onClose={() => setTeam(null)} title={`${team?.name || ''}: team`}>
        <Async state={teamData}>
          {(rows) => (
            <div className="stack">
              {rows.map((u) => <div key={u.id} className="row between"><span>{u.name} <span className="muted small">{u.username} · {u.role}</span></span><Badge tone={u.status === 'active' ? 'good' : 'bad'}>{u.status}</Badge></div>)}
              <hr className="sep" />
              <h4>Reset a password</h4>
              <Field label="Person"><select className="input" value={pw.user_id} onChange={(e) => setPw({ ...pw, user_id: e.target.value })}><option value="">Choose</option>{rows.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
              <Field label="New password"><input className="input" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
              <Button variant="brand" loading={busy} disabled={!pw.user_id || pw.password.length < 6} onClick={reset}>Reset password</Button>
            </div>
          )}
        </Async>
      </Modal>
    </div>
  );
}

function Admins() {
  const toast = useToast();
  const admins = useApi('/platform/admins');
  const stations = useApi('/platform/stations');
  const [sel, setSel] = useState({ user_id: '', station_id: '' });
  const [run, busy] = useAction();
  const link = () => run(async () => { await api.post('/platform/link-admin', { user_id: Number(sel.user_id), station_id: Number(sel.station_id) }); await admins.reload(); }, 'Access added');
  const unlink = (u, st) => run(async () => { await api.del('/platform/link-admin', { user_id: u.id, station_id: st.id }); await admins.reload(); }, 'Access removed');
  return (
    <div className="stack">
      <Banner tone="info">Give one admin access to several stations. They will see a combined view and can switch between stations. They sign in at each station&apos;s page using their own username.</Banner>
      <Card title="Give an admin another station">
        <div className="form-grid">
          <Field label="Admin"><select className="input" value={sel.user_id} onChange={(e) => setSel({ ...sel, user_id: e.target.value })}><option value="">Choose</option>{(admins.data || []).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.station})</option>)}</select></Field>
          <Field label="Also manages"><select className="input" value={sel.station_id} onChange={(e) => setSel({ ...sel, station_id: e.target.value })}><option value="">Choose</option>{(stations.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        </div>
        <Button className="mt" variant="brand" loading={busy} disabled={!sel.user_id || !sel.station_id} onClick={link}>Give access</Button>
      </Card>
      <Async state={admins}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Admin</th><th>Home station</th><th>Also manages</th></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}><td>{a.name} <span className="muted small">{a.username}</span></td><td>{a.station}</td>
                <td>{a.linked.length === 0 ? '' : a.linked.map((l) => <span key={l.id} style={{ marginRight: 8 }}><Badge>{l.name}</Badge> <button className="btn ghost sm" onClick={() => unlink(a, l)}>Remove</button></span>)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
    </div>
  );
}

function Help() {
  const articles = useApi('/platform/help');
  const [edit, setEdit] = useState(null);
  const [run, busy] = useAction();
  const save = () => run(async () => {
    const body = { audience: edit.audience, title: edit.title, body: edit.body, video_url: edit.video_url || null, sort: Number(edit.sort || 0), published: edit.published !== false };
    if (edit.id) await api.put(`/platform/help/${edit.id}`, body); else await api.post('/platform/help', body);
    setEdit(null); await articles.reload();
  }, 'Saved');
  const del = (a) => run(async () => { await api.del(`/platform/help/${a.id}`); await articles.reload(); }, 'Deleted');
  return (
    <div className="stack">
      <p className="muted">Guides shown on every station&apos;s Help page. Add a video link (an MP4 file or an embed link) to show a screen recording above the text.</p>
      <div><Button variant="brand" onClick={() => setEdit({ audience: 'customer', title: '', body: '', video_url: '', sort: 0, published: true })}>Add a guide</Button></div>
      <Async state={articles}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Audience</th><th>Title</th><th>Video</th><th /></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}><td>{a.audience}</td><td>{a.title}{!a.published && <> <Badge tone="warn">Hidden</Badge></>}</td><td>{a.video_url ? 'Yes' : ''}</td>
                <td className="right nowrap"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...a, video_url: a.video_url || '' })}>Edit</Button>{' '}<Button size="sm" variant="ghost" onClick={() => del(a)}>Delete</Button></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit guide' : 'Add a guide'} wide
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={!edit?.title || !edit?.body} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="stack">
            <div className="form-grid">
              <Field label="For"><select className="input" value={edit.audience} onChange={(e) => setEdit({ ...edit, audience: e.target.value })}><option value="customer">Customers</option><option value="staff">Staff</option><option value="admin">Admin</option></select></Field>
              <Field label="Order"><input className="input" inputMode="numeric" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: e.target.value.replace(/\D/g, '') })} /></Field>
            </div>
            <Field label="Title"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Video link (optional)"><input className="input" value={edit.video_url} onChange={(e) => setEdit({ ...edit, video_url: e.target.value })} placeholder="https://.../how-to-start-a-shift.mp4" /></Field>
            <Field label="Text" hint="Leave a blank line between paragraphs. Start lines with 1. 2. 3. for numbered steps."><textarea className="input" style={{ minHeight: 220 }} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <Check title="Published" checked={edit.published !== false} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
