// ╔══════════════════════════════════════════════════════════════╗
// ║  Soundfield — scripts.js                                    ║
// ║  Главный модуль: инициализация, UI, рендер, физика           ║
// ║                                                              ║
// ║  Зависимости: palettes.js, audio.js, tools.js,               ║
// ║               scene3d.js, visual.js                          ║
// ║                                                              ║
// ║  Структура:                                                  ║
// ║   1. Утилиты (enhanceSliders, onTap, курсор)                 ║
// ║   2. Якоря и навигация (eye, profile)                        ║
// ║   3. Тулбар и боковая панель                                 ║
// ║   4. Тарифы и доступ (Free/Pro/DLC)                          ║
// ║   5. Режимы и настройки (2D/3D/формы)                        ║
// ║   6. Бит-машина (степ-секвенсор)                             ║
// ║   7. WebGL: шейдеры, буферы, GPU-пайплайн                    ║
// ║   8. Физика частиц (update)                                  ║
// ║   9. Рендер (drawParticles, renderGL, loop)                  ║
// ║  10. Resize и профили устройств                              ║
// ║  11. Клавиатура и haptic                                     ║
// ║  12. Мобильная шторка                                        ║
// ║  13. Встроенный плеер (BGM)                                  ║
// ║  14. Соты (honeycomb)                                        ║
// ║  15. Генезис (первый запуск)                                  ║
// ║  16. Волокна (fibers)                                        ║
// ╚══════════════════════════════════════════════════════════════╝

// ══════════════════════════════════════
// 1. УТИЛИТЫ
// ══════════════════════════════════════

// 🌿 enhanceSliders — числа прорастают под каждым ползунком
function enhanceSliders(root){
    const container=root||document;
    container.querySelectorAll('.ctrl-row').forEach(row=>{
        if(row.querySelector('.ctrl-range-info'))return;
        const slider=row.querySelector('.ctrl-slider');
        if(!slider)return;
        const oldVal=row.querySelector('.ctrl-value')||row.querySelector('.bass-style-label');
        const info=document.createElement('div');info.className='ctrl-range-info';
        const minEl=document.createElement('span');minEl.textContent=slider.min;
        const curEl=document.createElement('span');curEl.className='ctrl-current';
        curEl.textContent=oldVal?oldVal.textContent:slider.value;
        const maxEl=document.createElement('span');maxEl.textContent=slider.max;
        info.appendChild(minEl);info.appendChild(curEl);info.appendChild(maxEl);
        row.appendChild(info);
        // синхронизируем с обновлениями старого ctrl-value
        if(oldVal){
            const obs=new MutationObserver(()=>{curEl.textContent=oldVal.textContent;});
            obs.observe(oldVal,{childList:true,characterData:true,subtree:true});
        }
        slider.addEventListener('input',()=>{
            if(!oldVal)curEl.textContent=parseFloat(slider.value)%1===0?slider.value:parseFloat(slider.value).toFixed(2);
        });
    });
}
const cursorEl=document.getElementById('cursor');
if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){document.addEventListener('mousemove',e=>{cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';const overUI=e.target.closest('.toolbar,.side-panel,.profile-panel,.scene-bar,.beat-panel,.bg-music-panel,.mobile-drawer,.custom-palette-panel,.anchor,.lab-overlay');cursorEl.style.opacity=overUI?'0':'1';});document.addEventListener('mousedown',()=>cursorEl.classList.add('active'));document.addEventListener('mouseup',()=>cursorEl.classList.remove('active'));}
function onTap(el,fn){el.addEventListener('click',fn);el.addEventListener('touchend',function(e){if(e.cancelable)e.preventDefault();e.stopPropagation();fn(e);},{passive:false});}

// ══════════════════════════════════════
// 2. ЯКОРЯ И НАВИГАЦИЯ
// ══════════════════════════════════════
const eyeToggle=document.getElementById('eyeToggle'),profileToggle=document.getElementById('profileToggle'),profilePanel=document.getElementById('profilePanel');
let uiVisible=true,profileOpen=false;
onTap(eyeToggle,e=>{e.stopPropagation();uiVisible=!uiVisible;document.body.classList.toggle('ui-hidden',!uiVisible);eyeToggle.classList.toggle('active',!uiVisible);});
onTap(profileToggle,e=>{e.stopPropagation();profileOpen=!profileOpen;profilePanel.classList.toggle('open',profileOpen);profileToggle.classList.toggle('active',profileOpen);});
// «Настройки» из меню профиля открывает панель настроек
(function(){var pm=document.getElementById('pmSettings');if(pm)onTap(pm,function(e){e.stopPropagation();profileOpen=false;profilePanel.classList.remove('open');profileToggle.classList.remove('active');if(typeof switchTool==='function'&&activeTool!=='settings')switchTool('settings');});})();
profilePanel.addEventListener('click',e=>e.stopPropagation());

// ══════════════════════════════════════
// 3. ТУЛБАР И БОКОВАЯ ПАНЕЛЬ
// ══════════════════════════════════════
const sidePanel=document.getElementById('sidePanel');
const toolIcons=document.querySelectorAll('.tool-icon:not(.locked)');
const pages={modes:document.getElementById('spModes'),palette:document.getElementById('spPalette'),settings:document.getElementById('spSettings'),music:document.getElementById('spMusic')};
const beatPanel=document.getElementById('beatPanel');
let activeTool='';

function switchTool(tool){
    if(tool==='music'&&!dlcAudio){showLockToast('Доступно в DLC Аудио');return;}
    if(tool==='create'&&!dlcBeats){showLockToast('Доступно в DLC Биты');return;}
    if(tool==='create'){
        // бит-панель — отдельная нижняя панель
        if(activeTool==='create'){activeTool='';beatPanel.classList.remove('open');toolIcons.forEach(t=>t.classList.remove('active'));return;}
        activeTool='create';
        sidePanel.classList.remove('open');closeCustomPanel();
        beatPanel.classList.add('open');
        toolIcons.forEach(t=>t.classList.toggle('active',t.dataset.tool==='create'));
        buildBeatGrid();enhanceSliders();
        return;
    }
    beatPanel.classList.remove('open');
    if(activeTool===tool){activeTool='';sidePanel.classList.remove('open');toolIcons.forEach(t=>t.classList.remove('active'));closeCustomPanel();return;}
    activeTool=tool;
    sidePanel.classList.add('open');
    toolIcons.forEach(t=>t.classList.toggle('active',t.dataset.tool===tool));
    Object.keys(pages).forEach(k=>{pages[k].classList.toggle('active',k===tool);});
    closeCustomPanel();
    if(tool==='settings'){buildCurrentModeSettings();if(currentScene==='3d')buildModeSettings3D();enhanceSliders(sidePanel);}
    if(tool==='music'){buildMusicParams();enhanceSliders(sidePanel);}
}

toolIcons.forEach(t=>{onTap(t,e=>{e.stopPropagation();switchTool(t.dataset.tool);});});
sidePanel.addEventListener('click',e=>e.stopPropagation());
sidePanel.addEventListener('mousedown',e=>e.stopPropagation());
sidePanel.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});

document.addEventListener('click',e=>{
    if(profileOpen&&!e.target.closest('.profile-panel')&&!e.target.closest('.anchor-profile')){profileOpen=false;profilePanel.classList.remove('open');profileToggle.classList.remove('active');}
    if(activeTool&&!e.target.closest('.side-panel')&&!e.target.closest('.toolbar')&&!e.target.closest('.custom-palette-panel')&&!e.target.closest('.beat-panel')){activeTool='';sidePanel.classList.remove('open');beatPanel.classList.remove('open');toolIcons.forEach(t=>t.classList.remove('active'));closeCustomPanel();}
});

// ══════════════════════════════════════
// 4. ТАРИФЫ И ДОСТУП
// ══════════════════════════════════════
// 🌿 Тарифы — корни доступа
let userPlan='pro'; // 'free' | 'pro'
let dlcAudio=true, dlcBeats=true; // бета: все DLC открыты. Для платного релиза вернуть в false
const freeModes=['custom','vortex','mandala','turbulence','wave','breathing','fibonacci'];

function showLockToast(msg){
    let t=document.getElementById('lockToast');
    if(!t){t=document.createElement('div');t.id='lockToast';t.className='lock-toast';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),1800);
}
function isModeAvail(key){return userPlan==='pro'||freeModes.includes(key);}

function applyPlan(){
    // scene bar — 3D locked in free
    document.querySelectorAll('.scene-btn').forEach(b=>{
        b.classList.toggle('locked',b.dataset.scene==='3d'&&userPlan==='free');
    });
    // toolbar — music/beats
    document.querySelectorAll('.tool-icon').forEach(b=>{
        if(b.dataset.tool==='music')b.classList.toggle('locked',!dlcAudio);
        if(b.dataset.tool==='create')b.classList.toggle('locked',!dlcBeats);
    });
    // shapes — free = только Плоскость
    document.querySelectorAll('#shapeBtns .sub-btn').forEach(b=>{
        b.classList.toggle('locked',userPlan==='free'&&b.dataset.shape!=='0');
    });
    // rebuild mode lists
    buildModeList();
    if(typeof buildModeList3D==='function')buildModeList3D();
    // если текущий режим заблокирован — сбросить на вихрь
    if(!isModeAvail(currentMode)){currentMode='vortex';buildModeList();}
    // если в 3D и free — вернуть в 2D
    if(currentScene==='3d'&&userPlan==='free'){
        document.querySelector('.scene-btn[data-scene="2d"]').click();
    }
    // profile panel — обновить бейдж
    const badge=document.querySelector('.tier-badge');
    const label=document.querySelector('.tier-label');
    if(badge)badge.textContent=userPlan==='pro'?'Pro':'Touch';
    if(label)label.textContent=userPlan==='pro'?'Полный доступ':'Бесплатный тариф';
}

// modes → tools.js
let currentMode='vortex';
let canvasShape=0;
let currentScene='2d',currentModeTab='manual';
const musicParamDefs=[{key:'pulse',label:'Пульс',min:0,max:3,step:.1},{key:'beat',label:'Удар',min:0,max:3,step:.1},{key:'spin',label:'Вращение',min:0,max:3,step:.1},{key:'shimmer',label:'Мерцание',min:0,max:3,step:.1}];

const only3DModes=['blackhole','neural','crystal','meteor','nebula'];
var modePage=0;
function buildModeList(){
    const list=document.getElementById('modesList');if(!list)return;list.innerHTML='';list.className='';
    const vis=modes.filter(function(mode){return !(currentScene!=='3d'&&(only3DModes.includes(mode.key)||mode.key==='sphere'||mode.key==='galaxy'||mode.key==='honeycomb'||mode.key==='yantra'));});
    const PER=9,pages=Math.max(1,Math.ceil(vis.length/PER));
    // если активный режим на другой странице — открыть его страницу
    var ai=vis.findIndex(function(m){return m.key===currentMode;});
    if(ai>=0&&(list.dataset.forcePage!=='0'))modePage=Math.floor(ai/PER);
    if(modePage>pages-1)modePage=pages-1;if(modePage<0)modePage=0;
    const grid=document.createElement('div');grid.className='modes-icon-grid';
    vis.slice(modePage*PER,modePage*PER+PER).forEach(function(mode){
        const avail=isModeAvail(mode.key);
        const item=document.createElement('div');item.className='mode-icon-item'+(mode.key===currentMode?' active':'')+(!avail?' locked':'');
        item.innerHTML=(modeIcons[mode.key]||'')+'<span class="mode-icon-label">'+mode.name+'</span>';
        onTap(item,function(e){e.stopPropagation();
            if(!avail){showLockToast('Доступно в Pro');return;}
            currentMode=mode.key;
            if(mode.key==='deform'){dimension=1;}else if(dimension===1){dimension=0;}
            var _ss3=document.getElementById('shapeSection3D');if(_ss3)_ss3.style.display=(dimension===1?'':'none');
            list.dataset.forcePage='1';buildModeList();list.dataset.forcePage='0';haptic();if(activeTool==='settings'){buildCurrentModeSettings();enhanceSliders();}});
        grid.appendChild(item);
    });
    list.appendChild(grid);
    if(pages>1){
        const pg=document.createElement('div');pg.className='mode-pager';
        const prev=document.createElement('button');prev.textContent='‹';prev.disabled=modePage<=0;
        onTap(prev,function(e){e.stopPropagation();if(modePage>0){modePage--;list.dataset.forcePage='0';buildModeList();}});
        const cnt=document.createElement('span');cnt.className='pg-count';cnt.textContent=(modePage+1)+' / '+pages;
        const next=document.createElement('button');next.textContent='›';next.disabled=modePage>=pages-1;
        onTap(next,function(e){e.stopPropagation();if(modePage<pages-1){modePage++;list.dataset.forcePage='0';buildModeList();}});
        pg.appendChild(prev);pg.appendChild(cnt);pg.appendChild(next);list.appendChild(pg);
    }
}


function buildCurrentModeSettings(){
    const container=document.getElementById('modeSettings');container.innerHTML='';
    const label=document.getElementById('modeSettingsLabel');
    const modeName=modes.find(m=>m.key===currentMode)?.name||currentMode;
    label.textContent=modeName;label.style.display='block';
        const defs=modeParamDefs[currentMode];if(!defs)return;
    defs.forEach(def=>{
        if(def.type==='buttons'){
            const wrap=document.createElement('div');wrap.className='sub-modes';
            def.options.forEach((opt,idx)=>{
                const btn=document.createElement('div');btn.className='sub-btn'+(modeParams[currentMode][def.key]===idx?' active':'');
                btn.textContent=opt;
                onTap(btn,function(e){e.stopPropagation();modeParams[currentMode][def.key]=idx;buildCurrentModeSettings();});
                wrap.appendChild(btn);
            });
            container.appendChild(wrap);return;
        }
        const row=document.createElement('div');row.className='ctrl-row';
        const lb=document.createElement('span');lb.className='ctrl-label';lb.textContent=def.label;
        const val=document.createElement('span');val.className=def.labels?'bass-style-label':'ctrl-value';
        const cv=modeParams[currentMode][def.key];
        val.textContent=def.labels?def.labels[Math.round(cv)]:(def.step>=1?cv:cv.toFixed(1));
        const slider=document.createElement('input');slider.type='range';slider.className='ctrl-slider';slider.min=def.min;slider.max=def.max;slider.step=def.step;slider.value=cv;
        slider.addEventListener('input',e=>{e.stopPropagation();const v=+slider.value;modeParams[currentMode][def.key]=v;val.textContent=def.labels?def.labels[Math.round(v)]:(def.step>=1?v:v.toFixed(1));});
        slider.addEventListener('touchstart',e=>e.stopPropagation());
        row.appendChild(lb);row.appendChild(slider);row.appendChild(val);container.appendChild(row);
    });
}

function buildMusicParams(){
    const container=document.getElementById('musicParamsContainer');container.innerHTML='';
    // Источник звука
    const srcT=document.createElement('div');srcT.className='sheet-title';srcT.textContent='Источник';container.appendChild(srcT);
    const srcRow=document.createElement('div');srcRow.className='sub-modes';srcRow.id='audioSrcBtns';
    const canTab=!!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia);
    [['track','Трек'],['tab','Звук вкладки'],['mic','Микрофон']].forEach(function(o){
        if(o[0]==='tab'&&!canTab)return;
        const b=document.createElement('div');b.className='sub-btn'+(o[0]==='track'?' active':'');b.textContent=o[1];b.setAttribute('data-src',o[0]);
        onTap(b,function(e){e.stopPropagation();srcRow.querySelectorAll('.sub-btn').forEach(function(x){x.classList.toggle('active',x===b);});
            if(o[0]==='tab')startTabAudio();else if(o[0]==='mic')startMicAudio();else stopMusicStream();});
        srcRow.appendChild(b);
    });
    container.appendChild(srcRow);
    // Пример-треки — играют через анализатор и сразу визуализируются (без загрузки)
    const trWrap=document.createElement('div');trWrap.id='exampleTracks';trWrap.className='bgm-tracklist';
    (typeof bgmTracks!=='undefined'?bgmTracks:[]).forEach(function(tr,i){
        const el=document.createElement('div');el.className='bgm-track';
        el.innerHTML='<span class="bgm-track-num">'+(i+1)+'</span><div class="bgm-track-info"><div class="bgm-track-t">'+tr.title+'</div><div class="bgm-track-a">'+tr.artist+'</div></div>';
        onTap(el,function(e){e.stopPropagation();if(window.__playExample)window.__playExample(i);});
        trWrap.appendChild(el);
    });
    container.appendChild(trWrap);
    // Визуализация: Паттерн / Реактив (перенесено сюда из общего UI)
    canvasVisOn=false;classicVisOn=false;var _ca=document.getElementById('classicAnalyzer');if(_ca)_ca.classList.remove('on');
    const cvRow=document.createElement('div');cvRow.className='sub-modes';cvRow.id='vizSegSet';
    [['pattern','Паттерн'],['reactive','Реактив'],['test','ТестЗвук']].forEach(function(o){
        const btn=document.createElement('div');btn.className='sub-btn'+((typeof vizMode!=='undefined'&&vizMode===o[0])?' active':'');btn.textContent=o[1];btn.setAttribute('data-v',o[0]);
        onTap(btn,function(e){e.stopPropagation();if(window.__setViz)window.__setViz(o[0]);});
        cvRow.appendChild(btn);
    });
    const bpmInfo=document.createElement('span');bpmInfo.id='canvasBpmInfo';bpmInfo.style.cssText='font-size:10px;color:rgba(255,255,255,0.35);align-self:center;padding-left:10px;';
    bpmInfo.textContent=trackPassport.ready&&trackPassport.bpm?('♩ '+trackPassport.bpm+' BPM'):'';
    cvRow.appendChild(bpmInfo);container.appendChild(cvRow);
    // ═══ ТестЗвук: правила отбора/слияния ═══
    (function(){
        const P=document.createElement('div');P.id='tsPanel';P.style.display=(vizMode==='test'?'':'none');
        function title(t){const d=document.createElement('div');d.className='sheet-title';d.textContent=t;return d;}
        function slider(key,min,max,step,label){const r=document.createElement('div');r.className='ctrl-row';
            const l=document.createElement('span');l.className='ctrl-label';l.textContent=label+': '+TS[key];
            const i=document.createElement('input');i.type='range';i.className='ctrl-slider';i.min=min;i.max=max;i.step=step;i.value=TS[key];
            i.addEventListener('input',function(e){e.stopPropagation();TS[key]=+this.value;l.textContent=label+': '+this.value;code();});
            i.addEventListener('touchstart',function(e){e.stopPropagation();});i.addEventListener('touchend',function(e){e.stopPropagation();});
            r.appendChild(l);r.appendChild(i);return r;}
        function seg(key,opts,label){const w=document.createElement('div');w.appendChild(title(label));const row=document.createElement('div');row.className='sub-modes';
            opts.forEach(function(o){const b=document.createElement('div');b.className='sub-btn'+(String(TS[key])===String(o[0])?' active':'');b.textContent=o[1];
                onTap(b,function(e){e.stopPropagation();TS[key]=(typeof TS[key]==='number')?+o[0]:o[0];row.querySelectorAll('.sub-btn').forEach(function(x){x.classList.toggle('active',x===b);});code();});row.appendChild(b);});
            w.appendChild(row);return w;}
        function toggle(key,label){const row=document.createElement('div');row.className='sub-modes';const b=document.createElement('div');b.className='sub-btn'+(TS[key]?' active':'');b.textContent=label;
            onTap(b,function(e){e.stopPropagation();TS[key]=!TS[key];b.classList.toggle('active',TS[key]);code();});row.appendChild(b);return row;}
        P.appendChild(title('ТестЗвук — озвучиваем не всё'));
        P.appendChild(slider('thresh',1.0,2.0,0.01,'Только главное (порог)'));
        P.appendChild(seg('winBars',[[0.25,'Доля'],[1,'Такт'],[2,'2 такта'],[4,'Фраза']],'Слить по'));
        P.appendChild(slider('minRest',0,1.5,0.05,'Паузы (мин. отдых, с)'));
        P.appendChild(toggle('oneAtATime','Один жест за раз'));
        P.appendChild(seg('lead',[['bass','Бас'],['mid','Миды'],['energy','Энергия']],'Ведущий'));
        P.appendChild(slider('release',0.3,3,0.05,'Медленность (спад, с)'));
        P.appendChild(seg('quant',[['off','Выкл'],['beat','Доля'],['bar','Такт']],'Квантование'));
        P.appendChild(slider('forceGain',0,3,0.05,'Сила жеста'));P.appendChild(slider('brightGain',0,3,0.05,'Яркость жеста'));
        const hint=document.createElement('div');hint.style.cssText='font-size:11px;color:rgba(255,255,255,0.6);margin:6px 2px';hint.textContent='Лучше всего с включённым Дирижёром — он рисует жест.';P.appendChild(hint);
        const pre=document.createElement('pre');pre.id='tsCode';pre.style.cssText='margin-top:8px;font-size:10px;line-height:1.4;color:#9fe7c0;background:rgba(0,0,0,0.4);padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;';
        const cp=document.createElement('div');cp.className='sub-btn';cp.textContent='Копировать код';onTap(cp,function(e){e.stopPropagation();try{navigator.clipboard.writeText(pre.textContent);cp.textContent='Скопировано ✓';setTimeout(function(){cp.textContent='Копировать код';},1200);}catch(x){}});
        function code(){pre.textContent='TS = '+JSON.stringify(TS,null,1)+';';}
        code();P.appendChild(cp);P.appendChild(pre);container.appendChild(P);
    })();
    // Дирижёр / Автопилот / Следующая сцена
    const cT=document.createElement('div');cT.className='sheet-title';cT.textContent='Узоры';container.appendChild(cT);
    const cRow=document.createElement('div');cRow.className='sub-modes';cRow.id='conductorBtns';
    [[0,'Дирижёр выкл'],[1,'Дирижёр вкл']].forEach(function(o){const b=document.createElement('div');b.className='sub-btn'+((conductorOn?1:0)===o[0]?' active':'');b.textContent=o[1];b.setAttribute('data-v',o[0]);
        onTap(b,function(e){e.stopPropagation();setConductor(o[0]===1,true);});cRow.appendChild(b);});
    container.appendChild(cRow);
    const aRow=document.createElement('div');aRow.className='sub-modes';
    const ab=document.createElement('div');ab.className='sub-btn'+(autopilotOn?' active':'');ab.textContent='Автопилот';
    onTap(ab,function(e){e.stopPropagation();autopilotOn=!autopilotOn;ab.classList.toggle('active',autopilotOn);});
    const nb=document.createElement('div');nb.className='sub-btn';nb.textContent='Следующая сцена';
    onTap(nb,function(e){e.stopPropagation();if(window.__scenes)window.__scenes.next();});
    const pbb=document.createElement('div');pbb.className='sub-btn'+(beatPulsesOn?' active':'');pbb.textContent='Пульсы по биту';
    onTap(pbb,function(e){e.stopPropagation();beatPulsesOn=!beatPulsesOn;pbb.classList.toggle('active',beatPulsesOn);});
    aRow.appendChild(ab);aRow.appendChild(nb);aRow.appendChild(pbb);container.appendChild(aRow);
    musicParamDefs.forEach(def=>{
        const row=document.createElement('div');row.className='ctrl-row';
        const lb=document.createElement('span');lb.className='ctrl-label';lb.textContent=def.label;
        const slider=document.createElement('input');slider.type='range';slider.className='ctrl-slider';slider.min=def.min;slider.max=def.max;slider.step=def.step;slider.value=musicParams[def.key];
        const val=document.createElement('span');val.className=def.labels?'bass-style-label':'ctrl-value';val.textContent=def.labels?def.labels[Math.round(musicParams[def.key])]:musicParams[def.key].toFixed(1);
        slider.addEventListener('input',e=>{e.stopPropagation();const v=+slider.value;musicParams[def.key]=v;val.textContent=def.labels?def.labels[Math.round(v)]:v.toFixed(1);});
        slider.addEventListener('touchstart',e=>e.stopPropagation());
        row.appendChild(lb);row.appendChild(slider);row.appendChild(val);container.appendChild(row);
    });
}
buildModeList();

// ══════════════════════════════════════
// 6. БИТ-МАШИНА
// ══════════════════════════════════════
// beatTracks → audio.js
let beatPlaying=false,beatStep=0,beatBpm=120,beatVol=0.6,beatInterval=null,beatCtx=null,beatGain=null;
let beatStepEls=[];

// предзаполняем базовый паттерн
[0,4,8,12].forEach(i=>beatPattern.kick[i]=true);
[4,12].forEach(i=>beatPattern.snare[i]=true);
[0,2,4,6,8,10,12,14].forEach(i=>beatPattern.hihat[i]=true);
[6,14].forEach(i=>beatPattern.ohat[i]=true);
[4,12].forEach(i=>beatPattern.clap[i]=true);

function buildBeatGrid(){
    const grid=document.getElementById('beatGrid');
    grid.innerHTML='';beatStepEls=[];
    beatTracks.forEach(track=>{
        const row=document.createElement('div');row.className='beat-row';
        const label=document.createElement('div');label.className='beat-row-label';label.textContent=track.label;
        const steps=document.createElement('div');steps.className='beat-steps';
        const rowEls=[];
        for(let i=0;i<BEAT_STEPS;i++){
            const step=document.createElement('div');
            step.className='beat-step '+track.color+(beatPattern[track.key][i]?' on':'');
            if(beatPlaying&&i===beatStep)step.classList.add('current');
            onTap(step,function(e){e.stopPropagation();beatPattern[track.key][i]=!beatPattern[track.key][i];step.classList.toggle('on');haptic();});
            steps.appendChild(step);rowEls.push(step);
        }
        beatStepEls.push(rowEls);
        row.appendChild(label);row.appendChild(steps);grid.appendChild(row);
    });
}

function initBeatAudio(){
    if(beatCtx)return;
    beatCtx=new(window.AudioContext||window.webkitAudioContext)();
    beatGain=beatCtx.createGain();beatGain.gain.value=beatVol;beatGain.connect(beatCtx.destination);
}


function beatTick(){
    // подсветка текущего шага
    for(let t=0;t<beatTracks.length;t++){
        for(let s=0;s<BEAT_STEPS;s++){
            beatStepEls[t]&&beatStepEls[t][s]&&beatStepEls[t][s].classList.toggle('current',s===beatStep);
        }
    }
    // звук
    beatTracks.forEach(track=>{if(beatPattern[track.key][beatStep])playDrum(track.key);});
    // музыкальные банды для визуализации (имитируем)
    if(!musicPlaying){
        let e=0;
        if(beatPattern.kick[beatStep]){musicBands.bass=Math.max(musicBands.bass,0.7);e+=0.3;}
        if(beatPattern.snare[beatStep]){musicBands.mid=Math.max(musicBands.mid,0.6);musicBands.flux=Math.max(musicBands.flux,0.5);e+=0.2;}
        if(beatPattern.hihat[beatStep]){musicBands.high=Math.max(musicBands.high,0.5);e+=0.1;}
        if(beatPattern.clap[beatStep]){musicBands.highMid=Math.max(musicBands.highMid,0.5);musicBands.flux=Math.max(musicBands.flux,0.3);e+=0.15;}
        musicBands.energy=Math.max(musicBands.energy,e);
    }
    beatStep=(beatStep+1)%BEAT_STEPS;
}

// затухание бит-бандов

const beatPlayBtn=document.getElementById('beatPlayBtn');
onTap(beatPlayBtn,e=>{
    e.stopPropagation();initBeatAudio();
    if(beatCtx&&beatCtx.state==='suspended')beatCtx.resume();
    if(beatPlaying){beatPlaying=false;clearInterval(beatInterval);beatPlayBtn.textContent='▶';beatPlayBtn.classList.remove('playing');beatStep=0;
        for(let t=0;t<beatTracks.length;t++)for(let s=0;s<BEAT_STEPS;s++)beatStepEls[t]&&beatStepEls[t][s]&&beatStepEls[t][s].classList.remove('current');
        musicBands.bass=0;musicBands.mid=0;musicBands.high=0;musicBands.highMid=0;musicBands.energy=0;musicBands.flux=0;musicBands.lowMid=0;
    }else{beatPlaying=true;beatStep=0;beatPlayBtn.textContent='⏸';beatPlayBtn.classList.add('playing');
        beatInterval=setInterval(beatTick,60000/beatBpm/4);}
});

const beatBpmSlider=document.getElementById('beatBpmSlider'),beatBpmVal=document.getElementById('beatBpmVal');
beatBpmSlider.addEventListener('input',e=>{e.stopPropagation();beatBpm=+beatBpmSlider.value;beatBpmVal.textContent=beatBpm;
    if(beatPlaying){clearInterval(beatInterval);beatInterval=setInterval(beatTick,60000/beatBpm/4);}});
beatBpmSlider.addEventListener('touchstart',e=>e.stopPropagation());

const beatVolSlider=document.getElementById('beatVolSlider');
beatVolSlider.addEventListener('input',e=>{e.stopPropagation();beatVol=+beatVolSlider.value/100;if(beatGain)beatGain.gain.value=beatVol;});
beatVolSlider.addEventListener('touchstart',e=>e.stopPropagation());

// ══════════════════════════════════════
// 5. РЕЖИМЫ, СЦЕНЫ И НАСТРОЙКИ
// ══════════════════════════════════════
let dimension=0; // 0=2D, 1=3D
let mode1D=false;
let capture1DShape=0,capture1DLayers=0,capture1DGap=8;
let deformSub=0,deformAmp=0.3,deformFreq=3,deformRad=0.36,deformRot=0.5,deformTilt=0.35;

// Переключение 1D/2D/3D/4D

