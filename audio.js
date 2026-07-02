// 🌿 audio.js — звуковое сердце Soundfield
// Здесь живёт музыкальный анализ, синтез ударных и ритм-данные
// Эти функции дышат вместе с визуализацией, превращая звук в свет

const beatTracks=[{key:'kick',label:'KCK',color:'clr-kick'},{key:'snare',label:'SNR',color:'clr-snare'},{key:'hihat',label:'HH',color:'clr-hihat'},{key:'ohat',label:'OH',color:'clr-ohat'},{key:'clap',label:'CLP',color:'clr-clap'},{key:'rim',label:'RIM',color:'clr-rim'},{key:'tom',label:'TOM',color:'clr-tom'},{key:'perc',label:'PRC',color:'clr-perc'}];

const BEAT_STEPS=16;

const beatPattern={kick:new Array(BEAT_STEPS).fill(false),snare:new Array(BEAT_STEPS).fill(false),hihat:new Array(BEAT_STEPS).fill(false),ohat:new Array(BEAT_STEPS).fill(false),clap:new Array(BEAT_STEPS).fill(false),rim:new Array(BEAT_STEPS).fill(false),tom:new Array(BEAT_STEPS).fill(false),perc:new Array(BEAT_STEPS).fill(false)};

const musicBands={bass:0,lowMid:0,mid:0,highMid:0,high:0,energy:0,flux:0};

function fmtTime(s){if(!s||isNaN(s))return'0:00';const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec;}

function playDrum(type){
    if(!beatCtx)return;
    const now=beatCtx.currentTime;
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

function analyzeMusic(){if(!musicAnalyser||!musicPlaying||!musicFreqData)return;musicAnalyser.getByteFrequencyData(musicFreqData);const n=musicFreqData.length,sr=musicCtx.sampleRate,binHz=sr/musicAnalyser.fftSize;const bassEnd=Math.min(n,Math.floor(250/binHz)),lowMidEnd=Math.min(n,Math.floor(1000/binHz)),midEnd=Math.min(n,Math.floor(4000/binHz)),highMidEnd=Math.min(n,Math.floor(12000/binHz));let bass=0,lowMid=0,mid=0,highMid=0,high=0,total=0,flux=0;for(let i=0;i<n;i++){const v=musicFreqData[i]/255;total+=v;if(i<bassEnd)bass+=v;else if(i<lowMidEnd)lowMid+=v;else if(i<midEnd)mid+=v;else if(i<highMidEnd)highMid+=v;else high+=v;const diff=v-prevSpectrum[i];if(diff>0)flux+=diff;prevSpectrum[i]=v;}musicBands.bass=bassEnd>0?bass/bassEnd:0;musicBands.lowMid=(lowMidEnd-bassEnd)>0?lowMid/(lowMidEnd-bassEnd):0;musicBands.mid=(midEnd-lowMidEnd)>0?mid/(midEnd-lowMidEnd):0;musicBands.highMid=(highMidEnd-midEnd)>0?highMid/(highMidEnd-midEnd):0;musicBands.high=(n-highMidEnd)>0?high/(n-highMidEnd):0;musicBands.energy=n>0?total/n:0;musicBands.flux=Math.min(1,flux/20);}

function decayBeatBands(dt){
    if(!beatPlaying||musicPlaying)return;
    const d=Math.exp(-dt*15);
    musicBands.bass*=d;musicBands.mid*=d;musicBands.high*=d;musicBands.highMid*=d;musicBands.energy*=d;musicBands.flux*=d;musicBands.lowMid*=d;
}
