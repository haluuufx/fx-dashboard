module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'FX-Dashboard/1.0' }
    });
    const text = await r.text();

    const items = [];
    const matches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of matches) {
      const block = m[1];
      const get = tag => {
        const rx = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>|<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
        const found = block.match(rx);
        return found ? (found[1] || found[2] || '').trim() : '';
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
};
