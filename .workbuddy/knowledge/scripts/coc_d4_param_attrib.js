// D4 参数归因：在「已修复质心+判定表+随机初态」基础上，
// 逐个把 coc 的物理参数换成三角机构(已验收均匀)的参数，看哪个因素消除残留偏斜。
const C = require('/Users/liuqilong/Projects/coc-miniprogram/miniprogram_npm/cannon-es/index.js')
const N = parseInt(process.argv[2]||'2000',10)

const VD4={verts:[[0.658,0,0],[-0.329,0,0.570],[-0.329,0,-0.570],[0,0.930,0]],
           faces:[{v:1,vi:[3,0,1]},{v:4,vi:[2,3,0]},{v:3,vi:[1,2,3]},{v:2,vi:[0,1,2]}]}
function rotY(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return 2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz}
function rotV(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return[(1-2*(qy*qy+qz*qz))*px+2*(qx*qy-qw*qz)*py+2*(qx*qz+qw*qy)*pz,
         2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz,
         2*(qx*qz-qw*qy)*px+2*(qy*qz+qw*qx)*py+(1-2*(qx*qx+qy*qy))*pz]}
function detect(q,dy){dy=dy||0
  const r=VD4.faces.map(f=>{const v=VD4.verts[f.vi[0]];return{v:f.v,y:rotY([v[0],v[1]-dy,v[2]],q)}})
  r.sort((a,b)=>b.y-a.y);return r[0].v}
function d4Shape(shifted){
  const s=0.060,L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3),cg=shifted?h/4:0
  const rv=[[0,h-cg,0],[r,-cg,0],[-r/2,-cg,r*Math.sqrt(3)/2],[-r/2,-cg,-r*Math.sqrt(3)/2]]
  return new C.ConvexPolyhedron({vertices:rv.map(v=>new C.Vec3(v[0]*s,v[1]*s,v[2]*s)),faces:[[0,2,1],[0,3,2],[0,1,3],[1,2,3]]})
}
function stability(body){let m=-1,q=body.quaternion
  for(const f of VD4.faces){const v=f.vi.map(i=>VD4.verts[i])
    const e1=[v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]],e2=[v[2][0]-v[0][0],v[2][1]-v[0][1],v[2][2]-v[0][2]]
    const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]
    const l=Math.hypot(...n);if(l<1e-4)continue
    const wy=rotY([n[0]/l,n[1]/l,n[2]/l],q);if(Math.abs(wy)>m)m=Math.abs(wy)}
  return m>=0.93}
function randQuat(){const u1=Math.random(),u2=Math.random(),u3=Math.random()
  const a=Math.sqrt(1-u1),b=Math.sqrt(u1)
  return[a*Math.sin(2*Math.PI*u2),a*Math.cos(2*Math.PI*u2),b*Math.sin(2*Math.PI*u3),b*Math.cos(2*Math.PI*u3)]}

// coc 原参数 / 三角机构参数
const COC={g:-30, wallH:1.5, y0:3, y1:2, vh:4, vy0:1, vy1:3, av:4, axes:2}
const SJ ={g:-14, wallH:4.0, y0:2, y1:2, vh:7, vy0:2, vy1:5, av:6, axes:3}

function world(P){
  const w=new C.World();w.gravity.set(0,P.g,0)
  w.broadphase=new C.NaiveBroadphase();w.solver.iterations=15
  const gm=new C.Material();gm.friction=1.5;gm.restitution=0.05
  const dm=new C.Material();dm.friction=1.2;dm.restitution=0.05
  w.addContactMaterial(new C.ContactMaterial(gm,dm,{friction:1.5,restitution:0.05}))
  const gb=new C.Body({mass:0,shape:new C.Plane(),material:gm});gb.quaternion.setFromEuler(-Math.PI/2,0,0);w.addBody(gb)
  const H=P.wallH,T=0.1,AX=3.5,AZ=4.5
  ;[[AX+T,H,0,T,H,AZ],[-AX-T,H,0,T,H,AZ],[0,H,AZ+T,AX,H,T],[0,H,-AZ-T,AX,H,T]]
   .forEach(x=>{const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(x[3],x[4],x[5])),material:gm});b.position.set(x[0],x[1],x[2]);w.addBody(b)})
  return w}
