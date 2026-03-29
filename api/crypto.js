// ─── crypto.js ───────────────────────────────────────────────
// CoinGecko (キーなし)、Alternative.me Fear&Greed、Binance funding rate
// Vercel CDN 5分キャッシュ（CoinGeckoの無料レート制限対策）
// ─────────────────────────────────────────────────────────────

const COINS = 'bitcoin,ethereum,solana,arbitrum,optimism,chainlink,uniswap,aave,matic-network';
const SYMBOLS = { // Binanceファンディングレート用シンボル
  bitcoin:'BTCUSDT', ethereum:'ETHUSDT', solana:'SOLUSDT',
  arbitrum:'ARBUSDT', optimism:'OPUSDT', chainlink:'LINKUSDT',
  uniswap:'UNIUSDT', aave:'AAVEUSDT', 'matic-network':'MATICUSDT'
};

async function fetchPrices() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets'
    + '?vs_currency=usd&ids=' + COINS
    + '&order=market_cap_desc&per_page=20&page=1'
    + '&price_change_percentage=1h,24h,7d'
    + '&sparkline=false';
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('CoinGecko HTTP ' + r.status);
  return await r.json();
}

async function fetchFearGreed() {
  const r = await fetch('https://api.alternative.me/fng/?limit=1');
  if (!r.ok) return null;
  const d = await r.json();
  return d.data && d.data[0] ? { value: d.data[0].value, label: d.data[0].value_classification } : null;
}

async function fetchFundingRates() {
  const rates = {};
  try {
    const r = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    if (!r.ok) return rates;
    const data = await r.json();
    Object.entries(SYMBOLS).forEach(([id, sym]) => {
      const found = data.find(d => d.symbol === sym);
      if (found) rates[id] = parseFloat(found.lastFundingRate) * 100;
    });
  } catch { /* ignore */ }
  return rates;
}

async function fetchDominance() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/global');
    if (!r.ok) return null;
    const d = await r.json();
    return {
      btc: d.data.market_cap_percentage.btc?.toFixed(1),
      eth: d.data.market_cap_percentage.eth?.toFixed(1),
      total: d.data.total_market_cap.usd
    };
  } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // 5分キャッシュ
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const [prices, fearGreed, funding, dominance] = await Promise.all([
    fetchPrices().catch(() => []),
    fetchFearGreed().catch(() => null),
    fetchFundingRates().catch(() => ({})),
    fetchDominance().catch(() => null),
  ]);

  return res.status(200).json({
    prices,
    fearGreed,
    funding,
    dominance,
    fetchedAt: new Date().toISOString()
  });
};
