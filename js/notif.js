/* Onward — notifications de bureau.
   Elles partent du navigateur tant qu'Onward est ouverte quelque part (onglet en arrière-plan, fenêtre réduite, appli installée) :
     - un rappel par jour des tâches à faire aujourd'hui et en retard ;
     - l'activité des autres personnes sur les projets partagés (carte créée, déplacée, commentée…) ;
     - un projet qu'on vient de partager avec toi.
   Les réglages sont propres à chaque appareil. */
'use strict';

var NOTIF={
  prefs:LS.get('notif',{on:false,due:true,act:true}),
  seen:null,        /* historique déjà connu des cartes : on ne prévient que pour ce qui arrive ensuite */
  members:null,
  timer:0
};
function notifSupported(){return typeof window.Notification!=='undefined';}
function notifPerm(){return notifSupported()?Notification.permission:'unsupported';}
function notifActive(){return NOTIF.prefs.on&&notifPerm()==='granted';}
function notifSave(){LS.set('notif',NOTIF.prefs);}
function pageFocused(){try{return document.visibilityState==='visible'&&document.hasFocus();}catch(_){return document.visibilityState==='visible';}}

/* le service worker sert à afficher les notifications là où le navigateur l'exige (Android, appli installée sur iPhone) */
var SWREG=null;
function notifInitSW(){
  if(!('serviceWorker' in navigator)||location.protocol==='file:')return;
  try{
    navigator.serviceWorker.register('sw.js').then(function(r){SWREG=r;},function(){});
    navigator.serviceWorker.addEventListener('message',function(ev){var d=ev.data||{};if(d.type==='open')notifOpen(d.data||{});});
  }catch(_){}
}
function notifOpen(d){
  try{window.focus();}catch(_){}
  if(S.auth!=='in')return;
  closeOverlays();
  if(d.task&&taskById(d.task)){var t=taskById(d.task);if(t.projectId&&projById(t.projectId))go(t.projectId);else go('inbox');openTask(d.task);}
  else if(d.project&&projById(d.project))go(d.project);
  else if(d.view){go(d.view);if(d.tf)S.tf=d.tf;}
  render();
}
function notify(title,body,data){
  if(!notifActive())return false;
  var opt={body:unmark(body||''),icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:(data&&data.tag)||undefined,data:data||{},lang:LANG};
  title=unmark(title);
  try{
    var n=new Notification(title,opt);
    n.onclick=function(){notifOpen(data||{});try{n.close();}catch(_){}};
    return true;
  }catch(_){
    /* Android et iPhone n'acceptent les notifications qu'au travers du service worker */
    if(SWREG&&SWREG.showNotification){SWREG.showNotification(title,opt).catch(function(){});return true;}
    return false;
  }
}
function notifEnable(){
  if(!notifSupported()){render();return;}
  var ask=Notification.permission==='granted'?Promise.resolve('granted'):Promise.resolve(Notification.requestPermission());
  ask.then(function(p){
    if(p==='granted'){
      NOTIF.prefs.on=true;notifSave();
      toast('Notifications activées sur cet appareil.');
      notify(T('Onward'),T('Les notifications sont activées. Tu seras prévenu ici.'),{tag:'avancee-test'});
    }else if(p==='denied')toast('Notifications bloquées par le navigateur.',{bad:true});
    render();
  },function(){render();});
}

/* ---------- rappel du jour ---------- */
function notifDaily(){
  if(!notifActive()||!NOTIF.prefs.due||S.auth!=='in')return;
  var ready=Object.keys(S.loaded).every(function(k){return S.loaded[k];}); if(!ready)return;
  var today=todayStr(); if(LS.get('notifDay','')===today)return;
  if(new Date().getHours()<7)return;
  LS.set('notifDay',today);
  var by=index(), pool=liveTasks(by).concat(inboxTasks()).filter(function(t){return mine(t)&&!isDone(t,by[t.projectId]||null)&&t.due&&t.due<=today;});
  var tod=pool.filter(function(t){return t.due===today;}).length, late=pool.length-tod;
  if(!pool.length)return;
  var parts=[];
  if(tod)parts.push(unmark(tf(tod>1?'{0} tâches pour aujourd’hui':'{0} tâche pour aujourd’hui',tod)));
  if(late)parts.push(unmark(tf('{0} en retard',late)));
  var body=parts.join(' · ');
  if(pageFocused()){toast(nt(body));return;}
  notify(T('Ta journée'),body,{view:'tasks',tf:late?'late':'today',tag:'avancee-jour'});
}

