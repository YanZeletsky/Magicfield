// 🌿 audio.js — звуковое сердце Soundfield
// Здесь живёт музыкальный анализ, синтез ударных и ритм-данные
// Эти функции дышат вместе с визуализацией, превращая звук в свет

const beatTracks=[{key:'kick',label:'KCK',color:'clr-kick'},{key:'snare',label:'SNR',color:'clr-snare'},{key:'hihat',label:'HH',color:'clr-hihat'},{key:'ohat',label:'OH',color:'clr-ohat'},{key:'clap',label:'CLP',color:'clr-clap'},{key:'rim',label:'RIM',color:'clr-rim'},{key:'tom',label:'TOM',color:'clr-tom'},{key:'perc',label:'PRC',color:'clr-perc'}];

const BEAT_STEPS=16;

const beatPattern={kick:new Array(BEAT_STEPS).fill(false),snare:new Array(BEAT_STEPS).fill(false),hihat:new Array(BEAT_STEPS).fill(false),ohat:new Array(BEAT_STEPS).fill(false),clap:new Array(BEAT_STEPS).fill(false),rim:new Array(BEAT_STEPS).fill(false),tom:new Array(BEAT_STEPS).fill(false),perc:new Array(BEAT_STEPS).fill(false)};

const musicBands={bass:0,lowMid:0,mid:0,highMid:0,high:0,energy:0,flux:0};

// 🌿 нормализованное дыхание музыки — каждый трек калибрует себя сам
const musicNorm={bass:0,mid:0,high:0,energy:0};
const bandPeaks={bass:0.08,mid:0.08,high:0.08,energy:0.08};
let bassHistory=[],beatPulse=0;

function envFollow(cur,target){return target>cur?cur+(target-cur)*0.35:cur+(target-cur)*0.07;}
function normalizeBand(key,raw){bandPeaks[key]=Math.max(bandPeaks[key]*0.9985,raw,0.05);return Math.min(1,raw/bandPeaks[key]);}

// 🌿 Паспорт трека — Полотно слушает трек целиком и узнаёт его душу
let trackPassport={ready:false,bpm:0,beats:[],beatPtr:0,energyMap:[],mapStep:0.25,brightness:0.5,percussive:0.5,peakEnergy:0.001};
let canvasVisOn=false,canvasWave=0,canvasE=0;
// 🌿 Классика — живое зеркало звука, история каждого канала
let classicVisOn=false;
const analyzerChannels=[
    {key:'bass',label:'Бас',hue:0},
    {key:'lowMid',label:'Низ-Ср',hue:35},
    {key:'mid',label:'Средние',hue:150},
    {key:'high',label:'Высокие',hue:200},
    {key:'energy',label:'Энергия',hue:280}
];
const analyzerHistory=analyzerChannels.map(()=>new Array(96).fill(0));

