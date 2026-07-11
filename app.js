import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, limit, onSnapshot, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const CONFIG = {"apiKey": "AIzaSyDzh4etp331ytRyd3_2HQrl3pGTzKeUJ38", "authDomain": "toeic-master-8e0f1.firebaseapp.com", "projectId": "toeic-master-8e0f1", "storageBucket": "toeic-master-8e0f1.firebasestorage.app", "messagingSenderId": "2478267193", "appId": "1:2478267193:web:2d0ef78dcc6b683a7826e8"};
const ADMIN_EMAIL = "s111001@hcvs.hc.edu.tw";
const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };

let firebaseReady=false, app=null, auth=null, db=null, user=null, profile=null, online=false;
let words=await fetch("words.json").then(r=>r.json()), grammar=await fetch("grammar.json").then(r=>r.json());
let current=[], index=0, currentGrammar=null, timer=null, selected=[], locked=false, gameScore=0, gameTime=60;
const state=JSON.parse(localStorage.getItem("toeic-v6-state")||'{"xp":0,"streak":0,"lastDay":"","todayWords":0,"todayGrammar":0,"completed":[],"wrong":[],"favorite":[],"stats":{}}');

function saveLocal(){ localStorage.setItem("toeic-v6-state",JSON.stringify(state)); }
function isAdmin(){ return online && (user?.email===ADMIN_EMAIL || profile?.role==="admin"); }
function level(xp){ return Math.floor(Math.sqrt((xp||0)/80))+1; }
function errorText(e){
  const c=e?.code||"";
  if(c==="auth/api-key-not-valid") return "Firebase API Key 無效。請到 Firebase 專案設定重新複製 Web App 的 firebaseConfig。";
  if(c==="auth/unauthorized-domain") return "目前網址未加入 Firebase 已授權網域。";
  if(c==="auth/popup-blocked") return "瀏覽器封鎖登入視窗，請允許彈出視窗。";
  if(c==="auth/operation-not-allowed") return "Firebase 尚未啟用 Google 登入。";
  return `${c||"錯誤"}：${e?.message||e}`;
}
function showLoginError(e){ $("loginError").textContent=errorText(e); $("diagnosticText").textContent=JSON.stringify({code:e?.code,message:e?.message,projectId:CONFIG.projectId,authDomain:CONFIG.authDomain},null,2); }

try{
  app=initializeApp(CONFIG); auth=getAuth(app); db=getFirestore(app); firebaseReady=true;
  await setPersistence(auth,browserLocalPersistence);
  getRedirectResult(auth).catch(showLoginError);
}catch(e){ showLoginError(e); }

$("googleLogin").onclick=async()=>{
  if(!firebaseReady) return $("loginError").textContent="Firebase 尚未初始化，請先使用離線模式。";
  try{ await signInWithPopup(auth,new GoogleAuthProvider()); }
  catch(e){ showLoginError(e); if(e?.code==="auth/popup-blocked") await signInWithRedirect(auth,new GoogleAuthProvider()); }
};
$("offlineLogin").onclick=()=>enterOffline();
$("logoutBtn").onclick=async()=>{
  const button=$("logoutBtn");
  button.disabled=true;
  button.textContent="登出中…";
  try{
    if(online&&auth) await signOut(auth);
    online=false;
    user=null;
    profile=null;
    $("adminTab").classList.add("hidden");
    $("userName").textContent="尚未登入";
    $("userXp").textContent="0 XP";
    $("loginError").textContent="";
    $("diagnosticText").textContent="已登出，請重新登入或使用離線模式。";
    $("loginScreen").classList.remove("hidden");
  }catch(e){
    showLoginError(e);
    $("loginScreen").classList.remove("hidden");
  }finally{
    button.disabled=false;
    button.textContent="登出";
  }
};

if(auth) onAuthStateChanged(auth,async u=>{
  if(!u){
    online=false;
    user=null;
    profile=null;
    $("adminTab").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
    return;
  }
  try{ await enterOnline(u); }catch(e){ showLoginError(e); }
});

