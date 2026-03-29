const COINS = 'bitcoin,ethereum,solana,arbitrum,optimism,chainlink,uniswap,aave,matic-network';
const SYMBOLS = {
  bitcoin:'BTCUSDT', ethereum:'ETHUSDT', solana:'SOLUSDT',
  arbitrum:'ARBUSDT', optimism:'OPUSDT', chainlink:'LINKUSDT',
  uniswap:'UNIUSDT', aave:'AAVEUSDT', 'matic-network':'MATICUSDT'
};

async function fetchPrices() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets'
    + '?vs_currency=usd&ids=' + COINS
    + '&order=market_cap_desc&per_page=20&page=1'
    + '&price_change_percentage=1h,24h,7d&sparkline=false';
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('CoinGecko HTTP ' + r.status);
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error('CoinGecko unexpected response format');
  // nullになりうるフィールドを安全な値に正規化
  return data.map(coin => ({
    ...coin,
    current_price: coin.current_price ?? 0,
    market_cap:    coin.market_cap    ?? 0,
    price_change_percentage_1h_in_currency:  coin.price_change_percentage_1h_in_currency  ?? 0,
    price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency ?? 0,
    price_change_percentage_7d_in_currency:  coin.price_change_percentage_7d_in_currency  ?? 0,
  }));
}

async function fetchFearGreed() {
  const r = await fetch('https://api.alternative.me/fng/?limit=1');
  if (!r.ok) return null;
  const d = await r.json();
  return (d.data && d.data[0])
    ? { value: d.data[0].value, label: d.data[0].value_classification }
    : null;
}

async function fetchFundingRates() {
  const rates = {};
  try {
    const r = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    if (!r.ok) return rates;
    const data = await r.json();
    if (!Array.isArray(data)) return rates;
    Object.entries(SYMBOLS).forEach(([id, sym]) => {
      const found = data.find(d => d.symbol === sym);
      if (found && found.lastFundingRate != null) {
        const val = parseFloat(found.lastFundingRate) * 100;
        rates[id] = isNaN(val) ? 0 : val;
      }
    });
  } catch { /* ignore */ }
  return rates;
}

async function fetchDominance() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/global');
    if (!r.ok) return null;
    const d = await r.json();
    const pct   = d && d.data && d.data.market_cap_percentage;
    const total = d && d.data && d.data.total_market_cap && d.data.total_market_cap.usd;
    return {
      btc:   (pct && pct.btc   != null) ? Number(pct.btc).toFixed(1)   : null,
      eth:   (pct && pct.eth   != null) ? Number(pct.eth).toFixed(1)   : null,
      total: (total != null)            ? total                         : null,
    };
  } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const [pricesResult, fearGreed, funding, dominance] = await Promise.all([
    fetchPrices().catch(e => ({ _error: e.message })),
    fetchFearGreed().catch(() => null),
    fetchFundingRates().catch(() => ({})),
    fetchDominance().catch(() => null),
  ]);

  const prices     = Array.isArray(pricesResult) ? pricesResult : [];
  const priceError = (!Array.isArray(pricesResult) && pricesResult && pricesResult._error)
    ? pricesResult._error : undefined;

  return res.status(200).json({
    prices,
    fearGreed,
    funding,
    dominance,
    fetchedAt: new Date().toISOString(),
    priceError,
  });
};
