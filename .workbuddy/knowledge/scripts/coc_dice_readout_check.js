// 「读数正确性」专项检查
// 对每个骰子：构造姿态使「视觉 mesh 的第 k 个面」朝上(+Y)，
// 再跑源码判定 getResultByVertexIntersection，看返回值是否等于该面贴的数字。
// 不等 = 玩家在 3D 画面上看到的数字 与 弹窗报出的数字 不一致。
const C = require('/Users/liuqilong/Projects/coc-miniprogram/miniprogram_npm/cannon-es/index.js')

/* ---------- VERTEX_DATA（判定表，原文） ---------- */
const VERTEX_DATA = {
  D4:{verts:[[0.658,0,0],[-0.329,0,0.570],[-0.329,0,-0.570],[0,0.930,0]],faces:[{v:1,vi:[3,0,1]},{v:4,vi:[2,3,0]},{v:3,vi:[1,2,3]},{v:2,vi:[0,1,2]}]},
  D6:{verts:[[0.5,0.5,0.5],[-0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[0.5,-0.5,-0.5],[-0.5,-0.5,-0.5]],faces:[{v:2,vi:[0,4,6,2]},{v:5,vi:[1,3,7,5]},{v:3,vi:[0,1,5,4]},{v:4,vi:[2,6,7,3]},{v:1,vi:[0,2,3,1]},{v:6,vi:[4,5,7,6]}]},
  D8:{verts:[[0,0,0.7],[0,0,-0.7],[0.7,0,0],[-0.7,0,0],[0,0.7,0],[0,-0.7,0]],faces:[{v:6,vi:[0,2,4]},{v:4,vi:[0,4,3]},{v:2,vi:[0,3,5]},{v:8,vi:[0,5,2]},{v:7,vi:[1,4,2]},{v:1,vi:[1,3,4]},{v:3,vi:[1,5,3]},{v:5,vi:[1,2,5]}]},
  D10:{verts:[[0,0.704,0],[0,-0.704,0],[0.704,0.074,0],[0.570,-0.074,0.414],[0.218,0.074,0.670],[-0.218,-0.074,0.670],[-0.570,0.074,0.414],[-0.704,-0.074,0],[-0.570,0.074,-0.414],[-0.218,-0.074,-0.670],[0.218,0.074,-0.670],[0.570,-0.074,-0.414]],faces:[{v:6,vi:[0,2,3,4]},{v:4,vi:[0,4,5,6]},{v:2,vi:[0,6,7,8]},{v:0,vi:[0,8,9,10]},{v:8,vi:[0,10,11,2]},{v:1,vi:[1,3,4,5]},{v:3,vi:[1,5,6,7]},{v:5,vi:[1,7,8,9]},{v:7,vi:[1,9,10,11]},{v:9,vi:[1,11,2,3]}]},
  D12:{verts:[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],[0,1.618,0.618],[0,1.618,-0.618],[0,-1.618,0.618],[0,-1.618,-0.618],[0.618,0,1.618],[0.618,0,-1.618],[-0.618,0,1.618],[-0.618,0,-1.618],[1.618,0.618,0],[1.618,-0.618,0],[-1.618,0.618,0],[-1.618,-0.618,0]],
  faces:[{v:2,vi:[0,12,2,17,16]},{v:1,vi:[0,16,1,9,8]},{v:3,vi:[0,8,4,14,12]},{v:4,vi:[1,16,17,3,13]},{v:5,vi:[1,13,15,5,9]},{v:10,vi:[2,12,14,6,10]},{v:8,vi:[2,10,11,3,17]},{v:7,vi:[3,11,7,15,13]},{v:6,vi:[4,8,9,5,18]},{v:11,vi:[4,18,19,6,14]},{v:9,vi:[5,15,7,19,18]},{v:12,vi:[6,19,7,11,10]}]},
  D20:{verts:[[0,0.421,0.681],[0,-0.421,0.681],[0,0.421,-0.681],[0,-0.421,-0.681],[0.681,0.421,0],[-0.681,0.421,0],[0.681,-0.421,0],[-0.681,-0.421,0],[0.421,0,0.681],[-0.421,0,0.681],[0.421,0,-0.681],[-0.421,0,-0.681]],
  faces:[{v:1,vi:[0,1,8]},{v:14,vi:[0,8,4]},{v:13,vi:[0,4,5]},{v:2,vi:[0,5,9]},{v:7,vi:[0,9,1]},{v:3,vi:[1,6,8]},{v:11,vi:[8,6,10]},{v:17,vi:[8,10,4]},{v:19,vi:[4,10,2]},{v:5,vi:[4,2,5]},{v:9,vi:[5,2,11]},{v:16,vi:[5,11,9]},{v:4,vi:[9,11,7]},{v:18,vi:[9,7,1]},{v:8,vi:[1,7,6]},{v:12,vi:[3,6,7]},{v:15,vi:[3,7,11]},{v:10,vi:[3,11,2]},{v:20,vi:[3,2,10]},{v:6,vi:[3,10,6]}]}
}