// Scene bar (верхняя панель сцен)
document.querySelectorAll('.scene-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        if(btn.classList.contains('locked')){showLockToast('3D доступен в Pro');return;}
        currentScene=btn.dataset.scene;haptic();
        document.querySelectorAll('.scene-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        // показать/скрыть секции в режимах
        document.getElementById('modes2D').style.display=(currentScene==='2d'||currentScene==='4d')?'':'none';
        document.getElementById('modes3D').style.display=currentScene==='3d'?'':'none';
        document.getElementById('modesVisual').style.display=currentScene==='visual'?'':'none';
        // показать/скрыть настройки
        const s2d=document.getElementById('shapeSection2D');if(s2d)s2d.style.display=(currentScene==='2d'||currentScene==='4d')?'':'none';
        const sc=document.getElementById('settingsCommon');if(sc)sc.style.display=(currentScene==='2d'||currentScene==='4d')?'':'none';
        const s3d=document.getElementById('shapeSectionTest');if(s3d)s3d.style.display=currentScene==='3d'?'':'none';
        const sb=document.getElementById('shapeSectionBeta');if(sb)sb.style.display=currentScene==='visual'?'':'none';
        
        // 🌿 лупа — только 3D + мобилка/планшет
        const zoomBtn=document.getElementById('zoomBtn3D');
        if(zoomBtn){if(currentScene==='3d')zoomBtn.classList.add('visible');else{zoomBtn.classList.remove('visible','active');zoomMode3D=false;}}
        const rotBtn=document.getElementById('rotateBtn3D');
        if(rotBtn){if(currentScene==='3d')rotBtn.classList.add('visible');else rotBtn.classList.remove('visible');}
        enhanceSliders();
        // скрыть старые секции
        const s1d=document.getElementById('shapeSection1D');if(s1d)s1d.style.display='none';
        const s4d=document.getElementById('shapeSection4D');if(s4d)s4d.style.display='none';
        const s3do=document.getElementById('shapeSection3D');if(s3do)s3do.style.display='none';
        // переключить dimension
        if(currentScene==='2d'){
            dimension=0;mode1D=false;trailMode=false;switchFromTest();
            for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;}
        }else if(currentScene==='3d'){
            dimension=3;mode1D=false;trailMode=false;switchToTest();
        }else if(currentScene==='4d'){
            dimension=0;mode1D=false;trailMode=false;switchFromTest();
            for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;}
        }else if(currentScene==='visual'){
            dimension=4;mode1D=false;trailMode=false;switchFromTest();
        }
        // показать/скрыть glCanvas vs threeCanvas — crossfade
        if(currentScene==='3d'){
            const glC=document.getElementById('glCanvas');
            const thC=document.getElementById('threeCanvas');
            thC.classList.remove('hidden');thC.style.display='block';thC.style.opacity='0';
            requestAnimationFrame(()=>{thC.style.transition='opacity .35s';thC.style.opacity='1';});
            glC.style.transition='opacity .35s';glC.style.opacity='0';
            setTimeout(()=>{glC.classList.add('hidden');glC.style.opacity='';glC.style.transition='';},350);
        }else{
            const glC=document.getElementById('glCanvas');
            const thC=document.getElementById('threeCanvas');
            glC.classList.remove('hidden');glC.style.opacity='0';
            requestAnimationFrame(()=>{glC.style.transition='opacity .35s';glC.style.opacity='1';});
            thC.style.transition='opacity .35s';thC.style.opacity='0';
            setTimeout(()=>{thC.classList.add('hidden');thC.style.display='none';thC.style.opacity='';thC.style.transition='';glC.style.transition='';},350);
        }
    });
});
// Mode tabs (Ручник / Автомат)
// 🌿 3D mode list — единая сетка режимов
function buildModeList3D(){
    const list=document.getElementById('modesList3D');if(!list)return;list.innerHTML='';list.className='modes-icon-grid';
    const all3D=manualModes3D.concat(autoModes3D).concat(['mandala']);
    modes.forEach(mode=>{
        if(!all3D.includes(mode.key))return;
        const avail=isModeAvail(mode.key);
        const item=document.createElement('div');item.className='mode-icon-item'+(mode.key===testMode3D?' active':'')+(!avail?' locked':'');
        item.innerHTML=(modeIcons[mode.key]||'')+'<span class="mode-icon-label">'+mode.name+'</span>';
        onTap(item,function(e){e.stopPropagation();
            if(!avail){showLockToast('Доступно в Pro');return;}
            testMode3D=mode.key;buildModeList3D();
            const ms=document.getElementById('mandalaSubSection3D');if(ms)ms.style.display=testMode3D==='mandala'?'':'none';
            const mds=document.getElementById('testMandalaSettings');if(mds)mds.style.display=testMode3D==='mandala'?'':'none';
            buildModeSettings3D();enhanceSliders();
            if(threeReady){if(testMode3D==='mandala')rebuildMandalaHome(mandalaSubMode3D);else rebuild3DParticles();}
        });
        list.appendChild(item);
    });
}
function buildModeSettings3D(){
    const container=document.getElementById('modeSettings3D');if(!container)return;container.innerHTML='';
    const label=document.getElementById('modeSettingsLabel3D');
    if(testMode3D==='vortex'||testMode3D==='mandala'){if(label)label.style.display='none';return;}
    const modeName=modes.find(m=>m.key===testMode3D)?.name||testMode3D;
    if(label){label.textContent=modeName;label.style.display='block';}
    const defs=modeParamDefs[testMode3D];if(!defs)return;
    defs.forEach(def=>{
        if(def.type==='buttons'){const wrap=document.createElement('div');wrap.className='sub-modes';
            def.options.forEach((opt,idx)=>{const btn=document.createElement('div');btn.className='sub-btn'+(modeParams[testMode3D][def.key]===idx?' active':'');btn.textContent=opt;
                onTap(btn,function(e){e.stopPropagation();modeParams[testMode3D][def.key]=idx;buildModeSettings3D();});wrap.appendChild(btn);});
            container.appendChild(wrap);return;}
        const row=document.createElement('div');row.className='ctrl-row';
        const lb=document.createElement('span');lb.className='ctrl-label';lb.textContent=def.label;
        const val=document.createElement('span');val.className='ctrl-value';const cv=modeParams[testMode3D][def.key];
        val.textContent=def.step>=1?cv:cv.toFixed(1);
        const slider=document.createElement('input');slider.type='range';slider.className='ctrl-slider';slider.min=def.min;slider.max=def.max;slider.step=def.step;slider.value=cv;
        slider.addEventListener('input',e=>{e.stopPropagation();const v=+slider.value;modeParams[testMode3D][def.key]=v;val.textContent=def.step>=1?v:v.toFixed(1);});
        slider.addEventListener('touchstart',e=>e.stopPropagation());
        row.appendChild(lb);row.appendChild(slider);row.appendChild(val);container.appendChild(row);
    });
}
buildModeList3D();
document.querySelectorAll('#mandalaSubBtns3D .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        mandalaSubMode3D=+btn.dataset.msub;
        document.querySelectorAll('#mandalaSubBtns3D .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        if(threeReady){if(mandalaSubMode3D===2)rebuild3DParticles();else rebuildMandalaHome(mandalaSubMode3D);}
    });
});
// betaВизуал pattern buttons (in modes panel)
document.querySelectorAll('#betaPatternBtns2 .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        betaPattern=+btn.dataset.bp;
        document.querySelectorAll('#betaPatternBtns2 .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
    });
});
document.querySelectorAll('#dimensionBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        const dim=btn.dataset.dim;
        
        if(dim==='2d')dimension=0;else if(dim==='3d')dimension=1;else if(dim==='4d')dimension=2;else if(dim==='test')dimension=3;else if(dim==='beta')dimension=4;else dimension=0;
        document.querySelectorAll('#dimensionBtns .sub-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('shapeSection1D').style.display=mode1D?'':'none';
        document.getElementById('shapeSection2D').style.display=(!mode1D&&dimension===0)?'':'none';
        document.getElementById('shapeSection3D').style.display=dimension===1?'':'none';
        document.getElementById('shapeSection4D').style.display=dimension===2?'':'none';
        document.getElementById('shapeSectionTest').style.display=dimension===3?'':'none';
        document.getElementById('settingsCommon').style.display=(!mode1D&&dimension===0)?'':'none';
        for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;}
        if(dimension===3)switchToTest();else if(dimension===4){switchFromTest();}else{switchFromTest();if(dimension===2)init4D();}
    });
});
// 1D захват
document.querySelectorAll('#capture1DBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();capture1DShape=+btn.dataset.bar;
        document.querySelectorAll('#capture1DBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        document.getElementById('capture1DSlider').parentElement.style.display=capture1DShape>0?'flex':'none';
        if(capture1DShape>0&&capture1DLayers<1){capture1DLayers=1;document.getElementById('capture1DSlider').value=1;document.getElementById('capture1DVal').textContent='1';}
                if(capture1DShape>0&&mode1D){if(wireCtx){if(wc){wc.width=W;wc.height=H;}}}
        else if(mode1D){if(typeof wireCtx!=='undefined'&&wireCtx)wireCtx.clearRect(0,0,W,H);}
    });
});
const c1dSl=document.getElementById('capture1DSlider'),c1dVal=document.getElementById('capture1DVal');
if(c1dSl){c1dSl.addEventListener('input',e=>{e.stopPropagation();capture1DLayers=+c1dSl.value;c1dVal.textContent=capture1DLayers;});c1dSl.addEventListener('touchstart',e=>e.stopPropagation());}

function getCapture1DRadii(){
    const maxR=Math.min(W,H)*0.45,minR=maxR*0.08,step=(maxR-minR)/16;
    const radii=[];for(let i=0;i<capture1DLayers;i++)radii.push(minR+step*i);return radii;
}
function applyCapture1D(idx){
    if(!mode1D||capture1DShape===0||capture1DLayers<1)return;
    const cx=W/2,cy=H/2;
    const px=posX[idx],py=posY[idx];
    const dx=px-cx,dy=py-cy;
    const hdx=homeX[idx]-cx,hdy=homeY[idx]-cy;
    const gap=capture1DGap;
    const radii=getCapture1DRadii();

    if(capture1DShape===1){// круги
        const dist=Math.sqrt(dx*dx+dy*dy)||0.1;
        const homeDist=Math.sqrt(hdx*hdx+hdy*hdy);
        let zone=radii.length;
        for(let r=0;r<radii.length;r++){if(homeDist<radii[r]-gap){zone=r;break;}}
        const inner=zone>0?radii[zone-1]+gap:0;
        const outer=zone<radii.length?radii[zone]-gap:Math.max(W,H);
        const nx=dx/dist,ny=dy/dist;
        if(dist>outer){posX[idx]=cx+nx*outer;posY[idx]=cy+ny*outer;velX[idx]*=-.1;velY[idx]*=-.1;}
        if(inner>0&&dist<inner){posX[idx]=cx+nx*inner;posY[idx]=cy+ny*inner;velX[idx]*=-.1;velY[idx]*=-.1;}
    }else if(capture1DShape===2){// квадраты
        const homeCheb=Math.max(Math.abs(hdx),Math.abs(hdy));
        let zone=radii.length;
        for(let r=0;r<radii.length;r++){if(homeCheb<radii[r]-gap){zone=r;break;}}
        const inner=zone>0?radii[zone-1]+gap:0;
        const outer=zone<radii.length?radii[zone]-gap:Math.max(W,H);
        if(dx>outer){posX[idx]=cx+outer;velX[idx]*=-.1;}
        if(dx<-outer){posX[idx]=cx-outer;velX[idx]*=-.1;}
        if(dy>outer){posY[idx]=cy+outer;velY[idx]*=-.1;}
        if(dy<-outer){posY[idx]=cy-outer;velY[idx]*=-.1;}
        if(inner>0&&Math.abs(posX[idx]-cx)<inner&&Math.abs(posY[idx]-cy)<inner){
            const adx=Math.abs(posX[idx]-cx),ady=Math.abs(posY[idx]-cy);
            if(inner-adx<inner-ady){posX[idx]=cx+Math.sign(posX[idx]-cx||1)*inner;velX[idx]*=-.1;}
            else{posY[idx]=cy+Math.sign(posY[idx]-cy||1)*inner;velY[idx]*=-.1;}
        }
    }else if(capture1DShape===3){// треугольники
        let zone=radii.length;
        for(let r=0;r<radii.length;r++){
            let ins=true;for(let k=0;k<3;k++){const a=k*Math.PI*2/3-Math.PI/2;if((radii[r]-gap)*0.5-(hdx*Math.cos(a)+hdy*Math.sin(a))<0){ins=false;break;}}
            if(ins){zone=r;break;}
        }
        const outerR=zone<radii.length?radii[zone]-gap:Math.max(W,H)*2;
        if(outerR<Math.max(W,H)*2){for(let k=0;k<3;k++){const a=k*Math.PI*2/3-Math.PI/2,nx=Math.cos(a),ny=Math.sin(a);
            const d=outerR*0.5-((posX[idx]-cx)*nx+(posY[idx]-cy)*ny);if(d<0){posX[idx]+=nx*(-d+1);posY[idx]+=ny*(-d+1);velX[idx]*=-.1;velY[idx]*=-.1;}}}
        const innerR=zone>0?radii[zone-1]+gap:0;
        if(innerR>0){for(let k=0;k<3;k++){const a=k*Math.PI*2/3-Math.PI/2,nx=Math.cos(a),ny=Math.sin(a);
            const d=innerR*0.5-((posX[idx]-cx)*nx+(posY[idx]-cy)*ny);if(d>0){posX[idx]-=nx*(d+1);posY[idx]-=ny*(d+1);velX[idx]*=-.1;velY[idx]*=-.1;}}}
    }
}
// 2D формы
document.querySelectorAll('#shapeBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        if(btn.classList.contains('locked')){showLockToast('Доступно в Pro');return;}
        document.querySelectorAll('#shapeBtns .sub-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;if(sDTheta){sDTheta[i]=0;sDPhi[i]=0;}}
        if(btn.dataset.shape==='deform'){
            dimension=1;canvasShape=0;
            const s3d=document.getElementById('shapeSection3D');if(s3d)s3d.style.display='';
        }else{
            if(dimension===1)dimension=0;
            canvasShape=+btn.dataset.shape;
            const s3d=document.getElementById('shapeSection3D');if(s3d)s3d.style.display='none';
        }
    });
});
// 3D деформация
document.querySelectorAll('#deformBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        deformSub=+btn.dataset.sub;
        document.querySelectorAll('#deformBtns .sub-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
    });
});
const dAmpSl=document.getElementById('deformAmpSlider'),dAmpVal=document.getElementById('deformAmpVal');
dAmpSl.addEventListener('input',e=>{e.stopPropagation();deformAmp=+dAmpSl.value/100;dAmpVal.textContent=deformAmp.toFixed(2);});
dAmpSl.addEventListener('touchstart',e=>e.stopPropagation());
const dFreqSl=document.getElementById('deformFreqSlider'),dFreqVal=document.getElementById('deformFreqVal');
dFreqSl.addEventListener('input',e=>{e.stopPropagation();deformFreq=+dFreqSl.value;dFreqVal.textContent=deformFreq;});
dFreqSl.addEventListener('touchstart',e=>e.stopPropagation());
const dRadSl=document.getElementById('deformRadSlider');
dRadSl.addEventListener('input',e=>{e.stopPropagation();deformRad=+dRadSl.value/100;});
dRadSl.addEventListener('touchstart',e=>e.stopPropagation());
const dRotSl=document.getElementById('deformRotSlider');
dRotSl.addEventListener('input',e=>{e.stopPropagation();deformRot=+dRotSl.value/100;});
dRotSl.addEventListener('touchstart',e=>e.stopPropagation());
const dTiltSl=document.getElementById('deformTiltSlider');
dTiltSl.addEventListener('input',e=>{e.stopPropagation();deformTilt=+dTiltSl.value/100;});
dTiltSl.addEventListener('touchstart',e=>e.stopPropagation());
// Test mode sliders
// rebuild3DParticles, applyMandalaConstraint3D, rebuildMandalaHome → scene3d.js
const t3dSliders=[
{id:'t3dForce',vid:'t3dForceV',div:100,f:v=>v.toFixed(2),s:v=>{vortexForce3D=v;}},
{id:'t3dSpin',vid:'t3dSpinV',div:100,f:v=>v.toFixed(2),s:v=>{vortexSpin3D=v;}},
{id:'t3dHome',vid:'t3dHomeV',div:1000,f:v=>v.toFixed(3),s:v=>{homeDamping3D=v;}},
{id:'t3dDamp',vid:'t3dDampV',div:100,f:v=>v.toFixed(2),s:v=>{velDamping3D=v;}},
{id:'t3dSpeed',vid:'t3dSpeedV',div:10,f:v=>v.toFixed(1),s:v=>{maxSpeed3D=v;}},
{id:'t3dSize',vid:'t3dSizeV',div:1000,f:v=>v.toFixed(3),s:v=>{particleSize3D=v;}},
{id:'t3dBright',vid:'t3dBrightV',div:10,f:v=>v.toFixed(1),s:v=>{brightness3D=v;}},
{id:'t3dGap',vid:'t3dGapV',div:100,f:v=>v.toFixed(2),s:v=>{particleGap3D=v;},rebuild:true},
{id:'t3dZoom',vid:'t3dZoomV',div:1,f:v=>String(v),s:v=>{if(camera3D)camera3D.position.setLength(v);}}
];
t3dSliders.forEach(d=>{const sl=document.getElementById(d.id),vl=document.getElementById(d.vid);
if(sl){sl.addEventListener('input',e=>{e.stopPropagation();const v=+sl.value/d.div;d.s(v);vl.textContent=d.f(v);if(d.rebuild)rebuild3DParticles();});sl.addEventListener('touchstart',e=>e.stopPropagation());}});
// Test mode switcher: Вихрь / Мандала
document.querySelectorAll('#testModeBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        testMode3D=btn.dataset.tmode;
        document.querySelectorAll('#testModeBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        document.getElementById('testVortexSettings').style.display=testMode3D==='vortex'?'':'none';
        document.getElementById('testMandalaSettings').style.display=testMode3D==='mandala'?'':'none';
        if(threeReady){if(testMode3D==='vortex')rebuild3DParticles();else rebuildMandalaHome(mandalaSubMode3D);}
    });
});
// Mandala sub-mode switcher
document.querySelectorAll('#mandalaSubBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        mandalaSubMode3D=+btn.dataset.msub;
        document.querySelectorAll('#mandalaSubBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        if(threeReady){if(mandalaSubMode3D===2)rebuild3DParticles();else rebuildMandalaHome(mandalaSubMode3D);}
    });
});
// Mandala sliders
const mSliders=[
{id:'t3dRays',vid:'t3dRaysV',div:1,f:v=>String(v),s:v=>{mandalaRays3D=v;},rebuild:true},
{id:'t3dRings',vid:'t3dRingsV',div:1,f:v=>String(v),s:v=>{mandalaRings3D=v;},rebuild:true},
{id:'t3dMRot',vid:'t3dMRotV',div:100,f:v=>v.toFixed(2),s:v=>{mandalaRot3D=v;}},
{id:'t3dPetals',vid:'t3dPetalsV',div:100,f:v=>v.toFixed(2),s:v=>{mandalaPetals3D=v;}}
];
mSliders.forEach(d=>{const sl=document.getElementById(d.id),vl=document.getElementById(d.vid);
if(sl){sl.addEventListener('input',e=>{e.stopPropagation();const v=+sl.value/d.div;d.s(v);vl.textContent=d.f(v);if(d.rebuild&&threeReady&&testMode3D==='mandala'&&mandalaSubMode3D!==2)rebuildMandalaHome(mandalaSubMode3D);});sl.addEventListener('touchstart',e=>e.stopPropagation());}});
// Beta visual sliders
const betaSliderDefs=[
{id:'betaSpeed',vid:'betaSpeedV',div:100,s:v=>{betaSpeed=v;}},
{id:'betaTwist',vid:'betaTwistV',div:100,s:v=>{betaTwist=v;}},
{id:'betaZoom',vid:'betaZoomV',div:100,s:v=>{betaZoom=v;}},
{id:'betaBright',vid:'betaBrightV',div:10,s:v=>{betaBright=v;}},
{id:'betaSize',vid:'betaSizeV',div:100,s:v=>{betaSize=v;}},
{id:'betaDensity',vid:'betaDensityV',div:100,s:v=>{betaDensity=v;}},
{id:'betaPulse',vid:'betaPulseV',div:100,s:v=>{betaPulse=v;}}
];

// Beta pattern switcher
document.querySelectorAll('#betaPatternBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        betaPattern=+btn.dataset.bp;
        document.querySelectorAll('#betaPatternBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
    });
});
// Beta mouse rotation (right-drag) + scroll zoom
document.getElementById('glCanvas').addEventListener('contextmenu',e=>{if(dimension===4)e.preventDefault();});
document.getElementById('glCanvas').addEventListener('wheel',e=>{if(dimension===4){betaZoom=Math.max(0.1,Math.min(3.0,betaZoom+e.deltaY*0.002));e.preventDefault();}},{passive:false});
betaSliderDefs.forEach(d=>{const sl=document.getElementById(d.id),vl=document.getElementById(d.vid);
if(sl){sl.addEventListener('input',e=>{e.stopPropagation();const v=+sl.value/d.div;d.s(v);vl.textContent=v.toFixed(2);});sl.addEventListener('touchstart',e=>e.stopPropagation());}});

// 🌿 4D trail sliders — здесь время обретает форму
const trailFadeSl=document.getElementById('trailFadeSlider'),trailFadeValEl=document.getElementById('trailFadeVal');
if(trailFadeSl){trailFadeSl.addEventListener('input',e=>{e.stopPropagation();const v=+trailFadeSl.value/100;trailFade=0.01+(1-v)*0.29;trailFadeValEl.textContent=v.toFixed(2);});trailFadeSl.addEventListener('touchstart',e=>e.stopPropagation());}
const trailLayersSl=document.getElementById('trailLayersSlider'),trailLayersValEl=document.getElementById('trailLayersVal');
if(trailLayersSl){trailLayersSl.addEventListener('input',e=>{e.stopPropagation();trailLayers=+trailLayersSl.value;trailLayersValEl.textContent=trailLayers;});trailLayersSl.addEventListener('touchstart',e=>e.stopPropagation());}
const trailSpreadSl=document.getElementById('trailSpreadSlider'),trailSpreadValEl=document.getElementById('trailSpreadVal');
if(trailSpreadSl){trailSpreadSl.addEventListener('input',e=>{e.stopPropagation();trailSpread=+trailSpreadSl.value;trailSpreadValEl.textContent=trailSpread;});trailSpreadSl.addEventListener('touchstart',e=>e.stopPropagation());}
// --- 4D: Объёмный куб с песком ---
let p3X,p3Y,p3Z,v3X,v3Y,v3Z;
let vol4dSize=0.35,vol4dChaos=0.3;
let cubeRotX=0.4,cubeRotY=0.3,cubeVelX=0,cubeVelY=0;
let cubeDragging=false,cubeDragStartX=0,cubeDragStartY=0;
const GRAVITY=0.15;

function init4D(){
    if(!p3X||p3X.length!==TOTAL){
        p3X=new Float32Array(TOTAL);p3Y=new Float32Array(TOTAL);p3Z=new Float32Array(TOTAL);
        v3X=new Float32Array(TOTAL);v3Y=new Float32Array(TOTAL);v3Z=new Float32Array(TOTAL);
    }
    const s=Math.min(W,H)*vol4dSize;
    // частицы заполняют нижние 60%
    for(let i=0;i<TOTAL;i++){
        p3X[i]=(Math.random()*2-1)*s*.9;
        p3Y[i]=s*.2+Math.random()*s*.7; // нижняя часть
        p3Z[i]=(Math.random()*2-1)*s*.9;
        v3X[i]=0;v3Y[i]=0;v3Z[i]=0;
    }
    }

// свайп-вращение куба
document.addEventListener('mousedown',e=>{
    if(dimension!==2||isUI(e))return;
    cubeDragging=true;cubeDragStartX=e.clientX;cubeDragStartY=e.clientY;e.preventDefault();
});
document.addEventListener('mousemove',e=>{
    if(!cubeDragging)return;
    const dx=e.clientX-cubeDragStartX,dy=e.clientY-cubeDragStartY;
    cubeVelY=dx*.005;cubeVelX=dy*.005;
    cubeRotY+=cubeVelY;cubeRotX+=cubeVelX;
    cubeDragStartX=e.clientX;cubeDragStartY=e.clientY;
});
document.addEventListener('mouseup',()=>{cubeDragging=false;});
document.addEventListener('touchstart',e=>{
    if(dimension!==2||isUI(e))return;
    cubeDragging=true;cubeDragStartX=e.touches[0].clientX;cubeDragStartY=e.touches[0].clientY;
},{passive:true});
document.addEventListener('touchmove',e=>{
    if(!cubeDragging||dimension!==2)return;
    const dx=e.touches[0].clientX-cubeDragStartX,dy=e.touches[0].clientY-cubeDragStartY;
    cubeVelY=dx*.005;cubeVelX=dy*.005;
    cubeRotY+=cubeVelY;cubeRotX+=cubeVelX;
    cubeDragStartX=e.touches[0].clientX;cubeDragStartY=e.touches[0].clientY;
},{passive:true});
document.addEventListener('touchend',e=>{if(dimension===2)cubeDragging=false;});

const v4dSizeSl=document.getElementById('vol4dSizeSlider');
if(v4dSizeSl){v4dSizeSl.addEventListener('input',e=>{e.stopPropagation();vol4dSize=+v4dSizeSl.value/100;});
v4dSizeSl.addEventListener('touchstart',e=>e.stopPropagation());}
const v4dChaosSl=document.getElementById('vol4dChaosSlider');
if(v4dChaosSl){v4dChaosSl.addEventListener('input',e=>{e.stopPropagation();vol4dChaos=+v4dChaosSl.value/100;});
v4dChaosSl.addEventListener('touchstart',e=>e.stopPropagation());}

function update4D(dt){
    if(!p3X)return;
    const dt60=Math.min(3,dt*60);
    const s=Math.min(W,H)*vol4dSize;
    if(!cubeDragging){cubeVelX*=.95;cubeVelY*=.95;cubeRotX+=cubeVelX;cubeRotY+=cubeVelY;}
    // гравитация мировая → локальная
    const cx1=Math.cos(-cubeRotX),sx1=Math.sin(-cubeRotX);
    const cy1=Math.cos(-cubeRotY),sy1=Math.sin(-cubeRotY);
    let gx=0,gy=GRAVITY,gz=0;
    let gx2=gx*cy1+gz*sy1,gz2=-gx*sy1+gz*cy1;gx=gx2;gz=gz2;
    let gy2=gy*cx1-gz*sx1,gz3=gy*sx1+gz*cx1;gy=gy2;gz=gz3;

    // сетка плотности для давления
    const GCELLS=8,cellSize=s*2/GCELLS;
    const grid=new Int32Array(GCELLS*GCELLS*GCELLS);
    const gxArr=new Float32Array(TOTAL),gyArr=new Float32Array(TOTAL),gzArr=new Float32Array(TOTAL);
    // подсчёт плотности
    for(let i=0;i<TOTAL;i++){
        const ci=Math.min(GCELLS-1,Math.max(0,Math.floor((p3X[i]+s)/cellSize)));
        const cj=Math.min(GCELLS-1,Math.max(0,Math.floor((p3Y[i]+s)/cellSize)));
        const ck=Math.min(GCELLS-1,Math.max(0,Math.floor((p3Z[i]+s)/cellSize)));
        gxArr[i]=ci;gyArr[i]=cj;gzArr[i]=ck;
        grid[ci+cj*GCELLS+ck*GCELLS*GCELLS]++;
    }
    const maxDensity=Math.floor(TOTAL/(GCELLS*GCELLS*GCELLS)*2.5);
    const pressureStr=0.08;

    for(let i=0;i<TOTAL;i++){
        // гравитация
        v3X[i]+=gx*dt60;v3Y[i]+=gy*dt60;v3Z[i]+=gz*dt60;
        // давление — отталкивание из плотных зон
        const ci=gxArr[i]|0,cj=gyArr[i]|0,ck=gzArr[i]|0;
        const density=grid[ci+cj*GCELLS+ck*GCELLS*GCELLS];
        if(density>maxDensity){
            const excess=(density-maxDensity)/maxDensity;
            // градиент давления — смотрим соседние ячейки
            for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++)for(let dk=-1;dk<=1;dk++){
                if(di===0&&dj===0&&dk===0)continue;
                const ni=ci+di,nj=cj+dj,nk=ck+dk;
                if(ni<0||ni>=GCELLS||nj<0||nj>=GCELLS||nk<0||nk>=GCELLS)continue;
                const nd=grid[ni+nj*GCELLS+nk*GCELLS*GCELLS];
                if(nd<density){
                    const push=excess*pressureStr*dt60;
                    v3X[i]+=di*push;v3Y[i]+=dj*push;v3Z[i]+=dk*push;
                }
            }
        }
        // музыка — встряска
        if((musicPlaying||beatPlaying)&&musicBands.energy>.01){
            const e=musicBands.energy;
            v3X[i]+=(Math.random()-.5)*e*.1*dt60;
            v3Y[i]+=(Math.random()-.5)*e*.1*dt60;
            v3Z[i]+=(Math.random()-.5)*e*.1*dt60;
        }
        // затухание (вязкость)
        v3X[i]*=.85;v3Y[i]*=.85;v3Z[i]*=.85;
        p3X[i]+=v3X[i]*dt60;p3Y[i]+=v3Y[i]*dt60;p3Z[i]+=v3Z[i]*dt60;
        // стенки
        if(p3X[i]>s){p3X[i]=s;v3X[i]*=-.03;}if(p3X[i]<-s){p3X[i]=-s;v3X[i]*=-.03;}
        if(p3Y[i]>s){p3Y[i]=s;v3Y[i]*=-.03;}if(p3Y[i]<-s){p3Y[i]=-s;v3Y[i]*=-.03;}
        if(p3Z[i]>s){p3Z[i]=s;v3Z[i]*=-.03;}if(p3Z[i]<-s){p3Z[i]=-s;v3Z[i]*=-.03;}
    }
    // проекция
    const cx=W/2,cy=H/2;
    const crx=Math.cos(cubeRotX),srx=Math.sin(cubeRotX);
    const cry=Math.cos(cubeRotY),sry=Math.sin(cubeRotY);
    const persp=800;
    for(let i=0;i<TOTAL;i++){
        let x=p3X[i],y=p3Y[i],z=p3Z[i];
        let x2=x*cry+z*sry,z2=-x*sry+z*cry;x=x2;z=z2;
        let y2=y*crx-z*srx,z3=y*srx+z*crx;y=y2;z=z3;
        const sc=persp/(persp+z);
        posX[i]=cx+x*sc;posY[i]=cy+y*sc;
    }
}

