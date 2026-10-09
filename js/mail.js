/* On Stride — Inbox : une messagerie interne présentée comme une boîte mail.
   On écrit à l'adresse e-mail d'une personne ; elle lit le message en se connectant à On Stride avec cette adresse.
   Les messages sont dans la table « messages » (voir supabase/schema.sql). L'alerte par vrai e-mail est facultative :
   elle passe par la fonction supabase/functions/notify-message (voir LISEZ-MOI.md). */
'use strict';

var MAIL={rows:[],loaded:false,err:'',box:'in',open:null,compose:null,seen:null,busy:false};

function mailMine(m){return !!S.me&&m.from_id===S.me.id;}
function mailOther(m){return mailMine(m)?m.to_email:m.from_email;}
function mailName(m){return mailMine(m)?m.to_email:(m.from_name||m.from_email);}
function mailVisible(m){return mailMine(m)?!m.del_from:!m.del_to;}
function mailStamp(m){return new Date(m.created_at).getTime()||0;}
/* conversations : les messages d'un même fil, du plus ancien au plus récent */
function mailThreads(){
  var by={}, out=[];
  MAIL.rows.forEach(function(m){
    if(!mailVisible(m))return;
    var k=m.thread||m.id, t=by[k];
    if(!t){t=by[k]={id:k,ms:[],unread:0,inb:false,outb:false};out.push(t);}
    t.ms.push(m);
    if(mailMine(m))t.outb=true; else{t.inb=true;if(!m.read_at)t.unread++;}
  });
  out.forEach(function(t){
    t.ms.sort(function(a,b){return mailStamp(a)-mailStamp(b);});
    t.last=t.ms[t.ms.length-1];t.at=mailStamp(t.last);
    t.subject=t.ms[0].subject||'';
    t.other=mailOther(t.last);
    var named=t.ms.filter(function(m){return !mailMine(m)&&m.from_name;}).pop();
    t.who=named?named.from_name:t.other;
  });
  return out.sort(function(a,b){return b.at-a.at;});
}
function mailUnread(){return mailThreads().filter(function(t){return t.unread;}).length;}
function mailWhen(n){
  var d=new Date(n), now=new Date();
  if(ds(d)===ds(now))return d.toLocaleTimeString(LOCALE(),{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString(LOCALE(),{day:'numeric',month:'short'});
}
function mailContacts(){
  var seen={}, out=[];
  function add(e){e=String(e||'').trim().toLowerCase();if(validEmail(e)&&!seen[e]&&(!S.me||e!==S.me.email)){seen[e]=1;out.push(e);}}
  MAIL.rows.forEach(function(m){add(mailOther(m));});
  S.clients.forEach(function(c){add(c.email);});
  S.raw.mb.forEach(function(m){add(m.email);});
  return out.slice(0,60);
}

/* ---------- chargement ---------- */
function mailReload(){
  if(!S.me||!Cloud.mailLoad)return Promise.resolve();
  return Cloud.mailLoad().then(function(rows){
    var first=!MAIL.loaded, known=MAIL.seen||{}, fresh=[];
    rows.forEach(function(m){if(!known[m.id]&&!mailMine(m)&&!m.read_at&&!m.del_to)fresh.push(m);});
    MAIL.rows=rows;MAIL.loaded=true;MAIL.err='';
    MAIL.seen={};rows.forEach(function(m){MAIL.seen[m.id]=1;});
    if(!first&&fresh.length){
      var m=fresh[0], who=m.from_name||m.from_email;
      if(S.view==='mail'&&MAIL.open===(m.thread||m.id))mailMarkRead(MAIL.open);
      else{
        toast(tf('Nouveau message de {0}',who));
        try{notify(tf('Nouveau message de {0}',who),m.subject||String(m.body||'').slice(0,80),{view:'mail',tag:'onstride-mail'});}catch(_){}
      }
    }
    queueRender();
  },function(e){
    MAIL.loaded=true;MAIL.err=(e&&e.code)==='no_schema'?'no_schema':'err';queueRender();
  });
}
function mailStart(){
  MAIL.rows=[];MAIL.loaded=false;MAIL.seen=null;
  if(Cloud.onMail)Cloud.onMail(function(){clearTimeout(MAIL.t);MAIL.t=setTimeout(mailReload,300);});
  mailReload();
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&S.auth==='in')mailReload();});
}
function mailMarkRead(tid){
  var now=new Date().toISOString(), ids=[];
  MAIL.rows.forEach(function(m){if((m.thread||m.id)===tid&&!mailMine(m)&&!m.read_at){m.read_at=now;ids.push(m.id);}});
  if(ids.length)Cloud.mailPatch(ids,{read_at:now}).catch(function(){});
}
function mailSend(to,subject,body,thread){
  to=String(to||'').trim().toLowerCase();subject=String(subject||'').replace(/\s+/g,' ').trim().slice(0,200);body=String(body||'').trim();
  if(!validEmail(to)){toast('Adresse e-mail invalide.',{bad:true});return Promise.resolve(false);}
  if(S.me&&to===S.me.email){toast('C’est ta propre adresse : écris à quelqu’un d’autre.',{bad:true});return Promise.resolve(false);}
  if(!body){toast('Écris ton message avant de l’envoyer.',{bad:true});return Promise.resolve(false);}
  if(body.length>10000){toast('Message trop long : 10 000 caractères au maximum.',{bad:true});return Promise.resolve(false);}
  if(MAIL.busy)return Promise.resolve(false);
  MAIL.busy=true;render();
  return Cloud.mailSend({to_email:to,subject:subject,body:body,thread:thread||null,from_name:myName()||S.me.name||''}).then(function(row){
    MAIL.busy=false;
    MAIL.rows.unshift(row);if(MAIL.seen)MAIL.seen[row.id]=1;
    toast(tf('Message envoyé à {0}.',to));
    if(Cloud.mailNotify)Cloud.mailNotify(row.id);   /* alerte par vrai e-mail, si elle est configurée */
    return row;
  },function(e){
    MAIL.busy=false;
    var c=e&&e.code;
    toast(c==='no_schema'?'La messagerie n’est pas encore activée : relance le fichier supabase/schema.sql dans Supabase.':c==='invalid_argument'?'Envoi refusé : trop de messages envoyés en peu de temps. Réessaie plus tard.':'Envoi impossible pour le moment. Réessaie dans un instant.',{bad:true});
    render();return false;
  });
}
function mailDelete(tid){
  var mine=[], theirs=[];
  MAIL.rows.forEach(function(m){if((m.thread||m.id)!==tid||!mailVisible(m))return;if(mailMine(m)){m.del_from=true;mine.push(m.id);}else{m.del_to=true;theirs.push(m.id);}});
  if(mine.length)Cloud.mailPatch(mine,{del_from:true}).catch(function(){});
  if(theirs.length)Cloud.mailPatch(theirs,{del_to:true,read_at:new Date().toISOString()}).catch(function(){});
  if(MAIL.open===tid)MAIL.open=null;
  toast('Conversation supprimée.',{undo:function(){
    MAIL.rows.forEach(function(m){if(mine.indexOf(m.id)>=0)m.del_from=false;if(theirs.indexOf(m.id)>=0)m.del_to=false;});
    if(mine.length)Cloud.mailPatch(mine,{del_from:false}).catch(function(){});
    if(theirs.length)Cloud.mailPatch(theirs,{del_to:false}).catch(function(){});
    render();
  }});
}

