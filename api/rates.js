export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // JPYベースで主要通貨ペアを一括取得
    // frankfurter v2: base=JPY で USD,EUR,GBP,AUD,CAD,NZD のレートを取得
    const url = 'https://api.frankfurter.dev/v2/rates?base=JPY&quotes=USD,EUR,GBP,AUD,CAD,NZD';
    const r = await fetch(url);
    const data = await r.json();

    // data は配列形式 [{date, base, quote, rate}, ...]
    // JPY→各通貨のレートなので逆数を取って「1通貨=何円」に変換
    const rates = {};
    (Array.isArray(data) ? data : []).forEach(item => {
      if (item.quote && item.rate) {
        rates[item.quote] = (1 / item.rate);
      }
    });

    return res.status(200).json({ rates, date: data[0]?.date || new Date().toISOString().slice(0,10) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
