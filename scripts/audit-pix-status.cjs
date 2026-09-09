// Read-only provider audit. Never prints API keys or writes to the database.
// Usage: node --env-file=<explicit-environment-file> scripts/audit-pix-status.cjs pix_char_...
// No implicit .env.local loading: the operator must select the provider environment.
const ids = process.argv.slice(2);
(async () => {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new Error('ABACATEPAY_API_KEY missing');
  if (!ids.length || ids.some(id => !/^pix_char_[A-Za-z0-9]+$/.test(id))) throw new Error('Valid Pix IDs required');
  for (const id of ids) {
    try {
      const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000),
      });
      const body = await response.json();
      console.log(JSON.stringify({ id, httpStatus: response.status, status: body.data?.status, expiresAt: body.data?.expiresAt }));
      if (!response.ok || body.error || !body.data?.status) { process.exitCode = 1; break; }
    } catch { console.log(JSON.stringify({ id, error: 'Provider lookup failed' })); process.exitCode = 1; break; }
  }
})().catch(() => { console.error('Audit failed'); process.exitCode = 1; });
