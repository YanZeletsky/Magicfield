// 🌿 scene3d.js — трёхмерный мир Soundfield
// Three.js сцена: куб из частиц, вихрь, калейдоскоп, мандала
// Здесь частицы обретают глубину и объём
let zoomMode3D=false;

function rebuild3DParticles(){if(!threeReady)return;const pps=Math.floor(cubeSize3D/particleGap3D);total3D=pps*pps*pps;
homePositions3D=new Float32Array(total3D*3);positions3D=new Float32Array(total3D*3);velocities3D=new Float32Array(total3D*3);colors3D=new Float32Array(total3D*3);
const half=cubeSize3D/2,off=-half+particleGap3D/2;let idx=0;
for(let ix=0;ix<pps;ix++)for(let iy=0;iy<pps;iy++)for(let iz=0;iz<pps;iz++){const x=off+ix*particleGap3D,y=off+iy*particleGap3D,z=off+iz*particleGap3D;const i3=idx*3;homePositions3D[i3]=x;homePositions3D[i3+1]=y;homePositions3D[i3+2]=z;positions3D[i3]=x;positions3D[i3+1]=y;positions3D[i3+2]=z;idx++;}
update3DColors();geometry3D.setAttribute('position',new THREE.BufferAttribute(positions3D,3));geometry3D.setAttribute('color',new THREE.BufferAttribute(colors3D,3));}
function applyMandalaConstraint3D(){
    if(mandalaSubMode3D===2)return;// голограмма — без ограничений
    if(mandalaSubMode3D===0&&mandalaMap&&flowerData){// Калейдоскоп — сферическое ограничение + зеркало
        const petalAmp=mandalaPetals3D*0.4;
        // 1. мастера: проецируем на сферу с лепестками
        for(let i=0;i<total3D;i++){if(mandalaMap[i]!==i)continue;
            const i3=i*3,R0=flowerData[i3];
            const px=positions3D[i3],py=positions3D[i3+1],pz=positions3D[i3+2];
            const curR=Math.sqrt(px*px+py*py+pz*pz)||0.01;
            const phi=Math.atan2(pz,px);
            const theta=Math.acos(Math.max(-1,Math.min(1,py/curR)));
            const modR=R0*(1+petalAmp*Math.cos(mandalaRays3D*phi));
            const sinT=Math.sin(theta);
            positions3D[i3]=Math.cos(phi)*sinT*modR;
            positions3D[i3+1]=Math.cos(theta)*modR;
            positions3D[i3+2]=Math.sin(phi)*sinT*modR;
            const nx=positions3D[i3]/modR,ny=positions3D[i3+1]/modR,nz=positions3D[i3+2]/modR;
            const vn=velocities3D[i3]*nx+velocities3D[i3+1]*ny+velocities3D[i3+2]*nz;
            velocities3D[i3]-=vn*nx;velocities3D[i3+1]-=vn*ny;velocities3D[i3+2]-=vn*nz;
        }
        // 2. копии: угловое смещение мастера на сфере
        for(let i=0;i<total3D;i++){const mi=mandalaMap[i];if(mi===i)continue;
            const mi3=mi*3,i3=i*3;
            const mr=Math.sqrt(homePositions3D[mi3]**2+homePositions3D[mi3+2]**2);
            const mdy=positions3D[mi3+1]-homePositions3D[mi3+1];
            if(mr>0.01){
                const cosM=homePositions3D[mi3]/mr,sinM=homePositions3D[mi3+2]/mr;
                const mdx=positions3D[mi3]-homePositions3D[mi3],mdz=positions3D[mi3+2]-homePositions3D[mi3+2];
                const dr=mdx*cosM+mdz*sinM;
                let dt=-mdx*sinM+mdz*cosM;
                if(mandalaMirror[i])dt=-dt;
                const myR=Math.sqrt(homePositions3D[i3]**2+homePositions3D[i3+2]**2);
                if(myR>0.01){
                    const cosI=homePositions3D[i3]/myR,sinI=homePositions3D[i3+2]/myR;
                    positions3D[i3]=homePositions3D[i3]+dr*cosI-dt*sinI;
                    positions3D[i3+2]=homePositions3D[i3+2]+dr*sinI+dt*cosI;
                }
            }
            positions3D[i3+1]=homePositions3D[i3+1]+mdy;
            velocities3D[i3]=0;velocities3D[i3+1]=0;velocities3D[i3+2]=0;
        }
    }else if(mandalaSubMode3D===1){// Сфера — скольжение по оболочке
        for(let i=0;i<total3D;i++){const i3=i*3;
            const hR=Math.sqrt(homePositions3D[i3]**2+homePositions3D[i3+1]**2+homePositions3D[i3+2]**2);if(hR<0.01)continue;
            const curR=Math.sqrt(positions3D[i3]**2+positions3D[i3+1]**2+positions3D[i3+2]**2)||0.01;
            const sc=hR/curR;positions3D[i3]*=sc;positions3D[i3+1]*=sc;positions3D[i3+2]*=sc;
            const nx=positions3D[i3]/hR,ny=positions3D[i3+1]/hR,nz=positions3D[i3+2]/hR;
            const vn=velocities3D[i3]*nx+velocities3D[i3+1]*ny+velocities3D[i3+2]*nz;
            velocities3D[i3]-=vn*nx;velocities3D[i3+1]-=vn*ny;velocities3D[i3+2]-=vn*nz;}
    }
}
function rebuildMandalaHome(sub){
    if(!homePositions3D||!threeReady)return;
    if(sub===2)return;// голограмма = куб
    const h=cubeSize3D/2,rays=mandalaRays3D,rings=mandalaRings3D;
    let idx=0;
    if(sub===0){// Калейдоскоп — сферические оболочки Fibonacci + лепестки + зеркало
        const sa=Math.PI*2/rays,maxR=h*0.85;
        const petalAmp=mandalaPetals3D*0.4;
        const goldenA=Math.PI*(3-Math.sqrt(5));
        const ptsPerMaster=Math.floor(total3D/rays);
        const ptsPerShell=Math.max(4,Math.floor(ptsPerMaster/rings));
        flowerData=new Float32Array(total3D*3);
        mandalaMap=new Int32Array(total3D);mandalaMirror=new Uint8Array(total3D);
        const masterPts=[];
        for(let si=1;si<=rings;si++){
            const R0=si*maxR/rings;
            const totalSph=ptsPerShell*rays;
            let placed=0;
            for(let fi=0;fi<totalSph&&placed<ptsPerShell;fi++){
                const y2=1-2*fi/(totalSph-1);
                const radY=Math.sqrt(Math.max(0,1-y2*y2));
                const phi=((fi*goldenA)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
                if(phi>sa&&phi<Math.PI*2-0.01)continue;
                const modR=R0*(1+petalAmp*Math.cos(rays*phi));
                masterPts.push({x:Math.cos(phi)*radY*modR,y:y2*modR,z:Math.sin(phi)*radY*modR,R0});
                placed++;
            }
        }
        for(let mi=0;mi<masterPts.length&&idx<total3D;mi++){
            const mp=masterPts[mi];
            const flatR=Math.sqrt(mp.x*mp.x+mp.z*mp.z);
            const baseA=Math.atan2(mp.z,mp.x);
            const masterIdx=idx;
            for(let k=0;k<rays&&idx<total3D;k++){
                const mirror=k%2===1;
                const relA=((baseA%sa)+sa)%sa;
                const a=k*sa+(mirror?sa-relA:relA);
                const i3=idx*3;
                homePositions3D[i3]=Math.cos(a)*flatR;homePositions3D[i3+1]=mp.y;homePositions3D[i3+2]=Math.sin(a)*flatR;
                flowerData[i3]=mp.R0;
                mandalaMap[idx]=masterIdx;mandalaMirror[idx]=mirror?1:0;
                idx++;
            }
        }
    }else if(sub===1){// Сфера — вложенные сферы с меридианами
        const shells=Math.max(2,rings);
        const ptsPerShell=Math.floor(total3D/shells);
        for(let s=1;s<=shells;s++){
            const R=s*h*0.85/shells;
            const latLines=Math.max(4,Math.round(Math.sqrt(ptsPerShell*0.5)));
            let placed=0;const n=s===shells?total3D-idx:ptsPerShell;
            for(let lat=0;lat<latLines&&placed<n&&idx<total3D;lat++){
                const theta=Math.PI*(lat+0.5)/latLines;
                const ringR=Math.sin(theta)*R,y=Math.cos(theta)*R;
                const lonPts=Math.max(rays,Math.round(ringR/R*latLines*1.5));
                for(let p=0;p<lonPts&&placed<n&&idx<total3D;p++){
                    const phi=p*Math.PI*2/lonPts;
                    const i3=idx*3;homePositions3D[i3]=Math.cos(phi)*ringR;homePositions3D[i3+1]=y;homePositions3D[i3+2]=Math.sin(phi)*ringR;idx++;placed++;
                }
            }
        }
    }
    while(idx<total3D){const i3=idx*3;homePositions3D[i3]=0;homePositions3D[i3+1]=0;homePositions3D[i3+2]=0;idx++;}
    for(let i=0;i<total3D*3;i++){positions3D[i]=homePositions3D[i];velocities3D[i]=0;}
    update3DColors();if(geometry3D){geometry3D.attributes.position.needsUpdate=true;geometry3D.attributes.color.needsUpdate=true;}
}

// ====== TEST MODE — Three.js 3D Cube (lazy loaded) ======
let threeReady=false,threeLoading=false,scene3D,camera3D,renderer3D,controls3D;
let points3DMesh,geometry3D,positions3D,homePositions3D,velocities3D,colors3D;
let stars3D,total3D=0,cubeSize3D=6;
let vortexForce3D=0.15,vortexSpin3D=0.3,homeDamping3D=0.04,velDamping3D=0.92,maxSpeed3D=0.8,particleSize3D=0.04,brightness3D=1.5,particleGap3D=0.15;
let testMode3D='vortex',mandalaSubMode3D=0,flowerData=null,flowerBaseR=0,mandalaMap=null,mandalaMirror=null,mandalaRays3D=8,mandalaRings3D=4,mandalaRot3D=0.3,mandalaPetals3D=0.5;
let raycaster3D,mouse3D,interactionPlane3D,intersect3D;

function loadThreeJS(callback){
    if(typeof THREE!=='undefined'){callback();return;}
    if(threeLoading)return;
    threeLoading=true;
    const el=document.getElementById('threeLoading');if(el)el.style.display='block';
    function onFail(){
        threeLoading=false;if(el)el.style.display='none';
        showLockToast('3D недоступен — проверьте интернет');
        const btn2d=document.querySelector('.scene-btn[data-scene="2d"]');if(btn2d)btn2d.click();
        document.querySelectorAll('.scene-btn[data-scene="3d"]').forEach(function(b){b.classList.add('locked');});
    }
    const s1=document.createElement('script');
    s1.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s1.onload=function(){
        const s2=document.createElement('script');
        s2.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        s2.onload=function(){threeLoading=false;if(el)el.style.display='none';callback();};
        s2.onerror=onFail;
        document.head.appendChild(s2);
    };
    s1.onerror=onFail;
    document.head.appendChild(s1);
}
function createGlowTex(){
    const s=64,c=document.createElement('canvas');c.width=s;c.height=s;
    const x=c.getContext('2d'),g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.1,'rgba(255,255,255,0.9)');
    g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(0.6,'rgba(255,255,255,0.15)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g;x.fillRect(0,0,s,s);
    const t=new THREE.CanvasTexture(c);t.needsUpdate=true;return t;
}
function init3DScene(){
    if(threeReady)return;
    raycaster3D=new THREE.Raycaster();mouse3D=new THREE.Vector2();
    interactionPlane3D=new THREE.Plane(new THREE.Vector3(0,0,1),0);intersect3D=new THREE.Vector3();
    const cv=document.getElementById('threeCanvas');
    scene3D=new THREE.Scene();
    camera3D=new THREE.PerspectiveCamera(60,W/H,0.1,50);
    camera3D.position.set(7,5,10);camera3D.lookAt(0,0,0);
    renderer3D=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
    renderer3D.setSize(W,H);renderer3D.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer3D.setClearColor(0x000000,1);
    // 🌿 LEFT mouse → частицы (ПЕРЕД OrbitControls — порядок регистрации решает всё)
    cv.addEventListener('pointerdown',function(e){
        if(e.pointerType!=='touch'&&e.button===0){mouseDown=true;mousePos.x=e.clientX;mousePos.y=e.clientY;e.stopImmediatePropagation();}
    });
    cv.addEventListener('pointerup',function(e){
        if(e.pointerType!=='touch'&&e.button===0){mouseDown=false;e.stopImmediatePropagation();}
    });
    // 🌿 TOUCH: один палец → частицы, два → камера (OrbitControls)
    let _touch3dCount=0;
    cv.addEventListener('touchstart',function(e){
        _touch3dCount=e.touches.length;
        if(_touch3dCount===1){mouseDown=true;mousePos.x=e.touches[0].clientX;mousePos.y=e.touches[0].clientY;e.stopImmediatePropagation();}
    },{passive:false});
    cv.addEventListener('touchmove',function(e){
        if(_touch3dCount===1&&e.touches.length===1){mousePos.x=e.touches[0].clientX;mousePos.y=e.touches[0].clientY;e.preventDefault();}
    },{passive:false});
    cv.addEventListener('touchend',function(e){
        if(e.touches.length===0){mouseDown=false;_touch3dCount=0;}
        else{_touch3dCount=e.touches.length;}
    });
    controls3D=new THREE.OrbitControls(camera3D,cv);
    controls3D.enableDamping=true;controls3D.dampingFactor=0.08;
    controls3D.autoRotate=true;controls3D.autoRotateSpeed=0.3;
    controls3D.minDistance=2;controls3D.maxDistance=20;controls3D.target.set(0,0,0);
    controls3D.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};
    controls3D.touches={ONE:null,TWO:THREE.TOUCH.DOLLY_ROTATE};
    const pps=Math.floor(cubeSize3D/particleGap3D);total3D=pps*pps*pps;
    homePositions3D=new Float32Array(total3D*3);positions3D=new Float32Array(total3D*3);
    velocities3D=new Float32Array(total3D*3);colors3D=new Float32Array(total3D*3);
    const half=cubeSize3D/2,off=-half+particleGap3D/2;
    let idx=0;
    for(let ix=0;ix<pps;ix++)for(let iy=0;iy<pps;iy++)for(let iz=0;iz<pps;iz++){
        const x=off+ix*particleGap3D,y=off+iy*particleGap3D,z=off+iz*particleGap3D;
        const i3=idx*3;homePositions3D[i3]=x;homePositions3D[i3+1]=y;homePositions3D[i3+2]=z;
        positions3D[i3]=x;positions3D[i3+1]=y;positions3D[i3+2]=z;idx++;
    }
    update3DColors();
    geometry3D=new THREE.BufferGeometry();
    geometry3D.setAttribute('position',new THREE.BufferAttribute(positions3D,3));
    geometry3D.setAttribute('color',new THREE.BufferAttribute(colors3D,3));
    const mat=new THREE.PointsMaterial({size:0.04,map:createGlowTex(),vertexColors:true,
        blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,transparent:true,opacity:1.5});
    points3DMesh=new THREE.Points(geometry3D,mat);scene3D.add(points3DMesh);
    const eg=new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize3D,cubeSize3D,cubeSize3D));
    scene3D.add(new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:0x446688,transparent:true,opacity:0.3})));
    const sg=new THREE.BufferGeometry(),sp=new Float32Array(500*3);
    for(let i=0;i<1500;i++)sp[i]=(Math.random()-0.5)*30;
    sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
    stars3D=new THREE.Points(sg,new THREE.PointsMaterial({size:0.03,color:0xffffff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.5}));
    scene3D.add(stars3D);
    // 🌿 pointermove — обновляем позицию мыши для частиц
    cv.addEventListener('pointermove',e=>{
        if(e.pointerType!=='touch'){mousePos.x=e.clientX;mousePos.y=e.clientY;
            if(cursorEl){cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';}}
    },true);
    // 🌿 touch — и вращение (OrbitControls через pointer events), и частицы
    cv.addEventListener('touchstart',function(e){
        e.preventDefault();e.stopPropagation();
        if(!zoomMode3D){touchPoints=[];for(var i=0;i<e.touches.length;i++)touchPoints.push({x:e.touches[i].clientX,y:e.touches[i].clientY});}
    },{passive:false,capture:true});
    cv.addEventListener('touchmove',function(e){
        e.preventDefault();e.stopPropagation();
        if(!zoomMode3D){touchPoints=[];for(var i=0;i<e.touches.length;i++)touchPoints.push({x:e.touches[i].clientX,y:e.touches[i].clientY});}
    },{passive:false,capture:true});
    cv.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();touchPoints=[];},{passive:false,capture:true});
    threeReady=true;
    initRotateButton();
}
// 🌿 лупа — переключает тач между обычным режимом и зумом
function toggleZoom3D(){
    if(!controls3D)return;
    zoomMode3D=!zoomMode3D;
    controls3D.enableRotate=!zoomMode3D;
    if(zoomMode3D)touchPoints=[];
    const btn=document.getElementById('zoomBtn3D');
    if(btn)btn.classList.toggle('active',zoomMode3D);
}
// 🔄 ручное вращение камеры через кнопку (мобилка)
let rotateDrag3D=false,rotLastX3D=0,rotLastY3D=0;
function initRotateButton(){
    const btn=document.getElementById('rotateBtn3D');
    if(!btn)return;
    btn.addEventListener('touchstart',function(e){
        e.preventDefault();e.stopPropagation();
        rotateDrag3D=true;rotLastX3D=e.touches[0].clientX;rotLastY3D=e.touches[0].clientY;
    },{passive:false});
    document.addEventListener('touchmove',function(e){
        if(!rotateDrag3D||!threeReady||!camera3D||!controls3D)return;
        const tx=e.touches[0].clientX,ty=e.touches[0].clientY;
        const dx=tx-rotLastX3D,dy=ty-rotLastY3D;
        rotLastX3D=tx;rotLastY3D=ty;
        // 🌿 сферические координаты — камера вращается вокруг центра
        const offset=camera3D.position.clone().sub(controls3D.target);
        const r=offset.length();
        let theta=Math.atan2(offset.x,offset.z);
        let phi=Math.acos(Math.max(-1,Math.min(1,offset.y/r)));
        theta-=dx*0.008;
        phi=Math.max(0.15,Math.min(Math.PI-0.15,phi+dy*0.008));
        offset.x=r*Math.sin(phi)*Math.sin(theta);
        offset.y=r*Math.cos(phi);
        offset.z=r*Math.sin(phi)*Math.cos(theta);
        camera3D.position.copy(controls3D.target).add(offset);
        camera3D.lookAt(controls3D.target);
    },{passive:true});
    document.addEventListener('touchend',function(){rotateDrag3D=false;});
    document.addEventListener('touchcancel',function(){rotateDrag3D=false;});
}
function update3DColors(){
    if(!colors3D||!homePositions3D)return;
    const half=cubeSize3D/2,maxD=Math.sqrt(3)*half;
    const as=transitionProgress>=1?currentStops:lerpStops(currentStops,targetStops,transitionProgress);
    const ns=normalizeStops(as);
    for(let i=0;i<total3D;i++){
        const i3=i*3,x=homePositions3D[i3],y=homePositions3D[i3+1],z=homePositions3D[i3+2];
        const dist=Math.sqrt(x*x+y*y+z*z);
        const proj=maxD>0?(x*0.577+y*0.577+z*0.577)/maxD:0;
        const dr=maxD>0?dist/maxD:0;
        const t=1/(1+Math.exp(-(2+dr*4)*proj));
        const c=getPaletteColorCPU(t,ns);
        colors3D[i3]=c[0]/255;colors3D[i3+1]=c[1]/255;colors3D[i3+2]=c[2]/255;
    }
    if(geometry3D)geometry3D.attributes.color.needsUpdate=true;
}
function screenToWorld3D(sx,sy){
    if(!raycaster3D)return{x:0,y:0,z:0};
    mouse3D.x=(sx/W)*2-1;mouse3D.y=-(sy/H)*2+1;
    raycaster3D.setFromCamera(mouse3D,camera3D);
    raycaster3D.ray.intersectPlane(interactionPlane3D,intersect3D);
    return intersect3D?{x:intersect3D.x,y:intersect3D.y,z:intersect3D.z}:{x:0,y:0,z:0};
}
function getVortexForce3D(px,py,pz,pts){
    let fx=0,fy=0,fz=0;const f=vortexForce3D,sp=vortexSpin3D*spinDirection;
    for(let p=0;p<pts.length;p++){
        const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        if(dist<0.5){fx+=nx*5*str*f;fy+=ny*5*str*f;fz+=nz*5*str*f;continue;}
        const a=1.5/(dist+0.5)*str*f;
        fx+=nx*a;fy+=ny*a;fz+=nz*a;
        fx+=(-nz)*a*sp;fz+=nx*a*sp;fx+=ny*a*sp*0.3;fy+=(-nx)*a*sp*0.3;
    }
    return{fx,fy,fz};
}
// 🌿 3D-силы — масштабированы по образцу вихря (vortexForce3D ≈ 0.15)
const manualModes3D=['vortex','turbulence','electrostatic','wave','pulsar','swarm'];
const autoModes3D=['fibonacci','lorenz','mycelium','breathing','galaxy','blackhole','neural','crystal','meteor','nebula'];

function getTurbulenceForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.turbulence,inten=mp.intensity||1,ns=mp.noiseScale||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        const n1=Math.sin(px*ns+t*2)*Math.cos(py*ns*1.3+t*1.6);
        const n2=Math.sin(py*ns*0.9+t*2.2)*Math.cos(pz*ns+t*1.4);
        const n3=Math.sin(pz*ns*1.1+t*1.8)*Math.cos(px*ns*0.8+t*2.4);
        const a=(1+n1*0.5)*f3d*inten/(dist+0.5)*str;
        fx+=nx*a+(-nz)*n2*a*0.3;fy+=ny*a+nx*n3*a*0.3;fz+=nz*a+ny*n1*a*0.3;}
    return{fx,fy,fz};}

function getElectroForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.electrostatic,ch=mp.charge||1,cr=mp.crystal||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.1)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        const sign=(p%2===0)?1:-1,a=sign*f3d*ch*2/(dist*dist+0.5)*str;
        fx+=nx*a;fy+=ny*a;fz+=nz*a;
        const ang=Math.atan2(dz,dx),cr2=Math.sin(ang*4+dist*0.3)*f3d*cr*0.3/(dist+0.5)*str;
        fx+=(-nz)*cr2;fz+=nx*cr2;fy+=Math.sin(ang*3+t)*f3d*cr*0.2/(dist+0.5)*str;}
    return{fx,fy,fz};}

function getWaveForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.wave,freq=mp.frequency||1,amp=mp.amplitude||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const str=pt.strength||1,a=f3d*amp*2*Math.sin(dist*freq*2-t*3)/(dist+0.5)*str;
        fx+=dx/dist*a;fy+=dy/dist*a;fz+=dz/dist*a;}
    return{fx,fy,fz};}

function getPulsarForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.pulsar,ps=mp.pulseSpeed||1,tg=mp.tangent||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        const w=Math.sin(dist*0.8-t*ps*4),a=w*f3d*1.5/(dist+0.4)*str;
        fx+=nx*a;fy+=ny*a;fz+=nz*a;
        const tga=f3d*tg*0.3/(dist+0.5)*str;
        fx+=(-nz)*tga;fz+=nx*tga;fy+=Math.sin(t*ps*2+dist)*ny*tga*0.5;}
    return{fx,fy,fz};}

function getSwarmForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.swarm,coh=mp.cohesion||1,sep=mp.separation||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        const cohF=f3d*coh*1.5/(dist+0.5);
        const sepF=dist<1.5?-f3d*sep*3/(dist*dist+0.3):0;
        const ali=Math.sin(t*2+dist*3)*f3d*0.3;
        const a=(cohF+sepF+ali)*str;
        fx+=nx*a;fy+=ny*a;fz+=nz*a;}
    return{fx,fy,fz};}

function getFibonacciForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.fibonacci,tight=mp.spiralTight||1,mf=mp.force||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        const sa=Math.log(dist+1)*1.618*2.4*tight,a=f3d*mf*1.5/(dist+0.3)*str;
        const ca=Math.cos(sa),sna=Math.sin(sa);
        fx+=(nx*ca-nz*sna)*a;fz+=(nx*sna+nz*ca)*a;fy+=ny*a*0.5+Math.sin(sa+t)*a*0.2;}
    return{fx,fy,fz};}

function getLorenzForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.lorenz,spd=mp.speed||1,mf=mp.force||1,f3d=vortexForce3D;
    // Лоренц — бабочка, рождённая для трёх измерений
    const sigma=10,rho=28,beta=8/3,scale=0.3;
    const lx=px*scale,ly=py*scale,lz=pz*scale+25;
    const dxl=sigma*(ly-lx)*spd,dyl=(lx*(rho-lz)-ly)*spd,dzl=(lx*ly-beta*lz)*spd;
    const len=Math.sqrt(dxl*dxl+dyl*dyl+dzl*dzl)+0.01;
    fx+=dxl/len*f3d*mf;fy+=dyl/len*f3d*mf;fz+=dzl/len*f3d*mf;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const str=pt.strength||1,a=f3d*mf/(dist+0.3)*str;
        fx+=dx/dist*a;fy+=dy/dist*a;fz+=dz/dist*a;}
    return{fx,fy,fz};}

function getMyceliumForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.mycelium,gr=mp.growth||1,br=mp.branching||1,f3d=vortexForce3D;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const nx=dx/dist,ny=dy/dist,nz=dz/dist,str=pt.strength||1;
        const pulse=Math.sin(t*2*gr+dist*0.5)*0.5+0.5;
        const a=f3d*gr*1.5/(dist+0.3)*(0.6+pulse*0.4)*str;
        fx+=nx*a;fy+=ny*a;fz+=nz*a;
        const ang=Math.atan2(dz,dx),bf=Math.sin(ang*3*br+t*2)*f3d*br*0.3/(dist+0.3)*str;
        fx+=(-nz)*bf;fz+=nx*bf;fy+=Math.sin(ang*2*br+t*1.5)*f3d*br*0.2/(dist+0.3)*str;}
    return{fx,fy,fz};}

function getBreathingForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.breathing,bs=mp.breathSpeed||1,dp=mp.depth||1,f3d=vortexForce3D;
    const br=Math.sin(t*bs*2)*0.5+0.5;
    for(let p=0;p<pts.length;p++){const pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        const str=pt.strength||1,a=f3d*dp*br*2/(dist+0.3)*str;
        fx+=dx/dist*a;fy+=dy/dist*a;fz+=dz/dist*a;}
    return{fx,fy,fz};}

// 🌌 Галактика — спиральные рукава из звёздной пыли
function getGalaxyForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.galaxy,f3d=vortexForce3D;
    const arms=Math.round(mp.arms||3),spin=mp.spin||1,flat=mp.flatness||1;
    const r=Math.sqrt(px*px+pz*pz)+0.001,angle=Math.atan2(pz,px);
    // 🌌 сжатие в диск
    fy-=py*f3d*flat*0.4;
    // 🌌 чёрная дыра: притяжение издалека + барьер вблизи → вечная спираль
    const pull=-f3d*0.25/(r+0.2);
    const barrier=f3d*0.008/(r*r*r+0.001);
    const radial=pull+barrier;
    fx+=(px/r)*radial;fz+=(pz/r)*radial;
    // 🌌 орбитальное вращение — закрутка вокруг центра
    const orb=f3d*spin*0.15/(r*0.4+0.3);
    fx+=(-pz/r)*orb;fz+=(px/r)*orb;
    // 🌌 спиральные рукава
    const spiralA=angle-Math.log(r+0.3)*1.8+t*spin*0.3;
    const armS=Math.cos(spiralA*arms)*0.5+0.5;
    const radF=f3d*armS*0.03/(r+0.4);
    fx+=(px/r)*radF;fz+=(pz/r)*radF;
    // тач — возмущение рукавов
    for(var p=0;p<pts.length;p++){var pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        var dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        var str=pt.strength||1,a=f3d*str*0.12/(dist+0.5);
        fx+=dx/dist*a;fy+=dy/dist*a;fz+=dz/dist*a;}
    return{fx,fy,fz};}

// 🌌 Чёрная дыра — аккреционный диск, джеты, горизонт событий
function getBlackholeForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.blackhole,f3d=vortexForce3D;
    const flat=mp.diskFlat||1.5,jet=mp.jet||1,spin=mp.spin||1.2;
    const r=Math.sqrt(px*px+pz*pz)+0.001;
    const dist3d=Math.sqrt(px*px+py*py+pz*pz)+0.001;
    // 🌌 притяжение к центру — гравитация чёрной дыры
    const pull=-f3d*0.3/(dist3d*0.3+0.15);
    // 🌌 барьер — горизонт событий, не пускает внутрь
    const barrier=f3d*0.012/(dist3d*dist3d*dist3d+0.002);
    const radial=pull+barrier;
    fx+=(px/dist3d)*radial;fy+=(py/dist3d)*radial;fz+=(pz/dist3d)*radial;
    // 🌌 сжатие в диск — плоскость XZ
    fy-=py*f3d*flat*0.5;
    // 🌌 орбитальное вращение в плоскости XZ
    if(r>0.05){
        const orb=f3d*spin*0.2/(r*0.4+0.3);
        fx+=(-pz/r)*orb;fz+=(px/r)*orb;
    }
    // 🌌 джеты — частицы вблизи оси Y выстреливаются вверх/вниз
    if(r<1.2&&jet>0){
        const axisDist=r; // расстояние от оси Y
        const jetStrength=f3d*jet*0.15*Math.exp(-axisDist*2);
        const dir=py>0?1:-1; // вверх если выше центра, вниз если ниже
        fy+=dir*jetStrength;
        // лёгкое отталкивание от оси — джет расширяется
        if(r>0.05){
            fx+=(px/r)*jetStrength*0.15;
            fz+=(pz/r)*jetStrength*0.15;
        }
    }
    // тач — гравитационное возмущение
    for(var p=0;p<pts.length;p++){var pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        var dist=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dist<0.05)continue;
        var str=pt.strength||1,a=f3d*str*0.12/(dist+0.5);
        fx+=dx/dist*a;fy+=dy/dist*a;fz+=dz/dist*a;}
    return{fx,fy,fz};}

// 🧠 Нейросеть — нейроны дрейфуют, связи между ближайшими
function getNeuralForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.neural,f3d=vortexForce3D;
    const dist=Math.sqrt(px*px+py*py+pz*pz)+0.001;
    // 🧠 пружина к центру — удержание в кубе
    fx-=px*f3d*0.06;fy-=py*f3d*0.06;fz-=pz*f3d*0.06;
    // 🧠 органический дрейф — нейроны живут
    fx+=Math.sin(t*0.0004+pz*2+py)*f3d*0.04;
    fy+=Math.cos(t*0.0005+px*2+pz)*f3d*0.04;
    fz+=Math.sin(t*0.0003+py*2+px)*f3d*0.04;
    // тач — импульс
    for(var p=0;p<pts.length;p++){var pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        var dd=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dd<0.05)continue;
        var str=pt.strength||1;
        var imp=-f3d*str*(mp.impulse||1)*0.25/(dd*0.3+0.15);
        fx+=dx/dd*imp;fy+=dy/dd*imp;fz+=dz/dd*imp;}
    return{fx,fy,fz};}

// 💎 Кристалл — частицы стремятся к узлам решётки
function getCrystalForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.crystal,f3d=vortexForce3D;
    const order=mp.order||1,growth=mp.growth||0.8;
    const latticeType=Math.round(mp.lattice||0);
    // 💎 определяем ближайший узел решётки
    const spacing=1.2/growth; // расстояние между узлами
    let snapX,snapY,snapZ;
    if(latticeType===0){ // Куб
        snapX=Math.round(px/spacing)*spacing;
        snapY=Math.round(py/spacing)*spacing;
        snapZ=Math.round(pz/spacing)*spacing;
    }else if(latticeType===1){ // Гекс — гексагональная плотноупакованная
        const row=Math.round(py/(spacing*0.866));
        snapY=row*spacing*0.866;
        const offset=(row%2)*spacing*0.5;
        snapX=Math.round((px-offset)/spacing)*spacing+offset;
        snapZ=Math.round(pz/spacing)*spacing;
    }else{ // Алмаз — две вложенные FCC
        const half=spacing*0.5;
        const ix=Math.round(px/spacing),iy=Math.round(py/spacing),iz=Math.round(pz/spacing);
        snapX=ix*spacing;snapY=iy*spacing;snapZ=iz*spacing;
        // Проверяем ближайший из двух поднешёток
        const altX=snapX+half,altY=snapY+half,altZ=snapZ+half;
        const d1=(px-snapX)*(px-snapX)+(py-snapY)*(py-snapY)+(pz-snapZ)*(pz-snapZ);
        const d2=(px-altX)*(px-altX)+(py-altY)*(py-altY)+(pz-altZ)*(pz-altZ);
        if(d2<d1){snapX=altX;snapY=altY;snapZ=altZ;}
    }
    // 💎 притяжение к узлу решётки — мягкая кристаллизация
    const dx=snapX-px,dy=snapY-py,dz=snapZ-pz;
    const dd=Math.sqrt(dx*dx+dy*dy+dz*dz)+0.001;
    const pullStr=f3d*order*0.06*Math.min(1,dd); // 🌿 плавно, не телепортация
    fx+=dx/dd*pullStr;fy+=dy/dd*pullStr;fz+=dz/dd*pullStr;
    // 💎 удержание в кубе
    const dist=Math.sqrt(px*px+py*py+pz*pz)+0.001;
    if(dist>3.5){const b=f3d*0.1*(dist-3.5);fx-=px/dist*b;fy-=py/dist*b;fz-=pz/dist*b;}
    // тач — разрушение кристалла, отталкивание
    for(var p=0;p<pts.length;p++){var pt=pts[p],tdx=pt.x-px,tdy=pt.y-py,tdz=pt.z-pz;
        var td=Math.sqrt(tdx*tdx+tdy*tdy+tdz*tdz);if(td<0.05)continue;
        var str=pt.strength||1;
        // отталкивание — разбиваем кристалл
        var push=-f3d*str*0.4/(td*0.2+0.2);
        fx+=tdx/td*push;fy+=tdy/td*push;fz+=tdz/td*push;}
    return{fx,fy,fz};}

