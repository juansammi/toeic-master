const KEYS={progress:"toeicMasterProgressV1",grammar:"toeicMasterGrammarV3",theme:"toeicMasterThemeV1"};
const DAILY_GOAL=30;
let words=[],grammar=[],currentWords=[],currentIndex=0,currentMode="all",searchTerm="",selectedCategory="all",selectedLevel="all",currentQuestion=null;
let progress=load(KEYS.progress,defaultProgress()),grammarProgress=load(KEYS.grammar,{answered:0,correct:0,wrong:[]});
const $=id=>document.getElementById(id);
const el={
word:$("englishWord"),phonetic:$("phonetic"),pos:$("partOfSpeech"),meaning:$("meaning"),example:$("example"),translation:$("exampleTranslation"),
number:$("wordNumber"),prompt:$("promptArea"),answer:$("answerArea"),rating:$("ratingArea"),show:$("showAnswerButton"),speak:$("speakButton"),
favorite:$("favoriteButton"),status:$("statusMessage"),today:$("todayCount"),goal:$("goalCount"),completed:$("completedCount"),total:$("totalCount"),
wrong:$("wrongCount"),progressText:$("progressText"),progressBar:$("progressBar"),search:$("searchInput"),category:$("categorySelect"),level:$("levelSelect"),
categoryBadge:$("categoryBadge"),star:$("starLevel"),theme:$("themeButton"),export:$("exportButton"),
grammarCategory:$("grammarCategory"),grammarQuestion:$("grammarQuestion"),grammarTopic:$("grammarTopic"),grammarOptions:$("grammarOptions"),
grammarFeedback:$("grammarFeedback"),grammarAnswered:$("grammarAnswered"),grammarCorrect:$("grammarCorrect"),grammarAccuracy:$("grammarAccuracy")
};
function defaultProgress(){return{todayDate:localDate(),todayCount:0,completedIds:[],wrongIds:[],favoriteIds:[],wordStats:{}}}
function load(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v&&typeof v==="object"?{...d,...v}:d}catch{return d}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function localDate(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return`${y}-${m}-${day}`}
function addUnique(a,v){if(!a.includes(v))a.push(v)}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}
function getStat(id){return progress.wordStats[id]||{intervalDays:0,dueDate:localDate(),lastRating:null,seen:0}}
function isDue(w){return getStat(w.id).dueDate<=localDate()}
function checkDay(){if(progress.todayDate!==localDate()){progress.todayDate=localDate();progress.todayCount=0;save(KEYS.progress,progress)}}
async function start(){
 applyTheme();checkDay();
 [words,grammar]=await Promise.all([fetch("words.json").then(r=>r.json()),fetch("grammar.json").then(r=>r.json())]);
 [...new Set(words.map(w=>w.category))].sort().forEach(c=>el.category.add(new Option(`${c} (${words.filter(w=>w.category===c).length})`,c)));
 [...new Set(grammar.map(q=>q.category))].sort().forEach(c=>el.grammarCategory.add(new Option(c,c)));
 refresh(true);updateStats();updateGrammarStats();nextQuestion();
}
function refresh(random=false){
 const s=searchTerm.toLowerCase();
 currentWords=words.filter(w=>{
  const match=!s||w.word.toLowerCase().includes(s)||w.meaning.toLowerCase().includes(s);
  if(!match)return false;
  if(selectedCategory!=="all"&&w.category!==selectedCategory)return false;
  if(selectedLevel!=="all"&&String(w.difficulty)!==selectedLevel)return false;
  if(currentMode==="wrong")return progress.wrongIds.includes(w.id);
  if(currentMode==="favorite")return progress.favoriteIds.includes(w.id);
  if(currentMode==="review")return progress.completedIds.includes(w.id)&&isDue(w);
  return true;
 });
 if(random)shuffle(currentWords);
 currentIndex=Math.min(currentIndex,Math.max(0,currentWords.length-1));displayWord();
}
function displayWord(){
 el.status.textContent="";
 if(!currentWords.length){el.number.textContent="";el.word.textContent="目前沒有符合的單字";el.phonetic.textContent="";el.categoryBadge.textContent="";el.star.textContent="";el.prompt.textContent="請調整分類、星級或搜尋條件。";el.prompt.classList.remove("hidden");el.answer.classList.add("hidden");el.rating.classList.add("hidden");el.show.classList.add("hidden");return}
 const w=currentWords[currentIndex];
 el.number.textContent=`第 ${currentIndex+1} 個，共 ${currentWords.length} 個`;
 el.word.textContent=w.word;el.phonetic.textContent=w.phonetic||"";el.pos.textContent=w.partOfSpeech||"word";el.meaning.textContent=w.meaning;
 el.example.textContent=w.example||"此單字目前沒有例句。";el.translation.textContent=w.exampleTranslation||"";
 el.categoryBadge.textContent=w.category;el.star.textContent="★".repeat(w.difficulty)+"☆".repeat(5-w.difficulty);
 el.favorite.textContent=progress.favoriteIds.includes(w.id)?"★":"☆";
 el.prompt.textContent="先在心裡想想這個單字的意思";el.prompt.classList.remove("hidden");el.answer.classList.add("hidden");el.rating.classList.add("hidden");el.show.classList.remove("hidden");
}
function showAnswer(){if(!currentWords.length)return;el.prompt.classList.add("hidden");el.answer.classList.remove("hidden");el.rating.classList.remove("hidden");el.show.classList.add("hidden")}
function speak(){if(!currentWords.length)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(currentWords[currentIndex].word);u.lang="en-US";u.rate=.85;speechSynthesis.speak(u)}
function rate(r){
 if(!currentWords.length)return;checkDay();const w=currentWords[currentIndex],st=getStat(w.id);st.seen++;st.lastRating=r;let days=1;
 if(r==="difficult"){days=0;st.intervalDays=0;addUnique(progress.wrongIds,w.id)}
 else if(r==="normal"){days=Math.max(1,st.intervalDays||1);st.intervalDays=days}
 else{days=st.intervalDays>=7?14:st.intervalDays>=3?7:3;st.intervalDays=days;progress.wrongIds=progress.wrongIds.filter(id=>id!==w.id)}
 const due=new Date();due.setDate(due.getDate()+days);st.dueDate=localDate(due);progress.wordStats[w.id]=st;addUnique(progress.completedIds,w.id);progress.todayCount++;
 save(KEYS.progress,progress);updateStats();el.status.textContent=r==="difficult"?"已加入錯題。":r==="normal"?"明天再複習。":`很好！${days} 天後再複習。`;
 setTimeout(()=>{if(currentMode==="all"){currentIndex=(currentIndex+1)%currentWords.length;displayWord()}else refresh(false)},300);
}
function toggleFavorite(){if(!currentWords.length)return;const id=currentWords[currentIndex].id;progress.favoriteIds=progress.favoriteIds.includes(id)?progress.favoriteIds.filter(x=>x!==id):[...progress.favoriteIds,id];save(KEYS.progress,progress);displayWord()}
function updateStats(){checkDay();const valid=new Set(words.map(w=>w.id)),completed=progress.completedIds.filter(id=>valid.has(id)).length,total=words.length,p=total?Math.round(completed/total*100):0;el.today.textContent=progress.todayCount;el.goal.textContent=Math.min(progress.todayCount,DAILY_GOAL);el.completed.textContent=completed;el.total.textContent=total;el.wrong.textContent=progress.wrongIds.filter(id=>valid.has(id)).length;el.progressText.textContent=p+"%";el.progressBar.style.width=p+"%"}
function nextQuestion(){const cat=el.grammarCategory.value,pool=grammar.filter(q=>cat==="all"||q.category===cat);currentQuestion=pool[Math.floor(Math.random()*pool.length)];if(!currentQuestion)return;el.grammarTopic.textContent=currentQuestion.category;el.grammarQuestion.textContent=currentQuestion.question;el.grammarFeedback.classList.add("hidden");el.grammarOptions.innerHTML="";Object.entries(currentQuestion.options).forEach(([k,v])=>{const b=document.createElement("button");b.className="option-button";b.textContent=`${k}. ${v}`;b.onclick=()=>answerQuestion(k,b);el.grammarOptions.appendChild(b)})}
function answerQuestion(choice,button){if([...el.grammarOptions.children].some(b=>b.disabled))return;grammarProgress.answered++;const ok=choice===currentQuestion.answer;if(ok)grammarProgress.correct++;else addUnique(grammarProgress.wrong,`${currentQuestion.category}-${currentQuestion.number}`);[...el.grammarOptions.children].forEach(b=>{b.disabled=true;if(b.textContent.startsWith(currentQuestion.answer+"."))b.classList.add("correct")});if(!ok)button.classList.add("wrong");el.grammarFeedback.innerHTML=`<strong>${ok?"✅ 正確":"❌ 答錯"}</strong><br>正確答案：${currentQuestion.answer}<br>${currentQuestion.explanation}`;el.grammarFeedback.classList.remove("hidden");save(KEYS.grammar,grammarProgress);updateGrammarStats()}
function updateGrammarStats(){el.grammarAnswered.textContent=grammarProgress.answered;el.grammarCorrect.textContent=grammarProgress.correct;el.grammarAccuracy.textContent=(grammarProgress.answered?Math.round(grammarProgress.correct/grammarProgress.answered*100):0)+"%"}
function applyTheme(){if(localStorage.getItem(KEYS.theme)==="dark")document.body.classList.add("dark");el.theme.textContent=document.body.classList.contains("dark")?"淺色模式":"深色模式"}
function exportProgress(){const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),progress,grammarProgress},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`toeic-master-progress-${localDate()}.json`;a.click();URL.revokeObjectURL(a.href)}
document.querySelectorAll(".nav-button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("vocabView").classList.toggle("hidden",b.dataset.view!=="vocab");$("grammarView").classList.toggle("hidden",b.dataset.view!=="grammar")});
document.querySelectorAll(".mode-button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".mode-button").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentMode=b.dataset.mode;currentIndex=0;refresh(currentMode==="all")});
document.querySelectorAll(".rating-button").forEach(b=>b.onclick=()=>rate(b.dataset.rating));
el.show.onclick=showAnswer;el.speak.onclick=speak;el.favorite.onclick=toggleFavorite;
el.search.oninput=e=>{searchTerm=e.target.value.trim();currentIndex=0;refresh(false)};
el.category.onchange=e=>{selectedCategory=e.target.value;currentIndex=0;refresh(true)};
el.level.onchange=e=>{selectedLevel=e.target.value;currentIndex=0;refresh(true)};
el.grammarCategory.onchange=nextQuestion;$("newQuestionButton").onclick=nextQuestion;
el.theme.onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem(KEYS.theme,document.body.classList.contains("dark")?"dark":"light");applyTheme()};
$("resetButton").onclick=()=>{if(confirm("確定刪除所有單字與文法進度嗎？")){localStorage.removeItem(KEYS.progress);localStorage.removeItem(KEYS.grammar);location.reload()}};
el.export.onclick=exportProgress;
document.addEventListener("keydown",ev=>{if(ev.target.matches("input,select"))return;if(ev.code==="Space"){ev.preventDefault();showAnswer()}if(!el.rating.classList.contains("hidden")){if(ev.key==="1")rate("difficult");if(ev.key==="2")rate("normal");if(ev.key==="3")rate("easy")}});
start();
