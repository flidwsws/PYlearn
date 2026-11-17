const soundButton=document.querySelector('#sound-toggle');
const welcome=document.querySelector('#welcome-dialog');
const audio=document.querySelector('#welcome-audio');
const svg=path=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const volume=svg('<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>');
const mute=svg('<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m-6 0 6-6"/>');
function read(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(key,value);}catch{}}
let soundEnabled=read('pylearn-welcome-sound','on')!=='off';
function syncSound(){soundButton.innerHTML=soundEnabled?volume:mute;soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?'Выключить приветствие при входе':'Включить и прослушать приветствие');soundButton.title=soundEnabled?'Приветствие включено':'Приветствие выключено';}
function setSound(enabled){soundEnabled=enabled;write('pylearn-welcome-sound',enabled?'on':'off');if(!enabled){audio.pause();audio.currentTime=0;}syncSound();}
async function playGreeting(){audio.currentTime=0;audio.volume=.82;await audio.play();}
function rememberEntry(){try{sessionStorage.setItem('pylearn-entered','yes');}catch{}}
function showWelcome(){if(!welcome.open)welcome.showModal();}
function reportAudioError(){const toast=document.querySelector('#toast');toast.textContent='Не удалось включить звук. Проверь громкость и нажми кнопку звука ещё раз.';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),5000);}
document.addEventListener('click',event=>{
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='toggle-sound'){setSound(!soundEnabled);if(soundEnabled)playGreeting().catch(reportAudioError);}
  if(action==='enter-with-sound'){setSound(true);rememberEntry();welcome.close();playGreeting().catch(reportAudioError);}
  if(action==='enter-silently'){setSound(false);rememberEntry();welcome.close();}
});
welcome.addEventListener('cancel',()=>{setSound(false);rememberEntry();});
syncSound();
if(soundEnabled){
  let entered=false;try{entered=sessionStorage.getItem('pylearn-entered')==='yes';}catch{}
  if(entered)playGreeting().catch(()=>{});
  else playGreeting().then(rememberEntry).catch(showWelcome);
}
