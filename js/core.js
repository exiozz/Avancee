/* Avancée — socle : constantes, état, utilitaires, données, écritures.
   Les fichiers se chargent dans l'ordre core → ui → views → overlays → main et partagent ces fonctions globales. */
'use strict';

var PRIV='';  /* sur le site, une seule base : les droits sont gérés par le serveur, ligne par ligne */
var DEFCOLS=[{id:'todo',name:'À faire'},{id:'doing',name:'En cours'},{id:'done',name:'Terminé',done:true}];
var TPL={
  client:{name:'Projet client',cols:['Brief','À faire','En cours','Validation client','Livré']},
  vente:{name:'Suivi de prospects',cols:['Prospect','Contacté','Devis envoyé','Négociation','Gagné']},
  contenu:{name:'Contenu',cols:['Idées','Rédaction','Relecture','Publié']},
  perso:{name:'Perso',cols:['Idées','À faire','En cours','Terminé']}
};
var PST={active:'En cours',wait:'En attente',done:'Livré',archived:'Archivé'};
var PSTC={active:0,wait:3,done:2,archived:-1};
var CST={lead:'Prospect',active:'Actif',pause:'En pause',done:'Terminé'};
var CSTC={lead:3,active:2,pause:-1,done:0};
var PRIO={0:'Aucune',1:'Basse',2:'Moyenne',3:'Haute'};
var COLORS=['Bleu','Rose','Vert','Orange','Violet','Cyan'];
var DAYS=['lun.','mar.','mer.','jeu.','ven.','sam.','dim.'];
var MODES=[['board','Kanban','board'],['list','Liste','list'],['table','Table','table'],['cal','Calendrier','calendar'],['doc','Notes','note']];
var EMOJIS=['📌','🚀','💡','🎯','📅','📝','🛠️','🎨','📦','💼','🧪','📚','🏠','💬','🔥','⭐','✅','🌱','🎮','💣','📈','🧩','🔧','🧠'];
var ACCENTS={
  cobalt:{n:'Cobalt',l:'#2F5BEA',d:'#7C9BFF'},
  violet:{n:'Violet',l:'#6E56CF',d:'#A996FF'},
  emeraude:{n:'Émeraude',l:'#0B8A63',d:'#3DD6A0'},
  corail:{n:'Corail',l:'#D9480F',d:'#FF8A5C'},
  rose:{n:'Rose',l:'#C8327A',d:'#FF7EB6'},
  ardoise:{n:'Ardoise',l:'#3B4252',d:'#C3C9D6'}
};
var WIDGETS={
  today:{t:'Aujourd’hui'},week:{t:'Cette semaine'},projects:{t:'Projets récents'},progress:{t:'Progression'},
  activity:{t:'Activité récente'},clients:{t:'Clients',owner:true},notes:{t:'Notes rapides',owner:true}
};
var WORDER=['today','week','projects','progress','activity','clients','notes'];

/* préférences locales (par appareil) */
var LS={
  get:function(k,d){try{var v=localStorage.getItem('av.'+k);return v==null?d:JSON.parse(v);}catch(_){return d;}},
  set:function(k,v){try{localStorage.setItem('av.'+k,JSON.stringify(v));}catch(_){}}
};
var P={theme:LS.get('theme','system'),accent:LS.get('accent','cobalt'),density:LS.get('density','normal'),size:LS.get('size','m')};
if(!ACCENTS[P.accent])P.accent='cobalt';

