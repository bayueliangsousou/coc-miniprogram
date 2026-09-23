// D4 专项：区分「物理停得不均」还是「判定读得不准」
// 统计：① 物理上哪个面贴地（面法线最接近 -Y） ② 判定返回值
// 若①均匀而②偏 => 判定层问题；若①本身不均 => 物理层问题
const C = require('/Users/liuqilong/Projects/coc-miniprogram/miniprogram_npm/cannon-es/index.js')
const N = parseInt(process.argv[2]||'2000',10)
const CFG={GRAVITY:-30,SL:0.01,SA:0.01,AW:12,SD:0.93}

const VD4={verts:[[0.658,0,0],[-0.329,0,0.570],[-0.329,0,-0.570],[0,0.930,0]],
           faces:[{v:1,vi:[3,0,1]},{v:4,vi:[2,3,0]},{v:3,vi:[1,2,3]},{v:2,vi:[0,1,2]}]}
function rotY(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return 2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz}
function rotV(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return[(1-2*(qy*qy+qz*qz))*px+2*(qx*qy-qw*qz)*py+2*(qx*qz+qw*qy)*pz,
         2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz,
         2*(qx*qz-qw*qy)*px+2*(qy*qz+qw*qx)*py+(1-2*(qx*qx+qy*qy))*pz]}
// 判定锚点（可传入判定表 y 平移）
function detect(q,dy){dy=dy||0
  const r=VD4.faces.map(f=>{const v=VD4.verts[f.vi[0]];return{v:f.v,y:rotY([v[0],v[1]-dy,v[2]],q)}})
  r.sort((a,b)=>b.y-a.y);return r[0].v}
// 物理凸包
function d4Shape(shifted){
  const s=0.060,L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3),cg=shifted?h/4:0
  const rv=[[0,h-cg,0],[r,-cg,0],[-r/2,-cg,r*Math.sqrt(3)/2],[-r/2,-cg,-r*Math.sqrt(3)/2]]
  return {shape:new C.ConvexPolyhedron({vertices:rv.map(v=>new C.Vec3(v[0]*s,v[1]*s,v[2]*s)),
          faces:[[0,2,1],[0,3,2],[0,1,3],[1,2,3]]}), raw:rv, s}
}
function stability(body,dy){dy=dy||0;let m=-1,q=body.quaternion
  for(const f of VD4.faces){const vi=f.vi,v=[0,1,2].map(k=>VD4.verts[vi[k]]);
    const e1=[v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]],e2=[v[2][0]-v[0][0],v[2][1]-v[0][1],v[2][2]-v[0][2]]
    const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]
    const l=Math.hypot(...n);if(l<1e-4)continue
    const wy=rotY([n[0]/l,n[1]/l,n[2]/l],q);if(Math.abs(wy)>m)m=Math.abs(wy)}
  return m>=CFG.SD}
function world(){const w=new C.World();w.gravity.set(0,CFG.GRAVITY,0)
  w.broadphase=new C.NaiveBroadphase();w.solver.iterations=15
  const gm=new C.Material();gm.friction=1.5;gm.restitution=0.05
  const dm=new C.Material();dm.friction=1.2;dm.restitution=0.05
  w.addContactMaterial(new C.ContactMaterial(gm,dm,{friction:1.5,restitution:0.05}))
  const gb=new C.Body({mass:0,shape:new C.Plane(),material:gm});gb.quaternion.setFromEuler(-Math.PI/2,0,0);w.addBody(gb)
  ;[[3.6,1.5,0,0.1,1.5,4.5],[-3.6,1.5,0,0.1,1.5,4.5],[0,1.5,4.6,3.5,1.5,0.1],[0,1.5,-4.6,3.5,1.5,0.1]]
   .forEach(x=>{const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(x[3],x[4],x[5])),material:gm});b.position.set(x[0],x[1],x[2]);w.addBody(b)})
  return w}
