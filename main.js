import { escapeHTML as esc, gradeOptions, progressPercent, deckDisplayName, getDeckStatsByName, lastSevenDays, makeAnkiHTML, classifyDeck } from './lib.js';

const ANKI_URL = 'http://127.0.0.1:8765';
const DEMO_DECKS = [
  {name:'日本語 · 日常表达', description:'每天积累一点自然表达', cards:[
    {question:'「なるほど」与「そうですね」有什么语气区别？', answer:'<b>なるほど</b>：表达理解或恍然大悟。<br><b>そうですね</b>：表示赞同、思考或回应。', buttons:[1,2,3], nextReviews:['1m','10m','4d']},
    {question:'「確認しておきます」是什么意思？', answer:'<b>我会事先确认一下。</b><br>「〜ておく」表示提前做好准备。', buttons:[1,2,3], nextReviews:['1m','10m','4d']}
  ]},
  {name:'Backend · 基础知识', description:'理解，而不是死记术语', cards:[
    {question:'数据库索引为什么能够加速查询？', answer:'索引可以减少需要扫描的数据量。<br>例如，B+ 树支持高效定位记录，避免逐行扫描整张表。', buttons:[1,2,3,4], nextReviews:['1m','6m','2d','4d']},
    {question:'HTTP 中 401 和 403 的主要区别？', answer:'<b>401</b>：缺少有效的身份认证。<br><b>403</b>：服务器理解请求，但拒绝授权访问。', buttons:[1,2,3], nextReviews:['1m','10m','4d']}
  ]},
  {name:'한국어 · 基础短句', description:'一点一点，养成语言感觉', cards:[
    {question:'「괜찮아요」是什么意思？', answer:'<b>没关系 / 可以 / 我很好</b><br>根据语境有不同含义。', buttons:[1,2,3], nextReviews:['1m','10m','4d']},
    {question:'「감사합니다」是什么意思？', answer:'<b>谢谢。</b><br>较正式、礼貌的表达。', buttons:[1,2,3], nextReviews:['1m','10m','4d']}
  ]}
];
const $ = id => document.getElementById(id);
const app = $('app');
const savedGoal = Number(localStorage.getItem('memory-garden-goal'));
const state = {
  connected:false, demo:true, busy:false, view:'home', decks:[], selectedDeck:null,
  currentCard:null, revealed:false, sessionCount:0, todayCount:null, goal:[5,10,15,20,30].includes(savedGoal)?savedGoal:10,
  history:{}, demoIndex:0, demoCardIndex:0, theme:localStorage.getItem('memory-garden-theme')==='dark'?'dark':'light', lastError:''
};
let toastTimer = null;
let mediaRenderToken = 0;

async function anki(action,params={}) {
  let response;
  try {
    response = await fetch(ANKI_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,version:6,params}),signal:AbortSignal.timeout(8000)});
  } catch (error) {
    throw new Error('无法连接本机 Anki。请确认 Anki 已打开、AnkiConnect 已安装，并检查跨域来源设置。');
  }
  if(!response.ok) throw new Error(`AnkiConnect HTTP ${response.status}：检查插件权限或跨域来源设置。`);
  let payload;
  try { payload=await response.json(); } catch { throw new Error('AnkiConnect 返回了无效 JSON。'); }
  if (payload.error) throw new Error(`${action}: ${payload.error}`);
  return payload.result;
}

async function optionalAnki(action,params={},fallback=null) {
  try {return await anki(action,params)} catch (e) {console.info(`${action} optional:`,e.message); return fallback}
}

function setTheme(theme){
  state.theme=theme;
  document.body.dataset.theme=theme;
  localStorage.setItem('memory-garden-theme',theme);
  $('theme-glyph').textContent=theme==='dark'?'☀':'☾';
  $('theme-label').textContent=theme==='dark'?'浅色外观':'深色外观';
}

function notify(message){
  const toast=$('toast');toast.textContent=message;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},4400);
}

function setBusy(busy){state.busy=busy;render()}

async function connect({silent=false}={}){
  if(state.busy)return;
  setBusy(true);
  try {
    const version=await anki('version');
    if(Number(version)<5) throw new Error('AnkiConnect 版本过旧，请更新插件。');
    const names=await anki('deckNames');
    state.connected=true;state.demo=false;state.lastError='';
    state.decks=names.map(name=>({name,description:'来自你的 Anki 牌组',due:null}));
    await loadStats();
    if(!silent)notify('已连接到 Mac 上的 Anki。');
  } catch (error){
    state.connected=false;state.demo=true;
    state.decks=DEMO_DECKS.map((d,i)=>({name:d.name,description:d.description,due:d.cards.length,index:i}));
    state.todayCount=null;state.history={};state.lastError=error.message;
    if(!silent)notify(error.message);
  } finally {
    state.busy=false;render();
  }
}

