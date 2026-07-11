import { firebaseConfig, ADMIN_EMAIL } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously, onAuthStateChanged, signOut, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, limit, onSnapshot, serverTimestamp, runTransaction } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const $ = id => document.getElementById(id);
const code6 = () => Math.random().toString(36).slice(2,8).toUpperCase();
let user = null, profile = null, battleUnsub = null;

function show(id, yes=true){ const el=$(id); if(el) el.classList.toggle('hidden', !yes); }
function isAdmin(){ return user?.email === ADMIN_EMAIL || profile?.role === 'admin'; }
function level(xp){ return Math.floor(Math.sqrt((xp||0)/100))+1; }

async function ensureUser(u){
  const ref=doc(db,'users',u.uid), snap=await getDoc(ref);
  if(!snap.exists()){
    profile={uid:u.uid,email:u.email||'',displayName:u.displayName||`Guest-${u.uid.slice(0,5)}`,photoURL:u.photoURL||'',xp:0,role:u.email===ADMIN_EMAIL?'admin':'user',createdAt:serverTimestamp(),lastActive:new Date().toISOString()};
    await setDoc(ref,profile);
  } else {
    profile=snap.data();
    await updateDoc(ref,{lastActive:new Date().toISOString(),displayName:u.displayName||profile.displayName||'User'});
  }
  $('onlineName').textContent=profile.displayName||'User';
  $('onlineXp').textContent=`${profile.xp||0} XP`;
  $('onlineLevel').textContent=`Lv.${level(profile.xp||0)}`;
  show('adminPanel',isAdmin());
  loadLeaderboard(); loadTeams(); loadCommunity(); if(isAdmin()) loadAdmin();
}

async function addXp(points){
  if(!user||!points) return;
  const ref=doc(db,'users',user.uid);
  await runTransaction(db,async tx=>{const s=await tx.get(ref);tx.update(ref,{xp:(s.data()?.xp||0)+points});});
  profile.xp=(profile.xp||0)+points;
  $('onlineXp').textContent=`${profile.xp} XP`; $('onlineLevel').textContent=`Lv.${level(profile.xp)}`;
}
window.toeicAddXp=addXp;

function friendlyAuthError(error){
  const code=error?.code||'';
  if(code==='auth/unauthorized-domain') return '目前網址尚未加入 Firebase「已授權的網域」。請加入 juansammi.github.io。';
  if(code==='auth/popup-blocked') return '瀏覽器封鎖了登入視窗，系統將改用跳轉登入。';
  if(code==='auth/popup-closed-by-user') return '登入視窗被關閉，請再按一次登入。';
  if(code==='auth/operation-not-allowed') return 'Firebase 尚未啟用 Google 登入。';
  if(code==='auth/network-request-failed') return '網路連線失敗，請確認網路後再試。';
  return `${code||'登入失敗'}：${error?.message||'未知錯誤'}`;
}
async function googleLogin(){
  const msg=$('onlineAuthMessage');
  msg.textContent='正在開啟 Google 登入…';
  try{
    await setPersistence(auth,browserLocalPersistence);
    await signInWithPopup(auth,provider);
  }catch(error){
    msg.textContent=friendlyAuthError(error);
    if(error?.code==='auth/popup-blocked') await signInWithRedirect(auth,provider);
  }
}
$('googleOnlineLogin').onclick=googleLogin;
$('guestOnlineLogin').onclick=async()=>{
  try{await setPersistence(auth,browserLocalPersistence);await signInAnonymously(auth)}
  catch(e){$('onlineAuthMessage').textContent=friendlyAuthError(e)}
};
$('onlineLogout').onclick=()=>signOut(auth);
getRedirectResult(auth).catch(e=>$('onlineAuthMessage').textContent=friendlyAuthError(e));
onAuthStateChanged(auth,async u=>{
  if(!u){ user=null; show('onlineLoginOverlay',true); return; }
  user=u;
  $('onlineAuthMessage').textContent='登入成功，正在載入雲端資料…';
  try{
    await ensureUser(u);
    show('onlineLoginOverlay',false);
  }catch(error){
    console.error(error);
    show('onlineLoginOverlay',true);
    $('onlineAuthMessage').textContent=`已登入 Google，但 Firestore 連線失敗：${error.code||''} ${error.message||error}`;
  }
});

function loadLeaderboard(){
  onSnapshot(query(collection(db,'users'),orderBy('xp','desc'),limit(10)),snap=>{
    $('onlineLeaderboard').innerHTML=''; let rank=0;
    snap.forEach(d=>{rank++; const x=d.data(),li=document.createElement('li'); li.textContent=`${rank}. ${x.displayName||'User'} — ${x.xp||0} XP`; $('onlineLeaderboard').appendChild(li);});
  });
}

