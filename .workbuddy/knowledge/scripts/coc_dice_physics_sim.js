// coc-miniprogram 骰子 · 真实 cannon-es 投掷分布模拟
// 忠实复现 utils/dice-engine.js 的 createPhysicsWorld / startThrowAnimation /
// updatePhysics / checkDiceStability / snapToGround / getResultByVertexIntersection
// 用法: node coc_dice_physics_sim.js [每种投掷次数]
const path='/Users/liuqilong/Projects/coc-miniprogram/miniprogram_npm/cannon-es/index.js'
const C = require(path)

const N = parseInt(process.argv[2]||'150',10)
const FIX = process.env.FIX==='1'   // 开启后套用本轮真实引擎修复：D4 质心平移 + D6/D3 均匀四元数 + 三轴角速度

/* Shoemake 均匀随机四元数（与引擎 randomQuaternion 一致） */
function randomQuaternion(){
  const u1=Math.random(),u2=Math.random(),u3=Math.random()
  const s1=Math.sqrt(1-u1),s2=Math.sqrt(u1)
  return{x:s1*Math.sin(2*Math.PI*u2),y:s1*Math.cos(2*Math.PI*u2),z:s2*Math.sin(2*Math.PI*u3),w:s2*Math.cos(2*Math.PI*u3)}
}

/* ========== 源码常量（逐字复制） ========== */
const PHYSICS_CONFIG = { GRAVITY:-30,SLEEP_LINEAR:0.01,SLEEP_ANGULAR:0.01,ADJUST_WINDOW:12,STABLE_DOT:0.93 }
const DICE_MASS = { D3:0.80,D4:0.80,D6:1.00,D8:1.10,D10:1.20,D90:1.20,D12:1.40,D20:1.60 }
const DICE_RADIUS= { D3:0.78,D4:0.95,D6:0.78,D8:0.7,D10:0.7,D90:0.7,D12:0.34,D20:0.7 }

