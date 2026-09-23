// 修复方案验证（仅模拟，不改工程代码）
// A. D4: 现状 vs 凸包顶点平移到几何重心 (cg=h/4)
// B. D6: 现状 vs 三轴角速度 vs 补 snapToGround(Box 无 vertices) vs 两者都改
const C = require('/Users/liuqilong/Projects/coc-miniprogram/miniprogram_npm/cannon-es/index.js')
const N = parseInt(process.argv[2]||'1500',10)

const PHYSICS_CONFIG={GRAVITY:-30,SLEEP_LINEAR:0.01,SLEEP_ANGULAR:0.01,ADJUST_WINDOW:12,STABLE_DOT:0.93}
const DICE_MASS={D3:0.80,D4:0.80,D6:1.00,D8:1.10,D10:1.20,D90:1.20,D12:1.40,D20:1.60}
const DICE_RADIUS={D3:0.78,D4:0.95,D6:0.78,D8:0.7,D10:0.7,D90:0.7,D12:0.34,D20:0.7}

const BOX8=[[0.5,0.5,0.5],[-0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[0.5,-0.5,-0.5],[-0.5,-0.5,-0.5]]
const VERTEX_DATA={
 D4:{verts:[[0.658,0,0],[-0.329,0,0.570],[-0.329,0,-0.570],[0,0.930,0]],faces:[{v:1,vi:[3,0,1]},{v:4,vi:[2,3,0]},{v:3,vi:[1,2,3]},{v:2,vi:[0,1,2]}]},
 D6:{verts:BOX8,faces:[{v:2,vi:[0,4,6,2]},{v:5,vi:[1,3,7,5]},{v:3,vi:[0,1,5,4]},{v:4,vi:[2,6,7,3]},{v:1,vi:[0,2,3,1]},{v:6,vi:[4,5,7,6]}]},
 D3:{verts:BOX8,faces:[{v:1,vi:[0,4,6,2]},{v:1,vi:[1,3,7,5]},{v:2,vi:[0,1,5,4]},{v:2,vi:[2,6,7,3]},{v:3,vi:[0,2,3,1]},{v:3,vi:[4,5,7,6]}]}
}
function rotateByQuat(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return{y:2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz}}
// dy: 判定表顶点 y 方向的整体平移（修复 D4 时判定表必须同步平移，否则坐标系不一致）
function getResult(type,q,dy){const data=VERTEX_DATA[type];dy=dy||0
  if(type==='D4'){const r=data.faces.map(f=>{const v=data.verts[f.vi[0]]
    return{v:f.v,y:rotateByQuat([v[0],v[1]-dy,v[2]],q).y}});r.sort((a,b)=>b.y-a.y);return r[0].v}
  const r=data.faces.map(f=>{const vi=f.vi,c=[0,1,2].map(k=>vi.reduce((s,i)=>s+data.verts[i][k],0)/vi.length)
    return{v:f.v,y:rotateByQuat(c,q).y}});r.sort((a,b)=>b.y-a.y);return r[0].v}
function checkStability(body,type){const data=VERTEX_DATA[type];let maxDot=-1,q=body.quaternion
  for(const f of data.faces){const vi=f.vi,verts=data.verts
    const v0=verts[vi[0]],v1=verts[vi[1]],v2=verts[vi[2]]
    const e1=[v1[0]-v0[0],v1[1]-v0[1],v1[2]-v0[2]],e2=[v2[0]-v0[0],v2[1]-v0[1],v2[2]-v0[2]]
    const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]
    const ln=Math.hypot(...n);if(ln<1e-4)continue
    const wy=rotateByQuat([n[0]/ln,n[1]/ln,n[2]/ln],q).y
    if(Math.abs(wy)>maxDot)maxDot=Math.abs(wy)}
  return maxDot>=PHYSICS_CONFIG.STABLE_DOT}