$('submitSharedWord').onclick=async()=>{
  if(!user) return;
  const data={word:$('sharedWord').value.trim(),meaning:$('sharedMeaning').value.trim(),partOfSpeech:$('sharedPos').value.trim(),example:$('sharedExample').value.trim(),status:'pending',submittedBy:user.uid,submittedByName:profile.displayName,createdAt:serverTimestamp()};
  if(!data.word||!data.meaning){$('sharedMessage').textContent='請填英文和中文';return;}
  await addDoc(collection(db,'submissions'),data); $('sharedMessage').textContent='已送出，等待管理員審核。';
};

async function loadCommunity(){
  const s=await getDocs(collection(db,'communityWords')); $('sharedWordsList').innerHTML='';
  s.forEach(d=>{const x=d.data(),row=document.createElement('div');row.className='online-row';row.innerHTML=`<strong>${x.word}</strong><span>${x.meaning}</span>`;$('sharedWordsList').appendChild(row);});
}

$('createOnlineTeam').onclick=async()=>{
  const name=$('onlineTeamName').value.trim(); if(!name)return;
  const code=code6(); await setDoc(doc(db,'teams',code),{code,name,ownerUid:user.uid,members:{[user.uid]:{name:profile.displayName,xp:profile.xp||0}},createdAt:serverTimestamp()});
  alert(`隊伍建立完成，邀請碼：${code}`); loadTeams();
};
$('joinOnlineTeam').onclick=async()=>{
  const code=$('onlineTeamCode').value.trim().toUpperCase(),ref=doc(db,'teams',code),s=await getDoc(ref); if(!s.exists()) return alert('找不到隊伍');
  await updateDoc(ref,{[`members.${user.uid}`]:{name:profile.displayName,xp:profile.xp||0}}); loadTeams();
};
async function loadTeams(){
  if(!user)return; const s=await getDocs(collection(db,'teams')); $('onlineTeamsList').innerHTML='';
  s.forEach(d=>{const x=d.data(); if(!x.members?.[user.uid])return; const row=document.createElement('div');row.className='online-row';row.innerHTML=`<strong>${x.name}</strong><span>邀請碼 ${x.code}｜${Object.keys(x.members).length} 人</span>`;$('onlineTeamsList').appendChild(row);});
}

$('createBattleRoom').onclick=async()=>{
  const code=code6(); await setDoc(doc(db,'battleRooms',code),{code,hostUid:user.uid,status:'waiting',current:0,questionIds:[],players:{[user.uid]:{name:profile.displayName,score:0}},createdAt:serverTimestamp()}); listenBattle(code);
};
$('joinBattleRoom').onclick=async()=>{
  const code=$('battleRoomInput').value.trim().toUpperCase(),ref=doc(db,'battleRooms',code),s=await getDoc(ref); if(!s.exists()) return alert('找不到房間');
  await updateDoc(ref,{[`players.${user.uid}`]:{name:profile.displayName,score:0}}); listenBattle(code);
};
function listenBattle(code){
  $('battleRoomCodeDisplay').textContent=code; show('onlineBattleLobby',true); if(battleUnsub)battleUnsub();
  battleUnsub=onSnapshot(doc(db,'battleRooms',code),s=>{if(!s.exists())return; const r=s.data(); $('onlineBattlePlayers').innerHTML=''; Object.values(r.players||{}).forEach(p=>{const d=document.createElement('div');d.className='online-row';d.innerHTML=`<strong>${p.name}</strong><span>${p.score||0} 分</span>`;$('onlineBattlePlayers').appendChild(d);});});
}

async function loadAdmin(){
  const [users,pending,words,battles]=await Promise.all([getDocs(collection(db,'users')),getDocs(query(collection(db,'submissions'),where('status','==','pending'))),getDocs(collection(db,'communityWords')),getDocs(collection(db,'battleRooms'))]);
  $('adminUserCount').textContent=users.size; $('adminPendingCount').textContent=pending.size; $('adminWordCount').textContent=words.size; $('adminBattleCount').textContent=battles.size;
  $('adminPendingList').innerHTML='';
  pending.forEach(ds=>{const x=ds.data(),row=document.createElement('div');row.className='admin-submission';row.innerHTML=`<div><strong>${x.word} — ${x.meaning}</strong><p>投稿：${x.submittedByName||x.submittedBy}</p></div><div><button class="approve-btn">通過</button><button class="reject-btn">拒絕</button></div>`;row.querySelector('.approve-btn').onclick=async()=>{await addDoc(collection(db,'communityWords'),{word:x.word,meaning:x.meaning,partOfSpeech:x.partOfSpeech||'',example:x.example||'',category:'使用者投稿',difficulty:4,approvedBy:user.uid,createdAt:serverTimestamp()});await updateDoc(doc(db,'submissions',ds.id),{status:'approved'});loadAdmin();loadCommunity();};row.querySelector('.reject-btn').onclick=async()=>{await updateDoc(doc(db,'submissions',ds.id),{status:'rejected'});loadAdmin();};$('adminPendingList').appendChild(row);});
}
