// === Soundfield — scripts.js ===
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
function onTap(el,fn){el.addEventListener('click',fn);el.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();fn(e);},{passive:false});}

// --- Якоря ---
const eyeToggle=document.getElementById('eyeToggle'),profileToggle=document.getElementById('profileToggle'),profilePanel=document.getElementById('profilePanel');
let uiVisible=true,profileOpen=false;
onTap(eyeToggle,e=>{e.stopPropagation();uiVisible=!uiVisible;document.body.classList.toggle('ui-hidden',!uiVisible);eyeToggle.classList.toggle('active',!uiVisible);});
onTap(profileToggle,e=>{e.stopPropagation();profileOpen=!profileOpen;profilePanel.classList.toggle('open',profileOpen);profileToggle.classList.toggle('active',profileOpen);});
profilePanel.addEventListener('click',e=>e.stopPropagation());

// --- Тулбар + боковая панель ---
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

// --- Режимы ---
// 🌿 Тарифы — корни доступа
let userPlan='pro'; // 'free' | 'pro'
let dlcAudio=false, dlcBeats=false;
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
function buildModeList(){
    const list=document.getElementById('modesList');list.innerHTML='';list.className='modes-icon-grid';
    modes.forEach(mode=>{
        if(currentScene!=='3d'&&only3DModes.includes(mode.key))return; // 🌿 3D-only не видны в 2D
        const avail=isModeAvail(mode.key);
        const item=document.createElement('div');item.className='mode-icon-item'+(mode.key===currentMode?' active':'')+(!avail?' locked':'');
        item.innerHTML=(modeIcons[mode.key]||'')+'<span class="mode-icon-label">'+mode.name+'</span>';
        onTap(item,function(e){e.stopPropagation();
            if(!avail){showLockToast('Доступно в Pro');return;}
            currentMode=mode.key;buildModeList();haptic();if(activeTool==='settings'){buildCurrentModeSettings();enhanceSliders();}});
        list.appendChild(item);
    });
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
    // 🌿 Полотно + Классика — два способа увидеть звук
    const cvRow=document.createElement('div');cvRow.className='sub-modes';
    const cvBtn=document.createElement('div');cvBtn.className='sub-btn'+(canvasVisOn?' active':'');cvBtn.textContent='Полотно';
    onTap(cvBtn,e=>{e.stopPropagation();canvasVisOn=!canvasVisOn;cvBtn.classList.toggle('active',canvasVisOn);
        if(canvasVisOn&&classicVisOn){classicVisOn=false;clBtn.classList.remove('active');document.getElementById('classicAnalyzer').classList.remove('on');}});
    const clBtn=document.createElement('div');clBtn.className='sub-btn'+(classicVisOn?' active':'');clBtn.textContent='Классика';
    onTap(clBtn,e=>{e.stopPropagation();classicVisOn=!classicVisOn;clBtn.classList.toggle('active',classicVisOn);
        document.getElementById('classicAnalyzer').classList.toggle('on',classicVisOn);
        if(classicVisOn&&canvasVisOn){canvasVisOn=false;cvBtn.classList.remove('active');}});
    cvRow.appendChild(cvBtn);cvRow.appendChild(clBtn);
    const bpmInfo=document.createElement('span');bpmInfo.id='canvasBpmInfo';bpmInfo.style.cssText='font-size:10px;color:rgba(255,255,255,0.35);align-self:center;padding-left:10px;';
    bpmInfo.textContent=trackPassport.ready&&trackPassport.bpm?('♩ '+trackPassport.bpm+' BPM'):'';
    cvRow.appendChild(bpmInfo);container.appendChild(cvRow);
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

// --- Бит-машина (Create) ---
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

// --- Настройки ---
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
            dimension=4;mode1D=false;trailMode=false;switchFromTest();/*archived: initBetaVisual()*/
        }
        const wc=null/*archived*/;
        if(wc)if(wc){wc.style.display=(currentScene==='2d'&&barrierShape>0)?'block':'none';}
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
        /*archived*/
        document.getElementById('settingsCommon').style.display=(!mode1D&&dimension===0)?'':'none';
        const wc=null/*archived*/;
        if(wc){wc.style.display=(mode1D||dimension===2||(barrierShape>0&&dimension===0))?'block':'none';}
        if(wc){wc.width=W;wc.height=H;}
        for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;}
        if(dimension===3)switchToTest();else if(dimension===4){switchFromTest();/*archived: initBetaVisual()*/}else{switchFromTest();if(dimension===2)init4D();}
    });
});
// 1D захват
document.querySelectorAll('#capture1DBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();capture1DShape=+btn.dataset.bar;
        document.querySelectorAll('#capture1DBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        document.getElementById('capture1DSlider').parentElement.style.display=capture1DShape>0?'flex':'none';
        if(capture1DShape>0&&capture1DLayers<1){capture1DLayers=1;document.getElementById('capture1DSlider').value=1;document.getElementById('capture1DVal').textContent='1';}
        const wc=null/*archived*/;
        if(capture1DShape>0&&mode1D){if(wc){wc.style.display='block';}if(wireCtx){if(wc){wc.width=W;wc.height=H;}}}
        else if(mode1D){if(wc){wc.style.display='none';}if(typeof wireCtx!=='undefined'&&wireCtx)wireCtx.clearRect(0,0,W,H);}
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
/* archived: betaDrag 4D */
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
const wireCanvas=null/*archived*/;
const wireCtx=wireCanvas?wireCanvas.getContext('2d'):null;
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
    if(wireCanvas){wireCanvas.width=W;wireCanvas.height=H;}
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

let spinDirection=1,spinSpeed=1,zoomLevel=1,brightnessLevel=1,userGap=3;
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
        const wc=null/*archived*/;
        if(barrierShape>0){if(wc){wc.style.display='block';}if(wc){wc.width=W;wc.height=H;}/*archived: drawBarriers()*/}
        else{if(dimension!==2){if(wc){wc.style.display='none';}if(typeof wireCtx!=='undefined'&&wireCtx)wireCtx.clearRect(0,0,W,H);}}
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
document.getElementById('brightnessSlider').addEventListener('input',function(e){e.stopPropagation();brightnessLevel=+this.value/100;});
document.getElementById('brightnessSlider').addEventListener('touchstart',e=>e.stopPropagation());
document.getElementById('gapSlider').addEventListener('input',function(e){e.stopPropagation();userGap=+this.value;cancelAnimationFrame(animFrame);init();lastTime=performance.now();animFrame=requestAnimationFrame(loop);});
document.getElementById('gapSlider').addEventListener('touchstart',e=>e.stopPropagation());

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
const glCanvas=document.getElementById('glCanvas'),c2dCanvas=document.getElementById('c2dCanvas');let useWebGL=true,gl=null,ctx2d=null;
try{gl=glCanvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)gl=glCanvas.getContext('webgl',{alpha:false,antialias:false});if(!gl)gl=glCanvas.getContext('experimental-webgl',{alpha:false});}catch(e){gl=null;}
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
let mobileScale=1;
function resizeCanvas(){W=window.innerWidth;H=window.innerHeight;mobileScale=Math.min(W,H)<500?Math.min(W,H)/500:1;if(useWebGL){glCanvas.width=W;glCanvas.height=H;if(gl)gl.viewport(0,0,W,H);}else{c2dCanvas.width=W;c2dCanvas.height=H;}}
function init(){GAP=userGap;resizeCanvas();COLS=Math.ceil(W/GAP);ROWS=Math.ceil(H/GAP);TOTAL=COLS*ROWS;homeX=new Float32Array(TOTAL);homeY=new Float32Array(TOTAL);posX=new Float32Array(TOTAL);posY=new Float32Array(TOTAL);velX=new Float32Array(TOTAL);velY=new Float32Array(TOTAL);hue=new Float32Array(TOTAL);glPositions=new Float32Array(TOTAL*2);sTheta=new Float32Array(TOTAL);sPhi=new Float32Array(TOTAL);const cc=(COLS-1)/2,cr=(ROWS-1)/2,md=Math.sqrt(cc*cc+cr*cr);for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=r*COLS+c;homeX[i]=c*GAP;homeY[i]=r*GAP;posX[i]=homeX[i];posY[i]=homeY[i];const dx=c-cc,dy=r-cr,dist=Math.sqrt(dx*dx+dy*dy);const proj=md>0?(dx*.7071+dy*.7071)/md:0,dr=md>0?dist/md:0;hue[i]=1/(1+Math.exp(-(2+dr*4)*proj));sTheta[i]=Math.PI*(r/(ROWS-1));sPhi[i]=2*Math.PI*c/COLS;}if(useWebGL&&gl){gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.bufferData(gl.ARRAY_BUFFER,hue,gl.STATIC_DRAW);}colorCache=new Uint8Array(TOTAL*3);sDTheta=new Float32Array(TOTAL);sDPhi=new Float32Array(TOTAL);trailLayerBuf=new Float32Array(TOTAL*2);}