function drawWireframe(){
    if(!wireCtx)return;
    wireCtx.clearRect(0,0,W,H);
    const s=Math.min(W,H)*vol4dSize;
    const cx=W/2,cy=H/2;
    const crx=Math.cos(cubeRotX),srx=Math.sin(cubeRotX);
    const cry=Math.cos(cubeRotY),sry=Math.sin(cubeRotY);
    const persp=800;
    const verts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    const proj=verts.map(v=>{
        let x=v[0]*s,y=v[1]*s,z=v[2]*s;
        let x2=x*cry+z*sry,z2=-x*sry+z*cry;x=x2;z=z2;
        let y2=y*crx-z*srx,z3=y*srx+z*crx;y=y2;z=z3;
        const sc=persp/(persp+z);
        return[cx+x*sc,cy+y*sc];
    });
    wireCtx.strokeStyle='rgba(255,255,255,0.35)';
    wireCtx.lineWidth=1.5;
    wireCtx.beginPath();
    edges.forEach(e=>{wireCtx.moveTo(proj[e[0]][0],proj[e[0]][1]);wireCtx.lineTo(proj[e[1]][0],proj[e[1]][1]);});
    wireCtx.stroke();
}

let spinDirection=1,spinSpeed=1,zoomLevel=1,brightnessLevel=1,userGap=3,desiredParticles=0;
// 🌿 4D — время стало видимым
let trailMode=false,trailFade=0.08,trailLayers=3,trailSpread=15,trailLayerBuf=null;

// --- Барьеры ---
let barrierShape=0,barrierLayers=1; // 0=нет,1=круг,2=квадрат,3=треугольник
document.querySelectorAll('#barrierBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        barrierShape=+btn.dataset.bar;
        document.querySelectorAll('#barrierBtns .sub-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('barrierLayersRow').style.display=barrierShape>0?'flex':'none';
                if(barrierShape>0){if(wc){wc.width=W;wc.height=H;}}
        else{if(dimension!==2){if(typeof wireCtx!=='undefined'&&wireCtx)wireCtx.clearRect(0,0,W,H);}}
    });
});
const bLayersSl=document.getElementById('barrierLayersSlider'),bLayersVal=document.getElementById('barrierLayersVal');
if(bLayersSl){bLayersSl.addEventListener('input',e=>{e.stopPropagation();barrierLayers=+bLayersSl.value;bLayersVal.textContent=barrierLayers;});
bLayersSl.addEventListener('touchstart',e=>e.stopPropagation());}

function getBarrierRadii(){
    const maxR=Math.min(W,H)*0.45;
    const minR=maxR*0.08;
    const step=(maxR-minR)/16;
    const radii=[];
    for(let i=0;i<barrierLayers;i++)radii.push(minR+step*i);
    return radii;
}

function applyBarrierCollision(i){
    if(barrierShape===0||dimension!==0||mode1D)return;
    const cx=W/2,cy=H/2;
    const px=posX[i],py=posY[i];
    const dx=px-cx,dy=py-cy;
    const radii=getBarrierRadii();
    if(barrierShape===1){// круги
        const dist=Math.sqrt(dx*dx+dy*dy);
        const homeDist=Math.sqrt((homeX[i]-cx)**2+(homeY[i]-cy)**2);
        // найти зону частицы по домашней позиции
        let homeZone=radii.length;
        for(let r=0;r<radii.length;r++){if(homeDist<radii[r]){homeZone=r;break;}}
        // ограничить текущую позицию этой зоной
        const innerR=homeZone>0?radii[homeZone-1]:0;
        const outerR=homeZone<radii.length?radii[homeZone]:Math.max(W,H);
        if(dist<innerR+1){
            const nx=dx/(dist||1),ny=dy/(dist||1);
            posX[i]=cx+nx*(innerR+1);posY[i]=cy+ny*(innerR+1);
            velX[i]*=-.3;velY[i]*=-.3;
        }else if(dist>outerR-1){
            const nx=dx/(dist||1),ny=dy/(dist||1);
            posX[i]=cx+nx*(outerR-1);posY[i]=cy+ny*(outerR-1);
            velX[i]*=-.3;velY[i]*=-.3;
        }
    }else if(barrierShape===2){// квадраты
        const chebHome=Math.max(Math.abs(homeX[i]-cx),Math.abs(homeY[i]-cy));
        let homeZone=radii.length;
        for(let r=0;r<radii.length;r++){if(chebHome<radii[r]){homeZone=r;break;}}
        const innerR=homeZone>0?radii[homeZone-1]:0;
        const outerR=homeZone<radii.length?radii[homeZone]:Math.max(W,H);
        const cheb=Math.max(Math.abs(dx),Math.abs(dy));
        if(cheb<innerR+1){
            if(Math.abs(dx)>Math.abs(dy)){posX[i]=cx+Math.sign(dx)*(innerR+1);velX[i]*=-.3;}
            else{posY[i]=cy+Math.sign(dy)*(innerR+1);velY[i]*=-.3;}
        }else if(cheb>outerR-1){
            if(Math.abs(dx)>Math.abs(dy)){posX[i]=cx+Math.sign(dx)*(outerR-1);velX[i]*=-.3;}
            else{posY[i]=cy+Math.sign(dy)*(outerR-1);velY[i]*=-.3;}
        }
    }else if(barrierShape===3){// треугольники
        const dist=Math.sqrt(dx*dx+dy*dy);
        const angle=Math.atan2(dy,dx);
        // расстояние до стороны равностороннего треугольника
        function triDist(R){
            let minD=R;
            for(let k=0;k<3;k++){
                const a=k*Math.PI*2/3-Math.PI/2;
                const nx=Math.cos(a),ny=Math.sin(a);
                const d=R*0.5-(dx*nx+dy*ny);
                minD=Math.min(minD,d);
            }
            return minD;
        }
        const homeDx=homeX[i]-cx,homeDy=homeY[i]-cy;
        function triDistHome(R){
            let minD=R;
            for(let k=0;k<3;k++){
                const a=k*Math.PI*2/3-Math.PI/2;
                minD=Math.min(minD,R*0.5-(homeDx*Math.cos(a)+homeDy*Math.sin(a)));
            }
            return minD;
        }
        let homeZone=radii.length;
        for(let r=0;r<radii.length;r++){if(triDistHome(radii[r])>0){homeZone=r;break;}}
        const innerR=homeZone>0?radii[homeZone-1]:0;
        const outerR=homeZone<radii.length?radii[homeZone]:Math.max(W,H)*2;
        // проверяем выход за внешний барьер
        if(outerR<Math.max(W,H)*2){
            const dOuter=triDist(outerR);
            if(dOuter<1){
                velX[i]*=-.3;velY[i]*=-.3;
                posX[i]+=(cx-px)*.05;posY[i]+=(cy-py)*.05;
            }
        }
        // проверяем вход во внутренний барьер
        if(innerR>0){
            const dInner=triDist(innerR);
            if(dInner>-1){
                velX[i]*=-.3;velY[i]*=-.3;
                posX[i]-=(cx-px)*.05;posY[i]-=(cy-py)*.05;
            }
        }
    }
}

const dirCW=document.getElementById('dirCW'),dirCCW=document.getElementById('dirCCW');
onTap(dirCW,e=>{e.stopPropagation();spinDirection=1;dirCW.classList.add('active');dirCCW.classList.remove('active');});
onTap(dirCCW,e=>{e.stopPropagation();spinDirection=-1;dirCCW.classList.add('active');dirCW.classList.remove('active');});
document.getElementById('speedSlider').addEventListener('input',function(e){e.stopPropagation();spinSpeed=+this.value/100;});
document.getElementById('speedSlider').addEventListener('touchstart',e=>e.stopPropagation());
document.getElementById('zoomSlider').addEventListener('input',function(e){e.stopPropagation();zoomLevel=+this.value/100;});
document.getElementById('zoomSlider').addEventListener('touchstart',e=>e.stopPropagation());
(function(){var _b=document.getElementById('brightnessSlider');if(_b){_b.addEventListener('input',function(e){e.stopPropagation();brightnessLevel=+this.value/100;});_b.addEventListener('touchstart',function(e){e.stopPropagation();});}})();
(document.getElementById('gapSlider')||{addEventListener:function(){}}).addEventListener('input',function(e){e.stopPropagation();userGap=+this.value;desiredParticles=0;cancelAnimationFrame(animFrame);init();lastTime=performance.now();animFrame=requestAnimationFrame(loop);});
(document.getElementById('gapSlider')||{addEventListener:function(){}}).addEventListener('touchstart',e=>e.stopPropagation());

// --- Палитры ---
// палитры → palettes.js
let currentPalette='default',currentStops=JSON.parse(JSON.stringify(palettes.default.stops)),targetStops=JSON.parse(JSON.stringify(palettes.default.stops)),transitionProgress=1;

const customPalettePanel=document.getElementById('customPalettePanel');let customPanelOpen=false;let customColors=['#4a47a3','#e63946','#f4a261','#2a9d8f','#48cae4'];
function toggleCustomPanel(){customPanelOpen=!customPanelOpen;customPalettePanel.classList.toggle('open',customPanelOpen);if(customPanelOpen)buildCustomStops();}
customPalettePanel.addEventListener('click',e=>e.stopPropagation());
function getCustomGradientCSS(){return'linear-gradient(to right,'+customColors.join(',')+')';}
function getCustomStops(){return customColors.map((c,i)=>{const hsv=hexToHSV(c);return{pos:customColors.length>1?i/(customColors.length-1):0,h:hsv.h,s:hsv.s,v:hsv.v};});}
function applyCustomPalette(){if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);targetStops=getCustomStops();transitionProgress=0;currentPalette='custom';buildPaletteList();}
// 🌿 Color Picker — инлайн сбоку, как продолжение панели
let cpHue_=0,cpSat_=100,cpVal_=100,cpEditIdx=-1;
function cpUpdate(){
    const rgb=hsv2rgbCPU(cpHue_,cpSat_/100,cpVal_/100);
    const hex='#'+((1<<24)+(rgb[0]<<16)+(rgb[1]<<8)+rgb[2]).toString(16).slice(1);
    document.getElementById('cpInlinePreview').style.background=hex;
    document.getElementById('cpInlineHex').textContent=hex.toUpperCase();
    const rgbFull=hsv2rgbCPU(cpHue_,1,1);
    document.getElementById('cpSatRange').style.background='linear-gradient(to right,#888,rgb('+rgbFull[0]+','+rgbFull[1]+','+rgbFull[2]+'))';
    const rgbBr=hsv2rgbCPU(cpHue_,cpSat_/100,1);
    document.getElementById('cpValRange').style.background='linear-gradient(to right,#000,rgb('+rgbBr[0]+','+rgbBr[1]+','+rgbBr[2]+'))';
    if(cpEditIdx>=0&&cpEditIdx<customColors.length){
        customColors[cpEditIdx]=hex;
        document.getElementById('customPreview').style.background=getCustomGradientCSS();
        if(currentPalette==='custom')applyCustomPalette();
        buildCustomStops();
    }
}
['cpHueRange','cpSatRange','cpValRange'].forEach(id=>{
    const el=document.getElementById(id);
    el.addEventListener('input',e=>{e.stopPropagation();
        cpHue_=+document.getElementById('cpHueRange').value;
        cpSat_=+document.getElementById('cpSatRange').value;
        cpVal_=+document.getElementById('cpValRange').value;
        cpUpdate();});
    el.addEventListener('touchstart',e=>e.stopPropagation());
});
function openInlinePicker(idx){
    cpEditIdx=idx;
    const hsv=hexToHSV(customColors[idx]);cpHue_=hsv.h;cpSat_=Math.round(hsv.s*100);cpVal_=Math.round(hsv.v*100);
    document.getElementById('cpHueRange').value=cpHue_;
    document.getElementById('cpSatRange').value=cpSat_;
    document.getElementById('cpValRange').value=cpVal_;
    document.getElementById('customPickerSide').classList.add('open');
    cpUpdate();buildCustomStops();
}
function closeInlinePicker(){cpEditIdx=-1;document.getElementById('customPickerSide').classList.remove('open');buildCustomStops();}

function buildCustomStops(){const container=document.getElementById('customStops');container.innerHTML='';const preview=document.getElementById('customPreview');preview.style.background=getCustomGradientCSS();
    customColors.forEach((color,idx)=>{const row=document.createElement('div');row.className='custom-stop-row';
        const swatch=document.createElement('div');swatch.className='custom-color-swatch'+(idx===cpEditIdx?' editing':'');swatch.style.background=color;
        onTap(swatch,function(ev){ev.stopPropagation();openInlinePicker(idx);});
        const label=document.createElement('span');label.className='custom-color-label';label.textContent=color.toUpperCase();
        const remove=document.createElement('div');remove.className='custom-remove-btn';remove.textContent='×';
        onTap(remove,function(e){e.stopPropagation();if(customColors.length<=2)return;customColors.splice(idx,1);if(cpEditIdx===idx)closeInlinePicker();else if(cpEditIdx>idx)cpEditIdx--;buildCustomStops();if(currentPalette==='custom')applyCustomPalette();});
        row.appendChild(swatch);row.appendChild(label);if(customColors.length>2)row.appendChild(remove);container.appendChild(row);});}
onTap(document.getElementById('customAddStop'),e=>{e.stopPropagation();if(customColors.length>=9)return;customColors.push(customColors[customColors.length-1]||'#ffffff');buildCustomStops();if(currentPalette==='custom')applyCustomPalette();});
// 🌿 тап за пределами — закрываем всё
function closeCustomPanel(){customPanelOpen=false;cpEditIdx=-1;customPalettePanel.classList.remove('open');document.getElementById('customPickerSide').classList.remove('open');}

// 🌿 Рандом палитра
function randomPalette(){const count=3+Math.floor(Math.random()*5);const stops=[];const baseHue=Math.random()*360;
    for(let i=0;i<count;i++){const t=i/(count-1);stops.push({pos:t,h:(baseHue+Math.random()*180)%360,s:0.4+Math.random()*0.5,v:0.3+Math.random()*0.7});}
    if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);targetStops=stops;transitionProgress=0;currentPalette='random';buildPaletteList();}

// 🌿 Палитры — список с названиями, как было
function buildPaletteList(){const list=document.getElementById('paletteList');list.innerHTML='';
    // рандом
    const randBtn=document.createElement('div');randBtn.className='palette-item';randBtn.innerHTML='<div class="palette-swatch" style="background:linear-gradient(to right,#888,#fff)"></div><span class="palette-name">🎲 Удиви меня</span>';
    onTap(randBtn,function(e){e.stopPropagation();randomPalette();});list.appendChild(randBtn);
    // своя палитра
    const ci=document.createElement('div');ci.className='palette-item'+(currentPalette==='custom'?' active':'');
    ci.innerHTML='<div class="palette-swatch" style="background:'+getCustomGradientCSS()+'"></div><span class="palette-name">✦ Свой вариант</span>';
    onTap(ci,function(e){e.stopPropagation();applyCustomPalette();toggleCustomPanel();});list.appendChild(ci);
    // все палитры
    Object.keys(palettes).forEach(key=>{const p=palettes[key];
        const item=document.createElement('div');item.className='palette-item'+(key===currentPalette?' active':'');
        item.innerHTML='<div class="palette-swatch" style="background:'+p.swatch+'"></div><span class="palette-name">'+p.name+'</span>';
        onTap(item,function(e){e.stopPropagation();closeCustomPanel();
            if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);
            targetStops=JSON.parse(JSON.stringify(palettes[key].stops));transitionProgress=0;currentPalette=key;buildPaletteList();});
        list.appendChild(item);});}
buildPaletteList();

// --- Музыка ---
let musicCtx=null,musicAnalyser=null,musicSource=null,musicGain=null,musicAudio=null,musicFreqData=null,musicPlaying=false;
let prevSpectrum=null;
const musicFile=document.getElementById('musicFile'),flowUploadArea=document.getElementById('flowUploadArea'),flowUploadText=document.getElementById('flowUploadText'),musicPlayBtn=document.getElementById('musicPlayBtn'),musicSeek=document.getElementById('musicSeek'),musicVol=document.getElementById('musicVol'),musicTimeNow=document.getElementById('musicTimeNow'),musicTimeDur=document.getElementById('musicTimeDur'),flowControls=document.getElementById('flowControls');
onTap(flowUploadArea,e=>{e.stopPropagation();musicFile.click();});
musicFile.addEventListener('change',function(e){e.stopPropagation();const file=this.files[0];if(!file)return;flowUploadText.textContent=file.name.length>18?file.name.slice(0,16)+'…':file.name;flowUploadArea.classList.add('has-track');flowControls.classList.add('visible');
// 🌿 Полотно — прослушиваем трек целиком, узнаём его характер
trackPassport.ready=false;
(function(){const actx=new(window.AudioContext||window.webkitAudioContext)();
file.arrayBuffer().then(ab=>actx.decodeAudioData(ab)).then(buf=>{try{actx.close();}catch(x){}
analyzeTrackPassport(buf);
const bpmEl=document.getElementById('canvasBpmInfo');if(bpmEl)bpmEl.textContent=trackPassport.bpm?('♩ '+trackPassport.bpm+' BPM'):'';
}).catch(()=>{try{actx.close();}catch(x){}});})();if(musicAudio){musicAudio.pause();musicPlaying=false;musicPlayBtn.textContent='▶';}musicAudio=new Audio();musicAudio.src=URL.createObjectURL(file);musicAudio.volume=musicVol.value/100;musicAudio.addEventListener('loadedmetadata',()=>{musicTimeDur.textContent=fmtTime(musicAudio.duration);musicSeek.max=musicAudio.duration;});musicAudio.addEventListener('ended',()=>{musicPlaying=false;musicPlayBtn.textContent='▶';musicPlayBtn.classList.remove('playing');});musicAudio.addEventListener('timeupdate',()=>{if(!musicSeeking){musicSeek.value=musicAudio.currentTime;musicTimeNow.textContent=fmtTime(musicAudio.currentTime);}});if(!musicCtx)musicCtx=new(window.AudioContext||window.webkitAudioContext)();if(musicSource)try{musicSource.disconnect();}catch(x){}musicSource=musicCtx.createMediaElementSource(musicAudio);musicAnalyser=musicCtx.createAnalyser();musicAnalyser.fftSize=512;musicAnalyser.smoothingTimeConstant=.75;musicGain=musicCtx.createGain();musicGain.gain.value=musicVol.value/100;musicSource.connect(musicAnalyser);musicAnalyser.connect(musicGain);musicGain.connect(musicCtx.destination);musicFreqData=new Uint8Array(musicAnalyser.frequencyBinCount);prevSpectrum=new Float32Array(musicAnalyser.frequencyBinCount);});
let musicSeeking=false;musicSeek.addEventListener('mousedown',()=>musicSeeking=true);musicSeek.addEventListener('touchstart',e=>{e.stopPropagation();musicSeeking=true;});musicSeek.addEventListener('input',e=>{e.stopPropagation();if(musicAudio)musicTimeNow.textContent=fmtTime(+musicSeek.value);});musicSeek.addEventListener('change',e=>{e.stopPropagation();if(musicAudio)musicAudio.currentTime=+musicSeek.value;musicSeeking=false;});musicSeek.addEventListener('mouseup',()=>musicSeeking=false);musicSeek.addEventListener('touchend',e=>{e.stopPropagation();musicSeeking=false;});musicVol.addEventListener('input',e=>{e.stopPropagation();if(musicAudio)musicAudio.volume=musicVol.value/100;if(musicGain)musicGain.gain.value=musicVol.value/100;});musicVol.addEventListener('touchstart',e=>e.stopPropagation());
onTap(musicPlayBtn,e=>{e.stopPropagation();if(!musicAudio||!musicAudio.src)return;if(musicCtx&&musicCtx.state==='suspended')musicCtx.resume();if(musicPlaying){musicAudio.pause();musicPlaying=false;musicPlayBtn.textContent='▶';musicPlayBtn.classList.remove('playing');}else{musicAudio.play();musicPlaying=true;musicPlayBtn.textContent='⏸';musicPlayBtn.classList.add('playing');}});