function drawClassicAnalyzer(){
    if(!classicVisOn)return;
    const cv=document.getElementById('analyzerCanvas');if(!cv)return;
    const ctx=cv.getContext('2d');
    const w=cv.clientWidth,h=cv.clientHeight;
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
    ctx.clearRect(0,0,w,h);
    // 🌿 сдвигаем историю, вписываем свежее дыхание
    for(let c=0;c<analyzerChannels.length;c++){
        const ch=analyzerChannels[c],hist=analyzerHistory[c];
        hist.shift();hist.push(Math.min(1,musicBands[ch.key]||0));
    }
    const n=analyzerChannels.length,gap=14;
    const rowH=(h-gap*(n-1))/n;
    for(let c=0;c<n;c++){
        const ch=analyzerChannels[c],hist=analyzerHistory[c];
        const y0=c*(rowH+gap),baseY=y0+rowH;
        // подпись канала — слева над дорожкой
        ctx.fillStyle='hsla('+ch.hue+',60%,65%,0.8)';ctx.font='11px -apple-system,sans-serif';ctx.textAlign='left';
        ctx.fillText(ch.label,4,y0+12);
        // текущее значение справа
        const cur=hist[hist.length-1];
        ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='10px -apple-system,sans-serif';
        ctx.fillText(Math.round(cur*100)+'%',w-4,y0+12);
        // базовая линия дорожки
        ctx.beginPath();ctx.moveTo(0,baseY);ctx.lineTo(w,baseY);
        ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.stroke();
        // волна истории — линия
        ctx.beginPath();
        for(let i=0;i<hist.length;i++){
            const px=(i/(hist.length-1))*w;
            const py=baseY-hist[i]*(rowH-4);
            if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.strokeStyle='hsla('+ch.hue+',70%,60%,0.9)';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
        // мягкая заливка под волной
        ctx.lineTo(w,baseY);ctx.lineTo(0,baseY);ctx.closePath();
        ctx.fillStyle='hsla('+ch.hue+',70%,55%,0.14)';ctx.fill();
        // текущий уровень — огонёк на краю
        ctx.beginPath();ctx.arc(w-1,baseY-cur*(rowH-4),3,0,Math.PI*2);
        ctx.fillStyle='hsla('+ch.hue+',85%,68%,1)';ctx.fill();
    }
}

function analyzeTrackPassport(buf){
    const sr=buf.sampleRate,ch=buf.getChannelData(0),N=ch.length;
    const win=2048,hop=1024,frames=Math.max(1,Math.floor((N-win)/hop));
    const bassEnv=new Float32Array(frames),energyF=new Float32Array(frames);
    let lp=0;const alpha=0.015;let zcrTotal=0;
    for(let f=0;f<frames;f++){
        let e=0,be=0,zc=0,prev=ch[f*hop];
        for(let i=0;i<win;i++){const s=ch[f*hop+i];e+=s*s;lp+=alpha*(s-lp);be+=lp*lp;if((s>=0)!==(prev>=0))zc++;prev=s;}
        energyF[f]=Math.sqrt(e/win);bassEnv[f]=Math.sqrt(be/win);zcrTotal+=zc/win;
    }
    // 🌿 онсеты — положительные всплески басовой огибающей
    const onsets=new Float32Array(frames);
    for(let f=1;f<frames;f++){const d=bassEnv[f]-bassEnv[f-1];onsets[f]=d>0?d:0;}
    const frameT=hop/sr,minGap=Math.round(0.25/frameT);
    let mean=0;for(let f=0;f<frames;f++)mean+=onsets[f];mean/=frames;
    const thr=mean*2.2,beats=[];let last=-minGap;
    for(let f=2;f<frames-2;f++){
        if(onsets[f]>thr&&onsets[f]>=onsets[f-1]&&onsets[f]>=onsets[f+1]&&f-last>=minGap){beats.push(f*frameT);last=f;}
    }
    // 🌿 BPM — медиана межбитовых интервалов
    let bpm=0;
    if(beats.length>4){const iv=[];for(let i=1;i<beats.length;i++)iv.push(beats[i]-beats[i-1]);iv.sort((a,b)=>a-b);let m=iv[Math.floor(iv.length/2)];while(m<0.33)m*=2;while(m>1)m/=2;bpm=Math.round(60/m);}
    // 🌿 энергетическая карта — рельеф трека по четвертям секунды
    const mapStep=0.25,mapLen=Math.max(1,Math.ceil(buf.duration/mapStep)),eMap=new Float32Array(mapLen);
    let pk=0.001;
    for(let f=0;f<frames;f++){const mi=Math.min(mapLen-1,Math.floor(f*frameT/mapStep));eMap[mi]=Math.max(eMap[mi],energyF[f]);if(energyF[f]>pk)pk=energyF[f];}
    trackPassport={ready:true,bpm:bpm,beats:beats,beatPtr:0,energyMap:eMap,mapStep:mapStep,
        peakEnergy:pk,brightness:Math.min(1,(zcrTotal/frames)*6),
        percussive:Math.min(1,beats.length/(buf.duration*2.5))};
}
function passportEnergyAt(t){const p=trackPassport;if(!p.ready||!p.energyMap.length)return 0;const i=Math.min(p.energyMap.length-1,Math.max(0,Math.floor(t/p.mapStep)));return Math.min(1,p.energyMap[i]/p.peakEnergy);}

function fmtTime(s){if(!s||isNaN(s))return'0:00';const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec;}

function playDrum(type){
    if(!beatCtx)return;
    const now=beatCtx.currentTime;
    // 🌿 удар — точный момент, сердце бьётся напрямую
    if(type==='kick')beatPulse=1;
    else if(type==='snare'||type==='clap')beatPulse=Math.max(beatPulse,0.55);
    if(type==='kick'){
        const osc=beatCtx.createOscillator(),g=beatCtx.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(150,now);osc.frequency.exponentialRampToValueAtTime(30,now+0.12);
        g.gain.setValueAtTime(1,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.3);
        osc.connect(g);g.connect(beatGain);osc.start(now);osc.stop(now+0.3);
    }else if(type==='snare'){
        const osc=beatCtx.createOscillator(),g=beatCtx.createGain();
        osc.type='triangle';osc.frequency.setValueAtTime(200,now);osc.frequency.exponentialRampToValueAtTime(80,now+0.08);
        g.gain.setValueAtTime(0.8,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.15);
        osc.connect(g);g.connect(beatGain);osc.start(now);osc.stop(now+0.15);
        const buf=beatCtx.createBuffer(1,beatCtx.sampleRate*0.1,beatCtx.sampleRate),d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*0.15));
        const ns=beatCtx.createBufferSource(),ng=beatCtx.createGain();ns.buffer=buf;
        ng.gain.setValueAtTime(0.6,now);ng.gain.exponentialRampToValueAtTime(0.01,now+0.12);
        ns.connect(ng);ng.connect(beatGain);ns.start(now);
    }else if(type==='hihat'){
        const buf=beatCtx.createBuffer(1,beatCtx.sampleRate*0.05,beatCtx.sampleRate),d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*0.08));
        const ns=beatCtx.createBufferSource(),g=beatCtx.createGain();ns.buffer=buf;
        g.gain.setValueAtTime(0.3,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.06);
        ns.connect(g);g.connect(beatGain);ns.start(now);
    }else if(type==='clap'){
        const buf=beatCtx.createBuffer(1,beatCtx.sampleRate*0.08,beatCtx.sampleRate),d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++){const env=Math.exp(-i/(d.length*0.12));const burst=(i%(beatCtx.sampleRate*0.01|1)<(beatCtx.sampleRate*0.005|1))?1:0.3;d[i]=(Math.random()*2-1)*env*burst;}
        const ns=beatCtx.createBufferSource(),g=beatCtx.createGain();ns.buffer=buf;
        g.gain.setValueAtTime(0.5,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.1);
        ns.connect(g);g.connect(beatGain);ns.start(now);
    }else if(type==='ohat'){
        const buf=beatCtx.createBuffer(1,beatCtx.sampleRate*0.15,beatCtx.sampleRate),d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*0.3));
        const ns=beatCtx.createBufferSource(),g=beatCtx.createGain();ns.buffer=buf;
        g.gain.setValueAtTime(0.25,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.15);
        ns.connect(g);g.connect(beatGain);ns.start(now);
    }else if(type==='rim'){
        const osc=beatCtx.createOscillator(),g=beatCtx.createGain();
        osc.type='square';osc.frequency.setValueAtTime(800,now);osc.frequency.exponentialRampToValueAtTime(400,now+0.02);
        g.gain.setValueAtTime(0.4,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.04);
        osc.connect(g);g.connect(beatGain);osc.start(now);osc.stop(now+0.05);
    }else if(type==='tom'){
        const osc=beatCtx.createOscillator(),g=beatCtx.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(100,now);osc.frequency.exponentialRampToValueAtTime(50,now+0.15);
        g.gain.setValueAtTime(0.7,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.2);
        osc.connect(g);g.connect(beatGain);osc.start(now);osc.stop(now+0.2);
    }else if(type==='perc'){
        const osc=beatCtx.createOscillator(),g=beatCtx.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(600,now);osc.frequency.exponentialRampToValueAtTime(200,now+0.05);
        g.gain.setValueAtTime(0.35,now);g.gain.exponentialRampToValueAtTime(0.01,now+0.08);
        osc.connect(g);g.connect(beatGain);osc.start(now);osc.stop(now+0.08);
    }
}

