// 🌿 visual.js — шейдерные визуалы Soundfield
// Тоннель, Кристалл, Потоки — чистая математика на GPU
// Каждый пиксель рождается из формулы, каждый кадр — новый узор

// ====== BETA VISUAL — полноэкранные шейдерные паттерны ======
let betaReady=false,betaProgram=null,betaQuadBuf=null;
let betaSpeed=0.3,betaTwist=0.5,betaZoom=0.6,betaBright=1.5,betaSize=0.4,betaDensity=0.3,betaPulse=0.2,betaPattern=0;
let betaRotX=0.3,betaRotY=0,betaDragStart=null;
let betaUTime,betaURes,betaUSpeed,betaUTwist,betaUZoom,betaUBright,betaUTouch,betaUTouchOn,betaUBass,betaUEnergy,betaUC1,betaUC2,betaUC3;

const betaFragSrc=`precision highp float;
uniform vec2 u_res;uniform float u_time,u_speed,u_twist,u_zoom,u_bright,u_touchOn,u_bass,u_energy,u_size,u_density,u_pulse;
uniform vec2 u_touch;uniform vec3 u_c1,u_c2,u_c3;
void main(){
    vec2 uv=(gl_FragCoord.xy-u_res*0.5)/min(u_res.x,u_res.y);
    uv-=u_touch*u_touchOn*0.3;
    float r=length(uv);float a=atan(uv.y,uv.x);
    float t=u_time*u_speed;
    float depth=u_zoom/(r+0.02)+t;
    float pulse=1.0+u_pulse*sin(t*3.0)*0.3;
    // fibonacci ячейки с бесшовным переходом
    float ga=2.39996;
    float ring=depth*u_density*10.0;
    float n=floor(ring);float fn=fract(ring);
    // целое число секторов — убирает шов
    float sectors=floor(max(6.0,6.0+n*1.8));
    float sa=6.28318/sectors;
    float spiralA=a+n*ga+t*u_twist;
    float cellX=fract(spiralA/sa+0.5)-0.5;
    float cellY=fn-0.5;
    // сфера
    float sz=u_size*0.8*pulse;
    float sr=length(vec2(cellX,cellY));
    if(sr>sz){gl_FragColor=vec4(0,0,0,1);return;}
    // 3D нормаль
    float nx2=cellX/sz;float ny2=cellY/sz;
    float nz2=sqrt(max(0.0,1.0-nx2*nx2-ny2*ny2));
    // свет из центра тоннеля
    vec2 ld=normalize(vec2(-uv.x,-uv.y)+0.001);
    float diffuse=max(0.0,nx2*ld.x*0.6+ny2*ld.y*0.6+nz2*0.6);
    float spec=pow(max(0.0,nz2*0.8+nx2*ld.x*0.2+ny2*ld.y*0.2),48.0);
    float rim=pow(1.0-nz2,2.5)*0.6;
    float ao=smoothstep(0.0,0.5,nz2);
    // half-sphere gradient (top bright, bottom dark)
    float gradient=0.5+0.5*nz2;
    // цвет из палитры
    float ct=fract(n*0.06+a*0.16);
    vec3 col=mix(u_c1,u_c2,ct);col=mix(col,u_c3,sin(ct*3.14159)*0.5+0.5);
    // глубинное свечение
    float glow=1.0/(r*3.0+0.3);
    // собираем освещение
    vec3 lit=col*(diffuse*0.7+0.3)*ao*gradient;
    lit+=vec3(1.0)*spec*1.2;
    lit+=col*rim;
    lit*=glow*u_bright;
    lit*=1.0+u_bass*0.8;
    lit+=u_c1*u_energy*glow*0.15;
    lit*=smoothstep(1.5,0.3,r);
    gl_FragColor=vec4(lit,1.0);
}`;

