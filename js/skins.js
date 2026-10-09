/* On Stride — thèmes à effets (Premium et Pro) : Sakura, Aurore, Océan.
   Premium : couleurs du thème, fond décoré et petit effet à chaque clic.
   Pro : le fond s'anime en plus (pétales qui tombent, aurore qui ondule, bulles qui montent).
   Tout est dessiné ici, sans image à charger. Les animations s'arrêtent quand l'onglet est caché
   et sont coupées si l'appareil demande moins de mouvement. */
'use strict';

var SKINS={
  none:{n:'Aucun'},
  sakura:{n:'Sakura',l:'#C2306F',d:'#FF8FBE',sw:'linear-gradient(135deg,#FFE3EC,#FFB7CE 55%,#F58DB2)',cols:['#FFB7C9','#FF9DB8','#FFD3DE','#F78FB0','#FFC2D4']},
  aurora:{n:'Aurore',l:'#0B8272',d:'#5FE3CD',sw:'linear-gradient(135deg,#0E3B52,#19B89A 50%,#8E6BE8)',cols:['#5FE3CD','#8E9BFF','#B58CFF','#7DF0B4']},
  ocean:{n:'Océan',l:'#1668C4',d:'#6FB7FF',sw:'linear-gradient(160deg,#CFEBFF,#5FB4F2 55%,#1B5FB8)',cols:['#BFE4FF','#8CCBFF','#E6F5FF','#6FB7FF']}
};
P.skin=LS.get('skin','none'); if(!SKINS[P.skin])P.skin='none';
P.skinFx=LS.get('skinFx',true)!==false;
P.skinAnim=LS.get('skinAnim',true)!==false;

