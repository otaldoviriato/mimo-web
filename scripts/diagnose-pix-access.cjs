// Read-only credential/API-version check. Reports no response body or credential.
const id = process.argv[2];
const key = process.env.ABACATEPAY_API_KEY;
if (!key || !/^pix_char_[A-Za-z0-9]+$/.test(id || '')) process.exit(1);
(async () => {
  for (const endpoint of ['v1/pixQrCode/check', 'v2/transparents/check']) {
    const response = await fetch(`https://api.abacatepay.com/${endpoint}?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    const error = typeof body.error === 'string' ? body.error.toLowerCase() : '';
    const reason = /invalid|inactive|unauthorized/.test(error) ? 'invalid_or_inactive_credential'
      : /permission|scope|forbidden/.test(error) ? 'permission_denied'
      : /not found/.test(error) ? 'payment_not_found' : (response.ok ? undefined : 'provider_rejected_request');
    console.log(JSON.stringify({ endpoint, httpStatus: response.status, status: body.data?.status, reason }));
  }
})().catch(() => { console.error('Access diagnosis failed'); process.exitCode = 1; });