async function enterOnline(u){
  user=u; online=true;
  const ref=doc(db,"users",u.uid), snap=await getDoc(ref);
  if(!snap.exists()){
    profile={displayName:u.displayName||"User",email:u.email||"",xp:0,role:u.email===ADMIN_EMAIL?"admin":"user",createdAt:serverTimestamp(),lastActive:today()};
    await setDoc(ref,profile);
  }else{ profile=snap.data(); await updateDoc(ref,{lastActive:today(),displayName:u.displayName||profile.displayName}); }
  $("loginScreen").classList.add("hidden"); $("userName").textContent=profile.displayName||u.displayName||"User";
  $("userXp").textContent=`${profile.xp||0} XP`; if(isAdmin())$("adminTab").classList.remove("hidden");
  await loadCloudProgress(); await loadSharedWords(); loadRank(); loadTeams(); if(isAdmin())loadAdmin();
  initApp();
}
function enterOffline(force=false){
  online=false; user=null; profile={displayName:"離線玩家",xp:state.xp||0,role:"user"};
  $("loginScreen").classList.add("hidden"); $("userName").textContent="離線玩家"; $("userXp").textContent=`${state.xp||0} XP`;
  initApp();
}
async function loadCloudProgress(){
  const ref=doc(db,"progress",user.uid), snap=await getDoc(ref);
  if(snap.exists()) Object.assign(state,snap.data());
}
async function saveProgress(){
  saveLocal();
  if(online) await setDoc(doc(db,"progress",user.uid),state,{merge:true});
}
async function addXp(n){
  state.xp=(state.xp||0)+n; saveLocal(); $("userXp").textContent=`${state.xp} XP`;
  if(online){
    const ref=doc(db,"users",user.uid);
    await runTransaction(db,async tx=>{const s=await tx.get(ref);tx.update(ref,{xp:(s.data()?.xp||0)+n,lastActive:today()})});
    profile.xp=(profile.xp||0)+n; $("userXp").textContent=`${profile.xp} XP`;
  }
}
function initApp(){
  if(state.lastDay!==today()){state.lastDay=today();state.todayWords=0;state.todayGrammar=0;saveLocal()}
  setupFilters(); refresh(true); nextGrammar(); updateStats(); updateMission(); renderLocalRank();
}
function setupFilters(){
  $("category").innerHTML='<option value="all">全部主題</option>';
  [...new Set(words.map(w=>w.category))].sort().forEach(c=>$("category").add(new Option(c,c)));
  $("grammarCategory").innerHTML='<option value="all">全部文法</option>';
  [...new Set(grammar.map(g=>g.category))].sort().forEach(c=>$("grammarCategory").add(new Option(c,c)));
}
function wordStat(id){return state.stats[id]||{interval:0,due:today()}}
function due(w){return wordStat(w.id).due<=today()}
function refresh(random=false){
  const q=$("search").value.trim().toLowerCase(),cat=$("category").value,mode=$("studyMode").value;
  current=words.filter(w=>{
    if(q&&!w.word.toLowerCase().includes(q)&&!w.meaning.toLowerCase().includes(q))return false;
    if(cat!=="all"&&w.category!==cat)return false;
    if(mode==="wrong")return state.wrong.includes(w.id);
    if(mode==="favorite")return state.favorite.includes(w.id);
    if(mode==="review")return state.completed.includes(w.id)&&due(w);
    return true;
  }); if(random)shuffle(current); index=0; showWord();
}
function showWord(){
  const w=current[index]; if(!w){$("wordText").textContent="沒有符合的單字";return}
  $("wordCounter").textContent=`${index+1}/${current.length}`;$("wordCategory").textContent=w.category;$("wordLevel").textContent="★".repeat(w.difficulty||4)+"☆".repeat(5-(w.difficulty||4));
  $("wordText").textContent=w.word;$("phonetic").textContent=w.phonetic||"";$("pos").textContent=w.partOfSpeech||"word";$("meaning").textContent=w.meaning;
  $("example").textContent=w.example||"尚無例句";$("translation").textContent=w.exampleTranslation||"";$("favBtn").textContent=state.favorite.includes(w.id)?"★":"☆";
  $("answer").classList.add("hidden");$("ratings").classList.add("hidden");$("showBtn").classList.remove("hidden");
}
$("showBtn").onclick=()=>{$("answer").classList.remove("hidden");$("ratings").classList.remove("hidden");$("showBtn").classList.add("hidden")};
$("speakBtn").onclick=()=>{const u=new SpeechSynthesisUtterance(current[index]?.word||"");u.lang="en-US";speechSynthesis.cancel();speechSynthesis.speak(u)};
$("favBtn").onclick=async()=>{const id=current[index].id;state.favorite=state.favorite.includes(id)?state.favorite.filter(x=>x!==id):[...state.favorite,id];await saveProgress();showWord();updateStats()};
document.querySelectorAll("[data-rate]").forEach(b=>b.onclick=async()=>{
  const r=b.dataset.rate,w=current[index],s=wordStat(w.id);let days=1;
  if(r==="hard"){days=0;if(!state.wrong.includes(w.id))state.wrong.push(w.id)}
  if(r==="ok")days=Math.max(1,s.interval||1);
  if(r==="easy"){days=s.interval>=7?14:s.interval>=3?7:3;state.wrong=state.wrong.filter(x=>x!==w.id)}
  s.interval=days;const d=new Date();d.setDate(d.getDate()+days);s.due=d.toISOString().slice(0,10);state.stats[w.id]=s;
  if(!state.completed.includes(w.id))state.completed.push(w.id);state.todayWords++;await addXp(r==="easy"?3:r==="ok"?2:1);await saveProgress();updateStats();updateMission();index=(index+1)%current.length;showWord();
});
$("search").oninput=()=>refresh(false);$("category").onchange=()=>refresh(true);$("studyMode").onchange=()=>refresh(true);
function updateStats(){$("totalWords").textContent=words.length;$("learnedWords").textContent=state.completed.length;$("wrongWords").textContent=state.wrong.length;$("favWords").textContent=state.favorite.length}
function updateMission(){const w=Math.min(state.todayWords,30),g=Math.min(state.todayGrammar,10);$("missionWords").textContent=`${w}/30`;$("missionGrammar").textContent=`${g}/10`;$("missionPct").textContent=Math.round((w+g)/40*100)+"%";$("streakText").textContent=`🔥 連續學習 ${state.streak||0} 天`}