async function loadStats(){
  if(!state.connected)return;
  const [stats,today,byDay] = await Promise.all([
    optionalAnki('getDeckStats',{decks:state.decks.map(d=>d.name)},null),
    optionalAnki('getNumCardsReviewedToday',{},null),
    optionalAnki('getNumCardsReviewedByDay',{},[])
  ]);
  const map=getDeckStatsByName(stats);
  state.decks=state.decks.map(d=>({...d,due:map.get(d.name)?.due??null,details:map.get(d.name)||null}));
  state.todayCount=Number.isFinite(Number(today))&&today!==null?Number(today):null;
  state.history={};
  for(const row of (Array.isArray(byDay)?byDay:[])){
    if(Array.isArray(row)&&/^\d{4}-\d{2}-\d{2}$/.test(row[0])) state.history[row[0]]=Number(row[1])||0;
  }
}

function prettyDate(){
  const d=new Date();
  return new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(d);
}
function todayCount(){return state.todayCount===null?state.sessionCount:state.todayCount}
function iconFor(d,i){const x=classifyDeck(d.name,i);return `<span class="deck-icon tone-${x.tone}" aria-hidden="true">${esc(x.symbol)}</span>`}

function renderHome(){
  const n=todayCount(); const pct=progressPercent(n,state.goal);
  const days=lastSevenDays();const counts=days.map(d=>state.history[d.key]||0);
  const max=Math.max(1,...counts);
  const bars=days.map((day,i)=>`<div class="activity-item ${day.today?'today':''}" title="${esc(day.key)} · ${counts[i]} 次复习"><div class="activity-bar-area"><div class="activity-bar" style="height:${state.connected?Math.max(5,counts[i]/max*100):5}%"></div></div><span class="activity-label ${day.today?'today':''}">${esc(day.label)}</span></div>`).join('');
  const cards=state.decks.map((deck,i)=>`<article class="deck-card card">
    ${iconFor(deck,i)}<h3 class="deck-name" title="${esc(deck.name)}">${esc(deckDisplayName(deck.name))}</h3><p class="deck-info">${esc(deck.name.includes('::')?deck.name.slice(0,deck.name.lastIndexOf('::')):deck.description)}</p>
    <div class="deck-bottom"><span class="deck-count">${deck.due===null?'<strong>—</strong> 待复习':`<strong>${deck.due}</strong> 待复习`}</span><button class="round-button" data-action="study" data-deck="${i}" title="开始复习 ${esc(deck.name)}" aria-label="开始复习 ${esc(deck.name)}">↗</button></div>
  </article>`).join('');
  return `<div class="hero"><div><div class="eyebrow">${esc(prettyDate())} / A NEW PAGE</div><h1>每天，记住一点点<span style="color:#9ab09d">.</span></h1><p>不需要完美的计划。打开、回忆、继续生活。</p></div><div class="hero-side"><span class="hero-decor">✳</span><span class="small-indicator ${state.demo?'offline-indicator':''}">${state.demo?'预览模式':'已连接到 Anki'}</span></div></div>
  ${state.demo?`<div class="connect-banner"><div><strong>当前展示的是示例卡片</strong><p>你的真实牌组尚未读取。先打开 Mac 端 Anki + AnkiConnect，再点击连接。</p>${state.lastError?`<p title="${esc(state.lastError)}">检查提示：${esc(state.lastError)}</p>`:''}</div><button class="button button-small" data-action="connect" ${state.busy?'disabled':''}>${state.busy?'连接中...':'连接 Anki'}</button></div>`:''}
  <section class="dashboard-grid" aria-label="今日学习"><div class="today-card card"><div class="daily-head"><div><div class="small-heading">今日记忆</div><div class="tiny-muted">${state.connected?(state.todayCount===null?'本次学习记录':'Anki 今日已复习次数'):'演示模式 · 本次复习次数'}</div></div><span class="tiny-muted">DAILY GOAL</span></div><div class="daily-bottom"><div><div class="daily-count">${n}<small> / ${state.goal}</small></div><p class="daily-support">${n>=state.goal?'今日目标已达成。':'只需要一点点，就已经在前进。'}</p></div><div class="ring-wrap"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="48"/><circle class="ring-progress" cx="60" cy="60" r="48" stroke-dasharray="301.59" stroke-dashoffset="${(301.59*(1-pct/100)).toFixed(2)}"/></svg><div class="ring-center">${pct}%<small>COMPLETE</small></div></div></div></div>
  <div class="activity-card card"><div class="card-heading"><div><h2>最近七天</h2><span class="tiny-muted">${state.connected?'来自 Anki 的复习记录':'连接后显示真实数据'}</span></div><span class="tiny-muted">7 DAYS</span></div><div class="activity-bars">${bars}</div></div></section>
  <section><div class="section-heading"><div><h2 class="section-title">我的记忆领域</h2><p>${state.connected?'选择一个牌组，按照 Anki 的日程开始复习。':'先用示例体验一下，再连接自己的牌组。'}</p></div><label class="goal-inline" for="goal-select">每天目标 <select class="goal-select" id="goal-select">${[5,10,15,20,30].map(x=>`<option value="${x}" ${state.goal===x?'selected':''}>${x} 张</option>`).join('')}</select></label></div>
  <div class="decks">${cards||`<div class="card empty-state"><p>还没有可用牌组。可以先在 Anki 中创建一个。</p></div>`}</div></section>
  <p class="home-footer-note">不显示连续打卡惩罚；今天只学一张，也算一次开始。</p>`;
}

