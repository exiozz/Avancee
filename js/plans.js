/* On Stride — formules (Gratuit, Premium, Pro) et espace admin.
   Pas encore de paiement en ligne : on contacte, puis l'admin active la formule avec l'adresse e-mail de la personne.
   La formule de chaque personne est rangée dans la table « premium » ; seuls les admins (table « admins ») peuvent la modifier. */
'use strict';

var MB=1024*1024;
var PLANS={
  free:{n:'Gratuit',projects:5,photos:3,files:3,size:5*MB,accents:false,csv:false,mail:0,skins:false,skinAnim:false},
  premium:{n:'Premium',month:4.99,year:49,projects:Infinity,photos:8,files:10,size:25*MB,accents:true,csv:false,mail:20,skins:true,skinAnim:false},
  pro:{n:'Pro',month:9.99,year:99,projects:Infinity,photos:8,files:10,size:50*MB,accents:true,csv:true,mail:100,skins:true,skinAnim:true}
};
var PLAN_ORDER=['free','premium','pro'];
var PERIODS={month:'1 mois',year:'1 an',gift:'Sans fin (offert)'};

/* formule de la personne connectée */
function planRow(){return S.prem||null;}
function planActive(r){return !!(r&&PLANS[r.plan]&&(!r.until||new Date(r.until).getTime()>Date.now()));}
function myPlan(){if(S.admin)return 'pro';var r=planRow();return planActive(r)?r.plan:'free';}
function plan(){return PLANS[myPlan()];}
function isPaid(){return myPlan()!=='free';}
function ownActiveProjects(){return S.projects.filter(function(p){return (!S.me||!p._owner||p._owner===S.me.id)&&pstat(p)!=='archived';}).length;}
function canAddProject(){return ownActiveProjects()<plan().projects;}

function fmtPrice(n){try{return new Intl.NumberFormat(LOCALE(),{style:'currency',currency:'EUR',minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}).format(n);}catch(_){return n+' €';}}
function fmtDay(iso){if(!iso)return '';var d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString(LOCALE(),{day:'numeric',month:'long',year:'numeric'});}

/* chargement de la formule (et de la liste complète pour l'admin) */
function loadPlan(){
  if(!S.me||!Cloud.premiumMine)return Promise.resolve();
  function safe(f,d){return Promise.resolve().then(f).catch(function(){return d;});}
  return Promise.all([safe(function(){return Cloud.premiumMine(S.me.email);},null),safe(function(){return Cloud.isAdmin();},false)]).then(function(r){
    var was=myPlan();
    S.prem=r[0];S.admin=!!r[1];S.planReady=true;
    if(S.admin)return loadPremiumList();
    if(was!==myPlan())applyPrefs();
  }).then(function(){applyPrefs();queueRender();});
}
function loadPremiumList(){
  return Promise.resolve().then(function(){return Cloud.premiumAll();}).then(function(rows){S.premList=rows||[];S.premErr='';},function(e){S.premList=[];S.premErr=(e&&e.code)==='no_schema'?'no_schema':'err';}).then(queueRender);
}

/* ---------- message quand une limite est atteinte ---------- */
var UPSELL={
  projects:'Tu as atteint 5 projets actifs, la limite de la formule Gratuite. Archive un projet, ou passe à Premium pour en avoir autant que tu veux.',
  photos:'La formule Gratuite permet 3 photos par tâche. Premium en permet 8.',
  files:'La formule Gratuite permet 3 fichiers de 5 Mo par tâche. Premium : 10 fichiers de 25 Mo, Pro : 50 Mo.',
  size:'Ce fichier dépasse la taille permise par ta formule.',
  accents:'Ces couleurs sont réservées aux formules Premium et Pro.',
  csv:'L’export en tableur fait partie de la formule Pro.',
  mail:'Écrire des messages est réservé aux formules Premium (20 par heure) et Pro (100 par heure). En Gratuit, tu peux lire ceux que tu reçois.',
  mailmax:'Tu as atteint ton nombre de messages pour cette heure. La formule Pro en permet 100 par heure.',
  skins:'Les thèmes à effets (Sakura, Aurore, Océan) sont réservés aux formules Premium et Pro.',
  skinpro:'Le fond animé des thèmes fait partie de la formule Pro.',
  dup:'Dupliquer un projet demande une place libre : tu as atteint 5 projets actifs, la limite de la formule Gratuite.'
};
function upsell(why){closeOverlays();S.upsell=why||'projects';render();}
function upsellHtml(){
  return '<div class="ov top" data-act="ov-bg"><div class="upsell" role="dialog" aria-labelledby="up-t"><span class="up-ic">'+ic('star')+'</span><h2 id="up-t">Passe à Premium</h2><p>'+(UPSELL[S.upsell]||UPSELL.projects)+'</p>'
    +'<div class="row-btns"><button class="btn quiet" data-act="ov-close">Plus tard</button><button class="btn primary" data-act="view" data-id="plans">Voir les formules</button></div></div></div>';
}

