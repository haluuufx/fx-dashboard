// crypto-news.js
// クリプト専用キーワードでNewsData + GNewsからニュースを取得
// 6時間Vercelキャッシュで無料枠を守る

const CACHE_SECONDS = 6 * 60 * 60;
const NEWSDATA_MAX  = 10;
const GNEWS_MAX     = 10;

async function fetchNewsData(apiKey) {
  const q = 'bitcoin OR ethereum OR solana OR DeFi OR "crypto" OR "blockchain" OR AAVE OR Uniswap OR Chainlink';
  const url = 'https://newsdata.io/api/1/news?apikey=' + apiKey
    + '&q=' + encodeURIComponent(q)
    + '&language=en,ja&category=technology,business&size=' + NEWSDATA_MAX;
  const r = await fetch(url);
  if (!r.ok) throw new Error('NewsData HTTP ' + r.status);
  const data = await r.json();
  if (data.status === 'error') throw new Error(data.message || 'NewsData error');
  return (data.results || []).map(a => ({
    title:       a.title || '',
    description: (a.description || '').slice(0, 200),
    link:        a.link || '',
    pubDate:     a.pubDate || '',
    source:      'NewsData',
    lang:        a.language || 'en'
  }));
}

async function fetchGNews(apiKey) {
  const q = 'bitcoin OR ethereum OR cryptocurrency OR DeFi OR blockchain';
  const url = 'https://gnews.io/api/v4/search'
    + '?q=' + encodeURIComponent(q)
    + '&lang=en&max=' + GNEWS_MAX + '&apikey=' + apiKey;
  const r = await fetch(url);
  if (!r.ok) throw new Error('GNews HTTP ' + r.status);
  const data = await r.json();
  if (data.errors) throw new Error(data.errors.join(', '));
  return (data.articles || []).map(a => ({
    title:       a.title || '',
    description: (a.description || '').slice(0, 200),
    link:        a.url || '',
    pubDate:     a.publishedAt || '',
    source:      'GNews',
    lang:        'en'
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=300');

  const newsdataKey = process.env.NEWSDATA_API_KEY;
  const gnewsKey    = process.env.GNEWS_API_KEY;

  const results = await Promise.allSettled([
    newsdataKey ? fetchNewsData(newsdataKey) : Promise.resolve([]),
    gnewsKey    ? fetchGNews(gnewsKey)       : Promise.resolve([]),
  ]);

  const errors   = [];
  const allItems = results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    errors.push('source' + i + ': ' + (r.reason && r.reason.message));
    return [];
  });

  const seen   = new Set();
  const unique = allItems
    .filter(a => { if (!a.title || seen.has(a.title)) return false; seen.add(a.title); return true; })
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 20);

  return res.status(200).json({
    items:     unique,
    fetchedAt: new Date().toISOString(),
    errors:    errors.length ? errors : undefined
  });
};
