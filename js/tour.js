/* On Stride — tutoriel guidé : une suite de bulles qui montrent chaque endroit de l'appli.
   S.tour = numéro de l'étape en cours, ou null. Il se lance tout seul à la première connexion,
   peut être passé à tout moment, et se relance depuis Réglages. */
'use strict';

/* sel : ce qu'on met en lumière (ordinateur) ; selS : même chose sur téléphone ; view : page à ouvrir avant */
var TOUR=[
  {t:'Bienvenue dans On Stride',
   x:'On Stride sert à ranger ton travail en projets, à suivre tes tâches et à montrer où tu en es à tes clients ou à tes potes. Je te montre l’essentiel en une minute.'},
  {t:'Le menu',view:'home',sel:'#side .navs',selS:'#tabbar',
   x:'Tout part d’ici. Accueil : la vue d’ensemble. Mes tâches : ce que tu as à faire. Projets : ton travail, bien rangé.'},
  {t:'Tes projets',view:'projects',sel:'#main .qadd',
   x:'Un projet, c’est un client, un site, une idée… Écris son nom ici puis appuie sur Entrée pour le créer. Dedans, chaque tâche est une carte que tu fais avancer : À faire, En cours, Terminé.'},
  {t:'Partager un projet',view:'@project',sel:'#main [data-act="share"]',
   x:'Dans un projet, le bouton « Partager » invite quelqu’un avec son adresse e-mail. En lecteur, il regarde ton avancée. En éditeur, il peut aussi modifier les cartes.'},
  {t:'Ajouter une tâche',view:'home',sel:'#top [data-act="qa"]',selS:'#tabbar .tab-plus',
   x:'Ce bouton note une tâche en deux secondes, depuis n’importe quelle page. Tu peux écrire « demain » ou « priorité haute » : l’appli comprend toute seule.'},
  {t:'L’Inbox',view:'home',sel:'#side [data-id="inbox"]',selS:'#tabbar [data-id="inbox"]',
   x:'Une tâche sans projet arrive dans l’Inbox. Tu notes vite sur le moment, tu ranges dans un projet plus tard.'},
  {t:'Ton accueil',view:'home',sel:'#main .stats',
   x:'L’accueil résume tout : ce qui est prévu aujourd’hui, ce qui est en retard et où en sont tes projets. Touche un chiffre pour voir le détail.'},
  {t:'C’est parti !',end:true,
   x:'Le mieux pour commencer : créer ton premier projet. Tu peux revoir ce tutoriel quand tu veux dans Réglages.'}
];

