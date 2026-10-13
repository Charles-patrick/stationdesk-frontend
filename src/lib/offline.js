'use client';
// Sales and expenses entered with no signal are kept on the phone and sent when the network returns.
const qkey = (slug) => `sd_queue:${slug}`;
const fkey = (slug) => `sd_failed:${slug}`;
const listeners = new Set();

const read = (k) => { try { return JSON.parse(window.localStorage.getItem(k) || '[]'); } catch { return []; } };
const write = (k, v) => { window.localStorage.setItem(k, JSON.stringify(v)); listeners.forEach((l) => l()); };

export const getQueue = (slug) => (typeof window === 'undefined' ? [] : read(qkey(slug)));
export const getFailed = (slug) => (typeof window === 'undefined' ? [] : read(fkey(slug)));
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const clearFailed = (slug) => write(fkey(slug), []);

export function enqueue(slug, item) {
  write(qkey(slug), [...read(qkey(slug)), { ...item, queued_at: new Date().toISOString() }]);
}

let flushing = false;
export async function flushQueue(slug, api) {
  if (flushing || typeof window === 'undefined') return { sent: 0 };
  flushing = true;
  let sent = 0;
  try {
    let queue = read(qkey(slug));
    while (queue.length) {
      const item = queue[0];
      try {
        await api.post(item.path, item.payload);
        sent += 1;
      } catch (err) {
        if (err.network) break; // still offline, try again later
        // The server refused it (for example not enough stock). Keep it visible so staff can fix it.
        write(fkey(slug), [...read(fkey(slug)), { ...item, error: err.message }]);
      }
      queue = queue.slice(1);
      write(qkey(slug), queue);
    }
  } finally { flushing = false; }
  return { sent };
}