/* ---------- page des formules ---------- */
function featList(k){
  var p=PLANS[k], L=[];
  L.push(p.projects===Infinity?'Projets illimités':tf('{0} projets actifs',p.projects));
  L.push(tf('{0} photos par tâche',p.photos));
  L.push(tf('{0} fichiers par tâche, {1} chacun',p.files,fmtSize(p.size)));
  L.push(p.mail?tf('Inbox : écrire, {0} messages par heure',p.mail):'Inbox : lire les messages reçus');
  L.push(p.accents?'Couleurs en plus et badge':'Couleurs de base');
  if(p.skins)L.push(p.skinAnim?'Thèmes à effets avec fond animé':'Thèmes à effets : Sakura, Aurore, Océan');
  if(k==='pro'){L.push('Export des tâches en tableur (Excel)');L.push('Aide prioritaire');}
  L.push('Partage, tâches, calendrier, clients, notifications');
  return L;
}
function contactUrl(k){
  var cfg=window.AVANCEE_CONFIG||{}, to=cfg.contact||'', per=S.planPer==='year'?T('à l’année'):T('au mois');
  if(!to)return '';
  var subj=unmark(tf('On Stride {0} ({1})',PLANS[k].n,per)), body=unmark(tf('Bonjour, je voudrais passer à la formule {0} ({1}) pour le compte {2}. Merci !',PLANS[k].n,per,S.me?S.me.email:''));
  if(/^https?:/.test(to))return to;
  return 'mailto:'+to.replace(/^mailto:/,'')+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
}
function vPlans(){
  var per=S.planPer||'month', cur=myPlan(), r=planRow();
  var h='<header class="phd"><h1>Formules</h1><p class="lead">Commence gratuitement, passe à la suite quand tu en as besoin.</p></header>';
  if(cur!=='free')h+='<div class="note"><p>'+ic('star')+' '+tf(S.admin?'Tu es admin : tout est débloqué.':(r&&r.until?'Tu as la formule {0} jusqu’au {1}.':'Tu as la formule {0}.'),PLANS[cur].n,r?fmtDay(r.until):'')+'</p></div>';
  h+='<div class="plan-per"><span class="seg" role="group" aria-label="Facturation"><button data-act="plan-per" data-id="month" aria-pressed="'+(per==='month')+'">Mensuel</button><button data-act="plan-per" data-id="year" aria-pressed="'+(per==='year')+'">Annuel <span class="save">2 mois offerts</span></button></span></div>';
  h+='<div class="plans">';
  PLAN_ORDER.forEach(function(k){
    var p=PLANS[k], mine=k===cur, rec=k==='premium';
    h+='<section class="plan'+(rec?' rec':'')+(mine?' mine':'')+'"><header>'+(rec?'<span class="plan-tag">Le plus choisi</span>':'')+'<h2>'+p.n+'</h2>';
    if(k==='free')h+='<p class="price"><b>'+nt(fmtPrice(0))+'</b></p><p class="per">Pour toujours</p>';
    else h+='<p class="price"><b>'+nt(fmtPrice(p[per]))+'</b><span>'+(per==='year'?' / an':' / mois')+'</span></p><p class="per">'+(per==='year'?tf('soit {0} par mois',nt(fmtPrice(Math.round(p.year/12*100)/100))):tf('ou {0} par an',nt(fmtPrice(p.year))))+'</p>';
    h+='</header><ul>'+featList(k).map(function(f){return '<li>'+ic('check')+'<span>'+f+'</span></li>';}).join('')+'</ul>';
    if(mine)h+='<button class="btn" disabled>Ta formule actuelle</button>';
    else if(k==='free')h+='<span class="plan-gap"></span>';
    else{var u=contactUrl(k);h+=u?'<a class="btn'+(rec?' primary':'')+'" href="'+esc(u)+'" target="_blank" rel="noopener">'+ic('msg')+tf('Contacter pour {0}',p.n)+'</a>':'<button class="btn" disabled>Bientôt disponible</button>';}
    h+='</section>';
  });
  h+='</div><p class="hint plan-note">Le paiement en ligne arrive bientôt. En attendant, envoie un message : ta formule est activée à la main, avec l’adresse e-mail de ton compte.</p>';
  return h;
}

