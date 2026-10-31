(function(root){
'use strict';
const DAY=86400000;
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const plusDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return dateKey(d)};
function fresh(today=dateKey()){return {version:1,settings:{daily:75,start:today,target:plusDays(today,45),scope:1500},records:{},days:{},session:null,updatedAt:null};}
function day(s,today){return s.days[today]||(s.days[today]={new:[],review:[],passed:[],deferred:[],answers:0})}
function scopeWords(words,scope){return scope===5842?words:words.filter(w=>w.group<4&&Number(w.id)<=scope)}
function inGroup(w,g){return w.group===g||(w.extraGroups||[]).includes(g)}
function groupWords(words,g){return words.filter(w=>inGroup(w,g)).sort((a,b)=>g===5?a.redbookOrder-b.redbookOrder:0)}
function due(s,words,today){return words.filter(w=>{const r=s.records[w.id];return r&&r.due<=today&&r.passedDate!==today}).sort((a,b)=>{const x=s.records[a.id],y=s.records[b.id];return Number(y.stubborn)-Number(x.stubborn)||(x.status==='forgot'?0:x.status==='fuzzy'?1:2)-(y.status==='forgot'?0:y.status==='fuzzy'?1:2)||x.due.localeCompare(y.due)})}
function prepare(s,words,today,kind='new',group=null){
 const d=day(s,today);let ids;
 if(kind==='new'){
  const pool=group===null?scopeWords(words,s.settings.scope):groupWords(words,group);
  const already=d.new.filter(id=>pool.some(w=>w.id===id));
  const additions=pool.filter(w=>!s.records[w.id]&&!d.new.includes(w.id)).slice(0,Math.max(0,s.settings.daily-d.new.length));
  ids=[...already,...additions.map(w=>w.id)];d.new=[...new Set([...d.new,...ids])];
 }else if(kind==='review'){
  ids=due(s,words,today).slice(0,100).map(w=>w.id);d.review=[...new Set([...d.review,...ids])];
 }else{
  ids=words.filter(w=>s.records[w.id]?.stubborn&&s.records[w.id].passedDate!==today).slice(0,50).map(w=>w.id);d.review=[...new Set([...d.review,...ids])];
 }
 ids=ids.filter(id=>!d.passed.includes(id)&&!d.deferred.includes(id));
 s.session={date:today,kind,group,ids:[...ids],queue:ids.map(id=>({id,wrong:0})),passed:[],deferred:[],revealed:false};return s.session;
}
function answer(s,value,today){
 const q=s.session;if(!q||q.date!==today||!q.queue.length||!q.revealed)return false;
 const item=q.queue.shift(),id=item.id,d=day(s,today);
 const r=s.records[id]||(s.records[id]={status:'new',success:0,lapses:0,stubborn:false,due:today});
 d.answers++;r.seen=today;
 if(value==='known'){
  r.success++;r.status='known';r.due=plusDays(today,[1,3,7,14,30][Math.min(r.success-1,4)]);r.passedDate=today;r.stubborn=false;
  q.passed.push(id);if(!d.passed.includes(id))d.passed.push(id);
 }else{
  r.status=value;r.success=0;r.lapses++;r.due=plusDays(today,1);item.wrong++;
  if(item.wrong>=3){r.stubborn=true;q.deferred.push(id);if(!d.deferred.includes(id))d.deferred.push(id)}
  else q.queue.splice(Math.min(value==='forgot'?3:6,q.queue.length),0,item);
 }
 q.revealed=false;return true;
}
function valid(s,words){
 const ids=new Set(words.map(w=>w.id)),dt=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
 if(!s||s.version!==1||!s.settings||!s.records||!s.days)return false;
 const t=s.settings;if(!Number.isInteger(t.daily)||t.daily<5||t.daily>300||![1500,3000,5842].includes(t.scope)||!dt(t.start)||!dt(t.target)||t.target<t.start)return false;
 if(Object.entries(s.records).some(([id,r])=>!ids.has(id)||!r||!['new','known','fuzzy','forgot'].includes(r.status)||!dt(r.due)||!Number.isInteger(r.success)||r.success<0||!Number.isInteger(r.lapses)||r.lapses<0||typeof r.stubborn!=='boolean'))return false;
 const arr=a=>Array.isArray(a)&&a.every(id=>ids.has(id));
 if(Object.entries(s.days).some(([k,d])=>!dt(k)||!d||!['new','review','passed','deferred'].every(n=>arr(d[n]))||!Number.isInteger(d.answers)||d.answers<0))return false;
 const q=s.session;
 return !q||(dt(q.date)&&['new','review','stubborn'].includes(q.kind)&&arr(q.ids)&&arr(q.passed)&&arr(q.deferred)&&Array.isArray(q.queue)&&q.queue.every(i=>ids.has(i.id)&&Number.isInteger(i.wrong)&&i.wrong>=0&&i.wrong<3)&&typeof q.revealed==='boolean');
}
function migrate(s,words){
 const legacy=[...words];for(let i=1;i<=5297;i++)legacy.push({id:String(i)});for(let i=1;i<=545;i++)legacy.push({id:'S'+i});
 if(!valid(s,legacy))throw Error('invalid backup');
 const ids=new Set(words.map(w=>w.id)),copy=JSON.parse(JSON.stringify(s));copy.retiredRecords=copy.retiredRecords||{};
 for(const id of Object.keys(copy.records))if(!ids.has(id)){copy.retiredRecords[id]=copy.records[id];delete copy.records[id]}
 for(const d of Object.values(copy.days))for(const k of ['new','review','passed','deferred'])d[k]=d[k].filter(id=>ids.has(id));
 if(copy.session){for(const k of ['ids','passed','deferred'])copy.session[k]=copy.session[k].filter(id=>ids.has(id));copy.session.queue=copy.session.queue.filter(i=>ids.has(i.id))}
 if(!valid(copy,words))throw Error('invalid migrated backup');return copy;
}
root.WordEngine={dateKey,plusDays,fresh,day,scopeWords,inGroup,groupWords,due,prepare,answer,valid,migrate};
})(typeof module!=='undefined'?module.exports:window);