// --- WebGL ---
const glCanvas=document.getElementById('glCanvas'),c2dCanvas=document.getElementById('c2dCanvas');let useWebGL=true,gl=null,ctx2d=null,isWebGL2=false;
try{gl=glCanvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(gl){isWebGL2=true;}else{gl=glCanvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true})||glCanvas.getContext('webgl',{alpha:false,antialias:false})||glCanvas.getContext('experimental-webgl',{alpha:false});}}catch(e){gl=null;}
if(gl&&isWebGL2){try{gl.getExtension('EXT_color_buffer_float');}catch(e){}}
if(!gl){useWebGL=false;glCanvas.classList.add('hidden');c2dCanvas.classList.remove('hidden');ctx2d=c2dCanvas.getContext('2d');}else{c2dCanvas.classList.add('hidden');}
const vertSrc=`precision mediump float;attribute vec2 a_position;attribute float a_hue;uniform vec2 u_resolution;uniform float u_rotation;uniform float u_scale;uniform vec2 u_offset;uniform float u_pointScale;uniform float u_sphereMode;varying float v_hue;void main(){vec2 pos=a_position+u_offset;vec2 center=u_resolution*.5;pos=center+(pos-center)*u_scale;float c=cos(u_rotation),s=sin(u_rotation);pos=center+vec2(c*(pos.x-center.x)-s*(pos.y-center.y),s*(pos.x-center.x)+c*(pos.y-center.y));vec2 clip=(pos/u_resolution)*2.0-1.0;clip.y=-clip.y;gl_Position=vec4(clip,0,1);float basePt=2.5*u_pointScale;if(u_sphereMode>.5){float dfc=length(a_position-center)/length(center);basePt*=(1.4-dfc*.9);}gl_PointSize=basePt;v_hue=a_hue;}`;
const fragSrc=`precision mediump float;varying float v_hue;uniform float u_stopH[9];uniform float u_stopS[9];uniform float u_stopV[9];uniform float u_alpha;uniform vec3 u_colorMask;vec3 hsv2rgb(float h,float s,float v){h=mod(h,360.0);float c=v*s;float x=c*(1.0-abs(mod(h/60.0,2.0)-1.0));float m=v-c;vec3 rgb;if(h<60.0)rgb=vec3(c,x,0);else if(h<120.0)rgb=vec3(x,c,0);else if(h<180.0)rgb=vec3(0,c,x);else if(h<240.0)rgb=vec3(0,x,c);else if(h<300.0)rgb=vec3(x,0,c);else rgb=vec3(c,0,x);return rgb+m;}vec3 getPaletteColor(float t){float idx=t*8.0;int lo=int(floor(idx));int hi=lo+1;if(hi>8)hi=8;if(lo<0)lo=0;float frac=idx-float(lo);float h1,s1,v1,h2,s2,v2;for(int i=0;i<9;i++){if(i==lo){h1=u_stopH[i];s1=u_stopS[i];v1=u_stopV[i];}if(i==hi){h2=u_stopH[i];s2=u_stopS[i];v2=u_stopV[i];}}float diff=h2-h1;if(diff>180.0)h1+=360.0;else if(diff<-180.0)h2+=360.0;return hsv2rgb(mix(h1,h2,frac),mix(s1,s2,frac),mix(v1,v2,frac));}void main(){vec2 pc=gl_PointCoord*2.0-1.0;float d=dot(pc,pc);float alpha=exp(-d*2.5)*1.60*u_alpha;if(alpha<0.01)discard;vec3 color=getPaletteColor(v_hue)*u_colorMask;gl_FragColor=vec4(color*alpha,alpha);}`;
const quadVertSrc=`precision mediump float;attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;const quadFragSrc=`precision mediump float;uniform float u_dim;void main(){gl_FragColor=vec4(0.0,0.0,0.0,u_dim);}`;
function mkShader(t,s){if(!gl)return null;const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(sh));return null;}return sh;}
function mkProgram(v,f){if(!v||!f)return null;const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))return null;return p;}
let program,quadProgram,aPosition,aHue,uResolution,uStopH,uStopS,uStopV,uAlpha,uColorMask,uRotation,uScale,uOffset,uPointScale,uSphereMode,aQuadPos,uDim,quadBuf,posBuffer,hueBuffer,contextLost=false;
function initGPU(){if(!gl)return false;program=mkProgram(mkShader(gl.VERTEX_SHADER,vertSrc),mkShader(gl.FRAGMENT_SHADER,fragSrc));quadProgram=mkProgram(mkShader(gl.VERTEX_SHADER,quadVertSrc),mkShader(gl.FRAGMENT_SHADER,quadFragSrc));if(!program||!quadProgram)return false;aPosition=gl.getAttribLocation(program,'a_position');aHue=gl.getAttribLocation(program,'a_hue');uResolution=gl.getUniformLocation(program,'u_resolution');uStopH=gl.getUniformLocation(program,'u_stopH');uStopS=gl.getUniformLocation(program,'u_stopS');uStopV=gl.getUniformLocation(program,'u_stopV');uAlpha=gl.getUniformLocation(program,'u_alpha');uColorMask=gl.getUniformLocation(program,'u_colorMask');uRotation=gl.getUniformLocation(program,'u_rotation');uScale=gl.getUniformLocation(program,'u_scale');uOffset=gl.getUniformLocation(program,'u_offset');uPointScale=gl.getUniformLocation(program,'u_pointScale');uSphereMode=gl.getUniformLocation(program,'u_sphereMode');aQuadPos=gl.getAttribLocation(quadProgram,'a_pos');uDim=gl.getUniformLocation(quadProgram,'u_dim');quadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);posBuffer=gl.createBuffer();hueBuffer=gl.createBuffer();if(hue){gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.bufferData(gl.ARRAY_BUFFER,hue,gl.STATIC_DRAW);}return true;}
if(gl){glCanvas.addEventListener('webglcontextlost',function(e){e.preventDefault();contextLost=true;cancelAnimationFrame(animFrame);useWebGL=false;glCanvas.classList.add('hidden');c2dCanvas.classList.remove('hidden');ctx2d=c2dCanvas.getContext('2d');c2dCanvas.width=W;c2dCanvas.height=H;contextLost=false;lastTime=performance.now();animFrame=requestAnimationFrame(loop);});glCanvas.addEventListener('webglcontextrestored',function(){if(initGPU()){useWebGL=true;c2dCanvas.classList.add('hidden');glCanvas.classList.remove('hidden');gl.viewport(0,0,W,H);if(hue){gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.bufferData(gl.ARRAY_BUFFER,hue,gl.STATIC_DRAW);}contextLost=false;}});}

let GAP,W,H,COLS,ROWS,TOTAL,homeX,homeY,posX,posY,velX,velY,hue,glPositions,colorCache=null;
// 🌿 Профили устройств: mobile ≤500, tablet 501-1024, desktop >1024
const deviceProfiles={mobile:{pointScale:1.0,gapMult:1,fadeMult:0.55,brightMult:1.5},tablet:{pointScale:0.9,gapMult:1,fadeMult:0.7,brightMult:1.3},desktop:{pointScale:1,gapMult:1,fadeMult:1,brightMult:1}};
let currentProfile='desktop',mobileScale=1,fadeMult=1,brightMult=1;
function detectProfile(){const sw=Math.min(screen.width||9999,screen.height||9999);if(sw<=500)return'mobile';if(sw<=1024)return'tablet';return'desktop';}
function applyProfile(){currentProfile=detectProfile();const p=deviceProfiles[currentProfile];mobileScale=p.pointScale;fadeMult=p.fadeMult;brightMult=p.brightMult;}
var PIXR=1;
function resizeCanvas(){const nw=window.innerWidth,nh=window.innerHeight;const dpr=Math.min(window.devicePixelRatio||1,2);if(nw===W&&nh===H&&dpr===PIXR)return;W=nw;H=nh;PIXR=dpr;const pw=Math.round(W*dpr),ph=Math.round(H*dpr);if(useWebGL){if(glCanvas.width!==pw||glCanvas.height!==ph){glCanvas.width=pw;glCanvas.height=ph;}glCanvas.style.width=W+'px';glCanvas.style.height=H+'px';if(gl)gl.viewport(0,0,pw,ph);}else{if(c2dCanvas.width!==pw||c2dCanvas.height!==ph){c2dCanvas.width=pw;c2dCanvas.height=ph;}c2dCanvas.style.width=W+'px';c2dCanvas.style.height=H+'px';if(ctx2d)ctx2d.setTransform(dpr,0,0,dpr,0,0);}}
function init(){const _savedMode=typeof currentMode!=='undefined'?currentMode:null;const _savedScene=typeof currentScene!=='undefined'?currentScene:null;const _savedDim=typeof dimension!=='undefined'?dimension:null;applyProfile();W=0;H=0;resizeCanvas();const _gpuMode=(typeof engineMode!=='undefined'&&engineMode==='gpu')&&(typeof GPU_SPEC!=='undefined')&&!!GPU_SPEC[currentMode];const _effDesired=desiredParticles>0?(_gpuMode?desiredParticles:Math.min(desiredParticles,150000)):0;GAP=_effDesired>0?Math.max(1,Math.sqrt(W*H/_effDesired)):userGap*deviceProfiles[currentProfile].gapMult;COLS=Math.ceil(W/GAP);ROWS=Math.ceil(H/GAP);TOTAL=COLS*ROWS;homeX=new Float32Array(TOTAL);homeY=new Float32Array(TOTAL);posX=new Float32Array(TOTAL);posY=new Float32Array(TOTAL);velX=new Float32Array(TOTAL);velY=new Float32Array(TOTAL);hue=new Float32Array(TOTAL);glPositions=new Float32Array(TOTAL*2);sTheta=new Float32Array(TOTAL);sPhi=new Float32Array(TOTAL);const cc=(COLS-1)/2,cr=(ROWS-1)/2,md=Math.sqrt(cc*cc+cr*cr);for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=r*COLS+c;homeX[i]=c*GAP;homeY[i]=r*GAP;posX[i]=homeX[i];posY[i]=homeY[i];const dx=c-cc,dy=r-cr,dist=Math.sqrt(dx*dx+dy*dy);const proj=md>0?(dx*.7071+dy*.7071)/md:0,dr=md>0?dist/md:0;hue[i]=1/(1+Math.exp(-(2+dr*4)*proj));sTheta[i]=Math.PI*(r/(ROWS-1));sPhi[i]=2*Math.PI*c/COLS;}if(useWebGL&&gl){gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.bufferData(gl.ARRAY_BUFFER,hue,gl.STATIC_DRAW);}colorCache=new Uint8Array(TOTAL*3);sDTheta=new Float32Array(TOTAL);sDPhi=new Float32Array(TOTAL);trailLayerBuf=new Float32Array(TOTAL*2);if(_savedMode)currentMode=_savedMode;if(_savedScene)currentScene=_savedScene;if(_savedDim!==null)dimension=_savedDim;}

// Three.js 3D scene → scene3d.js


// betaВизуал → visual.js


let mouseDown=false,mousePos={x:0,y:0},touchPoints=[];
function isUI(e){var _t=e&&e.target;if(!_t||typeof _t.closest!=='function')return false;return _t.closest('.anchor')||_t.closest('.profile-panel')||_t.closest('.toolbar')||_t.closest('.side-panel')||_t.closest('.custom-palette-panel')||_t.closest('.beat-panel')||_t.closest('.scene-bar')||_t.closest('.bg-music-panel')||_t.closest('.sheet-peek')||_t.closest('#fpsOverlay')||_t.closest('#audioLab')||_t.closest('#mrPanel')||_t.closest('#mrTab')||_t.closest('#hud');}
document.addEventListener('mousedown',e=>{if(isUI(e))return;if(e.button===0){mouseDown=true;mousePos={x:e.clientX,y:e.clientY};e.preventDefault();}});
window.addEventListener('mousemove',e=>{if(isUI(e))return;mousePos={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;});
function updateTouchPoints(e){touchPoints=[];for(let i=0;i<e.touches.length;i++)touchPoints.push({x:e.touches[i].clientX,y:e.touches[i].clientY});}
document.addEventListener('touchstart',e=>{if(isUI(e))return;e.preventDefault();updateTouchPoints(e);},{passive:false});
document.addEventListener('touchmove',e=>{if(isUI(e))return;e.preventDefault();updateTouchPoints(e);},{passive:false});
document.addEventListener('touchend',e=>{if(e.cancelable)e.preventDefault();updateTouchPoints(e);},{passive:false});
document.addEventListener('touchcancel',()=>{touchPoints=[];});window.addEventListener('blur',()=>{mouseDown=false;touchPoints=[];});document.addEventListener('contextmenu',e=>e.preventDefault());

let time=0;const shaderH=new Float32Array(9),shaderS=new Float32Array(9),shaderV=new Float32Array(9);
// getTotalForce → tools.js

// ══════════════════════════════════════
// 8. ФИЗИКА ЧАСТИЦ
// ══════════════════════════════════════

// 🌿 Главный цикл физики — обновление позиций всех частиц
function update(dt){const dt60=Math.min(3,dt*60*spinSpeed),physMode=currentMode;const isActive=touchPoints.length>0||mouseDown||(musicPlaying&&musicBands.energy>.01)||(beatPlaying&&musicBands.energy>.01)||physMode==='flow'||conductorOn;time+=dt*1000*spinSpeed;if(musicPlaying)analyzeMusic();decayBeatBands(dt);computeReactive(dt);if(isActive)returnT=0;else returnT+=dt;if(sceneBreath>0)sceneBreath=Math.max(0,sceneBreath-dt*0.6);if(window.__autopilotTick)window.__autopilotTick(dt);if(transitionProgress<1){transitionProgress=Math.min(1,transitionProgress+dt*paletteLerpSpeed);if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(targetStops));}let as;if(transitionProgress>=1)as=currentStops;else as=lerpStops(currentStops,targetStops,transitionProgress);const norm=normalizeStops(as);for(let i=0;i<9;i++){shaderH[i]=norm[i].h;shaderS[i]=norm[i].s;shaderV[i]=norm[i].v;}if(!useWebGL&&colorCache){for(let i=0;i<TOTAL;i++){const c=getPaletteColorCPU(hue[i],norm);colorCache[i*3]=c[0];colorCache[i*3+1]=c[1];colorCache[i*3+2]=c[2];}}const points=[];if(mouseDown)points.push(mousePos);for(let t=0;t<touchPoints.length;t++)points.push(touchPoints[t]);
// --- 3D Сфера с деформацией ---
if(dimension===2){
// --- 4D: объёмная физика ---
update4D(dt);
drawWireframe();
}else if(dimension===1){
const cx=W/2,cy=H/2,baseR=Math.min(W,H)*deformRad;
const rotA=time*.0003*deformRot*spinDirection;
const tilt=deformTilt,ct=Math.cos(tilt),st=Math.sin(tilt);
const persp=800;
const amp=deformAmp,freq=deformFreq;
const touchActive=mouseDown||touchPoints.length>0;
const t=time*.001;
for(let i=0;i<TOTAL;i++){
const theta=sTheta[i],phi=sPhi[i];
// деформация радиуса
let d=0;
if(deformSub===0){/* Дыхание */
d=Math.sin(t*2)*.5+Math.sin(t*3.1+theta)*.3;
}else if(deformSub===1){/* Волны */
d=Math.sin(theta*freq-t*3)+Math.sin(phi*freq*0.7+t*2)*.6;
}else if(deformSub===2){/* Складки */
d=Math.sin(theta*freq+t)*Math.sin(phi*freq*1.3-t*.7)+Math.sin(theta*freq*2.1-t*1.3)*Math.cos(phi*freq*.8+t*.5)*.5+Math.sin((theta+phi)*freq*1.7+t*1.1)*.3;
}else if(deformSub===3){/* Мандала */
const sym=Math.round(freq);
d=Math.sin(phi*sym+t)*Math.sin(theta*2-t*.5)+Math.cos(phi*sym*2-t*.7)*Math.sin(theta*3)*.4;
}else if(deformSub===4){/* Вихрь */
const twist=theta*2*freq;
d=Math.sin(phi+twist+t*2)+Math.sin(phi*2-twist*.5+t)*.4;
}
let R=baseR*(1+d*amp);
// касание — локальная деформация
if(touchActive){
let sx0=baseR*Math.sin(theta)*Math.cos(phi+rotA);
let sy0=baseR*Math.sin(theta)*Math.sin(phi+rotA);
let sz0=baseR*Math.cos(theta);
const sy02=sy0*ct-sz0*st,sz02=sy0*st+sz0*ct;
const sc0=persp/(persp+sz02);
const scrX=cx+sx0*sc0,scrY=cy+sy02*sc0;
let touchDist=9999;
if(mouseDown)touchDist=Math.sqrt((scrX-mousePos.x)**2+(scrY-mousePos.y)**2);
for(let tt=0;tt<touchPoints.length;tt++){const td=Math.sqrt((scrX-touchPoints[tt].x)**2+(scrY-touchPoints[tt].y)**2);if(td<touchDist)touchDist=td;}
const prox=Math.max(0,1-touchDist/(baseR*.6));
R+=baseR*prox*.3*Math.sin(t*8+theta*5+phi*3);
}
// музыка
if((musicPlaying||beatPlaying)&&musicBands.energy>.01){
const e=musicBands.energy;
R*=(1+musicBands.bass*.15*Math.sin(t*5));
R+=baseR*e*.1*Math.sin(theta*4+phi*3+t*4);
}
// 3D координаты
let sx=R*Math.sin(theta)*Math.cos(phi+rotA);
let sy=R*Math.sin(theta)*Math.sin(phi+rotA);
let sz=R*Math.cos(theta);
const sy2=sy*ct-sz*st,sz2=sy*st+sz*ct;
const sc=persp/(persp+sz2);
const tx=cx+sx*sc,ty=cy+sy2*sc;
const lerpF=.15*dt60;
posX[i]+=(tx-posX[i])*lerpF;posY[i]+=(ty-posY[i])*lerpF;
}
}else{
// --- 2D режимы ---
// обновляем домашние позиции для полотна
if(canvasShape>0&&!gpuActive()){
const cx=W/2,cy=H/2,R=Math.min(W,H)*0.36;
const rotA=time*.0003*spinDirection;
const tilt=0.35,ct=Math.cos(tilt),st=Math.sin(tilt);
const persp=800;
for(let i=0;i<TOTAL;i++){
let sx,sy,sz;
if(canvasShape===1){// Сфера
sx=R*Math.sin(sTheta[i])*Math.cos(sPhi[i]+rotA);
sy=R*Math.sin(sTheta[i])*Math.sin(sPhi[i]+rotA);
sz=R*Math.cos(sTheta[i]);
}else if(canvasShape===2){// Куб
const face=i%6,fi=Math.floor(i/6);
const cols=Math.ceil(Math.sqrt(TOTAL/6)),rows=cols;
const u=(fi%cols)/(cols-1)*2-1,v=(Math.floor(fi/cols)%rows)/(rows-1)*2-1;
const s=R*.7;
if(face===0){sx=s;sy=u*s;sz=v*s;}
else if(face===1){sx=-s;sy=u*s;sz=v*s;}
else if(face===2){sx=u*s;sy=s;sz=v*s;}
else if(face===3){sx=u*s;sy=-s;sz=v*s;}
else if(face===4){sx=u*s;sy=v*s;sz=s;}
else{sx=u*s;sy=v*s;sz=-s;}
const ca=Math.cos(rotA),sa=Math.sin(rotA);
const sx2=sx*ca-sz*sa,sz2=sx*sa+sz*ca;sx=sx2;sz=sz2;
}else if(canvasShape===3){// Тетраэдр
const face=i%4,fi=Math.floor(i/4);
const cols=Math.ceil(Math.sqrt(TOTAL/4)),rows=cols;
let u=(fi%cols)/(cols-1||1),v=(Math.floor(fi/cols)%rows)/(rows-1||1);
if(u+v>1){u=1-u;v=1-v;}
const w=1-u-v;
const s=R*.85;
const h=s*1.633;
const verts=[[0,h*.75,0],[-s,-h*.25,-s*.577],[s,-h*.25,-s*.577],[0,-h*.25,s*1.155]];
const faces=[[0,1,2],[0,2,3],[0,3,1],[1,3,2]];
const fc=faces[face],A=verts[fc[0]],B=verts[fc[1]],C=verts[fc[2]];
sx=A[0]*w+B[0]*u+C[0]*v;
sy=A[1]*w+B[1]*u+C[1]*v;
sz=A[2]*w+B[2]*u+C[2]*v;
const ca=Math.cos(rotA),sa=Math.sin(rotA);
const sx2=sx*ca-sz*sa,sz2=sx*sa+sz*ca;sx=sx2;sz=sz2;
}else if(canvasShape===4){// Тор
const bigR=R*.65,smallR=R*.3;
const u2=2*Math.PI*(i%COLS)/(COLS-1||1);
const v2=2*Math.PI*Math.floor(i/COLS)/(ROWS-1||1);
sx=(bigR+smallR*Math.cos(v2+rotA*.3))*Math.cos(u2+rotA);
sy=(bigR+smallR*Math.cos(v2+rotA*.3))*Math.sin(u2+rotA);
sz=smallR*Math.sin(v2+rotA*.3);
}
// наклон + проекция
const sy2=sy*ct-sz*st,sz2=sy*st+sz*ct;
const sc=persp/(persp+sz2);
homeX[i]=cx+sx*sc;homeY[i]=cy+sy2*sc;
// плавный цвет по поверхности
const phiNorm=((sPhi[i]+rotA)%(Math.PI*2))/(Math.PI*2);
const thetaNorm=sTheta[i]/Math.PI;
hue[i]=1/(1+Math.exp(-(2+thetaNorm*4)*(phiNorm*2-1)));
}
if(useWebGL&&gl){gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.bufferData(gl.ARRAY_BUFFER,hue,gl.DYNAMIC_DRAW);}
}
if(currentMode==='mandala'&&(mouseDown||touchPoints.length>0))points.push({x:W/2,y:H/2,strength:0.5});
if(window.__extraPoints)window.__extraPoints(points);
// 🎼 Дирижёр — автоматическая «красивая рука»: Лиссажу с золотыми частотами, размноженная калейдоскопом, с дыханием радиуса и дрейфом фаз
if(conductorOn){
    const ccx=W/2,ccy=H/2,R0=Math.min(W,H)*0.28,PHI=1.6180339887;
    const breathe=0.72+0.28*Math.sin(time*0.00023);
    conductorSpeed+=(conductorSpeedT-conductorSpeed)*0.02;conductorRad+=(conductorRadT-conductorRad)*0.02;
    const rmS=(window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches)?0.5:1;
    const tempo=(1+(typeof envBass!=='undefined'?envBass*0.9:0))*conductorSpeed*rmS;
    const rad=R0*breathe*conductorRad*(1-0.6*sceneBreath)*(1+(typeof envEnergy!=='undefined'?envEnergy*0.35:0));
    const tq=time*0.00035*tempo;
    const bx=ccx+rad*Math.sin(tq+conductorPh1),by=ccy+rad*0.85*Math.sin(tq*PHI+conductorPh2);
    const N=Math.max(2,Math.min(8,conductorSym)),sa=Math.PI*2/N;
    const dxq=bx-ccx,dyq=by-ccy,rr=Math.sqrt(dxq*dxq+dyq*dyq),baseA=Math.atan2(dyq,dxq),relA=((baseA%sa)+sa)%sa;
    const strq=1.5/Math.sqrt(N);
    for(let k=0;k<N&&points.length<8;k++){const a=k*sa+(k%2===1?sa-relA:relA);points.push({x:ccx+Math.cos(a)*rr,y:ccy+Math.sin(a)*rr,strength:strq});}
    conductorPh1+=0.00004*dt60;conductorPh2+=0.000027*dt60;
}
// 🎵 Музыка = виртуальный курсор v3 — по анализу движений Яна
if(!conductorOn&&vizMode!=='test'&&(musicPlaying||beatPlaying)&&!classicVisOn&&(musicNorm.energy>.08||beatPulse>.1)){
    const cx=W/2,cy=H/2;
    const e=Math.max(musicNorm.energy,beatPulse*.3);
    const maxR=Math.min(W,H);
    // 🌿 скорость — энергия управляет, тихо = почти стоит, дроп = разгон
    const orbSpeed=time*0.0005*(0.15+musicNorm.energy*3.5)*spinDirection;
    // 🌿 радиус — широкий бас-дыхание (50-70% экрана как Ян делает руками)
    let orbR=maxR*(0.18+musicNorm.bass*0.38);
    // 🌿 радиальный пульс — на удар рывок к центру и возврат
    if(beatPulse>0.12)orbR*=(1-beatPulse*0.6);
    // 🌿 основной палец — ведёт тему широкими кругами
    points.push({x:cx+Math.cos(orbSpeed)*orbR,y:cy+Math.sin(orbSpeed)*orbR,strength:e*1.4});
    // 🌿 второй палец — противофаза, высокие дёргают, фаза плывёт
    const hiR=maxR*(0.1+musicNorm.high*0.3);
    const hiPhase=orbSpeed+Math.PI+Math.sin(time*0.0009)*0.6;
    points.push({x:cx+Math.cos(hiPhase)*hiR,y:cy+Math.sin(hiPhase)*hiR,strength:musicNorm.high*0.85+0.1});
    // 🌿 ударный палец — бит = выстрел перпендикулярно
    if(beatPulse>0.18){
        const beatA=orbSpeed+Math.PI*0.5;
        const beatR=maxR*0.38*beatPulse;
        points.push({x:cx+Math.cos(beatA)*beatR,y:cy+Math.sin(beatA)*beatR,strength:beatPulse*1.7});
    }
    // 🌿 тишина — если энергия падает ниже порога, пальцы уходят (контраст)
}
// --- Мандала подрежимы: кольцевая физика ---
const isMandSub=currentMode==='mandala'&&Math.round(modeParams.mandala.sub||0)>0;
const isSphere=currentMode==='sphere';
const isYantra=currentMode==='yantra';
// 🌿 Полотно — трек рисует себя сам, по своему паспорту
const isCanvasVis=canvasVisOn&&!classicVisOn&&musicPlaying&&trackPassport.ready&&musicAudio;
if(isCanvasVis){
const ct=musicAudio.currentTime;
// сетка битов — удары точно в такт
const bts=trackPassport.beats;
if(trackPassport.beatPtr>0&&bts[trackPassport.beatPtr-1]>ct+0.5)trackPassport.beatPtr=0;// перемотка назад
while(trackPassport.beatPtr<bts.length&&bts[trackPassport.beatPtr]<ct-0.3)trackPassport.beatPtr++;
if(trackPassport.beatPtr<bts.length&&bts[trackPassport.beatPtr]<=ct){canvasWave=1;trackPassport.beatPtr++;}
canvasWave*=Math.exp(-dt*6);
// энергия трека — рельеф из паспорта, сглаженный
canvasE+=(passportEnergyAt(ct)-canvasE)*0.08;
// автостиль: перкуссивный → кольца чёткие, спокойный → туманность
const perc=trackPassport.percussive,bright=trackPassport.brightness;
const cx=W/2,cy=H/2,maxR=Math.min(W,H)*0.42;
const rotSpd=time*0.0002*(0.4+musicNorm.mid*1.6)*(0.5+bright)*spinDirection;
const lf=0.07*dt*60;
for(let i=0;i<TOTAL;i++){
    const frac=i/TOTAL;
    // золотая спираль — основа композиции
    const ga=i*2.39996+rotSpd;
    let r=maxR*Math.sqrt(frac)*(0.5+0.5*canvasE);
    // удар — рябь бежит наружу
    if(canvasWave>0.02)r+=Math.sin(frac*9-(1-canvasWave)*11)*canvasWave*maxR*0.13;
    // туманность — органическое дыхание для спокойных треков
    if(perc<0.45)r+=Math.sin(i*0.37+time*0.0006)*maxR*0.1*(1-perc);
    let tx2=cx+Math.cos(ga)*r,ty2=cy+Math.sin(ga)*r;
    // высокие — мерцание, дрожь света
    const jit=musicNorm.high*4*(0.5+bright);
    tx2+=Math.sin(time*0.02+i*0.9)*jit;ty2+=Math.cos(time*0.023+i*1.3)*jit;
    posX[i]+=(tx2-posX[i])*lf;posY[i]+=(ty2-posY[i])*lf;
    velX[i]=(tx2-posX[i])*lf;velY[i]=(ty2-posY[i])*lf;
}
// тач — играем с полотном
if(mouseDown||touchPoints.length>0){const pts3=[];if(mouseDown)pts3.push(mousePos);for(let ti=0;ti<touchPoints.length;ti++)pts3.push(touchPoints[ti]);
    for(let i=0;i<TOTAL;i++){for(let p=0;p<pts3.length;p++){const dx=posX[i]-pts3[p].x,dy=posY[i]-pts3[p].y;const dd=Math.sqrt(dx*dx+dy*dy);
        if(dd<160&&dd>1){const push=9/(dd*0.1+1);posX[i]+=dx/dd*push;posY[i]+=dy/dd*push;}}}}
}else if(isYantra){
// 🌿 Янтра — священная геометрия из прямых линий
const mp=modeParams.yantra,sub=Math.round(mp.sub||0),layers=Math.round(mp.layers||4);
const sharp=mp.sharpness||1,spin=(mp.yantraSpin||0.5)*spinDirection;
const cx=W/2,cy=H/2,maxR=Math.min(W,H)*0.38;
const rot=time*0.0003*spin;
// 🌿 строим рёбра янтры
const segs=[],segLens=[];
for(let l=0;l<layers;l++){
    const r=maxR*(0.15+0.85*(1-l/layers));
    if(sub===0){// Шри — чередующиеся треугольники
        const bRot=rot+(l%2===0?-Math.PI/2:Math.PI/2);
        for(let s=0;s<3;s++){const a1=bRot+s*Math.PI*2/3,a2=bRot+(s+1)*Math.PI*2/3;
            segs.push({x1:cx+Math.cos(a1)*r,y1:cy+Math.sin(a1)*r,x2:cx+Math.cos(a2)*r,y2:cy+Math.sin(a2)*r});}
    }else if(sub===1){// Звезда — два треугольника
        for(let d=0;d<2;d++){const bRot2=rot+(d===0?-Math.PI/2:Math.PI/2);
            for(let s=0;s<3;s++){const a1=bRot2+s*Math.PI*2/3,a2=bRot2+(s+1)*Math.PI*2/3;
                segs.push({x1:cx+Math.cos(a1)*r,y1:cy+Math.sin(a1)*r,x2:cx+Math.cos(a2)*r,y2:cy+Math.sin(a2)*r});}}
    }else if(sub===2){// Бхупура — повёрнутые квадраты
        const bRot3=rot+l*Math.PI/4+Math.PI/4;
        for(let s=0;s<4;s++){const a1=bRot3+s*Math.PI/2,a2=bRot3+(s+1)*Math.PI/2;
            segs.push({x1:cx+Math.cos(a1)*r,y1:cy+Math.sin(a1)*r,x2:cx+Math.cos(a2)*r,y2:cy+Math.sin(a2)*r});}
    }else{// Кристалл — ромбы
        const bRot4=rot+l*Math.PI/6;
        for(let s=0;s<4;s++){const a1=bRot4+s*Math.PI/2,a2=bRot4+(s+1)*Math.PI/2;
            segs.push({x1:cx+Math.cos(a1)*r,y1:cy+Math.sin(a1)*r,x2:cx+Math.cos(a2)*r,y2:cy+Math.sin(a2)*r});}
    }
}
for(let j=0;j<segs.length;j++){const s=segs[j];segLens.push(Math.sqrt((s.x2-s.x1)**2+(s.y2-s.y1)**2));}
const totalLen=segLens.reduce((a,b)=>a+b,0);
// 🌿 кумулятивные длины для быстрого поиска
const cumLen=[0];for(let j=0;j<segLens.length;j++)cumLen.push(cumLen[j]+segLens[j]);
// 🌿 распределяем частицы по рёбрам с толщиной и дыханием
const lf=sharp*0.05*dt*60;
const ribbonWidth=25/sharp;// ширина ленты — чем резче, тем тоньше
for(let i=0;i<TOTAL;i++){
    let d=(i/TOTAL)*totalLen,si=0;
    for(let j=0;j<segs.length;j++){if(cumLen[j+1]>=d){si=j;break;}}
    const t2=(d-cumLen[si])/(segLens[si]+0.001);
    let tx=segs[si].x1+(segs[si].x2-segs[si].x1)*t2;
    let ty=segs[si].y1+(segs[si].y2-segs[si].y1)*t2;
    // 🌿 разброс — частицы живут вокруг рёбер, не на них
    const perpX=-(segs[si].y2-segs[si].y1)/(segLens[si]+0.01);
    const perpY=(segs[si].x2-segs[si].x1)/(segLens[si]+0.01);
    const spread=(Math.sin(i*0.37)*0.5+Math.sin(i*1.13)*0.3+Math.cos(i*0.71)*0.2)*maxR*0.18/sharp;
    tx+=perpX*spread;ty+=perpY*spread;
    // 🌿 перпендикуляр к ребру — частицы образуют ленты, не линии
    const edx=segs[si].x2-segs[si].x1,edy=segs[si].y2-segs[si].y1;
    const elen=segLens[si]+0.001;
    const nx=-edy/elen,ny=edx/elen;
    // отклонение: уникальное для каждой частицы + дышит со временем
    const offset=Math.sin(i*0.37+time*0.0015)*ribbonWidth+Math.cos(i*0.73+time*0.001)*ribbonWidth*0.5;
    tx+=nx*offset;ty+=ny*offset;
    posX[i]+=(tx-posX[i])*lf;posY[i]+=(ty-posY[i])*lf;
    velX[i]=(tx-posX[i])*lf;velY[i]=(ty-posY[i])*lf;
}
// 🌿 тач — разгоняет частицы от пальца
if(mouseDown||touchPoints.length>0){const pts2=[];if(mouseDown)pts2.push(mousePos);for(let ti=0;ti<touchPoints.length;ti++)pts2.push(touchPoints[ti]);
    for(let i=0;i<TOTAL;i++){for(let p=0;p<pts2.length;p++){const dx=posX[i]-pts2[p].x,dy=posY[i]-pts2[p].y;const dd=Math.sqrt(dx*dx+dy*dy);
        if(dd<150&&dd>1){const push=8/(dd*0.1+1);posX[i]+=dx/dd*push;posY[i]+=dy/dd*push;}}}}
}else if(isMandSub||isSphere){
const mp=modeParams.mandala,msub=Math.round(mp.sub),cx=W/2,cy=H/2;
const maxR=Math.min(W,H)*0.42,rings=Math.round(mp.rings||5),petals=Math.round(mp.petals||8);
const spn=(mp.mandalaSpin||1)*spinDirection;
const touchActive=mouseDown||touchPoints.length>0;
for(let i=0;i<TOTAL;i++){
const hx=homeX[i]-cx,hy=homeY[i]-cy;
const homeDist=Math.sqrt(hx*hx+hy*hy);
const homeAngle=Math.atan2(hy,hx);
const ringIdx=Math.round(homeDist/(Math.max(W,H)/2)*rings);
const clampedRing=Math.max(1,Math.min(rings,ringIdx));
const ringR=maxR*clampedRing/rings;
const baseRot=time*.0004*spn;
let targetAngle=homeAngle+baseRot;
let targetR=ringR;
// --- Подрежимы ---
if(msub===1){/* Геометрия */
const pw=Math.sin(targetAngle*petals+time*.0004)*.18;
targetR=ringR*(1+pw);
targetAngle+=Math.sin(time*.0003+clampedRing*.5)*.05;
}else if(msub===2){/* Спираль */
const ringSpeed=1+clampedRing*.35;
targetAngle=homeAngle+baseRot*ringSpeed;
targetAngle+=clampedRing*.5*Math.sin(time*.0003);
targetR=ringR*(1+Math.sin(targetAngle*3+clampedRing)*.06);
}else if(msub===3){/* Река */
const stream=Math.sin(targetAngle*2+time*.0012)*.25;
targetAngle+=stream;
targetR=ringR*(1+Math.sin(targetAngle*2+clampedRing*.7)*.1);
}else if(msub===4){/* Затмение */
if(clampedRing<=1)targetR=maxR*.12+maxR*.06*Math.sin(time*.002);
const corona=Math.sin(targetAngle*petals+time*.001)*.1;
targetR*=(1+corona);
targetAngle+=Math.sin(time*.0005+clampedRing)*.03;
}else if(msub===5){/* Пульс */
const pulse=Math.sin(time*.003+clampedRing*.8)*.15;
targetR=ringR*(1+pulse);
targetAngle+=Math.sin(time*.002)*0.08*clampedRing/rings;
}else if(msub===6){/* Лотос */
const lobes=petals;
const lobeWave=Math.pow(Math.abs(Math.sin(targetAngle*lobes/2)),0.6)*.25;
targetR=ringR*(0.85+lobeWave);
targetAngle+=Math.sin(time*.0004+clampedRing*.3)*.04;
}
// --- Касание: сильное возбуждение ---
if(touchActive){
let touchDist=9999,touchAngle=0,touchX=0,touchY=0;
if(mouseDown){touchX=mousePos.x;touchY=mousePos.y;touchDist=Math.sqrt((posX[i]-touchX)**2+(posY[i]-touchY)**2);touchAngle=Math.atan2(touchY-cy,touchX-cx);}
for(let t=0;t<touchPoints.length;t++){const td=Math.sqrt((posX[i]-touchPoints[t].x)**2+(posY[i]-touchPoints[t].y)**2);if(td<touchDist){touchDist=td;touchX=touchPoints[t].x;touchY=touchPoints[t].y;touchAngle=Math.atan2(touchY-cy,touchX-cx);}}
const proximity=Math.max(0,1-touchDist/(maxR*.5));
const p2=proximity*proximity;
// радиальная волна от касания
targetR+=Math.sin(time*.008+homeAngle*petals)*maxR*.2*p2;
// угловое смещение к касанию
const angleDiff=Math.atan2(Math.sin(touchAngle-targetAngle),Math.cos(touchAngle-targetAngle));
targetAngle+=angleDiff*p2*.4;
// дополнительная амплитуда
targetR+=Math.sin(homeDist*.05-time*.005)*maxR*.1*p2;
}
// --- Музыка ---
if((musicPlaying||beatPlaying)&&musicBands.energy>.01){
const e=musicBands.energy;
targetR+=Math.sin(time*.006+homeAngle*3)*maxR*.12*e;
targetAngle+=e*.2*Math.sin(time*.004+clampedRing);
const bassPulse=musicBands.bass*.15;
targetR*=(1+bassPulse*Math.sin(time*.008));
}
const tx=cx+Math.cos(targetAngle)*targetR;
const ty=cy+Math.sin(targetAngle)*targetR;
const lerpF=.12*dt60;
posX[i]+=(tx-posX[i])*lerpF;
posY[i]+=(ty-posY[i])*lerpF;
velX[i]=(tx-posX[i])*lerpF;velY[i]=(ty-posY[i])*lerpF;
}
}else if(isSphere){
// --- Сфера: 3D проекция с настройками ---
const sp=modeParams.sphere,cx=W/2,cy=H/2;
const R=Math.min(W,H)*0.35*(sp.radius||1);
const rotY=time*.0003*(sp.rotSpeed||1)*spinDirection;
const tilt=sp.tilt||0.4;
const touchActive=mouseDown||touchPoints.length>0;
const ct=Math.cos(tilt),st=Math.sin(tilt);
for(let i=0;i<TOTAL;i++){
const theta=sTheta[i],phi=sPhi[i];
let sx=R*Math.sin(theta)*Math.cos(phi+rotY);
let sy=R*Math.sin(theta)*Math.sin(phi+rotY);
let sz=R*Math.cos(theta);
const sy2=sy*ct-sz*st,sz2=sy*st+sz*ct;sy=sy2;sz=sz2;
const persp=800,scale=persp/(persp+sz);
let tx=cx+sx*scale,ty=cy+sy*scale;
if(touchActive){
let touchDist=9999;
if(mouseDown)touchDist=Math.sqrt((posX[i]-mousePos.x)**2+(posY[i]-mousePos.y)**2);
for(let t=0;t<touchPoints.length;t++){const td=Math.sqrt((posX[i]-touchPoints[t].x)**2+(posY[i]-touchPoints[t].y)**2);if(td<touchDist)touchDist=td;}
const prox=Math.max(0,1-touchDist/(R*.7));
tx+=Math.sin(time*.006+theta*5)*R*.2*prox*scale;
ty+=Math.cos(time*.006+phi*3)*R*.15*prox*scale;
}
if((musicPlaying||beatPlaying)&&musicBands.energy>.01){
const e=musicBands.energy,pulse=1+musicBands.bass*.25*Math.sin(time*.008);
tx=cx+(tx-cx)*pulse;ty=cy+(ty-cy)*pulse;
tx+=Math.sin(time*.005+theta*3)*R*.1*e*scale;
}
const lerpF=.12*dt60;
posX[i]+=(tx-posX[i])*lerpF;posY[i]+=(ty-posY[i])*lerpF;
velX[i]=(tx-posX[i])*lerpF;velY[i]=(ty-posY[i])*lerpF;
}
}else{
// --- Стандартная физика ---
if(gpuActive()){gpuSimStep(dt60,points,isActive);}else{
for(let i=0;i<TOTAL;i++){const px=posX[i],py=posY[i];if(isActive){const force=getTotalForce(px,py,points,physMode,velX[i],velY[i]);velX[i]=(velX[i]+force.fx*dt60*reactiveMul)*.92;velY[i]=(velY[i]+force.fy*dt60*reactiveMul)*.92;if(reactiveShock>0.01){const _dxc=px-W*0.5,_dyc=py-H*0.5,_dc=Math.sqrt(_dxc*_dxc+_dyc*_dyc)+1;velX[i]+=_dxc/_dc*reactiveShock*0.5;velY[i]+=_dyc/_dc*reactiveShock*0.5;}const sp=Math.sqrt(velX[i]*velX[i]+velY[i]*velY[i]);if(sp>25){velX[i]=velX[i]/sp*25;velY[i]=velY[i]/sp*25;}posX[i]+=velX[i]*dt60;posY[i]+=velY[i]*dt60;applyBarrierCollision(i);}else if(returnMode===2){velX[i]*=.85;velY[i]*=.85;posX[i]+=velX[i]*dt60;posY[i]+=velY[i]*dt60;}else if(returnMode===1){const h=hashF(i);const hx=homeX[i],hy=homeY[i];const dxH=hx-px,dyH=hy-py,d=Math.sqrt(dxH*dxH+dyH*dyH);const rate=.6+.8*h;const cxd=px-W*.5,cyd=py-H*.5,rc=Math.sqrt(cxd*cxd+cyd*cyd)/(.5*Math.min(W,H));const wave=Math.max(0,Math.min(1,(returnT-rc*.8)*1.5));const side=(h-.5)*2,curl=Math.min(1,d/80)*side*.6;const fx=dxH*.04*rate*wave+(-dyH)*.04*curl*wave,fy=dyH*.04*rate*wave+dxH*.04*curl*wave;velX[i]=(velX[i]+fx*dt60)*.74;velY[i]=(velY[i]+fy*dt60)*.74;posX[i]+=velX[i]*dt60;posY[i]+=velY[i]*dt60;if(d<.3&&Math.abs(velX[i])+Math.abs(velY[i])<.05){posX[i]=hx;posY[i]=hy;velX[i]=0;velY[i]=0;}}else{const dxH=homeX[i]-px,dyH=homeY[i]-py,distH=Math.sqrt(dxH*dxH+dyH*dyH);if(distH<.15){posX[i]=homeX[i];posY[i]=homeY[i];velX[i]=0;velY[i]=0;}else{const lf=.04*dt60;posX[i]+=dxH*lf;posY[i]+=dyH*lf;velX[i]=dxH*lf;velY[i]=dyH*lf;}}applyCapture1D(i);}
}
}}
}// end dimension check

// ══════════════════════════════════════
// 9. РЕНДЕР
// ══════════════════════════════════════

// 🌿 Рисуем массив частиц через WebGL (points)
function drawParticles(positions,o){gl.useProgram(program);gl.uniform2f(uResolution,W,H);gl.uniform1fv(uStopH,shaderH);gl.uniform1fv(uStopS,shaderS);gl.uniform1fv(uStopV,shaderV);gl.uniform1f(uAlpha,(o.alpha||1)*brightnessLevel*brightMult*toneExposureMul*reactiveBrightMul);gl.uniform3f(uColorMask,o.r!==undefined?o.r:1,o.g!==undefined?o.g:1,o.b!==undefined?o.b:1);gl.uniform1f(uRotation,o.rotation||0);gl.uniform1f(uScale,(o.scale||1)*zoomLevel);gl.uniform2f(uOffset,o.ox||0,o.oy||0);gl.uniform1f(uPointScale,(o.pointScale||1)*zoomLevel*mobileScale*PIXR);gl.uniform1f(uSphereMode,o.sphereMode||0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer);gl.bufferData(gl.ARRAY_BUFFER,positions,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.enableVertexAttribArray(aHue);gl.vertexAttribPointer(aHue,1,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,TOTAL);}
// 🌿 рисуем частицы с учётом мандалы (секторное зеркало)
function renderWithMode(positions,baseAlpha){
if(currentMode==='mandala'){const mp=modeParams.mandala;const sectors=Math.round(mp.sectors);const baseRot=time*.0003*spinDirection*(mp.mandalaSpin||1);for(let k=0;k<sectors;k++){const r=baseRot+k*Math.PI*2/sectors;drawParticles(positions,{rotation:r,alpha:baseAlpha*Math.max(.15,1-k*(1/(sectors+2))),scale:1});}}
else{drawParticles(positions,{alpha:baseAlpha});}}

// ═══ Тон: экспозиция по плотности (вар.1) + HDR ACES (вар.2). Дефолт — Аддитив (вид не меняется) ═══
let toneMode='add', toneDensityPower=1.0, toneAces=0.85, toneExposureMul=1;
// Аудиовизуал: 'pattern' (А — режим ведёт, музыка=акценты) | 'reactive' (Б — аудио ведёт)
let returnMode=0, returnT=0;
function hashF(i){var x=Math.sin(i*12.9898)*43758.5453;return x-Math.floor(x);}
let conductorOn=false, conductorSym=6, conductorPh1=0, conductorPh2=1.3, conductorSpeed=1, conductorRad=1, conductorSpeedT=1, conductorRadT=1, sceneBreath=0, paletteLerpSpeed=3, autopilotOn=false;
let vizMode='pattern', reactiveMul=1, reactiveBrightMul=1, envBass=0, envEnergy=0, envMid=0, envHigh=0, reactiveShock=0;
var TS={thresh:1.15,winBars:1,gain:1.6,release:1.2,oneAtATime:true,minRest:0.4,quant:'beat',lead:'bass',ground:0.15,forceGain:1.4,brightGain:0.9};
var ts={avg:0.2,acc:0,winT:0,gest:0,rest:0,pendingAmp:0,prevBp:0};
function computeTestSound(dt){
  var N=(typeof musicNorm!=='undefined')?musicNorm:musicBands;
  var playing=(typeof musicPlaying!=='undefined')&&(musicPlaying||beatPlaying);
  var rel=Math.max(0.2,TS.release);
  if(!playing){ts.gest*=Math.exp(-dt/rel);reactiveMul+=(1-reactiveMul)*0.1;reactiveBrightMul+=(1-reactiveBrightMul)*0.1;reactiveShock*=0.72;envBass=ts.gest;envEnergy=ts.gest*0.8;return;}
  var lead=(TS.lead==='bass'?N.bass:TS.lead==='mid'?N.mid:N.energy)||0, en=N.energy||0, bp=(typeof beatPulse!=='undefined')?beatPulse:0;
  ts.avg+=(lead-ts.avg)*0.02;                                   // фон (скользящее среднее)
  var sal=Math.max(0,lead-ts.avg*TS.thresh);                    // значимость: только выше фона
  var onset=(bp>0.4&&ts.prevBp<=0.4)?1:0; ts.prevBp=bp;
  ts.acc+=sal*dt*4+onset*0.35;                                  // слияние в окне
  var bpm=(typeof trackPassport!=='undefined'&&trackPassport.ready&&trackPassport.bpm)?trackPassport.bpm:0;
  var win=(bpm?(60/bpm*4):1.0)*TS.winBars;
  ts.winT+=dt; ts.rest+=dt; var fire=false;
  if(ts.winT>=win){var amp=Math.min(1,ts.acc*TS.gain);ts.acc=0;ts.winT=0;if(amp>0.12)ts.pendingAmp=Math.max(ts.pendingAmp,amp);}
  if(ts.pendingAmp>0){
    var busy=TS.oneAtATime&&ts.gest>0.35, rested=ts.rest>=TS.minRest;
    var q=(TS.quant==='off')||(TS.quant==='beat'&&bp>0.35)||(TS.quant==='bar'&&ts.winT<dt*2);
    if(!busy&&rested&&q){ts.gest=Math.max(ts.gest,ts.pendingAmp);fire=true;ts.rest=0;ts.pendingAmp=0;}
    else if(ts.rest>win*2){ts.pendingAmp=0;}
  }
  ts.gest*=Math.exp(-dt/rel);                                   // медленный спад жеста
  var ground=en*TS.ground;                                      // фон — едва заметная текстура
  reactiveMul=1+ts.gest*TS.forceGain+ground*0.3;
  reactiveBrightMul=1+ts.gest*TS.brightGain+ground*0.4;
  reactiveShock=fire?Math.max(reactiveShock,ts.gest*0.9):reactiveShock*0.72;
  envBass=ts.gest; envEnergy=ts.gest*0.8; envMid=ground; envHigh=ground; // Дирижёр ведёт жест
}
var RCFG={bassAtk:0.6,bassDec:0.06,midAtk:0.5,midDec:0.05,highAtk:0.7,highDec:0.12,enAtk:0.5,enDec:0.05,forceBass:0.9,forceMid:0.35,forceBeat:0.6,brightEn:0.7,brightBeat:1.0,brightHigh:0.5,shockSpike:0.7,shockDecay:0.72};
function computeReactive(dt){
  if(vizMode==='test'){computeTestSound(dt||0.016);return;}
  var C=RCFG;
  if(vizMode==='reactive'&&(typeof musicPlaying!=='undefined')&&(musicPlaying||beatPlaying)){
    const N=(typeof musicNorm!=='undefined')?musicNorm:musicBands;
    const b=N.bass||0,m=N.mid||0,h=N.high||0,en=N.energy||0,bp=(typeof beatPulse!=='undefined'?beatPulse:0);
    envBass+=(b>envBass?C.bassAtk:C.bassDec)*(b-envBass);
    envMid+=(m>envMid?C.midAtk:C.midDec)*(m-envMid);
    envHigh+=(h>envHigh?C.highAtk:C.highDec)*(h-envHigh);
    envEnergy+=(en>envEnergy?C.enAtk:C.enDec)*(en-envEnergy);
    reactiveShock=Math.max(reactiveShock*C.shockDecay,bp*bp*C.shockSpike);
    reactiveMul=1+envBass*C.forceBass+envMid*C.forceMid+bp*C.forceBeat;
    reactiveBrightMul=1+envEnergy*C.brightEn+bp*C.brightBeat+envHigh*C.brightHigh;
  } else {
    envBass+=(-envBass)*0.1;envMid+=(-envMid)*0.1;envHigh+=(-envHigh)*0.1;envEnergy+=(-envEnergy)*0.1;
    reactiveShock*=C.shockDecay;
    reactiveMul+=(1-reactiveMul)*0.12; reactiveBrightMul+=(1-reactiveBrightMul)*0.12;
  }
}
let hdrTex=null,hdrFbo=null,hdrW=0,hdrH=0,toneProg=null,toneQuadBuf=null,uToneHDR=null,uToneAces=null,aToneP=null,uToneEffect=null,uToneTexel=null;
const TONE_EFFECT={hdr:0,neon:1,duotone:2,vignette:3,chrome:4,soft:5,bloom:6};
const TONE_POST={hdr:1,neon:1,duotone:1,vignette:1,chrome:1,soft:1,bloom:1};
function densityExposure(pw){const base=Math.ceil(W/3)*Math.ceil(H/3);return Math.min(1,Math.pow(base/Math.max(1,TOTAL),pw));}
function ensureHDR(){
  if(!isWebGL2||!gl)return false;
  if(!toneProg){
    const tvs='attribute vec2 a_pos;varying vec2 vUV;void main(){vUV=a_pos*0.5+0.5;gl_Position=vec4(a_pos,0.0,1.0);}';
    const tfs='precision highp float;varying vec2 vUV;uniform sampler2D uHDR;uniform float uAces;uniform int uEffect;uniform vec2 uTexel;'
+'vec3 aces(vec3 x){x*=uAces;float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);}'
+'float luma(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}'
+'vec3 sat(vec3 c,float s){return mix(vec3(luma(c)),c,s);}'
+'float hash(vec2 p){return fract(sin(dot(p,vec2(41.0,289.0)))*43758.5453);}'
+'void main(){vec3 raw=texture2D(uHDR,vUV).rgb;vec3 col=aces(raw);'
+'if(uEffect==1){col=sat(col,1.6);}'
+'else if(uEffect==2){float l=luma(col);col=mix(vec3(0.06,0.02,0.12),vec3(0.1,0.9,1.0),l);}'
+'else if(uEffect==3){float d=distance(vUV,vec2(0.5));col*=smoothstep(0.9,0.32,d);}'
+'else if(uEffect==4){float o=uTexel.x*3.0;col=aces(vec3(texture2D(uHDR,vUV+vec2(o,0.0)).r,raw.g,texture2D(uHDR,vUV-vec2(o,0.0)).b));}'
+'else if(uEffect==5){col=pow(col,vec3(0.92));col+=(hash(floor(vUV*1000.0))-0.5)*0.03;}'
+'else if(uEffect==6){vec3 bl=vec3(0.0);float o=uTexel.x*4.0;for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){bl+=max(texture2D(uHDR,vUV+vec2(float(i),float(j))*o).rgb-0.6,0.0);}}col+=bl/25.0*1.6;}'
+'gl_FragColor=vec4(col,1.0);}';
    toneProg=mkProgram(mkShader(gl.VERTEX_SHADER,tvs),mkShader(gl.FRAGMENT_SHADER,tfs));
    if(!toneProg)return false;
    aToneP=gl.getAttribLocation(toneProg,'a_pos');uToneHDR=gl.getUniformLocation(toneProg,'uHDR');uToneAces=gl.getUniformLocation(toneProg,'uAces');uToneEffect=gl.getUniformLocation(toneProg,'uEffect');uToneTexel=gl.getUniformLocation(toneProg,'uTexel');
    toneQuadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,toneQuadBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  }
  var _pw=Math.round(W*PIXR),_ph=Math.round(H*PIXR);
  if(hdrW!==_pw||hdrH!==_ph||!hdrTex){
    if(hdrFbo)gl.deleteFramebuffer(hdrFbo);if(hdrTex)gl.deleteTexture(hdrTex);
    hdrTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,hdrTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,_pw,_ph,0,gl.RGBA,gl.HALF_FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    hdrFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,hdrFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,hdrTex,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);hdrW=_pw;hdrH=_ph;
  }
  return true;
}
function tonemapToScreen(){
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,Math.round(W*PIXR),Math.round(H*PIXR));gl.disable(gl.BLEND);
  gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(toneProg);gl.bindBuffer(gl.ARRAY_BUFFER,toneQuadBuf);gl.enableVertexAttribArray(aToneP);gl.vertexAttribPointer(aToneP,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hdrTex);gl.uniform1i(uToneHDR,0);gl.uniform1f(uToneAces,toneAces);gl.uniform1i(uToneEffect,TONE_EFFECT[toneMode]||0);gl.uniform2f(uToneTexel,1.0/W,1.0/H);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}

function renderGL(){
const _gpu=gpuActive();
if(!_gpu)for(let i=0;i<TOTAL;i++){glPositions[i*2]=posX[i];glPositions[i*2+1]=posY[i];}
toneExposureMul=(toneMode==='add')?1:densityExposure(toneDensityPower);
const hdr=(!!TONE_POST[toneMode])&&ensureHDR();
if(hdr){gl.bindFramebuffer(gl.FRAMEBUFFER,hdrFbo);gl.viewport(0,0,Math.round(W*PIXR),Math.round(H*PIXR));}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,Math.round(W*PIXR),Math.round(H*PIXR));}
if(trailMode&&!_gpu){
// 🌿 dim-quad — предыдущий кадр угасает, оставляя световой след
gl.useProgram(quadProgram);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.enableVertexAttribArray(aQuadPos);gl.vertexAttribPointer(aQuadPos,2,gl.FLOAT,false,0,0);
gl.uniform1f(uDim,trailFade*fadeMult);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
// 🌿 temporal ghost layers — призраки из прошлых мгновений
if(trailLayers>0&&trailLayerBuf){for(let layer=trailLayers;layer>=1;layer--){
for(let i=0;i<TOTAL;i++){trailLayerBuf[i*2]=posX[i]-velX[i]*layer*trailSpread;trailLayerBuf[i*2+1]=posY[i]-velY[i]*layer*trailSpread;}
renderWithMode(trailLayerBuf,0.35*(1-layer/(trailLayers+1)));}}
}else{gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}
if(_gpu){gpuDrawFromTexture(1);}else{renderWithMode(glPositions,1);}
if(hdr){tonemapToScreen();}}
function render2D(){if(!ctx2d)return;const imgData=ctx2d.createImageData(W,H),data=imgData.data;for(let i=0;i<TOTAL;i++){const px=posX[i]|0,py=posY[i]|0;if(px<0||px>=W||py<0||py>=H)continue;const r=colorCache[i*3],g=colorCache[i*3+1],b=colorCache[i*3+2];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const sx=px+dx,sy=py+dy;if(sx<0||sx>=W||sy<0||sy>=H)continue;const w=Math.exp(-(dx*dx+dy*dy)*.8)*1.2,off=(sy*W+sx)*4;data[off]=Math.min(255,data[off]+r*w);data[off+1]=Math.min(255,data[off+1]+g*w);data[off+2]=Math.min(255,data[off+2]+b*w);data[off+3]=255;}}ctx2d.putImageData(imgData,0,0);}
function render(){if(useWebGL&&gl&&!contextLost)renderGL();else render2D();}
let lastTime=performance.now(),animFrame;
function loop(ts){const dt=Math.min(.1,(ts-lastTime)/1000);lastTime=ts;if(dimension===3&&threeReady){time+=dt*1000*spinSpeed;render3DScene(dt);}else{update(dt);render();}if(classicVisOn)drawClassicAnalyzer();if(window._updateHoneycomb)window._updateHoneycomb(ts);if(window._updateFibers)window._updateFibers();animFrame=requestAnimationFrame(loop);}
// ══════════════════════════════════════
// 10. RESIZE И ПРОФИЛИ УСТРОЙСТВ
// ══════════════════════════════════════

let _resizeTimer=null;
function _reflow(){
    const nw=window.innerWidth,nh=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,2);
    if(nw<=0||nh<=0)return;                       // защита от переходных нулевых размеров
    if(nw===W&&nh===H&&dpr===PIXR)return;
    // полный ре-init: пересобрать сетку/буферы под новый размер, GPU-симуляцию пересоздать
    cancelAnimationFrame(animFrame);
    init();
    if(typeof gpuStateN!=='undefined')gpuStateN=-1;   // форс-пересборка GPU-симуляции
    if(dimension===3&&threeReady){renderer3D.setSize(W,H);renderer3D.setPixelRatio(dpr);camera3D.aspect=W/H;camera3D.updateProjectionMatrix();}
    if(dimension===4&&gl){gl.viewport(0,0,Math.round(W*PIXR),Math.round(H*PIXR));}
    lastTime=performance.now();animFrame=requestAnimationFrame(loop);
}
function _scheduleReflow(){clearTimeout(_resizeTimer);_resizeTimer=setTimeout(_reflow,200);}
window.addEventListener('resize',_scheduleReflow);
window.addEventListener('orientationchange',function(){clearTimeout(_resizeTimer);_resizeTimer=setTimeout(_reflow,350);});
if(window.visualViewport){window.visualViewport.addEventListener('resize',_scheduleReflow);}
const initNorm=normalizeStops(currentStops);for(let i=0;i<9;i++){shaderH[i]=initNorm[i].h;shaderS[i]=initNorm[i].s;shaderV[i]=initNorm[i].v;}
if(useWebGL)initGPU();init();render();animFrame=requestAnimationFrame(loop);
enhanceSliders();applyPlan();
// ══════════════════════════════════════
// 11. КЛАВИАТУРА И HAPTIC
// ══════════════════════════════════════

// #19 haptic feedback
function haptic(ms){try{if(navigator.vibrate)navigator.vibrate(ms||10);}catch(e){}}
// #10 keyboard shortcuts
document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    if(e.key===' '||e.code==='Space'){e.preventDefault();const pb=document.getElementById('musicPlayBtn');if(pb)pb.click();}
    else if(e.key==='Escape'){
        if(sidePanel.classList.contains('open')){sidePanel.classList.remove('open');activeTool=null;toolIcons.forEach(function(t){t.classList.remove('active');});}
        const pp=document.getElementById('profilePanel');if(pp&&pp.classList.contains('open'))pp.classList.remove('open');
        const bp=document.querySelector('.beat-panel.open');if(bp)bp.classList.remove('open');
        const bm=document.getElementById('bgMusicPanel');if(bm&&bm.classList.contains('open'))bm.classList.remove('open');
    }
    else if(e.key==='['||e.key==='{'){ const keys=Object.keys(palettes);const ci=keys.indexOf(currentPaletteKey);const ni=(ci-1+keys.length)%keys.length;const btn=document.querySelector('.palette-item[data-palette="'+keys[ni]+'"]');if(btn)btn.click();haptic();}
    else if(e.key===']'||e.key==='}'){ const keys=Object.keys(palettes);const ci=keys.indexOf(currentPaletteKey);const ni=(ci+1)%keys.length;const btn=document.querySelector('.palette-item[data-palette="'+keys[ni]+'"]');if(btn)btn.click();haptic();}
});
// ══════════════════════════════════════
// 12. МОБИЛЬНАЯ ШТОРКА
// ══════════════════════════════════════
const mDrawer=document.getElementById('mobileDrawer');
const mGrip=document.getElementById('drawerGrip');
const mGripClose=document.getElementById('mobileGripClose');
if(mDrawer&&mGrip){
    onTap(mGrip,function(e){e.stopPropagation();mDrawer.classList.toggle('open');});
    // grip на side-panel → закрыть всё
    if(mGripClose)onTap(mGripClose,function(e){e.stopPropagation();
        sidePanel.classList.remove('open');activeTool=null;
        toolIcons.forEach(function(t){t.classList.remove('active');});
        document.getElementById('profilePanel').classList.remove('open');
        document.getElementById('bgMusicPanel').classList.remove('open');
        if(typeof closeCustomPanel==='function')closeCustomPanel();
        mDrawer.classList.add('open');
    });
    // grip профиля
    const pGrip=document.getElementById('profileGripClose');
    if(pGrip)onTap(pGrip,function(e){e.stopPropagation();
        document.getElementById('profilePanel').classList.remove('open');
        mDrawer.classList.add('open');
    });
    // 2D/3D переключатели в шторке
    document.querySelectorAll('.drawer-scene').forEach(btn=>{
        onTap(btn,function(e){e.stopPropagation();
            if(btn.classList.contains('locked')){showLockToast('Доступно в Pro');return;}
            const sc=btn.dataset.dscene;
            document.querySelectorAll('.drawer-scene').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
            // синхронизируем с scene-bar
            const sceneBtn=document.querySelector('.scene-btn[data-scene="'+sc+'"]');
            if(sceneBtn)sceneBtn.click();
        });
    });
    // иконки шторки
    document.querySelectorAll('.drawer-item').forEach(item=>{
        onTap(item,function(e){e.stopPropagation();
            const tool=item.dataset.dtool;
            if(item.classList.contains('locked')){
                const msg=tool==='music'?'Доступно в DLC Аудио':tool==='create'?'Доступно в DLC Биты':'Доступно в Pro';
                showLockToast(msg);return;
            }
            mDrawer.classList.remove('open');
            if(tool==='profile'){document.getElementById('profilePanel').classList.toggle('open');return;}
            if(tool==='bgmusic'){document.getElementById('bgMusicPanel').classList.toggle('open');bgmBuildList();return;}
            switchTool(tool);
        });
    });
    // закрытие
    function closeAllMobilePanels(){
        sidePanel.classList.remove('open');activeTool=null;
        toolIcons.forEach(t=>t.classList.remove('active'));
        document.getElementById('profilePanel').classList.remove('open');
        document.getElementById('bgMusicPanel').classList.remove('open');
        if(typeof closeCustomPanel==='function')closeCustomPanel();
        mDrawer.classList.remove('open');
    }
    document.addEventListener('touchstart',function(e){if(!isUI(e))closeAllMobilePanels();},{passive:true});
    // isUI
    const origIsUI2=isUI;
    isUI=function(e){return origIsUI2(e)||e.target.closest('.mobile-drawer');};
    // 🔍 зум-кнопка через onTap
    const zoomBtnEl=document.getElementById('zoomBtn3D');
    if(zoomBtnEl)onTap(zoomBtnEl,function(e){e.stopPropagation();if(typeof toggleZoom3D==='function')toggleZoom3D();});
    // locked-состояние при смене тарифа
    const origApplyPlan=applyPlan;
    applyPlan=function(){origApplyPlan();
        document.querySelectorAll('.drawer-item').forEach(item=>{
            const t=item.dataset.dtool;
            if(t==='music')item.classList.toggle('locked',!dlcAudio);
            if(t==='create')item.classList.toggle('locked',!dlcBeats);
        });
        document.querySelectorAll('.drawer-scene').forEach(btn=>{
            btn.classList.toggle('locked',btn.dataset.dscene==='3d'&&userPlan==='free');
        });
    };
    applyPlan(); // 🌿 применяем locked-состояние к шторке при старте
}
// ══════════════════════════════════════
// 13. ВСТРОЕННЫЙ ПЛЕЕР (BGM)
// ══════════════════════════════════════
// 🎵 Встроенный плеер — музыка без визуализации, для всех тарифов
const bgmTracks=[
    {title:'Doing Damage',artist:'Dollshade',src:'music/bensound-doingdamage.mp3'},
    {title:'Moonlight Dream',artist:'Yunior Arronte',src:'music/bensound-moonlightdream.mp3'},
    {title:'On Repeat',artist:'Marcus P.',src:'music/bensound-onrepeat.mp3'},
    {title:'Slow Life',artist:'Benjamin Lazzarus',src:'music/bensound-slowlife.mp3'},
    {title:'Sunset Reverie',artist:'Tomas Novoa',src:'music/bensound-sunsetreverie.mp3'},
    {title:'Encoded (2ACES Remix)',artist:'Hardwell',src:'music/hardwell-encoded-2aces-remix.mp3'},
    {title:'Cloudy Groove',artist:'Lo Flow',src:'music/lo-flow-cloudy-groove.mp3'},
    {title:'Such Great Heights',artist:'The Postal Service',src:'music/the-postal-service-such-great-heights.mp3'}
];
let bgmAudio=new Audio(),bgmIdx=0,bgmPlaying=false;
bgmAudio.volume=0.6;

function bgmBuildList(){
    const list=document.getElementById('bgmTracklist');list.innerHTML='';
    bgmTracks.forEach((tr,i)=>{
        const el=document.createElement('div');el.className='bgm-track'+(i===bgmIdx?' active':'');
        el.innerHTML='<span class="bgm-track-num">'+(i+1)+'</span><div class="bgm-track-info"><div class="bgm-track-t">'+tr.title+'</div><div class="bgm-track-a">'+tr.artist+'</div></div>';
        onTap(el,e=>{e.stopPropagation();bgmIdx=i;bgmLoadAndPlay();});
        list.appendChild(el);
    });
}
function bgmLoadAndPlay(){
    const tr=bgmTracks[bgmIdx];
    bgmAudio.src=tr.src;bgmAudio.play().then(()=>{bgmPlaying=true;bgmUpdateUI();}).catch(()=>{});
}
function bgmUpdateUI(){
    document.getElementById('bgmNowTitle').textContent=bgmTracks[bgmIdx].title;
    document.getElementById('bgmNowArtist').textContent=bgmTracks[bgmIdx].artist;
    document.getElementById('bgmPlayIcon').innerHTML=bgmPlaying?'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>':'<path d="M8 5v14l11-7z"/>';
    document.getElementById('musicPulse').classList.toggle('on',bgmPlaying);
    bgmBuildList();
}
// кнопка ♪ — открыть/закрыть панель
onTap(document.getElementById('bgMusicToggle'),e=>{e.stopPropagation();
    document.getElementById('bgMusicPanel').classList.toggle('open');bgmBuildList();});
onTap(document.getElementById('bgmClose'),e=>{e.stopPropagation();
    document.getElementById('bgMusicPanel').classList.remove('open');});
// play/pause
onTap(document.getElementById('bgmPlay'),e=>{e.stopPropagation();
    if(!bgmAudio.src||bgmAudio.src===''){bgmLoadAndPlay();return;}
    if(bgmPlaying){bgmAudio.pause();bgmPlaying=false;}else{bgmAudio.play();bgmPlaying=true;}bgmUpdateUI();});
// prev/next
onTap(document.getElementById('bgmPrev'),e=>{e.stopPropagation();bgmIdx=(bgmIdx-1+bgmTracks.length)%bgmTracks.length;bgmLoadAndPlay();});
onTap(document.getElementById('bgmNext'),e=>{e.stopPropagation();bgmIdx=(bgmIdx+1)%bgmTracks.length;bgmLoadAndPlay();});
// progress
const bgmProg=document.getElementById('bgmProgress');
bgmProg.addEventListener('input',e=>{e.stopPropagation();if(bgmAudio.duration)bgmAudio.currentTime=bgmAudio.duration*(bgmProg.value/100);});
bgmProg.addEventListener('touchstart',e=>e.stopPropagation());
bgmAudio.addEventListener('timeupdate',()=>{
    if(bgmAudio.duration){bgmProg.value=(bgmAudio.currentTime/bgmAudio.duration)*100;
    document.getElementById('bgmTimeCur').textContent=fmtTime(bgmAudio.currentTime);
    document.getElementById('bgmTimeDur').textContent=fmtTime(bgmAudio.duration);}});
bgmAudio.addEventListener('ended',()=>{bgmIdx=(bgmIdx+1)%bgmTracks.length;bgmLoadAndPlay();});
// volume
const bgmVolSl=document.getElementById('bgmVol');
bgmVolSl.addEventListener('input',e=>{e.stopPropagation();bgmAudio.volume=bgmVolSl.value/100;});
bgmVolSl.addEventListener('touchstart',e=>e.stopPropagation());
// закрытие панели при тапе вне
document.getElementById('bgMusicPanel').addEventListener('click',e=>e.stopPropagation());
document.getElementById('bgMusicPanel').addEventListener('mousedown',e=>e.stopPropagation());
document.getElementById('bgMusicPanel').addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
// 🌿 тест тарифов
document.querySelectorAll('#planBtns .sub-btn').forEach(btn=>{
    if(btn.dataset.plan===userPlan)btn.classList.add('active');
    onTap(btn,function(e){e.stopPropagation();userPlan=btn.dataset.plan;
        document.querySelectorAll('#planBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyPlan();});
});
const dlcAS=document.getElementById('dlcAudioSwitch'),dlcBS=document.getElementById('dlcBeatsSwitch');
if(dlcAS)onTap(dlcAS,function(e){e.stopPropagation();dlcAudio=!dlcAudio;dlcAS.classList.toggle('on',dlcAudio);applyPlan();});
if(dlcBS)onTap(dlcBS,function(e){e.stopPropagation();dlcBeats=!dlcBeats;dlcBS.classList.toggle('on',dlcBeats);applyPlan();});

// ══════════════════════════════════════
// 14. СОТЫ (HONEYCOMB)
// ══════════════════════════════════════
// 🐝 Соты — гексагональная решётка с волнами света
(function(){
    const hcCanvas=document.getElementById('honeycombCanvas');
    if(!hcCanvas)return;
    const hctx=hcCanvas.getContext('2d');
    let hcCells=[],hcWaves=[],hcActive=false,hcPalNS=null;

    function resizeHC(){hcCanvas.width=window.innerWidth;hcCanvas.height=window.innerHeight;}
    window.addEventListener('resize',function(){if(hcActive){resizeHC();buildHCGrid();}});

    // 🌿 строим гексагональную сетку
    function buildHCGrid(){
        const mp=modeParams.honeycomb,sz=mp.cellSize||18,gap=mp.gap||2;
        hcCells=[];
        const W=hcCanvas.width,H=hcCanvas.height;
        const dx=sz*1.75+gap,dy=sz*1.52+gap;
        const cols=Math.ceil(W/dx)+2,rows=Math.ceil(H/dy)+2;
        for(let row=0;row<rows;row++){
            for(let col=0;col<cols;col++){
                const x=col*dx+(row%2)*(dx/2);
                const y=row*dy;
                if(x>W+sz||y>H+sz)continue;
                // цвет из палитры по позиции
                const t=((Math.atan2(y-H/2,x-W/2)/(Math.PI*2))+1)%1;
                hcCells.push({x:x,y:y,t:t,brightness:0});
            }
        }
    }

    // 🌿 рисуем один гексагон
    function drawHex(ctx,cx,cy,r,gap){
        ctx.beginPath();
        for(let i=0;i<6;i++){
            const ang=Math.PI/6+i*Math.PI/3;
            const px=cx+Math.cos(ang)*(r-gap*0.5);
            const py=cy+Math.sin(ang)*(r-gap*0.5);
            if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();
    }

    // 🌿 обновляем яркости ячеек от всех активных волн
    function updateHC(now){
        const mp=modeParams.honeycomb,decay=mp.decay||1.2,speed=(mp.waveSpeed||1.5)*200;
        // затухание
        for(let i=0;i<hcCells.length;i++)hcCells[i].brightness*=0.92;
        // волны — расходящиеся кольца
        for(let w=hcWaves.length-1;w>=0;w--){
            const wave=hcWaves[w];
            const age=(now-wave.time)/1000;
            const radius=age*speed;
            const strength=wave.strength*Math.exp(-age*decay);
            if(strength<0.01){hcWaves.splice(w,1);continue;}
            const ringW=40+age*30; // ширина кольца растёт
            for(let i=0;i<hcCells.length;i++){
                const c=hcCells[i];
                const dist=Math.hypot(c.x-wave.x,c.y-wave.y);
                const d=Math.abs(dist-radius);
                if(d<ringW){
                    const contrib=strength*(1-d/ringW);
                    c.brightness=Math.min(1,c.brightness+contrib);
                }
            }
        }
        // 🎵 музыка пускает волны автоматически
        if((typeof musicPlaying!=='undefined'&&musicPlaying)||(typeof beatPlaying!=='undefined'&&beatPlaying)){
            if(typeof beatPulse!=='undefined'&&beatPulse>0.5){
                hcWaves.push({x:hcCanvas.width/2,y:hcCanvas.height/2,time:now,strength:0.7});
                beatPulse=0.3; // гасим чтобы не спамить
            }
        }
    }

    // 🌿 рисуем соты
    function renderHC(){
        const mp=modeParams.honeycomb,sz=mp.cellSize||18,gap=mp.gap||2;
        const isKaleidoscope=Math.round(mp.sub||0)===1;
        hctx.fillStyle='#000';
        hctx.fillRect(0,0,hcCanvas.width,hcCanvas.height);
        if(!hcPalNS&&typeof normalizeStops==='function'&&typeof palettes!=='undefined'){
            hcPalNS=normalizeStops(palettes.default.stops);
        }
        const now=performance.now();
        const W=hcCanvas.width,H=hcCanvas.height,cx=W/2,cy=H/2;
        for(let i=0;i<hcCells.length;i++){
            const c=hcCells[i];
            let t=c.t,br=c.brightness;
            if(isKaleidoscope){
                // 🔮 Калейдоскоп — зеркальная симметрия, цвет по расстоянию+углу, всегда видно
                const dx=c.x-cx,dy=c.y-cy;
                const dist=Math.hypot(dx,dy);
                const ang=Math.atan2(Math.abs(dy),Math.abs(dx)); // зеркалим в первый квадрант
                // цвет вращается со временем — калейдоскоп живёт
                t=((ang/Math.PI+dist*0.003+now*0.00015)%1+1)%1;
                // квантизация в 6 ступеней — резкие цветовые границы как стёклышки
                t=Math.round(t*6)/6;
                br=0.25+br*0.75; // всегда видно, волна усиливает
            }else{
                if(br<0.01)continue;
            }
            let r=170,g=120,b=240;
            if(hcPalNS){const rgb=getPaletteColorCPU(t,hcPalNS);r=rgb[0];g=rgb[1];b=rgb[2];}
            hctx.fillStyle=`rgba(${Math.round(r*br)},${Math.round(g*br)},${Math.round(b*br)},${isKaleidoscope?0.92:0.15+br*0.85})`;
            drawHex(hctx,c.x,c.y,sz,gap);
            hctx.fill();
            if(isKaleidoscope){
                hctx.strokeStyle='rgba(0,0,0,0.55)';hctx.lineWidth=Math.max(1,gap);hctx.stroke();
            }
        }
    }

    // 🌿 касания пускают волны
    function hcPointerDown(e){
        if(!hcActive)return;
        const r=hcCanvas.getBoundingClientRect();
        hcWaves.push({x:e.clientX-r.left,y:e.clientY-r.top,time:performance.now(),strength:1});
    }
    function hcPointerMove(e){
        if(!hcActive||!e.buttons)return;
        const r=hcCanvas.getBoundingClientRect();
        // при перетаскивании — маленькие волны по пути
        if(Math.random()<0.3){
            hcWaves.push({x:e.clientX-r.left,y:e.clientY-r.top,time:performance.now(),strength:0.4});
        }
    }
    hcCanvas.addEventListener('pointerdown',hcPointerDown);
    hcCanvas.addEventListener('pointermove',hcPointerMove);

    // 🌿 хук на переключение режима — показываем/скрываем канвас сот
    const origSwitchMode=window._hcOrigSwitch||(function(){
        // перехватываем момент смены currentMode
        let lastMode='';
        setInterval(function(){
            if(typeof currentMode==='undefined')return;
            if(currentMode===lastMode)return;
            lastMode=currentMode;
            if(currentMode==='honeycomb'){
                hcActive=true;
                hcCanvas.classList.add('active');
                resizeHC();buildHCGrid();hcWaves=[];
            }else{
                hcActive=false;
                hcCanvas.classList.remove('active');
            }
        },200);
    })();

    // 🌿 цикл обновления сот — вызывается из основного loop
    window._updateHoneycomb=function(now){
        if(!hcActive)return;
        updateHC(now);
        renderHC();
    };
})();

// ══════════════════════════════════════
// 15. ГЕНЕЗИС (ПЕРВЫЙ ЗАПУСК)
// ══════════════════════════════════════
// 🌌 Начало — от пустоты к вселенной (первый запуск)
(function(){
    const GK='sf_genesisDone';
    if(localStorage.getItem(GK)==='1')return;

    let phase=0,bx=0,by=0,savedTotal=TOTAL;
    const hint=document.getElementById('genesisHint');

    // Скрываем UI, обнуляем частицы
    document.body.classList.add('ui-hidden');
    for(let i=0;i<savedTotal;i++){posX[i]=-999;posY[i]=-999;velX[i]=0;velY[i]=0;}

    if(hint)hint.style.display='';

    function divide(n){
        const prev=Math.max(1,TOTAL);
        TOTAL=Math.min(n,savedTotal);
        for(let i=prev;i<TOTAL;i++){
            const pi=Math.floor(Math.random()*prev);
            const a=Math.random()*Math.PI*2,d=4+Math.random()*18;
            posX[i]=posX[pi]+Math.cos(a)*d;
            posY[i]=posY[pi]+Math.sin(a)*d;
            velX[i]=(Math.random()-0.5)*1.5;velY[i]=(Math.random()-0.5)*1.5;
        }
    }

    document.addEventListener('pointerdown',function handler(e){
        if(phase!==0)return;
        if(e.target.closest&&e.target.closest('.toolbar,.side-panel,.profile-panel,.scene-bar'))return;
        phase=1;bx=e.clientX;by=e.clientY;
        if(hint){hint.classList.add('fade');setTimeout(()=>{hint.style.display='none';},800);}

        // Одна частица — рождение
        TOTAL=1;posX[0]=bx;posY[0]=by;velX[0]=0;velY[0]=0;

        setTimeout(()=>divide(6),1200);
        setTimeout(()=>divide(30),2200);
        setTimeout(()=>divide(150),3200);
        setTimeout(()=>divide(600),4200);
        setTimeout(()=>{divide(2000);currentMode='vortex';},5500);
        setTimeout(()=>divide(6000),7000);
        setTimeout(()=>{
            TOTAL=savedTotal;
            for(let i=6000;i<TOTAL;i++){
                const a=Math.random()*Math.PI*2,r=40+Math.random()*Math.max(W,H)*0.45;
                posX[i]=bx+Math.cos(a)*r;posY[i]=by+Math.sin(a)*r;
                velX[i]=(Math.random()-0.5)*2;velY[i]=(Math.random()-0.5)*2;
            }
        },9000);
        setTimeout(()=>{
            document.body.classList.remove('ui-hidden');
            localStorage.setItem(GK,'1');
        },11500);

        document.removeEventListener('pointerdown',handler);
    });
})();

// ══════════════════════════════════════
// 16. ВОЛОКНА (FIBERS)
// ══════════════════════════════════════
// 🧵 Волокна — частицы оставляют нити-хвосты
(function(){
    let active=false;
    const HLEN=30; // длина хвоста в кадрах
    const NFIBERS=1500; // сколько нитей рисуем
    let fiberStep=1; // шаг сэмплирования частиц по всему полю (не только верх)
    let histX,histY,hPtr=0;

    const fPalNS=(typeof normalizeStops==='function'&&typeof palettes!=='undefined')?normalizeStops(palettes.default.stops):null;
    function fRGB(t){if(fPalNS)return getPaletteColorCPU(t,fPalNS);return [170,120,240];}

    let lastMode='';
    setInterval(function(){
        if(typeof currentMode==='undefined')return;
        if(currentMode===lastMode)return;
        lastMode=currentMode;
        if(currentMode==='fibers'){
            active=true;
            fiberStep=Math.max(1,Math.floor(TOTAL/NFIBERS));
            histX=new Float32Array(NFIBERS*HLEN);
            histY=new Float32Array(NFIBERS*HLEN);
            for(let i=0;i<NFIBERS;i++){
                const pi=Math.min(TOTAL-1,i*fiberStep);
                for(let t=0;t<HLEN;t++){
                    histX[i*HLEN+t]=posX[pi]||0;
                    histY[i*HLEN+t]=posY[pi]||0;
                }
            }
            hPtr=0;
        }else{
            active=false;
        }
    },200);

    window._updateFibers=function(){
        if(!active||!histX)return;
        if(!useWebGL&&ctx2d)return; // для 2D fallback пока пропускаем
        // Сдвигаем историю: новые позиции записываем в текущий слот
        for(let i=0;i<NFIBERS;i++){
            // Сдвигаем всё на 1 назад
            for(let t=HLEN-1;t>0;t--){
                histX[i*HLEN+t]=histX[i*HLEN+t-1];
                histY[i*HLEN+t]=histY[i*HLEN+t-1];
            }
            histX[i*HLEN]=posX[Math.min(TOTAL-1,i*fiberStep)];
            histY[i*HLEN]=posY[Math.min(TOTAL-1,i*fiberStep)];
        }
        // Рисуем нити через WebGL overlay — но проще через dim-quad подход:
        // Не очищаем glCanvas полностью → нити накапливаются как следы
        // Это работает если в renderGL мы рисуем полупрозрачный чёрный квад перед частицами
    };
    // Простой подход: рисуем на отдельном 2D canvas
    let fCanvas=null,fCtx=null;
    function ensureFCanvas(){
        if(fCanvas)return;
        fCanvas=document.createElement('canvas');
        fCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none;display:none;';
        document.body.appendChild(fCanvas);
        fCtx=fCanvas.getContext('2d');
    }

    window._updateFibers=function(){
        if(!active||!histX)return;
        ensureFCanvas();
        if(fCanvas.style.display==='none'){
            fCanvas.style.display='block';
            fCanvas.width=window.innerWidth;fCanvas.height=window.innerHeight;
        }
        const mp=modeParams.fibers||{};
        const tLen=Math.min(HLEN,Math.round(mp.trailLen||20));
        const thick=mp.thickness||1;

        // Сдвигаем историю
        for(let i=0;i<NFIBERS;i++){
            for(let t=HLEN-1;t>0;t--){
                histX[i*HLEN+t]=histX[i*HLEN+t-1];
                histY[i*HLEN+t]=histY[i*HLEN+t-1];
            }
            histX[i*HLEN]=posX[Math.min(TOTAL-1,i*fiberStep)];
            histY[i*HLEN]=posY[Math.min(TOTAL-1,i*fiberStep)];
        }

        // Затухающий фон — нити накапливаются
        const bgA=Math.min(0.5,Math.max(0.02,1-(mp.fade||0.9)));
        fCtx.fillStyle='rgba(0,0,0,'+bgA+')';
        fCtx.fillRect(0,0,fCanvas.width,fCanvas.height);
        fCtx.globalCompositeOperation='lighter';

        for(let i=0;i<NFIBERS;i+=2){ // каждая вторая для производительности
            const rgb=fRGB((i/NFIBERS)%1);
            fCtx.beginPath();
            fCtx.moveTo(histX[i*HLEN],histY[i*HLEN]);
            for(let t=1;t<tLen;t++){
                fCtx.lineTo(histX[i*HLEN+t],histY[i*HLEN+t]);
            }
            fCtx.strokeStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`;
            fCtx.lineWidth=thick;
            fCtx.stroke();
        }
        fCtx.globalCompositeOperation='source-over';
    };

    // Скрываем canvas при выходе из режима
    let prevActive=false;
    setInterval(function(){
        if(prevActive&&!active&&fCanvas)fCanvas.style.display='none';
        prevActive=active;
    },300);
})();