/* ---------- 视觉 mesh：顶点 + 面 + 面上印的数字 ---------- */
const MESH = {}
MESH.D4 = (()=>{
  const L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3)
  const V=[[0,h,0],[r,0,0],[-r/2,0,r*Math.sqrt(3)/2],[-r/2,0,-r*Math.sqrt(3)/2]]
  const faces=[[0,3,1],[0,1,2],[0,2,3],[1,3,2]]
  // D4 是「顶点朝上」读法：每个顶点处的角标数字
  // D4_TEX_NUMS=[[1,4,2],[1,2,3],[1,3,4],[2,4,3]] -> P0=1 P1=2 P2=3 P3=4
  return {verts:V, faces, vertexNums:{0:1,1:2,2:3,3:4}, mode:'vertex'}
})()
MESH.D6 = {verts:[[.5,.5,.5],[-.5,.5,.5],[.5,-.5,.5],[-.5,-.5,.5],[.5,.5,-.5],[-.5,.5,-.5],[.5,-.5,-.5],[-.5,-.5,-.5]],
  faces:[[0,4,6,2],[1,3,7,5],[0,1,5,4],[2,6,7,3],[0,2,3,1],[4,5,7,6]], faceNums:[2,5,3,4,1,6], mode:'face'}
MESH.D8 = {verts:[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]],
  faces:[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]],
  faceNums:[6,4,2,8,7,1,3,5], mode:'face'}
MESH.D10 = (()=>{
  const R=0.765,H=0.0808
  const V=[[0,R,0],[0,-R,0]]
  for(let i=0;i<10;i++){const a=i*2*Math.PI/10,y=H*(i%2===0?1:-1);V.push([R*Math.cos(a),y,R*Math.sin(a)])}
  const faces=[]
  for(let i=0;i<5;i++){const uc=2+i*2,lc=2+i*2+1,un=2+((i*2+2)%10);faces.push([0,uc,lc,un])}
  for(let i=0;i<5;i++){const lc=2+i*2+1,un=2+((i*2+2)%10),ln=2+((i*2+3)%10);faces.push([1,lc,un,ln])}
  return {verts:V,faces,faceNums:[6,4,2,0,8,1,3,5,7,9], mode:'face'}
})()
MESH.D12 = (()=>{
  const phi=(1+Math.sqrt(5))/2,ip=1/phi
  const V=[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
    [0,phi,ip],[0,phi,-ip],[0,-phi,ip],[0,-phi,-ip],[ip,0,phi],[ip,0,-phi],[-ip,0,phi],[-ip,0,-phi],
    [phi,ip,0],[phi,-ip,0],[-phi,ip,0],[-phi,-ip,0]]
  const faces=[[0,12,2,17,16],[0,16,1,9,8],[0,8,4,14,12],[1,16,17,3,13],[1,13,15,5,9],[2,12,14,6,10],
    [2,10,11,3,17],[3,11,7,15,13],[4,8,9,5,18],[4,18,19,6,14],[5,15,7,19,18],[6,19,7,11,10]]
  return {verts:V,faces,faceNums:[2,1,3,4,5,10,8,7,6,11,9,12], mode:'face'}
})()
MESH.D20 = (()=>{
  const phi=(1+Math.sqrt(5))/2,r=0.8
  const n=(a,b,c)=>{const m=Math.hypot(a,b,c);return [a/m*r,b/m*r,c/m*r]}
  const V=[n(0,1,phi),n(0,-1,phi),n(0,1,-phi),n(0,-1,-phi),n(1,phi,0),n(-1,phi,0),n(1,-phi,0),n(-1,-phi,0),
    n(phi,0,1),n(-phi,0,1),n(phi,0,-1),n(-phi,0,-1)]
  const faces=[[0,1,8],[0,8,4],[0,4,5],[0,5,9],[0,9,1],[1,6,8],[8,6,10],[8,10,4],[4,10,2],[4,2,5],
    [5,2,11],[5,11,9],[9,11,7],[9,7,1],[1,7,6],[3,6,7],[3,7,11],[3,11,2],[3,2,10],[3,10,6]]
  return {verts:V,faces,faceNums:[1,14,13,2,7,3,11,17,19,5,9,16,4,18,8,12,15,10,20,6], mode:'face'}
})()