function tourStart(){closeOverlays();closeTask();S.dashEdit=false;S.tour=0;S.tourMoved=true;tourEnter();}
function tourEnter(){
  var st=TOUR[S.tour]; if(!st||!st.view)return;
  var v=st.view;
  if(v==='@project'){
    var by=index(), p=S.projects.find(function(x){return by[x.id]&&by[x.id].own&&pstat(x)!=='archived';});
    v=p?p.id:null;
  }
  if(v&&S.view!==v){go(v);}
}
function tourGo(d){
  var n=S.tour+d;
  if(n<0)return;
  if(n>=TOUR.length){tourEnd();return;}
  S.tour=n;S.tourMoved=true;tourEnter();
}
function tourEnd(silent){
  var was=S.tour!=null;
  S.tour=null;LS.set('tour',1);
  if(was&&S.db&&!S.cfg.tourDone)saveCfg({tourDone:true});
  if(was&&!silent)toast('Tu peux revoir le tutoriel dans Réglages.');
}
/* première connexion : on le lance une fois les données arrivées */
function tourAuto(ready){
  if(S.tourTried||!ready||!S.db||S.error||S.pending)return;
  S.tourTried=true;
  if(S.cfg.tourDone||LS.get('tour',0))return;
  tourStart();
}
function tourTarget(st){
  var sel=(isNarrow()&&st.selS)||st.sel; if(!sel)return null;
  var el=document.querySelector(sel); if(!el)return null;
  var r=el.getBoundingClientRect();
  if(r.width<2||r.height<2)return null;
  return el;
}
function tourPlace(){
  var box=document.getElementById('tour'); if(!box||S.tour==null)return;
  var st=TOUR[S.tour], spot=document.getElementById('tour-spot'), card=document.getElementById('tour-card');
  var W=window.innerWidth||1200, H=window.innerHeight||800, el=tourTarget(st);
  var w=Math.min(360,W-24); card.style.width=w+'px';
  var h=card.offsetHeight||220;
  if(!el){
    spot.style.cssText='left:'+(W/2)+'px;top:'+(H/2)+'px;width:0;height:0;border-color:transparent';
    card.style.left=Math.round((W-w)/2)+'px';card.style.top=Math.max(12,Math.round((H-h)/2))+'px';
    return;
  }
  var r=el.getBoundingClientRect();
  if(r.bottom>H-8||r.top<8){try{el.scrollIntoView({block:'center'});}catch(_){}r=el.getBoundingClientRect();}
  var pad=6, x=Math.max(4,r.left-pad), y=Math.max(4,r.top-pad), sw=Math.min(W-4,r.right+pad)-x, sh=Math.min(H-4,r.bottom+pad)-y;
  spot.style.cssText='left:'+x+'px;top:'+y+'px;width:'+sw+'px;height:'+sh+'px';
  var left, top, gap=14;
  if(W-(x+sw)>=w+gap+12&&sh>H*0.3){left=x+sw+gap;top=y;}                 /* cible haute à gauche (menu) : bulle à droite */
  else{
    left=x+sw/2-w/2;
    if(H-(y+sh)>=h+gap+12)top=y+sh+gap;
    else if(y>=h+gap+12)top=y-h-gap;
    else{
      /* pas la place : la cible remonte en haut de l'écran, la bulle se cale en bas et la lumière s'arrête au-dessus d'elle */
      try{el.style.scrollMarginTop='76px';el.scrollIntoView({block:'start'});el.style.scrollMarginTop='';}catch(_){}
      r=el.getBoundingClientRect();y=Math.max(4,r.top-pad);sh=Math.min(H-4,r.bottom+pad)-y;
      top=H-h-12;
      if(y+sh>top-10)sh=Math.max(44,top-10-y);
      spot.style.cssText='left:'+x+'px;top:'+y+'px;width:'+sw+'px;height:'+sh+'px';
    }
  }
  card.style.left=Math.round(Math.max(12,Math.min(W-w-12,left)))+'px';
  card.style.top=Math.round(Math.max(12,Math.min(H-h-12,top)))+'px';
}
function renderTour(){
  var box=document.getElementById('tour');
  if(S.tour==null||S.auth!=='in'){if(box){box.innerHTML='';box.hidden=true;box._k=null;}document.body.classList.remove('touring');return;}
  var st=TOUR[S.tour], n=S.tour, last=n===TOUR.length-1;
  document.body.classList.add('touring');
  var h='<div class="tour-block"></div><div class="tour-spot" id="tour-spot"></div>'
    +'<section class="tour-card" id="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x">'
    +'<div class="tour-top"><span class="tour-n">'+(n+1)+' / '+TOUR.length+'</span>'+(last?'':'<button class="linkbtn" data-act="tour-skip">Passer le tutoriel</button>')+'</div>'
    +'<h2 id="tour-t">'+st.t+'</h2><p id="tour-x">'+st.x+'</p>'
    +'<div class="tour-dots" aria-hidden="true">'+TOUR.map(function(_,i){return '<i'+(i===n?' class="on"':'')+'></i>';}).join('')+'</div>'
    +'<div class="tour-btns">'+(n>0?'<button class="btn" data-act="tour-prev">Précédent</button>':'<span></span>')
    +(last?'<span class="tour-end"><button class="btn" data-act="tour-done">Terminer</button><button class="btn primary" id="tour-go" data-act="tour-create">'+ic('plus')+'Créer mon premier projet</button></span>'
          :'<button class="btn primary" id="tour-go" data-act="tour-next">'+(n===0?'Commencer':'Suivant')+ic('arrow')+'</button>')
    +'</div></section>';
  box.hidden=false;box.innerHTML=tr(h);still(box,n);
  tourPlace();
  if(S.tourMoved){
    S.tourMoved=false;
    var b=document.getElementById('tour-go'); if(b)b.focus({preventScroll:true});
    setTimeout(tourPlace,260);   /* la page finit son animation d'entrée */
  }
}
/* renvoie true si le clic concernait le tutoriel */
function tourClick(act){
  if(act==='tour-start'){go('home');tourStart();render();return true;}
  if(S.tour==null)return false;
  if(act==='tour-next'){tourGo(1);render();return true;}
  if(act==='tour-prev'){tourGo(-1);render();return true;}
  if(act==='tour-skip'){tourEnd();go('home');render();return true;}
  if(act==='tour-done'){tourEnd(true);go('home');render();return true;}
  if(act==='tour-create'){tourEnd(true);go('projects');S.pf='active';S.focus='npp';render();return true;}
  return true;   /* pendant le tutoriel, le reste de l'appli ne réagit pas */
}
function tourKey(ev){
  if(S.tour==null)return false;
  var k=ev.key;
  if(k==='Escape'){ev.preventDefault();tourEnd();go('home');render();return true;}
  if(k==='ArrowRight'){ev.preventDefault();if(S.tour<TOUR.length-1){tourGo(1);render();}return true;}
  if(k==='ArrowLeft'){ev.preventDefault();tourGo(-1);render();return true;}
  if(k==='Enter'||k===' '||k==='Tab')return true;   /* laissés au bouton qui a le focus */
  ev.preventDefault();return true;
}
(function(){
  var again=function(){if(S.tour!=null)tourPlace();};
  document.addEventListener('scroll',again,true);
  window.addEventListener('resize',function(){setTimeout(again,60);});
})();
