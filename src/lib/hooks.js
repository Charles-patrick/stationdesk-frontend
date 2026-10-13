'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// Load data from the API. Re-runs when the path changes.
export function useApi(path, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!skip);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = useCallback(async () => {
    if (skip || !path) return;
    setLoading(true);
    try {
      const d = await api.get(path);
      if (alive.current) { setData(d); setError(''); }
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path, skip]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