/* ---------- espace admin ---------- */
function premDefaultUntil(per,from){
  if(per==='gift')return null;
  var d=new Date(Math.max(Date.now(),from?new Date(from).getTime():0));
  if(per==='year')d.setFullYear(d.getFullYear()+1);else d.setMonth(d.getMonth()+1);
  return d.toISOString();
}
function vAdmin(){
  var h='<header class="phd"><h1>Admin</h1><p class="lead">Choisis qui a Premium ou Pro. Visible par toi seul.</p></header>';
  if(S.premErr==='no_schema')return h+'<div class="note bad"><p>La table des formules n’existe pas encore : relance le fichier supabase/schema.sql dans Supabase (SQL Editor), puis recharge la page.</p></div>';
  var rows=(S.premList||[]).slice().sort(function(a,b){return (b.updated_at||'')<(a.updated_at||'')?-1:1;});
  var act=rows.filter(planActive), np=act.filter(function(r){return r.plan==='premium';}).length, npro=act.length-np;
  h+='<div class="stats"><div class="stat"><span>'+ic('star')+'Premium actifs</span><b>'+np+'</b></div><div class="stat"><span>'+ic('bolt')+'Pro actifs</span><b>'+npro+'</b></div><div class="stat"><span>'+ic('clock')+'Expirés</span><b>'+(rows.length-act.length)+'</b></div></div>';
  h+='<section class="panel scard admin-add"><h2>'+ic('plus')+'Donner une formule</h2><div class="adm-form">'
    +'<label class="sr" for="adm-email">Adresse e-mail</label><input class="in grow" id="adm-email" type="email" data-draft placeholder="adresse@exemple.com" autocomplete="off">'
    +'<label class="sr" for="adm-plan">Formule</label>'+selH('adm-plan','','',{premium:'Premium',pro:'Pro'},S.admPlan||'premium','in')
    +'<label class="sr" for="adm-per">Durée</label>'+selH('adm-per','','',L(PERIODS),S.admPer||'month','in')
    +'<button class="btn primary" data-act="adm-save">Activer</button></div>'
    +'<p class="hint">La personne doit se connecter avec cette adresse. Si elle a déjà une formule en cours, la durée s’ajoute à ce qui reste.</p></section>';
  var q=norm(S.admQ||'');
  var list=rows.filter(function(r){return !q||norm(r.email).indexOf(q)>=0;});
  h+='<section class="sect"><h2>Comptes avec une formule <span class="cnt">'+rows.length+'</span><span class="grow"></span><span class="fq">'+ic('search')+'<label class="sr" for="adm-q">Chercher une adresse</label><input id="adm-q" type="search" value="'+esc(S.admQ||'')+'" placeholder="Chercher une adresse" autocomplete="off"></span></h2>';
  if(!rows.length)return h+empty('star','Personne pour l’instant','Ajoute une adresse e-mail ci-dessus pour donner Premium ou Pro.')+'</section>';
  h+='<ul class="tlist panel adm-list">';
  list.forEach(function(r){
    var on=planActive(r), e=esc(r.email);
    h+='<li class="trow adm-row"><span class="grow adm-who"><b>'+e+'</b><span class="mut">'+nt(escRaw(unmark(r.until?tf(on?'jusqu’au {0}':'expiré le {0}',fmtDay(r.until)):T('sans fin'))+(r.granted_by?' · '+unmark(tf('par {0}',r.granted_by)):'')))+'</span></span>'
      +'<span class="pill'+(on?' ok':'')+'">'+(on?PLANS[r.plan].n:'Expiré')+'</span>'
      +'<button class="btn sm" data-act="adm-extend" data-id="'+e+'" title="'+tf('Prolonger de {0}',T(PERIODS[r.period==='year'?'year':'month']))+'">'+(r.period==='year'?'+1 an':'+1 mois')+'</button>'
      +(S.confirm==='adm:'+r.email?'<button class="btn sm danger" data-act="adm-del" data-id="'+e+'">Confirmer</button>':'<button class="ib sm dng" data-act="adm-del" data-id="'+e+'" aria-label="'+tf('Retirer la formule de {0}',e)+'">'+ic('trash')+'</button>')+'</li>';
  });
  if(!list.length)h+='<li class="trow mut">Aucune adresse ne correspond.</li>';
  return h+'</ul></section>';
}
function admSave(email,planK,per,extend){
  email=String(email||'').trim().toLowerCase();
  if(!validEmail(email)){toast('Adresse e-mail invalide.',{bad:true});return;}
  var old=(S.premList||[]).find(function(r){return r.email===email;});
  var from=old&&planActive(old)&&old.until?old.until:null;
  var row={email:email,plan:planK,period:per,until:premDefaultUntil(per,from),granted_by:S.me.email,updated_at:new Date().toISOString()};
  /* optimiste : on affiche tout de suite, on recharge après */
  S.premList=(S.premList||[]).filter(function(r){return r.email!==email;}).concat([row]);render();
  Cloud.premiumSave(row).then(function(r){
    if(r&&r.error)throw r.error;
    toast(extend?tf('{0} : prolongé.',email):tf('{0} a maintenant la formule {1}.',email,PLANS[planK].n));
    if(email===S.me.email)S.prem=row;
    loadPremiumList();
  }).catch(function(){toast('Enregistrement impossible. Réessaie dans un instant.',{bad:true});loadPremiumList();});
}
function admRemove(email){
  S.confirm=null;
  var old=(S.premList||[]).find(function(r){return r.email===email;});
  S.premList=(S.premList||[]).filter(function(r){return r.email!==email;});render();
  Cloud.premiumRemove(email).then(function(r){
    if(r&&r.error)throw r.error;
    toast(tf('{0} repasse en formule Gratuite.',email),{undo:old?function(){Cloud.premiumSave(old).then(loadPremiumList);}:null});
    loadPremiumList();
  }).catch(function(){toast('Suppression impossible. Réessaie dans un instant.',{bad:true});loadPremiumList();});
}