const crystalFragSrc=`precision highp float;
uniform vec2 u_res;uniform float u_time,u_speed,u_twist,u_zoom,u_bright,u_touchOn,u_bass,u_energy,u_size,u_density,u_pulse;
uniform vec2 u_touch;uniform vec3 u_c1,u_c2,u_c3;
const float PI=3.14159265;
// simplex noise
vec4 permute(vec4 x){return mod(x*x*34.0+x,289.);}
float snoise(vec3 v){
const vec2 C=vec2(0.166667,0.333333);const vec4 D=vec4(0,0.5,1,2);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod(i,289.);
vec4 p=permute(permute(permute(i.z+vec4(0,i1.z,i2.z,1))+i.y+vec4(0,i1.y,i2.y,1))+i.x+vec4(0,i1.x,i2.x,1));
vec3 ns=0.142857143*D.wyz-D.xzx;
vec4 j=p-49.0*floor(p*ns.z*ns.z);
vec4 x_=floor(j*ns.z);vec4 x=x_*ns.x+ns.yyyy;
vec4 y=floor(j-7.0*x_)*ns.x+ns.yyyy;
vec4 h=1.0-abs(x)-abs(y);
vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;
vec4 sh=-step(h,vec4(0));
vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
m=m*m*m;
return .5+12.0*dot(m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
// SDF
float vmax(vec3 v){return max(max(v.x,v.y),v.z);}
float fBox(vec3 p,vec3 b){vec3 d=abs(p)-b;return length(max(d,vec3(0)))+vmax(min(d,vec3(0)));}
float pModPolar(inout vec2 p,float rep){float a=2.0/rep*PI;float ag=atan(p.y,p.x)+a/2.;float r=length(p);float c=floor(ag/a);ag=mod(ag,a)-a/2.;p=vec2(cos(ag),sin(ag))*r;return c;}
float fOpUnionRound(float a,float b,float r){vec2 u=max(vec2(r-a,r-b),vec2(0));return max(r,min(a,b))-length(u);}
float map(vec3 pos){
pos-=snoise(pos*u_density*0.15)*u_size*3.0;
vec3 q=pos;pModPolar(q.xz,6.0);q-=vec3(8,0,0);
float d=fBox(q,vec3(3.0+u_bass*0.5));
q=pos;pModPolar(q.xz,8.0);
d=fOpUnionRound(d,fBox(q,vec3(6.0,12.0+u_pulse*5.0,6.0)),5.0);
if(u_touchOn>0.5){vec3 tp=vec3(u_touch.x*15.0,u_touch.y*15.0,8.0);d-=exp(-length(pos-tp)*0.3)*3.0;}
return d;}
// normal
vec3 calcN(vec3 p){float e=0.01;
const vec3 v1=vec3(1,-1,-1);const vec3 v2=vec3(-1,-1,1);const vec3 v3=vec3(-1,1,-1);const vec3 v4=vec3(1,1,1);
return normalize(v1*map(p+v1*e)+v2*map(p+v2*e)+v3*map(p+v3*e)+v4*map(p+v4*e));}
float hash(float n){return fract(sin(n)*3538.5453);}
// AO
float calcAO(vec3 p,vec3 n,float maxD,float fall){float ao=0.0;
for(int i=0;i<6;i++){float l=hash(float(i))*maxD;ao+=(l-map(p+n*l))/pow(1.0+l,fall);}
return clamp(1.0-ao/6.0,0.0,1.0);}
// thickness (SSS)
float thickness(vec3 p,vec3 n,float maxD,float fall){float ao=0.0;
for(int i=0;i<6;i++){float l=hash(float(i))*maxD;ao+=(l+map(p-n*l))/pow(1.0+l,fall);}
return clamp(1.0-ao/6.0,0.0,1.0);}
// camera
vec3 orbit(float phi,float theta,float r){return vec3(r*sin(phi)*cos(theta),r*cos(phi),r*sin(phi)*sin(theta));}
mat3 setCamera(vec3 ro,vec3 ta){vec3 cw=normalize(ta-ro);vec3 cu=normalize(cross(cw,vec3(0,1,0)));vec3 cv=normalize(cross(cu,cw));return mat3(cu,cv,cw);}
void main(){
vec2 uv=gl_FragCoord.xy/u_res.xy;
vec2 p=-1.0+2.0*uv;p.x*=u_res.x/u_res.y;
// камера — мышь вращает
float camR=35.0+u_zoom*30.0;
vec3 ro=orbit(PI/2.0-u_speed,PI/2.0+u_twist,camR);
mat3 ca=setCamera(ro,vec3(0));
vec3 rd=ca*normalize(vec3(p.xy,1.6));
// raymarching
float t=0.0;
for(int i=0;i<35;i++){float d=map(ro+rd*t);if(d<0.01||t>100.0)break;t+=d;}
// фон
vec3 col=mix(u_c1*0.15,u_c3*0.05,uv.y);
if(t<100.0){
vec3 pos=ro+rd*t;
vec3 nor=calcN(pos);
float ao=calcAO(pos,nor,10.0,1.2);
float thi=thickness(pos,nor,6.0,1.5);
// верхний свет
vec3 lpos1=vec3(0,15.0+sin(u_time*0.5)*5.0,0);
vec3 ldir1=normalize(lpos1-pos);
float latt1=pow(length(lpos1-pos)*0.1,1.5);
float trans1=pow(clamp(dot(-rd,-ldir1+nor),0.0,1.0),1.0)+1.0;
vec3 diff1=u_c2*(max(dot(nor,ldir1),0.0))/latt1;
col=diff1;
col+=u_c1*0.5*(trans1/latt1)*thi;
// кольцо огней
for(int i=0;i<6;i++){
float angle=float(i)/6.0*PI*2.0;
float radius=30.0;
vec3 lp=vec3(cos(angle)*radius,5.0,sin(angle)*radius);
vec3 ld=normalize(lp-pos);
float la=pow(length(lp-pos)*0.3,1.0+u_energy);
float tr=pow(clamp(dot(-rd,-ld+nor),0.0,1.0),1.0)+1.0;
col+=u_c3*0.3*(tr/la)*thi;}
col=max(vec3(0.03),col);
col*=ao;
// спекуляр
vec3 H=normalize(normalize(vec3(0,15,0)-pos)-rd);
col+=pow(max(dot(nor,H),0.0),64.0)*u_c2*0.5;
}
col*=u_bright*0.7;
// виньетка
col*=0.7+0.3*pow(16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y),0.15);
gl_FragColor=vec4(col,1.0);
}`;