function randQuat(){const u1=Math.random(),u2=Math.random(),u3=Math.random()
  const a=Math.sqrt(1-u1),b=Math.sqrt(u1)
  return[a*Math.sin(2*Math.PI*u2),a*Math.cos(2*Math.PI*u2),b*Math.sin(2*Math.PI*u3),b*Math.cos(2*Math.PI*u3)]}
function eulerQ(x,y,z){const c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2)
  return[s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3]}

function run(shifted,dy,randq){
  const {shape}=d4Shape(shifted)
  const groundCnt={},detectCnt={},pairCnt={}
  for(let i=0;i<N;i++){
    const w=world()
    const mat=new C.Material();mat.friction=1.2;mat.restitution=0.05
    const body=new C.Body({mass:0.8,shape,material:mat,allowSleep:true,
      linearDamping:shifted?0.15:0.25,angularDamping:shifted?0.30:0.50})
    body.position.set(1+Math.random(),3+Math.random()*2,0)
    const q=randq?randQuat():eulerQ(Math.random()*6.283,Math.random()*6.283,Math.random()*6.283)
    body.quaternion.set(q[0],q[1],q[2],q[3])
    body.velocity.set((Math.random()-0.5)*4,1+Math.random()*3,(Math.random()-0.5)*4)
    const ax=[0,1,2].sort(()=>Math.random()-0.5).slice(0,2);const av=[0,0,0]
    ax.forEach(a=>{av[a]=8+Math.random()*4})
    body.angularVelocity.set(av[0],av[1],av[2]);body.wakeUp();w.addBody(body)
    let slow=0,inA=false,done=false
    for(let k=0;k<900&&!done;k++){
      w.step(1/60)
      const s=body.velocity.length(),a=body.angularVelocity.length()
      if(!(s<CFG.SL&&a<CFG.SA)){slow=0;inA=false;continue}
      slow++;if(!inA&&slow>=3)inA=true
      if(inA&&(stability(body,dy)||slow>=CFG.AW)){
        body.sleep()
        const vs=body.shapes[0].vertices;let mY=Infinity
        for(const v of vs){const y=rotV([v.x,v.y,v.z],body.quaternion).y;if(body.position.y+y<mY)mY=body.position.y+y}
        body.position.y-=mY-0.003;body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.sleep()
        done=true}
    }
    // ① 物理：哪个面贴地（面法线最接近 -Y）
    const sp=body.shapes[0]
    let gi=-1,best=1
    sp.faceNormals.forEach((n,fi)=>{
      const wn=rotV([n.x,n.y,n.z],body.quaternion)
      if(wn[1]<best){best=wn[1];gi=fi}})
    groundCnt[gi]=(groundCnt[gi]||0)+1
    // ② 判定
    const dv=detect(body.quaternion,dy)
    detectCnt[dv]=(detectCnt[dv]||0)+1
    const key=`面${gi}→判定${dv}`;pairCnt[key]=(pairCnt[key]||0)+1
  }
  return {groundCnt,detectCnt,pairCnt}
}
const pct=(o,k)=>(100*(o[k]||0)/N).toFixed(1)+'%'

console.log(`══════ D4 物理 vs 判定 分流诊断 (${N} 次) ══════`)
;[{t:'现状',s:false,d:0,r:false},{t:'修复(平移质心+判定表)',s:true,d:0.2325,r:true}].forEach(c=>{
  const r=run(c.s,c.d,c.r)
  console.log(`\n── ${c.t} ──`)
  console.log(`  ① 物理贴地面索引分布: ${[0,1,2,3].map(i=>`面${i}:${pct(r.groundCnt,i)}`).join('  ')}   (应各 25%)`)
  console.log(`  ② 判定返回值分布:     ${[1,2,3,4].map(v=>`${v}:${pct(r.detectCnt,v)}`).join('  ')}   (应各 25%)`)
  console.log(`  ③ 对应关系:`)
  Object.keys(r.pairCnt).sort().forEach(k=>console.log(`     ${k}: ${(100*r.pairCnt[k]/N).toFixed(1)}%`))
})
