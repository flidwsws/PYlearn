import {modules,tasks} from './data.js';
import {emptyProgress,normalizeProgress,nextTaskId,isUnlocked} from './progress.js';

const $ = (s,root=document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  path:'<path d="M6 19V5m0 14h12M6 14l5-5 4 3 4-7"/><path d="M15 5h4v4"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book:'<path d="M12 5v15M12 6C8 3 4 4 2 5v14c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1Z"/>',
  chart:'<path d="M4 20V10m8 10V4m8 16v-6"/>',
  arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
  back:'<path d="M20 12H5m5-5-5 5 5 5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  checkcircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 6-7"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  terminal:'<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m6 8 4 4-4 4m7 0h5"/>',
  calculator:'<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',
  branch:'<circle cx="6" cy="4" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12m0-4c7 0 12-2 12-6"/>',
  repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-3v4a3 3 0 0 1-3 3H3"/>',
  layers:'<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 11 10 6 10-6M2 18l10 6 10-6" transform="translate(0 -1) scale(1 .92)"/>',
  code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  flame:'<path d="M12 2c0 6-6 7-6 13a6 6 0 0 0 12 0c0-3-1-5-3-7 0 4-3 4-3 1V2Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  flag:'<path d="M5 22V3m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3h.01"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18"/>',
  bulb:'<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7M8 16h8m-7 4h6m-5 3h4"/>',
  shield:'<path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  play:'<path d="m8 4 12 8-12 8V4Z"/>',
  reset:'<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  download:'<path d="M12 2v14m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload:'<path d="M12 16V2m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  coffee:'<path d="M3 8h14v7a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V8Zm14 1h2a3 3 0 0 1 0 6h-2M6 2v2m4-2v2m4-2v2"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.code}</svg>`;
function decorate(root=document){root.querySelectorAll('[data-icon]').forEach(n=>{n.innerHTML=icon(n.dataset.icon);n.removeAttribute('data-icon');});}

const STORAGE='pylearn-progress-v1';
let state=emptyProgress();
let storageWarning=false;
try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');if(raw && typeof raw === 'object') state=normalizeProgress(raw);}catch{storageWarning=true;}
const validateState=normalizeProgress;
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{if(!storageWarning){storageWarning=true;toast('Браузер не сохраняет данные. Экспортируй прогресс на странице «Мой прогресс».');}}}
function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function streak(){let d=new Date(),count=0;if(!state.days.includes(dateKey(d)))d.setDate(d.getDate()-1);while(state.days.includes(dateKey(d))){count++;d.setDate(d.getDate()-1);}return count;}
const totalXP=()=>state.completed.reduce((a,id)=>a+tasks[id].xp,0);
const nextId=()=>nextTaskId(state);
const unlocked=id=>isUnlocked(state,id);
const moduleTasks=id=>tasks.filter(t=>t.module===id);
const completedModules=()=>modules.filter(m=>moduleTasks(m.id).every(t=>state.completed.includes(t.id))).length;
let route='path',currentTask=null,practiceTab='task',hintOpen=false,solutionOpen=false,filter='all',query='',busy=false;
let worker=null,readyPromise=null,readyReject=null,engineReady=false,engineError=false,requestID=0,pending=null,timeout=null,initTimeout=null,runEpoch=0;
let toastTimer;
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4500);}
function updateHeader(){
  const items=[['path','path','Мой путь'],['tasks','grid','Все задачи'],['cheats','book','Шпаргалка'],['progress','chart','Мой прогресс']];
  $('#nav').innerHTML=items.map(([id,ic,label],i)=>`${i===3?'<div class="nav-separator"></div>':''}<button data-route="${id}" class="${route===id||(route==='practice'&&id==='tasks')?'active':''}" ${route===id?'aria-current="page"':''}>${icon(ic)}${label}</button>`).join('');
  $('#page-label').textContent=route==='practice'?'Практика':items.find(i=>i[0]===route)?.[2]||'Мой путь';
  $('#streak').innerHTML=`${icon('flame')}${streak()} ${plural(streak(),'день','дня','дней')}`;
}
function plural(n,a,b,c){return n%10===1&&n%100!==11?a:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?b:c;}
function navigate(target,replace=false){const hash='#'+target;if(location.hash===hash){renderFromHash();}else if(replace){history.replaceState(null,'',hash);renderFromHash();}else location.hash=target;}
function renderFromHash(){
  if(busy)stopRun(false);
  const hash=location.hash.slice(1)||'path';
  const match=hash.match(/^practice\/(\d+)$/);
  if(match){const id=+match[1];if(!tasks[id]||!unlocked(id)){toast('Сначала реши предыдущую задачу — так знания будут крепче.');navigate('path',true);return;}route='practice';currentTask=id;practiceTab='task';hintOpen=false;solutionOpen=false;renderPractice();ensureEngine();}
  else{route=['path','tasks','cheats','progress'].includes(hash)?hash:'path';currentTask=null;({path:renderDashboard,tasks:renderTasks,cheats:renderCheats,progress:renderProgress}[route])();}
  updateHeader();decorate();$('.sidebar').classList.remove('mobile-open');window.scrollTo({top:0,behavior:'instant'});
}
function intro(title,sub,right=''){return `<section class="page-intro"><div><h1>${title}</h1><p>${sub}</p></div>${right}</section>`;}
function moduleCard(m){
  const group=moduleTasks(m.id),solved=group.filter(t=>state.completed.includes(t.id)).length;
  const done=solved===group.length,available=unlocked(group[0].id);
  const next=group.find(t=>!state.completed.includes(t.id)&&unlocked(t.id));
  const target=next?.id??group[0].id;
  return `<article class="module-card ${available?'available':'locked'}"><div class="module-card-header"><div class="module-icon ${m.color}">${icon(m.icon)}</div>${done?'<span class="module-status completed">ПРОЙДЕНО</span>':available?'<span class="module-status">ДОСТУПНО</span>':`<span class="lock-label">${icon('lock')}</span>`}</div><div class="module-number">МОДУЛЬ 0${m.id+1}</div><h3>${m.title}</h3><p class="module-description">${m.subtitle}</p><div class="tags">${m.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="module-bottom"><span>${icon('book')}${solved} / ${group.length} задач</span>${available?`<button class="module-open" data-task="${target}">${done||!next?'Повторить':solved?'Продолжить':'Начать'}${icon('arrow')}</button>`:`<button class="module-open lock-label" data-locked="${m.id}">После модуля ${m.id}${icon('lock')}</button>`}</div></article>`;
}
function heroArt(){return `<div class="hero-visual" aria-hidden="true"><div class="grid-pattern"></div><div class="floating-code"><div class="code-dots"><i></i><i></i><i></i></div><code><span class="pink">print</span>(<span class="green">"Привет, мир!"</span>)<br><span style="color:#b5bfa7"># всё начинается здесь</span></code></div><div class="float-success">${icon('checkcircle')}Первая победа!</div><svg class="path-art" viewBox="0 0 230 140"><path d="M12 139v-22h43V90h43V63h43V36h43V9h45v131" fill="#d9e8c1"/><path d="M12 117h43V90h43V63h43V36h43V9h45" fill="none" stroke="#b9cf9e" stroke-width="1"/><path d="M14 111c65 0 62-40 107-51 31-7 43-21 62-39" fill="none" stroke="#9cba7c" stroke-width="1.5" stroke-dasharray="3 4"/><circle cx="55" cy="89" r="11" fill="#f6f9ef" stroke="#c0d5a7"/><path d="m51 89 3 3 6-7" fill="none" stroke="#84a663" stroke-width="1.5"/><circle cx="140" cy="36" r="12" fill="#17684e"/><path d="m136 36 3 3 6-7" fill="none" stroke="#d8eaae" stroke-width="1.5"/><path d="M185 9v-23m0 0 17 5-17 5" fill="#729a51" stroke="#729a51" transform="translate(0 17)"/></svg></div>`;}
function renderDashboard(){
  const complete=state.completed.length,t=tasks[nextId()],today=state.solvedDays.includes(dateKey()),todayN=today?1:0;
  const date=new Intl.DateTimeFormat('ru',{day:'numeric',month:'long'}).format(new Date());
  $('#main').innerHTML=intro(complete?'Снова за код — и вперёд!':'Большой путь начинается здесь','Немного теории. Больше практики. И всё обязательно получится.',`<span class="date-label">${icon('calendar')}${date}</span>`)+`
    <div class="dashboard-top"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span></span>ТВОЙ ПУТЬ В ПРОГРАММИРОВАНИЕ</div><h2>${complete===tasks.length?'Ты умеешь больше,<br>чем кажется.':complete?'Ещё одна задача.<br>Ещё один навык.':'Python начинается<br>с одной строки.'}</h2><p>${complete===tasks.length?'Все задачи позади. Повторяй сложное, экспериментируй с кодом и продолжай расти.':'Учись на небольших задачах, пробуй новое<br class="desktop-br"> и постепенно переходи к сложному.'}</p><button class="primary" data-task="${nextId()}">${complete===tasks.length?'Повторить финальный проект':complete?'Продолжить обучение':'Начать учиться'}${icon('arrow')}</button><span class="hero-meta">${complete?`Задача ${t.id+1} · ${t.minutes} ${plural(t.minutes,'минута','минуты','минут')}`:'Бесплатно · Без установки'}</span></div>${heroArt()}</section>
    <aside class="plan-card"><div class="plan-heading"><h3>План на сегодня</h3><span class="pill">15 МИНУТ</span></div><ul class="daily-plan"><li><span class="plan-check ${today?'checked':''}">${today?icon('check'):''}</span><div>Разобраться в теме<small>Коротко и на примерах</small></div></li><li><span class="plan-check ${today?'checked':''}">${today?icon('check'):''}</span><div>Решить одну задачу<small>В своём темпе, без спешки</small></div></li><li><span class="plan-check ${today?'checked':''}">${today?icon('check'):''}</span><div>Порадоваться себе<small>Ты уже на шаг ближе к цели</small></div></li></ul><div class="plan-line"><span>${todayN? 'Отличный день для роста':'Каждый шаг считается'}</span><strong>${today?'Готово ✓':'Начнём?'}</strong></div></aside></div>
    <section class="stats-row" aria-label="Твой прогресс"><div class="stat"><span class="stat-icon">${icon('checkcircle')}</span><div><strong>${complete}<span>/ ${tasks.length}</span></strong><p>задач решено</p></div></div><div class="stat"><span class="stat-icon">${icon('bolt')}</span><div><strong>${totalXP()}<span>XP</span></strong><p>очков опыта</p></div></div><div class="stat"><span class="stat-icon">${icon('flag')}</span><div><strong>${completedModules()}<span>/ ${modules.length}</span></strong><p>модулей пройдено</p></div></div></section>
    <section><div class="section-heading"><div><h2>Твой учебный маршрут</h2><p>От первого «привет» до собственного мини-проекта</p></div><button class="text-link" data-route="tasks">Все ${tasks.length} задач${icon('arrow')}</button></div><div class="modules-grid">${modules.map(moduleCard).join('')}</div><p class="route-note">${icon('lock')}Следующий модуль откроется после прохождения предыдущего</p></section>
    <aside class="bottom-tip">${icon('bulb')}<p><strong>Ошибаться — часть обучения.</strong> Пробуй, запускай код и заглядывай в подсказки. Здесь можно всё начать заново.</p></aside>`;
}
function taskRow(t){const solved=state.completed.includes(t.id),open=unlocked(t.id);return `<button class="task-row" ${open?`data-task="${t.id}"`:`data-locked-task="${t.id}"`}><span class="task-status ${solved?'done':open?'':'locked'}">${solved?icon('check'):open?String(t.id+1).padStart(2,'0'):icon('lock')}</span><span class="task-info"><span class="task-module">${modules[t.module].title}</span><strong>${t.title}</strong><p>${t.brief}</p></span><span class="task-meta">${t.minutes} мин · ${t.xp} XP</span>${icon(open?'arrow':'lock')}</button>`;}
function taskFilters(){return `<button class="filter ${filter==='all'?'active':''}" data-filter="all">Все задачи</button><button class="filter ${filter==='available'?'active':''}" data-filter="available">Доступные</button><button class="filter ${filter==='solved'?'active':''}" data-filter="solved">Решённые</button>${modules.map(m=>`<button class="filter ${filter===String(m.id)?'active':''}" data-filter="${m.id}">${m.id+1}. ${m.title.split(' и ')[0].replace('Знакомство с Python','Старт')}</button>`).join('')}`;}
function matchingTasks(){return tasks.filter(t=>(filter==='all'||filter==='available'&&unlocked(t.id)||filter==='solved'&&state.completed.includes(t.id)||String(t.module)===filter)&&(`${t.title} ${t.brief} ${modules[t.module].title}`.toLowerCase().includes(query.toLowerCase())));}
function renderTaskRows(){const list=matchingTasks();$('#task-list').innerHTML=list.length?list.map(taskRow).join(''):'<div class="empty-state"><h3>Пока ничего не нашлось</h3><p>Попробуй другое название или выбери «Все задачи».</p></div>';$('#task-count').textContent=`${list.length} ${plural(list.length,'задача','задачи','задач')}`;}
function renderTasks(){
  $('#main').innerHTML=intro('Каждая задача — новый навык',`${tasks.length} небольших практических задач. Проходи их по порядку и собирай опыт.`)+`<div class="all-tasks-head"><div class="small muted" id="task-count"></div><input id="task-search" type="search" value="${esc(query)}" placeholder="Поиск по задачам и темам" aria-label="Поиск по задачам"></div><div class="filters" id="filters">${taskFilters()}</div><div class="task-list" id="task-list"></div>`;renderTaskRows();
}
function renderCheats(){ $('#main').innerHTML=intro('Всё нужное — под рукой','Короткие объяснения и примеры. Сюда можно заглядывать в любой момент.')+`<div class="cheat-grid">${modules.map(m=>`<article class="cheat-content" id="cheat-${m.id}"><div class="cheat-title"><div class="module-icon ${m.color}">${icon(m.icon)}</div><h2>${m.title}</h2></div>${m.theory}</article>`).join('')}</div>`;}
function renderProgress(){
  const n=state.completed.length,pct=Math.round(n/tasks.length*100);
  $('#main').innerHTML=intro('Посмотри, как далеко ты зашёл','Каждый решённый тест — маленькая победа. Здесь они все считаются.')+`<section class="progress-overview"><div class="progress-ring" style="--value:${pct}%"><div class="progress-ring-inner"><strong>${pct}%</strong><span>${n} из ${tasks.length} задач</span></div></div><div><span class="badge">${icon('bolt')}${totalXP()} XP</span><h2 style="margin-top:12px">${n===tasks.length?'Первый маршрут пройден!':n?'Хорошее начало. Продолжай!':'Твоя история ещё впереди'}</h2><p>${n===tasks.length?'От первой строки до анализатора данных — ты прошёл весь путь. Повторяй задачи и пробуй другие решения.':'Большие навыки складываются из небольших регулярных шагов. Прогресс останется здесь, когда ты вернёшься.'}</p><button class="primary" data-task="${nextId()}">${n?'Продолжить практику':'Решить первую задачу'}${icon('arrow')}</button></div></section><h2>Твои маленькие победы</h2><div class="achievements"><article class="achievement ${n>=1?'earned':''}"><span>🌱</span><strong>Первая строка</strong><p>Реши первую задачу</p></article><article class="achievement ${n>=5?'earned':''}"><span>🧭</span><strong>Разведчик</strong><p>Пройди первый модуль</p></article><article class="achievement ${n===tasks.length?'earned':''}"><span>🏆</span><strong>Основы освоены</strong><p>Реши все ${tasks.length} задач</p></article></div><section>${modules.map(m=>{const count=state.completed.filter(id=>tasks[id].module===m.id).length;return `<div class="progress-module"><div class="module-icon ${m.color}">${icon(m.icon)}</div><div class="progress-module-info"><strong>${m.title}</strong><div class="progress-track"><span style="width:${count/moduleTasks(m.id).length*100}%"></span></div></div><span>${count} / ${moduleTasks(m.id).length}</span></div>`;}).join('')}</section><p class="storage-note">${icon('shield')}Прогресс и черновики хранятся в этом браузере. Для переноса на другое устройство сохрани файл.</p>${storageWarning?'<p class="error-note">Сохранение в браузере недоступно. Экспортируй прогресс перед закрытием страницы.</p>':''}<div class="progress-actions"><button class="secondary" data-action="export">${icon('download')}Скачать прогресс</button><button class="secondary" data-action="import">${icon('upload')}Загрузить прогресс</button><button class="text-link" data-action="reset-progress">Сбросить прогресс</button><input id="import-file" type="file" accept="application/json,.json" hidden></div>`;
}
function renderPractice(){
  const t=tasks[currentTask],m=modules[t.module];
  $('#main').innerHTML=`<button class="back-link" data-route="tasks">${icon('back')}К списку задач</button><div class="practice-top"><div><div class="eyebrow" style="color:#99a88c;font-size:8px;margin-bottom:7px">МОДУЛЬ 0${t.module+1} · ${m.title}</div><h1>${t.title}</h1><div class="task-steps" aria-label="Задача ${t.number} из ${moduleTasks(t.module).length}">${tasks.filter(x=>x.module===t.module).map(x=>`<span class="task-step ${state.completed.includes(x.id)?'done':x.id===t.id?'current':''}"></span>`).join('')}</div></div><span class="badge">${icon('clock')}${t.minutes} ${plural(t.minutes,'минута','минуты','минут')} <span style="padding:0 3px">·</span> ${t.xp} XP</span></div><div class="practice-layout"><section class="problem-card"><div class="tabs"><button data-practice-tab="task" class="active">Задача</button><button data-practice-tab="theory">Коротко о теме</button></div><div class="problem-content" id="problem-content"></div><div class="module-mini-nav"><span>Задача ${t.number} из ${moduleTasks(t.module).length} в модуле</span><span>${state.completed.includes(t.id)?'Решено ✓':`Шаг ${t.id+1} из ${tasks.length}`}</span></div></section><div><section class="editor-card"><div class="editor-toolbar"><span class="file-tab">${icon('code')}main.py</span><div class="editor-toolbar-tools"><span>Python 3</span><button data-action="reset-code" title="Вернуть начальный код" aria-label="Вернуть начальный код">${icon('reset')}</button><button data-action="download-code" title="Скачать код" aria-label="Скачать код">${icon('download')}</button></div></div><div class="editor-wrap"><div class="line-numbers" id="line-numbers" aria-hidden="true"></div><textarea id="code-editor" class="code-editor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Редактор кода Python" wrap="off">${esc(state.drafts[t.id]??t.starter)}</textarea></div><div class="editor-input"><label for="stdin">${t.tests[0].expr?'ПРИМЕР ВЫЗОВА ДЛЯ КНОПКИ «ЗАПУСТИТЬ»':'ВХОДНЫЕ ДАННЫЕ · STDIN'}</label>${t.tests[0].expr?`<small>Добавь вызов в конце кода, например <code>print(${esc(t.tests[0].expr)})</code>. Проверка сама вызовет функцию.</small>`:`<textarea id="stdin" aria-label="Входные данные программы" spellcheck="false">${esc(t.tests[0].input)}</textarea><small>По одному значению на строку. Тесты используют свои данные.</small>`}</div><div class="editor-actions"><button class="run-button" data-action="run" id="run-button">${icon('play')}Запустить</button><button class="check-button" data-action="check" id="check-button">Проверить решение${icon('arrow')}</button></div></section><section class="output-card"><div class="output-heading"><span>Консоль и проверка</span><span id="runtime-status" class="runtime-status"><i></i>${engineReady?'Python готов':'Подключаем Python…'}</span></div><div class="output-body output-placeholder" id="output" role="status" aria-live="polite">Здесь появится результат твоего кода.</div><div id="test-results"></div></section><div id="success-area"></div><p class="practice-note">${icon('shield')}Код выполняется в твоём браузере <span>·</span> Ctrl / ⌘ + Enter — проверка</p></div></div>`;
  renderProblem();syncLines();setRuntimeStatus();
}
function renderProblem(){const t=tasks[currentTask];if(practiceTab==='theory'){$('#problem-content').innerHTML=modules[t.module].theory;return;}const test=t.tests[0];$('#problem-content').innerHTML=`<span class="badge">${state.completed.includes(t.id)?'Решено ✓':t.module<2?'Первые шаги':t.module<4?'Чуть сложнее':'Собираем навыки'}</span><h3>${t.brief}</h3><p>${t.body}</p>${test.expr?`<div style="margin-top:20px"><div class="example-label">Пример вызова</div><pre>${esc(test.expr)}\n# → ${esc(formatExpected(test.expected))}</pre></div>`:`<div class="io-example"><div><div class="example-label">Ввод</div><pre>${test.input?esc(test.input):'Нет ввода'}</pre></div><div><div class="example-label">Вывод</div><pre>${esc(test.expected)}</pre></div></div>`}<div class="hint-actions"><button class="secondary" data-action="hint">${icon('bulb')}${hintOpen?'Скрыть подсказку':'Нужна подсказка'}</button><button class="text-link" data-action="solution">${solutionOpen?'Скрыть решение':'Посмотреть решение'}</button></div>${hintOpen?`<div class="hint-box"><strong>Маленькая подсказка</strong>${esc(t.hint)}</div>`:''}${solutionOpen?`<div class="solution-block"><div class="example-label">Один из вариантов решения</div><pre>${esc(t.solution)}</pre><p class="small muted">Попробуй объяснить каждую строку, а затем написать код самостоятельно.</p></div>`:''}`;}
function formatExpected(v){if(typeof v==='string')return v;if(v===true)return 'True';if(v===false)return 'False';return JSON.stringify(v);}
function syncLines(){const ta=$('#code-editor'),ln=$('#line-numbers');if(ta&&ln){ln.textContent=ta.value.split('\n').map((_,i)=>i+1).join('\n');ln.scrollTop=ta.scrollTop;}}
function setRuntimeStatus(){const el=$('#runtime-status');if(!el)return;el.className='runtime-status '+(engineReady?'ready':'');el.innerHTML=`<i></i>${engineReady?'Python готов':engineError?'Нужен интернет · повтори запуск':worker?'Подключаем Python…':'Готов к запуску'}`;}
function ensureEngine(){
  if(readyPromise)return readyPromise;
  engineError=false;engineReady=false;
  readyPromise=new Promise((resolve,reject)=>{
    readyReject=reject;
    worker=new Worker(new URL('./python-worker.js',import.meta.url));
    initTimeout=setTimeout(()=>failEngine('Не удалось загрузить Python. Проверь интернет и нажми «Запустить» ещё раз.'),60000);
    function failEngine(message){clearTimeout(initTimeout);engineError=true;engineReady=false;worker?.terminate();worker=null;readyPromise=null;readyReject=null;setRuntimeStatus();reject(new Error(message));if(pending){clearTimeout(timeout);pending.reject(new Error(message));pending=null;}}
    worker.onerror=()=>failEngine('Не удалось подключить Python. Проверь интернет и повтори запуск.');
    worker.onmessage=({data})=>{
      if(data.type==='ready'){clearTimeout(initTimeout);engineReady=true;readyReject=null;setRuntimeStatus();resolve();}
      if(data.type==='init-error')failEngine('Не удалось загрузить Python. Проверь интернет и повтори запуск.');
      if((data.type==='result'||data.type==='error')&&pending&&pending.id===data.id){clearTimeout(timeout);const p=pending;pending=null;data.type==='result'?p.resolve(data):p.reject(new Error(data.error));}
    };
  });
  readyPromise.catch(()=>{});setRuntimeStatus();return readyPromise;
}
function stopRun(show=true){
  runEpoch++;
  if(readyReject){readyReject(new Error('Выполнение остановлено.'));readyReject=null;}
  worker?.terminate();worker=null;engineReady=false;readyPromise=null;engineError=false;clearTimeout(timeout);clearTimeout(initTimeout);
  const p=pending;pending=null;if(p)p.reject(new Error('Выполнение остановлено.'));busy=false;
  if(show&&$('#output')){$('#output').className='output-body';$('#output').textContent='Выполнение остановлено. Проверь условие завершения цикла.';setBusyUI(false);setRuntimeStatus();}
}
function setBusyUI(value){const run=$('#run-button'),check=$('#check-button');if(!run||!check)return;run.innerHTML=value?`${icon('close')}Остановить`:`${icon('play')}Запустить`;run.dataset.action=value?'stop':'run';check.disabled=value;check.innerHTML=value?'<span class="spinner"></span> Проверяем…':`Проверить решение${icon('arrow')}`;$('#code-editor').readOnly=value;document.querySelectorAll('[data-action="reset-code"],[data-action="download-code"]').forEach(el=>el.disabled=value);}
async function execute(mode){
  if(busy)return;const epoch=++runEpoch,id=currentTask,t=tasks[id],code=$('#code-editor').value;if(!code.trim()){toast('Напиши немного кода, и можно запускать.');return;}
  busy=true;setBusyUI(true);const out=$('#output');out.className='output-body output-placeholder';out.innerHTML=`<span class="loading-text"><span class="spinner"></span>${engineReady?'Выполняем код…':'Загружаем Python. Первый запуск может занять немного времени…'}</span>`;$('#test-results').innerHTML='';$('#success-area').innerHTML='';
  const payload={code,mode,input:$('#stdin')?.value??'',tests:t.tests,required:t.required,syntax:t.syntax};
  try{
    const currentReady=ensureEngine();await currentReady;
    if(epoch!==runEpoch||!busy||currentTask!==id||route!=='practice')return;
    const result=await new Promise((resolve,reject)=>{const rid=++requestID;pending={id:rid,resolve,reject};timeout=setTimeout(()=>{worker?.terminate();worker=null;engineReady=false;readyPromise=null;pending=null;setRuntimeStatus();reject(new Error('Лимит 5 секунд. Возможно, цикл не заканчивается. Проверь его условие и попробуй снова.'));},5000);worker.postMessage({type:'execute',id:rid,payload});});
    if(epoch!==runEpoch||currentTask!==id||route!=='practice')return;
    state.attempts++;if(!state.days.includes(dateKey()))state.days.push(dateKey());save();updateHeader();
    out.className='output-body';
    if(mode==='run'){const r=result.results[0];out.textContent=r.error?`${r.output? r.output+'\n':''}${r.error}`:r.output||'Код выполнен. В этой программе нет вывода.';if(r.error)out.classList.add('error');}
    else{
      const passed=result.results.filter(r=>r.passed).length;
      out.textContent=result.passed?`Всё получилось! Пройдено ${passed} из ${result.results.length} тестов.`:`Пройдено ${passed} из ${result.results.length} тестов. Попробуй ещё — ты справишься.`;
      if(!result.passed)out.classList.add('error');
      $('#test-results').className='test-results';$('#test-results').innerHTML=result.results.map((r,i)=>`<div class="test-result ${r.passed?'':'failed'}">${icon(r.passed?'checkcircle':'close')}<details ${!r.passed?'open':''}><summary>Тест ${i+1}${r.label?` · ${esc(r.label)}`:''} · ${r.passed?'пройден':'проверь результат'}</summary><pre>${r.error?esc(r.error):`${r.input?'Ввод: '+esc(r.input)+'\n':''}Ожидается: ${esc(formatExpected(r.expected))}\nПолучено: ${esc(r.actual??'нет результата')}`}</pre></details></div>`).join('');
      if(result.passed){
        const first=!state.completed.includes(id);
        if(first&&unlocked(id)){state.completed.push(id);state.completed.sort((a,b)=>a-b);}
        if(!state.solvedDays.includes(dateKey()))state.solvedDays.push(dateKey());
        save();renderProblem();
        const miniNav=$('.module-mini-nav');if(miniNav)miniNav.lastElementChild.textContent='Решено ✓';
        const finished=state.completed.length===tasks.length;
        const moduleDone=moduleTasks(t.module).every(x=>state.completed.includes(x.id));
        const next=nextId();
        $('#success-area').innerHTML=`<div class="success-banner">${icon('checkcircle')}<div><strong>${finished?'Весь маршрут пройден!':moduleDone?'Модуль пройден!':'Отличная работа!'}</strong><p>${first?`+${t.xp} XP · `:''}${finished?'Ты освоил основы Python.':moduleDone?'Следующая тема уже открыта.':'Ещё один маленький шаг вперёд.'}</p></div><button class="primary" ${finished?'data-route="progress"':`data-task="${next}"`}>${finished?'Мой результат':'Дальше'}${icon('arrow')}</button></div>`;
      }
    }
  }catch(error){if(epoch===runEpoch&&currentTask===id&&route==='practice'){out.className='output-body error';out.textContent=error.message;}}
  finally{if(epoch===runEpoch&&currentTask===id&&route==='practice'){busy=false;setBusyUI(false);setRuntimeStatus();}}
}
function openDialog(content){const d=$('#dialog');d.innerHTML=content;d.showModal();}
function dialogHeader(title){return `<div class="dialog-heading"><h2>${title}</h2><button class="icon-button" data-action="close-dialog" aria-label="Закрыть">${icon('close')}</button></div>`;}
function searchDialog(){openDialog(dialogHeader('Найдём твою следующую задачу')+'<input class="search-input" type="search" id="global-search" placeholder="Например, циклы или сумма" aria-label="Поиск задачи"><div class="search-results" id="search-results"></div>');renderSearch('');$('#global-search').focus();}
function renderSearch(q){const list=tasks.filter(t=>`${t.title} ${t.brief} ${modules[t.module].title} ${modules[t.module].tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()));$('#search-results').innerHTML=list.length?list.map(taskRow).join(''):'<div class="empty-state">Ничего не найдено. Попробуй другое слово.</div>';}
function download(name,content,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function confirmDialog(title,body,action,label='Подтвердить'){openDialog(dialogHeader(title)+`<p>${body}</p><div class="confirm-actions"><button class="secondary" data-action="close-dialog">Отмена</button><button class="primary" data-action="${action}">${label}</button></div>`);}

document.addEventListener('click',event=>{
  if(event.target.closest('.skip-link')){event.preventDefault();$('#main').focus();return;}
  const el=event.target.closest('button,[data-route]');if(!el)return;
  if(el.dataset.route){$('#dialog').close();navigate(el.dataset.route);return;}
  if(el.dataset.task!==undefined){$('#dialog').close();navigate('practice/'+el.dataset.task);return;}
  if(el.dataset.locked!==undefined){toast(`Сначала пройди модуль «${modules[+el.dataset.locked-1].title}».`);return;}
  if(el.dataset.lockedTask!==undefined){toast(`Следующая доступная задача — «${tasks[nextId()].title}». Решай по порядку, чтобы двигаться дальше.`);return;}
  if(el.dataset.filter!==undefined){filter=el.dataset.filter;$('#filters').innerHTML=taskFilters();renderTaskRows();return;}
  if(el.dataset.practiceTab){practiceTab=el.dataset.practiceTab;document.querySelectorAll('[data-practice-tab]').forEach(b=>b.classList.toggle('active',b.dataset.practiceTab===practiceTab));renderProblem();return;}
  const action=el.dataset.action;
  if(action==='menu')$('.sidebar').classList.toggle('mobile-open');
  if(action==='help')openDialog(dialogHeader('Шаг за шагом — к своему коду')+'<p>PYlearn — спокойное место для первой практики Python. Здесь можно пробовать и ошибаться.</p><ol><li><strong>Открой задачу.</strong> Вкладка «Коротко о теме» объяснит новый материал.</li><li><strong>Напиши код.</strong> Кнопка «Запустить» покажет вывод с твоими входными данными.</li><li><strong>Проверь решение.</strong> Несколько тестов проверят разные случаи. Если не получилось, открой подсказку.</li><li><strong>Двигайся дальше.</strong> После правильного решения открывается следующая задача. После каждого модуля — новая тема.</li></ol><p>Черновики и прогресс сохраняются в браузере. На странице «Мой прогресс» можно скачать резервную копию. Для первого запуска Python нужен интернет.</p><button class="primary" data-action="close-dialog">Всё понятно '+icon('check')+'</button>');
  if(action==='search')searchDialog();
  if(action==='close-dialog')$('#dialog').close();
  if(action==='hint'){hintOpen=!hintOpen;renderProblem();}
  if(action==='solution'){if(solutionOpen){solutionOpen=false;renderProblem();}else if(state.completed.includes(currentTask)||state.solutions.includes(currentTask)){solutionOpen=true;renderProblem();}else confirmDialog('Подсмотреть решение?','Сначала попробуй подсказку: так больше шансов разобраться самому. Если застрял, можно изучить готовый пример.','show-solution','Показать решение');}
  if(action==='show-solution'){state.solutions.push(currentTask);save();solutionOpen=true;$('#dialog').close();renderProblem();}
  if(action==='run')execute('run');
  if(action==='check')execute('check');
  if(action==='stop')stopRun();
  if(action==='reset-code')confirmDialog('Начать код заново?','Текущий черновик этой задачи заменится начальным кодом. Пройденная задача останется в прогрессе.','confirm-reset-code','Начать заново');
  if(action==='confirm-reset-code'){$('#code-editor').value=tasks[currentTask].starter;state.drafts[currentTask]=tasks[currentTask].starter;save();syncLines();$('#dialog').close();toast('Можно попробовать другой подход.');}
  if(action==='download-code')download(`pylearn-task-${currentTask+1}.py`,$('#code-editor').value);
  if(action==='export')download('pylearn-progress.json',JSON.stringify({format:'pylearn-v2',savedAt:new Date().toISOString(),...state},null,2),'application/json');
  if(action==='import')$('#import-file').click();
  if(action==='reset-progress')confirmDialog('Начать весь путь сначала?','Все решённые задачи, черновики и очки опыта будут удалены из этого браузера. Перед сбросом можно скачать прогресс.','confirm-reset-progress','Сбросить прогресс');
  if(action==='confirm-reset-progress'){state=emptyProgress();save();$('#dialog').close();renderProgress();updateHeader();toast('Новый старт. У тебя всё получится.');}
  if(action==='confirm-import'){state=validateState(importedState);save();$('#dialog').close();renderProgress();updateHeader();toast('Прогресс загружен. Можно продолжать!');importedState=null;}
});
let importedState=null;
document.addEventListener('input',event=>{const el=event.target;if(el.id==='code-editor'){state.drafts[currentTask]=el.value;save();syncLines();}if(el.id==='task-search'){query=el.value;renderTaskRows();}if(el.id==='global-search')renderSearch(el.value);});
document.addEventListener('change',async event=>{if(event.target.id!=='import-file')return;const file=event.target.files?.[0];if(!file)return;try{if(file.size>2000000)throw Error('Файл слишком большой.');const raw=JSON.parse(await file.text());if(!['pylearn-v1','pylearn-v2'].includes(raw.format)||!Array.isArray(raw.completed))throw Error('Это не файл прогресса PYlearn.');importedState=validateState(raw);confirmDialog('Загрузить сохранённый прогресс?',`В файле ${importedState.completed.length} решённых задач. Текущий прогресс и черновики в этом браузере будут заменены.`,'confirm-import','Загрузить');}catch(error){toast(error.message||'Не удалось прочитать файл.');}event.target.value='';});
document.addEventListener('keydown',event=>{
  if(event.target.id==='code-editor'&&event.key==='Tab'){event.preventDefault();const ta=event.target,start=ta.selectionStart,end=ta.selectionEnd;ta.setRangeText('    ',start,end,'end');state.drafts[currentTask]=ta.value;save();syncLines();}
  if(event.target.id==='code-editor'&&event.key==='Enter'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();const ta=event.target,before=ta.value.slice(0,ta.selectionStart),line=before.split('\n').pop(),indent=line.match(/^ */)[0]+(line.trimEnd().endsWith(':')?'    ':'');ta.setRangeText('\n'+indent,ta.selectionStart,ta.selectionEnd,'end');state.drafts[currentTask]=ta.value;save();syncLines();}
  if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&route==='practice'&&!document.querySelector('dialog[open]')){event.preventDefault();execute('check');}
  if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();searchDialog();}
  if(event.key==='Escape')$('.sidebar').classList.remove('mobile-open');
});
document.addEventListener('scroll',event=>{if(event.target.id==='code-editor')syncLines();},true);
$('#dialog').addEventListener('click',event=>{const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();});
document.addEventListener('click',event=>{if(innerWidth<=750&&!event.target.closest('.sidebar')&&!event.target.closest('[data-action="menu"]'))$('.sidebar').classList.remove('mobile-open');});
window.addEventListener('hashchange',renderFromHash);
decorate();renderFromHash();
