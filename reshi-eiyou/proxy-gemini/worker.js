// レシート栄養カレンダー — AI読み取り中継サーバー（Gemini / 無料枠）
// レシートの写真だけでなく「料理そのものの写真」も受け取り、
// Google Gemini(vision)で食品を判別してアプリの食材リストに対応づける。
// APIキーはここに保管し、公開HTML側には出さない。
//
// デプロイ手順は同じフォルダの README.md を参照。

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
    if (!env.GEMINI_API_KEY) return json({ error: 'server not configured (missing GEMINI_API_KEY)' }, 500, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }

    const image = body && body.image;
    const m = typeof image === 'string' && image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) return json({ error: 'image は data:image/...;base64,... 形式で送ってください' }, 400, cors);
    const mimeType = m[1], data = m[2];

    const list = FOODS.map(f => `${f[0]}:${f[1]}`).join(', ');
    const prompt =
`この画像は「日本のスーパー/コンビニのレシート」か「料理・食べ物の写真」のどちらかです。
写っている食品のうち、次の「登録候補リスト」（id:名称 の形式）に該当するものを抽出してください。

登録候補リスト: ${list}

ルール:
- レシートなら商品名（略称や半角カナも解読）から、料理写真なら見た目から食材を判断する
- 料理は含まれる代表的な食材に分解してよい（例: 野菜炒め→cabbage/carrot、麻婆豆腐→tofu、味噌汁→miso）
- 登録候補リストに無い食品や、食品でないものは無視する
- 数量は個数や品数。不明なら1
- 出力は必ず次のJSON形式のみ（説明文なし）:
  {"items":[{"id":"tofu","name":"麻婆豆腐","qty":1}]}
- 該当が無ければ {"items":[]}`;

    const model = env.MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let apiRes;
    try {
      apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
        }),
      });
    } catch (e) {
      return json({ error: 'AIサーバーに接続できませんでした', detail: String(e) }, 502, cors);
    }

    const apiData = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) {
      const msg = apiData && apiData.error && apiData.error.message ? apiData.error.message : ('HTTP ' + apiRes.status);
      return json({ error: 'AI APIエラー: ' + msg }, 502, cors);
    }

    const text = ((((apiData.candidates || [])[0] || {}).content || {}).parts || [])
      .map(p => p.text || '').join('');
    const jm = text.match(/\{[\s\S]*\}/);
    let parsed = { items: [] };
    try { if (jm) parsed = JSON.parse(jm[0]); } catch { /* leave empty */ }

    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter(it => it && VALID_IDS.has(it.id))
      .map(it => ({ id: it.id, name: String(it.name || ''), qty: Math.max(1, Math.round(Number(it.qty) || 1)) }));

    return json({ items }, 200, cors);
  },
};
