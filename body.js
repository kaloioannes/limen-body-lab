import * as THREE from './vendor/three.module.js';

// A stylized anatomical mannequin. Mesh shape is illustration, not a measured
// anthropometric prediction; baseline height and weight only affect presentation.
export function createBody(host){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{
    host.innerHTML='<div class="body-fallback"><svg viewBox="0 0 100 240"><g fill="#b9c9d8"><ellipse cx="50" cy="27" rx="13" ry="18"/><rect x="44" y="42" width="12" height="14" rx="5"/><path d="M30 55Q50 48 70 55L64 120Q50 132 36 120Z"/><path d="M28 57L18 130L23 135L38 64ZM72 57L82 130L77 135L62 64ZM36 123L35 215L44 215L50 135L56 215L65 215L64 123Z"/></g></svg><p>当前设备使用平面示意图<br>3D 需要 WebGL 支持</p></div>';
    return {update(){},rotate(){},ghost(){},dispose(){}};
  }
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,1,.1,100);
  const model=new THREE.Group();scene.add(model);
  scene.add(new THREE.HemisphereLight(0xe6f4ff,0x333e46,3));
  const light=new THREE.DirectionalLight(0xe7efff,4);light.position.set(-3,7,5);scene.add(light);
  const rim=new THREE.DirectionalLight(0x8bc9bc,3);rim.position.set(4,4,-4);scene.add(rim);
  const warm=new THREE.DirectionalLight(0xe9c7ab,1);warm.position.set(-4,2,-1);scene.add(warm);
  const material=new THREE.MeshStandardMaterial({color:0xb5bfd4,roughness:.53,metalness:.16});
  const eyeMat=new THREE.MeshStandardMaterial({color:0x737e96,roughness:.7});
  const ghostMat=new THREE.MeshBasicMaterial({color:0xa8e1cd,wireframe:true,transparent:true,opacity:.13,depthWrite:false});
  const sphere=new THREE.SphereGeometry(1,36,28);
  const addEllipsoid=(parent,x,y,z,sx,sy,sz,mat=material)=>{
    const mesh=new THREE.Mesh(sphere,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  };
  function tube(parent,from,to,r1,r2){
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,delta.length(),24,6),material);
    mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh;
  }
  function organicLimb(parent,points){
    const centers=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
    const radii=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[3],p[4],0)));
    const pos=[],idx=[],N=60,S=32;
    for(let j=0;j<=N;j++){
      const c=centers.getPoint(j/N),r=radii.getPoint(j/N);
      for(let i=0;i<S;i++){const a=i/S*Math.PI*2;pos.push(c.x+Math.cos(a)*r.x,c.y,c.z+Math.sin(a)*r.y);}
    }
    for(let j=0;j<N;j++)for(let i=0;i<S;i++){const a=j*S+i,b=j*S+(i+1)%S;idx.push(a,b,a+S,b,b+S,a+S);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setIndex(idx);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.userData.base=new Float32Array(pos);parent.add(mesh);return mesh;
  }
  const torsoGeom=new THREE.BufferGeometry();const segments=48;
  const rings=[[2.84,.29,.24],[3.03,.43,.30],[3.28,.48,.30],[3.52,.43,.27],[3.77,.37,.24],[4,.40,.245],[4.25,.49,.27],[4.50,.56,.29],[4.73,.61,.28],[4.91,.59,.24],[5.02,.39,.19]];
  const vertices=new Float32Array(rings.length*segments*3),indices=[];
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}
  torsoGeom.setAttribute('position',new THREE.BufferAttribute(vertices,3));torsoGeom.setIndex(indices);
  const torso=new THREE.Mesh(torsoGeom,material);model.add(torso);
  addEllipsoid(model,0,3.05,0,.42,.32,.29);
  addEllipsoid(model,0,5.09,0,.18,.30,.18);
  addEllipsoid(model,0,5.70,0,.31,.43,.29);
  addEllipsoid(model,0,5.48,.015,.20,.16,.20);
  addEllipsoid(model,0,5.66,.287,.052,.09,.07);
  [-1,1].forEach(sign=>{
    addEllipsoid(model,sign*.308,5.69,0,.052,.12,.075);
    addEllipsoid(model,sign*.112,5.76,.265,.048,.014,.018,eyeMat);
  });
  const breasts=[],hips=[],thighs=[],arms=[];
  for(const sign of [-1,1]){
    breasts.push(addEllipsoid(model,sign*.245,4.48,.24,.10,.10,.03));
    hips.push(addEllipsoid(model,sign*.26,3.14,-.025,.24,.28,.26));
    thighs.push(organicLimb(model,[[sign*.26,2.98,0,.23,.235],[sign*.28,2.72,.01,.235,.235],[sign*.29,2.32,.01,.21,.215],[sign*.29,1.94,.02,.165,.17],[sign*.29,1.64,.02,.14,.145],[sign*.29,1.42,.01,.145,.15],[sign*.29,1.16,0,.155,.16],[sign*.30,.83,0,.12,.13],[sign*.30,.48,0,.085,.09],[sign*.30,.27,.01,.08,.08]]));
    addEllipsoid(model,sign*.3,.19,.15,.115,.14,.27);
    arms.push(organicLimb(model,[[sign*.60,4.89,0,.16,.19],[sign*.66,4.71,0,.18,.19],[sign*.73,4.43,0,.155,.165],[sign*.81,4.10,.01,.12,.13],[sign*.87,3.88,.02,.10,.105],[sign*.92,3.65,.035,.11,.11],[sign*.98,3.32,.06,.08,.085],[sign*1.02,3.12,.07,.067,.07]]));
    addEllipsoid(model,sign*1.04,2.97,.07,.092,.20,.06);
  }
  const ghost=model.clone();ghost.traverse(o=>{if(o.isMesh){o.material=ghostMat;o.geometry=o.geometry.clone();}});ghost.visible=false;scene.add(ghost);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.65,80),new THREE.MeshBasicMaterial({color:0x42655e,transparent:true,opacity:.12}));disc.rotation.x=-Math.PI/2;disc.position.y=.015;scene.add(disc);
  for(const r of [1.25,1.65,2.05]){const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.007,100),new THREE.MeshBasicMaterial({color:0x6d9b91,transparent:true,opacity:.3,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;scene.add(ring);}
  let yaw=0,targetYaw=0,zoom=1,dragging=false,lastX=0,frame=0,disposed=false,needsRender=true;
  function shape(profile,values){
    const v=values||{breast:0,fat:0,muscle:0,skin:0};const adiposity=(profile.fat-20)/120;
    for(let j=0;j<rings.length;j++){
      const [y,w,d]=rings[j];const hip=Math.exp(-Math.pow((y-3.18)/.38,2)),waist=Math.exp(-Math.pow((y-3.8)/.30,2));
      for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,k=(j*segments+i)*3;
        vertices[k]=Math.cos(a)*(w+hip*v.fat*.09-waist*v.fat*.025+adiposity*.35-(y>4.2?v.muscle*.025:0));
        vertices[k+1]=y;vertices[k+2]=Math.sin(a)*(d+adiposity*.22+hip*v.fat*.03);
      }
    }
    torsoGeom.attributes.position.needsUpdate=true;torsoGeom.computeVertexNormals();
    breasts.forEach(b=>b.scale.set(.10+v.breast*.16,.10+v.breast*.13,.03+v.breast*.22));
    hips.forEach(h=>h.scale.x=.24+v.fat*.05+adiposity*.15);
    thighs.forEach((t,index)=>{
      const attr=t.geometry.attributes.position,base=t.userData.base,center=(index===0?-1:1)*.29;
      const width=1+v.fat*.10-v.muscle*.08+adiposity*.3;
      for(let i=0;i<attr.count;i++){attr.array[i*3]=center+(base[i*3]-center)*width;attr.array[i*3+2]=base[i*3+2]*width;}
      attr.needsUpdate=true;t.geometry.computeVertexNormals();
    });
    material.color.set(0xb5bfd4).lerp(new THREE.Color(0xc7c4d8),v.skin*.35);
    model.scale.y=profile.height/175;model.scale.x=clampScale(profile.weight,profile.height)*(0.94+profile.muscle/100*.12);
    ghost.scale.copy(model.scale);
    hips.forEach(h=>{const baseline=ghost.children[model.children.indexOf(h)];baseline.scale.x=.24+adiposity*.15;});
    thighs.forEach(t=>{
      const baseline=ghost.children[model.children.indexOf(t)],attr=baseline.geometry.attributes.position,base=t.userData.base;
      const center=Math.sign(t.geometry.attributes.position.array[0])*.29,width=1+adiposity*.3;
      for(let i=0;i<attr.count;i++){attr.array[i*3]=center+(base[i*3]-center)*width;attr.array[i*3+2]=base[i*3+2]*width;}
      attr.needsUpdate=true;baseline.geometry.computeVertexNormals();
    });
    needsRender=true;
    // Rebuild the ghost torso for this profile, with zero intervention changes.
    ghost.traverse(o=>{if(o.isMesh&&o.geometry!==sphere&&o.geometry.attributes.position?.count===vertices.length/3){
      const base=o.geometry.attributes.position.array;
      for(let j=0;j<rings.length;j++)for(let i=0;i<segments;i++){
        const [y,w,d]=rings[j],a=i/segments*Math.PI*2,k=(j*segments+i)*3;
        base[k]=Math.cos(a)*(w+adiposity*.35);base[k+1]=y;base[k+2]=Math.sin(a)*(d+adiposity*.22);
      }
      o.geometry.attributes.position.needsUpdate=true;o.geometry.computeVertexNormals();
    }});
  }
  function clampScale(weight,height){return Math.max(.85,Math.min(1.2,Math.sqrt(weight/68)/(height/175)));}
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();needsRender=true;}
  const observer=new ResizeObserver(resize);observer.observe(host);
  renderer.domElement.setAttribute('aria-label','可拖动旋转的人体示意模型');renderer.domElement.setAttribute('role','img');
  renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragging){targetYaw+=(e.clientX-lastX)*.012;lastX=e.clientX;}});
  renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
  renderer.domElement.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();zoom=Math.max(.8,Math.min(1.3,zoom-e.deltaY*.001));needsRender=true;}},{passive:false});
  function loop(){if(disposed)return;frame=requestAnimationFrame(loop);if(document.hidden||!host.offsetParent)return;const moving=Math.abs(targetYaw-yaw)>.0001;if(!needsRender&&!moving)return;yaw+=(targetYaw-yaw)*.12;model.rotation.y=yaw;ghost.rotation.y=yaw;camera.position.set(.1,3.4,14.8/zoom);camera.lookAt(0,3.15,0);renderer.render(scene,camera);needsRender=false;}
  shape({height:175,weight:68,fat:20},null);
  // Initialize ghost vertices from the unchanged baseline before future morphs.
  ghost.traverse(o=>{if(o.isMesh&&o.geometry!==sphere&&o.geometry.attributes.position?.count===vertices.length/3){o.geometry.attributes.position.array.set(vertices);o.geometry.computeVertexNormals();}});
  resize();loop();
  return {update:shape,rotate(angle){targetYaw=angle;needsRender=true;},ghost(on){ghost.visible=on;needsRender=true;},dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();}};
}