let crystalProgram=null,crystalReady=false;
const streamsFragSrc=`precision highp float;
uniform vec2 u_res;uniform float u_time,u_speed,u_twist,u_zoom,u_bright,u_touchOn,u_bass,u_energy,u_size,u_density,u_pulse;
uniform vec2 u_touch;uniform vec3 u_c1,u_c2,u_c3;
void main(){
vec2 uv=gl_FragCoord.xy/u_res;
vec2 p=(gl_FragCoord.xy-u_res*0.5)/min(u_res.x,u_res.y);
float t=u_time*u_speed*0.5;
float aspect=u_res.x/u_res.y;
vec3 col=vec3(0);
float streams=4.0+u_density*30.0;
float cellW=2.0*aspect/streams;
float streamIdx=floor((p.x+aspect)/cellW);
for(float ds=-1.0;ds<=1.0;ds+=1.0){
float si=streamIdx+ds;
float streamX=(si+0.5)*cellW-aspect;
float streamSeed=fract(sin(si*73.156)*4375.5);
float ct=fract(si*0.618+0.3);
vec3 sc=mix(u_c1,u_c2,ct);sc=mix(sc,u_c3,sin(ct*3.14159)*0.5+0.5);
float cellH=0.008+u_size*0.04;
float speed=0.5+streamSeed*1.0;
float direction=mod(si,2.0)<1.0?1.0:-1.0;
float py=p.y+t*speed*direction;
float ci=floor(py/cellH);
for(float dy=-2.0;dy<=2.0;dy+=1.0){
float cy=ci+dy;
float fy=fract(py/cellH)-dy;
float h1=fract(sin(cy*127.1+si*311.7)*43758.5);
float h2=fract(sin(cy*269.5+si*183.3)*43758.5);
float h3=fract(sin(cy*419.2+si*571.3)*43758.5);
float px=streamX+(h1-0.5)*cellW*u_twist*2.0;
float ppy=(fy-0.5)*cellH;
float brightness=0.4+h2*0.6;
if(u_touchOn>0.5){
vec2 mp=vec2(u_touch.x*aspect,u_touch.y);
vec2 pp2=vec2(px,p.y);
vec2 diff=pp2-mp;
float dist=length(diff);
float push=exp(-dist*dist*8.0)*0.4;
px+=diff.x/(dist+0.01)*push;
ppy+=diff.y/(dist+0.01)*push*0.5;
}
vec2 d=vec2(p.x-px,ppy);
float r=length(d);
float dotSize=0.001+u_size*0.003;
float glow=exp(-r*r/dotSize)*brightness;
float trail=exp(-d.x*d.x/(dotSize*0.3))*exp(d.y*direction/(cellH*0.6))*0.2*brightness;
trail=max(0.0,trail);
float pulse=1.0+u_pulse*sin(t*4.0+si*0.7+cy*0.3)*0.3;
col+=sc*(glow+trail)*pulse;
}}
col*=u_bright*0.8;
col*=1.0+u_bass*1.5;
col+=u_c2*u_energy*0.05;
col*=0.8+0.2*pow(16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y),0.2);
gl_FragColor=vec4(col,1.0);
}`;
let streamsProgram=null,streamsReady=false;
function initBetaVisual(){
    if(betaReady)return;if(!gl)return;
    const vs=`attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;
    const vsh=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vsh,vs);gl.compileShader(vsh);
    const fsh=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fsh,betaFragSrc);gl.compileShader(fsh);
    if(!gl.getShaderParameter(fsh,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(fsh));return;}
    betaProgram=gl.createProgram();gl.attachShader(betaProgram,vsh);gl.attachShader(betaProgram,fsh);gl.linkProgram(betaProgram);
    betaQuadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,betaQuadBuf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    betaUTime=gl.getUniformLocation(betaProgram,'u_time');betaURes=gl.getUniformLocation(betaProgram,'u_res');
    betaUSpeed=gl.getUniformLocation(betaProgram,'u_speed');betaUTwist=gl.getUniformLocation(betaProgram,'u_twist');
    betaUZoom=gl.getUniformLocation(betaProgram,'u_zoom');betaUBright=gl.getUniformLocation(betaProgram,'u_bright');
    betaUTouch=gl.getUniformLocation(betaProgram,'u_touch');betaUTouchOn=gl.getUniformLocation(betaProgram,'u_touchOn');
    betaUBass=gl.getUniformLocation(betaProgram,'u_bass');betaUEnergy=gl.getUniformLocation(betaProgram,'u_energy');
    betaUC1=gl.getUniformLocation(betaProgram,'u_c1');betaUC2=gl.getUniformLocation(betaProgram,'u_c2');betaUC3=gl.getUniformLocation(betaProgram,'u_c3');
    var betaUSize=gl.getUniformLocation(betaProgram,'u_size');var betaUDensity=gl.getUniformLocation(betaProgram,'u_density');var betaUPulse=gl.getUniformLocation(betaProgram,'u_pulse');
    betaReady=true;
    // compile crystal shader
    const fsh2=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fsh2,crystalFragSrc);gl.compileShader(fsh2);
    if(gl.getShaderParameter(fsh2,gl.COMPILE_STATUS)){
        crystalProgram=gl.createProgram();gl.attachShader(crystalProgram,vsh);gl.attachShader(crystalProgram,fsh2);gl.linkProgram(crystalProgram);
        crystalReady=true;
    }else{console.error('Crystal shader:',gl.getShaderInfoLog(fsh2));}
    // compile streams shader
    const fsh3=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fsh3,streamsFragSrc);gl.compileShader(fsh3);
    if(gl.getShaderParameter(fsh3,gl.COMPILE_STATUS)){
        const vsh3=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vsh3,vs);gl.compileShader(vsh3);
        streamsProgram=gl.createProgram();gl.attachShader(streamsProgram,vsh3);gl.attachShader(streamsProgram,fsh3);gl.linkProgram(streamsProgram);
        streamsReady=true;
    }else{console.error('Streams shader:',gl.getShaderInfoLog(fsh3));}
}
function renderBetaVisual(dt){
    if(!betaReady){initBetaVisual();if(!betaReady)return;}
    if(musicPlaying)analyzeMusic();decayBeatBands(dt);
    if(transitionProgress<1){transitionProgress=Math.min(1,transitionProgress+dt*3);if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(targetStops));}
    const t=time*0.001;
    // palette colors
    const ns=normalizeStops(currentStops);
    const c1=getPaletteColorCPU(0.15,ns),c2=getPaletteColorCPU(0.5,ns),c3=getPaletteColorCPU(0.85,ns);
    // touch
    const tx=mouseDown?(mousePos.x/W*2-1):touchPoints.length>0?(touchPoints[0].x/W*2-1):0;
    const ty=mouseDown?-(mousePos.y/H*2-1):touchPoints.length>0?-(touchPoints[0].y/H*2-1):0;
    const touchOn=(mouseDown||touchPoints.length>0)?1:0;
    const prog=betaPattern===2&&streamsReady?streamsProgram:betaPattern===1&&crystalReady?crystalProgram:betaProgram;
    gl.useProgram(prog);
    const uT=gl.getUniformLocation(prog,'u_time'),uR=gl.getUniformLocation(prog,'u_res');
    const uSp=gl.getUniformLocation(prog,'u_speed'),uTw=gl.getUniformLocation(prog,'u_twist');
    const uZm=gl.getUniformLocation(prog,'u_zoom'),uBr=gl.getUniformLocation(prog,'u_bright');
    const uTc=gl.getUniformLocation(prog,'u_touch'),uTo=gl.getUniformLocation(prog,'u_touchOn');
    const uBs=gl.getUniformLocation(prog,'u_bass'),uEn=gl.getUniformLocation(prog,'u_energy');
    const uC1=gl.getUniformLocation(prog,'u_c1'),uC2=gl.getUniformLocation(prog,'u_c2'),uC3=gl.getUniformLocation(prog,'u_c3');
    const uSz=gl.getUniformLocation(prog,'u_size'),uDn=gl.getUniformLocation(prog,'u_density'),uPl=gl.getUniformLocation(prog,'u_pulse');
    gl.uniform1f(uT,t);gl.uniform2f(uR,W,H);
    gl.uniform1f(uSp,betaPattern===1?betaRotX:betaSpeed);gl.uniform1f(uTw,betaPattern===1?betaRotY:betaTwist);
    gl.uniform1f(uZm,betaZoom);gl.uniform1f(uBr,betaBright);
    gl.uniform1f(uSz,betaSize);gl.uniform1f(uDn,betaDensity);gl.uniform1f(uPl,betaPulse);
    gl.uniform2f(uTc,tx,ty);gl.uniform1f(uTo,touchOn);
    gl.uniform1f(uBs,musicBands.bass||0);gl.uniform1f(uEn,musicBands.energy||0);
    gl.uniform3f(uC1,c1[0]/255,c1[1]/255,c1[2]/255);
    gl.uniform3f(uC2,c2[0]/255,c2[1]/255,c2[2]/255);
    gl.uniform3f(uC3,c3[0]/255,c3[1]/255,c3[2]/255);
    gl.disable(gl.BLEND);gl.bindBuffer(gl.ARRAY_BUFFER,betaQuadBuf);
    const ap=gl.getAttribLocation(betaProgram,'a_pos');
    gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
}
