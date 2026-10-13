'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Banner, Button, Card, PageHead, useAction, useToast } from '@/components/ui';

export default function PricesPage() {
  const s = useStation();
  const toast = useToast();
  const products = useApi('/catalog/products?active=1');
  const history = useApi('/catalog/price-history');
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [run, busy] = useAction();

  const update = async (p) => {
    const v = Number(drafts[p.id]);
    if (!Number.isFinite(v) || v < 0) return toast.error('Enter a valid price');
    const extra = p.sale_type === 'metered' ? ' Staff on shift with this fuel will be asked for a pump reading so the old and new prices apply to the right litres.' : '';
    if (!(await toast.confirm({ title: `Change price of ${p.name}${p.variant ? ' ' + p.variant : ''}?`, message: `From ${s.money(p.selling_price)} to ${s.money(v)}, starting now.${extra}`, confirm: 'Change price', cancel: 'Cancel' }))) return;
    run(async () => {
      await api.patch(`/catalog/products/${p.id}`, { selling_price: v });
      setDrafts((d) => { const n = { ...d }; delete n[p.id]; return n; });
      await Promise.all([products.reload(), history.reload()]);
    }, 'Price changed');
  };

  return (
    <div>
      <PageHead title="Prices" sub="Change a price at any time. It takes effect straight away and is saved in the history." />
      <Banner tone="info" title="Fuel prices:">When you change a pump price, staff who are on shift are asked to read the meter at that moment. You do not need to do anything else.</Banner>
      <div className="row mb mt"><input className="input" style={{ maxWidth: 300 }} placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" /></div>
      <Async state={products}>
        {(list) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Product</th><th className="num">Current price</th><th>New price</th><th /></tr></thead>
            <tbody>{list.filter((p) => `${p.name} ${p.variant || ''}`.toLowerCase().includes(search.toLowerCase())).map((p) => (
              <tr key={p.id}>
                <td>{p.name}{p.variant ? ` ${p.variant}` : ''}{p.sale_type === 'metered' && <span className="muted small"> per litre</span>}</td>
                <td className="num">{s.money(p.selling_price)}</td>
                <td><input className="input" style={{ maxWidth: 160, minHeight: 38 }} inputMode="decimal" value={drafts[p.id] ?? ''} placeholder="New price" onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value.replace(/[^0-9.]/g, '') })} aria-label={`New price for ${p.name}`} /></td>
                <td className="right"><Button size="sm" variant="brand" disabled={!drafts[p.id] || Number(drafts[p.id]) === Number(p.selling_price) || busy} onClick={() => update(p)}>Change</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
      <Card title="Recent price changes" className="mt">
        <Async state={history} empty={<p className="muted">No price changes yet.</p>}>
          {(list) => (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>When</th><th>Product</th><th className="num">From</th><th className="num">To</th><th>By</th></tr></thead>
              <tbody>{list.slice(0, 40).map((h) => <tr key={h.id}><td>{s.dt(h.effective_at)}</td><td>{h.name}{h.variant ? ` ${h.variant}` : ''}</td><td className="num">{s.money(h.old_price)}</td><td className="num">{s.money(h.price)}</td><td>{h.changed_by_name}</td></tr>)}</tbody>
            </table></div>
          )}
        </Async>
      </Card>
    </div>
  );
}