// Three.js 3D scene → scene3d.js


// betaВизуал → visual.js


let mouseDown=false,mousePos={x:0,y:0},touchPoints=[];
function isUI(e){return e.target.closest('.anchor')||e.target.closest('.profile-panel')||e.target.closest('.toolbar')||e.target.closest('.side-panel')||e.target.closest('.custom-palette-panel')||e.target.closest('.beat-panel')||e.target.closest('.scene-bar')||e.target.closest('.bg-music-panel');}
document.addEventListener('mousedown',e=>{if(isUI(e))return;if(e.button===0){mouseDown=true;mousePos={x:e.clientX,y:e.clientY};e.preventDefault();}});
window.addEventListener('mousemove',e=>{if(isUI(e))return;mousePos={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;});
function updateTouchPoints(e){touchPoints=[];for(let i=0;i<e.touches.length;i++)touchPoints.push({x:e.touches[i].clientX,y:e.touches[i].clientY});}
document.addEventListener('touchstart',e=>{if(isUI(e))return;e.preventDefault();updateTouchPoints(e);},{passive:false});
document.addEventListener('touchmove',e=>{if(isUI(e))return;e.preventDefault();updateTouchPoints(e);},{passive:false});
document.addEventListener('touchend',e=>{e.preventDefault();updateTouchPoints(e);},{passive:false});
document.addEventListener('touchcancel',()=>{touchPoints=[];});window.addEventListener('blur',()=>{mouseDown=false;touchPoints=[];});document.addEventListener('contextmenu',e=>e.preventDefault());

let time=0;const shaderH=new Float32Array(9),shaderS=new Float32Array(9),shaderV=new Float32Array(9);
// getTotalForce → tools.js

function update(dt){const dt60=Math.min(3,dt*60*spinSpeed),physMode=currentMode;const isActive=touchPoints.length>0||mouseDown||(musicPlaying&&musicBands.energy>.01)||(beatPlaying&&musicBands.energy>.01);time+=dt*1000*spinSpeed;if(musicPlaying)analyzeMusic();decayBeatBands(dt);if(transitionProgress<1){transitionProgress=Math.min(1,transitionProgress+dt*3);if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(targetStops));}let as;if(transitionProgress>=1)as=currentStops;else as=lerpStops(currentStops,targetStops,transitionProgress);const norm=normalizeStops(as);for(let i=0;i<9;i++){shaderH[i]=norm[i].h;shaderS[i]=norm[i].s;shaderV[i]=norm[i].v;}if(!useWebGL&&colorCache){for(let i=0;i<TOTAL;i++){const c=getPaletteColorCPU(hue[i],norm);colorCache[i*3]=c[0];colorCache[i*3+1]=c[1];colorCache[i*3+2]=c[2];}}const points=[];if(mouseDown)points.push(mousePos);for(let t=0;t<touchPoints.length;t++)points.push(touchPoints[t]);
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
if(canvasShape>0){
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
// 🎵 Музыка = виртуальный курсор v3 — по анализу движений Яна
if((musicPlaying||beatPlaying)&&!classicVisOn&&(musicNorm.energy>.08||beatPulse>.1)){
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
for(let i=0;i<TOTAL;i++){const px=posX[i],py=posY[i];if(isActive){const force=getTotalForce(px,py,points,physMode);velX[i]=(velX[i]+force.fx*dt60)*.92;velY[i]=(velY[i]+force.fy*dt60)*.92;const sp=Math.sqrt(velX[i]*velX[i]+velY[i]*velY[i]);if(sp>25){velX[i]=velX[i]/sp*25;velY[i]=velY[i]/sp*25;}posX[i]+=velX[i]*dt60;posY[i]+=velY[i]*dt60;applyBarrierCollision(i);}else{const dxH=homeX[i]-px,dyH=homeY[i]-py,distH=Math.sqrt(dxH*dxH+dyH*dyH);if(distH<.15){posX[i]=homeX[i];posY[i]=homeY[i];velX[i]=0;velY[i]=0;}else{const lf=.04*dt60;posX[i]+=dxH*lf;posY[i]+=dyH*lf;velX[i]=dxH*lf;velY[i]=dyH*lf;}}applyCapture1D(i);}
}}
}// end dimension check

