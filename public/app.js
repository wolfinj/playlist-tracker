import {firebaseConfig} from './config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,doc,setDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const status=s=>{$('status').textContent=s;};
if(!firebaseConfig.projectId){status('Configure Firebase in public/config.js before signing in.');$('login').disabled=true;}
else {
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
let user=null,lists=[],reviews={},active=null,unsub=[],player=null,playerGeneration=0;
const ratings=['Unrated','Skip','Not for me','OK','Worth watching','Recommend'];
const report=e=>status(e.message||String(e));
const run=fn=>async()=>{try{await fn();}catch(e){report(e);}};
$('login').onclick=run(()=>signInWithPopup(auth,new GoogleAuthProvider()));
$('logout').onclick=run(()=>signOut(auth));
const ref=(type,id)=>doc(db,'users',user.uid,type,id);
function stopPlayer(){playerGeneration++;if(player){player.destroy();player=null;}$('player').replaceChildren();}
onAuthStateChanged(auth,u=>{unsub.forEach(f=>f());unsub=[];stopPlayer();user=u;lists=[];reviews={};active=null;$('review').hidden=true;$('title').textContent='Select a video';$('description').textContent='';$('link').removeAttribute('href');$('link').textContent='';$('workspace').hidden=!u;$('login').hidden=!!u;$('logout').hidden=!u;$('account').textContent=u?.email||'Not signed in';if(!u)return;unsub.push(onSnapshot(collection(db,'users',u.uid,'playlists'),s=>{lists=s.docs.map(d=>({id:d.id,...d.data()}));renderLists();},report),onSnapshot(collection(db,'users',u.uid,'reviews'),s=>{reviews=Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));renderVideos();},report));});
function renderLists(){const old=$('playlists').value;$('playlists').replaceChildren(...lists.map(l=>new Option(l.title,l.id)));if(lists.some(l=>l.id===old))$('playlists').value=old;renderVideos();}
function renderVideos(){const list=lists.find(l=>l.id===$('playlists').value),videos=list?.videos||[],q=$('search').value.toLowerCase();$('progress').textContent=videos.filter(v=>reviews[v.id]?.watched).length+' / '+videos.length+' watched';$('videos').replaceChildren(...videos.filter(v=>v.title.toLowerCase().includes(q)).map(v=>{const b=document.createElement('button');b.className='video'+(active?.id===v.id?' active':'');b.textContent=(reviews[v.id]?.watched?'✓ ':'')+v.title+' · '+ratings[reviews[v.id]?.rating||0];b.onclick=()=>openVideo(v);return b;}));}
$('playlists').onchange=renderVideos;$('search').oninput=renderVideos;
let ready;
function youtubeReady(){if(window.YT?.Player)return Promise.resolve();if(!ready)ready=new Promise((resolve,reject)=>{window.onYouTubeIframeAPIReady=resolve;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=reject;document.head.append(s);});return ready;}
async function openVideo(v){stopPlayer();active=v;const gen=playerGeneration,uid=user.uid,r=reviews[v.id]||{};$('title').textContent=v.title;$('description').textContent=v.description||'';$('link').href='https://www.youtube.com/watch?v='+v.id;$('link').textContent='Open on YouTube';$('watched').checked=!!r.watched;$('rating').value=r.rating||0;$('comment').value=r.comment||'';$('review').hidden=false;renderVideos();try{await youtubeReady();if(gen!==playerGeneration||user?.uid!==uid)return;const host=document.createElement('div');$('player').append(host);player=new YT.Player(host,{videoId:v.id,playerVars:{origin:location.origin},events:{onStateChange:e=>{if(e.data===YT.PlayerState.ENDED&&gen===playerGeneration&&user?.uid===uid){$('watched').checked=true;setDoc(ref('reviews',v.id),{watched:true,updatedAt:serverTimestamp()},{merge:true}).then(()=>status('Watched. Add your rating or comment.')).catch(report);}}}});}catch(e){report(e);}}
$('saveReview').onclick=run(async()=>{if(!active||!user)return;await setDoc(ref('reviews',active.id),{watched:$('watched').checked,rating:Number($('rating').value),comment:$('comment').value,updatedAt:serverTimestamp()},{merge:true});status('Review saved');});
$('add').onclick=()=>$('importDialog').showModal();$('cancelImport').onclick=()=>$('importDialog').close();
$('importForm').onsubmit=async e=>{e.preventDefault();try{const input=$('playlistUrl').value.trim();let id=input;try{id=new URL(input).searchParams.get('list')||'';}catch{}if(!/^[A-Za-z0-9_-]{10,150}$/.test(id))throw Error('Invalid playlist ID');const uid=user.uid,token=await user.getIdToken();status('Importing…');const response=await fetch('/api/playlists?playlistId='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token}});const data=await response.json();if(!response.ok)throw Error(data.error||'Import failed');if(user?.uid!==uid)return;await setDoc(ref('playlists',id),{title:data.title,videos:data.videos,updatedAt:serverTimestamp()});$('importDialog').close();status('Imported '+data.videos.length+' videos');}catch(e){report(e);}};
}