/* ---------- activité des autres ---------- */
function actKey(t,a){return t.id+'|'+a.at+'|'+a.t;}
/* appelée à chaque nouvel état reçu du serveur, avant qu'il remplace l'ancien */
function notifDiff(key,list){
  if(!S.me)return;
  if(key==='t'){
    if(!NOTIF.seen){NOTIF.seen={};list.forEach(function(t){(t.act||[]).forEach(function(a){NOTIF.seen[actKey(t,a)]=1;});});return;}
    var ev=[];
    list.forEach(function(t){
      (t.act||[]).forEach(function(a){
        var k=actKey(t,a); if(NOTIF.seen[k])return; NOTIF.seen[k]=1;
        /* seulement ce qui vient d'arriver (pas l'historique d'un projet qu'on vient de recevoir) */
        if(a.uid&&a.uid!==S.me.id&&a.at>Date.now()-15*60000)ev.push({t:t,a:a});
      });
    });
    if(ev.length)notifActivity(ev);
  }
  if(key==='mb'){
    var mine=list.filter(function(m){return m.email===S.me.email;});
    if(!NOTIF.members){NOTIF.members={};mine.forEach(function(m){NOTIF.members[m.id]=1;});return;}
    mine.forEach(function(m){
      if(NOTIF.members[m.id])return; NOTIF.members[m.id]=1;
      /* le projet arrive juste après le partage */
      setTimeout(function(){
        var p=projById(m.projectId), name=p?p.name:'';
        var body=name?tf('« {0} » est maintenant partagé avec toi.',name):T('Un projet est maintenant partagé avec toi.');
        if(pageFocused()){toast(body);return;}
        if(NOTIF.prefs.act)notify(T('Nouveau projet partagé'),body,{project:m.projectId,tag:'avancee-p'+m.projectId});
      },1500);
    });
  }
}
function notifActivity(ev){
  if(!NOTIF.prefs.act)return;
  var focused=pageFocused();
  if(ev.length>3){
    var msg=unmark(tf('{0} changements sur tes projets partagés',ev.length));
    if(focused)toast(nt(msg)); else notify(T('Onward'),msg,{view:'home',tag:'avancee-act'});
    return;
  }
  ev.forEach(function(x){
    var t=x.t, a=x.a, p=t.projectId?projById(t.projectId):null, who=a.by||T('Quelqu’un');
    var what=trText(a.t);
    if(a.t==='Commentaire ajouté'){var c=(t.log||[]).slice(-1)[0];if(c)what=unmark(tf('a commenté : « {0} »',String(c.t).slice(0,120)));}
    var body=unmark(who)+' · '+unmark(what)+(p?' · '+p.name:'');
    if(focused)toast(nt(unmark(t.title)+' — '+body));
    else notify(t.title,body,{task:t.id,tag:'avancee-t'+t.id});
  });
}
function notifStart(){
  if(NOTIF.timer)return;
  NOTIF.timer=setInterval(notifDaily,10*60000);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(notifDaily,1500);});
}

/* ---------- bloc des réglages ---------- */
function notifCard(){
  var perm=notifPerm(), on=notifActive(), h='<section class="panel scard" id="notif-card"><h2>'+ic('bell')+'Notifications de bureau</h2>';
  if(perm==='unsupported'){
    h+='<p class="hint">Ce navigateur ne sait pas afficher de notifications. Sur iPhone : ajoute d’abord Onward à l’écran d’accueil (bouton Partager, puis « Sur l’écran d’accueil »), ouvre-la depuis l’icône, puis reviens ici.</p>';
  }else if(perm==='denied'){
    h+='<p class="hint">Les notifications sont bloquées pour ce site. Pour les autoriser : clique sur le cadenas à gauche de l’adresse du site, mets « Notifications » sur « Autoriser », puis recharge la page.</p>';
  }else if(!on){
    h+='<p class="hint">Reçois un petit message sur ton écran pour les tâches du jour et quand quelqu’un avance sur un projet partagé.</p><div class="row-btns"><button class="btn primary" data-act="notif-on">'+ic('bell')+'Activer les notifications</button></div>';
  }else{
    h+='<div class="chips" role="group" aria-label="Quelles notifications"><button class="fchip" data-act="notif-pref" data-id="due" aria-pressed="'+!!NOTIF.prefs.due+'">Rappel des tâches du jour</button><button class="fchip" data-act="notif-pref" data-id="act" aria-pressed="'+!!NOTIF.prefs.act+'">Activité sur les projets partagés</button></div>'
      +'<p class="hint">Elles arrivent tant qu’Onward est ouverte sur cet appareil, même dans un onglet en arrière-plan ou une fenêtre réduite. Quand tu regardes déjà l’appli, un petit message s’affiche en bas à la place.</p>'
      +'<div class="row-btns"><button class="btn" data-act="notif-test">Envoyer un test</button><button class="btn quiet" data-act="notif-off">Désactiver</button></div>';
  }
  return h+'</section>';
}
/* renvoie true si le clic concernait les notifications */
function notifClick(act,id){
  if(act==='notif-on'){notifEnable();return true;}
  if(act==='notif-off'){NOTIF.prefs.on=false;notifSave();toast('Notifications désactivées sur cet appareil.');render();return true;}
  if(act==='notif-pref'){NOTIF.prefs[id]=!NOTIF.prefs[id];notifSave();render();return true;}
  if(act==='notif-test'){
    var ok=notify(T('Onward'),T('Voici à quoi ressemble une notification.'),{view:'home',tag:'avancee-test'});
    toast(ok?'Notification envoyée. Si rien n’apparaît, vérifie le mode « Ne pas déranger » de ton ordinateur.':'Impossible d’afficher la notification sur ce navigateur.',ok?null:{bad:true});
    return true;
  }
  return false;
}
