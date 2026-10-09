/* On Stride — langues.
   Le français est la langue d'écriture du code. Une autre langue = un dictionnaire « texte français → traduction »
   (voir js/lang-en.js). La traduction se fait juste avant l'affichage :
     - tr(html)  traduit les textes d'un morceau d'interface, sans jamais toucher au contenu saisi par les gens ;
     - T(texte)  traduit un texte fixe ; tf(texte, a, b) remplace {0}, {1} par des valeurs.
   Le contenu saisi (noms de projets, titres, notes…) passe par esc(), qui l'entoure d'une marque invisible :
   tr() saute tout ce qui est entre deux marques, puis les retire. */
'use strict';
var I18N={langs:{fr:'Français',en:'English'},dict:{},pats:{},miss:{}};
var MARK='⁣';
var LANG=(function(){
  var v=null;
  try{v=JSON.parse(localStorage.getItem('av.lang'));}catch(_){}
  if(v&&I18N.langs[v])return v;
  var n=String((navigator.languages&&navigator.languages[0])||navigator.language||'fr').toLowerCase();
  return n.indexOf('fr')===0?'fr':'en';
})();
function LOCALE(){return LANG==='en'?'en-GB':'fr-FR';}
I18N.add=function(lang,dict,pats){I18N.dict[lang]=Object.assign(I18N.dict[lang]||{},dict);I18N.pats[lang]=(I18N.pats[lang]||[]).concat(pats||[]);if(lang===LANG)I18N.apply();};
I18N.set=function(lang){
  if(!I18N.langs[lang])return;
  LANG=lang;
  try{localStorage.setItem('av.lang',JSON.stringify(lang));}catch(_){}
  I18N.apply();
};
/* textes fixes de index.html (attribut data-l = texte français) */
I18N.apply=function(){
  document.documentElement.setAttribute('lang',LANG);
  var els=document.querySelectorAll('[data-l]');
  for(var i=0;i<els.length;i++)els[i].setAttribute('aria-label',T(els[i].getAttribute('data-l')));
};

function i18nLookup(core){
  var D=I18N.dict[LANG]; if(!D)return null;
  if(D[core]!=null)return D[core];
  /* variantes : « nom » devient « {q} », les nombres deviennent {n} */
  var qs=[], k=core.replace(/« ([^»]*) »/g,function(_,x){qs.push(x);return '« {q} »';});
  var ns=[], k2=k.replace(/\d+(?:[.,]\d+)?/g,function(x){ns.push(x);return '{n}';});
  var hit=null;
  if(D[k2]!=null)hit=D[k2];
  else if(D[k]!=null){hit=D[k];ns=[];}
  if(hit!=null){var i=0,j=0;return hit.replace(/\{n\}/g,function(){return ns[i++];}).replace(/\{q\}/g,function(){return qs[j++];});}
  var P=I18N.pats[LANG]||[];
  for(var x=0;x<P.length;x++){if(P[x][0].test(core))return core.replace(P[x][0],P[x][1]);}
  return null;
}
/* traduit un texte fixe en gardant ses espaces de début et de fin ; renvoie le texte tel quel s'il est inconnu */
function trText(s){
  if(LANG==='fr'||s==null||s==='')return s;
  s=String(s);
  var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/), core=m[2];
  if(!core||!/[A-Za-zÀ-ÿ]/.test(core))return s;
  var out=i18nLookup(core);
  if(out==null){I18N.miss[core]=1;return s;}
  return m[1]+out+m[3];
}
function T(s){return trText(s);}
/* protège un texte déjà prêt (traduit, date, nom propre) : tr() n'y touchera pas */
function nt(s){s=String(s==null?'':s);return LANG==='fr'||!s?s:MARK+s.split(MARK).join('')+MARK;}
function unmark(s){return String(s).split(MARK).join('');}
function tf(s){
  var a=arguments, out=T(s);
  return nt(String(out).replace(/\{(\d)\}/g,function(_,i){return a[Number(i)+1]!=null?unmark(a[Number(i)+1]):'';}));
}
/* traduit les valeurs d'une table fixe (ex. les statuts) pour un menu déroulant */
function L(map){
  if(LANG==='fr')return map;
  var o={};Object.keys(map).forEach(function(k){o[k]=T(map[k]);});return o;
}
/* traduit les parties fixes d'un texte qui peut contenir du contenu saisi (entre deux marques) */
function trMixed(s){
  s=String(s);
  if(LANG==='fr')return s;
  if(s.indexOf(MARK)<0)return trText(s);
  return s.split(MARK).map(function(part,i){return i%2?MARK+part+MARK:trText(part);}).join('');
}
var TR_TEXT=/>([^<]+)</g, TR_ATTR=/\b(placeholder|title|aria-label|alt)="([^"]*)"/g;
function tr(html){
  if(LANG==='fr')return html;
  html=String(html).replace(TR_ATTR,function(_,a,v){return a+'="'+trMixed(v)+'"';}).replace(TR_TEXT,function(_,t){return '>'+trMixed(t)+'<';});
  return html.split(MARK).join('');
}
document.documentElement.setAttribute('lang',LANG);