var S={db:null,dl:null,owner:false,unsure:false,preview:false,canEdit:false,me:null,auth:'boot',roles:{},gate:{sending:false,sent:'',err:''},
  loaded:{s:false,p:false,t:false,c:false,m:false,cfg:false,mb:false},
  raw:{s:[],p:[],t:[],c:[],m:[],cfg:[],mb:[]},
  spaces:[],projects:[],tasks:[],clients:[],meta:{},cfg:{},
  view:LS.get('view','home'),lastView:null,pmode:LS.get('pmode',{}),confirm:null,error:'',pending:null,hold:null,
  q:'',fl:null,sort:{k:'pos',d:1},cal:null,calProj:'',calMode:'month',
  task:null,taskFresh:false,menu:null,lblMgr:false,nlc:0,dirty:{},
  coll:LS.get('coll',{}),addSpace:false,addIn:null,ren:null,smenu:null,iconPick:false,comp:null,
  pal:false,pq:'',pi:0,qa:null,sheet:null,ctx:null,focus:null,
  tf:'all',tv:LS.get('tv','list'),pf:'active',dashEdit:false,det:false,
  saving:0,savedAt:0,online:true,sb:LS.get('sb',null),gAt:0};
if(S.view==='overview')S.view='home';
(function(){var d=LS.get('det',null);if(d===true||d===false)S.det=d;})();
function persist(){LS.set('view',S.view);LS.set('pmode',S.pmode);LS.set('coll',S.coll);LS.set('tv',S.tv);}
function isNarrow(){try{return !!(window.matchMedia&&window.matchMedia('(max-width:699px)').matches);}catch(_){return false;}}
function isMid(){try{return !!(window.matchMedia&&window.matchMedia('(max-width:1099px)').matches);}catch(_){return false;}}

/* ---------- utilitaires ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return String(n).padStart(2,'0');}
function ds(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function todayStr(){return ds(new Date());}
function addDays(n,from){var d=from?new Date(from):new Date();d.setDate(d.getDate()+n);return ds(d);}
function fmtDate(s){if(!s)return '';var d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function fmtStamp(n){var d=new Date(n);return isNaN(d)?'':d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function ago(n){
  var s=Math.max(0,(Date.now()-n)/1000);
  if(s<90)return 'à l’instant';
  if(s<3600)return 'il y a '+Math.round(s/60)+' min';
  if(s<86400)return 'il y a '+Math.round(s/3600)+' h';
  if(s<86400*7)return 'il y a '+Math.round(s/86400)+' j';
  return fmtStamp(n);
}
function eur(n){n=Number(n)||0;try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);}catch(_){return n+' €';}}
function pl(n,s,p){return n+' '+(n>1?p:s);}
function rnd(){return Math.random().toString(36).slice(2,9);}
function hue(p){return 'var(--h'+(((p&&p.hue)||0)%6)+')';}
function posOf(t){return t.pos!=null?t.pos:(t.createdAt||0);}
function cmpPos(a,b){return posOf(a)-posOf(b);}
function byDue(a,b){return a.due<b.due?-1:a.due>b.due?1:0;}
function colsOf(p){return (p.columns&&p.columns.length)?p.columns:DEFCOLS;}
function findLabel(p,id){return (p.labels||[]).find(function(l){return l.id===id;});}
function prioOf(t){return t.prio!=null?(Number(t.prio)||0):(t.urgent?3:0);}
function pstat(p){return PST[p.status]?p.status:'active';}
function spaceName(p){if(S.me&&p._owner&&p._owner!==S.me.id)return 'Partagés avec moi';var s=S.spaces.find(function(x){return x.id===p.spaceId;});return s?s.name:'Mes projets';}
function metaOf(pid){return S.meta[pid]||{};}
function clientOf(p){var id=metaOf(p.id).clientId;return id?S.clients.find(function(c){return c.id===id;}):null;}
function clean(o){var n=JSON.parse(JSON.stringify(o));delete n.id;delete n._priv;delete n._col;delete n._owner;return n;}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function myName(){var n=String(S.cfg.name||'').trim();if(n)return n;return S.me&&S.me.name?String(S.me.name).split(' ')[0]:'';}

/* ---------- apparence ---------- */
var HOST_THEME=document.documentElement.getAttribute('data-theme');
function isDark(){
  var t=document.documentElement.getAttribute('data-theme');
  if(t==='dark')return true; if(t==='light')return false;
  try{return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}catch(_){return false;}
}
function applyPrefs(){
  var r=document.documentElement;
  if(P.theme==='light'||P.theme==='dark')r.setAttribute('data-theme',P.theme);
  else if(HOST_THEME)r.setAttribute('data-theme',HOST_THEME); else r.removeAttribute('data-theme');
  var a=ACCENTS[P.accent]||ACCENTS.cobalt, dark=isDark();
  r.style.setProperty('--accent',dark?a.d:a.l);
  r.style.setProperty('--on-accent',dark?'#0B1020':'#FFFFFF');
  r.setAttribute('data-density',P.density);
  r.setAttribute('data-size',P.size);
}
function setPref(k,v){P[k]=v;LS.set(k,v);applyPrefs();}