function renderStudy(){
  const card=state.currentCard;
  if(!card) return renderDone();
  const options=gradeOptions(card.buttons,card.nextReviews);
  const progress=state.goal?progressPercent(state.sessionCount,state.goal):0;
  const currentTitle=state.selectedDeck??'复习';
  return `<section class="study-page"><div class="study-top"><div class="study-label"><span class="eyebrow">FOCUS MODE</span><div><strong>${esc(deckDisplayName(currentTitle))}</strong> · 当前牌组</div></div><div class="study-top-right"><span class="study-session">本次完成 ${state.sessionCount} 张</span><button class="button button-ghost button-small" data-action="home">结束本次</button></div></div><div class="study-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div style="width:${progress}%"></div></div>
    <article class="flashcard card" aria-label="当前 Anki 卡片"><div class="flashcard-top"><div class="flashcard-kicker">${state.revealed?'ANSWER / THE RECALL':'QUESTION / THINK FIRST'}</div><span class="flashcard-tag">${state.demo?'演示卡片':esc(card.modelName||'Anki Card')}</span></div>
    <div class="anki-content"><iframe id="anki-frame" class="anki-frame ${state.revealed?'answer':''}" sandbox="" title="${state.revealed?'Anki 卡片答案':'Anki 卡片问题'}"></iframe></div>
    <div class="flashcard-bottom"><span class="flashcard-hint">${state.revealed?'根据你真实的回忆程度评分':'想好答案后再翻面。按 Space 快捷翻面。'}</span></div></article>
    <div class="study-controls">${state.revealed?`<div class="grading-title">HOW WELL DID YOU REMEMBER?</div><div class="grade-grid">${options.map((o,i)=>`<button class="grade-button ${o.className}" data-action="grade" data-ease="${o.ease}" ${state.busy?'disabled':''}><span class="grade-name">${esc(o.name)}</span><small>${esc(o.interval||`${i+1} 键`)}</small></button>`).join('')}</div><p class="study-tip">按 ${options.map((_,i)=>i+1).join(' / ')} 快速评分 · 使用 Anki 原生复习日程</p>`:`<button class="button button-large" data-action="reveal" ${state.busy?'disabled':''}>${state.busy?'正在加载...':'显示答案'} <span>→</span></button><p class="study-tip">回忆不起来也没关系，再次看到就是一次学习。</p>`}</div></section>`;
}

function renderDone(){
  return `<section class="empty-state card"><div class="empty-icon">✳</div><div class="eyebrow">A LITTLE GOES A LONG WAY</div><h1>今天已经很好了。</h1><p>这个牌组目前没有下一张可复习的卡片。${state.sessionCount>0?`本次完成了 ${state.sessionCount} 张。`:''}不需要为了数字继续刷。</p><button class="button button-large" data-action="home">回到概览 →</button></section>`;
}