function createWorld(){const w=new C.World();w.gravity.set(0,PHYSICS_CONFIG.GRAVITY,0)
  w.broadphase=new C.NaiveBroadphase();w.solver.iterations=15
  const gm=new C.Material();gm.friction=1.5;gm.restitution=0.05
  const dm=new C.Material();dm.friction=1.2;dm.restitution=0.05
  w.addContactMaterial(new C.ContactMaterial(gm,dm,{friction:1.5,restitution:0.05}))
  const gb=new C.Body({mass:0,shape:new C.Plane(),material:gm});gb.quaternion.setFromEuler(-Math.PI/2,0,0);w.addBody(gb)
  const AH_X=3.5,AH_Z=4.5,WH=1.5,WT=0.1
  ;[[AH_X+WT,WH,0,WT,WH,AH_Z],[-AH_X-WT,WH,0,WT,WH,AH_Z],[0,WH,AH_Z+WT,AH_X,WH,WT],[0,WH,-AH_Z-WT,AH_X,WH,WT]]
   .forEach(x=>{const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(x[3],x[4],x[5])),material:gm});b.position.set(x[0],x[1],x[2]);w.addBody(b)})
  return w}
function eulerToQuat(x,y,z){const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2)
  return[s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3]}
// 均匀随机四元数（Shoemake）—— 三角机构修复时新增 randomQuaternion() 用的就是这个
function randQuat(){const u1=Math.random(),u2=Math.random(),u3=Math.random()
  const sq1=Math.sqrt(1-u1),sr=Math.sqrt(u1)
  return[sq1*Math.sin(2*Math.PI*u2),sq1*Math.cos(2*Math.PI*u2),sr*Math.sin(2*Math.PI*u3),sr*Math.cos(2*Math.PI*u3)]}

function d4Body(shifted){
  const s=0.060,L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3),cg=shifted?h/4:0
  const rv=[[0,h-cg,0],[r,-cg,0],[-r/2,-cg,r*Math.sqrt(3)/2],[-r/2,-cg,-r*Math.sqrt(3)/2]]
  const shape=new C.ConvexPolyhedron({vertices:rv.map(v=>new C.Vec3(v[0]*s,v[1]*s,v[2]*s)),faces:[[0,2,1],[0,3,2],[0,1,3],[1,2,3]]})
  const mat=new C.Material();mat.friction=1.2;mat.restitution=0.05
  return new C.Body({mass:DICE_MASS.D4,shape,material:mat,allowSleep:true,linearDamping:shifted?0.15:0.25,angularDamping:shifted?0.30:0.50})
}
function d6Body(){const r=(DICE_RADIUS.D6||0.7)*0.7
  const mat=new C.Material();mat.friction=1.2;mat.restitution=0.05
  return new C.Body({mass:DICE_MASS.D6,shape:new C.Box(new C.Vec3(r,r,r)),material:mat,allowSleep:true,linearDamping:0.15,angularDamping:0.30})}
function boxLocalVerts(r){
  const v=[]
  for(const x of [-r,r]) for(const y of [-r,r]) for(const z of [-r,r]) v.push([x,y,z])
  return v
}
function snapBox(body,r){ // 手动补 snapToGround（Box 没有 .vertices）
  let minY=Infinity,q=body.quaternion
  boxLocalVerts(r).forEach(v=>{const y=rotateByQuat(v,q).y;if(body.position.y+y<minY)minY=body.position.y+y})
  body.position.y-=minY-0.003;body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.sleep()}