/* ---------- écran ---------- */
function mailRowHtml(t){
  var on=MAIL.open===t.id, last=t.last, snip=String(last.body||'').replace(/\s+/g,' ').slice(0,110);
  return '<li><button class="ml-row'+(on?' on':'')+(t.unread?' unread':'')+'" data-act="mail-open" data-id="'+esc(t.id)+'"'+(on?' aria-current="true"':'')+'>'
    +avatar({email:t.other,name:MAIL.box==='out'?t.other:t.who})+'<span class="ml-m"><span class="ml-top"><b class="ml-who">'+(MAIL.box==='out'?'<span class="mut">À :</span> '+esc(t.other):esc(t.who))+'</b>'+(t.ms.length>1?'<span class="cnt">'+t.ms.length+'</span>':'')+'<span class="grow"></span><span class="cnt">'+nt(mailWhen(t.at))+'</span></span>'
    +'<span class="ml-sub">'+(t.unread?'<i class="ml-dot" aria-hidden="true"></i><span class="sr">Non lu</span>':'')+(t.subject?esc(t.subject):'<span class="mut">(sans objet)</span>')+'</span>'
    +'<span class="ml-snip">'+(mailMine(last)&&MAIL.box!=='out'?'<span class="mut">Toi :</span> ':'')+esc(snip)+'</span></span></button></li>';
}
function mailComposeHtml(){
  var c=MAIL.compose||{};
  var h='<div class="ml-pane"><header class="ml-h"><button class="ib only-s" data-act="mail-back" aria-label="Retour">'+ic('left')+'</button><h2 class="grow">Nouveau message</h2><button class="ib" data-act="mail-cancel" aria-label="Fermer">'+ic('x')+'</button></header>';
  h+='<div class="ml-form"><label for="ml-to">À</label><input class="in" id="ml-to" type="email" list="ml-contacts" data-draft value="'+esc(c.to||'')+'" placeholder="adresse@exemple.com" autocomplete="off"><datalist id="ml-contacts">'+mailContacts().map(function(e){return '<option value="'+escRaw(e)+'">';}).join('')+'</datalist>';
  h+='<label for="ml-sub">Objet</label><input class="in" id="ml-sub" data-draft value="'+esc(c.subject||'')+'" maxlength="200" placeholder="De quoi s’agit-il ?" autocomplete="off">';
  h+='<label class="sr" for="ml-body">Message</label><textarea class="area ml-body" id="ml-body" data-draft placeholder="Écris ton message…">'+esc(c.body||'')+'</textarea></div>';
  h+='<footer class="ml-f"><p class="hint grow">La personne lit ton message en se connectant à On Stride avec cette adresse.</p><button class="btn primary" data-act="mail-send"'+(MAIL.busy?' disabled':'')+'>'+ic('arrow')+(MAIL.busy?'Envoi…':'Envoyer')+'</button></footer></div>';
  return h;
}
function mailThreadHtml(t){
  var id=esc(t.id);
  var h='<div class="ml-pane"><header class="ml-h"><button class="ib only-s" data-act="mail-back" aria-label="Retour">'+ic('left')+'</button><div class="grow ml-ht"><h2>'+(t.subject?esc(t.subject):'<span class="mut">(sans objet)</span>')+'</h2><p class="cnt">'+esc(t.other)+'</p></div>'
    +'<button class="btn sm" data-act="mail-bazar" data-id="'+id+'" title="Créer une tâche dans le Bazar à partir de ce message">'+ic('box')+'<span class="hide-s">Mettre au Bazar</span></button><button class="ib dng" data-act="mail-del" data-id="'+id+'" aria-label="Supprimer la conversation" title="Supprimer la conversation">'+ic('trash')+'</button></header>';
  h+='<div class="ml-msgs" id="ml-msgs">'+t.ms.map(function(m){
    var me=mailMine(m);
    return '<article class="ml-msg'+(me?' me':'')+'">'+avatar(me?S.me:{email:m.from_email,name:m.from_name})+'<div class="ml-mb"><p class="ml-mh"><b>'+(me?'Toi':esc(m.from_name||m.from_email))+'</b>'+(me?'':'<span class="mut">'+esc(m.from_email)+'</span>')+'<span class="grow"></span><span class="cnt" title="'+nt(escRaw(new Date(m.created_at).toLocaleString(LOCALE())))+'">'+nt(mailWhen(mailStamp(m)))+'</span></p><div class="ml-txt">'+esc(m.body)+'</div>'
      +(me&&m.read_at?'<p class="ml-seen">'+ic('check')+'Lu</p>':'')+'</div></article>';
  }).join('')+'</div>';
  h+='<footer class="ml-reply"><label class="sr" for="ml-reply">Répondre</label><textarea class="area sm" id="ml-reply" data-draft placeholder="'+tf('Répondre à {0}…',escRaw(t.other))+'"></textarea><div class="row-btns"><span class="hint grow hide-s">Ctrl + Entrée pour envoyer</span><button class="btn primary" data-act="mail-reply" data-id="'+id+'"'+(MAIL.busy?' disabled':'')+'>'+ic('arrow')+(MAIL.busy?'Envoi…':'Répondre')+'</button></div></footer></div>';
  return h;
}
function vMail(){
  var all=mailThreads(), list=all.filter(function(t){return MAIL.box==='out'?t.outb:t.inb;}), nin=all.filter(function(t){return t.unread;}).length;
  var cur=MAIL.open?all.find(function(t){return t.id===MAIL.open;}):null;
  if(MAIL.open&&!cur&&MAIL.loaded)MAIL.open=null;
  var h='<header class="phd ml-hd"><div><h1>Inbox</h1><p class="lead">Tes messages avec les autres personnes sur On Stride.</p></div><button class="btn primary" data-act="mail-new">'+ic('plus')+'Nouveau message</button></header>';
  if(MAIL.err)h+='<div class="note bad"><p>'+(MAIL.err==='no_schema'?'La messagerie n’est pas encore activée : relance le fichier supabase/schema.sql dans Supabase (SQL Editor), puis recharge la page.':'Les messages ne se chargent pas pour le moment. Recharge la page.')+'</p></div>';
  h+='<div class="mail" data-pane="'+(MAIL.compose||cur?'1':'0')+'"><section class="ml-list panel" aria-label="Conversations"><div class="ml-tabs"><span class="seg" role="group"><button data-act="mail-box" data-id="in" aria-pressed="'+(MAIL.box!=='out')+'">'+ic('inbox')+'Reçus'+(nin?'<span class="pillc">'+nin+'</span>':'')+'</button><button data-act="mail-box" data-id="out" aria-pressed="'+(MAIL.box==='out')+'">'+ic('arrow')+'Envoyés</button></span></div>';
  if(!MAIL.loaded)h+='<p class="ml-none mut">Chargement…</p>';
  else if(!list.length)h+='<div class="ml-none">'+empty('inbox',MAIL.box==='out'?'Aucun message envoyé':'Aucun message reçu',MAIL.box==='out'?'Les messages que tu envoies apparaîtront ici.':'Quand quelqu’un t’écrit sur On Stride, son message arrive ici.')+'</div>';
  else h+='<ul class="ml-ul">'+list.map(mailRowHtml).join('')+'</ul>';
  h+='</section><section class="ml-read panel">';
  if(MAIL.compose)h+=mailComposeHtml();
  else if(cur)h+=mailThreadHtml(cur);
  else h+='<div class="ml-blank">'+empty('msg','Choisis une conversation','Ou écris à quelqu’un avec son adresse e-mail.','<button class="btn" data-act="mail-new">'+ic('plus')+'Nouveau message</button>')+'</div>';
  return h+'</section></div>';
}
function mailAfter(){
  var box=document.getElementById('ml-msgs');
  if(box&&box._k!==MAIL.open+'|'+box.children.length){box._k=MAIL.open+'|'+box.children.length;box.scrollTop=box.scrollHeight;}
}