// ============================================================
// 🌿 FPS-оверлей (дев-инструмент беты). Включение: ?fps=1 в URL,
// window.__fps(true/false), или клавиша F на десктопе.
// Отдельный rAF — не трогает основной цикл рендера.
// ============================================================
(function(){
    var el=document.createElement('div');
    el.id='fpsOverlay';
    el.style.cssText='position:fixed;top:8px;left:8px;z-index:9999;'
      +'font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;'
      +'padding:6px 9px;border-radius:8px;color:#fff;pointer-events:auto;cursor:pointer;'
      +'background:rgba(10,8,20,0.72);backdrop-filter:blur(4px);'
      +'border:1px solid rgba(255,255,255,0.12);white-space:pre;display:none;'
      +'letter-spacing:.02em;min-width:118px;';
    (document.body||document.documentElement).appendChild(el);

    var last=performance.now(), acc=0, frames=0, fps=0;
    var minFps=999, minReset=performance.now(), lastText=0, shown=false;

    function color(f){ return f>=50?'#5ce68a':f>=30?'#ffd000':'#ff5c6b'; }
    function sceneLabel(){ try{ return currentScene; }catch(e){ return '—'; } }
    function modeLabel(){ try{ return currentMode; }catch(e){ return '—'; } }
    function count(){ try{ return typeof TOTAL!=='undefined'?TOTAL:'—'; }catch(e){ return '—'; } }

    function loop(now){
        var dt=now-last; last=now; acc+=dt; frames++;
        if(acc>=250){ fps=Math.round(frames*1000/acc); frames=0; acc=0;
            if(now-minReset>3000){ minFps=999; minReset=now; } // окно минимума ~3с
            if(fps<minFps) minFps=fps;
        }
        if(shown && now-lastText>200){
            lastText=now;
            el.style.color=color(fps);
            el.textContent='FPS '+fps+'  (min '+(minFps===999?'—':minFps)+')'
                +'\n'+sceneLabel()+' · '+modeLabel()
                +'\n'+count()+' частиц';
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    var sw=document.getElementById('fpsSwitch');
    function set(on){ shown=!!on; el.style.display=shown?'block':'none';
        if(shown){ minFps=999; minReset=performance.now(); }
        if(sw) sw.classList.toggle('on',shown); }
    function toggle(persist){ set(!shown); if(persist!==false){ try{ localStorage.setItem('sf_fps',shown?'1':'0'); }catch(e){} } }
    window.__fps=function(on){ set(on); try{ localStorage.setItem('sf_fps',shown?'1':'0'); }catch(e){} };

    // восстановление выбора: сохранённая настройка или ?fps=1 (URL — разово, без записи)
    var want=false;
    try{ want=localStorage.getItem('sf_fps')==='1'; }catch(e){}
    try{ if(/[?&]fps=1\b/.test(location.search)) want=true; }catch(e){}
    if(want) set(true);

    // тумблер в Настройках
    if(sw){ var tap=(typeof onTap==='function')?onTap:function(elm,fn){elm.addEventListener('click',fn);};
        tap(sw,function(e){ if(e&&e.stopPropagation)e.stopPropagation(); toggle(true); }); }

    window.addEventListener('keydown',function(e){
        if((e.key==='f'||e.key==='F')&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
            var t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;
            toggle(true);
        }
    });
})();

// ============================================================
// 🌿 Яндекс.Метрика — заготовка. Впиши номер счётчика в SF_METRIKA_ID,
// и аналитика (просмотры, вебвизор, карта кликов) подключится сама.
// sfTrack(goal, params) — для целей/событий; до ввода ID безопасно ничего не делает.
// ============================================================
var SF_METRIKA_ID = ''; // например '99999999'
window.sfTrack = function(goal, params){
    try{ if(SF_METRIKA_ID && window.ym) ym(SF_METRIKA_ID,'reachGoal',goal,params||{}); }catch(e){}
};
(function(){
    if(!SF_METRIKA_ID) return; // без ID — не грузим внешний скрипт
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
    ym(SF_METRIKA_ID,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
})();

// ============================================================
// 🌿 Обратная связь — модальная форма по центру экрана (пока пустышка,
// без отправки). Открывается иконкой ОС в тулбаре (data-tool="feedback").
// ============================================================
(function(){
    var wrap=null;
    function build(){
        if(wrap) return;
        var st=document.createElement('style');
        st.textContent=
          '#fbModalWrap{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;padding:20px;}'
          +'#fbModalWrap.open{display:flex;}'
          +'#fbBackdrop{position:absolute;inset:0;background:rgba(4,3,10,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}'
          +'#fbModal{position:relative;width:100%;max-width:380px;background:rgba(8,8,16,0.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:22px;color:#f4f2ff;box-shadow:0 20px 60px rgba(0,0,0,0.5);font-family:system-ui,-apple-system,sans-serif;}'
          +'#fbModal h3{margin:0 4px 4px 0;font-weight:600;font-size:18px;}'
          +'#fbModal .fb-sub{margin:0 0 8px;font-size:13px;line-height:1.4;color:rgba(255,255,255,0.5);}'
          +'#fbModal label{display:block;font-size:12px;color:rgba(255,255,255,0.55);margin:12px 0 6px;}'
          +'#fbModal input,#fbModal textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:#f4f2ff;font-size:14px;font-family:inherit;padding:10px 12px;outline:none;transition:border-color .2s;}'
          +'#fbModal input:focus,#fbModal textarea:focus{border-color:rgba(255,255,255,0.3);}'
          +'#fbModal textarea{resize:vertical;min-height:88px;}'
          +'#fbModal .fb-actions{display:flex;gap:10px;margin-top:18px;}'
          +'#fbSend{flex:1;border:0;border-radius:10px;padding:12px;font-weight:600;font-size:14px;font-family:inherit;color:#160a1f;background:linear-gradient(100deg,#7b2cbf,#f72585,#48cae4);cursor:pointer;}'
          +'#fbClose{position:absolute;top:14px;right:14px;width:30px;height:30px;border:0;background:rgba(255,255,255,0.06);border-radius:8px;color:#fff;cursor:pointer;font-size:15px;line-height:1;}'
          +'#fbThanks{text-align:center;padding:20px 0;font-weight:600;font-size:16px;}';
        document.head.appendChild(st);
        wrap=document.createElement('div'); wrap.id='fbModalWrap';
        wrap.innerHTML=
          '<div id="fbBackdrop"></div>'
          +'<div id="fbModal" role="dialog" aria-modal="true">'
          +'<button id="fbClose" type="button" aria-label="Закрыть">✕</button>'
          +'<h3>Обратная связь</h3>'
          +'<p class="fb-sub">Ваш отзыв помогает сделать Soundfield лучше</p>'
          +'<div id="fbForm">'
          +'<label>Имя</label><input id="fbName" type="text" placeholder="Ваше имя">'
          +'<label>Email</label><input id="fbEmail" type="email" placeholder="you@example.com">'
          +'<label>Сообщение</label><textarea id="fbMsg" placeholder="Что понравилось или что улучшить?"></textarea>'
          +'<div class="fb-actions"><button id="fbSend" type="button">Отправить</button></div>'
          +'</div>'
          +'<div id="fbThanks" style="display:none">Спасибо за отзыв!</div>'
          +'</div>';
        document.body.appendChild(wrap);
        wrap.querySelector('#fbBackdrop').addEventListener('click',close);
        wrap.querySelector('#fbClose').addEventListener('click',close);
        wrap.querySelector('#fbModal').addEventListener('click',function(e){e.stopPropagation();});
        wrap.querySelector('#fbSend').addEventListener('click',submit);
        // самостоятельное окно: не пропускаем события в поле частиц под ним
        ['pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove',
         'touchstart','touchmove','touchend','wheel','click','dblclick','contextmenu']
         .forEach(function(ev){ wrap.addEventListener(ev,function(e){ e.stopPropagation(); }); });
    }
    function open(){
        build();
        wrap.querySelector('#fbForm').style.display='';
        wrap.querySelector('#fbThanks').style.display='none';
        wrap.classList.add('open');
        var fi=document.getElementById('feedbackToggle'); if(fi) fi.classList.add('active');
        if(typeof sfTrack==='function') sfTrack('feedback_open');
    }
    function close(){
        if(!wrap) return;
        wrap.classList.remove('open');
        var fi=document.getElementById('feedbackToggle'); if(fi) fi.classList.remove('active');
    }
    function submit(){
        // пустышка: пока никуда не отправляем — показываем благодарность
        if(typeof sfTrack==='function') sfTrack('feedback_send');
        wrap.querySelector('#fbForm').style.display='none';
        wrap.querySelector('#fbThanks').style.display='';
        setTimeout(close,1400);
    }
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&wrap&&wrap.classList.contains('open')) close(); });
    window.__feedback={open:open,close:close};

    // отдельная иконка-якорь (правый нижний угол) открывает модалку
    var icon=document.getElementById('feedbackToggle');
    if(icon){ var tap=(typeof onTap==='function')?onTap:function(el,fn){el.addEventListener('click',fn);};
        tap(icon,function(e){ e&&e.stopPropagation&&e.stopPropagation(); open(); }); }
})();