function analyzeMusic(){if(!musicAnalyser||!musicPlaying||!musicFreqData)return;musicAnalyser.getByteFrequencyData(musicFreqData);const n=musicFreqData.length,sr=musicCtx.sampleRate,binHz=sr/musicAnalyser.fftSize;const bassEnd=Math.min(n,Math.floor(250/binHz)),lowMidEnd=Math.min(n,Math.floor(1000/binHz)),midEnd=Math.min(n,Math.floor(4000/binHz)),highMidEnd=Math.min(n,Math.floor(12000/binHz));let bass=0,lowMid=0,mid=0,highMid=0,high=0,total=0,flux=0;for(let i=0;i<n;i++){const v=musicFreqData[i]/255;total+=v;if(i<bassEnd)bass+=v;else if(i<lowMidEnd)lowMid+=v;else if(i<midEnd)mid+=v;else if(i<highMidEnd)highMid+=v;else high+=v;const diff=v-prevSpectrum[i];if(diff>0)flux+=diff;prevSpectrum[i]=v;}musicBands.bass=bassEnd>0?bass/bassEnd:0;musicBands.lowMid=(lowMidEnd-bassEnd)>0?lowMid/(lowMidEnd-bassEnd):0;musicBands.mid=(midEnd-lowMidEnd)>0?mid/(midEnd-lowMidEnd):0;musicBands.highMid=(highMidEnd-midEnd)>0?highMid/(highMidEnd-midEnd):0;musicBands.high=(n-highMidEnd)>0?high/(n-highMidEnd):0;musicBands.energy=n>0?total/n:0;musicBands.flux=Math.min(1,flux/20);
    // 🌿 автокалибровка + огибающие — трек раскрывает свой рисунок
    musicNorm.bass=envFollow(musicNorm.bass,normalizeBand('bass',musicBands.bass));
    musicNorm.mid=envFollow(musicNorm.mid,normalizeBand('mid',(musicBands.mid+musicBands.lowMid)*0.5));
    musicNorm.high=envFollow(musicNorm.high,normalizeBand('high',(musicBands.high+musicBands.highMid)*0.5));
    musicNorm.energy=envFollow(musicNorm.energy,normalizeBand('energy',musicBands.energy));
    // 🌿 детектор ударов — сердцебиение трека
    bassHistory.push(musicNorm.bass);if(bassHistory.length>40)bassHistory.shift();
    const bAvg=bassHistory.reduce((a,b)=>a+b,0)/bassHistory.length;
    if(musicNorm.bass>bAvg*1.35&&musicNorm.bass>0.35&&beatPulse<0.3)beatPulse=1;
    beatPulse*=0.88;}

function decayBeatBands(dt){
    if(!beatPlaying||musicPlaying)return;
    const d=Math.exp(-dt*15);
    musicBands.bass*=d;musicBands.mid*=d;musicBands.high*=d;musicBands.highMid*=d;musicBands.energy*=d;musicBands.flux*=d;musicBands.lowMid*=d;
    // 🌿 биты дышат в тот же поток
    musicNorm.bass=envFollow(musicNorm.bass,musicBands.bass);
    musicNorm.mid=envFollow(musicNorm.mid,musicBands.mid);
    musicNorm.high=envFollow(musicNorm.high,musicBands.high);
    musicNorm.energy=envFollow(musicNorm.energy,musicBands.energy);
    beatPulse*=0.88;
}