/* ---------- données ---------- */
function merge(a,b){
  var m={},out=[];
  a.concat(b).forEach(function(o){if(!(o.id in m))out.push(o.id);m[o.id]=o;});
  return out.map(function(id){return m[id];});
}
function rebuild(){
  S.canEdit=!!S.me;
  S.spaces=S.raw.s;
  S.projects=S.raw.p.slice().sort(function(a,b){return (a.createdAt||0)-(b.createdAt||0);});
  S.tasks=S.raw.t;
  S.clients=S.raw.c.slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'','fr');});
  S.meta={};S.raw.m.forEach(function(m){S.meta[m.id]=m;});
  S.cfg=S.raw.cfg.find(function(c){return c.id==='main';})||{};
  S.roles={};
  if(S.me)S.raw.mb.forEach(function(m){if(m.email===S.me.email)S.roles[m.projectId]=m.role;});
}
/* droits : own = c'est mon projet ; rw = je peux modifier son contenu (propriétaire ou éditeur) */
function canW(e){return S.canEdit&&(!e||e.rw);}
function membersOf(pid){return S.raw.mb.filter(function(m){return m.projectId===pid;}).sort(function(a,b){return a.email<b.email?-1:1;});}
function isShared(p){return (S.me&&p._owner&&p._owner!==S.me.id)||membersOf(p.id).length>0;}
function rwProjects(by){by=by||index();return S.projects.filter(function(p){return pstat(p)!=='archived'&&by[p.id]&&by[p.id].rw;});}
function index(){
  var by={};
  S.projects.forEach(function(p){
    var cols=colsOf(p), own=!S.me||!p._owner||p._owner===S.me.id, e={p:p,own:own,rw:own||S.roles[p.id]==='editor',cols:cols,tasks:[],by:{},doneIds:{},total:0,done:0,pct:0};
    cols.forEach(function(c){e.by[c.id]=[];if(c.done)e.doneIds[c.id]=1;});
    by[p.id]=e;
  });
  S.tasks.forEach(function(t){
    var e=by[t.projectId]; if(!e)return;
    var id=t.columnId||t.status; if(!e.by[id])id=e.cols[0].id;
    t._col=id; e.tasks.push(t); e.by[id].push(t); if(e.doneIds[id])e.done++;
  });
  Object.keys(by).forEach(function(k){var e=by[k];e.total=e.tasks.length;e.pct=e.total?Math.round(e.done/e.total*100):0;});
  return by;
}
function isDone(t,e){return e?!!e.doneIds[t._col]:!!t.done;}
function colName(e,id){var c=e.cols.find(function(x){return x.id===id;});return c?c.name:'';}
function pass(t){
  if(S.fl&&(t.labels||[]).indexOf(S.fl)<0)return false;
  if(S.q){
    var hay=norm((t.title||'')+' '+(t.notes||'')+' '+(t.who||'')+' '+(t.check||[]).map(function(i){return i.t;}).join(' '));
    if(hay.indexOf(norm(S.q))<0)return false;
  }
  return true;
}
function inboxTasks(){return S.canEdit?S.tasks.filter(function(t){return !t.projectId;}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}):[];}
function liveTasks(by){return S.tasks.filter(function(t){return by[t.projectId]&&pstat(by[t.projectId].p)!=='archived';});}
function bucket(t,today,wk){
  if(!t.due)return 'none';
  if(t.due<today)return 'late';
  if(t.due===today)return 'today';
  if(t.due<=wk)return 'week';
  return 'later';
}
function mine(t){var n=norm(myName());return !t.who||!n||norm(t.who)===n;}
function modeOf(p){var m=S.pmode[p.id]||p.defView||'board';return MODES.some(function(x){return x[0]===m;})?m:'board';}
function validView(by){
  var v=S.view;
  if(v==='home'||v==='projects'||v==='calendar'||v==='settings')return true;
  if(v==='inbox'||v==='tasks'||v==='clients')return S.canEdit;
  if(v.indexOf('c:')===0)return S.canEdit&&S.clients.some(function(c){return 'c:'+c.id===v;});
  return !!by[v];
}
function clientStats(c,by){
  var ps=S.projects.filter(function(p){return metaOf(p.id).clientId===c.id;});
  var tot=0,done=0,amount=0,paid=0;
  ps.forEach(function(p){var e=by[p.id],m=metaOf(p.id);tot+=e.total;done+=e.done;amount+=Number(m.amount)||0;paid+=Number(m.paid)||0;});
  return {ps:ps,pct:tot?Math.round(done/tot*100):0,amount:amount,paid:paid,rest:amount-paid};
}
function recentActivity(by,n){
  var out=[];
  S.tasks.forEach(function(t){
    if(t.projectId&&!by[t.projectId])return;
    var a=t.act||[];
    if(!a.length&&t.createdAt)out.push({at:t.createdAt,t:'Carte créée',task:t});
    a.forEach(function(x){out.push({at:x.at,t:x.t,task:t});});
  });
  return out.sort(function(a,b){return b.at-a.at;}).slice(0,n||8);
}

