// レシート栄養カレンダー — AI読み取り中継サーバー (Cloudflare Worker)
// レシート画像を受け取り、Claude(vision)で食品を読み取って
// アプリの食材リストに対応づけたJSONを返す。APIキーはここに保管し、
// 公開HTML側には出さない。
//
// デプロイ手順は同じフォルダの README.md を参照。

// アプリ側と同じ食材ID一覧（追加・変更したら両方を合わせる）
const FOODS = [
  ['yogurt', 'ヨーグルト'], ['drinkyog', '飲むヨーグルト'], ['lacto', '乳酸菌飲料'],
  ['kimchi', 'キムチ'], ['nukazuke', 'ぬか漬け'], ['kraut', 'ザワークラウト'],
  ['natto', '納豆'], ['miso', '味噌'], ['cheese', 'チーズ'], ['amazake', '甘酒'],
  ['pickles', '漬物'],
  ['gobo', 'ごぼう'], ['broccoli', 'ブロッコリー'], ['spinach', 'ほうれん草'],
  ['kabocha', 'かぼちゃ'], ['mushroom', 'きのこ'], ['corn', 'とうもろこし'],
  ['avocado', 'アボカド'], ['konnyaku', 'こんにゃく'], ['carrot', 'にんじん'],
  ['cabbage', 'キャベツ'], ['tomato', 'トマト'], ['okra', 'オクラ'],
  ['banana', 'バナナ'], ['apple', 'りんご'], ['kiwi', 'キウイ'], ['berry', 'ベリー'],
  ['mikan', 'みかん'], ['prune', 'プルーン'],
  ['edamame', '枝豆'], ['daizu', '大豆・煮豆'], ['hijiki', 'ひじき'],
  ['wakame', 'わかめ'], ['kombu', '昆布'], ['lentil', 'レンズ豆'], ['tofu', '豆腐'],
  ['genmai', '玄米'], ['oatmeal', 'オートミール'], ['satsuma', 'さつまいも'],
  ['ryebread', 'ライ麦パン'], ['soba', 'そば'], ['branflake', 'ブランフレーク'],
];
const VALID_IDS = new Set(FOODS.map(f => f[0]));

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin'));
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'server not configured (missing ANTHROPIC_API_KEY)' }, 500, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }

    const image = body && body.image;
    const m = typeof image === 'string' && image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) return json({ error: 'image は data:image/...;base64,... 形式で送ってください' }, 400, cors);
    const mediaType = m[1], data = m[2];

    const list = FOODS.map(f => `${f[0]}:${f[1]}`).join(', ');
    const prompt =
`あなたは日本のスーパーやコンビニのレシート画像から食品を読み取るアシスタントです。
次の「登録候補リスト」（id:名称 の形式）に該当する食品だけを抽出してください。

登録候補リスト: ${list}

ルール:
- レシートに写っている商品名のうち、登録候補リストのいずれかに該当するものだけを選ぶ
- 商品名は略称でも判断する（例:「明治ﾌﾞﾙｶﾞﾘｱﾖｰｸﾞﾙﾄ」→ yogurt、「ｷﾑﾁ」→ kimchi、「ｷｬﾍﾞﾂ」→ cabbage）
- 食品でないもの（日用品・飲料等）や、リストに該当しない食品は無視する
- 数量はレシートの個数。不明なら1
- 必ず次のJSONのみを出力（前後に説明文を付けない）:
  {"items":[{"id":"yogurt","name":"ブルガリアヨーグルト","qty":1}]}
- 該当が無ければ {"items":[]}`;

    let apiRes;
    try {
      apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: env.MODEL || 'claude-opus-4-8',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });
    } catch (e) {
      return json({ error: 'AIサーバーに接続できませんでした', detail: String(e) }, 502, cors);
    }

    const apiData = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) return json({ error: 'AI APIエラー', detail: apiData }, 502, cors);

    const text = (apiData.content || []).map(c => c.text || '').join('');
    const jm = text.match(/\{[\s\S]*\}/);
    let parsed = { items: [] };
    try { if (jm) parsed = JSON.parse(jm[0]); } catch { /* leave empty */ }

    // 既知IDのみに絞り、数量を正規化
    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter(it => it && VALID_IDS.has(it.id))
      .map(it => ({ id: it.id, name: String(it.name || ''), qty: Math.max(1, Math.round(Number(it.qty) || 1)) }));

    return json({ items }, 200, cors);
  },
};