function nextGrammar(){
  const cat=$("grammarCategory").value,pool=grammar.filter(g=>cat==="all"||g.category===cat);currentGrammar=pool[Math.floor(Math.random()*pool.length)];
  $("grammarTopic").textContent=currentGrammar.category;$("grammarQuestion").textContent=currentGrammar.question;$("grammarOptions").innerHTML="";$("grammarExplain").classList.add("hidden");$("nextGrammar").classList.add("hidden");
  Object.entries(currentGrammar.options).forEach(([k,v])=>{const b=document.createElement("button");b.className="option";b.textContent=`${k}. ${v}`;b.onclick=()=>answerGrammar(k,b);$("grammarOptions").appendChild(b)});
}
async function answerGrammar(choice,b){
  if([...$("grammarOptions").children].some(x=>x.disabled))return;const ok=choice===currentGrammar.answer;
  [...$("grammarOptions").children].forEach(x=>{x.disabled=true;if(x.textContent.startsWith(currentGrammar.answer+"."))x.classList.add("correct")});if(!ok)b.classList.add("wrong");
  $("grammarExplain").innerHTML=`<b>${ok?"✅ 正確":"❌ 答錯"}</b><br>答案：${currentGrammar.answer}<br>${currentGrammar.explanation||"本題暫無詳解。"}`;$("grammarExplain").classList.remove("hidden");$("nextGrammar").classList.remove("hidden");
  state.todayGrammar++;await addXp(ok?5:1);await saveProgress();updateMission();
}
$("randomGrammar").onclick=nextGrammar;$("nextGrammar").onclick=nextGrammar;$("grammarCategory").onchange=nextGrammar;

function startGame(){
  clearInterval(timer);gameTime=60;gameScore=0;selected=[];locked=false;$("gameTime").textContent=60;$("gameScore").textContent="0 分";buildBoard();
  timer=setInterval(()=>{gameTime--;$("gameTime").textContent=gameTime;if(gameTime<=0){clearInterval(timer);finishGame()}},1000);
}
function buildBoard(){const picks=shuffle([...words]).slice(0,6),cards=[];picks.forEach(w=>{cards.push({id:w.id,text:w.word,type:"e"});cards.push({id:w.id,text:w.meaning,type:"z"})});shuffle(cards);$("matchBoard").innerHTML="";cards.forEach(c=>{const b=document.createElement("button");b.className="match-card";b.textContent=c.text;b.dataset.id=c.id;b.dataset.type=c.type;b.onclick=()=>pick(b);$("matchBoard").appendChild(b)})}
function pick(b){if(locked||b.classList.contains("selected")||b.classList.contains("matched"))return;b.classList.add("selected");selected.push(b);if(selected.length<2)return;locked=true;const[a,c]=selected,ok=a.dataset.id===c.dataset.id&&a.dataset.type!==c.dataset.type;setTimeout(()=>{if(ok){a.classList.add("matched");c.classList.add("matched");gameScore+=100;$("gameScore").textContent=gameScore+" 分";if([...document.querySelectorAll(".match-card")].every(x=>x.classList.contains("matched")))buildBoard()}else{a.classList.remove("selected");c.classList.remove("selected")}selected=[];locked=false},250)}
async function finishGame(){await addXp(Math.floor(gameScore/100));const ranks=JSON.parse(localStorage.getItem("toeic-v6-rank")||"[]");ranks.push({name:online?(profile?.displayName||"User"):"離線玩家",score:gameScore,date:Date.now()});ranks.sort((a,b)=>b.score-a.score);localStorage.setItem("toeic-v6-rank",JSON.stringify(ranks.slice(0,20)));if(online)await addDoc(collection(db,"gameScores"),{uid:user.uid,name:profile.displayName,score:gameScore,createdAt:serverTimestamp()});renderLocalRank();alert(`時間到！${gameScore} 分`)}
$("startGame").onclick=startGame;

