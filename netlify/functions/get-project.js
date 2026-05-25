// GET /api/get-project?contact={jnid}
// Reads a single contact from JobNimbus and returns the fields the portal needs.

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  const jnid = (event.queryStringParameters || {}).contact;
  if (!jnid) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing contact parameter' }) };
  }

  const key = process.env.JN_API_KEY;
  if (!key) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  try {
    const res = await fetch(`https://app.jobnimbus.com/api1/contacts/${encodeURIComponent(jnid)}`, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: 'JobNimbus lookup failed' }) };
    }

    const c = await res.json();

    // Unix seconds -> "June 3, 2026". Returns null when unset (0/empty) so the UI shows TBD.
    const fmtDate = (sec) => {
      if (!sec || sec <= 0) return null;
      return new Date(sec * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    };

    // Number -> "$29,000". Returns null when unset.
    const fmtMoney = (n) => {
      if (n === null || n === undefined || n === '' || Number(n) <= 0) return null;
      return Number(n).toLocaleString('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0,
      });
    };

    const project = {
      name: c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
      address: [c.address_line1, c.city, c.state_text].filter(Boolean).join(', ') || null,
      saleAmount: fmtMoney(c.cf_double_1),
      saleDate: fmtDate(c.cf_date_2),
      installDate: fmtDate(c.date_start),
    };

    return { statusCode: 200, headers, body: JSON.stringify(project) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Upstream error' }) };
  }
};
