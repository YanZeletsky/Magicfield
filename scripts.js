// === Soundfield — scripts.js ===
const cursorEl=document.getElementById('cursor');
if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){document.addEventListener('mousemove',e=>{cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';});document.addEventListener('mousedown',()=>cursorEl.classList.add('active'));document.addEventListener('mouseup',()=>cursorEl.classList.remove('active'));}
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
    if(tool==='create'){
        // бит-панель — отдельная нижняя панель
        if(activeTool==='create'){activeTool='';beatPanel.classList.remove('open');toolIcons.forEach(t=>t.classList.remove('active'));return;}
        activeTool='create';
        sidePanel.classList.remove('open');closeCustomPanel();
        beatPanel.classList.add('open');
        toolIcons.forEach(t=>t.classList.toggle('active',t.dataset.tool==='create'));
        buildBeatGrid();
        return;
    }
    beatPanel.classList.remove('open');
    if(activeTool===tool){activeTool='';sidePanel.classList.remove('open');toolIcons.forEach(t=>t.classList.remove('active'));closeCustomPanel();return;}
    activeTool=tool;
    sidePanel.classList.add('open');
    toolIcons.forEach(t=>t.classList.toggle('active',t.dataset.tool===tool));
    Object.keys(pages).forEach(k=>{pages[k].classList.toggle('active',k===tool);});
    closeCustomPanel();
    if(tool==='settings')buildCurrentModeSettings();
    if(tool==='music')buildMusicParams();
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
// modes → tools.js
let currentMode='vortex';
let canvasShape=0;
let currentScene='2d',currentModeTab='manual';
const musicParamDefs=[{key:'reactivity',label:'Реактивность',min:.2,max:3,step:.1},{key:'bassStyle',label:'Бас',min:0,max:2,step:1,labels:['Пульс','Притяж.','Отталк.']},{key:'dynamics',label:'Динамика',min:.2,max:3,step:.1},{key:'vortex',label:'Вихрь',min:0,max:3,step:.1}];

function buildModeList(){
    const list=document.getElementById('modesList');list.innerHTML='';list.className='modes-icon-grid';
    const filter=currentModeTab==='manual'?manualModes:autoModes;
    modes.forEach(mode=>{
        if(!filter.includes(mode.key))return;
        const item=document.createElement('div');item.className='mode-icon-item'+(mode.key===currentMode?' active':'');
        item.innerHTML=(modeIcons[mode.key]||'')+'<span class="mode-icon-label">'+mode.name+'</span>';
        onTap(item,function(e){e.stopPropagation();currentMode=mode.key;buildModeList();if(activeTool==='settings')buildCurrentModeSettings();});
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
            onTap(step,function(e){e.stopPropagation();beatPattern[track.key][i]=!beatPattern[track.key][i];step.classList.toggle('on');});
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
let dimension=0; // 0=2D, 1=3D, 2=4D
let mode1D=false;
let capture1DShape=0,capture1DLayers=0,capture1DGap=8;
let deformSub=0,deformAmp=0.3,deformFreq=3,deformRad=0.36,deformRot=0.5,deformTilt=0.35;

// Переключение 1D/2D/3D/4D

// Scene bar (верхняя панель сцен)
document.querySelectorAll('.scene-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        currentScene=btn.dataset.scene;
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
        const s4dt=document.getElementById('shapeSection4DTime');if(s4dt)s4dt.style.display=currentScene==='4d'?'':'none';
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
            dimension=0;mode1D=false;trailMode=true;switchFromTest();
            for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;}
        }else if(currentScene==='visual'){
            dimension=4;mode1D=false;trailMode=false;switchFromTest();initBetaVisual();
        }
        const wc=document.getElementById('wireCanvas');
        if(wc)wc.style.display=(currentScene==='2d'&&barrierShape>0)?'block':'none';
        // показать/скрыть glCanvas vs threeCanvas
        if(currentScene==='3d'){
            document.getElementById('glCanvas').classList.add('hidden');
            document.getElementById('threeCanvas').classList.remove('hidden');
            document.getElementById('threeCanvas').style.display='block';
        }else{
            document.getElementById('threeCanvas').classList.add('hidden');
            document.getElementById('threeCanvas').style.display='none';
            document.getElementById('glCanvas').classList.remove('hidden');
        }
    });
});
// Mode tabs (Ручник / Автомат)
document.querySelectorAll('#modeTabs .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        currentModeTab=btn.dataset.mtab;
        document.querySelectorAll('#modeTabs .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        buildModeList();
    });
});
// 🌿 3D mode list — динамический грид режимов
let currentModeTab3D='manual';
function buildModeList3D(){
    const list=document.getElementById('modesList3D');if(!list)return;list.innerHTML='';list.className='modes-icon-grid';
    const filter=currentModeTab3D==='manual'?manualModes3D:autoModes3D.concat(['mandala']);
    modes.forEach(mode=>{
        if(!filter.includes(mode.key))return;
        const item=document.createElement('div');item.className='mode-icon-item'+(mode.key===testMode3D?' active':'');
        item.innerHTML=(modeIcons[mode.key]||'')+'<span class="mode-icon-label">'+mode.name+'</span>';
        onTap(item,function(e){e.stopPropagation();
            testMode3D=mode.key;buildModeList3D();
            const ms=document.getElementById('mandalaSubSection3D');if(ms)ms.style.display=testMode3D==='mandala'?'':'none';
            const mds=document.getElementById('testMandalaSettings');if(mds)mds.style.display=testMode3D==='mandala'?'':'none';
            buildModeSettings3D();
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
document.querySelectorAll('#modeTabs3D .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
        currentModeTab3D=btn.dataset.mtab3d;
        document.querySelectorAll('#modeTabs3D .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        buildModeList3D();
    });
});
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
        mode1D=dim==='1d';
        if(dim==='2d')dimension=0;else if(dim==='3d')dimension=1;else if(dim==='4d')dimension=2;else if(dim==='test')dimension=3;else if(dim==='beta')dimension=4;else dimension=0;
        document.querySelectorAll('#dimensionBtns .sub-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('shapeSection1D').style.display=mode1D?'':'none';
        document.getElementById('shapeSection2D').style.display=(!mode1D&&dimension===0)?'':'none';
        document.getElementById('shapeSection3D').style.display=dimension===1?'':'none';
        document.getElementById('shapeSection4D').style.display=dimension===2?'':'none';
        document.getElementById('shapeSectionTest').style.display=dimension===3?'':'none';
        document.getElementById('shapeSectionBeta').style.display=dimension===4?'':'none';
        document.getElementById('settingsCommon').style.display=(!mode1D&&dimension===0)?'':'none';
        const wc=document.getElementById('wireCanvas');
        wc.style.display=(mode1D||dimension===2||(barrierShape>0&&dimension===0))?'block':'none';
        if(wc&&wireCtx){wc.width=W;wc.height=H;}
        for(let i=0;i<TOTAL;i++){velX[i]=0;velY[i]=0;}
        if(dimension===3)switchToTest();else if(dimension===4){switchFromTest();initBetaVisual();}else{switchFromTest();if(dimension===2)init4D();}
    });
});
// 1D захват
document.querySelectorAll('#capture1DBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();capture1DShape=+btn.dataset.bar;
        document.querySelectorAll('#capture1DBtns .sub-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
        document.getElementById('capture1DSlider').parentElement.style.display=capture1DShape>0?'flex':'none';
        if(capture1DShape>0&&capture1DLayers<1){capture1DLayers=1;document.getElementById('capture1DSlider').value=1;document.getElementById('capture1DVal').textContent='1';}
        const wc=document.getElementById('wireCanvas');
        if(capture1DShape>0&&mode1D){wc.style.display='block';if(wireCtx){wc.width=W;wc.height=H;}}
        else if(mode1D){wc.style.display='none';if(wireCtx)wireCtx.clearRect(0,0,W,H);}
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
function drawCapture1D(){
    if(!wireCtx||!mode1D||capture1DShape===0||capture1DLayers<1)return;
    wireCtx.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2,radii=getCapture1DRadii();
    wireCtx.strokeStyle='rgba(255,255,255,0.25)';wireCtx.lineWidth=1;
    radii.forEach(R=>{
        if(capture1DShape===1){
            wireCtx.beginPath();wireCtx.arc(cx,cy,R,0,Math.PI*2);wireCtx.stroke();
        }else if(capture1DShape===2){
            wireCtx.beginPath();wireCtx.rect(cx-R,cy-R,R*2,R*2);wireCtx.stroke();
        }else if(capture1DShape===3){
            wireCtx.beginPath();
            for(let k=0;k<=3;k++){const a=k*Math.PI*2/3-Math.PI/2;const x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(k===0)wireCtx.moveTo(x,y);else wireCtx.lineTo(x,y);}
            wireCtx.stroke();
        }
    });
}
// 2D формы
document.querySelectorAll('#shapeBtns .sub-btn').forEach(btn=>{
    onTap(btn,function(e){e.stopPropagation();
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
document.addEventListener('mousedown',e=>{if(dimension===4&&e.button===2){betaDragStart={x:e.clientX,y:e.clientY,rx:betaRotX,ry:betaRotY};e.preventDefault();}});
document.addEventListener('mousemove',e=>{if(betaDragStart){betaRotY=betaDragStart.ry+(e.clientX-betaDragStart.x)*0.008;betaRotX=betaDragStart.rx+(e.clientY-betaDragStart.y)*0.008;}});
document.addEventListener('mouseup',e=>{if(e.button===2)betaDragStart=null;});
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
const wireCanvas=document.getElementById('wireCanvas');
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
        const wc=document.getElementById('wireCanvas');
        if(barrierShape>0){wc.style.display='block';wc.width=W;wc.height=H;drawBarriers();}
        else{if(dimension!==2){wc.style.display='none';if(wireCtx)wireCtx.clearRect(0,0,W,H);}}
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

function drawBarriers(){
    if(!wireCtx||barrierShape===0||dimension!==0)return;
    wireCtx.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2;
    const radii=getBarrierRadii();
    wireCtx.strokeStyle='rgba(255,255,255,0.25)';
    wireCtx.lineWidth=1;
    if(barrierShape===1){// круги
        radii.forEach(r=>{wireCtx.beginPath();wireCtx.arc(cx,cy,r,0,Math.PI*2);wireCtx.stroke();});
    }else if(barrierShape===2){// квадраты
        radii.forEach(r=>{wireCtx.beginPath();wireCtx.rect(cx-r,cy-r,r*2,r*2);wireCtx.stroke();});
    }else if(barrierShape===3){// треугольники
        radii.forEach(r=>{
            wireCtx.beginPath();
            for(let k=0;k<=3;k++){
                const a=k*Math.PI*2/3-Math.PI/2;
                const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
                if(k===0)wireCtx.moveTo(x,y);else wireCtx.lineTo(x,y);
            }
            wireCtx.stroke();
        });
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
function closeCustomPanel(){customPanelOpen=false;customPalettePanel.classList.remove('open');}
customPalettePanel.addEventListener('click',e=>e.stopPropagation());
function getCustomGradientCSS(){return'linear-gradient(to right,'+customColors.join(',')+')';}
function getCustomStops(){return customColors.map((c,i)=>{const hsv=hexToHSV(c);return{pos:customColors.length>1?i/(customColors.length-1):0,h:hsv.h,s:hsv.s,v:hsv.v};});}
function applyCustomPalette(){if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);targetStops=getCustomStops();transitionProgress=0;currentPalette='custom';buildPaletteList();}
function buildCustomStops(){const container=document.getElementById('customStops');container.innerHTML='';const preview=document.getElementById('customPreview');preview.style.background=getCustomGradientCSS();customColors.forEach((color,idx)=>{const row=document.createElement('div');row.className='custom-stop-row';const input=document.createElement('input');input.type='color';input.className='custom-color-input';input.value=color;const label=document.createElement('span');label.className='custom-color-label';label.textContent=color.toUpperCase();input.addEventListener('input',e=>{e.stopPropagation();customColors[idx]=e.target.value;preview.style.background=getCustomGradientCSS();label.textContent=input.value.toUpperCase();if(currentPalette==='custom')applyCustomPalette();});input.addEventListener('touchstart',e=>e.stopPropagation());const remove=document.createElement('div');remove.className='custom-remove-btn';remove.textContent='×';onTap(remove,function(e){e.stopPropagation();if(customColors.length<=2)return;customColors.splice(idx,1);buildCustomStops();if(currentPalette==='custom')applyCustomPalette();});row.appendChild(input);row.appendChild(label);if(customColors.length>2)row.appendChild(remove);container.appendChild(row);});}
onTap(document.getElementById('customAddStop'),e=>{e.stopPropagation();if(customColors.length>=9)return;customColors.push(customColors[customColors.length-1]||'#ffffff');buildCustomStops();if(currentPalette==='custom')applyCustomPalette();});
function buildPaletteList(){const list=document.getElementById('paletteList');list.innerHTML='';const ci=document.createElement('div');ci.className='palette-item'+(currentPalette==='custom'?' active':'');const cs=document.createElement('div');cs.className='palette-swatch';cs.style.background=getCustomGradientCSS();const cn=document.createElement('span');cn.className='palette-name';cn.textContent='✦ Свой вариант';ci.appendChild(cs);ci.appendChild(cn);onTap(ci,function(e){e.stopPropagation();applyCustomPalette();toggleCustomPanel();});list.appendChild(ci);Object.keys(palettes).forEach(key=>{const p=palettes[key];const item=document.createElement('div');item.className='palette-item'+(key===currentPalette?' active':'');const sw=document.createElement('div');sw.className='palette-swatch';sw.style.background=p.swatch;const nm=document.createElement('span');nm.className='palette-name';nm.textContent=p.name;item.appendChild(sw);item.appendChild(nm);onTap(item,function(e){e.stopPropagation();closeCustomPanel();if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(currentStops));else currentStops=lerpStops(currentStops,targetStops,transitionProgress);targetStops=JSON.parse(JSON.stringify(palettes[key].stops));transitionProgress=0;currentPalette=key;buildPaletteList();});list.appendChild(item);});}
buildPaletteList();

// --- Музыка ---
let musicCtx=null,musicAnalyser=null,musicSource=null,musicGain=null,musicAudio=null,musicFreqData=null,musicPlaying=false;
let prevSpectrum=null;
const musicFile=document.getElementById('musicFile'),flowUploadArea=document.getElementById('flowUploadArea'),flowUploadText=document.getElementById('flowUploadText'),musicPlayBtn=document.getElementById('musicPlayBtn'),musicSeek=document.getElementById('musicSeek'),musicVol=document.getElementById('musicVol'),musicTimeNow=document.getElementById('musicTimeNow'),musicTimeDur=document.getElementById('musicTimeDur'),flowControls=document.getElementById('flowControls');
onTap(flowUploadArea,e=>{e.stopPropagation();musicFile.click();});
musicFile.addEventListener('change',function(e){e.stopPropagation();const file=this.files[0];if(!file)return;flowUploadText.textContent=file.name.length>18?file.name.slice(0,16)+'…':file.name;flowUploadArea.classList.add('has-track');flowControls.classList.add('visible');if(musicAudio){musicAudio.pause();musicPlaying=false;musicPlayBtn.textContent='▶';}musicAudio=new Audio();musicAudio.src=URL.createObjectURL(file);musicAudio.volume=musicVol.value/100;musicAudio.addEventListener('loadedmetadata',()=>{musicTimeDur.textContent=fmtTime(musicAudio.duration);musicSeek.max=musicAudio.duration;});musicAudio.addEventListener('ended',()=>{musicPlaying=false;musicPlayBtn.textContent='▶';musicPlayBtn.classList.remove('playing');});musicAudio.addEventListener('timeupdate',()=>{if(!musicSeeking){musicSeek.value=musicAudio.currentTime;musicTimeNow.textContent=fmtTime(musicAudio.currentTime);}});if(!musicCtx)musicCtx=new(window.AudioContext||window.webkitAudioContext)();if(musicSource)try{musicSource.disconnect();}catch(x){}musicSource=musicCtx.createMediaElementSource(musicAudio);musicAnalyser=musicCtx.createAnalyser();musicAnalyser.fftSize=512;musicAnalyser.smoothingTimeConstant=.75;musicGain=musicCtx.createGain();musicGain.gain.value=musicVol.value/100;musicSource.connect(musicAnalyser);musicAnalyser.connect(musicGain);musicGain.connect(musicCtx.destination);musicFreqData=new Uint8Array(musicAnalyser.frequencyBinCount);prevSpectrum=new Float32Array(musicAnalyser.frequencyBinCount);});
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
function init(){GAP=userGap;W=window.innerWidth;H=window.innerHeight;if(useWebGL){glCanvas.width=W;glCanvas.height=H;if(gl)gl.viewport(0,0,W,H);}else{c2dCanvas.width=W;c2dCanvas.height=H;}COLS=Math.ceil(W/GAP);ROWS=Math.ceil(H/GAP);TOTAL=COLS*ROWS;homeX=new Float32Array(TOTAL);homeY=new Float32Array(TOTAL);posX=new Float32Array(TOTAL);posY=new Float32Array(TOTAL);velX=new Float32Array(TOTAL);velY=new Float32Array(TOTAL);hue=new Float32Array(TOTAL);glPositions=new Float32Array(TOTAL*2);sTheta=new Float32Array(TOTAL);sPhi=new Float32Array(TOTAL);const cc=(COLS-1)/2,cr=(ROWS-1)/2,md=Math.sqrt(cc*cc+cr*cr);for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=r*COLS+c;homeX[i]=c*GAP;homeY[i]=r*GAP;posX[i]=homeX[i];posY[i]=homeY[i];const dx=c-cc,dy=r-cr,dist=Math.sqrt(dx*dx+dy*dy);const proj=md>0?(dx*.7071+dy*.7071)/md:0,dr=md>0?dist/md:0;hue[i]=1/(1+Math.exp(-(2+dr*4)*proj));sTheta[i]=Math.PI*(r/(ROWS-1));sPhi[i]=2*Math.PI*c/COLS;}if(useWebGL&&gl){gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.bufferData(gl.ARRAY_BUFFER,hue,gl.STATIC_DRAW);}colorCache=new Uint8Array(TOTAL*3);sDTheta=new Float32Array(TOTAL);sDPhi=new Float32Array(TOTAL);trailLayerBuf=new Float32Array(TOTAL*2);}

// Three.js 3D scene → scene3d.js


// betaВизуал → visual.js


let mouseDown=false,mousePos={x:0,y:0},touchPoints=[];
function isUI(e){return e.target.closest('.anchor')||e.target.closest('.profile-panel')||e.target.closest('.toolbar')||e.target.closest('.side-panel')||e.target.closest('.custom-palette-panel')||e.target.closest('.beat-panel')||e.target.closest('.scene-bar');}
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
if(currentMode==='mandala'&&(mouseDown||touchPoints.length>0))points.push({x:W/2,y:H/2,strength:0.5});if((musicPlaying||beatPlaying)&&musicBands.energy>.01){const cx=W/2,cy=H/2,e=musicBands.energy;points.push({x:cx,y:cy,strength:e*1.5});const orbitSpeed=time*.001*(1+musicBands.mid*3)*spinDirection;const orbitR=Math.min(W,H)*.25*(1+musicBands.bass*.5);for(let k=0;k<4;k++){const a=orbitSpeed+k*Math.PI/2;points.push({x:cx+Math.cos(a)*orbitR,y:cy+Math.sin(a)*orbitR,strength:e*.7});}}// --- Мандала подрежимы: кольцевая физика ---
const isMandSub=currentMode==='mandala'&&Math.round(modeParams.mandala.sub||0)>0;
const isSphere=currentMode==='sphere';
if(isMandSub||isSphere){
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

function drawParticles(positions,o){gl.useProgram(program);gl.uniform2f(uResolution,W,H);gl.uniform1fv(uStopH,shaderH);gl.uniform1fv(uStopS,shaderS);gl.uniform1fv(uStopV,shaderV);gl.uniform1f(uAlpha,(o.alpha||1)*brightnessLevel);gl.uniform3f(uColorMask,o.r!==undefined?o.r:1,o.g!==undefined?o.g:1,o.b!==undefined?o.b:1);gl.uniform1f(uRotation,o.rotation||0);gl.uniform1f(uScale,(o.scale||1)*zoomLevel);gl.uniform2f(uOffset,o.ox||0,o.oy||0);gl.uniform1f(uPointScale,(o.pointScale||1)*zoomLevel);gl.uniform1f(uSphereMode,o.sphereMode||0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer);gl.bufferData(gl.ARRAY_BUFFER,positions,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,hueBuffer);gl.enableVertexAttribArray(aHue);gl.vertexAttribPointer(aHue,1,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,TOTAL);}
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
function loop(ts){const dt=Math.min(.1,(ts-lastTime)/1000);lastTime=ts;if(dimension===4){time+=dt*1000*spinSpeed;renderBetaVisual(dt);}else if(dimension===3&&threeReady){time+=dt*1000*spinSpeed;render3DScene(dt);}else{update(dt);render();if(dimension===0&&barrierShape>0&&!mode1D)drawBarriers();if(mode1D)drawCapture1D();}animFrame=requestAnimationFrame(loop);}
window.addEventListener('resize',()=>{cancelAnimationFrame(animFrame);init();if(wireCanvas){wireCanvas.width=window.innerWidth;wireCanvas.height=window.innerHeight;}if(dimension===2)init4D();if(dimension===4&&gl){gl.viewport(0,0,W,H);}if(dimension===3&&threeReady){renderer3D.setSize(W,H);camera3D.aspect=W/H;camera3D.updateProjectionMatrix();}lastTime=performance.now();animFrame=requestAnimationFrame(loop);});
const initNorm=normalizeStops(currentStops);for(let i=0;i<9;i++){shaderH[i]=initNorm[i].h;shaderS[i]=initNorm[i].s;shaderV[i]=initNorm[i].v;}
if(useWebGL)initGPU();init();render();animFrame=requestAnimationFrame(loop);