function render(){
  $('breadcrumb-title').textContent=state.view==='home'?'概览':state.view==='study'?'专注复习':'复习完成';
  $('nav-home').classList.toggle('active',state.view==='home');
  $('nav-focus').classList.toggle('active',state.view==='study');
  $('side-connection').classList.toggle('is-connected',state.connected);
  $('side-connection').querySelector('span:last-child').textContent=state.connected?'Anki 已连接':state.busy?'正在检查 Anki...':'预览模式 · 未连接';
  $('top-sync').disabled=!state.connected||state.busy;
  app.innerHTML=state.view==='home'?renderHome():state.view==='study'?renderStudy():renderDone();
  if(state.view==='study' && state.currentCard) displayCurrentCard();
}

function getMime(filename){
  const extension=String(filename).toLowerCase().split('.').pop();
  return ({png:'image/png',jpeg:'image/jpeg',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',mp4:'video/mp4'})[extension]||'application/octet-stream';
}

// Anki-Connect returns Anki media as base64. Convert local references into data
// URLs before passing the card to the sandboxed iframe. Avoid extra services.
async function resolveMedia(html){
  if(state.demo) return html;
  const root=document.createElement('template');root.innerHTML=String(html||'');
  const promises=[];
  const elements=[...root.content.querySelectorAll('img[src],audio[src],source[src],video[poster]')].slice(0,25);
  for(const el of elements){
    const attr=el.hasAttribute('poster')?'poster':'src';const path=el.getAttribute(attr);
    if(!path||/^(https?:|data:|blob:|\/|#)/i.test(path)||path.includes('..')||path.length>240)continue;
    promises.push((async()=>{
      try{const b64=await optionalAnki('retrieveMediaFile',{filename:decodeURIComponent(path)},null);
        if(typeof b64==='string'&&b64.length<14_000_000)el.setAttribute(attr,`data:${getMime(path)};base64,${b64}`);
      }catch(e){console.info('media missing',path,e.message)}
    })());
  }
  const textNodes=[];const iterator=document.createNodeIterator(root.content,NodeFilter.SHOW_TEXT);
  let node;while((node=iterator.nextNode())) if(/\[sound:[^\]]+\]/.test(node.nodeValue)) textNodes.push(node);
  for(const textNode of textNodes){
    const text=textNode.nodeValue; const regex=/\[sound:([^\]]+)\]/g; let last=0;const fragment=document.createDocumentFragment();
    for(const match of text.matchAll(regex)){
      fragment.append(document.createTextNode(text.slice(last,match.index)));
      const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.setAttribute('aria-label','音频复习内容');
      const path=match[1];promises.push((async()=>{
        const b64=await optionalAnki('retrieveMediaFile',{filename:path},null);
        if(typeof b64==='string'&&b64.length<14_000_000)audio.src=`data:${getMime(path)};base64,${b64}`;
        else {audio.replaceWith(document.createTextNode('[音频请在 Anki 中播放]'))}
      })());fragment.append(audio);last=match.index+match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(last)));textNode.replaceWith(fragment);
  }
  await Promise.all(promises);
  return root.innerHTML;
}

async function displayCurrentCard(){
  const token=++mediaRenderToken;
  const card=state.currentCard;const revealed=state.revealed;
  const frame=$('anki-frame');if(!frame)return;
  frame.srcdoc=makeAnkiHTML('正在准备卡片…','',state.theme==='dark');
  const markup=await resolveMedia(revealed?card.answer:card.question);
  if(token!==mediaRenderToken||frame!==$('anki-frame'))return;
  frame.srcdoc=makeAnkiHTML(markup,card.css||'',state.theme==='dark');
}

async function startStudy(deckIndex){
  if(state.busy)return;
  const deck=state.decks[deckIndex];if(!deck){notify('没有找到牌组。');return}
  state.selectedDeck=deck.name;state.sessionCount=0;state.revealed=false;state.currentCard=null;
  if(state.demo){state.demoIndex=deck.index??deckIndex;state.demoCardIndex=0;state.currentCard=DEMO_DECKS[state.demoIndex].cards[0];state.view='study';render();return}
  state.busy=true;
  try{
    const started=await anki('guiDeckReview',{name:deck.name});
    if(!started){state.view='done';notify('Anki 无法进入这个牌组的复习页面。');return}
    const card=await anki('guiCurrentCard');
    state.currentCard=card;state.view=card?'study':'done';
    if(card)await optionalAnki('guiStartCardTimer');
  }catch(err){state.view='home';notify(err.message)}finally{state.busy=false;render()}
}

async function reveal(){
  if(state.busy||state.revealed||!state.currentCard)return;
  state.busy=true;
  try{
    if(state.connected){const ok=await anki('guiShowAnswer');if(!ok)throw new Error('Anki 当前不在复习模式。请重新选择牌组。')}
    state.revealed=true;
  }catch(err){notify(err.message)}finally{state.busy=false;render()}
}

async function grade(ease){
  if(state.busy||!state.revealed||!state.currentCard)return;
  const valid=gradeOptions(state.currentCard.buttons,state.currentCard.nextReviews).some(x=>x.ease===ease);
  if(!valid){notify('当前卡片不支持这个评分。');return}
  state.busy=true;
  try{
    if(state.demo){
      state.demoCardIndex++;const list=DEMO_DECKS[state.demoIndex].cards;
      state.currentCard=state.demoCardIndex<list.length?list[state.demoCardIndex]:null;
    }else{
      const accepted=await anki('guiAnswerCard',{ease});
      if(!accepted)throw new Error('Anki 没有接收评分，请回到原版 Anki 检查当前卡片。');
      state.currentCard=await anki('guiCurrentCard');
      if(state.currentCard)await optionalAnki('guiStartCardTimer');
    }
    state.sessionCount++;if(state.todayCount!==null)state.todayCount++;
    state.revealed=false;state.view=state.currentCard?'study':'done';
    if(!state.currentCard&&state.connected)await loadStats();
  }catch(err){notify(err.message)}finally{state.busy=false;render()}
}

async function sync(){
  if(!state.connected||state.busy)return;
  state.busy=true;render();
  try{
    await anki('sync');
    notify('已请求 Anki 开始同步；请在 Anki 中确认最终同步结果。');
    await loadStats();
  }catch(err){notify(err.message)}finally{state.busy=false;render()}
}

async function refresh(){
  if(!state.connected){await connect();return}
  if(state.busy)return;setBusy(true);
  try{
    const names=await anki('deckNames');
    state.decks=names.map(name=>({name,description:'来自你的 Anki 牌组',due:null}));
    await loadStats();notify('已刷新牌组与复习数据。');
  }catch(err){notify(err.message);state.connected=false;state.demo=true;state.lastError=err.message;state.view='home';state.decks=DEMO_DECKS.map((d,i)=>({...d,due:d.cards.length,index:i}))}
  finally{state.busy=false;render()}
}

function showHome(){state.view='home';state.currentCard=null;state.revealed=false;render()}

app.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action==='study')void startStudy(Number(button.dataset.deck));
  if(action==='connect')void connect();
  if(action==='home')showHome();
  if(action==='reveal')void reveal();
  if(action==='grade')void grade(Number(button.dataset.ease));
});
app.addEventListener('change',event=>{
  if(event.target.id==='goal-select'){
    const value=Number(event.target.value);
    if([5,10,15,20,30].includes(value)){state.goal=value;localStorage.setItem('memory-garden-goal',String(value));render()}
  }
});
$('nav-home').addEventListener('click',showHome);
$('nav-focus').addEventListener('click',()=>{const i=state.decks.findIndex(d=>d.due===null||d.due>0);void startStudy(i>=0?i:0)});
$('nav-refresh').addEventListener('click',()=>void refresh());
$('top-sync').addEventListener('click',()=>void sync());
$('theme-toggle').addEventListener('click',()=>{setTheme(state.theme==='dark'?'light':'dark');render()});
document.addEventListener('keydown',event=>{
  if(state.view!=='study'||state.busy||event.metaKey||event.ctrlKey||event.altKey)return;
  const node=event.target;
  if(node instanceof HTMLElement&&(node.matches('input,textarea,select')||node.isContentEditable))return;
  if(!state.revealed&&(event.code==='Space'||event.code==='Enter')){event.preventDefault();void reveal();return}
  if(state.revealed&&/^[1-4]$/.test(event.key)){
    const options=gradeOptions(state.currentCard?.buttons,state.currentCard?.nextReviews);
    const option=options[Number(event.key)-1];if(option){event.preventDefault();void grade(option.ease)}
  }
});

setTheme(state.theme);
$('clock').textContent=new Intl.DateTimeFormat('zh-CN',{month:'short',day:'numeric'}).format(new Date());
state.decks=DEMO_DECKS.map((d,i)=>({name:d.name,description:d.description,due:d.cards.length,index:i}));
render();
void connect({silent:true});