// ═══ UI тона (десктоп — нижняя панель, мобайл — Настройки; дефолт Аддитив) ═══
(function(){
    function setTone(m,persist){
        toneMode=m;
        document.querySelectorAll('#toneSegBar button').forEach(function(b){b.classList.toggle('on',b.dataset.v===m);});
        document.querySelectorAll('#toneSegSet .sub-btn').forEach(function(b){b.classList.toggle('active',b.dataset.v===m);});
        if(persist!==false){try{localStorage.setItem('sf_tone',m);}catch(e){}}
    }
    window.__setTone=setTone;
    var toneBarEl=document.getElementById('toneBar');
    if(toneBarEl){['pointerdown','pointerup','pointermove','mousedown','mouseup','touchstart','touchmove','touchend','wheel','click','dblclick','contextmenu'].forEach(function(ev){toneBarEl.addEventListener(ev,function(e){e.stopPropagation();});});}
    var bar=document.getElementById('toneSegBar');
    if(bar)bar.addEventListener('click',function(e){var b=e.target.closest('button');if(b){e.stopPropagation();setTone(b.dataset.v,true);}});
    var setg=document.getElementById('toneSegSet');
    if(setg&&typeof onTap==='function')setg.querySelectorAll('.sub-btn').forEach(function(b){onTap(b,function(e){e.stopPropagation();setTone(b.dataset.v,true);});});
    var ds=document.getElementById('toneDensitySlider');
    if(ds)ds.addEventListener('input',function(e){e.stopPropagation();toneDensityPower=+this.value/100;});
    var as=document.getElementById('toneAcesSlider');
    if(as)as.addEventListener('input',function(e){e.stopPropagation();toneAces=+this.value/100;});
    // пост-тона требуют WebGL2 — если недоступен, прячем их
    if(!isWebGL2){
        ['hdr','bloom','neon','duotone','vignette','chrome','soft'].forEach(function(v){var e=document.querySelector('#toneSegSet .sub-btn[data-v="'+v+'"]');if(e)e.style.display='none';});
    }
    var saved=null;try{saved=localStorage.getItem('sf_tone');}catch(e){}
    if(saved==='exp'||(saved&&TONE_POST[saved]&&isWebGL2))setTone(saved,false); else setTone('add',false);
})();

// ═══════════════════════════════════════════════════════════════
// Этап 3 — GPU-движок частиц (WebGL2 GPGPU). 2D, режимы Вихрь/Мицелий.
// CPU остаётся дефолтом и фолбэком. var — чтобы не ловить TDZ при первом render().
// ═══════════════════════════════════════════════════════════════
var engineMode='cpu';
var gpuSupported=isWebGL2;
var gpuSimProg=null,gpuRenderProg=null,gpuTexA=null,gpuTexB=null,gpuFboA=null,gpuFboB=null,gpuHome=null,gpuHueTex=null,gpuVAO=null,gpuQuad=null,gpuStateN=-1,gpuTW=0,gpuTH=0;