function run(P,shifted,dy,fixed){
  const shape=d4Shape(shifted),cnt={}
  for(let i=0;i<N;i++){
    const w=world(P)
    const mat=new C.Material();mat.friction=1.2;mat.restitution=0.05
    const body=new C.Body({mass:0.8,shape,material:mat,allowSleep:true,linearDamping:0.15,angularDamping:0.30})
    const ang=(i/N)*Math.PI*2
    body.position.set(Math.cos(ang)*(1+Math.random()), P.y0+Math.random()*P.y1, Math.sin(ang)*(1.5+Math.random()*1.5))
    const q=randQuat();body.quaternion.set(q[0],q[1],q[2],q[3])
    body.velocity.set((Math.random()-0.5)*P.vh, P.vy0+Math.random()*P.vy1, (Math.random()-0.5)*P.vh)
    const av=[0,0,0]
    if(P.axes===3){for(let a=0;a<3;a++)av[a]=8+Math.random()*P.av}
    else{const ax=[0,1,2].sort(()=>Math.random()-0.5).slice(0,2);ax.forEach(a=>{av[a]=8+Math.random()*P.av})}
    body.angularVelocity.set(av[0],av[1],av[2]);body.wakeUp();w.addBody(body)
    if(fixed){
      // 三角机构验证脚本的做法：固定步数自然静止，不冻结、不 snap
      for(let k=0;k<700;k++) w.step(1/60)
    } else {
      let slow=0,inA=false,done=false
      for(let k=0;k<900&&!done;k++){
        w.step(1/60)
        const s=body.velocity.length(),a=body.angularVelocity.length()
        if(!(s<0.01&&a<0.01)){slow=0;inA=false;continue}
        slow++;if(!inA&&slow>=3)inA=true
        if(inA&&(stability(body)||slow>=12)){
          body.sleep()
          let mY=Infinity
          for(const v of body.shapes[0].vertices){const y=rotV([v.x,v.y,v.z],body.quaternion)[1]
            if(body.position.y+y<mY)mY=body.position.y+y}
          body.position.y-=mY-0.003;body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.sleep()
          done=true}
      }
    }
    const v=detect(body.quaternion,dy);cnt[v]=(cnt[v]||0)+1
  }
  const e=N/4;let x2=0;[1,2,3,4].forEach(v=>{x2+=((cnt[v]||0)-e)**2/e})
  return {cnt,x2}
}

console.log(`══════ D4 参数归因 (${N} 次/组, 均已修复质心+判定表+随机初态) ══════`)
const cases=[
  ['基线: coc 原参数',            {...COC}],
  ['改重力 -30→-14',              {...COC, g:SJ.g}],
  ['改墙半高 1.5→4.0',            {...COC, wallH:SJ.wallH}],
  ['改初速度(水平7/垂直2~7)',      {...COC, vh:SJ.vh, vy0:SJ.vy0, vy1:SJ.vy1}],
  ['改角速度(三轴 8~14)',          {...COC, axes:3, av:SJ.av}],
  ['全套换成三角机构参数',          {...SJ}],
]
const cases2=[
  ['[A] 未修质心 + coc参数 + 固定700步', {...COC}, false, 0],
  ['[B] 已修质心 + coc参数 + coc循环',   {...COC}, true, 0.2325],
  ['[C] 已修质心 + coc参数 + 固定700步',  {...COC}, true, 0.2325],
  ['[D] 已修质心 + 三角参数 + 固定700步', {...SJ}, true, 0.2325],
  ['[E] 未修质心 + 三角参数 + 固定700步', {...SJ}, false, 0],
]
console.log('（coc循环 = slow检测 + 12帧强制冻结 + snapToGround；固定700步 = 自然静止）')
cases2.forEach(([t,P,sh,dy])=>{
  const fixed = t.includes('固定700步')
  const r=run(P,sh,dy,fixed)
  console.log(`  ${t.padEnd(32)} ${[1,2,3,4].map(v=>`${v}:${(100*(r.cnt[v]||0)/N).toFixed(1)}%`).join(' ')}  卡方 ${r.x2.toFixed(1).padStart(7)} ${r.x2<7.815?'✅':'❌'}`)
})