const VERTEX_DATA = {
  D4:{verts:[[0.658,0,0],[-0.329,0,0.570],[-0.329,0,-0.570],[0,0.930,0]],faces:[{v:1,vi:[3,0,1]},{v:4,vi:[2,3,0]},{v:3,vi:[1,2,3]},{v:2,vi:[0,1,2]}]},
  D3:{verts:[[0.5,0.5,0.5],[-0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[0.5,-0.5,-0.5],[-0.5,-0.5,-0.5]],faces:[{v:1,vi:[0,4,6,2]},{v:1,vi:[1,3,7,5]},{v:2,vi:[0,1,5,4]},{v:2,vi:[2,6,7,3]},{v:3,vi:[0,2,3,1]},{v:3,vi:[4,5,7,6]}]},
  D6:{verts:[[0.5,0.5,0.5],[-0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[0.5,-0.5,-0.5],[-0.5,-0.5,-0.5]],faces:[{v:2,vi:[0,4,6,2]},{v:5,vi:[1,3,7,5]},{v:3,vi:[0,1,5,4]},{v:4,vi:[2,6,7,3]},{v:1,vi:[0,2,3,1]},{v:6,vi:[4,5,7,6]}]},
  D8:{verts:[[0,0,0.7],[0,0,-0.7],[0.7,0,0],[-0.7,0,0],[0,0.7,0],[0,-0.7,0]],faces:[{v:6,vi:[0,2,4]},{v:4,vi:[0,4,3]},{v:2,vi:[0,3,5]},{v:8,vi:[0,5,2]},{v:7,vi:[1,4,2]},{v:1,vi:[1,3,4]},{v:3,vi:[1,5,3]},{v:5,vi:[1,2,5]}]},
  D10:{verts:[[0,0.704,0],[0,-0.704,0],[0.704,0.074,0],[0.570,-0.074,0.414],[0.218,0.074,0.670],[-0.218,-0.074,0.670],[-0.570,0.074,0.414],[-0.704,-0.074,0],[-0.570,0.074,-0.414],[-0.218,-0.074,-0.670],[0.218,0.074,-0.670],[0.570,-0.074,-0.414]],faces:[{v:6,vi:[0,2,3,4]},{v:4,vi:[0,4,5,6]},{v:2,vi:[0,6,7,8]},{v:0,vi:[0,8,9,10]},{v:8,vi:[0,10,11,2]},{v:1,vi:[1,3,4,5]},{v:3,vi:[1,5,6,7]},{v:5,vi:[1,7,8,9]},{v:7,vi:[1,9,10,11]},{v:9,vi:[1,11,2,3]}]},
  D12:{verts:[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],[0,1.618,0.618],[0,1.618,-0.618],[0,-1.618,0.618],[0,-1.618,-0.618],[0.618,0,1.618],[0.618,0,-1.618],[-0.618,0,1.618],[-0.618,0,-1.618],[1.618,0.618,0],[1.618,-0.618,0],[-1.618,0.618,0],[-1.618,-0.618,0]],
  faces:[{v:2,vi:[0,12,2,17,16]},{v:1,vi:[0,16,1,9,8]},{v:3,vi:[0,8,4,14,12]},{v:4,vi:[1,16,17,3,13]},{v:5,vi:[1,13,15,5,9]},{v:10,vi:[2,12,14,6,10]},{v:8,vi:[2,10,11,3,17]},{v:7,vi:[3,11,7,15,13]},{v:6,vi:[4,8,9,5,18]},{v:11,vi:[4,18,19,6,14]},{v:9,vi:[5,15,7,19,18]},{v:12,vi:[6,19,7,11,10]}]},
  D20:{verts:[[0,0.421,0.681],[0,-0.421,0.681],[0,0.421,-0.681],[0,-0.421,-0.681],[0.681,0.421,0],[-0.681,0.421,0],[0.681,-0.421,0],[-0.681,-0.421,0],[0.421,0,0.681],[-0.421,0,0.681],[0.421,0,-0.681],[-0.421,0,-0.681]],
  faces:[{v:1,vi:[0,1,8]},{v:14,vi:[0,8,4]},{v:13,vi:[0,4,5]},{v:2,vi:[0,5,9]},{v:7,vi:[0,9,1]},{v:3,vi:[1,6,8]},{v:11,vi:[8,6,10]},{v:17,vi:[8,10,4]},{v:19,vi:[4,10,2]},{v:5,vi:[4,2,5]},{v:9,vi:[5,2,11]},{v:16,vi:[5,11,9]},{v:4,vi:[9,11,7]},{v:18,vi:[9,7,1]},{v:8,vi:[1,7,6]},{v:12,vi:[3,6,7]},{v:15,vi:[3,7,11]},{v:10,vi:[3,11,2]},{v:20,vi:[3,2,10]},{v:6,vi:[3,10,6]}]}
}
VERTEX_DATA.D90={verts:VERTEX_DATA.D10.verts,faces:[{v:60,vi:[0,2,3,4]},{v:40,vi:[0,4,5,6]},{v:20,vi:[0,6,7,8]},{v:0,vi:[0,8,9,10]},{v:80,vi:[0,10,11,2]},{v:10,vi:[1,3,4,5]},{v:30,vi:[1,5,6,7]},{v:50,vi:[1,7,8,9]},{v:70,vi:[1,9,10,11]},{v:90,vi:[1,11,2,3]}]}

/* 物理凸包（原文复制） */
function createConvexBody(type){
  let verts=[],faces=[],s,L,h,r,phi,ip,sg,i,a,y,uc,lc,un,ln,rv
  switch(type){
    case'D4': s=0.060;L=20;h=Math.sqrt(2/3)*L;r=L/Math.sqrt(3)
      const cg4=FIX?h/4:0   // 修复：几何重心平移回 body 原点
      rv=[[0,h-cg4,0],[r,-cg4,0],[-r/2,-cg4,r*Math.sqrt(3)/2],[-r/2,-cg4,-r*Math.sqrt(3)/2]]
      verts=rv.map(v=>new C.Vec3(v[0]*s,v[1]*s,v[2]*s)); faces=[[0,2,1],[0,3,2],[0,1,3],[1,2,3]];break
    case'D8': s=0.70;rv=[[0,0,s],[0,0,-s],[s,0,0],[-s,0,0],[0,s,0],[0,-s,0]]
      verts=rv.map(v=>new C.Vec3(v[0],v[1],v[2])); faces=[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]];break
    case'D10':case'D90': s=1*0.92;r=0.765*s;h=0.0808*s;verts.push(new C.Vec3(0,r,0),new C.Vec3(0,-r,0))
      for(i=0;i<10;i++){a=i*Math.PI*2/10;y=h*(i%2===0?1:-1);verts.push(new C.Vec3(r*Math.cos(a),y,r*Math.sin(a)))}
      for(i=0;i<5;i++){uc=2+i*2;lc=2+i*2+1;un=2+((i*2+2)%10);faces.push([0,uc,lc],[0,lc,un])}
      for(i=0;i<5;i++){lc=2+i*2+1;un=2+((i*2+2)%10);ln=2+((i*2+3)%10);faces.push([1,lc,un],[1,un,ln])};break
    case'D12': sg=0.5*0.87;phi=(1+Math.sqrt(5))/2;ip=1/phi
      rv=[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],[0,phi,ip],[0,phi,-ip],[0,-phi,ip],[0,-phi,-ip],[ip,0,phi],[ip,0,-phi],[-ip,0,phi],[-ip,0,-phi],[phi,ip,0],[phi,-ip,0],[-phi,ip,0],[-phi,-ip,0]]
      verts=rv.map(v=>new C.Vec3(v[0]*sg,v[1]*sg,v[2]*sg))
      ;[[0,12,2,17,16],[0,16,1,9,8],[0,8,4,14,12],[1,16,17,3,13],[1,13,15,5,9],[2,12,14,6,10],[2,10,11,3,17],[3,11,7,15,13],[4,8,9,5,18],[4,18,19,6,14],[5,15,7,19,18],[6,19,7,11,10]]
        .forEach(p=>{faces.push([p[0],p[1],p[2]],[p[0],p[2],p[3]],[p[0],p[3],p[4]])});break
    case'D20': phi=(1+Math.sqrt(5))/2;r=0.8*0.88
      rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
      verts=rv.map(v=>{const l=Math.hypot(v[0],v[1],v[2]);return new C.Vec3(v[0]/l*r,v[1]/l*r,v[2]/l*r)})
      faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];break
  }
  try{return new C.ConvexPolyhedron({vertices:verts,faces:faces})}catch(e){return null}
}