function gpuBuildProgs(){
    if(gpuSimProg)return true;
    var quadVS='#version 300 es\nin vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';
    var simFS='#version 300 es\nprecision highp float;\n'+'uniform sampler2D uState,uHome;uniform vec3 uPts[8];uniform int uNumPts;uniform float uActive,uTime,uDt,uP0,uP1,uSpin,uReactiveMul,uShape,uShock,uOrganic,uReturnT,uGap;uniform int uMode,uTexW,uCols,uRows;uniform vec2 uRes;out vec4 o;\n'+'vec2 shapeHome(int id){float R=min(uRes.x,uRes.y)*0.36;float cx=uRes.x*0.5,cy=uRes.y*0.5;float rotA=uTime*0.0003*uSpin;float ct=cos(0.35),st=sin(0.35);float persp=800.0;float sx=0.0,sy=0.0,sz=0.0;int C=uCols,Rw=uRows;if(uShape<1.5){int r=id/C;int c=id-r*C;float theta=3.14159265*(float(r)/float(Rw-1));float phi=6.2831853*float(c)/float(C);sx=R*sin(theta)*cos(phi+rotA);sy=R*sin(theta)*sin(phi+rotA);sz=R*cos(theta);}else if(uShape<2.5){int face=id-(id/6)*6;int fi=id/6;int cols=int(ceil(sqrt(float(C*Rw)/6.0)));int rows=cols;float u=float(fi-(fi/cols)*cols)/float(cols-1)*2.0-1.0;float v=float((fi/cols)-((fi/cols)/rows)*rows)/float(rows-1)*2.0-1.0;float s=R*0.7;if(face==0){sx=s;sy=u*s;sz=v*s;}else if(face==1){sx=-s;sy=u*s;sz=v*s;}else if(face==2){sx=u*s;sy=s;sz=v*s;}else if(face==3){sx=u*s;sy=-s;sz=v*s;}else if(face==4){sx=u*s;sy=v*s;sz=s;}else{sx=u*s;sy=v*s;sz=-s;}float ca=cos(rotA),sa=sin(rotA);float sxr=sx*ca-sz*sa,szr=sx*sa+sz*ca;sx=sxr;sz=szr;}else if(uShape<3.5){int face=id-(id/4)*4;int fi=id/4;int cols=int(ceil(sqrt(float(C*Rw)/4.0)));int rows=cols;float u=float(fi-(fi/cols)*cols)/float(cols>1?cols-1:1);float v=float((fi/cols)-((fi/cols)/rows)*rows)/float(rows>1?rows-1:1);if(u+v>1.0){u=1.0-u;v=1.0-v;}float w=1.0-u-v;float s=R*0.85;float h=s*1.633;vec3 A,B,Cc;vec3 q0=vec3(0.0,h*0.75,0.0),q1=vec3(-s,-h*0.25,-s*0.577),q2=vec3(s,-h*0.25,-s*0.577),q3=vec3(0.0,-h*0.25,s*1.155);if(face==0){A=q0;B=q1;Cc=q2;}else if(face==1){A=q0;B=q2;Cc=q3;}else if(face==2){A=q0;B=q3;Cc=q1;}else{A=q1;B=q3;Cc=q2;}sx=A.x*w+B.x*u+Cc.x*v;sy=A.y*w+B.y*u+Cc.y*v;sz=A.z*w+B.z*u+Cc.z*v;float ca=cos(rotA),sa=sin(rotA);float sxr=sx*ca-sz*sa,szr=sx*sa+sz*ca;sx=sxr;sz=szr;}else{float bigR=R*0.65,smallR=R*0.3;int r=id/C;int c=id-r*C;float u2=6.2831853*float(c)/float(C>1?C-1:1);float v2=6.2831853*float(r)/float(Rw>1?Rw-1:1);sx=(bigR+smallR*cos(v2+rotA*0.3))*cos(u2+rotA);sy=(bigR+smallR*cos(v2+rotA*0.3))*sin(u2+rotA);sz=smallR*sin(v2+rotA*0.3);}float sy2=sy*ct-sz*st,sz2=sy*st+sz*ct;float sc=persp/(persp+sz2);return vec2(cx+sx*sc,cy+sy2*sc);}\n'+'void main(){ivec2 tc=ivec2(gl_FragCoord.xy);vec4 s=texelFetch(uState,tc,0);vec2 pos=s.xy,vel=s.zw;int _id=tc.y*uTexW+tc.x;vec2 home=(uShape>0.5)?shapeHome(_id):texelFetch(uHome,tc,0).xy;\n'+'if(uActive>0.5){vec2 F=vec2(0.0);for(int p=0;p<8;p++){if(p>=uNumPts)break;vec2 d=uPts[p].xy-pos;float dist=length(d);if(dist<0.2)continue;float st=uPts[p].z;vec2 n=d/dist;float nx=n.x,ny=n.y;float angle=atan(d.y,d.x);\n'+' if(uMode==0){ if(dist<4.0){F+=n*25.0*st*uP0;}else{float a=180.0/(dist+2.0)*st*uP0;F+=vec2(nx*a+(-ny)*a*uP1,ny*a+nx*a*uP1);} }\n'+' else if(uMode==1){ if(dist>=0.5){float gr=uP0,br=uP1;float pulse=sin(uTime*0.002*gr+dist*0.1)*0.5+0.5;float f=6.0/(dist*0.15+0.5)*(0.6+pulse*0.4)*st*gr;F+=vec2(cos(angle)*f,sin(angle)*f);float bf=sin(angle*3.0*br+uTime*0.001)*3.0*br/(dist*0.1+0.5)*st;F+=vec2(cos(angle+1.5707963)*bf,sin(angle+1.5707963)*bf);} }\n'+' else if(uMode==2){ if(dist>=0.5){float f=15.0*uP1*sin(dist*0.3*uP0)/(dist*0.1+1.0)*st;F+=vec2(cos(angle)*f,sin(angle)*f);} }\n'+' else if(uMode==3){ if(dist>=0.5){float sa=log(dist+1.0)*1.618*2.4*uP0;float f=8.0*uP1/(dist*0.3+0.5)*st;F+=vec2(cos(angle+sa)*f,sin(angle+sa)*f);F+=vec2(cos(angle+1.5707963)*f*0.6,sin(angle+1.5707963)*f*0.6);} }\n'+' else if(uMode==4){ if(dist>=0.5){float coh=5.0*uP0/(dist*0.2+0.5);float sep=dist<20.0?-15.0*uP1/(dist*dist*0.05+0.5):0.0;float ali=sin(uTime*0.001+angle*2.0)*3.0;float f=(coh+sep+ali)*st;F+=vec2(cos(angle)*f,sin(angle)*f);} }\n'+' else if(uMode==5){ if(dist>=0.5){float nsv=sin(pos.x*0.1*uP1+uTime*0.01)*cos(pos.y*0.13*uP1+uTime*0.008);float f=(8.0+nsv*6.0)*uP0/(dist*0.1+0.5)*st;F+=vec2(nx*f,ny*f);F+=vec2(-ny*nsv*3.0*st*uP0,nx*nsv*3.0*st*uP0);} }\n'+' else if(uMode==6){ if(dist>=0.5){float lx=pos.x*0.02-10.0;float ly=pos.y*0.02-10.0;float dxl=10.0*(ly-lx);float dyl=lx*(28.0-(mod(uTime*0.001*uP0,60.0)+20.0))-ly;float len=sqrt(dxl*dxl+dyl*dyl)+0.01;float f=4.0*uP1/(dist*0.1+0.5)*st;F+=vec2(dxl/len*f,dyl/len*f);} }\n'+' else if(uMode==7){ if(dist>=0.5){float cellSz=10.0/uP0;float stt=mod(floor(pos.x/cellSz)+floor(pos.y/cellSz)+floor(uTime*0.01*uP1),3.0);float f=(stt<0.5?5.0:(stt<1.5?-3.0:sin(dist*0.2)*4.0))/(dist*0.1+0.5)*st;F+=vec2(nx*f,ny*f);} }\n'+' else if(uMode==8){ if(dist>=1.0){float sg=(mod(float(p),2.0)<0.5)?1.0:-1.0;float f=sg*80.0*uP0/(dist*dist+4.0)*st;F+=vec2(nx*f,ny*f);float cr2=sin(angle*4.0+dist*0.1)*3.0*uP1/(dist*0.1+0.5)*st;F+=vec2(-ny*cr2,nx*cr2);} }\n'+' else if(uMode==9){ if(dist>=0.5){float w=sin(dist*0.15-uTime*0.008*uP0)*st;float f=w*10.0/(dist*0.08+0.4);F+=vec2(nx*f,ny*f);F+=vec2(-ny*2.0*uP1/(dist*0.1+0.5)*st,nx*2.0*uP1/(dist*0.1+0.5)*st);} }\n'+' else if(uMode==10){ if(dist>=0.5){float br=sin(uTime*0.002*uP0)*0.5+0.5;float f=br*10.0*uP1/(dist*0.1+0.5)*st;F+=vec2(nx*f,ny*f);} }\n'+' else if(uMode==11){ if(dist>=0.5){float f=14.0*st/(dist*0.15+0.5);F+=vec2(nx*f,ny*f);float sf=8.0*st/(dist*0.2+0.6)*uSpin;F+=vec2(-ny*sf,nx*sf);} }\n'+'}\n'+'  if(uShock>0.001){vec2 fc=pos-uRes*0.5;float dc=length(fc)+1.0;F+=fc/dc*uShock*14.0;}\n'+'  vel=(vel+F*uReactiveMul*uDt)*0.92; float sp=length(vel); if(sp>25.0) vel=vel/sp*25.0; pos+=vel*uDt;\n'+'} else { if(uOrganic>1.5){vel*=0.85;pos+=vel*uDt;}else if(uOrganic>0.5){float h=fract(sin(float(_id)*12.9898)*43758.5453);vec2 dH=home-pos;float d=length(dH);float rate=0.6+0.8*h;vec2 cc=pos-uRes*0.5;float rc=length(cc)/(0.5*min(uRes.x,uRes.y));float wave=clamp((uReturnT-rc*0.8)*1.5,0.0,1.0);float side=(h-0.5)*2.0;float curl=min(1.0,d/80.0)*side*0.6;vec2 Fr=dH*0.04*rate*wave+vec2(-dH.y,dH.x)*0.04*curl*wave;vel=(vel+Fr*uDt)*0.74;pos+=vel*uDt;if(d<0.3&&length(vel)<0.05){pos=home;vel=vec2(0.0);}}else{vec2 dH=home-pos; float distH=length(dH); if(distH<0.15){pos=home;vel=vec2(0.0);} else { float lf=0.04*uDt; pos+=dH*lf; vel=dH*lf; }} }\n'+'o=vec4(pos,vel);}';
    gpuSimProg=mkProgram(mkShader(gl.VERTEX_SHADER,quadVS),mkShader(gl.FRAGMENT_SHADER,simFS));
    var rVS='#version 300 es\nuniform sampler2D uState,uHue;uniform vec2 uTex,u_res,u_offset;uniform float u_rotation,u_scale,u_pointScale;out float v_hue;\n'
      +'void main(){int id=gl_VertexID;int tw=int(uTex.x);ivec2 tc=ivec2(id%tw,id/tw);vec2 pos=texelFetch(uState,tc,0).xy;v_hue=texelFetch(uHue,tc,0).x;\n'
      +'pos+=u_offset;vec2 ctr=u_res*0.5;pos=ctr+(pos-ctr)*u_scale;float c=cos(u_rotation),s=sin(u_rotation);pos=ctr+vec2(c*(pos.x-ctr.x)-s*(pos.y-ctr.y),s*(pos.x-ctr.x)+c*(pos.y-ctr.y));\n'
      +'vec2 clip=(pos/u_res)*2.0-1.0;clip.y=-clip.y;gl_Position=vec4(clip,0.0,1.0);gl_PointSize=2.5*u_pointScale;}';
    var rFS='#version 300 es\nprecision mediump float;in float v_hue;uniform float u_stopH[9],u_stopS[9],u_stopV[9];uniform float u_alpha;out vec4 frag;\n'
      +'vec3 hsv2rgb(float h,float s,float v){h=mod(h,360.0);float c=v*s;float x=c*(1.0-abs(mod(h/60.0,2.0)-1.0));float m=v-c;vec3 r;if(h<60.0)r=vec3(c,x,0);else if(h<120.0)r=vec3(x,c,0);else if(h<180.0)r=vec3(0,c,x);else if(h<240.0)r=vec3(0,x,c);else if(h<300.0)r=vec3(x,0,c);else r=vec3(c,0,x);return r+m;}\n'
      +'vec3 pal(float t){float idx=t*8.0;int lo=int(floor(idx));int hi=lo+1;if(hi>8)hi=8;if(lo<0)lo=0;float f=idx-float(lo);float h1,s1,v1,h2,s2,v2;for(int i=0;i<9;i++){if(i==lo){h1=u_stopH[i];s1=u_stopS[i];v1=u_stopV[i];}if(i==hi){h2=u_stopH[i];s2=u_stopS[i];v2=u_stopV[i];}}float d=h2-h1;if(d>180.0)h1+=360.0;else if(d<-180.0)h2+=360.0;return hsv2rgb(mix(h1,h2,f),mix(s1,s2,f),mix(v1,v2,f));}\n'
      +'void main(){vec2 pc=gl_PointCoord*2.0-1.0;float d=dot(pc,pc);float a=exp(-d*2.5)*1.60*u_alpha;if(a<0.01)discard;vec3 col=pal(v_hue);frag=vec4(col*a,a);}';
    gpuRenderProg=mkProgram(mkShader(gl.VERTEX_SHADER,rVS),mkShader(gl.FRAGMENT_SHADER,rFS));
    gpuVAO=gl.createVertexArray();
    gpuQuad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gpuQuad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    return !!(gpuSimProg&&gpuRenderProg);
}
function gpuInitState(){
    if(!gpuBuildProgs())return false;
    gpuTW=Math.ceil(Math.sqrt(TOTAL));gpuTH=Math.ceil(TOTAL/gpuTW);var NPAD=gpuTW*gpuTH;
    var st=new Float32Array(NPAD*4),hm=new Float32Array(NPAD*4),hu=new Float32Array(NPAD);
    for(var i=0;i<NPAD;i++){if(i<TOTAL){st[i*4]=posX[i];st[i*4+1]=posY[i];hm[i*4]=homeX[i];hm[i*4+1]=homeY[i];hu[i]=hue[i];}else{st[i*4]=-99999;st[i*4+1]=-99999;hm[i*4]=-99999;hm[i*4+1]=-99999;}}
    function mk(data,internal,fmt){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,internal,gpuTW,gpuTH,0,fmt,gl.FLOAT,data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
    if(gpuFboA)gl.deleteFramebuffer(gpuFboA);if(gpuFboB)gl.deleteFramebuffer(gpuFboB);
    if(gpuTexA)gl.deleteTexture(gpuTexA);if(gpuTexB)gl.deleteTexture(gpuTexB);if(gpuHome)gl.deleteTexture(gpuHome);if(gpuHueTex)gl.deleteTexture(gpuHueTex);
    gpuTexA=mk(st,gl.RGBA32F,gl.RGBA);gpuTexB=mk(null,gl.RGBA32F,gl.RGBA);gpuHome=mk(hm,gl.RGBA32F,gl.RGBA);gpuHueTex=mk(hu,gl.R32F,gl.RED);
    gpuFboA=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,gpuFboA);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,gpuTexA,0);
    gpuFboB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,gpuFboB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,gpuTexB,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gpuStateN=TOTAL;return true;
}
var GPU_SPEC={vortex:[0,'force',1,'spin',0.6],mycelium:[1,'growth',1,'branching',1],wave:[2,'frequency',1,'amplitude',1],fibonacci:[3,'spiralTight',1,'force',1],swarm:[4,'cohesion',1,'separation',1],turbulence:[5,'intensity',1,'noiseScale',1],lorenz:[6,'speed',1,'force',1],automaton:[7,'cellSize',1,'speed',1],electrostatic:[8,'charge',1,'crystal',1],pulsar:[9,'pulseSpeed',1,'tangent',1],breathing:[10,'breathSpeed',1,'depth',1]};
function gpuActive(){return engineMode==='gpu'&&gpuSupported&&typeof dimension!=='undefined'&&dimension===0&&!!GPU_SPEC[currentMode]&&(gpuStateN===TOTAL||gpuInitState());}
function gpuSimStep(dt60,points,isActive){
    gl.bindFramebuffer(gl.FRAMEBUFFER,gpuFboB);gl.viewport(0,0,gpuTW,gpuTH);gl.disable(gl.BLEND);
    gl.useProgram(gpuSimProg);gl.bindVertexArray(gpuVAO);gl.bindBuffer(gl.ARRAY_BUFFER,gpuQuad);
    var ap=gl.getAttribLocation(gpuSimProg,'a_pos');gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpuTexA);gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uState'),0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gpuHome);gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uHome'),1);
    var mp=modeParams[currentMode]||{};var spec=GPU_SPEC[currentMode]||GPU_SPEC.vortex;var mode=spec[0];
    var p0=(spec[1]?mp[spec[1]]:0)||spec[2];var p1=(spec[3]?mp[spec[3]]:0)||spec[4];
    var np=Math.min(8,points.length);var arr=new Float32Array(24);
    for(var i=0;i<np;i++){arr[i*3]=points[i].x;arr[i*3+1]=points[i].y;arr[i*3+2]=points[i].strength||1;}
    gl.uniform3fv(gl.getUniformLocation(gpuSimProg,'uPts'),arr);
    gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uNumPts'),np);
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uActive'),isActive?1:0);
    gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uMode'),mode);
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uTime'),time);gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uDt'),dt60);
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uP0'),p0);gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uP1'),p1);
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uSpin'),(typeof spinDirection!=='undefined'?spinDirection:1));
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uReactiveMul'),(typeof reactiveMul!=='undefined'?reactiveMul:1));
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uShock'),(typeof reactiveShock!=='undefined'?reactiveShock:0));
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uOrganic'),returnMode);gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uReturnT'),returnT);gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uGap'),GAP);
    gl.uniform1f(gl.getUniformLocation(gpuSimProg,'uShape'),(typeof canvasShape!=='undefined'?canvasShape:0));
    gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uTexW'),gpuTW);
    gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uCols'),COLS);
    gl.uniform1i(gl.getUniformLocation(gpuSimProg,'uRows'),ROWS);
    gl.uniform2f(gl.getUniformLocation(gpuSimProg,'uRes'),W,H);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.bindVertexArray(null);
    var t=gpuTexA;gpuTexA=gpuTexB;gpuTexB=t;var f=gpuFboA;gpuFboA=gpuFboB;gpuFboB=f;
}
function gpuDrawFromTexture(alpha){
    gl.useProgram(gpuRenderProg);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindVertexArray(gpuVAO);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpuTexA);gl.uniform1i(gl.getUniformLocation(gpuRenderProg,'uState'),0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gpuHueTex);gl.uniform1i(gl.getUniformLocation(gpuRenderProg,'uHue'),1);
    gl.uniform2f(gl.getUniformLocation(gpuRenderProg,'uTex'),gpuTW,gpuTH);gl.uniform2f(gl.getUniformLocation(gpuRenderProg,'u_res'),W,H);
    gl.uniform2f(gl.getUniformLocation(gpuRenderProg,'u_offset'),0,0);gl.uniform1f(gl.getUniformLocation(gpuRenderProg,'u_rotation'),0);
    gl.uniform1f(gl.getUniformLocation(gpuRenderProg,'u_scale'),zoomLevel);gl.uniform1f(gl.getUniformLocation(gpuRenderProg,'u_pointScale'),zoomLevel*mobileScale*PIXR);
    gl.uniform1fv(gl.getUniformLocation(gpuRenderProg,'u_stopH'),shaderH);gl.uniform1fv(gl.getUniformLocation(gpuRenderProg,'u_stopS'),shaderS);gl.uniform1fv(gl.getUniformLocation(gpuRenderProg,'u_stopV'),shaderV);
    gl.uniform1f(gl.getUniformLocation(gpuRenderProg,'u_alpha'),alpha*brightnessLevel*brightMult*toneExposureMul*reactiveBrightMul);
    gl.drawArrays(gl.POINTS,0,TOTAL);gl.bindVertexArray(null);
}

// ═══ UI движка (десктоп — нижняя панель, мобайл — Настройки; дефолт CPU) ═══
(function(){
    function setEngine(m,persist){
        engineMode=m; if(m==='gpu'){gpuStateN=-1;if(typeof gpu3dInvalidate==='function')gpu3dInvalidate();} else {if(typeof gpu3dInvalidate==='function')gpu3dInvalidate();}
        // переприменить потолок частиц при смене движка (CPU-предел против зависаний с музыкой)
        if(desiredParticles>150000&&(typeof currentScene==='undefined'||currentScene!=='3d')){cancelAnimationFrame(animFrame);init();lastTime=performance.now();animFrame=requestAnimationFrame(loop);}
        document.querySelectorAll('#engSegBar button').forEach(function(b){b.classList.toggle('on',b.dataset.v===m);});
        document.querySelectorAll('#engSegSet .sub-btn').forEach(function(b){b.classList.toggle('on',b.dataset.v===m);});
        if(persist!==false){try{localStorage.setItem('sf_engine',m);}catch(e){}}
    }
    window.__setEngine=setEngine;
    var eb=document.getElementById('engSegBar');
    if(eb)eb.addEventListener('click',function(e){var b=e.target.closest('button');if(b){e.stopPropagation();setEngine(b.dataset.v,true);}});
    var es=document.getElementById('engSegSet');
    if(es)es.addEventListener('click',function(e){var b=e.target.closest('.sub-btn');if(b){e.stopPropagation();setEngine(b.dataset.v,true);}});
    if(!gpuSupported){
        var g1=document.querySelector('#engSegBar button[data-v="gpu"]');if(g1)g1.style.display='none';
        var g2=document.querySelector('#engSegSet .sub-btn[data-v="gpu"]');if(g2)g2.style.display='none';
    }
    setEngine(gpuSupported?'gpu':'cpu',false); // GPU по умолчанию, CPU — тихий фолбэк
})();

// ═══ Ползунок «Частиц» (наглядно показывает количество; потолок под GPU) ═══
(function(){
    var s=document.getElementById('partSlider'),lbl=document.getElementById('partCountV');
    if(!s||!lbl)return;
    function fmt(n){return n>=1000?Math.round(n/1000)+'k':(''+n);}
    // при старте показываем фактическое текущее количество
    try{ s.value=Math.max(+s.min,Math.min(+s.max,TOTAL)); }catch(e){}
    lbl.textContent='Частиц: '+fmt(typeof TOTAL!=='undefined'?TOTAL:0);
    s.addEventListener('input',function(e){e.stopPropagation();lbl.textContent='Частиц: '+fmt(+this.value);});
    s.addEventListener('touchstart',function(e){e.stopPropagation();});
    s.addEventListener('touchend',function(e){e.stopPropagation();});
    s.addEventListener('change',function(e){e.stopPropagation();
        if(typeof currentScene!=='undefined'&&currentScene==='3d'&&typeof rebuild3DParticles==='function'){
            var want=+this.value;var cap=(engineMode==='gpu')?800000:120000;want=Math.min(want,cap);
            var pps=Math.max(2,Math.round(Math.cbrt(want)));particleGap3D=cubeSize3D/pps;
            rebuild3DParticles();if(typeof gpu3dInvalidate==='function')gpu3dInvalidate();
            lbl.textContent='Частиц: '+fmt(total3D);
        } else {
            desiredParticles=+this.value;
            cancelAnimationFrame(animFrame);init();lastTime=performance.now();animFrame=requestAnimationFrame(loop);
            lbl.textContent='Частиц: '+fmt(TOTAL);
        }
    });
})();

// ═══ UI аудиовизуала (Паттерн / Реактив) ═══
(function(){
    function setViz(m,persist){
        vizMode=m;var _tp=document.getElementById('tsPanel');if(_tp)_tp.style.display=(m==='test'?'':'none');
        document.querySelectorAll('#vizSegBar button').forEach(function(b){b.classList.toggle('on',b.dataset.v===m);});
        document.querySelectorAll('#vizSegSet .sub-btn').forEach(function(b){b.classList.toggle('active',b.dataset.v===m);});
        if(persist!==false){try{localStorage.setItem('sf_viz',m);}catch(e){}}
    }
    window.__setViz=setViz;
    var bar=document.getElementById('vizSegBar');
    if(bar)bar.addEventListener('click',function(e){var b=e.target.closest('button');if(b){e.stopPropagation();setViz(b.dataset.v,true);}});
    var setg=document.getElementById('vizSegSet');
    if(setg)setg.addEventListener('click',function(e){var b=e.target.closest('.sub-btn');if(b){e.stopPropagation();setViz(b.dataset.v,true);}});
    var saved=null;try{saved=localStorage.getItem('sf_viz');}catch(e){}
    if(saved==='reactive')setViz('reactive',false); else setViz('pattern',false);
})();

// ═══ Переключатель формы 3D-сцены (Куб / Шар) ═══
(function(){
    var btns=document.getElementById('shapeFormBtns');
    if(!btns||typeof onTap!=='function')return;
    btns.querySelectorAll('.sub-btn').forEach(function(b){
        onTap(b,function(e){e.stopPropagation();
            btns.querySelectorAll('.sub-btn').forEach(function(x){x.classList.toggle('active',x===b);});
            if(typeof setShape3D==='function')setShape3D(b.dataset.shape);
        });
    });
})();

// ═══ Пример-треки в панели «Музыка» (играют через анализатор → визуализация) ═══
function setupMusicAudio(src,autoplay){
    if(musicAudio){musicAudio.pause();musicPlaying=false;musicPlayBtn.textContent='▶';}
    musicAudio=new Audio();musicAudio.src=src;musicAudio.volume=musicVol.value/100;
    (function(){var fut=document.getElementById('flowUploadText'),fua=document.getElementById('flowUploadArea');var title=fut?fut.textContent:'';
      musicAudio.addEventListener('loadstart',function(){if(fut)fut.textContent='Загрузка…';if(fua)fua.classList.add('is-loading');});
      musicAudio.addEventListener('canplay',function(){if(fut)fut.textContent=title;if(fua)fua.classList.remove('is-loading');});
      musicAudio.addEventListener('error',function(){if(fut)fut.textContent='Не удалось загрузить — попробуй другой';if(fua)fua.classList.remove('is-loading');musicPlaying=false;if(musicPlayBtn){musicPlayBtn.textContent='▶';musicPlayBtn.classList.remove('playing');}});
    })();
    musicAudio.addEventListener('loadedmetadata',function(){musicTimeDur.textContent=fmtTime(musicAudio.duration);musicSeek.max=musicAudio.duration;});
    musicAudio.addEventListener('ended',function(){musicPlaying=false;musicPlayBtn.textContent='▶';musicPlayBtn.classList.remove('playing');});
    musicAudio.addEventListener('timeupdate',function(){if(!musicSeeking){musicSeek.value=musicAudio.currentTime;musicTimeNow.textContent=fmtTime(musicAudio.currentTime);}});
    if(!musicCtx)musicCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(musicSource)try{musicSource.disconnect();}catch(x){}
    musicSource=musicCtx.createMediaElementSource(musicAudio);
    musicAnalyser=musicCtx.createAnalyser();musicAnalyser.fftSize=512;musicAnalyser.smoothingTimeConstant=.75;
    musicGain=musicCtx.createGain();musicGain.gain.value=musicVol.value/100;
    musicSource.connect(musicAnalyser);musicAnalyser.connect(musicGain);musicGain.connect(musicCtx.destination);
    musicFreqData=new Uint8Array(musicAnalyser.frequencyBinCount);prevSpectrum=new Float32Array(musicAnalyser.frequencyBinCount);
    if(autoplay){if(musicCtx.state==='suspended')musicCtx.resume();musicAudio.play().then(function(){musicPlaying=true;musicPlayBtn.textContent='⏸';musicPlayBtn.classList.add('playing');}).catch(function(){});}
}
var musicStream=null;
function stopMusicStream(){if(musicStream){try{musicStream.getTracks().forEach(function(t){t.stop();});}catch(e){}musicStream=null;}}
function setupMusicStream(stream,label){
    stopMusicStream();musicStream=stream;
    if(musicAudio){try{musicAudio.pause();}catch(e){}}
    if(!musicCtx)musicCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(musicSource)try{musicSource.disconnect();}catch(x){}
    musicSource=musicCtx.createMediaStreamSource(stream);
    musicAnalyser=musicCtx.createAnalyser();musicAnalyser.fftSize=512;musicAnalyser.smoothingTimeConstant=.75;
    musicSource.connect(musicAnalyser); // в destination не подключаем — без эха
    musicFreqData=new Uint8Array(musicAnalyser.frequencyBinCount);prevSpectrum=new Float32Array(musicAnalyser.frequencyBinCount);
    if(musicCtx.state==='suspended')musicCtx.resume();
    musicPlaying=true;
    var fut=document.getElementById('flowUploadText'),fua=document.getElementById('flowUploadArea'),fc=document.getElementById('flowControls');
    if(fut)fut.textContent=label;if(fua)fua.classList.add('has-track');if(fc)fc.classList.add('visible');
    if(musicPlayBtn){musicPlayBtn.textContent='⏸';musicPlayBtn.classList.add('playing');}
    stream.getAudioTracks().forEach(function(t){t.addEventListener('ended',function(){musicPlaying=false;if(fut)fut.textContent='Источник отключён';});});
}
function startTabAudio(){
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia)){alert('Захват звука вкладки доступен на десктопе (Chrome/Edge).');return;}
    navigator.mediaDevices.getDisplayMedia({video:true,audio:true}).then(function(st){
        st.getVideoTracks().forEach(function(t){t.stop();});
        if(!st.getAudioTracks().length){alert('Не удалось получить звук: при выборе вкладки включи «Поделиться звуком вкладки».');return;}
        setupMusicStream(st,'Звук вкладки');
    }).catch(function(){});
}
function startMicAudio(){
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){alert('Микрофон недоступен.');return;}
    navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){setupMusicStream(st,'Микрофон');}).catch(function(){});
}
function playExampleTrack(i){
    const tr=bgmTracks[i];if(!tr)return;
    const fua=document.getElementById('flowUploadArea'),fc=document.getElementById('flowControls'),fut=document.getElementById('flowUploadText');
    if(fut)fut.textContent=tr.title;if(fua)fua.classList.add('has-track');if(fc)fc.classList.add('visible');
    if(typeof trackPassport!=='undefined')trackPassport.ready=false;
    stopMusicStream();
    setupMusicAudio(tr.src,true);
    try{fetch(tr.src).then(function(r){return r.arrayBuffer();}).then(function(ab){var actx=new(window.AudioContext||window.webkitAudioContext)();return actx.decodeAudioData(ab).then(function(buf){try{actx.close();}catch(x){}if(typeof analyzeTrackPassport==='function')analyzeTrackPassport(buf);var bpmEl=document.getElementById('canvasBpmInfo');if(bpmEl)bpmEl.textContent=(trackPassport&&trackPassport.bpm)?('♩ '+trackPassport.bpm+' BPM'):'';});}).catch(function(){});}catch(e){}
    document.querySelectorAll('#exampleTracks .bgm-track').forEach(function(el,idx){el.classList.toggle('active',idx===i);});
}
window.__playExample=playExampleTrack;