/* ---------- ajout rapide en langage naturel ---------- */
function parseQuick(text,projects,now){
  now=now?new Date(now):new Date();
  var out={title:'',due:'',prio:0,projectId:null}, s=' '+String(text||'')+' ';
  function cut(re,fn){var m=s.match(re);if(m){fn(m);s=s.replace(re,' ');}}
  cut(/\s#([^\s#]+)/,function(m){
    var k=norm(m[1]), hit=(projects||[]).find(function(p){return norm(p.name).replace(/\s+/g,'').indexOf(k)===0;})||(projects||[]).find(function(p){return norm(p.name).replace(/\s+/g,'').indexOf(k)>=0;});
    if(hit)out.projectId=hit.id;
  });
  cut(/\s(?:priorit[ée]\s+haute|urgente?|!!!)(?=\s)/i,function(){out.prio=3;});
  if(!out.prio)cut(/\spriorit[ée]\s+(moyenne|normale)(?=\s)/i,function(){out.prio=2;});
  if(!out.prio)cut(/\spriorit[ée]\s+(basse|faible)(?=\s)/i,function(){out.prio=1;});
  function plus(n){var d=new Date(now);d.setDate(d.getDate()+n);return ds(d);}
  cut(/\sapr[èe]s[- ]demain(?=\s)/i,function(){out.due=plus(2);});
  if(!out.due)cut(/\sdemain(?=\s)/i,function(){out.due=plus(1);});
  if(!out.due)cut(/\saujourd[’']?hui(?=\s)/i,function(){out.due=plus(0);});
  if(!out.due)cut(/\sdans\s+(\d{1,3})\s+jours?(?=\s)/i,function(m){out.due=plus(parseInt(m[1],10));});
  if(!out.due)cut(/\sdans\s+(\d{1,2})\s+semaines?(?=\s)/i,function(m){out.due=plus(7*parseInt(m[1],10));});
  if(!out.due)cut(/\s(?:le\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/,function(m){
    var y=m[3]?parseInt(m[3],10):now.getFullYear(); if(y<100)y+=2000;
    var d=new Date(y,parseInt(m[2],10)-1,parseInt(m[1],10),12);
    if(!m[3]&&ds(d)<ds(now))d.setFullYear(y+1);
    if(!isNaN(d))out.due=ds(d);
  });
  if(!out.due){
    var wd=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    cut(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=\s)/i,function(m){
      var target=wd.indexOf(m[1].toLowerCase()), diff=(target-now.getDay()+7)%7; if(diff===0)diff=7;
      out.due=plus(diff);
    });
  }
  out.title=s.replace(/\s+/g,' ').trim();
  return out;
}

/* ---------- toasts, indicateur d'enregistrement ---------- */
var TOAST={n:0,undo:{}};
function toast(msg,opt){
  var box=document.getElementById('toasts'); if(!box)return;
  var id='t'+(++TOAST.n), el=document.createElement('div');
  el.className='toast'+(opt&&opt.bad?' bad':''); el.dataset.toast=id;
  var sp=document.createElement('span'); sp.textContent=msg; el.appendChild(sp);
  if(opt&&opt.undo){
    TOAST.undo[id]=opt.undo;
    var b=document.createElement('button'); b.type='button'; b.textContent='Annuler'; b.dataset.act='toast-undo'; b.dataset.id=id; el.appendChild(b);
  }
  box.appendChild(el);
  while(box.children.length>3)box.removeChild(box.firstChild);
  setTimeout(function(){delete TOAST.undo[id];if(el.parentNode)el.parentNode.removeChild(el);},opt&&opt.undo?6500:3500);
}
function saveHtml(){
  if(!S.online)return '<span class="sv off" id="save">'+ic('offline')+'Hors ligne</span>';
  if(S.saving>0)return '<span class="sv" id="save"><i class="spin"></i>Enregistrement…</span>';
  if(S.savedAt&&Date.now()-S.savedAt<2600)return '<span class="sv ok" id="save">'+ic('check')+'Enregistré</span>';
  return '<span class="sv" id="save"></span>';
}
function paintSave(){var el=document.getElementById('save');if(el)el.outerHTML=saveHtml();}
function run(fn){
  S.saving++;paintSave();
  return Promise.resolve().then(fn).then(function(){
    S.saving=Math.max(0,S.saving-1);S.savedAt=Date.now();paintSave();
    setTimeout(paintSave,2800);
  },function(e){
    S.saving=Math.max(0,S.saving-1);S.pending=null;
    var denied=e&&e.code==='invalid_argument';
    if(denied&&S.unsure){S.owner=false;rebuild();}
    toast(denied?'Modification refusée : tu n’as pas les droits sur cet élément.':'Enregistrement impossible. Réessaie dans un instant.',{bad:true});
    render();
  });
}

/* ---------- références ---------- */
function projById(id){return S.projects.find(function(p){return p.id===id;});}
function taskById(id){return S.tasks.find(function(x){return x.id===id;});}
function realm(pid){if(!pid)return PRIV;var p=projById(pid);return p&&p._priv?PRIV:'';}
function tdoc(id){var t=taskById(id);return S.db.doc((t&&t._priv?PRIV:'')+'tasks/'+id);}
function pdoc(id){return S.db.doc(realm(id)+'projects/'+id);}
function sdoc(id){return S.db.doc('spaces/'+id);}
function cdoc(id){return S.db.doc(PRIV+'clients/'+id);}
function curE(){return index()[S.view];}
function actOf(t,text){return (t.act||[]).concat([{t:text,at:Date.now()}]).slice(-30);}

/* ---------- écritures ---------- */
function setMeta(pid,patch){
  var n=Object.assign({},metaOf(pid),patch);delete n.id;
  return run(function(){return S.db.doc(PRIV+'meta/'+pid).set(n);});
}
function saveCfg(patch){
  var n=Object.assign({},S.cfg,patch);delete n.id;
  S.cfg=Object.assign({id:'main'},n);
  return run(function(){return S.db.doc(PRIV+'settings/main').set(n);});
}
function addSpace(name){
  S.addSpace=false;
  return run(function(){return S.db.collection('spaces').doc().set({name:name,createdAt:Date.now()});});
}
function tplCols(k){var c=TPL[k].cols;return c.map(function(n,i){var o={id:'c'+rnd(),name:n};if(i===c.length-1)o.done=true;return o;});}
function addProject(name,spaceId,opt){
  opt=opt||{};
  var ref=S.db.collection((opt.priv?PRIV:'')+'projects').doc();
  S.view=ref.id;S.pending=ref.id;S.q='';S.fl=null;S.addIn=null;S.comp=null;S.task=null;persist();
  var doc={name:name,desc:'',icon:'',hue:S.projects.length%6,spaceId:(!spaceId||spaceId==='_')?'':spaceId,status:'active',createdAt:Date.now()};
  if(opt.tpl)doc.columns=tplCols(opt.tpl);
  return run(function(){
    return ref.set(doc).then(function(){if(opt.clientId)return S.db.doc(PRIV+'meta/'+ref.id).set({clientId:opt.clientId});});
  });
}
function addClient(name){
  var ref=S.db.collection(PRIV+'clients').doc();
  S.view='c:'+ref.id;S.pending=S.view;persist();
  return run(function(){return ref.set({name:name,company:'',email:'',phone:'',status:'active',notes:'',createdAt:Date.now()});});
}
function delClient(id){
  var ms=S.raw.m.filter(function(m){return m.clientId===id;});
  S.confirm=null;S.view='clients';persist();
  return run(function(){
    var chain=Promise.resolve();
    ms.forEach(function(m){chain=chain.then(function(){var n=clean(m);n.clientId='';return S.db.doc(PRIV+'meta/'+m.id).set(n);});});
    return chain.then(function(){return cdoc(id).delete();});
  });
}
function deleteSpace(id){
  var ps=S.projects.filter(function(p){return p.spaceId===id;});
  S.confirm=null;S.smenu=null;
  return run(function(){
    var chain=Promise.resolve();
    ps.forEach(function(p){chain=chain.then(function(){return pdoc(p.id).update({spaceId:''});});});
    return chain.then(function(){return sdoc(id).delete();});
  });
}
function newTaskDoc(o){
  return Object.assign({projectId:'',title:'',columnId:'',pos:Date.now(),prio:0,due:'',notes:'',who:'',createdAt:Date.now(),doneAt:null,act:[{t:'Carte créée',at:Date.now()}]},o);
}
function addTask(pid,title,colId,extra){
  var doc=newTaskDoc(Object.assign({projectId:pid,title:title,columnId:colId},extra||{}));
  return run(function(){return S.db.collection(realm(pid)+'tasks').doc().set(doc);});
}
function addInbox(title,extra){
  var doc=newTaskDoc(Object.assign({title:title,done:false},extra||{}));
  return run(function(){return S.db.collection(PRIV+'tasks').doc().set(doc);});
}
/* crée une tâche depuis l'ajout rapide : dans un projet (première colonne) ou dans l'Inbox */
function quickCreate(q){
  var extra={due:q.due||'',prio:q.prio||0};
  if(q.projectId&&projById(q.projectId)){
    var e=index()[q.projectId];
    addTask(q.projectId,q.title,e.cols[0].id,extra);
    toast('Tâche ajoutée à « '+e.p.name+' ».');
  }else{addInbox(q.title,extra);toast('Tâche ajoutée à l’Inbox.');}
}
/* range une tâche de l'Inbox dans un projet */
function fileTask(id,pid){
  var t=taskById(id), e=index()[pid]; if(!t||!e)return;
  var d=clean(t);d.projectId=pid;d.columnId=e.cols[0].id;d.pos=Date.now();delete d.done;d.act=actOf(t,'Rangée dans « '+e.p.name+' »');
  var to=realm(pid), from=t._priv?PRIV:'';
  toast('Rangée dans « '+e.p.name+' ».');
  return run(function(){
    if(to===from)return S.db.doc(to+'tasks/'+id).set(d);
    return S.db.doc(to+'tasks/'+id).set(d).then(function(){return S.db.doc(from+'tasks/'+id).delete();});
  });
}
function moveTask(e,id,colId,pos){
  var t=taskById(id), patch={columnId:colId,pos:pos,doneAt:e.doneIds[colId]?Date.now():null};
  if(t&&t._col!==colId)patch.act=actOf(t,'Déplacée vers « '+colName(e,colId)+' »');
  return run(function(){return tdoc(id).update(patch);});
}
function toggleTask(t,e){
  if(!e){
    var nd=!t.done;
    return run(function(){return tdoc(t.id).update({done:nd,doneAt:nd?Date.now():null,act:actOf(t,nd?'Marquée comme terminée':'Rouverte')});});
  }
  var done=isDone(t,e), target=done?e.cols.find(function(c){return !c.done;}):e.cols.find(function(c){return c.done;});
  if(!target)return;
  moveTask(e,t.id,target.id,Date.now());
}
function deleteTask(t){
  var path=(t._priv?PRIV:'')+'tasks/'+t.id, data=clean(t);
  run(function(){return S.db.doc(path).delete();});
  toast('Carte supprimée.',{undo:function(){run(function(){return S.db.doc(path).set(data);});}});
}
function saveCols(pid,arr){return run(function(){return pdoc(pid).update({columns:arr});});}
function addColumn(e,name){return saveCols(e.p.id,e.cols.concat([{id:'c'+rnd(),name:name}]));}
function moveColumn(e,cid,dir){
  var arr=e.cols.slice(), i=arr.findIndex(function(c){return c.id===cid;}), j=i+dir;
  if(i<0||j<0||j>=arr.length)return;
  var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;saveCols(e.p.id,arr);
}
function deleteColumn(e,cid){
  var arr=e.cols.filter(function(c){return c.id!==cid;}); if(!arr.length)return;
  var target=arr[0], moved=e.by[cid]||[];
  S.confirm=null;S.menu=null;
  return run(function(){
    var chain=Promise.resolve();
    moved.forEach(function(t){chain=chain.then(function(){return tdoc(t.id).update({columnId:target.id,doneAt:target.done?Date.now():null});});});
    return chain.then(function(){return pdoc(e.p.id).update({columns:arr});});
  });
}
function delProjectDocs(p,ts){
  var base=p._priv?PRIV:'', chain=Promise.resolve();
  ts.forEach(function(t){chain=chain.then(function(){return S.db.doc(base+'tasks/'+t.id).delete();});});
  return chain.then(function(){return S.db.doc(base+'projects/'+p.id).delete();}).then(function(){if(S.raw.m.some(function(m){return m.id===p.id;}))return S.db.doc(PRIV+'meta/'+p.id).delete();});
}
function delProject(id){
  var p=projById(id); if(!p)return;
  var ts=S.tasks.filter(function(t){return t.projectId===id;});
  S.confirm=null;S.view='projects';S.task=null;persist();
  return run(function(){return delProjectDocs(p,ts);});
}
function delDemo(){
  var ps=S.projects.filter(function(p){return p.demo;}), cs=S.clients.filter(function(c){return c.demo;}), sp=S.spaces.filter(function(s){return s.demo;});
  var tasks=S.tasks.slice();
  S.confirm=null;S.task=null;
  return run(function(){
    var chain=Promise.resolve();
    ps.forEach(function(p){chain=chain.then(function(){return delProjectDocs(p,tasks.filter(function(t){return t.projectId===p.id;}));});});
    cs.forEach(function(c){chain=chain.then(function(){return cdoc(c.id).delete();});});
    sp.forEach(function(s){chain=chain.then(function(){return sdoc(s.id).delete();});});
    return chain;
  });
}
function setPrivate(e,priv){
  var p=e.p; if(!!p._priv===priv)return;
  var from=priv?'':PRIV, to=priv?PRIV:'', pd=clean(p), ts=e.tasks.map(function(t){return {id:t.id,d:clean(t)};});
  toast(priv?'Projet privé : tes invités ne le voient plus.':'Projet partagé : tes invités peuvent le voir.');
  S.hold=p.id;
  function release(){setTimeout(function(){if(S.hold===p.id){S.hold=null;render();}},1200);}
  return run(function(){
    var chain=S.db.doc(to+'projects/'+p.id).set(pd);
    ts.forEach(function(t){chain=chain.then(function(){return S.db.doc(to+'tasks/'+t.id).set(t.d);});});
    ts.forEach(function(t){chain=chain.then(function(){return S.db.doc(from+'tasks/'+t.id).delete();});});
    return chain.then(function(){return S.db.doc(from+'projects/'+p.id).delete();});
  }).then(release,release);
}
function exportData(){
  var data={app:'Avancée',exportedAt:new Date().toISOString(),spaces:S.spaces,projects:S.projects.map(clean_keep),tasks:S.tasks.map(clean_keep),clients:S.clients,meta:S.raw.m,settings:S.cfg};
  try{
    var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    var a=document.createElement('a');a.href=url;a.download='avancee-'+todayStr()+'.json';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
    toast('Export téléchargé.');
  }catch(_){toast('Export impossible pour le moment.',{bad:true});}
}
/* ---------- partage d'un projet ---------- */
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}
function addMember(pid,email,role){
  email=String(email||'').trim().toLowerCase();
  if(!validEmail(email)){toast('Adresse e-mail invalide.',{bad:true});return false;}
  if(S.me&&email===S.me.email){toast('C’est ton adresse : tu es déjà propriétaire.',{bad:true});return false;}
  var ex=membersOf(pid).find(function(m){return m.email===email;});
  if(ex){if(ex.role!==role)setMemberRole(ex.id,role);else toast('Cette personne a déjà accès.');return true;}
  run(function(){return S.db.collection('members').doc().set({projectId:pid,email:email,role:role==='editor'?'editor':'viewer'});});
  toast(email+' peut maintenant '+(role==='editor'?'modifier':'voir')+' ce projet.');
  return true;
}
function setMemberRole(id,role){return run(function(){return S.db.doc('members/'+id).update({role:role==='editor'?'editor':'viewer'});});}
function removeMember(id){
  var m=S.raw.mb.find(function(x){return x.id===id;});
  run(function(){return S.db.doc('members/'+id).delete();});
  if(m)toast(m.email+' n’a plus accès.',{undo:function(){run(function(){return S.db.collection('members').doc().set({projectId:m.projectId,email:m.email,role:m.role});});}});
}
function clean_keep(o){var n=JSON.parse(JSON.stringify(o));delete n._col;if(n._priv){n.prive=true;}delete n._priv;return n;}

/* ---------- navigation ---------- */
function go(v){
  S.view=v;S.task=null;S.q='';S.fl=null;S.comp=null;S.dirty={};S.sheet=null;S.ctx=null;S.menu=null;S.iconPick=false;S.confirm=null;
  if(v&&projById(v)){var r=LS.get('recent',[]).filter(function(x){return x!==v;});r.unshift(v);LS.set('recent',r.slice(0,8));}
  persist();
  try{history.replaceState(null,'',projById(v)?'#p='+v:location.pathname+location.search);}catch(_){}
}
function openTask(id){
  var t=taskById(id); if(!t)return;
  S.task=id;S.taskFresh=true;S.lblMgr=false;S.dirty={};S.ctx=null;S.pal=false;
}
function closeTask(){S.task=null;S.confirm=null;S.lblMgr=false;S.dirty={};}