/* ---------- export en tableur (Pro) ---------- */
function exportCsv(){
  if(!plan().csv){upsell('csv');return;}
  var by=index(), sep=';', rows=[[T('Projet'),T('Tâche'),T('Colonne'),T('Terminée'),T('Priorité'),T('Échéance'),T('Assigné à'),T('Labels'),T('Description')]];
  function cell(v){v=String(v==null?'':v);return /[";\n\r]/.test(v)||/^[=+\-@]/.test(v)?'"'+(/^[=+\-@]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"':v;}
  S.tasks.forEach(function(t){
    var e=by[t.projectId]||null, p=e?e.p:null;
    rows.push([p?p.name:'Bazar',t.title,e?colName(e,t._col):'',isDone(t,e)?T('Oui'):T('Non'),T(PRIO[prioOf(t)]),t.due||'',t.who||'',p?(t.labels||[]).map(function(id){var l=findLabel(p,id);return l?(l.name||''):'';}).filter(Boolean).join(', '):'',t.notes||'']);
  });
  var csv='﻿'+rows.map(function(r){return r.map(cell).join(sep);}).join('\r\n');
  try{
    var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    var a=document.createElement('a');a.href=url;a.download='onstride-tasks-'+todayStr()+'.csv';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
    toast('Export téléchargé.');
  }catch(_){toast('Export impossible pour le moment.',{bad:true});}
}

/* ---------- clics ---------- */
function planClick(act,id,b){
  if(act==='plan-per'){S.planPer=id==='year'?'year':'month';render();return true;}
  if(act==='upsell'){upsell(id);return true;}
  if(act==='export-csv'){exportCsv();return true;}
  if(!S.admin)return false;
  if(act==='adm-save'){
    var em=(document.getElementById('adm-email')||{}).value, pk=(document.getElementById('adm-plan')||{}).value||'premium', pr=(document.getElementById('adm-per')||{}).value||'month';
    S.admPlan=pk;S.admPer=pr;
    if(!validEmail(String(em||'').trim().toLowerCase())){toast('Adresse e-mail invalide.',{bad:true});var ei=document.getElementById('adm-email');if(ei)ei.focus();return true;}
    var ie=document.getElementById('adm-email');if(ie)ie.value='';delete S.dirty['adm-email'];
    admSave(em,pk,pr,false);return true;
  }
  if(act==='adm-extend'){var r=(S.premList||[]).find(function(x){return x.email===id;});if(r)admSave(r.email,r.plan,r.period==='year'?'year':'month',true);return true;}
  if(act==='adm-del'){if(S.confirm==='adm:'+id)admRemove(id);else{S.confirm='adm:'+id;render();}return true;}
  return false;
}
