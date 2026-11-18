/** Pure helpers shared by the web UI and Node's built-in tests. */
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
}

export function gradeOptions(buttons = [], nextReviews = []) {
  // Anki's available ease values depend on the current card's state.
  // In particular, 3-button new cards use ease=2 for Good, not 3.
  const labels = { 1: ['Again'], 2: ['Again', 'Good'], 3: ['Again', 'Good', 'Easy'], 4: ['Again', 'Hard', 'Good', 'Easy'] };
  const values = Array.isArray(buttons) && buttons.length >= 2 && buttons.length <= 4
    ? buttons : [1, 2, 3, 4];
  const names = labels[values.length] || labels[4];
  return values.map((ease, index) => ({
    ease, name: names[index], interval: nextReviews?.[index] || '',
    className: index === 0 ? 'again' : names[index] === 'Good' ? 'good' : ''
  }));
}

export function progressPercent(done, target) {
  if (!Number.isFinite(done) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(done / target * 100)));
}

export function deckDisplayName(name) {
  return String(name || '未命名牌组').split('::').at(-1);
}

export function getDeckStatsByName(stats) {
  const result = new Map();
  if (!stats || typeof stats !== 'object') return result;
  for (const value of Object.values(stats)) {
    if (!value || typeof value.name !== 'string') continue;
    const total = ['new_count','learn_count','review_count'].reduce((n,key)=>n+Math.max(0,Number(value[key]||0)),0);
    result.set(value.name, { due: total, new: Number(value.new_count||0), learn: Number(value.learn_count||0), review: Number(value.review_count||0) });
  }
  return result;
}

export function lastSevenDays(today = new Date()) {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(),today.getMonth(), today.getDate()-i);
    const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
    dates.push({key:`${y}-${m}-${d}`, label: new Intl.DateTimeFormat('zh-CN',{weekday:'short'}).format(date), today: i===0});
  }
  return dates;
}

export function makeAnkiHTML(html, css, dark = false) {
  const themeText = dark ? '#f1f5ee' : '#263d32';
  // Anki's templates may include arbitrary HTML. They are displayed in a
  // sandboxed iframe WITHOUT allow-scripts or allow-same-origin (see main.js).
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    html,body{margin:0;background:transparent;color:${themeText};font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","PingFang SC",sans-serif;}
    body{padding:12px 3px 20px;box-sizing:border-box;text-align:center;line-height:1.7;font-size:23px;overflow-wrap:anywhere}
    img,video{max-width:100%;height:auto}pre{white-space:pre-wrap;text-align:left;font-size:15px}code{font-size:.85em}hr{border:0;border-top:1px solid #d9dfd6;margin:19px auto}a{color:#6e9982}
  </style><style>${String(css||'').replace(/<\/style/gi,'<\\/style').replace(/@import\s+[^;]+;?/gi,'')}</style></head><body><div class="card">${html}</div></body></html>`;
}

export function classifyDeck(name,index){
  const lower = String(name).toLowerCase();
  if (/japan|日本|日语|日語|jlpt|toeic|english|英语|英語|語学|単語/.test(lower)) return {symbol:'あ',tone:0};
  if (/korean|한국|韩语|韓語|ハングル/.test(lower)) return {symbol:'가',tone:1};
  if (/code|backend|program|it|rust|tech|算法|算法|计算机|情報|cs|网络/.test(lower)) return {symbol:'{ }',tone:2};
  if (/研究|paper|論文|logic|bdd|mzi|光/.test(lower)) return {symbol:'✳',tone:3};
  return [{symbol:'あ',tone:0},{symbol:'⌘',tone:1},{symbol:'✦',tone:2},{symbol:'✳',tone:3}][index%4];
}