var FX={bg:null,top:null,gb:null,gt:null,parts:[],bursts:[],raf:0,last:0,skin:'none',anim:false,w:0,h:0,dpr:1};
function skinCalm(){try{return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(_){return false;}}
/* tant que la formule n'est pas connue, on fait confiance au choix mémorisé (pas de clignotement au chargement) */
function skinAllowed(){return !S.planReady||!!plan().skins;}
function skinOn(){return P.skin!=='none'&&skinAllowed()?P.skin:'none';}
function skinAnimOn(){return skinOn()!=='none'&&P.skinAnim&&(!S.planReady||!!plan().skinAnim)&&!skinCalm();}
function skinFxOn(){return skinOn()!=='none'&&P.skinFx&&!skinCalm();}

function skinDom(){
  if(FX.bg)return;
  var box=document.createElement('div');box.id='skin-bg';box.setAttribute('aria-hidden','true');
  box.innerHTML='<i class="sk-a sk-a1"></i><i class="sk-a sk-a2"></i><i class="sk-a sk-a3"></i><i class="sk-wave sk-w1"></i><i class="sk-wave sk-w2"></i><canvas id="skin-cv"></canvas>';
  document.body.insertBefore(box,document.body.firstChild);
  var top=document.createElement('canvas');top.id='skin-fx';top.setAttribute('aria-hidden','true');document.body.appendChild(top);
  FX.bg=box.querySelector('canvas');FX.top=top;FX.gb=FX.bg.getContext('2d');FX.gt=top.getContext('2d');
  skinSize();
  window.addEventListener('resize',skinSize);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)skinKick();});
  document.addEventListener('pointerdown',function(ev){
    if(!skinFxOn()||ev.button>0)return;
    skinBurst(ev.clientX,ev.clientY);
  },true);
}
function skinSize(){
  if(!FX.bg)return;
  FX.dpr=Math.min(2,window.devicePixelRatio||1);FX.w=window.innerWidth;FX.h=window.innerHeight;
  [FX.bg,FX.top].forEach(function(c){c.width=Math.round(FX.w*FX.dpr);c.height=Math.round(FX.h*FX.dpr);});
  FX.gb.setTransform(FX.dpr,0,0,FX.dpr,0,0);FX.gt.setTransform(FX.dpr,0,0,FX.dpr,0,0);
}
function rr(a,b){return a+Math.random()*(b-a);}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function skinSeed(){
  var k=FX.skin, n=k==='sakura'?Math.round(Math.min(34,14+FX.w/60)):k==='ocean'?Math.round(Math.min(30,12+FX.w/70)):0, cols=(SKINS[k]||{}).cols||[];
  FX.parts=[];
  for(var i=0;i<n;i++)FX.parts.push(skinPart(k,cols,true));
}
function skinPart(k,cols,anywhere){
  if(k==='sakura')return {x:rr(-40,FX.w+40),y:anywhere?rr(-40,FX.h):rr(-60,-10),s:rr(7,15),vy:rr(16,40),sw:rr(14,38),ph:rr(0,6.28),r:rr(0,6.28),vr:rr(-1.2,1.2),fl:rr(0,6.28),vf:rr(1,2.6),a:rr(.5,.9),c:pick(cols)};
  return {x:rr(0,FX.w),y:anywhere?rr(0,FX.h):FX.h+rr(10,60),s:rr(2,9),vy:-rr(12,38),sw:rr(4,14),ph:rr(0,6.28),a:rr(.25,.6),c:pick(cols)};
}
function petal(g,s){
  g.beginPath();g.moveTo(0,-s);g.bezierCurveTo(s*.9,-s*.75,s*.75,s*.55,0,s);g.bezierCurveTo(-s*.75,s*.55,-s*.9,-s*.75,0,-s);g.fill();
}
function spark(g,s){
  g.beginPath();
  for(var i=0;i<8;i++){var a=i*Math.PI/4, r=i%2?s*.32:s;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  g.closePath();g.fill();
}
function skinBurst(x,y){
  var k=skinOn(), cols=SKINS[k].cols, n=k==='ocean'?7:9;
  for(var i=0;i<n;i++){
    var a=rr(0,6.28), v=k==='sakura'?rr(40,150):k==='aurora'?rr(50,170):rr(20,80);
    FX.bursts.push({k:k,x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(k==='sakura'?50:k==='ocean'?40:0),s:k==='ocean'?rr(2,6):rr(4,9),r:rr(0,6.28),vr:rr(-5,5),t:0,life:rr(.6,1.05),c:pick(cols)});
  }
  if(k!=='sakura')FX.bursts.push({k:'ring',x:x,y:y,t:0,life:.55,c:cols[0]});
  if(FX.bursts.length>160)FX.bursts.splice(0,FX.bursts.length-160);
  skinKick();
}
function skinFrame(now){
  FX.raf=0;
  var dt=Math.min(.05,(now-(FX.last||now))/1000);FX.last=now;
  var gb=FX.gb, gt=FX.gt, k=FX.skin, t=now/1000;
  gb.clearRect(0,0,FX.w,FX.h);gt.clearRect(0,0,FX.w,FX.h);
  if(FX.anim){
    FX.parts.forEach(function(p,i){
      p.y+=p.vy*dt;p.ph+=dt;
      var x=p.x+Math.sin(p.ph)*p.sw;
      if(k==='sakura'){
        p.r+=p.vr*dt;p.fl+=p.vf*dt;
        if(p.y>FX.h+30){FX.parts[i]=skinPart(k,SKINS[k].cols,false);return;}
        gb.save();gb.translate(x,p.y);gb.rotate(p.r);gb.scale(Math.cos(p.fl)*.75+.25,1);gb.globalAlpha=p.a;gb.fillStyle=p.c;petal(gb,p.s);gb.restore();
      }else{
        if(p.y<-20){FX.parts[i]=skinPart(k,SKINS[k].cols,false);return;}
        gb.globalAlpha=p.a;gb.strokeStyle=p.c;gb.lineWidth=1.2;gb.beginPath();gb.arc(x,p.y,p.s,0,6.283);gb.stroke();
        gb.globalAlpha=p.a*.5;gb.fillStyle='#fff';gb.beginPath();gb.arc(x-p.s*.35,p.y-p.s*.35,Math.max(.6,p.s*.2),0,6.283);gb.fill();
      }
    });
    gb.globalAlpha=1;
  }
  FX.bursts=FX.bursts.filter(function(b){
    b.t+=dt; var u=b.t/b.life; if(u>=1)return false;
    if(b.k==='ring'){gt.globalAlpha=(1-u)*.5;gt.strokeStyle=b.c;gt.lineWidth=2;gt.beginPath();gt.arc(b.x,b.y,8+u*46,0,6.283);gt.stroke();return true;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.r+=b.vr*dt;b.vx*=1-1.6*dt;
    if(b.k==='sakura'){b.vy+=260*dt;}else if(b.k==='ocean'){b.vy-=60*dt;}else{b.vy*=1-1.6*dt;}
    gt.save();gt.translate(b.x,b.y);gt.rotate(b.r);gt.globalAlpha=Math.min(1,(1-u)*1.6);gt.fillStyle=b.c;
    if(b.k==='sakura')petal(gt,b.s);
    else if(b.k==='aurora')spark(gt,b.s*(1-u*.4));
    else{gt.strokeStyle=b.c;gt.lineWidth=1.4;gt.beginPath();gt.arc(0,0,b.s,0,6.283);gt.stroke();}
    gt.restore();return true;
  });
  gt.globalAlpha=1;
  if((FX.anim&&FX.parts.length)||FX.bursts.length)skinKick();
}
function skinKick(){
  if(FX.raf||document.hidden||!FX.bg)return;
  if(!(FX.anim&&FX.parts.length)&&!FX.bursts.length){FX.last=0;return;}
  FX.raf=requestAnimationFrame(skinFrame);
}
function skinApply(){
  var k=skinOn(), r=document.documentElement, sk=SKINS[k];
  if(k==='none'){
    r.removeAttribute('data-skin');r.removeAttribute('data-skin-anim');
    if(FX.bg){FX.parts=[];FX.bursts=[];FX.anim=false;FX.skin='none';FX.gb.clearRect(0,0,FX.w,FX.h);FX.gt.clearRect(0,0,FX.w,FX.h);}
    return;
  }
  skinDom();
  var dark=isDark(), anim=skinAnimOn();
  r.setAttribute('data-skin',k);r.setAttribute('data-skin-anim',anim?'1':'0');
  r.style.setProperty('--accent',dark?sk.d:sk.l);r.style.setProperty('--on-accent',dark?'#0B1020':'#FFFFFF');
  if(FX.skin!==k||FX.anim!==anim){FX.skin=k;FX.anim=anim;FX.bursts=[];if(anim)skinSeed();else{FX.parts=[];FX.gb.clearRect(0,0,FX.w,FX.h);}}
  skinKick();
}
/* le thème se pose après les autres réglages d'apparence (il remplace la couleur d'accent) */
(function(){var base=applyPrefs;applyPrefs=function(){base();skinApply();};})();

/* ---------- réglages ---------- */
function skinRows(){
  var ok=!!plan().skins, pro=!!plan().skinAnim, cur=ok?P.skin:'none';
  var h='<div class="srow sk-row"><span>Thème à effets<small>'+(ok?'Change les couleurs, le fond et ajoute un effet à chaque clic.':'Sakura, Aurore, Océan : réservés aux formules Premium et Pro.')+'</small></span><span class="sk-list" role="group" aria-label="Thème à effets">';
  Object.keys(SKINS).forEach(function(k){
    var s=SKINS[k], lock=k!=='none'&&!ok;
    h+='<button class="sk-tile'+(lock?' lock':'')+'" '+(lock?'data-act="upsell" data-id="skins"':'data-act="skin" data-id="'+k+'"')+' aria-pressed="'+(cur===k)+'"'+(lock?' title="Premium"':'')+'><i class="sk-sw" style="background:'+(s.sw||'var(--well)')+'">'+(lock?ic('lock'):k==='none'?ic('x'):'')+'</i><span>'+s.n+'</span></button>';
  });
  h+='</span></div>';
  if(ok&&cur!=='none'){
    h+='<div class="srow"><span>Effet au clic<small>Quelques pétales, étincelles ou bulles là où tu cliques.</small></span><span class="seg" role="group"><button data-act="skin-fx" data-id="1" aria-pressed="'+(P.skinFx)+'">Oui</button><button data-act="skin-fx" data-id="0" aria-pressed="'+(!P.skinFx)+'">Non</button></span></div>';
    h+='<div class="srow"><span>Fond animé'+(pro?'':' <span class="pbadge">Pro</span>')+'<small>'+(pro?'Le fond bouge doucement. Coupé automatiquement si ton appareil demande moins d’animations.':'Avec la formule Pro, le fond s’anime : pétales qui tombent, aurore qui ondule, bulles qui montent.')+'</small></span>'
      +(pro?'<span class="seg" role="group"><button data-act="skin-anim" data-id="1" aria-pressed="'+(P.skinAnim)+'">Oui</button><button data-act="skin-anim" data-id="0" aria-pressed="'+(!P.skinAnim)+'">Non</button></span>':'<button class="btn sm" data-act="upsell" data-id="skinpro">'+ic('star')+'Passer à Pro</button>')+'</div>';
  }
  return h;
}
function skinClick(act,id){
  if(act==='skin'){if(!SKINS[id])return true;if(id!=='none'&&!plan().skins){upsell('skins');return true;}setPref('skin',id);render();return true;}
  if(act==='skin-fx'){setPref('skinFx',id==='1');render();return true;}
  if(act==='skin-anim'){if(!plan().skinAnim){upsell('skinpro');return true;}setPref('skinAnim',id==='1');render();return true;}
  return false;
}