function drawParticles(positions,o){gl.useProgram(program);gl.uniform2f(uResolution,W,H);gl.uniform1fv(uStopH,shaderH);gl.uniform1fv(uStopS,shaderS);gl.uniform1fv(uStopV,shaderV);gl.uniform1f(uAlpha,(o.alpha||1)*brightnessLevel);gl.uniform3f(uColorMask,o.r!==undefined?o.r:1,o.g!==undefined?o.g:1,o.b!==undefined?o.b:1);gl.uniform1f(uRotation,o.rotation||0);gl.uniform1f(uScale,(o.scale||1)*zoomLevel);gl.uniform2f(uOffset,o.ox||0,o.oy||0);gl.uniform1f(uPointScale,(o.pointScale||1)*zoomLevel*mobileScale);gl.uniform1f(uSphereMode,o.sphereMode||0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer);gl.bufferData(gl.ARRAY_BUFFER,positions,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.enableVertexAttribArray(aHue);gl.vertexAttribPointer(aHue,1,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,TOTAL);}
// 🌿 рисуем частицы с учётом мандалы (секторное зеркало)
function renderWithMode(positions,baseAlpha){
if(currentMode==='mandala'){const mp=modeParams.mandala;const sectors=Math.round(mp.sectors);const baseRot=time*.0003*spinDirection*(mp.mandalaSpin||1);for(let k=0;k<sectors;k++){const r=baseRot+k*Math.PI*2/sectors;drawParticles(positions,{rotation:r,alpha:baseAlpha*Math.max(.15,1-k*(1/(sectors+2))),scale:1});}}
else{drawParticles(positions,{alpha:baseAlpha});}}

function renderGL(){
for(let i=0;i<TOTAL;i++){glPositions[i*2]=posX[i];glPositions[i*2+1]=posY[i];}
if(trailMode){
// 🌿 dim-quad — предыдущий кадр угасает, оставляя световой след
gl.useProgram(quadProgram);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.enableVertexAttribArray(aQuadPos);gl.vertexAttribPointer(aQuadPos,2,gl.FLOAT,false,0,0);
gl.uniform1f(uDim,trailFade);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
// 🌿 temporal ghost layers — призраки из прошлых мгновений
if(trailLayers>0&&trailLayerBuf){for(let layer=trailLayers;layer>=1;layer--){
for(let i=0;i<TOTAL;i++){trailLayerBuf[i*2]=posX[i]-velX[i]*layer*trailSpread;trailLayerBuf[i*2+1]=posY[i]-velY[i]*layer*trailSpread;}
renderWithMode(trailLayerBuf,0.35*(1-layer/(trailLayers+1)));}}
}else{gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}
renderWithMode(glPositions,1);}
function render2D(){if(!ctx2d)return;const imgData=ctx2d.createImageData(W,H),data=imgData.data;for(let i=0;i<TOTAL;i++){const px=posX[i]|0,py=posY[i]|0;if(px<0||px>=W||py<0||py>=H)continue;const r=colorCache[i*3],g=colorCache[i*3+1],b=colorCache[i*3+2];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const sx=px+dx,sy=py+dy;if(sx<0||sx>=W||sy<0||sy>=H)continue;const w=Math.exp(-(dx*dx+dy*dy)*.8)*1.2,off=(sy*W+sx)*4;data[off]=Math.min(255,data[off]+r*w);data[off+1]=Math.min(255,data[off+1]+g*w);data[off+2]=Math.min(255,data[off+2]+b*w);data[off+3]=255;}}ctx2d.putImageData(imgData,0,0);}
function render(){if(useWebGL&&gl&&!contextLost)renderGL();else render2D();}
let lastTime=performance.now(),animFrame;
function loop(ts){const dt=Math.min(.1,(ts-lastTime)/1000);lastTime=ts;if(dimension===3&&threeReady){time+=dt*1000*spinSpeed;render3DScene(dt);}else{update(dt);render();}if(classicVisOn)drawClassicAnalyzer();if(window._updateHoneycomb)window._updateHoneycomb(ts);if(window._updateFibers)window._updateFibers();animFrame=requestAnimationFrame(loop);}
let _resizeTimer=null,_lastW=0,_lastH=0;
window.addEventListener('resize',()=>{
    clearTimeout(_resizeTimer);
    _resizeTimer=setTimeout(()=>{
        const nw=window.innerWidth,nh=window.innerHeight;
        const dw=Math.abs(nw-_lastW),dh=Math.abs(nh-_lastH);
        if(dw<2&&dh<100)return;
        _lastW=nw;_lastH=nh;
        resizeCanvas();
        if(dimension===3&&threeReady){renderer3D.setSize(W,H);camera3D.aspect=W/H;camera3D.updateProjectionMatrix();}
        if(dimension===4&&gl){gl.viewport(0,0,W,H);}
    },200);
});
const initNorm=normalizeStops(currentStops);for(let i=0;i<9;i++){shaderH[i]=initNorm[i].h;shaderS[i]=initNorm[i].s;shaderV[i]=initNorm[i].v;}
if(useWebGL)initGPU();init();_lastW=W;_lastH=H;render();animFrame=requestAnimationFrame(loop);
enhanceSliders();applyPlan();
// #19 haptic feedback
function haptic(ms){try{if(navigator.vibrate)navigator.vibrate(ms||10);}catch(e){}}
// #10 keyboard shortcuts
document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    if(e.key===' '||e.code==='Space'){e.preventDefault();const pb=document.getElementById('bgmPlayBtn');if(pb)pb.click();}
    else if(e.key==='Escape'){
        if(sidePanel.classList.contains('open')){sidePanel.classList.remove('open');activeTool=null;toolIcons.forEach(function(t){t.classList.remove('active');});}
        const pp=document.getElementById('profilePanel');if(pp&&pp.classList.contains('open'))pp.classList.remove('open');
        const bp=document.querySelector('.beat-panel.open');if(bp)bp.classList.remove('open');
        const bm=document.getElementById('bgMusicPanel');if(bm&&bm.classList.contains('open'))bm.classList.remove('open');
    }
    else if(e.key==='['||e.key==='{'){ const keys=Object.keys(palettes);const ci=keys.indexOf(currentPaletteKey);const ni=(ci-1+keys.length)%keys.length;const btn=document.querySelector('.palette-item[data-palette="'+keys[ni]+'"]');if(btn)btn.click();haptic();}
    else if(e.key===']'||e.key==='}'){ const keys=Object.keys(palettes);const ci=keys.indexOf(currentPaletteKey);const ni=(ci+1)%keys.length;const btn=document.querySelector('.palette-item[data-palette="'+keys[ni]+'"]');if(btn)btn.click();haptic();}
});
// 🌿 Мобильная шторка
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

// 🧵 Волокна — частицы оставляют нити-хвосты
(function(){
    let active=false;
    const HLEN=30; // длина хвоста в кадрах
    const NFIBERS=1500; // сколько нитей рисуем
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
            histX=new Float32Array(NFIBERS*HLEN);
            histY=new Float32Array(NFIBERS*HLEN);
            for(let i=0;i<NFIBERS;i++){
                for(let t=0;t<HLEN;t++){
                    histX[i*HLEN+t]=posX[i]||0;
                    histY[i*HLEN+t]=posY[i]||0;
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
            histX[i*HLEN]=posX[i];
            histY[i*HLEN]=posY[i];
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
            histX[i*HLEN]=posX[i];
            histY[i*HLEN]=posY[i];
        }

        // Затухающий фон — нити накапливаются
        fCtx.fillStyle='rgba(0,0,0,0.08)';
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