function run(type,opt){
  const cnt={};let ySum=0
  for(let i=0;i<N;i++){
    const w=createWorld()
    const body = type==='D4'? d4Body(opt.shifted) : d6Body()
    body.position.set(1+Math.random(),3+Math.random()*2,0)
    const q=opt.randq?randQuat():eulerToQuat(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2)
    body.quaternion.set(q[0],q[1],q[2],q[3])
    body.velocity.set((Math.random()-0.5)*4,1+Math.random()*3,(Math.random()-0.5)*4)
    const av=[0,0,0]
    if(opt.axes3){ // 三轴 + 随机符号（真正的充分翻滚）
      for(let a=0;a<3;a++){const s=Math.random()<0.5?-1:1;av[a]=s*(8+Math.random()*4)}}
    else{const axes=[0,1,2].sort(()=>Math.random()-0.5).slice(0,2);axes.forEach(a=>{av[a]=8+Math.random()*4})}
    body.angularVelocity.set(av[0],av[1],av[2]);body.wakeUp();w.addBody(body)
    let slow=0,inAdj=false,done=false
    const r=(DICE_RADIUS[type]||0.7)*0.7
    for(let k=0;k<900&&!done;k++){
      w.step(1/60)
      const s=body.velocity.length(),a=body.angularVelocity.length()
      if(!(s<PHYSICS_CONFIG.SLEEP_LINEAR&&a<PHYSICS_CONFIG.SLEEP_ANGULAR)){slow=0;inAdj=false;continue}
      slow++;if(!inAdj&&slow>=3)inAdj=true
      const frozen = opt.strict ? false : (slow>=PHYSICS_CONFIG.ADJUST_WINDOW)
      if(inAdj&&(checkStability(body,type)||frozen)){
        body.sleep()
        if(type==='D6'&&opt.snap) snapBox(body,r)
        else { const sh=body.shapes[0]
          if(sh&&sh.vertices){let mY=Infinity;const qq=body.quaternion
            for(const v of sh.vertices){const y=rotateByQuat([v.x,v.y,v.z],qq).y;if(body.position.y+y<mY)mY=body.position.y+y}
            body.position.y-=mY-0.003;body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.sleep()}}
        done=true}
    }
    if(!done&&type!=='D4'&&opt.snap)snapBox(body,r)
    const v=getResult(type,body.quaternion,opt.dy);cnt[v]=(cnt[v]||0)+1;ySum+=body.position.y
  }
  return {cnt,y:ySum/N}
}
function chi2(cnt,nF,total){const e=total/nF;let x=0;Object.values(cnt).forEach(o=>{x+=(o-e)**2/e});return x}
const CRIT={3:5.991,4:7.815,6:11.070}

console.log(`══════ 修复方案验证 (每方案 ${N} 次) ══════`)

console.log('\n【A】D4 —— 质心平移 / 随机初态 / 翻滚充分性 各自贡献')
;[{t:'现状(质心错位 + 欧拉初态 + 2轴角速度)',o:{shifted:false}},
  {t:'仅平移凸包(判定表未同步)',o:{shifted:true}},
  {t:'凸包+判定表同步平移',o:{shifted:true,dy:0.2325}},
  {t:'同步平移 + 均匀随机初态',o:{shifted:true,dy:0.2325,randq:true}},
  {t:'同步平移 + 随机初态 + 三轴随机符号角速度',o:{shifted:true,dy:0.2325,randq:true,axes3:true}},
  {t:'只加随机初态(不动质心)',o:{shifted:false,randq:true}},
  {t:'同步平移+随机初态+严格稳定判据',o:{shifted:true,dy:0.2325,randq:true,strict:true}},
  {t:'同步平移+随机初态+三轴+严格判据',o:{shifted:true,dy:0.2325,randq:true,axes3:true,strict:true}},
  {t:'仅严格稳定判据(不动质心)',o:{shifted:false,strict:true}}].forEach(c=>{
  const r=run('D4',c.o)
  const x2=chi2(r.cnt,4,N)
  console.log(`  ${c.t.padEnd(38)} ${[1,2,3,4].map(v=>`${v}:${(100*(r.cnt[v]||0)/N).toFixed(1)}%`).join(' ')}  卡方 ${x2.toFixed(1).padStart(7)} ${x2<CRIT[4]?'✅':'❌'}`)
})

console.log('\n【B】D6 / D3 —— Box 骰子（snapToGround 对 Box 失效）')
;[{t:'D6 现状',ty:'D6',o:{}},
  {t:'D6 补 snapToGround',ty:'D6',o:{snap:true}},
  {t:'D6 均匀随机初态',ty:'D6',o:{randq:true}},
  {t:'D6 随机初态 + 三轴随机符号',ty:'D6',o:{randq:true,axes3:true}},
  {t:'D3 现状',ty:'D3',o:{}},
  {t:'D3 随机初态 + 三轴随机符号',ty:'D3',o:{randq:true,axes3:true}}].forEach(c=>{
  const r=run(c.ty,c.o)
  const nF=c.ty==='D3'?3:6
  const x2=chi2(r.cnt,nF,N)
  const keys=c.ty==='D3'?[1,2,3]:[1,2,3,4,5,6]
  console.log(`  ${c.t.padEnd(28)} ${keys.map(v=>`${v}:${(100*(r.cnt[v]||0)/N).toFixed(1)}%`).join(' ')}  卡方 ${x2.toFixed(1).padStart(6)} ${x2<CRIT[nF]?'✅':'❌'}`)
})
