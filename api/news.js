// ─── 無料枠超過防止設計 ───────────────────────────────────────
// NewsData.io : 上限200件/日 → 1回10件×Vercel6時間キャッシュ = 最大40件/日
// GNews       : 上限100件/日 → 1回10件×Vercel6時間キャッシュ = 最大40件/日
// Vercel CDNキャッシュ(s-maxage)により、実際にAPIを叩くのは6時間に1回だけ
// ─────────────────────────────────────────────────────────────

const CACHE_SECONDS = 6 * 60 * 60; // 6時間
const NEWSDATA_MAX  = 10;
const GNEWS_MAX     = 10;

async function fetchNewsData(apiKey) {
  const url = 'https://newsdata.io/api/1/news?apikey=' + apiKey
    + '&q=' + encodeURIComponent('forex OR "central bank" OR dollar OR euro OR yen OR pound')
    + '&language=en,ja&category=business&size=' + NEWSDATA_MAX;
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
  const url = 'https://gnews.io/api/v4/search'
    + '?q=' + encodeURIComponent('forex OR "interest rate" OR "central bank" OR dollar OR yen')
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Vercel CDNに6時間キャッシュさせる → APIは6時間に1回しか叩かれない
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
}