// ☄️ Звездопад — частицы пронзают пространство по прямым, тач = гравитационная линза
function getMeteorForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.meteor,f3d=vortexForce3D;
    const spd=mp.speed||1.5;
    const dist=Math.sqrt(px*px+py*py+pz*pz)+0.001;
    // ☄️ частицы летят «вниз-влево» (постоянная сила — метеорный поток)
    fx-=f3d*spd*0.08;fy-=f3d*spd*0.12;fz-=f3d*spd*0.04;
    // ☄️ респаун — улетевшие за границу возвращаются с другой стороны
    // (обрабатывается ниже через позиции)
    // ☄️ лёгкий хаос — траектории не идеально параллельные
    fx+=Math.sin(t*0.001+py*3)*f3d*0.015;
    fz+=Math.cos(t*0.001+px*3)*f3d*0.015;
    // тач — гравитационная линза, искривление траекторий
    for(var p=0;p<pts.length;p++){var pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        var dd=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dd<0.05)continue;
        var str=pt.strength||1;
        var pull=f3d*str*(mp.gravity||0.5)*0.3/(dd*0.2+0.15);
        fx+=dx/dd*pull;fy+=dy/dd*pull;fz+=dz/dd*pull;}
    return{fx,fy,fz};}

// 🌫️ Туманность — плотное облако с яркими ядрами, тач рассеивает
function getNebulaForce3D(px,py,pz,pts,t){
    let fx=0,fy=0,fz=0;const mp=modeParams.nebula,f3d=vortexForce3D;
    const dens=mp.density||1,pulse=mp.pulse||0.8,scatter=mp.scatter||1;
    const dist=Math.sqrt(px*px+py*py+pz*pz)+0.001;
    // 🌫️ притяжение к центру — облако удерживается гравитацией
    const pull=-f3d*dens*0.12/(dist*0.3+0.2);
    fx+=px/dist*pull;fy+=py/dist*pull;fz+=pz/dist*pull;
    // 🌫️ дыхание — пульсация расширения-сжатия
    const breath=Math.sin(t*0.0006*pulse)*f3d*0.04*dens;
    fx+=px/dist*breath;fy+=py/dist*breath;fz+=pz/dist*breath;
    // 🌫️ мягкая турбулентность — облако не статично, оно клубится
    fx+=Math.sin(t*0.0003+pz*1.5+py)*f3d*0.025;
    fy+=Math.cos(t*0.0004+px*1.5+pz)*f3d*0.025;
    fz+=Math.sin(t*0.0005+py*1.5+px)*f3d*0.025;
    // тач — рассеяние (отталкивание), обнажает яркие ядра
    for(var p=0;p<pts.length;p++){var pt=pts[p],dx=pt.x-px,dy=pt.y-py,dz=pt.z-pz;
        var dd=Math.sqrt(dx*dx+dy*dy+dz*dz);if(dd<0.05)continue;
        var str=pt.strength||1;
        var push=-f3d*str*scatter*0.35/(dd*0.2+0.15);
        fx+=dx/dd*push;fy+=dy/dd*push;fz+=dz/dd*push;}
    return{fx,fy,fz};}

// 🌿 диспетчер — направляет поток к нужному инструменту
function getForce3D(px,py,pz,pts,mode,t){
    if(mode==='vortex')return getVortexForce3D(px,py,pz,pts);
    if(mode==='turbulence')return getTurbulenceForce3D(px,py,pz,pts,t);
    if(mode==='electrostatic')return getElectroForce3D(px,py,pz,pts,t);
    if(mode==='wave')return getWaveForce3D(px,py,pz,pts,t);
    if(mode==='pulsar')return getPulsarForce3D(px,py,pz,pts,t);
    if(mode==='swarm')return getSwarmForce3D(px,py,pz,pts,t);
    if(mode==='fibonacci')return getFibonacciForce3D(px,py,pz,pts,t);
    if(mode==='lorenz')return getLorenzForce3D(px,py,pz,pts,t);
    if(mode==='mycelium')return getMyceliumForce3D(px,py,pz,pts,t);
    if(mode==='breathing')return getBreathingForce3D(px,py,pz,pts,t);
    if(mode==='galaxy')return getGalaxyForce3D(px,py,pz,pts,t);
    if(mode==='blackhole')return getBlackholeForce3D(px,py,pz,pts,t);
    if(mode==='neural')return getNeuralForce3D(px,py,pz,pts,t);
    if(mode==='crystal')return getCrystalForce3D(px,py,pz,pts,t);
    if(mode==='meteor')return getMeteorForce3D(px,py,pz,pts,t);
    if(mode==='nebula')return getNebulaForce3D(px,py,pz,pts,t);
    if(mode==='mandala')return getMandalaForce3D(px,py,pz,pts,t);
    return getVortexForce3D(px,py,pz,pts);}

