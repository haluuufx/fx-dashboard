export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param required' });

  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'FX-Dashboard/1.0' }
    });
    const text = await response.text();

    // Simple RSS XML → JSON parser
    const items = [];
    const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const item = match[1];
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? (m[1] || m[2] || '').trim() : '';
      };
      items.push({
        title: get('title'),
        link: get('link'),
        pubDate: get('pubDate'),
        description: get('description').replace(/<[^>]+>/g, '').slice(0, 200)
      });
      if (items.length >= 20) break;
    }

    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
