module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = 'https://api.frankfurter.dev/v2/rates?base=JPY&quotes=USD,EUR,GBP,AUD,CAD,NZD';
    const r = await fetch(url);
    const data = await r.json();

    const rates = {};
    const items = Array.isArray(data) ? data : [];
    items.forEach(item => {
      if (item.quote && item.rate) {
        rates[item.quote] = 1 / item.rate;
      }
    });

    const date = items[0] ? items[0].date : new Date().toISOString().slice(0, 10);
    return res.status(200).json({ rates, date });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
