(()=>{'use strict';
const E=WordEngine,W=window.WORDS,byId=Object.fromEntries(W.map(w=>[w.id,w]));
const names=['极高频核心词','高频词','中频词','大纲覆盖词','真题高频派生词与超纲词','红宝书拓展词汇'];
const desc=['先把最常见的词记牢','阅读中的高频面孔','稳步扩展词汇范围','按大纲查漏补缺','补齐真题中的派生与超纲词','原书音标与释义 · 重合词共用进度'];
const KEY='kaoyan-word-desk-v1',app=document.querySelector('#app');let s=E.fresh(),saveError=false,storageBroken=false,view='home',toastTimer,undo=null;
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>E.dateKey(),fmt=n=>n.toLocaleString('zh-CN');
try{const raw=localStorage.getItem(KEY);if(raw){const loaded=JSON.parse(raw);s=E.migrate(loaded,W)}}
catch(e){storageBroken=true;saveError=true}
function toast(t){const el=document.querySelector('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4000)}
function save(){s.updatedAt=new Date().toISOString();try{if(storageBroken)throw Error();localStorage.setItem(KEY,JSON.stringify(s));saveError=false;document.querySelector('#save-state').textContent='● 已自动保存到本机'}catch(e){saveError=true;document.querySelector('#save-state').textContent='⚠ 保存失败，请导出备份';toast('本机保存不可用，请先导出进度备份。')}return !saveError}
function remainingDays(){return Math.max(0,Math.ceil((new Date(s.settings.target+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000))}
function active(){return s.session&&s.session.date===today()&&s.session.queue.length>0}
function counts(){const r=Object.values(s.records);return {seen:r.length,known:r.filter(x=>x.status==='known').length,stubborn:r.filter(x=>x.stubborn).length,due:E.due(s,W,today()).length}}
function goHome(){view='home';render()}
function render(){if(view==='study')renderStudy();else renderHome()}
function renderHome(){
 const c=counts(),d=E.day(s,today()),pool=E.scopeWords(W,s.settings.scope),learned=pool.filter(w=>s.records[w.id]).length;
 const available=Math.min(Math.max(0,s.settings.daily-d.new.length),pool.filter(w=>!s.records[w.id]&&!d.new.includes(w.id)).length);
 const pending=d.new.filter(id=>!d.passed.includes(id)&&!d.deferred.includes(id)).length;
 const dayNumber=Math.max(1,Math.floor((new Date(today()+'T12:00:00')-new Date(s.settings.start+'T12:00:00'))/86400000)+1);
 app.innerHTML=`${saveError?'<p class="error-banner">本机数据读取或保存异常。为保护原记录，暂停覆盖保存；请导出备份，或从设置导入有效备份。</p>':''}
 <div class="intro"><div><div class="eyebrow">A LITTLE EVERY DAY</div><h1>今天，也记住一点。</h1><p class="muted">按词频循序渐进，把时间留给还不熟悉的词。</p></div><div class="date-note">${esc(new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}))}<br>距目标日 <strong>${remainingDays()}</strong> 天</div></div>
 ${active()?`<div class="session-banner"><span>上次的进度还在 · 剩余 ${s.session.queue.length} 个词待巩固</span><button data-act="resume">继续背诵 →</button></div>`:''}
 <div class="stats"><div class="stat"><strong>${fmt(c.seen)}</strong><span>已学习 / ${fmt(W.length)} 词</span></div><div class="stat"><strong>${fmt(c.known)}</strong><span>当前认识</span></div><div class="stat"><strong>${d.passed.length}</strong><span>今日已过关</span></div><div class="stat"><strong>${fmt(c.due)}</strong><span>到期需复习</span></div></div>
 <div class="daily-panel"><section class="today-card"><div class="eyebrow">TODAY’S PLAN · 第 ${dayNumber} 天</div><h2>今日新词 <span>${pending+available}</span><small style="font-size:14px;font-weight:400"> 词</small></h2><p>从高频开始，一组一组过。模糊或忘记的词，会在本组中再次出现。</p><div class="today-bottom"><button class="primary" data-act="new">${active()?'继续学习':'开始今日学习'} <span style="margin-left:15px">→</span></button><small>每日 ${s.settings.daily} 个新词 · 今日已安排 ${d.new.length} 个</small></div></section>
 <div class="side-tasks"><section class="task-card"><div><h3>到期复习 <span class="task-num">${c.due}</span></h3><p>先回顾，再向前一步</p></div><button class="circle-btn" data-act="review" aria-label="开始到期复习">↗</button></section><section class="task-card"><div><h3>顽固词本 <span class="task-num">${c.stubborn}</span></h3><p>反复忘记的词，留一点耐心</p></div><button class="circle-btn" data-act="stubborn" aria-label="开始顽固词复习">↗</button></section></div></div>
 <div class="section-head"><h2>你的六个词汇板块</h2><button class="print-btn" data-act="print">▤ 打印今日词表</button></div>
 <div class="groups">${names.map((name,i)=>{const group=E.groupWords(W,i),seen=group.filter(w=>s.records[w.id]).length,known=group.filter(w=>s.records[w.id]?.status==='known').length;return `<button class="group-card" data-act="group" data-group="${i}"><div class="group-top"><span class="group-index">0${i+1}</span><span>${fmt(group.length)} 词 ↗</span></div><h3>${name}</h3><p>${desc[i]}</p><div class="track"><i style="width:${known/group.length*100}%"></i></div><div class="group-foot"><span>已学 ${seen} · 认识 ${known}</span><span>${Math.round(known/group.length*100)}%</span></div></button>`}).join('')}
 <section class="plan-card"><span class="eyebrow">YOUR OWN PACE</span><h3 style="margin-top:12px">稳稳地，往前走。</h3><p>本轮范围 ${fmt(pool.length)} 词，已学 ${fmt(learned)} 词。按每日 ${s.settings.daily} 词，还需约 ${Math.ceil((pool.length-learned)/s.settings.daily)} 个新词学习日。</p><button data-act="settings">调整学习计划 →</button></section></div>
 <p class="footnote">认识的词退出本组，稍后按间隔抽查；模糊隔 6 词、忘记隔 3 词再出现。同词本组连续 3 次未过关，转入顽固词本。</p>`;
}
function start(kind,group=null){
 if(active()){view='study';render();toast('先接着完成当前这一组，进度已保留。');return}
 if(kind==='new'&&s.settings.start>today()){toast('计划尚未开始，可在学习设置中调整开始日期。');return}
 if(kind==='stubborn'){
  const d=E.day(s,today());d.deferred=d.deferred.filter(id=>!s.records[id]?.stubborn);
 }
 E.prepare(s,W,today(),kind,group);undo=null;save();view='study';render();
}
function renderStudy(){
 const q=s.session;if(!q||q.date!==today()){goHome();toast('新的一天开始了，今日任务已重新安排。');return}
 const total=q.ids.length,passed=q.passed.length,remaining=q.queue.length;
 const title={new:q.group===null?'今日新词':names[q.group],review:'到期复习',stubborn:'顽固词复习'}[q.kind];
 if(!remaining){app.innerHTML=`<div class="study-wrap"><button class="quiet" data-act="home">← 返回工作台</button><section class="complete"><div class="seal">✓</div><h2>${total?'这一组，完成了。':'暂时没有待背词'}</h2><p>${total?`本组 ${total} 词，${passed} 词已过关${q.deferred.length?`，${q.deferred.length} 词转入顽固词本`:''}。`:'当天已安排的任务已过关或达到每日新词上限；也可以稍后再来。'}</p><p class="muted">${q.deferred.length?'顽固词明天优先复习，也可以从首页手动再练。':'每次小小的积累，都算数。'}</p><button class="primary" data-act="home">回到工作台</button><button data-act="print">打印今日词表</button>${undo?'<button data-act="undo">撤销上一次作答</button>':''}</section></div>`;return}
 const item=q.queue[0],w=byId[item.id],r=s.records[w.id];
 app.innerHTML=`<div class="study-wrap"><div class="study-top"><button class="quiet" data-act="home">← 返回工作台</button><h2>${esc(title)}</h2><span class="pill">本组 ${total} 词</span></div><div class="study-progress"><p><span>已过关 ${passed}${q.deferred.length?` · 暂缓 ${q.deferred.length}`:''}</span><span>待巩固 ${remaining}</span></p><div class="track"><i style="width:${(passed+q.deferred.length)/total*100}%"></i></div></div>
 <section class="word-card"><div class="word-meta"><span>${names[q.group===5?5:w.group]} · #${esc(w.id)}</span><span>${item.wrong?'再次回忆':r?'复习':'初次见面'}</span></div><h1 class="word">${esc(w.word)}</h1>${w.ipa?`<div class="ipa">/${esc(w.ipa)}/</div>`:''}${frequencyHTML(w)}${q.revealed?`<div class="meaning">${meaningHTML(w,q.group===5)}</div>${w.excerpt?'<p class="source-note">原表释义有截断 · 此处保留原文节选</p>':''}`:'<button class="reveal" data-act="reveal">回忆后，查看释义 <small>↵</small></button>'}</section>
 <div class="answer-buttons"><button class="forgot" data-act="answer" data-value="forgot" ${!q.revealed?'disabled':''}>忘记 <small>1 · 隔 3 词再见</small></button><button class="fuzzy" data-act="answer" data-value="fuzzy" ${!q.revealed?'disabled':''}>模糊 <small>2 · 隔 6 词再见</small></button><button class="known" data-act="answer" data-value="known" ${!q.revealed?'disabled':''}>认识 <small>3 · 本次过关</small></button></div><p class="study-hint">${q.revealed?'根据刚才的回忆作答；如果是看了解释才想起来，请选“模糊”或“忘记”。':'先在心里想出意思，再揭晓答案。'} 剩余词少时会缩短间隔。</p><div class="study-tools"><button class="quiet" data-act="undo" ${!undo?'disabled':''}>↶ 撤销上一次作答</button><button class="print-btn" data-act="print">▤ 打印今日</button></div></div>`;
}
function frequencyHTML(w){
 if(w.group===5)return '';
 const m=w.stats.match(/^([\d.]+)\/(\d+)\s*\|\s*(\d+)\s*套\s*\|\s*(\d{4})/);
 if(m)return `<div class="frequency-meta"><span>真题出现 <strong>${esc(m[2])}</strong> 次</span><span>涉及 ${esc(m[3])} 套</span><span>最近 ${esc(m[4])} 年</span></div>`;
 return w.stats.includes('未考查')?'<p class="frequency-meta">所统计的 46 套真题中未出现</p>':`<p class="frequency-meta">${esc(w.stats)}</p>`;
}
function meaningHTML(w,book=false){
 if(!w.redbookImage||!(book||w.group===5))return esc(w.meaning);
 const alt=esc(w.redbookWord||w.word)+' 红宝书原图音标与释义',c=w.imageClip;
 const image=c?`<div class="source-sprite-frame" style="max-width:${c.width}px"><div class="source-sprite" style="padding-top:${c.height/c.width*100}%"><img class="source-meaning" src="${w.redbookImage}" alt="${alt}" style="width:${c.sheetWidth/c.width*100}%;max-width:none;transform:translateY(-${c.y/c.sheetHeight*100}%)"></div></div>`:`<img class="source-meaning" src="${w.redbookImage}" alt="${alt}">`;
 return image+`<p class="source-note">红宝书第 ${w.redbookPage} 页 · 保留原图音标与释义</p>`;
}
function settings(){document.querySelector('#daily-input').value=s.settings.daily;document.querySelector('#start-input').value=s.settings.start;document.querySelector('#target-input').value=s.settings.target;document.querySelector('#scope-input').value=s.settings.scope;const a=document.querySelector('#backup-download a');if(a){URL.revokeObjectURL(a.href);a.remove()}document.querySelector('#backup-text').value=backupText();document.querySelector('#backup-text-panel').open=false;document.querySelector('#backup-note').textContent='若浏览器没有下载响应，可以复制备份文本，粘贴到备忘录保存。';document.querySelector('#settings').showModal()}
let printModel=null,printScrollY=0,pdfBusy=false,pdfUrl=null,pdfAsset=null,pdfJob=0;const pdfUrls=[];
function doPrint(test){
 const d=E.day(s,today());let ids=[...new Set([...d.new,...d.review])],planned=false;
 if(!ids.length){planned=true;ids=[...new Set([...E.due(s,W,today()).slice(0,100).map(w=>w.id),...E.scopeWords(W,s.settings.scope).filter(w=>!s.records[w.id]).slice(0,s.settings.daily).map(w=>w.id)])]}
 if(!ids.length){toast('今天暂无待背词，可先从词汇板块安排一组，再生成词表。');return}
 printModel={ids:[...ids],date:today(),test,book:s.session?.group===5};
 document.querySelector('#print-area').innerHTML=`<h1>词序 · ${test?'遮义自测':'今日词表'}</h1><p>${today()} · 共 ${ids.length} 词　姓名：____________</p><table><thead><tr><th>序号</th><th>单词 / 音标</th><th>${test?'回忆释义':'中文释义'}</th><th>掌握</th></tr></thead><tbody>${ids.map((id,i)=>{const w=byId[id];return `<tr><td>${i+1}</td><td><b>${esc(w.word)}</b>${w.ipa?`<br>/${esc(w.ipa)}/`:''}</td><td>${test?'________________________':meaningHTML(w,s.session?.group===5)+(w.excerpt?'（原表截断）':'')}</td><td>□ 会<br>□ 待背</td></tr>`}).join('')}</tbody></table>`;
 document.querySelector('#print-dialog').close();printScrollY=window.scrollY;document.querySelector('#print-preview').hidden=false;document.body.classList.add('print-preview-open');
 document.querySelector('#print-status').textContent=planned?'这是按今日计划生成的预览，不会计入学习进度。可系统打印，或下载PDF后打开打印。':'词表已生成。若系统打印没有响应，可下载PDF后打开打印。';
 pdfJob++;pdfBusy=false;pdfUrl=null;pdfAsset=null;const pb=document.querySelector('[data-act="print-pdf"]');pb.disabled=false;pb.textContent='下载PDF词表';document.querySelector('#pdf-download').replaceChildren();window.scrollTo(0,0);
}
function closePrint(){pdfJob++;pdfBusy=false;document.querySelector('#print-preview').hidden=true;document.body.classList.remove('print-preview-open');window.scrollTo(0,printScrollY)}
function systemPrint(){
 document.querySelector('#print-status').textContent='已请求系统打印；如果没有弹出窗口，请点“下载PDF词表”，保存后用PDF阅读器打印。';
 try{if(typeof window.print!=='function')throw Error();window.print()}catch(error){document.querySelector('#print-status').textContent='当前浏览器未能打开系统打印。请下载PDF词表，保存后打开打印。'}
}
async function downloadPDF(){
 if(pdfBusy||!printModel)return;
 if(pdfAsset){document.querySelector('#pdf-download [data-pdf-download]').click();document.querySelector('#print-status').textContent='已再次请求下载；若未保存，请打开PDF预览，或通过系统分享保存。';return}
 pdfBusy=true;const job=++pdfJob,b=document.querySelector('[data-act="print-pdf"]'),model={...printModel,ids:[...printModel.ids]};b.disabled=true;
 const status=document.querySelector('#print-status');
 try{
  const blob=await createWordListPDF(model,byId,(n,total)=>{if(job!==pdfJob)throw Error('cancelled');status.textContent=`正在生成PDF ${n}/${total}…`});if(job!==pdfJob)return;
  pdfUrl=URL.createObjectURL(blob);pdfUrls.push(pdfUrl);if(pdfUrls.length>6)URL.revokeObjectURL(pdfUrls.shift());
  const name=`word-list-${model.date}${model.test?'-test':''}.pdf`;pdfAsset={blob,url:pdfUrl,name};const a=document.createElement('a');a.href=pdfUrl;a.download=name;a.className='pdf-save-link';a.dataset.pdfDownload='';a.textContent='保存PDF文件';
  const preview=document.createElement('a');preview.href=pdfUrl;preview.target='_blank';preview.rel='noopener';preview.className='pdf-save-link';preview.dataset.pdfPreview='';preview.textContent='打开PDF预览';
  const holder=document.querySelector('#pdf-download');holder.replaceChildren(a,preview);
  try{const file=new File([blob],name,{type:'application/pdf'});if(typeof navigator.share==='function'&&navigator.canShare?.({files:[file]})){const share=document.createElement('button');share.type='button';share.dataset.act='pdf-share';share.textContent='系统分享／保存';holder.appendChild(share)}}catch(error){}
  const hint=document.createElement('p');hint.className='muted';hint.textContent='电脑可直接保存。手机／平板若未开始下载，可打开PDF预览，再用预览页的分享菜单保存到“文件”。';holder.appendChild(hint);
  b.textContent='重新下载PDF';a.click();status.textContent='PDF已生成。请选择保存文件、打开预览，或使用设备支持的系统分享。';
 }catch(error){if(job!==pdfJob)return;const reason=error?.name==='SecurityError'?'浏览器阻止了图片读取，请通过上线网址打开，或使用完整的单HTML本地版。':String(error?.message||'未能识别的浏览器错误').slice(0,180);status.textContent='PDF生成未完成：'+reason;toast('PDF生成失败，原学习进度未受影响。')}
 finally{if(job===pdfJob){pdfBusy=false;b.disabled=false}}
}
async function sharePDF(){
 if(!pdfAsset)return;const status=document.querySelector('#print-status');
 try{const file=new File([pdfAsset.blob],pdfAsset.name,{type:'application/pdf'});if(!navigator.canShare?.({files:[file]})||typeof navigator.share!=='function')throw Error('unsupported');await navigator.share({files:[file],title:'词序今日词表'});status.textContent='系统分享已返回，请确认是否已保存文件；PDF仍可在下方预览或下载。'}
 catch(error){status.textContent=error?.name==='AbortError'?'已取消分享，PDF仍保留，可继续预览或下载。':'当前浏览器未能打开系统分享。请点“打开PDF预览”，再使用预览页的保存或分享功能。'}
}
function backupText(){return JSON.stringify(s,null,2)}
function showBackupText(){
 const field=document.querySelector('#backup-text');field.value=backupText();
 document.querySelector('#backup-text-panel').open=true;
 document.querySelector('#backup-note').textContent=`备份已生成，包含 ${Object.keys(s.records).length} 个词的学习记录。若没有下载文件，可复制下方完整备份文本保存。`;
 return field;
}
function exportProgress(){
 const field=showBackupText();
 try{
  const blob=new Blob([field.value],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`word-progress-${today()}.json`;a.textContent='再次下载备份文件';a.className='backup-download';
  const holder=document.querySelector('#backup-download');const old=holder.querySelector('a');if(old){URL.revokeObjectURL(old.href);old.remove()}
  holder.appendChild(a);a.click();
  toast('已请求下载；若未收到文件，请复制下方备份文本。');
 }catch(error){toast('此浏览器未能下载，请使用备份文本保存。')}
}
async function copyProgress(){
 const field=showBackupText(),text=field.value;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);toast('备份文本已复制，请粘贴到备忘录或文档保存。');return}}catch(error){}
 field.focus();field.select();field.setSelectionRange(0,field.value.length);
 try{if(document.execCommand('copy')){toast('备份文本已复制，请粘贴保存。');return}}catch(error){}
 toast('已选中备份文本，请长按选择“复制”，再粘贴保存。');
}
function restoreProgress(text){
 try{
  if(text.length>10000000)throw Error('large');
  const loaded=E.migrate(JSON.parse(text.replace(/^\uFEFF/,'')),W);
  if(!window.confirm('恢复备份会替换当前设备上的学习记录，确定继续？'))return;
  s=loaded;storageBroken=false;undo=null;const persisted=save();
  document.querySelector('#settings').close();goHome();
  toast(persisted?'备份已恢复，可以接着背了。':'备份已载入，但本机保存失败，请保留原备份。');
 }catch(error){toast('备份不完整或格式不正确，当前进度未更改。')}
}
document.addEventListener('click',e=>{
 if(e.target.closest('.brand')){e.preventDefault();goHome();return}
 const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
 switch(b.dataset.act){
 case 'home':goHome();break;
 case 'resume':view='study';render();break;
 case 'new':start('new');break;
 case 'review':start('review');break;
 case 'stubborn':start('stubborn');break;
 case 'group':start('new',Number(b.dataset.group));break;
 case 'settings':settings();break;
 case 'close':b.closest('dialog').close();break;
 case 'reveal':if(active()){s.session.revealed=true;save();render()}break;
 case 'answer':if(active()){undo=JSON.stringify(s);E.answer(s,b.dataset.value,today());save();render()}break;
 case 'undo':if(undo){s=JSON.parse(undo);undo=null;save();render();toast('已撤销上一次作答')}break;
 case 'print':document.querySelector('#print-dialog').showModal();break;
 case 'print-full':doPrint(false);break;
 case 'print-test':doPrint(true);break;
 case 'print-back':closePrint();break;
 case 'print-system':systemPrint();break;
 case 'print-pdf':downloadPDF();break;
 case 'pdf-share':sharePDF();break;
 case 'export':exportProgress();break;
 case 'copy-backup':copyProgress();break;
 case 'select-backup':{const f=showBackupText();f.focus();f.select();f.setSelectionRange(0,f.value.length);toast('已选中全部备份文本，可长按复制。');break}
 case 'restore-text':restoreProgress(document.querySelector('#restore-text').value);break;
 case 'import':document.querySelector('#import-file').click();break;
 }
});
document.querySelector('#plan-form').addEventListener('submit',e=>{e.preventDefault();const daily=Number(document.querySelector('#daily-input').value),start=document.querySelector('#start-input').value,target=document.querySelector('#target-input').value,scope=Number(document.querySelector('#scope-input').value);if(target<start){toast('目标日期应晚于或等于开始日期。');return}s.settings={daily,start,target,scope};save();document.querySelector('#settings').close();render();toast('计划已更新，已有学习进度已保留。')});
document.querySelector('#import-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10000000)throw Error();restoreProgress(await f.text())}catch(err){toast('无法读取备份文件，当前进度未更改。')}finally{e.target.value=''}});
document.addEventListener('keydown',e=>{if(view!=='study'||!document.querySelector('#print-preview').hidden||document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;if(e.key==='Enter'||e.code==='Space'){e.preventDefault();document.querySelector('[data-act="reveal"]')?.click()}else if(['1','2','3'].includes(e.key)){document.querySelector(`[data-value="${{1:'forgot',2:'fuzzy',3:'known'}[e.key]}"]`)?.click()}});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{const incoming=E.migrate(JSON.parse(e.newValue),W);if(E.valid(incoming,W)){s=incoming;undo=null;render();toast('已同步此浏览器另一标签页的进度。')}}catch(err){}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
for(const [value,groups] of [[1500,[0,1]],[3000,[0,1,2]],[5842,[0,1,2,3,4,5]]]){const n=W.filter(w=>groups.includes(w.group)).length;document.querySelector(`#scope-input option[value="${value}"]`).textContent=(value===1500?'极高频＋高频':value===3000?'前三部分':'全部六部分')+' · '+fmt(n)+' 词'}
if(storageBroken)document.querySelector('#save-state').textContent='⚠ 本机数据读取异常';render();
})();
