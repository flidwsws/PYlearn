const music=document.querySelector('#focus-audio');
const greeting=document.querySelector('#welcome-audio');
const button=document.querySelector('#music-toggle');
const slider=document.querySelector('#music-volume');
const level=document.querySelector('#music-level');
const status=document.querySelector('#music-status');
const player=document.querySelector('.focus-player');
const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let volume=Math.max(0,Math.min(100,Number(read('pylearn-music-volume','28'))||0));
let wanted=read('pylearn-music-enabled','off')==='on';
let playing=false,loading=false,fadeTimer,operation=0;
const playIcon='<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>';
const pauseIcon='<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="3"/></svg>';
function targetVolume(){return volume/100*(greeting && !greeting.paused ? 0.22 : 1);}
function fadeTo(target,duration,done){
  clearInterval(fadeTimer);
  const start=performance.now(),initial=music.volume;
  fadeTimer=setInterval(()=>{
    const t=Math.min(1,(performance.now()-start)/duration);
    music.volume=Math.max(0,Math.min(1,initial+(target-initial)*t));
    if(t===1){clearInterval(fadeTimer);done?.();}
  },30);
}
function sync(){
  button.innerHTML=playing||loading?pauseIcon:playIcon;
  button.setAttribute('aria-label',playing||loading?'Поставить музыку на паузу':'Включить музыку');
  button.setAttribute('aria-pressed',String(playing));
  player.classList.toggle('is-playing',playing);
  if(loading)status.textContent='Загружаем музыку…';
  else if(playing)status.textContent=volume?'Играет · без вокала · по кругу':'Играет · громкость 0%';
  else status.textContent='Музыка для работы · на паузе';
}
async function start(){
  const id=++operation;wanted=true;loading=true;sync();
  clearInterval(fadeTimer);music.volume=0;
  try{
    await music.play();
    if(id!==operation)return;
    loading=false;playing=true;write('pylearn-music-enabled','on');sync();fadeTo(targetVolume(),700);
  }catch{
    if(id!==operation)return;
    loading=false;playing=false;wanted=false;sync();
    status.textContent=music.error?'Не удалось загрузить · попробуй ещё':'Нажми ▶, чтобы включить музыку';
  }
}
function pause(){
  ++operation;wanted=false;loading=false;playing=false;write('pylearn-music-enabled','off');sync();
  fadeTo(0,250,()=>{if(!wanted)music.pause();});
}
button.addEventListener('click',()=>wanted?pause():start());
slider.addEventListener('input',()=>{
  volume=Number(slider.value);level.value=volume+'%';write('pylearn-music-volume',String(volume));
  if(playing)fadeTo(targetVolume(),100);sync();
});
music.addEventListener('error',()=>{++operation;loading=false;playing=false;wanted=false;clearInterval(fadeTimer);sync();status.textContent='Не удалось загрузить · попробуй ещё';});
for(const event of ['play','pause','ended'])greeting?.addEventListener(event,()=>{if(playing)fadeTo(targetVolume(),400);});
slider.value=String(volume);level.value=volume+'%';music.volume=0;sync();
if(wanted)start();