function renderLocalRank(){const r=JSON.parse(localStorage.getItem("toeic-v6-rank")||"[]");$("rankList").innerHTML="";r.slice(0,10).forEach(x=>{const li=document.createElement("li");li.textContent=`${x.name} — ${x.score} 分`;$("rankList").appendChild(li)})}
function loadRank(){if(!online)return;onSnapshot(query(collection(db,"users"),orderBy("xp","desc"),limit(10)),s=>{$("rankList").innerHTML="";s.forEach(d=>{const x=d.data(),li=document.createElement("li");li.textContent=`${x.displayName||"User"} — ${x.xp||0} XP`;$("rankList").appendChild(li)})})}

async function loadSharedWords(){if(!online)return;const s=await getDocs(collection(db,"communityWords")),extra=[];s.forEach(d=>extra.push({id:"c_"+d.id,...d.data()}));words=[...words,...extra];renderCommunity(extra)}
function renderCommunity(arr){$("communityList").innerHTML="";arr.forEach(x=>{const d=document.createElement("div");d.className="list-row";d.innerHTML=`<div><b>${x.word}</b><p>${x.meaning}</p></div>`;$("communityList").appendChild(d)})}
$("submitBtn").onclick=async()=>{
  if(!online){$("submitMsg").textContent="投稿需要 Google 登入。";return}
  const x={word:$("submitWord").value.trim(),meaning:$("submitMeaning").value.trim(),partOfSpeech:$("submitPos").value.trim(),example:$("submitExample").value.trim(),status:"pending",submittedBy:user.uid,submittedByName:profile.displayName,createdAt:serverTimestamp()};
  if(!x.word||!x.meaning)return;$("submitMsg").textContent="送出中…";await addDoc(collection(db,"submissions"),x);$("submitMsg").textContent="已送出，等待管理員審核。";
};

const code6=()=>Math.random().toString(36).slice(2,8).toUpperCase();
$("createTeam").onclick=async()=>{if(!online)return alert("建立隊伍需要登入");const name=$("teamName").value.trim();if(!name)return;const code=code6();await setDoc(doc(db,"teams",code),{name,code,owner:user.uid,members:{[user.uid]:{name:profile.displayName,xp:profile.xp||0}},createdAt:serverTimestamp()});alert(`隊伍邀請碼：${code}`);loadTeams()};
$("joinTeam").onclick=async()=>{if(!online)return alert("加入隊伍需要登入");const code=$("teamCode").value.trim().toUpperCase(),ref=doc(db,"teams",code),s=await getDoc(ref);if(!s.exists())return alert("找不到隊伍");await updateDoc(ref,{[`members.${user.uid}`]:{name:profile.displayName,xp:profile.xp||0}});loadTeams()};
async function loadTeams(){if(!online)return;const s=await getDocs(collection(db,"teams"));$("teamList").innerHTML="";s.forEach(d=>{const x=d.data();if(!x.members?.[user.uid])return;const row=document.createElement("div");row.className="list-row";row.innerHTML=`<div><b>${x.name}</b><p>邀請碼 ${x.code}｜${Object.keys(x.members).length} 人</p></div>`;$("teamList").appendChild(row)})}

async function loadAdmin(){
  const [u,p,w]=await Promise.all([getDocs(collection(db,"users")),getDocs(query(collection(db,"submissions"),where("status","==","pending"))),getDocs(collection(db,"communityWords"))]);
  $("adminUsers").textContent=u.size;$("adminPending").textContent=p.size;$("adminShared").textContent=w.size;$("pendingList").innerHTML="";
  p.forEach(ds=>{const x=ds.data(),row=document.createElement("div");row.className="list-row";row.innerHTML=`<div><b>${x.word} — ${x.meaning}</b><p>${x.submittedByName||""}</p></div><div class="actions"><button class="approve">通過</button><button class="reject">拒絕</button></div>`;row.querySelector(".approve").onclick=()=>approve(ds.id,x);row.querySelector(".reject").onclick=()=>reject(ds.id);$("pendingList").appendChild(row)})
}
async function approve(id,x){await addDoc(collection(db,"communityWords"),{word:x.word,meaning:x.meaning,partOfSpeech:x.partOfSpeech||"",example:x.example||"",exampleTranslation:"",category:"使用者投稿",difficulty:4,createdAt:serverTimestamp()});await updateDoc(doc(db,"submissions",id),{status:"approved"});loadAdmin();loadSharedWords()}
async function reject(id){await updateDoc(doc(db,"submissions",id),{status:"rejected"});loadAdmin()}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(`${b.dataset.view}View`).classList.remove("hidden");if(b.dataset.view==="admin"&&isAdmin())loadAdmin()});
if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js");
