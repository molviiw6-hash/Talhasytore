/* Talha'w add-on: Supabase data + admin-only posting + video tab with product tags */
(()=>{
const SB_URL='https://mycoxbfbgshwzpnjelfk.supabase.co',
SB_KEY='sb_publishable_xoxu18hXyXTM0qoQ0yRzuA_zVuhVKgw',
ADMIN_UID='7459cfcd-ef91-4d4c-b2cd-5f6d63289f70',
BUCKET='media'; /* storage bucket ka naam */
const sb=supabase.createClient(SB_URL,SB_KEY);
let ADMIN=false,LOADED=false,SY={},busy=0,pend=0,warned=0,VDB=[];
const YT=[...vids];
const sid=x=>String(x??'').replace(/[^\w-]/g,'').slice(0,40);
const route=()=>(location.hash.slice(2)||'home').split('/')[0];
const PUBR=['home','search','videos','carts','payments','blog','p','admin'];
NM.admin='Admin';

/* viewers: no menu, no dashboard link */
document.head.insertAdjacentHTML('beforeend','<style>body:not(.adm-on) .top{display:none!important}body:not(.adm-on),body:not(.adm-on).st{padding-top:0!important}body:not(.adm-on) .adm{display:none}</style>');
const setAdmin=s=>{ADMIN=!!(s&&s.user&&s.user.id===ADMIN_UID);document.body.classList.toggle('adm-on',ADMIN)};

/* ---------- storage upload ---------- */
async function up(f,dir){
  const path=`${dir}/${Date.now()}_${f.name.replace(/[^\w.\-]/g,'_')}`;
  const {error}=await sb.storage.from(BUCKET).upload(path,f,{contentType:f.type,upsert:false});
  if(error){alert('Upload error: '+error.message);return null}
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}

/* ---------- load shared data ---------- */
async function loadAll(first){
  const {data,error}=await sb.from('items').select('id,kind,data').order('created',{ascending:false}).limit(1000);
  if(error){console.warn(error.message);LOADED=true;refresh();return}
  const P=[],C=[],PR=[],VV=[];
  data.forEach(r=>{const d=r.data||{};
    if(r.kind=='post')P.push({...d,id:sid(r.id.slice(5)),type:d.type=='page'?'page':'post',views:{}});
    else if(r.kind=='comment')C.push({id:sid(r.id.slice(2)),pid:sid(d.pid),name:String(d.name||'').slice(0,60),text:String(d.text||'').slice(0,1000),date:/^\d{4}-\d\d-\d\d$/.test(d.date)?d.date:td(),ok:1});
    else if(r.kind=='product')PR.push({id:Number(d.id)||0,n:String(d.n||''),c:d.c=='apk'?'apk':'electrical',p:Number(d.p)||0,img:d.img||PH,rid:r.id});
    else if(r.kind=='video')VV.push({rid:r.id,t:String(d.t||''),url:String(d.url||''),pid:Number(d.pid)||0})});
  if(!/^#\/edit\//.test(location.hash)){
    const keepLocal=ADMIN&&!P.length; /* pehli dafa: local posts upload honge */
    SY={};
    if(!keepLocal){S.posts=P;S.comments=C;
      S.posts.forEach(p=>SY['post_'+p.id]=JSON.stringify({...p,views:{}}));
      S.comments.forEach(c=>SY['c_'+c.id]=JSON.stringify(c))}}
  prods=PR;VDB=VV;LOADED=true;
  first?render():refresh();
  if(ADMIN)syncAdmin()}

function refresh(){
  if(!q('homeP'))return;
  show(prods,'homeP');searchNow();showV();
  if(route()=='blog'){const y=scrollY;render();scrollTo(0,y)}}

/* ---------- admin: push posts/comments to Supabase ---------- */
async function syncAdmin(){
  if(!ADMIN)return;if(busy){pend=1;return}busy=1;
  try{
    const cur={};
    S.posts.forEach(p=>cur['post_'+sid(p.id)]=['post',{...p,views:{}}]);
    S.comments.forEach(c=>cur['c_'+sid(c.id)]=['comment',c]);
    const upl=[],del=[];
    for(const id in cur){const s=JSON.stringify(cur[id][1]);if(SY[id]!==s)upl.push({id,kind:cur[id][0],data:cur[id][1],s})}
    for(const id in SY)if(!cur[id])del.push(id);
    if(upl.length){const {error}=await sb.from('items').upsert(upl.map(({s,...r})=>r));if(error)throw error;upl.forEach(u=>SY[u.id]=u.s)}
    if(del.length){const {error}=await sb.from('items').delete().in('id',del);if(error)throw error;del.forEach(i=>delete SY[i])}
  }catch(e){if(!warned){warned=1;alert('Sync error: '+(e.message||e))}}
  busy=0;if(pend){pend=0;syncAdmin()}}

/* ---------- router guard ---------- */
const _render=render;
removeEventListener('hashchange',_render);
render=function(){
  const r=route();
  if(!ADMIN&&!PUBR.includes(r)){location.hash='#/home';return}
  _render();
  if(r=='blog'||r=='p')q('m').insertAdjacentHTML('afterbegin',`<a class="chip" href="#/home" style="margin:6px 0 10px">← Talha'w Home</a>`);
  if(ADMIN)syncAdmin()};
addEventListener('hashchange',render);

/* ---------- admin login page: yoursite/#/admin ---------- */
V.admin=()=>ADMIN
 ?`<div class="card" style="margin-top:20px"><h3>Admin</h3><p class="mu">Login ho gaya.</p><div class="row"><button class="btn" onclick="location.hash='#/posts'">Dashboard</button><button class="chip" onclick="alogout()">Logout</button></div></div>`
 :`<div class="card" style="margin-top:40px"><h3>Admin login</h3><input id="ae" class="in" type="email" placeholder="Email"><input id="ap" class="in" type="password" placeholder="Password"><button class="btn" onclick="alogin()">Login</button><p id="am2" class="mu"></p></div>`;
window.alogin=async()=>{
  const m=q('am2');m.textContent='Wait...';
  const {data,error}=await sb.auth.signInWithPassword({email:q('ae').value.trim(),password:q('ap').value});
  if(error){m.textContent=error.message;return}
  if(data.user.id!==ADMIN_UID){await sb.auth.signOut();m.textContent='Yeh admin account nahi hai';return}
  setAdmin(data.session);await loadAll();location.hash='#/posts'};
window.alogout=async()=>{await sb.auth.signOut();setAdmin(null);location.hash='#/home';loadAll()};
sb.auth.onAuthStateChange((e,s)=>{if(e=='SIGNED_OUT')setAdmin(null)});

/* ---------- viewers: comments go to Supabase ---------- */
window.pc=async id=>{
  const n=q('cn').value.trim().slice(0,60),t=q('ct').value.trim().slice(0,1000);
  if(!n||!t)return alert('Add your name and comment');
  const c={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),pid:sid(id),name:n,text:t,date:td(),ok:1};
  const {error}=await sb.from('items').insert({id:'c_'+c.id,kind:'comment',data:c});
  if(error)return alert('Comment nahi gaya: '+error.message);
  SY['c_'+c.id]=JSON.stringify(c);S.comments.unshift(c);render()};

/* ---------- editor: images/videos go to Storage ---------- */
window.gfile=async(i,k)=>{
  const f=i.files[0];i.value='';if(!f||M)return;
  if(!ADMIN)return alert('Pehle admin login karo');
  const sel=getSelection(),rg=sel.rangeCount?sel.getRangeAt(0).cloneRange():null,gs=q('gs');
  if(gs)gs.textContent='Uploading...';
  const url=await up(f,k=='img'?'img':'vid');
  if(!url){if(gs)gs.textContent='Upload fail';return}
  q('ed').focus();if(rg){sel.removeAllRanges();sel.addRange(rg)}
  document.execCommand(k=='img'?'insertImage':'insertHTML',false,k=='img'?url:`<br><video controls playsinline src="${url}"></video><br>`);
  if(gs)gs.textContent='';gauto()};

/* ---------- home tab: products + posts ---------- */
const postCards=()=>{
  if(!LOADED)return '<div class="mu" style="text-align:center;padding:14px">Loading...</div>';
  const L=S.posts.filter(p=>p.type=='post'&&!p.draft).slice(0,20);
  return L.length?'<h3 style="margin:16px 0 6px">Posts</h3>'+L.map(p=>{
    const m=/<img[^>]+src=["']([^"']+)["']/i.exec(p.html||'');
    return `<a class="pcard" style="color:#fff" href="#/p/${esc(p.id)}">${m?`<img src="${esc(m[1])}">`:''}<div><b>${esc(p.title)}</b><br><small>${fmt(p.date)}</small><br><small>${esc(strip(p.html||'').slice(0,90))}</small></div></a>`}).join(''):''};
show=function(list,id){
  let h='';
  if(id=='homeP'&&ADMIN)h+=`<div class="row" style="margin-top:8px"><button class="pbtn" onclick="openProd()">＋ Product</button><button class="pbtn" onclick="location.hash='#/edit/new-post'">＋ Post</button></div>`;
  list.forEach(o=>{const a=cart.find(x=>x.id==o.id);
    h+=`<div class="pcard ${a?'active':''}"><img src="${esc(o.img||PH)}" id="img-${id}-${o.id}"><div style="flex:1"><b>${esc(o.n)}</b><br><small>${esc(o.c)}</small><br><b style="color:#ff6b6b">Rs.${o.p}</b><br><button class="pbtn ${a?'done':''}" onclick="add(${o.id},'${id}')">${a?'✓ Added':'Add to Cart'}</button>${ADMIN?` <button class="pbtn" onclick="adel('${o.rid}')">Delete</button>`:''}</div></div>`});
  if(!list.length&&id!='homeP')h+=`<div style="text-align:center;padding:20px;color:#aaa">Kuch nahi mila, dusra lafz try karo</div>`;
  if(id=='homeP')h+=postCards();
  q(id).innerHTML=h};

/* ---------- videos tab ---------- */
showV=function(){
  const L=q('vList');if(!L)return;
  let h=ADMIN?`<button class="btn-red" style="margin-bottom:6px" onclick="openVid()">＋ Upload video</button>`:'';
  h+=VDB.map(v=>{
    const p=prods.find(x=>x.id==v.pid),a=p&&cart.find(x=>x.id==p.id);
    return `<div class="pcard" style="display:block"><b>${esc(v.t)}</b><video controls playsinline preload="metadata" src="${esc(v.url)}" style="width:100%;border-radius:10px;margin-top:8px;background:#000"></video>`+
    (p?`<div style="display:flex;gap:10px;align-items:center;margin-top:10px"><img src="${esc(p.img||PH)}" style="width:50px;height:50px"><div style="flex:1"><b>${esc(p.n)}</b><br><b style="color:#ff6b6b">Rs.${p.p}</b></div><button class="pbtn ${a?'done':''}" onclick="add(${p.id},'v')">${a?'✓ Added':'Add to Cart'}</button></div>`:'')+
    (ADMIN?`<button class="pbtn" onclick="adel('${v.rid}')">Delete video</button>`:'')+`</div>`}).join('');
  h+=YT.map(v=>`<div class="pcard" onclick="window.open('${v.l}','_blank')"><img src="${PH}"><div><b>${v.t}</b><br><small>Open YouTube</small></div></div>`).join('');
  L.innerHTML=h};
const _u=updateAll;updateAll=function(){_u();showV()};

/* ---------- admin forms ---------- */
const amodal=h=>{let m=q('am');if(!m){m=document.createElement('div');m.id='am';m.className='g-modal';m.style.zIndex=100000;m.onclick=e=>{if(e.target==m)aclose()};document.body.appendChild(m)}m.innerHTML=`<div class="g-mb">${h}</div>`;m.classList.add('show')};
const aclose=()=>{const m=q('am');if(m)m.classList.remove('show')};
const amsg=t=>{const e=q('amsg');if(e)e.textContent=t};

window.openProd=()=>amodal(`<h3 style="margin-bottom:10px">New product</h3><input id="pn" class="in" placeholder="Name"><select id="pc" class="in"><option value="electrical">Electrical</option><option value="apk">APK</option></select><input id="pp" class="in" type="number" placeholder="Price (Rs)"><small>Image (optional)</small><input id="pf" class="in" type="file" accept="image/*"><button class="btn" style="width:100%" onclick="saveProd(this)">Save</button><p id="amsg" class="mu"></p>`);
window.saveProd=async b=>{
  const n=q('pn').value.trim();if(!n)return alert('Name likho');
  b.disabled=true;amsg('Saving...');
  let img='';const f=q('pf').files[0];
  if(f){img=await up(f,'img');if(!img){b.disabled=false;amsg('Upload fail');return}}
  const id=Date.now();
  const {error}=await sb.from('items').insert({id:'pr_'+id,kind:'product',data:{id,n,c:q('pc').value,p:+q('pp').value||0,img}});
  if(error){amsg(error.message);b.disabled=false;return}
  aclose();await loadAll()};

window.openVid=()=>amodal(`<h3 style="margin-bottom:10px">Upload video</h3><input id="vt" class="in" placeholder="Title"><input id="vf" class="in" type="file" accept="video/*"><small>Tag product (optional)</small><select id="vp" class="in"><option value="0">No product</option>${prods.map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join('')}</select><button class="btn" style="width:100%" onclick="saveVid(this)">Upload</button><p id="amsg" class="mu"></p>`);
window.saveVid=async b=>{
  const t=q('vt').value.trim(),f=q('vf').files[0];
  if(!t||!f)return alert('Title aur video chunein');
  b.disabled=true;amsg('Upload ho raha hai, wait karein...');
  const url=await up(f,'videos');
  if(!url){b.disabled=false;amsg('Upload fail');return}
  const id=Date.now();
  const {error}=await sb.from('items').insert({id:'vid_'+id,kind:'video',data:{t,url,pid:+q('vp').value||0}});
  if(error){amsg(error.message);b.disabled=false;return}
  aclose();await loadAll();location.hash='#/videos'};

window.adel=async rid=>{
  if(!ADMIN||!confirm('Delete karna hai?'))return;
  const {error}=await sb.from('items').delete().eq('id',rid);
  if(error)return alert(error.message);
  await loadAll()};

document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadAll()});

/* ---------- start ---------- */
(async()=>{const {data}=await sb.auth.getSession();setAdmin(data.session);await loadAll(true)})();
})();