/* ---------- branchements ---------- */
function mailClick(act,id){
  if(act.indexOf('mail-')!==0)return false;
  if(act==='mail-box'){MAIL.box=id==='out'?'out':'in';MAIL.open=null;MAIL.compose=null;render();return true;}
  if(act==='mail-open'){MAIL.open=id;MAIL.compose=null;S.dirty={};mailMarkRead(id);render();return true;}
  if(act==='mail-back'||act==='mail-cancel'){MAIL.open=act==='mail-back'?null:MAIL.open;MAIL.compose=null;S.dirty={};render();return true;}
  if(act==='mail-new'){if(S.view!=='mail')go('mail');MAIL.compose={to:id&&validEmail(id)?id:''};S.dirty={};S.focus=MAIL.compose.to?'ml-sub':'ml-to';render();return true;}
  if(act==='mail-send'){
    var to=document.getElementById('ml-to'), su=document.getElementById('ml-sub'), bo=document.getElementById('ml-body');
    if(!to||!bo)return true;
    mailSend(to.value,su?su.value:'',bo.value,null).then(function(row){
      if(!row)return;
      MAIL.compose=null;S.dirty={};MAIL.box='out';MAIL.open=row.thread||row.id;render();
    });
    return true;
  }
  if(act==='mail-reply'){
    var t=mailThreads().find(function(x){return x.id===id;}), ta=document.getElementById('ml-reply');
    if(!t||!ta)return true;
    mailSend(t.other,t.subject,ta.value,t.id).then(function(row){
      if(!row)return;
      var el=document.getElementById('ml-reply');if(el)el.value='';delete S.dirty['ml-reply'];render();
    });
    return true;
  }
  if(act==='mail-del'){mailDelete(id);render();return true;}
  if(act==='mail-bazar'){
    var th=mailThreads().find(function(x){return x.id===id;}); if(!th)return true;
    var m=th.last;
    addInbox(th.subject||String(m.body||'').replace(/\s+/g,' ').slice(0,80),{notes:unmark(tf('Message de {0} :',mailName(m)))+'\n'+m.body});
    toast('Tâche créée dans le Bazar.');render();return true;
  }
  render();return true;
}
function mailKey(ev){
  if(S.view!=='mail'||ev.key!=='Enter'||!(ev.ctrlKey||ev.metaKey))return false;
  var el=ev.target, b=el&&el.id==='ml-reply'?document.querySelector('[data-act="mail-reply"]'):el&&(el.id==='ml-body'||el.id==='ml-sub'||el.id==='ml-to')?document.querySelector('[data-act="mail-send"]'):null;
  if(!b)return false;
  ev.preventDefault();b.click();return true;
}