/* ---------- 判定（原文） ---------- */
function rotateByQuat(p,q){const[px,py,pz]=p,{x:qx,y:qy,z:qz,w:qw}=q
  return{x:(1-2*(qy*qy+qz*qz))*px+2*(qx*qy-qw*qz)*py+2*(qx*qz+qw*qy)*pz,
         y:2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz,
         z:2*(qx*qz-qw*qy)*px+2*(qy*qz+qw*qx)*py+(1-2*(qx*qx+qy*qy))*pz}}
function getFaceCenter(type,face,data){const vi=face.vi,verts=data.verts
  if(type==='D4')return verts[vi[0]]
  if(type==='D10'||type==='D90'){const v0=verts[vi[0]],v1=verts[vi[1]],v2=verts[vi[2]],v3=verts[vi[3]]
    const c1=[0,1,2].map(k=>(v0[k]+v1[k]+v3[k])/3),c2=[0,1,2].map(k=>(v0[k]+v2[k]+v3[k])/3)
    return[0,1,2].map(k=>(v0[k]+c1[k]+c2[k])/3)}
  const c=[0,0,0];vi.forEach(i=>{const v=verts[i];c[0]+=v[0];c[1]+=v[1];c[2]+=v[2]});return c.map(x=>x/vi.length)}
function detect(type,q){const data=VERTEX_DATA[type]
  const r=data.faces.map(f=>({v:f.v,y:rotateByQuat(getFaceCenter(type,f,data),q).y}))
  r.sort((a,b)=>b.y-a.y);return r[0].v}

/* ---------- 工具 ---------- */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]]
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=p=>{const l=Math.hypot(...p);return p.map(x=>x/l)}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const centerOf=(V,idx)=>[0,1,2].map(k=>idx.reduce((s,i)=>s+V[i][k],0)/idx.length)
// 把向量 src 旋转到 target 的四元数
function quatFromTo(src,target){
  src=norm(src);target=norm(target)
  const d=dot(src,target)
  if(d>0.999999)return{x:0,y:0,z:0,w:1}
  if(d<-0.999999){ // 180 度：任取垂直轴
    let ax=cross([1,0,0],src); if(Math.hypot(...ax)<1e-6)ax=cross([0,1,0],src)
    ax=norm(ax); return{x:ax[0],y:ax[1],z:ax[2],w:0}}
  const c=cross(src,target)
  const s=Math.sqrt((1+d)*2)
  return{x:c[0]/s,y:c[1]/s,z:c[2]/s,w:s/2}
}

console.log('════════════════════════════════════════════════════════')
console.log(' 读数正确性检查：3D 画面朝上的面 vs 判定返回值')
console.log('════════════════════════════════════════════════════════')