/* 判定（原文复制） */
function rotateByQuat(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return{x:(1-2*(qy*qy+qz*qz))*px+2*(qx*qy-qw*qz)*py+2*(qx*qz+qw*qy)*pz,
         y:2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz,
         z:2*(qx*qz-qw*qy)*px+2*(qy*qz+qw*qx)*py+(1-2*(qx*qx+qy*qy))*pz}}
function getFaceCenter(type,face,data){const vi=face.vi,verts=data.verts
  if(type==='D4'){const vp=verts[vi[0]];return vp||[0,0,0]}
  if(type==='D10'||type==='D90'){const v0=verts[vi[0]],v1=verts[vi[1]],v2=verts[vi[2]],v3=verts[vi[3]]
    const c1=[0,1,2].map(k=>(v0[k]+v1[k]+v3[k])/3),c2=[0,1,2].map(k=>(v0[k]+v2[k]+v3[k])/3)
    return[0,1,2].map(k=>(v0[k]+c1[k]+c2[k])/3)}
  const c=[0,0,0];vi.forEach(i=>{const v=verts[i];c[0]+=v[0];c[1]+=v[1];c[2]+=v[2]});return c.map(x=>x/vi.length)}
function getResult(type,q){const data=VERTEX_DATA[type]
  const r=data.faces.map(f=>({v:f.v,y:rotateByQuat(getFaceCenter(type,f,data),q).y}))
  r.sort((a,b)=>b.y-a.y);return r[0].v}

/* 稳定性（原文复制） */
function checkDiceStability(body,type){const data=VERTEX_DATA[type]
  const threshold=(type==='D10'||type==='D90')?0.55:PHYSICS_CONFIG.STABLE_DOT
  let maxDot=-1,q=body.quaternion
  for(let fi=0;fi<data.faces.length;fi++){
    const f=data.faces[fi],vi=f.vi,verts=data.verts
    const v0=verts[vi[0]],v1=verts[vi[1]],v2=verts[vi[2]]
    const e1=[v1[0]-v0[0],v1[1]-v0[1],v1[2]-v0[2]],e2=[v2[0]-v0[0],v2[1]-v0[1],v2[2]-v0[2]]
    const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]
    const ln=Math.hypot(...n);if(ln<0.0001)continue
    const wn=rotateByQuat([n[0]/ln,n[1]/ln,n[2]/ln],q)
    if(Math.abs(wn.y)>maxDot)maxDot=Math.abs(wn.y)}
  return{maxDot,isStable:maxDot>=threshold}}
