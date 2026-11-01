// ====== CONFIGURATION FIREBASE : colle ici l'objet firebaseConfig de ta console Firebase ======
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCUtrxchPjY7qmp2i21SkyMzTrGFlE4bdo",
  authDomain: "athenes-2026.firebaseapp.com",
  projectId: "athenes-2026",
  storageBucket: "athenes-2026.firebasestorage.app",
  messagingSenderId: "910040021746",
  appId: "1:910040021746:web:4f37b12d9039843d96ee6b"
};
// ==============================================================================================

window.addEventListener("error",e=>{const n=document.getElementById("notice");if(n){n.textContent="Un problème technique est survenu : "+(e.message||"erreur inconnue")+". Fais une capture et envoie-la à Julio.";n.className="notice warn";n.hidden=false;}});
(function(){
  const TYPES={resto:"Resto",activite:"Activité",visite:"Visite",autre:"Autre"};
  const STATUS={idee:"Idée",encours:"À réserver",reserve:"Réservé ✓"};
  const NEXT={idee:"encours",encours:"reserve",reserve:"idee"};
  const SEED_TRIP={start:"2026-12-22",end:"2026-12-26",stay:"Au pied du Lycabette",stayLat:37.9812,stayLng:23.7432};
  const MOMENTS={matin:"Matin",midi:"Midi",aprem:"Aprèm",soir:"Soir"};
  const ICON={resto:"🍽️",activite:"⭐",visite:"🏛️",autre:"🍸"};
  const SEED_PLANS=[
    {id:"j-vouliagmeni",title:"Lac Vouliagmeni",type:"activite",status:"idee",date:"",time:"",place:"Vouliagmeni, Riviera athénienne",who:"Julio",price:"",lat:37.8078,lng:23.7856,link:"https://www.google.com/maps/search/?api=1&query=Lake+Vouliagmeni",note:"Lac d'eau thermale où l'on peut se baigner même en hiver. Penser au maillot et à une serviette."},
    {id:"j-seychelles",title:"Dîner chez Seychelles",type:"resto",status:"encours",date:"",time:"20:30",place:"Metaxourgeio",who:"Julio",price:"",link:"https://www.google.com/maps/search/?api=1&query=Seychelles+restaurant+Metaxourgeio+Athens",note:"Même soirée que le verre au Blue Parrot, à deux pas dans le même quartier. Réserver pour tout le groupe."},
    {id:"j-blueparrot",title:"Un verre au Blue Parrot",type:"autre",status:"idee",date:"",time:"23:00",place:"Metaxourgeio",who:"Julio",price:"",link:"https://www.google.com/maps/search/?api=1&query=Blue+Parrot+Metaxourgeio+Athens",note:"Avant le dîner chez Seychelles, même soirée."},
    {id:"v-pharaoh",title:"Pharaoh",type:"resto",status:"encours",date:"2026-12-23",time:"",place:"",who:"Vassilis",price:"",link:"https://www.pharaoh.gr/",note:""}
  ];
  const $=id=>document.getElementById(id);
  let fs=null,me=null;
  let plans=[],trip={},filter="all",editingId=null,confirmDel=null,loaded=false,draft=null;

  const store={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}}};
  function toast(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2400);}
  function notice(msg,warn){const n=$("notice");if(!msg){n.hidden=true;return;}n.textContent=msg;n.className="notice"+(warn?" warn":"");n.hidden=false;}

  const fmtDay=d=>{try{return new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});}catch(e){return d;}};
  const fmtShort=d=>{try{return new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"});}catch(e){return d;}};
  const safeUrl=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:null;}catch(e){return null;}};
  const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
  const on=m=>Object.keys(m||{}).filter(k=>m[k]);
  const joined=p=>on(p.joiners), liked=p=>on(p.likes), disliked=p=>on(p.dislikes);
  const score=p=>liked(p).length-disliked(p).length;
  const names=ids=>ids.length<=3?ids.join(", "):ids.slice(0,3).join(", ")+` et ${ids.length-3} autre${ids.length>4?"s":""}`;
  const initials=n=>n.split(/\s+/).map(s=>s[0]||"").join("").slice(0,2).toUpperCase();
  function hue(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%360;return h;}
  function bubbles(ids){const s=el("div","stack");ids.slice(0,6).forEach(n=>{const b=el("span","bubble",initials(n));b.title=n;b.style.setProperty("--h",hue(n));s.append(b);});return s;}

  // ---------- prénom ----------
  function askName(force){
    const cur=store.get("ath-name");
    if(cur&&!force){setMe(cur);return;}
    $("nameInput").value=cur||"";$("nameModal").hidden=false;setTimeout(()=>$("nameInput").focus(),50);
  }
  function setMe(n){me=n;store.set("ath-name",n);$("meName").textContent=n;render();if(typeof renderGifts==="function")renderGifts();}
  $("nameForm").addEventListener("submit",e=>{e.preventDefault();const v=$("nameInput").value.trim().slice(0,30);if(!v)return;$("nameModal").hidden=true;setMe(v);});
  $("changeName").onclick=()=>askName(true);

  // ---------- rendu ----------
  function renderTrip(){
    const s=trip.start,e=trip.end;
    $("tripDates").textContent=s&&e?`Du ${fmtShort(s)} au ${fmtShort(e)}`:(s?`À partir du ${fmtShort(s)}`:"Dates à fixer");
    $("tripStay").textContent=trip.stay?`Logement : ${trip.stay}`:"";
  }

  function render(){
    const total=plans.length,res=plans.filter(p=>p.status==="reserve").length,todo=plans.filter(p=>p.status==="encours").length;
    const st=$("stats");st.replaceChildren();
    [[total,"propositions"],[res,"réservées"],[todo,"à réserver"]].forEach(([n,l])=>{const s=el("span");s.append(el("b",null,String(n))," "+l);st.append(s);});
    const view=plans.filter(p=>filter==="all"?true:filter==="mine"?(me&&liked(p).includes(me)):p.type===filter);
    const list=$("list");list.replaceChildren();
    if(!loaded){const e=el("div","empty");e.append(el("h3",null,"Chargement du programme…"),"Les propositions de la famille vont apparaître ici.");list.append(e);return;}
    if(!view.length){
      const e=el("div","empty");
      if(!plans.length)e.append(el("h3",null,"Le programme est vide"),"Appuie sur « + Proposer » pour ajouter un premier resto ou une activité.");
      else e.append(el("h3",null,"Rien dans ce filtre"),"Change de filtre pour voir les autres propositions.");
      list.append(e);return;
    }
    const groups={};view.forEach(p=>{const k=p.date||"~";(groups[k]=groups[k]||[]).push(p);});
    Object.keys(groups).sort().forEach(k=>{
      const sec=el("section","day"),h=el("div","dayhead");
      h.append(el("h2",null,k==="~"?"À caler ensemble":fmtDay(k)));
      h.append(el("span",null,k==="~"?"Dites si vous kiffez 👍 ou pas 👎, on choisit le jour après":groups[k].length+(groups[k].length>1?" prévus":" prévu")));
      sec.append(h);
      groups[k].sort((a,b)=>k==="~"?(score(b)-score(a))||(a.title||"").localeCompare(b.title||""):(a.time||"99").localeCompare(b.time||"99")).forEach(p=>sec.append(card(p)));
      list.append(sec);
    });
    renderMap();
  }

  function field(lbl,key,type,full,opts){
    const id="e-"+key,l=el("label",full?"full":null);l.htmlFor=id;l.append(lbl);let i;
    if(opts){i=document.createElement("select");Object.entries(opts).forEach(([v,t])=>{const o=el("option",null,t);o.value=v;i.append(o);});}
    else if(type==="textarea")i=document.createElement("textarea");
    else{i=document.createElement("input");i.type=type||"text";}
    i.id=id;i.value=draft[key]||"";i.oninput=()=>{draft[key]=i.value;};i.onchange=i.oninput;l.append(i);return l;
  }
  function editCard(p){
    const f=el("form","add");f.style.gridColumn="1/-1";
    f.append(field("Quoi ?","title","text",true),field("Type","type",null,false,TYPES),field("Statut","status",null,false,{idee:"Idée",encours:"À réserver",reserve:"Réservé"}),
      field("Jour","date","date"),field("Heure","time","time"),field("Lieu","place"),field("Qui organise ?","who"),
      field("Prix indicatif","price"),field("Lien","link","url"),field("Infos utiles","note","textarea",true));
    const a=el("div","formactions");
    const cx=el("button","btn ghost","Annuler");cx.type="button";cx.onclick=()=>{editingId=null;draft=null;render();};
    const sv=el("button","btn","Enregistrer");sv.type="submit";a.append(cx,sv);f.append(a);
    f.addEventListener("submit",async ev=>{
      ev.preventDefault();if(!(draft.title||"").trim()){toast("Donne un titre à la proposition.");return;}
      const lk=(draft.link||"").trim();
      const data={title:draft.title.trim(),type:draft.type||"autre",status:draft.status||"idee",date:draft.date||"",time:draft.time||"",
        place:(draft.place||"").trim(),who:(draft.who||"").trim(),price:(draft.price||"").trim(),link:lk&&safeUrl(lk)?lk:"",note:(draft.note||"").trim()};
      editingId=null;draft=null;await write(p.id,data,"Modifications enregistrées");render();
    });
    return f;
  }

  function card(p){
    const c=el("article","card");c.id="card-"+p.id;
    if(editingId===p.id&&draft){c.append(editCard(p));return c;}
    c.append(el("div","time"+(p.time?"":" none"),p.time||MOMENTS[p.moment]||"—"));
    const b=el("div","body"),j=joined(p),L=liked(p);
    const r1=el("div","row");r1.append(el("span","tag",TYPES[p.type]||"Autre"),el("span","title",p.title||"Sans titre"));b.append(r1);
    const st=el("button","status st-"+(p.status||"idee"),STATUS[p.status]||"Idée");st.title="Changer le statut";
    st.onclick=()=>write(p.id,{status:NEXT[p.status||"idee"]},"Statut mis à jour");
    const r2=el("div","row");r2.append(st);
    const bits=[p.genre,p.place,p.who?("organisé par "+p.who):"",p.price].filter(Boolean).join(" · ");
    if(bits)r2.append(el("span","meta",bits));b.append(r2);
    if(p.note)b.append(el("div","note",p.note));
    const u=p.link&&safeUrl(p.link);
    if(u){const a=el("a","link","Voir / réserver ↗");a.href=u;a.target="_blank";a.rel="noopener noreferrer";b.append(a);}
    const D=disliked(p);
    if(L.length){const r=el("div","avatars likes");r.append(el("span","thumb","👍"),bubbles(L),el("span",null,"Kiffé par "+names(L)));b.append(r);}
    if(D.length){const r=el("div","avatars likes");r.append(el("span","thumb","👎"),bubbles(D),el("span",null,"Pas chaud : "+names(D)));b.append(r);}
    if(!L.length&&!D.length)b.append(el("div","avatars","Personne n'a encore donné son avis"));
    const f=el("div","foot");
    const act=el("div","actions");
    if(me){
      const up=L.includes(me),down=D.includes(me);
      const lb=el("button","btn ghost small like",up?"👍 Je kiffe ✓":"👍 Je kiffe");lb.setAttribute("aria-pressed",String(up));
      lb.onclick=()=>vote(p.id,up?null:"up");
      const db_=el("button","btn ghost small dislike",down?"👎 Bof, pas chaud ✓":"👎 Bof, pas chaud");db_.setAttribute("aria-pressed",String(down));
      db_.onclick=()=>vote(p.id,down?null:"down");
      act.append(lb,db_);
    }
    const mb=el("button","btn ghost small",hasPos(p)?"📍 Voir sur la carte":"📍 Placer sur la carte");
    mb.onclick=()=>hasPos(p)?showOnMap(p):startPick({kind:"plan",id:p.id},p.title||"ce lieu",p.place||p.title||"");
    act.append(mb);
    const eb=el("button","btn ghost small","Modifier");
    eb.onclick=()=>{editingId=p.id;draft={title:p.title,type:p.type,status:p.status,date:p.date,time:p.time,place:p.place,who:p.who,price:p.price,link:p.link,note:p.note};render();};
    act.append(eb);
    if(confirmDel===p.id){
      const y=el("button","btn ghost small del","Confirmer la suppression");
      y.onclick=async()=>{confirmDel=null;try{await fs.collection("plans").doc(p.id).delete();toast("Supprimé");}catch(e){toast("Suppression impossible, réessaie.");}};
      const n=el("button","btn ghost small","Garder");n.onclick=()=>{confirmDel=null;render();};act.append(y,n);
    }else{const d=el("button","btn ghost small del","Supprimer");d.onclick=()=>{confirmDel=p.id;render();};act.append(d);}
    f.append(act);b.append(f);c.append(b);return c;
  }

  // ---------- écritures ----------
  async function write(id,data,msg){
    if(!fs)return;
    try{await fs.collection("plans").doc(id).update(data);toast(msg);}
    catch(e){console.error(e);toast("Enregistrement impossible, vérifie ta connexion.");}
  }
  async function vote(id,v){
    if(!fs||!me)return;const FP=firebase.firestore.FieldPath;
    try{await fs.collection("plans").doc(id).update(new FP("likes",me),v==="up",new FP("dislikes",me),v==="down");
      toast(v==="up"?"Tu kiffes 👍":v==="down"?"Noté, pas chaud 👎":"Avis retiré");}
    catch(e){console.error(e);toast("Enregistrement impossible, vérifie ta connexion.");}
  }
  async function toggle(id,mapName,val,msg){
    if(!fs||!me)return;
    try{await fs.collection("plans").doc(id).update(new firebase.firestore.FieldPath(mapName,me),val);toast(msg);}
    catch(e){console.error(e);toast("Enregistrement impossible, vérifie ta connexion.");}
  }

  // ---------- formulaire & filtres ----------
  document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));render();});
  // ---------- questionnaire « J'ai une idée cool » ----------
  const KINDS=[["resto","🍽️","Un resto"],["activite","⭐","Une activité"],["visite","🏛️","Une visite"],["autre","🍸","Un verre, un café…"],["custom","✏️","Autre chose"]];
  const GENRES={
    resto:["Taverne grecque","Poisson & fruits de mer","Souvlaki / street food","Brunch / café","Resto qui sort de l'ordinaire"],
    activite:["Plage / baignade","Balade / rando","Marché / shopping","Sortie le soir","Concert / spectacle","Sport"],
    visite:["Musée","Quartier à découvrir","Site antique","Point de vue","Expo / galerie"],
    autre:["Bar à cocktails","Café sympa","Rooftop","Pâtisserie / dessert"]
  };
  const Q2={resto:"Quel genre de resto ?",activite:"Quel genre d'activité ?",visite:"Quel genre de visite ?",autre:"Plutôt quoi ?"};
  let w=null;
  function tripDays(){
    const out=[];if(!trip.start||!trip.end)return out;
    const d=new Date(trip.start+"T12:00:00"),e=new Date(trip.end+"T12:00:00");
    while(d<=e&&out.length<14){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}
    return out;
  }
  function pills(options,current,onPick){
    const box=el("div","pills");
    options.forEach(([val,label])=>{const b=el("button","pill",label);b.type="button";b.setAttribute("aria-pressed",String(current===val));b.onclick=()=>onPick(val);box.append(b);});
    return box;
  }
  function nav(back,nextLabel,onNext,nextDisabled){
    const n=el("div","wiznav");
    const bk=el("button","btn ghost","← Retour");bk.type="button";bk.onclick=back;if(!back)bk.style.visibility="hidden";
    const nx=el("button","btn",nextLabel);nx.type="submit";nx.disabled=!!nextDisabled;if(onNext)nx.onclick=onNext;
    n.append(bk,nx);return n;
  }
  function renderWizard(){
    const body=$("wizBody");body.replaceChildren();
    [...$("wizDots").children].forEach((d,i)=>d.classList.toggle("on",i<=w.step));
    if(w.step===0){
      body.append(el("p","wizq","C'est quoi ton idée ?"));
      const t=el("div","tiles");
      KINDS.forEach(([v,em,label])=>{const b=el("button","tile"+(v==="custom"?" wide":""));b.type="button";b.setAttribute("aria-pressed",String(w.kind===v));
        b.append(el("span","em",em),el("span",null,label));
        b.onclick=()=>{if(w.kind!==v){w.genre="";w.otherOpen=false;}w.kind=v;w.type=v==="custom"?"autre":v;w.step=1;renderWizard();};t.append(b);});
      body.append(t);
    }else if(w.step===1){
      const custom=w.kind==="custom",list=custom?[]:GENRES[w.type];
      body.append(el("p","wizq",custom?"C'est quoi comme idée ?":Q2[w.type]));
      const isOther=custom||w.otherOpen||(w.genre&&!list.includes(w.genre));
      if(!custom){
        const opts=list.map(g=>[g,g]).concat([["__other","✏️ Autre…"]]);
        body.append(pills(opts,isOther?"__other":w.genre,v=>{
          if(v==="__other"){w.otherOpen=true;if(list.includes(w.genre))w.genre="";renderWizard();setTimeout(()=>{const i=$("w-genre");if(i)i.focus();},30);return;}
          w.otherOpen=false;w.genre=w.genre===v?"":v;w.step=2;renderWizard();}));
      }
      let nx;
      if(isOther){
        const l=el("label");l.htmlFor="w-genre";l.append(custom?"Décris-la en quelques mots":"Précise");
        const i=document.createElement("input");i.id="w-genre";i.maxLength=40;i.placeholder=custom?"Ex. Cours de cuisine, hammam, karaoké…":"Écris ton idée";
        i.value=list.includes(w.genre)?"":(w.genre||"");
        i.oninput=()=>{w.genre=i.value.trim();if(nx)nx.textContent=w.genre?"Suivant →":"Passer →";};
        i.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();w.step=2;renderWizard();}};
        l.append(i);body.append(l);
        if(custom)setTimeout(()=>i.focus(),30);
      }
      const n=nav(()=>{w.step=0;renderWizard();},w.genre?"Suivant →":"Passer →",()=>{w.step=2;renderWizard();});nx=n.lastChild;body.append(n);
    }else if(w.step===2){
      body.append(el("p","wizq","Plutôt quand ?"));
      body.append(el("div","wizsub","Moment de la journée"));
      body.append(pills([["matin","🌅 Matin"],["midi","☀️ Midi"],["aprem","🕒 Aprèm"],["soir","🌙 Soir"],["","🤷 Peu importe"]],w.moment,v=>{w.moment=v;renderWizard();}));
      const days=tripDays();
      if(days.length){
        body.append(el("div","wizsub","Un jour en tête ?"));
        body.append(pills([["","On verra ensemble"]].concat(days.map(d=>{let t=new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric"});return [d,t.charAt(0).toUpperCase()+t.slice(1)];})),w.date,v=>{w.date=v;renderWizard();}));
      }
      body.append(nav(()=>{w.step=1;renderWizard();},"Suivant →",()=>{w.step=3;renderWizard();}));
    }else if(w.step===3){
      const f=el("form","wizfields");
      f.append(el("p","wizq","Comment ça s'appelle ?"));
      const mk=(id,lbl,ph,type)=>{const l=el("label");l.htmlFor=id;l.append(lbl);const i=document.createElement("input");i.id=id;i.type=type||"text";i.placeholder=ph;i.value=w[id.slice(2)]||"";i.oninput=()=>{w[id.slice(2)]=i.value;nx.disabled=!w.title.trim();};l.append(i);return l;};
      let nx;
      const tl=mk("w-title","Le nom",w.type==="resto"?"Ex. Taverne Klimataria":"Ex. Lac Vouliagmeni");
      f.append(tl,mk("w-place","Le quartier ou l'adresse (si tu sais)","Ex. Psyrri"),mk("w-link","Un lien (site, Instagram, Google Maps), facultatif","https://…","url"));
      const n=nav(()=>{w.step=2;renderWizard();},"Proposer 🎉",null,!(w.title||"").trim());nx=n.lastChild;f.append(n);
      f.addEventListener("submit",async ev=>{
        ev.preventDefault();if(!fs||!(w.title||"").trim())return;nx.disabled=true;
        const lk=(w.link||"").trim();
        const data={title:w.title.trim(),type:w.type,genre:w.genre||"",moment:w.moment||"",status:"idee",date:w.date||"",time:"",
          place:(w.place||"").trim(),who:me||"",price:"",link:lk&&safeUrl(lk)?lk:"",note:"",
          createdBy:me||"",createdAt:new Date().toISOString(),likes:me?{[me]:true}:{},dislikes:{},joiners:{}};
        try{const ref=await fs.collection("plans").add(data);w.newId=ref.id;w.step=4;renderWizard();}
        catch(e){console.error(e);nx.disabled=false;toast("Ajout impossible, vérifie ta connexion.");}
      });
      body.append(f);setTimeout(()=>{const i=$("w-title");if(i)i.focus();},30);
    }else{
      body.append(el("p","wizq","C'est dans le programme ! 🎉"));
      body.append(el("p","meta","La famille peut maintenant dire si elle kiffe. Tu veux la placer sur la carte ?"));
      const n=el("div","wiznav");
      const pin=el("button","btn","📍 La placer sur la carte");pin.type="button";
      pin.onclick=()=>{const id=w.newId,t=w.title,q=w.place||w.title;closeWizard();startPick({kind:"plan",id},t,q);};
      const again=el("button","btn ghost","Proposer autre chose");again.type="button";again.onclick=openWizard;
      n.append(again,pin);body.append(n);
    }
  }
  function openWizard(){w={step:0,kind:"",otherOpen:false,type:"",genre:"",moment:"",date:"",title:"",place:"",link:""};$("wizard").hidden=false;renderWizard();$("wizard").scrollIntoView({behavior:"smooth",block:"start"});}
  function closeWizard(){w=null;$("wizard").hidden=true;}
  $("openForm").onclick=openWizard;
  $("wizClose").onclick=closeWizard;
  $("editTripBtn").onclick=()=>{$("tStart").value=trip.start||"";$("tEnd").value=trip.end||"";$("tStay").value=trip.stay||"";$("tripEdit").hidden=!$("tripEdit").hidden;};
  $("saveTrip").onclick=async()=>{try{await fs.collection("trip").doc("info").set({start:$("tStart").value,end:$("tEnd").value,stay:$("tStay").value.trim()},{merge:true});$("tripEdit").hidden=true;toast("Enregistré");}catch(e){toast("Enregistrement impossible");}};

  // ---------- carte ----------
  let map=null,layer=null,fitted=false,pick=null,draftMarker=null,markers={};
  const hasPos=o=>typeof o.lat==="number"&&typeof o.lng==="number";
  const pinIcon=(emoji,cls)=>L.divIcon({className:"",html:`<div class="pin ${cls||""}"><span>${emoji}</span></div>`,iconSize:[34,34],iconAnchor:[17,34],popupAnchor:[0,-32]});
  function initMap(){
    if(typeof L==="undefined"){$("map").textContent="La carte n'a pas pu se charger.";return;}
    map=L.map("map",{scrollWheelZoom:false,tap:true}).setView([37.9755,23.7348],12);
    const attr='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>';
    const mq=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;
    const tiles=dark=>L.tileLayer("https://{s}.basemaps.cartocdn.com/"+(dark?"dark_all":"rastertiles/voyager")+"/{z}/{x}/{y}{r}.png",{maxZoom:20,subdomains:"abcd",attribution:attr});
    let base=tiles(mq&&mq.matches).addTo(map);
    if(mq&&mq.addEventListener)mq.addEventListener("change",e=>{map.removeLayer(base);base=tiles(e.matches).addTo(map);});
    layer=L.layerGroup().addTo(map);
    map.on("click",e=>{if(!pick)return;setDraft(e.latlng.lat,e.latlng.lng);});
  }
  function renderMap(){
    if(!map)return;layer.clearLayers();markers={};const pts=[];
    if(hasPos({lat:trip.stayLat,lng:trip.stayLng})){
      L.marker([trip.stayLat,trip.stayLng],{icon:pinIcon("🏠","home")}).bindPopup(popup("Logement",trip.stay||"")).addTo(layer);pts.push([trip.stayLat,trip.stayLng]);
    }
    plans.filter(hasPos).forEach(p=>{
      const when=[p.date?fmtShort(p.date):"",p.time].filter(Boolean).join(" · ");
      const m=L.marker([p.lat,p.lng],{icon:pinIcon(ICON[p.type]||"📍")}).bindPopup(popup(p.title||"",when||p.place||"",p.id)).addTo(layer);
      markers[p.id]=m;pts.push([p.lat,p.lng]);
    });
    const box=$("map");
    if(!fitted&&pts.length>1&&box.offsetWidth>0&&box.offsetHeight>0){map.fitBounds(pts,{padding:[30,30],maxZoom:14});fitted=true;}
  }
  function popup(title,sub,id){
    const d=el("div");d.append(el("b",null,title));if(sub)d.append(el("span",null,sub));
    if(id){const a=el("button","linkbtn","Voir la proposition");a.style.display="block";a.style.marginTop="6px";
      a.onclick=()=>{const c=document.getElementById("card-"+id);if(c)c.scrollIntoView({behavior:"smooth",block:"center"});};d.append(a);}
    return d;
  }
  function showOnMap(p){
    if(!map||!markers[p.id])return;showTab("carte");
    $("map").scrollIntoView({behavior:"smooth",block:"center"});
    map.setView([p.lat,p.lng],15);markers[p.id].openPopup();
  }
  function setDraft(lat,lng){
    if(draftMarker)draftMarker.setLatLng([lat,lng]);else draftMarker=L.marker([lat,lng],{icon:pinIcon("📍","draft")}).addTo(map);
    pick.lat=lat;pick.lng=lng;$("pickSave").disabled=false;
  }
  function startPick(target,label,query){
    if(!map){toast("La carte n'est pas disponible.");return;}showTab("carte");
    pick=Object.assign({},target);$("pickTitle").textContent=`Touche la carte pour placer « ${label} », ou cherche l'adresse.`;
    $("pickQuery").value=query||"";$("pickSave").disabled=true;$("pickBar").hidden=false;
    $("pickBar").scrollIntoView({behavior:"smooth",block:"start"});
    const cur=target.kind==="trip"?{lat:trip.stayLat,lng:trip.stayLng}:plans.find(x=>x.id===target.id)||{};
    if(hasPos(cur)){setDraft(cur.lat,cur.lng);map.setView([cur.lat,cur.lng],15);}
  }
  function endPick(){pick=null;$("pickBar").hidden=true;if(draftMarker){map.removeLayer(draftMarker);draftMarker=null;}}
  $("pickCancel").onclick=endPick;
  $("pickSearch").addEventListener("submit",async e=>{
    e.preventDefault();const q=$("pickQuery").value.trim();if(!q)return;
    try{
      const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&viewbox=23.45,38.20,24.10,37.70&q="+encodeURIComponent(q+", Attique, Grèce"));
      const j=await r.json();
      if(!j.length){toast("Adresse introuvable : essaie un autre nom, ou touche la carte.");return;}
      const lat=+j[0].lat,lng=+j[0].lon;setDraft(lat,lng);map.setView([lat,lng],16);
    }catch(err){toast("Recherche impossible : touche directement la carte.");}
  });
  $("pickSave").onclick=async()=>{
    if(!pick||typeof pick.lat!=="number")return;
    const {lat,lng}=pick;
    try{
      if(pick.kind==="trip")await fs.collection("trip").doc("info").set({stayLat:lat,stayLng:lng},{merge:true});
      else await fs.collection("plans").doc(pick.id).update({lat,lng});
      toast("Lieu enregistré");
    }catch(err){toast("Enregistrement impossible, réessaie.");}
    endPick();
  };
  $("pinStay").onclick=()=>startPick({kind:"trip"},"le logement",trip.stay||"Lycabette");

  // ---------- onglets ----------
  const TABS=["programme","carte","cadeaux"];
  function showTab(name){
    if(!TABS.includes(name))name="programme";
    TABS.forEach(t=>{$("tab-"+t).hidden=t!==name;});
    document.querySelectorAll(".tab").forEach(a=>a.setAttribute("aria-selected",String(a.dataset.tab===name)));
    if(location.hash!=="#"+name)history.replaceState(null,"","#"+name);
    if(name==="carte"&&map){requestAnimationFrame(()=>{map.invalidateSize();renderMap();});setTimeout(()=>map.invalidateSize(),300);}
  }
  document.querySelectorAll(".tab").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();showTab(a.dataset.tab);window.scrollTo({top:0});}));
  window.addEventListener("hashchange",()=>showTab(location.hash.slice(1)));

  // ---------- cadeaux ----------
  let gifts=[],giftsLoaded=false,giftsError=false,giftDel=null;
  function renderGifts(){
    const box=$("giftList");box.replaceChildren();
    if(giftsError){box.append(el("div","notice warn","Impossible de charger les listes. Il faut mettre à jour les règles Firestore pour la collection « gifts »."));return;}
    if(!giftsLoaded){box.append(el("div","empty","Chargement des listes…"));return;}
    const by={};gifts.forEach(g=>{(by[g.owner||"?"]=by[g.owner||"?"]||[]).push(g);});
    const people=Object.keys(by).sort((a,b)=>a===me?-1:b===me?1:a.localeCompare(b,"fr"));
    if(!people.length){const e=el("div","empty");e.append(el("h3",null,"Aucune liste pour l'instant"),"Ajoute ta première envie avec le formulaire au-dessus, les autres feront pareil.");box.append(e);return;}
    people.forEach(person=>{
      const sec=el("section","person"),h=el("h3");
      const bub=el("span","bubble",initials(person));bub.style.setProperty("--h",hue(person));bub.style.marginLeft="0";
      h.append(bub,person===me?"Ma liste":"La liste de "+person);sec.append(h);
      by[person].sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||"")).forEach(g=>{
        const mine=person===me,taken=!!g.takenBy&&!mine;
        const c=el("article","gift"+(taken?" taken":""));
        c.append(el("div","gt",g.title||"Sans titre"));
        if(g.note)c.append(el("div","meta",g.note));
        const u=g.link&&safeUrl(g.link);if(u){const a=el("a","link","Voir le produit ↗");a.href=u;a.target="_blank";a.rel="noopener noreferrer";c.append(a);}
        const act=el("div","actions");
        if(mine){
          if(giftDel===g.id){
            const y=el("button","btn ghost small del","Confirmer la suppression");y.onclick=async()=>{giftDel=null;try{await fs.collection("gifts").doc(g.id).delete();toast("Retiré de ta liste");}catch(e){toast("Suppression impossible");}};
            const n=el("button","btn ghost small","Garder");n.onclick=()=>{giftDel=null;renderGifts();};act.append(y,n);
          }else{const d=el("button","btn ghost small del","Retirer");d.onclick=()=>{giftDel=g.id;renderGifts();};act.append(d);}
        }else if(g.takenBy){
          if(g.takenBy===me){c.append(el("div","offered","🎁 Tu l'offres"));const x=el("button","btn ghost small","Je ne l'offre plus");x.onclick=()=>setTaken(g.id,"");act.append(x);}
          else c.append(el("div","offered","🎁 Offert par "+g.takenBy));
        }else if(me){const o=el("button","btn small","🎁 Je l'offre");o.onclick=()=>setTaken(g.id,me);act.append(o);}
        if(act.children.length)c.append(act);
        sec.append(c);
      });
      box.append(sec);
    });
  }
  async function setTaken(id,who){
    try{await fs.collection("gifts").doc(id).update({takenBy:who});toast(who?"Noté, c'est toi qui l'offres 🎁":"C'est noté");}
    catch(e){console.error(e);toast("Enregistrement impossible, réessaie.");}
  }
  $("giftForm").addEventListener("submit",async ev=>{
    ev.preventDefault();if(!fs||!me)return;
    const t=$("gTitle").value.trim();if(!t)return;const lk=$("gLink").value.trim();
    $("gSubmit").disabled=true;
    try{await fs.collection("gifts").add({owner:me,title:t,link:lk&&safeUrl(lk)?lk:"",note:$("gNote").value.trim(),takenBy:"",createdAt:new Date().toISOString()});
      ["gTitle","gLink","gNote"].forEach(i=>$(i).value="");toast("Ajouté à ta liste 🎄");}
    catch(e){console.error(e);toast("Ajout impossible. Les règles Firestore sont-elles à jour ?");}
    $("gSubmit").disabled=false;
  });

  // ---------- démarrage ----------
  initMap();
  showTab(location.hash.slice(1));
  async function seedIfNew(){
    const ref=fs.collection("trip").doc("info");const s=await ref.get();
    if(s.exists)return;
    const batch=fs.batch();batch.set(ref,SEED_TRIP);
    SEED_PLANS.forEach(p=>{const {id,...d}=p;batch.set(fs.collection("plans").doc(id),Object.assign(d,{createdBy:"Julio",createdAt:new Date().toISOString(),likes:{},dislikes:{},joiners:{}}));});
    await batch.commit();
  }
  askName(false);
  if(!FIREBASE_CONFIG||typeof firebase==="undefined"){loaded=true;notice("La base de données n'est pas encore branchée : il manque la configuration Firebase en haut du fichier app.js.",true);$("openForm").disabled=true;render();return;}
  firebase.initializeApp(FIREBASE_CONFIG);fs=firebase.firestore();
  const timer=setTimeout(()=>{if(!loaded){loaded=true;notice("Le programme met du temps à charger. Vérifie ta connexion.",true);render();}},10000);
  seedIfNew().catch(e=>console.error(e)).finally(()=>{
    fs.collection("plans").onSnapshot(snap=>{clearTimeout(timer);notice("");plans=snap.docs.map(d=>Object.assign({id:d.id},d.data()));loaded=true;render();},
      err=>{clearTimeout(timer);loaded=true;notice("Impossible de charger le programme. Vérifie les règles Firestore.",true);console.error(err);render();});
    fs.collection("trip").doc("info").onSnapshot(s=>{trip=s.exists?s.data():{};renderTrip();renderMap();},()=>{});
    fs.collection("gifts").onSnapshot(snap=>{gifts=snap.docs.map(d=>Object.assign({id:d.id},d.data()));giftsLoaded=true;renderGifts();},
      err=>{console.error(err);giftsLoaded=true;giftsError=true;renderGifts();});
  });
  renderTrip();
})();