;['D4','D6','D8','D10','D12','D20'].forEach(type=>{
  const M=MESH[type], VD=VERTEX_DATA[type]
  console.log(`\n───── ${type} ─────`)
  let bad=0,total=0
  if(M.mode==='vertex'){
    // D4：顶点朝上读顶点数字
    Object.keys(M.vertexNums).forEach(vi=>{
      const v=M.verts[+vi]
      const q=quatFromTo(v,[0,1,0])
      const got=detect(type,q), want=M.vertexNums[+vi]
      const ok=got===want; if(!ok)bad++; total++
      console.log(`  顶点P${vi} 朝上 → 画面显示 ${want}, 判定返回 ${got}  ${ok?'✅':'❌ 不一致'}`)
    })
  } else {
    M.faces.forEach((f,k)=>{
      const fc=centerOf(M.verts,f)
      const n=norm(fc)                        // 面心方向 = 面法线方向（对中心对称多面体）
      const q=quatFromTo(n,[0,1,0])           // 让该面朝上
      const got=detect(type,q), want=M.faceNums[k]
      const ok=got===want; if(!ok)bad++; total++
      console.log(`  面${String(k).padStart(2)}[${f.join(',')}] 朝上 → 画面显示 ${String(want).padStart(2)}, 判定返回 ${String(got).padStart(2)}  ${ok?'✅':'❌ 不一致'}`)
    })
  }
  console.log(`  → 不一致 ${bad}/${total} ${bad>0?'❌ 弹窗数字与画面不符':'✅ 全部一致'}`)
})

/* D20 顶点表专项：是否正二十面体 */
console.log('\n════════════════════════════════════════════════════════')
console.log(' D20 顶点表专项诊断')
console.log('════════════════════════════════════════════════════════')
const A=VERTEX_DATA.D20.verts, B=MESH.D20.verts
function radiusCheck(vs,tag){
  const c=[0,1,2].map(k=>vs.reduce((s,v)=>s+v[k],0)/vs.length)
  const rs=vs.map(v=>Math.hypot(v[0]-c[0],v[1]-c[1],v[2]-c[2]))
  console.log(`${tag}: 中心(${c.map(x=>x.toFixed(4))}) 半径 ${Math.min(...rs).toFixed(4)}~${Math.max(...rs).toFixed(4)}`)
  // 每个顶点的邻居距离分布（正二十面体: 5 个棱 + 5 个次邻 + 1 个对点）
  const per=vs.map(v=>vs.map(w=>Math.hypot(v[0]-w[0],v[1]-w[1],v[2]-w[2])).filter(d=>d>1e-6).sort((x,y)=>x-y))
  const fifth=per.map(p=>p[4])
  console.log(`  每个顶点第5近邻距离: ${Math.min(...fifth).toFixed(4)}~${Math.max(...fifth).toFixed(4)} ${(Math.max(...fifth)-Math.min(...fifth))>0.01?'❌ 不等长 → 不是正二十面体':'✅ 等长'}`)
  // 唯一距离值个数
  const uniq=new Set(per[0].map(d=>d.toFixed(3)))
  console.log(`  顶点0 到其他11点的不同距离数: ${uniq.size} (正二十面体应为 3: 棱/次邻/对点) ${uniq.size===3?'✅':'❌'}`)
  console.log(`  具体: ${[...uniq].join(', ')}`)
  return c
}
radiusCheck(A,'判定表 VERTEX_DATA.D20')
radiusCheck(B,'视觉   createD20Mesh  ')
// 两表是否为同一组点
let maxNN=0
A.forEach(a=>{let best=Infinity;B.forEach(b=>{const d=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);if(d<best)best=d});if(best>maxNN)maxNN=best})
console.log(`\n两表最近邻最大距离 = ${maxNN.toFixed(4)}  ${maxNN>0.02?'❌ 判定表与视觉不是同一组顶点':'✅ 同一组顶点'}`)