function snapToGround(body){const shape=body.shapes[0];if(!shape||!shape.vertices)return
  const verts=shape.vertices,q=body.quaternion;let minY=Infinity
  for(let i=0;i<verts.length;i++){const rv=rotateByQuat([verts[i].x,verts[i].y,verts[i].z],q)
    if(body.position.y+rv.y<minY)minY=body.position.y+rv.y}
  body.position.y-=minY-0.003;body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.sleep()}

/* 世界（原文复制） */
function createPhysicsWorld(){
  const world=new C.World();world.gravity.set(0,PHYSICS_CONFIG.GRAVITY,0)
  world.broadphase=new C.NaiveBroadphase();world.solver.iterations=15
  const gm=new C.Material();gm.friction=1.5;gm.restitution=0.05
  const dm=new C.Material();dm.friction=1.2;dm.restitution=0.05
  world.addContactMaterial(new C.ContactMaterial(gm,dm,{friction:1.5,restitution:0.05}))
  const gb=new C.Body({mass:0,shape:new C.Plane(),material:gm})
  gb.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(gb)
  const AH_X=3.5,AH_Z=4.5,WH=1.5,WT=0.1
  ;[[AH_X+WT,WH,0,WT,WH,AH_Z],[-AH_X-WT,WH,0,WT,WH,AH_Z],[0,WH,AH_Z+WT,AH_X,WH,WT],[0,WH,-AH_Z-WT,AH_X,WH,WT]]
   .forEach(w=>{const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(w[3],w[4],w[5])),material:gm})
     b.position.set(w[0],w[1],w[2]);world.addBody(b)})
  return world}

// three.js Euler(XYZ) -> Quaternion（源码 mesh.rotation.set 后的 quaternion）
function eulerToQuat(x,y,z){
  const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2)
  const s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2)
  return [s1*c2*c3+c1*s2*s3, c1*s2*c3-s1*c2*s3, c1*c2*s3+s1*s2*c3, c1*c2*c3-s1*s2*s3]
}

/* 单次投掷 */
function throwOnce(type,initMode){
  const world=createPhysicsWorld(); let body
  if(type==='D6'||type==='D3'){
    const r=(DICE_RADIUS[type]||0.7)*0.7
    const mat=new C.Material();mat.friction=1.2;mat.restitution=0.05
    body=new C.Body({mass:DICE_MASS[type],shape:new C.Box(new C.Vec3(r,r,r)),material:mat,
      allowSleep:true,linearDamping:0.15,angularDamping:0.30})
  }else{
    const shape=createConvexBody(type); if(!shape)return null
    const mat=new C.Material();mat.friction=1.2;mat.restitution=0.05
    body=new C.Body({mass:DICE_MASS[type],shape,material:mat,allowSleep:true,
      linearDamping:type==='D4'?0.25:0.15, angularDamping:type==='D4'?0.50:0.30})
  }
  const angle=0
  body.position.set(Math.cos(angle)*(1+Math.random()),3+Math.random()*2,Math.sin(angle)*(1.5+Math.random()*1.5))
  if(initMode==='identity') body.quaternion.set(0,0,0,1)
  else if(FIX){const rq=randomQuaternion();body.quaternion.set(rq.x,rq.y,rq.z,rq.w)}
  else {const q=eulerToQuat(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2)
        body.quaternion.set(q[0],q[1],q[2],q[3])}
  body.velocity.set((Math.random()-0.5)*4,1+Math.random()*3,(Math.random()-0.5)*4)
  if(FIX){const av=[8+Math.random()*6,8+Math.random()*6,8+Math.random()*6];body.angularVelocity.set(av[0],av[1],av[2])}
  else {const axes=[0,1,2].sort(()=>Math.random()-0.5).slice(0,2)
    const av=[0,0,0];axes.forEach(a=>{av[a]=8+Math.random()*4})
    body.angularVelocity.set(av[0],av[1],av[2])}
  body.wakeUp()
  world.addBody(body)

  let slowFrames=0,inAdjust=false,finished=false,steps=0,maxDot=0
  for(let i=0;i<900&&!finished;i++){
    world.step(1/60); steps++
    const speed=body.velocity.length(),ang=body.angularVelocity.length()
    const isSlow=speed<PHYSICS_CONFIG.SLEEP_LINEAR&&ang<PHYSICS_CONFIG.SLEEP_ANGULAR
    if(!isSlow){slowFrames=0;inAdjust=false;continue}
    slowFrames++
    if(!inAdjust&&slowFrames>=3)inAdjust=true
    if(inAdjust){
      const st=checkDiceStability(body,type); maxDot=st.maxDot
      if(st.isStable||slowFrames>=PHYSICS_CONFIG.ADJUST_WINDOW){
        body.sleep();snapToGround(body);finished=true}
    }
  }
  if(!finished){snapToGround(body);finished=true}
  return {q:{x:body.quaternion.x,y:body.quaternion.y,z:body.quaternion.z,w:body.quaternion.w},
          steps, y:body.position.y, maxDot}
}