function mirrorPoints3D(pts,t3d){
    const out=[];const rays=mandalaRays3D,sa=Math.PI*2/rays;
    const rot=t3d*mandalaRot3D;
    for(let p=0;p<pts.length;p++){
        const pt=pts[p];
        const r=Math.sqrt(pt.x*pt.x+pt.z*pt.z);
        const baseA=Math.atan2(pt.z,pt.x)-rot;
        const relA=((baseA%sa)+sa)%sa;
        for(let k=0;k<rays;k++){
            const a=k*sa+rot+(k%2===1?sa-relA:relA);
            const mx=Math.cos(a)*r,mz=Math.sin(a)*r;
            const petalMod=mandalaPetals3D>0?0.5+0.5*Math.cos(a*3+t3d*0.5):1;
            const str=(pt.strength||1)*petalMod/Math.sqrt(rays);
            out.push({x:mx,y:pt.y,z:mz,strength:str});
            if(mandalaSubMode3D===1){out.push({x:mx,y:-pt.y,z:mz,strength:str});}
        }
    }
    return out;
}
function getMandalaForce3D(px,py,pz,pts,t3d){
    const mirrored=mirrorPoints3D(pts,t3d);
    const f=getVortexForce3D(px,py,pz,mirrored);
    if(mandalaSubMode3D===2){f.fy*=0.15;}
    // кольцевая модуляция
    if(mandalaRings3D>1){
        const r=Math.sqrt(px*px+pz*pz);
        const ringMod=0.6+0.4*Math.cos(r*mandalaRings3D*1.2);
        f.fx*=ringMod;f.fy*=ringMod;f.fz*=ringMod;
    }
    return f;
}
function updateKaleidoPhysics3D(dt){
    const dt60=Math.min(3,dt*60*spinSpeed);
    const t=time*0.001;
    const nRays=mandalaRays3D,petalAmp=mandalaPetals3D*0.4;
    const pts=[];
    if(mouseDown){const wp=screenToWorld3D(mousePos.x,mousePos.y);pts.push(wp);}
    for(let ti=0;ti<touchPoints.length;ti++){pts.push(screenToWorld3D(touchPoints[ti].x,touchPoints[ti].y));}
    if((musicPlaying||beatPlaying)&&musicBands.energy>0.01){
        const e=musicBands.energy;pts.push({x:Math.sin(t)*2,y:Math.cos(t*0.7)*2,z:0,strength:e*2});
        if(musicBands.bass>0.3)pts.push({x:0,y:0,z:0,strength:musicBands.bass*3});
    }
    // мастер-частицы: вращение + дыхание + лепестки + отклик на касание
    for(let i=0;i<total3D;i++){
        if(mandalaMap[i]!==i)continue;
        const i3=i*3,R0=flowerData[i3];
        const hx=homePositions3D[i3],hy=homePositions3D[i3+1],hz=homePositions3D[i3+2];
        const hR=Math.sqrt(hx*hx+hy*hy+hz*hz);if(hR<0.01)continue;
        const homePhi=Math.atan2(hz,hx);
        const homeTheta=Math.acos(Math.max(-1,Math.min(1,hy/hR)));
        const shellIdx=Math.round(R0/(cubeSize3D*0.85/mandalaRings3D));
        const shellRot=mandalaRot3D*(1+0.5*(mandalaRings3D-shellIdx)/Math.max(1,mandalaRings3D));
        // угловая скорость от касания
        let angVel=velocities3D[i3+1]||0;
        for(let p=0;p<pts.length;p++){
            const pt=pts[p];const dx=pt.x-positions3D[i3],dy=pt.y-positions3D[i3+1],dz=pt.z-positions3D[i3+2];
            const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
            if(dist<3){const str=(pt.strength||1)*vortexForce3D/(dist+0.3);
                angVel+=(dx*hz-dz*hx)*str*0.01*dt60;}
        }
        angVel*=velDamping3D;velocities3D[i3+1]=angVel;
        velocities3D[i3]+=(angVel*dt60);
        velocities3D[i3]*=(1-homeDamping3D*dt60);
        const phi=homePhi+t*shellRot*spinDirection+velocities3D[i3];
        const breathR=R0*(1+petalAmp*0.5*Math.sin(t*1.5+shellIdx*1.5));
        const finalR=breathR*(1+petalAmp*Math.cos(nRays*phi));
        const sinT=Math.sin(homeTheta);
        positions3D[i3]=Math.cos(phi)*sinT*finalR;
        positions3D[i3+1]=Math.cos(homeTheta)*finalR;
        positions3D[i3+2]=Math.sin(phi)*sinT*finalR;
    }
    // зеркальные копии
    for(let i=0;i<total3D;i++){const mi=mandalaMap[i];if(mi===i)continue;
        const mi3=mi*3,i3=i*3;
        const mr=Math.sqrt(homePositions3D[mi3]**2+homePositions3D[mi3+2]**2);
        if(mr>0.01){
            const cosM=homePositions3D[mi3]/mr,sinM=homePositions3D[mi3+2]/mr;
            const mdx=positions3D[mi3]-homePositions3D[mi3],mdz=positions3D[mi3+2]-homePositions3D[mi3+2];
            const dr=mdx*cosM+mdz*sinM;let dtg=-mdx*sinM+mdz*cosM;
            if(mandalaMirror[i])dtg=-dtg;
            const myR=Math.sqrt(homePositions3D[i3]**2+homePositions3D[i3+2]**2);
            if(myR>0.01){const cosI=homePositions3D[i3]/myR,sinI=homePositions3D[i3+2]/myR;
                positions3D[i3]=homePositions3D[i3]+dr*cosI-dtg*sinI;
                positions3D[i3+2]=homePositions3D[i3+2]+dr*sinI+dtg*cosI;}
        }
        positions3D[i3+1]=positions3D[mi3+1];
    }
    geometry3D.attributes.position.needsUpdate=true;
}
function updatePhysics3D(dt){
    if(testMode3D==='mandala'&&mandalaSubMode3D===0&&mandalaMap){updateKaleidoPhysics3D(dt);return;}
    const dt60=Math.min(3,dt*60*spinSpeed);
    const t=time*0.001;
    const pts=[];
    if(mouseDown){const wp=screenToWorld3D(mousePos.x,mousePos.y);pts.push({x:wp.x,y:wp.y,z:wp.z,strength:1});}
    for(let ti=0;ti<touchPoints.length;ti++){const wp=screenToWorld3D(touchPoints[ti].x,touchPoints[ti].y);pts.push({x:wp.x,y:wp.y,z:wp.z,strength:1});}
    if((musicPlaying||beatPlaying)&&musicBands.energy>0.01){
        const e=musicBands.energy;
        pts.push({x:Math.sin(t)*2,y:Math.cos(t*0.7)*2,z:0,strength:e*2});
        if(musicBands.bass>0.3)pts.push({x:0,y:0,z:0,strength:musicBands.bass*3});
    }
    const active=pts.length>0||(testMode3D==='galaxy')||(testMode3D==='blackhole')||(testMode3D==='neural')||(testMode3D==='crystal')||(testMode3D==='meteor')||(testMode3D==='nebula');
    for(let i=0;i<total3D;i++){
        const i3=i*3,px=positions3D[i3],py=positions3D[i3+1],pz=positions3D[i3+2];
        if(active){
            const f=testMode3D==='mandala'?getMandalaForce3D(px,py,pz,pts,t):getForce3D(px,py,pz,pts,testMode3D,t);
            velocities3D[i3]=(velocities3D[i3]+f.fx*dt60)*velDamping3D;
            velocities3D[i3+1]=(velocities3D[i3+1]+f.fy*dt60)*velDamping3D;
            velocities3D[i3+2]=(velocities3D[i3+2]+f.fz*dt60)*velDamping3D;
            const sp=Math.sqrt(velocities3D[i3]**2+velocities3D[i3+1]**2+velocities3D[i3+2]**2);
            if(sp>maxSpeed3D){const sc=maxSpeed3D/sp;velocities3D[i3]*=sc;velocities3D[i3+1]*=sc;velocities3D[i3+2]*=sc;}
            positions3D[i3]+=velocities3D[i3]*dt60;positions3D[i3+1]+=velocities3D[i3+1]*dt60;positions3D[i3+2]+=velocities3D[i3+2]*dt60;
            // ☄️ Звездопад — респаун улетевших частиц
            if(testMode3D==='meteor'){
                const bound=4;
                if(positions3D[i3]<-bound||positions3D[i3+1]<-bound||positions3D[i3+2]<-bound){
                    positions3D[i3]=(Math.random()-0.3)*bound*2;
                    positions3D[i3+1]=bound*(0.5+Math.random()*0.5);
                    positions3D[i3+2]=(Math.random()-0.5)*bound;
                    velocities3D[i3]=0;velocities3D[i3+1]=0;velocities3D[i3+2]=0;
                }
            }
        }else{
            const dx=homePositions3D[i3]-px,dy=homePositions3D[i3+1]-py,dz=homePositions3D[i3+2]-pz;
            const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
            if(d<0.01){positions3D[i3]=homePositions3D[i3];positions3D[i3+1]=homePositions3D[i3+1];positions3D[i3+2]=homePositions3D[i3+2];velocities3D[i3]=0;velocities3D[i3+1]=0;velocities3D[i3+2]=0;}
            else{const lf=homeDamping3D*dt60;positions3D[i3]+=dx*lf;positions3D[i3+1]+=dy*lf;positions3D[i3+2]+=dz*lf;velocities3D[i3]=dx*lf;velocities3D[i3+1]=dy*lf;velocities3D[i3+2]=dz*lf;}
        }
    }
    if(testMode3D==='mandala'&&mandalaSubMode3D===1)applyMandalaConstraint3D();
    if(testMode3D==='mandala'&&mandalaSubMode3D===2){for(let i=0;i<total3D;i++){const i3=i*3;const r=Math.sqrt(positions3D[i3]**2+positions3D[i3+2]**2);positions3D[i3+1]=homePositions3D[i3+1]+Math.sin(r*2+t)*0.3*Math.cos(t*0.7);}}
    geometry3D.attributes.position.needsUpdate=true;
}
function render3DScene(dt){
    if(!threeReady)return;
    if(musicPlaying)analyzeMusic();decayBeatBands(dt);
    if(transitionProgress<1){transitionProgress=Math.min(1,transitionProgress+dt*3);if(transitionProgress>=1)currentStops=JSON.parse(JSON.stringify(targetStops));update3DColors();}
    updatePhysics3D(dt);
    controls3D.update();
    if(points3DMesh){points3DMesh.material.opacity=brightness3D;points3DMesh.material.size=particleSize3D;}
    if(stars3D){stars3D.rotation.y+=dt*0.03;stars3D.rotation.x+=dt*0.01;}
    // 🧠 Нейросеть — линии связей между ближайшими нейронами
    if(testMode3D==='neural'&&points3DMesh){
        if(!scene3D.userData.neuralLines){
            const lMat=new THREE.LineBasicMaterial({color:0xaa88ee,transparent:true,opacity:0.25,depthTest:false});
            const lGeo=new THREE.BufferGeometry();
            const maxSegs=2000;
            lGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(maxSegs*6),3));
            lGeo.setDrawRange(0,0);
            const lines=new THREE.LineSegments(lGeo,lMat);
            scene3D.add(lines);
            scene3D.userData.neuralLines=lines;
        }
        const lines=scene3D.userData.neuralLines;
        const pos3=points3DMesh.geometry.attributes.position.array;
        const lpos=lines.geometry.attributes.position.array;
        const mp=modeParams.neural,connR=mp.connectivity||1.2;
        const threshold=connR*1.5;
        let segIdx=0,maxSegs=2000;
        // Проверяем каждую 8-ю пару для производительности
        const N=particleCount3D,step=Math.max(1,Math.floor(N/200));
        for(let i=0;i<N&&segIdx<maxSegs;i+=step){
            const ax=pos3[i*3],ay=pos3[i*3+1],az=pos3[i*3+2];
            for(let j=i+step;j<N&&segIdx<maxSegs;j+=step){
                const dx=pos3[j*3]-ax,dy=pos3[j*3+1]-ay,dz=pos3[j*3+2]-az;
                const d=dx*dx+dy*dy+dz*dz;
                if(d<threshold*threshold){
                    lpos[segIdx*6]=ax;lpos[segIdx*6+1]=ay;lpos[segIdx*6+2]=az;
                    lpos[segIdx*6+3]=pos3[j*3];lpos[segIdx*6+4]=pos3[j*3+1];lpos[segIdx*6+5]=pos3[j*3+2];
                    segIdx++;
                }
            }
        }
        lines.geometry.setDrawRange(0,segIdx*2);
        lines.geometry.attributes.position.needsUpdate=true;
        lines.visible=true;
    }else if(scene3D.userData.neuralLines){
        scene3D.userData.neuralLines.visible=false;
    }

    renderer3D.render(scene3D,camera3D);
}
function switchToTest(){
    const cv=document.getElementById('threeCanvas');
    document.getElementById('glCanvas').classList.add('hidden');
    document.getElementById('c2dCanvas').classList.add('hidden');
    const wc=document.getElementById('wireCanvas');if(wc)wc.style.display='none';
    cv.classList.remove('hidden');cv.style.display='block';
    if(threeReady){renderer3D.setSize(W,H);camera3D.aspect=W/H;camera3D.updateProjectionMatrix();update3DColors();}
    else{loadThreeJS(function(){init3DScene();renderer3D.setSize(W,H);camera3D.aspect=W/H;camera3D.updateProjectionMatrix();update3DColors();});}
}
function switchFromTest(){
    document.getElementById('threeCanvas').classList.add('hidden');
    document.getElementById('threeCanvas').style.display='none';
    if(useWebGL)document.getElementById('glCanvas').classList.remove('hidden');
    else document.getElementById('c2dCanvas').classList.remove('hidden');
}
