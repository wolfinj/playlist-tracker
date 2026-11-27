// Fail closed: only explicitly allowed, verified Google users may import.
// Bounded upstream requests. A durable per-user quota counter is still required before broad public access.
export async function onRequestGet({request,env}){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 try{
  if(!env.YOUTUBE_API_KEY||!env.FIREBASE_PROJECT_ID)return json({error:'Import service not configured'},503);
  const token=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if(!token)return json({error:'Sign in first'},401);
  // Verify the Firebase ID token using Identity Toolkit lookup; the public Firebase key identifies the project.
  if(!env.FIREBASE_WEB_API_KEY)return json({error:'Firebase verification not configured'},503);
  const check=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_WEB_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
  if(!check.ok)return json({error:'Invalid session'},401);
  const account=(await check.json()).users?.[0];
  // Account lookup validates the token; additionally bind project, identity and expiry.
  const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  if(!account||account.disabled||!account.emailVerified||claims.aud!==env.FIREBASE_PROJECT_ID||claims.iss!=='https://securetoken.google.com/'+env.FIREBASE_PROJECT_ID||claims.sub!==account.localId||claims.exp<=Date.now()/1000||claims.firebase?.sign_in_provider!=='google.com')return json({error:'Invalid Google session'},401);
  const base='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents/';
  async function permission(path){const res=await fetch(base+path,{headers:{Authorization:'Bearer '+token}});if(res.status===404)return null;if(!res.ok)throw Error('Permission lookup unavailable');return res.json();}
  const email=account.email.toLowerCase();
  const [admin,grant]=await Promise.all([permission('admins/'+encodeURIComponent(account.localId)),permission('importAccess/'+encodeURIComponent(email))]);
  if(!admin&&grant?.fields?.allowed?.booleanValue!==true)return json({error:'Import access not granted. Ask an administrator.'},403);
  const id=new URL(request.url).searchParams.get('playlistId');
  if(!id||!/^[A-Za-z0-9_-]{10,150}$/.test(id))return json({error:'Invalid playlist ID'},400);
  async function yt(resource,params){const url=new URL('https://www.googleapis.com/youtube/v3/'+resource);for(const [k,v] of Object.entries({...params,key:env.YOUTUBE_API_KEY}))url.searchParams.set(k,v);const r=await fetch(url);if(!r.ok)throw Error('YouTube request failed ('+r.status+')');return r.json();}
  const meta=await yt('playlists',{part:'snippet',id});if(!meta.items?.length)return json({error:'Playlist unavailable'},404);
  const videos=[];let next='';
  for(let page=0;page<5;page++){const data=await yt('playlistItems',{part:'snippet',playlistId:id,maxResults:'50',...(next?{pageToken:next}:{})});for(const item of data.items||[]){const s=item.snippet;if(s?.resourceId?.videoId)videos.push({id:s.resourceId.videoId,title:s.title,description:(s.description||'').slice(0,500),channel:s.videoOwnerChannelTitle||s.channelTitle||''});}next=data.nextPageToken;if(!next)break;}
  if(next)return json({error:'Initial version supports up to 250 playlist entries'},413);
  return json({title:meta.items[0].snippet.title,videos});
 }catch{return json({error:'Import failed'},502);}
}
