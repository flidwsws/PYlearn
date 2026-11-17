const html=document.documentElement;
const themeButton=document.querySelector('#theme-toggle');
const soundButton=document.querySelector('#sound-toggle');
const welcome=document.querySelector('#welcome-dialog');
const audio=document.querySelector('#welcome-audio');
const svg=path=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const sun=svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>');
const moon=svg('<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>');
const volume=svg('<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>');
const mute=svg('<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m-6 0 6-6"/>');
function read(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(key,value);}catch{}}
let soundEnabled=read('pylearn-welcome-sound','on')!=='off';
function syncTheme(){const dark=html.dataset.theme==='dark';html.style.colorScheme=dark?'dark':'light';themeButton.innerHTML=dark?sun:moon;themeButton.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');themeButton.title=dark?'Светлая тема':'Тёмная тема';}
function syncSound(){soundButton.innerHTML=soundEnabled?volume:mute;soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?'Выключить приветствие при входе':'Включить и прослушать приветствие');soundButton.title=soundEnabled?'Приветствие включено':'Приветствие выключено';}
function setSound(enabled){soundEnabled=enabled;write('pylearn-welcome-sound',enabled?'on':'off');if(!enabled){audio.pause();audio.currentTime=0;}syncSound();}
async function playGreeting(){audio.currentTime=0;audio.volume=.82;await audio.play();}
function rememberEntry(){try{sessionStorage.setItem('pylearn-entered','yes');}catch{}}
function showWelcome(){if(!welcome.open)welcome.showModal();}
function reportAudioError(){const toast=document.querySelector('#toast');toast.textContent='Не удалось включить звук. Проверь громкость и нажми кнопку звука ещё раз.';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),5000);}
document.addEventListener('click',event=>{
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='toggle-theme'){html.dataset.theme=html.dataset.theme==='dark'?'light':'dark';write('pylearn-theme',html.dataset.theme);syncTheme();}
  if(action==='toggle-sound'){setSound(!soundEnabled);if(soundEnabled)playGreeting().catch(reportAudioError);}
  if(action==='enter-with-sound'){setSound(true);rememberEntry();welcome.close();playGreeting().catch(reportAudioError);}
  if(action==='enter-silently'){setSound(false);rememberEntry();welcome.close();}
});
welcome.addEventListener('cancel',()=>{setSound(false);rememberEntry();});
syncTheme();syncSound();
if(soundEnabled){
  let entered=false;try{entered=sessionStorage.getItem('pylearn-entered')==='yes';}catch{}
  if(entered)playGreeting().catch(()=>{});
  else playGreeting().then(rememberEntry).catch(showWelcome);
}