/* 卡方 */
function chi2(cnt,nFaces,total){
  const exp=total/nFaces; let x=0
  Object.values(cnt).forEach(o=>{x+=(o-exp)**2/exp}); return x
}
const CRIT={3:5.991,4:7.815,6:11.070,8:14.067,10:16.919,12:19.675,20:28.412}

console.log('════════════════════════════════════════════════════════')
console.log(` coc-miniprogram 骰子 · 真实物理投掷 (每型 ${N} 次)`)
console.log(' 初态: three.js Euler XYZ 随机（与源码 mesh.rotation.set 一致）')
console.log('════════════════════════════════════════════════════════')

const TYPES=(process.env.ONLY?process.env.ONLY.split(','):['D4','D6','D8','D10','D12','D20','D3'])
const summary=[]
TYPES.forEach(type=>{
  const nFaces = type==='D3'?3 : (type==='D6'?6:(type==='D4'?4:(type==='D8'?8:(type==='D10'?10:(type==='D12'?12:20)))))
  const cnt={}; let stepsSum=0, ySum=0, dotSum=0
  for(let i=0;i<N;i++){
    const r=throwOnce(type,'euler'); if(!r){console.log(`  ${type} 投掷失败`);break}
    const v=getResult(type,r.q); cnt[v]=(cnt[v]||0)+1
    stepsSum+=r.steps; ySum+=r.y; dotSum+=r.maxDot
  }
  const vals=Object.keys(cnt).map(Number).sort((a,b)=>a-b)
  const exp=N/nFaces
  const x2=chi2(cnt,nFaces,N)
  const crit=CRIT[nFaces]||28.412
  const pass=x2<crit
  // 最偏的面
  let worst=null,worstDev=0
  vals.forEach(v=>{const dev=Math.abs((cnt[v]||0)-exp)/exp; if(dev>worstDev){worstDev=dev;worst=v}})
  console.log(`\n───── ${type} (${nFaces} 面) ─────`)
  console.log(`  分布: ${vals.map(v=>`${v}:${(100*cnt[v]/N).toFixed(1)}%`).join(' ')}`)
  console.log(`  理论: 各 ${(100/nFaces).toFixed(1)}%`)
  console.log(`  卡方 = ${x2.toFixed(2)}  (临界 ${crit})  ${pass?'✅ 通过均匀性':'❌ 显著不均匀'}`)
  console.log(`  偏离最大的面: ${worst}  (实测 ${cnt[worst]} vs 期望 ${exp.toFixed(0)}, 偏差 ${(100*worstDev).toFixed(0)}%)`)
  console.log(`  平均停止步数 ${(stepsSum/N).toFixed(0)}  平均静止高度 y=${(ySum/N).toFixed(3)}  稳定度 ${(dotSum/N).toFixed(3)}`)
  summary.push({type,nFaces,x2,crit,pass,worst,worstDev:100*worstDev,cnt,N})
})

console.log('\n════════════════════════════════════════════════════════')
console.log(' 汇总')
console.log('════════════════════════════════════════════════════════')
summary.forEach(s=>{
  console.log(`${s.type.padEnd(4)} 卡方 ${s.x2.toFixed(2).padStart(7)} / 临界 ${String(s.crit).padStart(6)}  ${s.pass?'✅':'❌'}  最偏面 ${s.worst} (${s.worstDev.toFixed(0)}%)`)
})
