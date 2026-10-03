type Signed = {path: string; signedUrl: string | null};
// Keep URLs stable during polling. Each authenticated view owns its cache.
export function createSignedUrlCache(sign: (paths: string[]) => Promise<Signed[]>, ttlSeconds: number, now = Date.now) {
  const entries = new Map<string, {url: Promise<string>; expires: number}>();
  return async (paths: string[]) => {
    const unique = [...new Set(paths)];
    const missing = unique.filter(path => !entries.has(path) || entries.get(path)!.expires <= now() + 60_000);
    if (missing.length) {
      const expires = now() + ttlSeconds * 1000;
      const batch = sign(missing);
      for (const path of missing) {
        const entry = {expires, url: batch.then(rows => {
          const url = rows.find(row => row.path === path)?.signedUrl;
          if (!url) throw Error('Não foi possível carregar a imagem. Tente novamente.');
          return url;
        })};
        entries.set(path, entry);
        entry.url.catch(() => { if (entries.get(path) === entry) entries.delete(path); });
      }
    }
    return new Map(await Promise.all(unique.map(async path => [path, await entries.get(path)!.url] as const)));
  };
}