// ═══ Мобилка: кастомный drawer по эскизам (разделы + 3x3 + живые числа) ═══
(function(){
    var tab=document.getElementById('mrTab'),panel=document.getElementById('mrPanel'),bodyEl=document.getElementById('mrBody'),fixed=document.getElementById('mrFixed'),header=document.getElementById('mrHeader');
    if(!tab||!panel||typeof onTap!=='function')return;
    var SEC=[['modes','Режимы'],['palette','Палитра'],['settings','Настройки'],['music','Музыка']];
    var active='modes', modePage=0;
    function icon(tool){var b=document.querySelector('.tool-icon[data-tool="'+tool+'"]');return b?b.innerHTML:'';}
    function mrToggle(e){if(e)e.stopPropagation();document.body.classList.toggle('mr-open');}
    onTap(tab,mrToggle);
    ['touchstart','mousedown','pointerdown'].forEach(function(ev){panel.addEventListener(ev,function(e){e.stopPropagation();});tab.addEventListener(ev,function(e){e.stopPropagation();});});
    // шапка: ряд иконок-разделов
    function buildHeader(){header.innerHTML='';header.className='mr-secbar';
        SEC.forEach(function(o,i){
            
            var b=document.createElement('div');b.className='mr-secicon'+(active===o[0]?' active':'');b.title=o[1];b.innerHTML='<span class="mr-ic">'+icon(o[0])+'</span>';
            onTap(b,function(e){e.stopPropagation();active=o[0];if(o[0]==='music'&&typeof switchTool==='function')switchTool('music');draw();});
            header.appendChild(b);
        });
    }
    // ——— строки ———
    function seg(defs,cur,cb){var row=document.createElement('div');row.className='mr-seg3';
        defs.forEach(function(d){var b=document.createElement('div');b.className='mr-pill'+(String(cur)===String(d[0])?' active':'');b.textContent=d[1];
            onTap(b,function(e){e.stopPropagation();cb(d[0]);draw();});row.appendChild(b);});return row;}
    function subhead(t){var d=document.createElement('div');d.className='mr-sub';d.textContent=t;return d;}

    function odometer(el,text){
        // рендер строки как роллер-цифр (слайд по вертикали)
        var prev=el._odo||'';el._odo=text;
        if(prev.length!==text.length){el.innerHTML='';for(var c=0;c<text.length;c++){addCol(el,text[c]);}return;}
        for(var i2=0;i2<text.length;i2++){var col=el.children[i2];if(!col){addCol(el,text[i2]);continue;}
            if(/[0-9]/.test(text[i2])){col.querySelector('.od-strip').style.transform='translateY('+(-text[i2]*10)+'%)';}
            else if(col.dataset.ch!==text[i2]){col.outerHTML='';el.innerHTML='';for(var c3=0;c3<text.length;c3++)addCol(el,text[c3]);return;}
        }
    }
    function addCol(el,ch){var col=document.createElement('span');col.className='od-col';col.dataset.ch=ch;
        if(/[0-9]/.test(ch)){var strip=document.createElement('span');strip.className='od-strip';strip.textContent='0123456789'.split('').join('\n');strip.style.transform='translateY('+(-ch*10)+'%)';col.appendChild(strip);}
        else{col.textContent=ch;col.classList.add('od-static');}
        el.appendChild(col);}
    function liveSlider(label,realId,fmt){var real=document.getElementById(realId);if(!real)return document.createTextNode('');
        var wrap=document.createElement('div');wrap.className='mr-slrow';
        var top=document.createElement('div');top.className='mr-sltop';
        var l=document.createElement('span');l.className='mr-sllbl';l.textContent=label;
        var v=document.createElement('span');v.className='mr-slval live-num od';odometer(v,fmt(+real.value));
        top.appendChild(l);top.appendChild(v);
        var i=document.createElement('input');i.type='range';i.className='mr-slider';i.min=real.min;i.max=real.max;i.step=real.step||1;i.value=real.value;
        i.addEventListener('input',function(e){e.stopPropagation();real.value=this.value;real.dispatchEvent(new Event('input'));odometer(v,fmt(+this.value));});
        i.addEventListener('change',function(e){e.stopPropagation();real.dispatchEvent(new Event('change'));});
        i.addEventListener('touchstart',function(e){e.stopPropagation();});i.addEventListener('touchend',function(e){e.stopPropagation();});
        wrap.appendChild(top);wrap.appendChild(i);return wrap;}
    // ——— разделы ———
    function drawModes(host){
        var vis=modes.filter(function(m){return !(currentScene!=='3d'&&(only3DModes.includes(m.key)||m.key==='sphere'||m.key==='galaxy'||m.key==='honeycomb'||m.key==='yantra'));});
        var PER=9,pages=Math.max(1,Math.ceil(vis.length/PER));if(modePage>pages-1)modePage=pages-1;if(modePage<0)modePage=0;
        var grid=document.createElement('div');grid.className='mr-modes';
        vis.slice(modePage*PER,modePage*PER+PER).forEach(function(m){
            var it=document.createElement('div');it.className='mr-mode'+(m.key===currentMode?' active':'');
            it.innerHTML='<span class="mr-ic">'+(modeIcons[m.key]||'')+'</span><span class="mr-mlbl">'+m.name+'</span>';
            onTap(it,function(e){e.stopPropagation();currentMode=m.key;if(m.key==='deform'){dimension=1;}else if(dimension===1){dimension=0;}if(typeof buildModeList==='function')buildModeList();draw();});
            grid.appendChild(it);
        });
        host.appendChild(grid);
        var pg=document.createElement('div');pg.className='mr-pages num';pg.textContent=(modePage+1)+' / '+pages;host.appendChild(pg);
        // свайп (на сетке, чтобы слушатель умирал с ней)
        var sx=0;grid.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
        grid.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>45){if(dx<0&&modePage<pages-1)modePage++;else if(dx>0&&modePage>0)modePage--;draw();}},{passive:true});
    }
    var palPage=0;
    function drawPalette(host){
        var keys=Object.keys(palettes),PER=9,pages=Math.max(1,Math.ceil(keys.length/PER));if(palPage>pages-1)palPage=pages-1;if(palPage<0)palPage=0;
        var g=document.createElement('div');g.className='mr-pals';
        keys.slice(palPage*PER,palPage*PER+PER).forEach(function(k){var sw=document.createElement('div');sw.className='mr-pal'+(currentPalette===k?' active':'');
            sw.style.background=palettes[k].swatch||'#444';
            onTap(sw,function(e){e.stopPropagation();
                if(typeof closeCustomPanel==='function')closeCustomPanel();
                if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);
                targetStops=JSON.parse(JSON.stringify(palettes[k].stops));transitionProgress=0;currentPalette=k;
                if(typeof buildPaletteList==='function')buildPaletteList();draw();});g.appendChild(sw);});
        host.appendChild(g);
        var pg=document.createElement('div');pg.className='mr-pages num';pg.textContent=(palPage+1)+' / '+pages;host.appendChild(pg);
        var sx=0;g.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
        g.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>45){if(dx<0&&palPage<pages-1)palPage++;else if(dx>0&&palPage>0)palPage--;draw();}},{passive:true});
    }
    function drawSettings(host){
        host.appendChild(subhead('Частицы'));
        host.appendChild(liveSlider('Количество','partSlider',function(v){return Math.round(v/1000)+' тыс.';}));
        host.appendChild(subhead('Движение'));
        host.appendChild(liveSlider('Скорость','speedSlider',function(v){return v+'%';}));
        host.appendChild(liveSlider('Масштаб','zoomSlider',function(v){return v+'%';}));
        var rot=document.createElement('div');rot.className='mr-seg3';
        [['dirCW','↻'],['dirCCW','↺']].forEach(function(d){var cur=document.getElementById(d[0]);var b=document.createElement('div');b.className='mr-pill'+(cur&&cur.classList.contains('active')?' active':'');b.textContent=d[1];
            onTap(b,function(e){e.stopPropagation();var el=document.getElementById(d[0]);if(el)el.click();draw();});rot.appendChild(b);});
        var rl=subhead('Вращение');host.appendChild(rl);host.appendChild(rot);
        host.appendChild(subhead('Возврат частиц'));
        host.appendChild(seg([['0','Обычный'],['1','Органичный'],['2','Заморозка']],(typeof returnMode!=='undefined'?returnMode:0),function(v){returnMode=+v;var el=document.querySelector('#returnBtns .sub-btn[data-v="'+v+'"]');if(el)el.click();}));
        host.appendChild(subhead('Тон'));
        host.appendChild(seg([['add','Аддитив'],['exp','Экспоз.'],['hdr','HDR'],['bloom','Bloom'],['neon','Неон'],['chrome','Хром']],(typeof toneMode!=='undefined'?toneMode:'add'),function(v){if(window.__setTone)window.__setTone(v,true);}));
        // параметры текущего режима (реальные контролы)
        if(typeof buildCurrentModeSettings==='function')buildCurrentModeSettings();
        if(typeof buildModeSettings3D==='function'&&currentScene==='3d')buildModeSettings3D();
        var _m=modes.find(function(x){return x.key===currentMode;});
        host.appendChild(subhead((_m?_m.name:'Режим')+' — параметры'));
        var _ms=document.getElementById('modeSettings');
        if(_ms){host.appendChild(_ms);if(typeof enhanceSliders==='function')enhanceSliders(host);}
    }
    function drawMusic(host){
        fixed.innerHTML='';
        // строим музыкальную панель как на ПК и встраиваем целиком
        if(typeof switchTool==='function')switchTool('music');
        var mc=document.getElementById('musicParamsContainer');
        if(mc&&!mc.children.length&&typeof buildMusicParams==='function')buildMusicParams();
        var sp=document.getElementById('spMusic');
        if(sp){sp.classList.add('active');host.appendChild(sp);if(typeof enhanceSliders==='function')enhanceSliders(host);}
    }

    function draw(){
        buildHeader();
        var _ms=document.getElementById('modeSettings');var _sp=document.getElementById('spSettings');
        if(_ms&&_sp&&bodyEl.contains(_ms))_sp.appendChild(_ms);
        var _mus=document.getElementById('spMusic'),_side=document.getElementById('sidePanel');if(_mus&&_side&&bodyEl.contains(_mus))_side.appendChild(_mus);
        fixed.innerHTML='';bodyEl.innerHTML='';bodyEl.className='';
        if(active==='modes')drawModes(bodyEl);
        else if(active==='palette')drawPalette(bodyEl);
        else if(active==='settings')drawSettings(bodyEl);
        else if(active==='music')drawMusic(bodyEl);
    }
    window.__mrRedraw=draw;
    draw();
})();

// ═══ 3D сакральная геометрия (частицы по рёбрам фигур) ═══
(function(){
    var box=document.getElementById('mandalaSymBtns3D');
    if(!box||typeof onTap!=='function')return;
    box.querySelectorAll('.sub-btn').forEach(function(b){
        onTap(b,function(e){e.stopPropagation();
            sacredFig3D=+b.dataset.fig;
            box.querySelectorAll('.sub-btn').forEach(function(x){x.classList.toggle('active',x===b);});
            if(threeReady){ if(sacredFig3D>0)rebuildSacred3D(sacredFig3D); else rebuildMandalaHome(mandalaSubMode3D); }
        });
    });
})();

// ═══ Аудио-лаборатория (тест-панель реактива) — тройной тап по FPS ═══
(function(){
    var SP=[
        ['Бас atk','bassAtk',0,1,0.01],['Бас dec','bassDec',0,0.5,0.01],
        ['Миды atk','midAtk',0,1,0.01],['Миды dec','midDec',0,0.5,0.01],
        ['Верх atk','highAtk',0,1,0.01],['Верх dec','highDec',0,0.5,0.01],
        ['Энергия atk','enAtk',0,1,0.01],['Энергия dec','enDec',0,0.5,0.01],
        ['Сила: бас','forceBass',0,3,0.05],['Сила: миды','forceMid',0,3,0.05],['Сила: бит','forceBeat',0,3,0.05],
        ['Ярк: энергия','brightEn',0,3,0.05],['Ярк: бит','brightBeat',0,3,0.05],['Ярк: верх','brightHigh',0,3,0.05],
        ['Шоквейв сила','shockSpike',0,3,0.05],['Шоквейв распад','shockDecay',0.5,0.95,0.01]
    ];
    var panel=document.createElement('div');
    panel.id='audioLab';
    panel.style.cssText='position:fixed;top:0;right:0;width:300px;max-width:88vw;height:100%;z-index:9999;display:none;'
        +'background:rgba(8,8,14,0.96);backdrop-filter:blur(14px);border-left:1px solid rgba(255,255,255,0.08);'
        +'box-shadow:-10px 0 40px rgba(0,0,0,0.5);overflow-y:auto;padding:14px 14px calc(20px + env(safe-area-inset-bottom));'
        +'font-family:system-ui,sans-serif;color:#e8e8f0;';
    var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
        +'<b style="font-size:13px;letter-spacing:.08em">АУДИО-ЛАБ</b>'
        +'<span id="labClose" style="cursor:pointer;font-size:20px;color:#8a8ea6;padding:0 6px">×</span></div>'
        +'<div style="font-size:11px;color:#8a8ea6;margin-bottom:12px">Виз: Реактив + играет трек. Крути ползунки, копируй код, шли мне.</div>';
    SP.forEach(function(s){
        html+='<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:11px;color:#b8bcd0">'
            +'<span>'+s[0]+'</span><span id="labv_'+s[1]+'">'+RCFG[s[1]]+'</span></div>'
            +'<input type="range" id="labs_'+s[1]+'" min="'+s[2]+'" max="'+s[3]+'" step="'+s[4]+'" value="'+RCFG[s[1]]+'" '
            +'style="width:100%;-webkit-appearance:none;height:3px;border-radius:3px;background:rgba(255,255,255,0.16);outline:none"></div>';
    });
    html+='<div style="margin-top:12px"><button id="labCopy" style="width:100%;padding:9px;border:0;border-radius:8px;'
        +'background:rgba(255,255,255,0.12);color:#fff;font-weight:600;cursor:pointer">Копировать код</button></div>'
        +'<pre id="labCode" style="margin-top:10px;font-size:10px;line-height:1.4;color:#9fe7c0;background:rgba(0,0,0,0.4);'
        +'padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;max-height:none"></pre>';
    panel.innerHTML=html;
    document.body.appendChild(panel);

    function code(){var o='RCFG = {\n';SP.forEach(function(s){o+='  '+s[1]+': '+(+RCFG[s[1]]).toFixed(3)+',\n';});return o+'};';}
    function refresh(){document.getElementById('labCode').textContent=code();}
    SP.forEach(function(s){
        var sl=document.getElementById('labs_'+s[1]);
        sl.addEventListener('input',function(e){e.stopPropagation();RCFG[s[1]]=+this.value;document.getElementById('labv_'+s[1]).textContent=this.value;refresh();});
        sl.addEventListener('touchstart',function(e){e.stopPropagation();});
        sl.addEventListener('touchend',function(e){e.stopPropagation();});
    });
    panel.addEventListener('mousedown',function(e){e.stopPropagation();});
    panel.addEventListener('touchstart',function(e){e.stopPropagation();});
    document.getElementById('labClose').addEventListener('click',function(e){e.stopPropagation();panel.style.display='none';});
    document.getElementById('labCopy').addEventListener('click',function(e){e.stopPropagation();
        var t=code();try{navigator.clipboard.writeText(t);this.textContent='Скопировано ✓';var b=this;setTimeout(function(){b.textContent='Копировать код';},1200);}catch(x){}});
    refresh();

    // тройной тап по #fpsOverlay
    var taps=[];
    function tap(){var now=Date.now();taps.push(now);taps=taps.filter(function(t){return now-t<700;});
        if(taps.length>=3){taps=[];panel.style.display=(panel.style.display==='none'?'block':'none');refresh();}}
    document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#fpsOverlay'))tap();});
    document.addEventListener('touchend',function(e){if(e.target&&e.target.closest&&e.target.closest('#fpsOverlay'))tap();});
})();

// ═══ Дирижёр — глобальный переключатель (UI в панели Аудио) ═══
function setConductor(v,persist){conductorOn=!!v;
    document.querySelectorAll('#conductorBtns .sub-btn').forEach(function(x){x.classList.toggle('active',(+x.dataset.v)===(conductorOn?1:0));});
    if(persist!==false){try{localStorage.setItem('sf_conductor',conductorOn?'1':'0');}catch(e){}}}
window.__setConductor=setConductor;
(function(){var saved=null;try{saved=localStorage.getItem('sf_conductor');}catch(e){}conductorOn=(saved==='1');})();

// ═══ Два режима: Слушать / Студия + экран входа + Ещё ═══
var appMode=null;
(function(){
    var entry=document.getElementById('entryScreen'),moreBtn=document.getElementById('moreBtn'),morePanel=document.getElementById('morePanel'),lm=document.getElementById('listenMusicBtn');
    if(!entry||!moreBtn||!morePanel||typeof onTap!=='function')return;
    function closePanels(){ try{ if(typeof activeTool!=='undefined'&&activeTool){activeTool='';sidePanel.classList.remove('open');} }catch(e){} morePanel.classList.remove('show'); }
    function setAppMode(m){
        appMode=m; document.body.classList.toggle('mode-listen',m==='listen'); document.body.classList.toggle('mode-studio',m==='studio');
        closePanels();
        if(m==='listen'){ if(window.__setConductor)window.__setConductor(true,false); if(window.__setViz)window.__setViz('reactive',false); if(window.__scenes&&sceneIdx<0)window.__scenes.next(); }
        buildMore();updateTag();
    }
    function item(label,sub,fn){var b=document.createElement('button');b.className='more-item';b.innerHTML=label+(sub?'<small>'+sub+'</small>':'');onTap(b,function(e){e.stopPropagation();fn();});return b;}
    function group(t){var g=document.createElement('div');g.className='more-group';g.textContent=t;return g;}
    function sep(){var d=document.createElement('div');d.className='more-sep';return d;}
    function updateTag(){var tag=document.getElementById('modeTag');if(!tag)return;tag.textContent=(appMode==='listen'?'Слушать':'Студия');tag.classList.toggle('live',appMode==='listen'&&conductorOn);}
    function buildMore(){
        morePanel.innerHTML='';
        if(appMode==='listen'){
            morePanel.appendChild(group('Картина'));
            morePanel.appendChild(item('Следующая сцена',(typeof currentSceneName!=='undefined'&&currentSceneName)?('Сейчас: '+currentSceneName):'Сменить картину',function(){if(window.__scenes)window.__scenes.next();buildMore();}));
            morePanel.appendChild(item('Автопилот: '+(autopilotOn?'вкл':'выкл'),'Сцены сменяются сами под музыку',function(){autopilotOn=!autopilotOn;buildMore();}));
            morePanel.appendChild(item('Дирижёр: '+(conductorOn?'вкл':'выкл'),'Автоматические узоры',function(){if(window.__setConductor)window.__setConductor(!conductorOn,true);updateTag();buildMore();}));
            morePanel.appendChild(sep());morePanel.appendChild(group('Режим'));
            morePanel.appendChild(item('Студия','Всё вручную: режимы, палитры, свет',function(){setAppMode('studio');}));
        } else {
            morePanel.appendChild(group('Сцены'));
            morePanel.appendChild(item('Сохранить как сцену','Текущие режим + палитра + тон + дирижёр',function(){var n=prompt('Название сцены:','Сцена '+(savedScenes.length+1));if(n!==null&&window.__scenes){window.__scenes.save(n);buildMore();}}));
            morePanel.appendChild(item('Экспорт сцен',(savedScenes.length?savedScenes.length+' сохр. — ':'Пока нет своих — ')+'скопировать JSON',function(){try{navigator.clipboard.writeText(window.__scenes.exportJSON());}catch(e){}}));
            morePanel.appendChild(sep());morePanel.appendChild(group('Режим'));
            morePanel.appendChild(item('Слушать','Музыка и визуализация',function(){setAppMode('listen');}));
        }
        morePanel.appendChild(item('Сменить режим входа','Вернуться к выбору',function(){morePanel.classList.remove('show');closePanels();entry.classList.remove('hidden');}));
        updateTag();
    }
    entry.querySelectorAll('.entry-card').forEach(function(c){onTap(c,function(e){e.stopPropagation();entry.classList.add('hidden');setAppMode(c.dataset.mode);});});
    onTap(moreBtn,function(e){e.stopPropagation();if(!morePanel.classList.contains('show'))buildMore();morePanel.classList.toggle('show');});
    document.addEventListener('click',function(e){if(!e.target.closest('#morePanel')&&!e.target.closest('#moreBtn'))morePanel.classList.remove('show');});
    if(lm)onTap(lm,function(e){e.stopPropagation();if(typeof switchTool==='function')switchTool('music');});
    window.__setAppMode=setAppMode;
})();

// ═══ Сцены: кураторские связки + мягкие переходы + автопилот ═══
var SCENES_BUILTIN=[
    {name:'Сияние',mode:'vortex',palette:'aurora',tone:'bloom',sym:6,speed:1.0,rad:1.0},
    {name:'Космос',mode:'mycelium',palette:'cosmic',tone:'hdr',sym:5,speed:0.8,rad:1.1},
    {name:'Огонь',mode:'turbulence',palette:'fire',tone:'bloom',sym:4,speed:1.2,rad:0.9},
    {name:'Океан',mode:'wave',palette:'ocean',tone:'hdr',sym:8,speed:0.7,rad:1.0},
    {name:'Неон',mode:'pulsar',palette:'neon',tone:'neon',sym:6,speed:1.1,rad:1.0},
    {name:'Мандала',mode:'mandala',palette:'lavender',tone:'bloom',sym:6,speed:0.9,rad:1.0},
    {name:'Сакральное',mode:'fibonacci',palette:'deepspace',tone:'hdr',sym:7,speed:0.8,rad:1.0}
];
var savedScenes=[];try{savedScenes=JSON.parse(localStorage.getItem('sf_scenes')||'[]');}catch(e){savedScenes=[];}
var sceneIdx=-1,sceneTimer=0,sceneInterval=45,currentSceneName='';
function allScenes(){return savedScenes.length?savedScenes.concat(SCENES_BUILTIN):SCENES_BUILTIN;}
function applyScene(sc){
    if(!sc)return;
    currentSceneName=sc.name||'';
    // мягкий переход: медленный лерп палитры + «вдох» дирижёра
    paletteLerpSpeed=0.5; sceneBreath=1;
    if(sc.palette&&palettes[sc.palette]){
        if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);
        targetStops=JSON.parse(JSON.stringify(palettes[sc.palette].stops));transitionProgress=0;currentPalette=sc.palette;
        if(typeof buildPaletteList==='function')buildPaletteList();
    }
    if(sc.mode&&modes.some(function(m){return m.key===sc.mode;})){
        currentMode=sc.mode;
        if(sc.mode==='deform'){dimension=1;}else if(dimension===1){dimension=0;}
        var ss3=document.getElementById('shapeSection3D');if(ss3)ss3.style.display=(dimension===1?'':'none');
        if(typeof buildModeList==='function')buildModeList();
    }
    if(sc.tone&&window.__setTone)window.__setTone(sc.tone,false);
    if(sc.sym)conductorSym=Math.max(2,Math.min(8,sc.sym));
    conductorSpeedT=(sc.speed!=null?sc.speed:1); conductorRadT=(sc.rad!=null?sc.rad:1);
    setTimeout(function(){paletteLerpSpeed=3;},2500);
}
function nextScene(){var L=allScenes();if(!L.length)return;sceneIdx=(sceneIdx+1)%L.length;applyScene(L[sceneIdx]);sceneTimer=0;}
function captureScene(name){return {name:name||('Сцена '+(savedScenes.length+1)),mode:currentMode,palette:currentPalette,tone:toneMode,sym:conductorSym,speed:+conductorSpeedT.toFixed(2),rad:+conductorRadT.toFixed(2)};}
function saveCurrentScene(name){savedScenes.push(captureScene(name));try{localStorage.setItem('sf_scenes',JSON.stringify(savedScenes));}catch(e){}}
function exportScenes(){return JSON.stringify(savedScenes.length?savedScenes:SCENES_BUILTIN,null,1);}
// автопилот: по таймеру, выровнено по биту (или с запасом), только в Слушать при играющей музыке
window.__autopilotTick=function(dt){
    if(!autopilotOn)return;
    var playing=(typeof musicPlaying!=='undefined')&&(musicPlaying||beatPlaying);
    if(!playing)return;
    sceneTimer+=dt;
    if(sceneTimer>=sceneInterval){
        var bp=(typeof beatPulse!=='undefined')?beatPulse:0;
        if(bp>0.35||sceneTimer>=sceneInterval+3)nextScene();
    }
};
window.__scenes={apply:applyScene,next:nextScene,save:saveCurrentScene,exportJSON:exportScenes,all:allScenes,capture:captureScene};

// ═══ Сцены: сохранить/экспорт (Настройки) ═══
(function(){
    var box=document.getElementById('sceneToolsBtns');
    if(!box||typeof onTap!=='function')return;
    box.querySelectorAll('.sub-btn').forEach(function(b){onTap(b,function(e){e.stopPropagation();
        if(b.dataset.act==='save'){var n=prompt('Название сцены:','Сцена '+(savedScenes.length+1));if(n!==null&&window.__scenes){window.__scenes.save(n);b.textContent='Сохранено ✓';setTimeout(function(){b.textContent='Сохранить как сцену';},1200);}}
        else{try{navigator.clipboard.writeText(window.__scenes.exportJSON());b.textContent='Скопировано ✓';setTimeout(function(){b.textContent='Экспорт JSON';},1200);}catch(x){}}
    });});
})();

// ═══ Тумблер возврата частиц: Обычный / Органичный (A/B-тест) ═══
(function(){
    var box=document.getElementById('returnBtns');
    if(!box||typeof onTap!=='function')return;
    box.querySelectorAll('.sub-btn').forEach(function(b){onTap(b,function(e){e.stopPropagation();
        returnMode=+b.dataset.v;box.querySelectorAll('.sub-btn').forEach(function(x){x.classList.toggle('active',x===b);});});});
})();

// ═══ Якоря + Калейдоскоп касания + Пульсы по биту ═══
var pins=[],kaleidoTouch=false,kaleidoN=6,beatPulsesOn=false,pulses=[];
var PIN_TYPES=[['attract','Притяжение','#ffffff'],['repel','Отталкивание','#ff7a45'],['vortex','Вихрь','#5fd8ff'],['pulsar','Пульсар','#ff5db1'],['blackhole','Чёрная дыра','#a06bff']];
(function(){
    var layer=document.createElement('div');layer.id='pinLayer';layer.style.cssText='position:fixed;inset:0;z-index:5;pointer-events:none;';document.body.appendChild(layer);
    function typeIdx(t){for(var i=0;i<PIN_TYPES.length;i++)if(PIN_TYPES[i][0]===t)return i;return 0;}
    function render(){
        layer.innerHTML='';
        pins.forEach(function(p){var c=PIN_TYPES[typeIdx(p.type)][2];var d=document.createElement('div');
            d.style.cssText='position:absolute;width:16px;height:16px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid '+c+';box-shadow:0 0 12px '+c+'88, inset 0 0 6px '+c+'55;';
            d.style.left=p.x+'px';d.style.top=p.y+'px';layer.appendChild(d);});
    }
    window.__pinsRender=render;
    // --- точки в поле каждый кадр ---
    window.__extraPoints=function(points){
        // 2. Калейдоскоп касания: размножить касания N-кратно с зеркалами
        if(kaleidoTouch&&points.length){
            var cx=W/2,cy=H/2,N=Math.max(2,Math.min(8,kaleidoN)),sa=Math.PI*2/N,src=points.slice(0,2),out=[];
            src.forEach(function(pt){var dx=pt.x-cx,dy=pt.y-cy,r=Math.sqrt(dx*dx+dy*dy),base=Math.atan2(dy,dx),rel=((base%sa)+sa)%sa;
                for(var k=0;k<N&&out.length<8;k++){var a=k*sa+(k%2===1?sa-rel:rel);out.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,strength:(pt.strength||1)*0.9});}});
            points.length=0;out.forEach(function(o){points.push(o);});
        }
        // 1. Якоря
        var tt=time*0.001,bp=(typeof beatPulse!=='undefined')?beatPulse:0;
        pins.forEach(function(p){if(points.length>=8)return;var st=1,x=p.x,y=p.y;
            if(p.type==='repel')st=-1;
            else if(p.type==='vortex'){var a=tt*6+p.phase;x+=Math.cos(a)*28;y+=Math.sin(a)*28;st=1.1;}
            else if(p.type==='pulsar'){st=0.3+0.9*(0.5+0.5*Math.sin(tt*4+p.phase))+bp*1.2;}
            else if(p.type==='blackhole'){st=3;}
            points.push({x:x,y:y,strength:st});});
        // 3. Пульсы по биту
        if(beatPulsesOn){
            if(bp>0.4&&window.__prevBp<=0.4&&pulses.length<3){pulses.push({x:W*(0.15+Math.random()*0.7),y:H*(0.15+Math.random()*0.7),born:tt,type:(Math.random()<0.5?1:-1)});}
            pulses=pulses.filter(function(q){return tt-q.born<0.8;});
            pulses.forEach(function(q){if(points.length>=8)return;var life=1-(tt-q.born)/0.8;points.push({x:q.x,y:q.y,strength:q.type*2.2*life*life});});
        }
        window.__prevBp=bp;
    };
    // --- жесты якорей: двойной тап — поставить; тап по якорю — сменить тип; перетащить; долгий тап по якорю — убрать ---
    var down=null,grab=null,moved=false,lastTap=0,lastPos=null;
    function pos(e){var t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0])||e;return {x:t.clientX,y:t.clientY};}
    function near(pt){for(var i=pins.length-1;i>=0;i--){var p=pins[i];if(Math.hypot(p.x-pt.x,p.y-pt.y)<=24)return p;}return null;}
    function onDown(e){if(typeof isUI==='function'&&isUI(e))return;var pt=pos(e);down={x:pt.x,y:pt.y,t:Date.now()};moved=false;grab=near(pt);}
    function onMove(e){if(!down)return;var pt=pos(e);if(Math.hypot(pt.x-down.x,pt.y-down.y)>8)moved=true;if(grab&&moved){grab.x=pt.x;grab.y=pt.y;render();}}
    function onUp(e){if(!down)return;var pt=pos(e),held=Date.now()-down.t,now=Date.now();
        if(grab){ if(!moved){ if(held>600){pins=pins.filter(function(p){return p!==grab;});} else {var i=typeIdx(grab.type);grab.type=PIN_TYPES[(i+1)%PIN_TYPES.length][0];} render(); } }
        else if(!moved&&held<400){ if(lastPos&&now-lastTap<350&&Math.hypot(pt.x-lastPos.x,pt.y-lastPos.y)<30&&pins.length<6){pins.push({x:pt.x,y:pt.y,type:'attract',phase:Math.random()*6.28});render();lastTap=0;} else {lastTap=now;lastPos={x:pt.x,y:pt.y};} }
        down=null;grab=null;moved=false;}
    document.addEventListener('mousedown',onDown);document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
    document.addEventListener('touchstart',onDown,{passive:true});document.addEventListener('touchmove',onMove,{passive:true});document.addEventListener('touchend',onUp,{passive:true});
    window.__clearPins=function(){pins=[];render();};
    window.addEventListener('resize',render);
})();

// ═══ Поле: калейдоскоп касания / очистить якоря ═══
(function(){
    var box=document.getElementById('fieldBtns');
    if(!box||typeof onTap!=='function')return;
    box.querySelectorAll('.sub-btn').forEach(function(b){onTap(b,function(e){e.stopPropagation();
        if(b.dataset.act==='kaleido'){kaleidoTouch=!kaleidoTouch;b.classList.toggle('active',kaleidoTouch);}
        else{if(window.__clearPins)window.__clearPins();b.textContent='Очищено ✓';setTimeout(function(){b.textContent='Очистить якоря';},1000);}
    });});
})();

// ═══ FPS-тумблер внизу-слева (мобилка) ═══
(function(){
    var b=document.createElement('div');b.id='fpsToggleM';
    b.innerHTML='<span class="fps-lbl">FPS</span><span class="fps-sw"><span class="fps-knob"></span></span>';
    document.body.appendChild(b);
    function sync(){var f=document.getElementById('fpsSwitch');b.classList.toggle('on',!!(f&&f.classList.contains('on')));}
    if(typeof onTap==='function')onTap(b,function(e){e.stopPropagation();var f=document.getElementById('fpsSwitch');if(f)f.click();sync();});
    ['touchstart','mousedown'].forEach(function(ev){b.addEventListener(ev,function(e){e.stopPropagation();});});
    sync();
})();
