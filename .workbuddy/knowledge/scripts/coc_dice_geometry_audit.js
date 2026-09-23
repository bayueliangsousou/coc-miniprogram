// coc-miniprogram 骰子引擎「静态几何审计」
// 参数逐字复制自 /Users/liuqilong/Projects/coc-miniprogram/utils/dice-engine.js
// 检查项：① 物理凸包质心偏移 ② 法线绕序 ③ 是否正多面体(棱长分布)
//         ④ 判定表(VERTEX_DATA)与物理凸包顶点是否同一套 ⑤ 判定面心方向 vs 物理面法线
//         ⑥ 判定锚点长度是否等长 ⑦ 视觉尺寸 vs 物理尺寸
const C = require('/Users/liuqilong/Projects/coc-miniprogram/miniprogram_npm/cannon-es/index.js')

/* ========== 源码常量 ========== */
const DICE_RADIUS = { D3: 0.78, D4: 0.95, D6: 0.78, D8: 0.7, D10: 0.7, D90: 0.7, D12: 0.34, D20: 0.7 }
const DICE_MASS   = { D3: 0.80, D4: 0.80, D6: 1.00, D8: 1.10, D10: 1.20, D90: 1.20, D12: 1.40, D20: 1.60 }

/* ---- VERTEX_DATA（判定表，原文复制）---- */
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
// D90 与 D10 同几何，仅面值不同
VERTEX_DATA.D90 = { verts: VERTEX_DATA.D10.verts,
  faces:[{v:60,vi:[0,2,3,4]},{v:40,vi:[0,4,5,6]},{v:20,vi:[0,6,7,8]},{v:0,vi:[0,8,9,10]},{v:80,vi:[0,10,11,2]},{v:10,vi:[1,3,4,5]},{v:30,vi:[1,5,6,7]},{v:50,vi:[1,7,8,9]},{v:70,vi:[1,9,10,11]},{v:90,vi:[1,11,2,3]}] }

/* ---- 视觉 mesh 顶点（原文复制，含 group.scale）---- */
function meshVerts(type){
  const V=(x,y,z)=>({x,y,z})
  let vs=[], sc=1
  if(type==='D4'){ const L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3); sc=0.060
    vs=[V(0,h,0),V(r,0,0),V(-r/2,0,r*Math.sqrt(3)/2),V(-r/2,0,-r*Math.sqrt(3)/2)] }
  else if(type==='D6'||type==='D3'){ sc=0.90
    vs=[V(.5,.5,.5),V(-.5,.5,.5),V(.5,-.5,.5),V(-.5,-.5,.5),V(.5,.5,-.5),V(-.5,.5,-.5),V(.5,-.5,-.5),V(-.5,-.5,-.5)] }
  else if(type==='D8'){ sc=0.70
    vs=[V(0,0,1),V(0,0,-1),V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0)] }
  else if(type==='D10'||type==='D90'){ sc=0.92; const R=0.765,H=0.0808
    vs=[V(0,R,0),V(0,-R,0)]
    for(let i=0;i<10;i++){const a=i*2*Math.PI/10,y=H*(i%2===0?1:-1);vs.push(V(R*Math.cos(a),y,R*Math.sin(a)))} }
  else if(type==='D12'){ sc=0.34; const phi=(1+Math.sqrt(5))/2,ip=1/phi
    vs=[V(1,1,1),V(1,1,-1),V(1,-1,1),V(1,-1,-1),V(-1,1,1),V(-1,1,-1),V(-1,-1,1),V(-1,-1,-1),
        V(0,phi,ip),V(0,phi,-ip),V(0,-phi,ip),V(0,-phi,-ip),V(ip,0,phi),V(ip,0,-phi),V(-ip,0,phi),V(-ip,0,-phi),
        V(phi,ip,0),V(phi,-ip,0),V(-phi,ip,0),V(-phi,-ip,0)] }
  else if(type==='D20'){ sc=0.88, r=0.8
    const n=(a,b,c)=>{const m=Math.sqrt(a*a+b*b+c*c);return V(a/m*r,b/m*r,c/m*r)}
    vs=[n(0,1,phi20()),n(0,-1,phi20()),n(0,1,-phi20()),n(0,-1,-phi20()),
        n(1,phi20(),0),n(-1,phi20(),0),n(1,-phi20(),0),n(-1,-phi20(),0),
        n(phi20(),0,1),n(-phi20(),0,1),n(phi20(),0,-1),n(-phi20(),0,-1)] }
  function phi20(){return (1+Math.sqrt(5))/2}
  return vs.map(v=>({x:v.x*sc,y:v.y*sc,z:v.z*sc}))
}

/* ---- 物理凸包（原文复制 createConvexBody）---- */
function physVerts(type){
  const v=[]
  if(type==='D4'){ const s=0.060,L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3)
    return [[0,h,0],[r,0,0],[-r/2,0,r*Math.sqrt(3)/2],[-r/2,0,-r*Math.sqrt(3)/2]].map(p=>[p[0]*s,p[1]*s,p[2]*s]) }
  if(type==='D8'){ const s=0.70
    return [[0,0,s],[0,0,-s],[s,0,0],[-s,0,0],[0,s,0],[0,-s,0]] }
  if(type==='D10'||type==='D90'){ const s=1*0.92,r=0.765*s,h=0.0808*s
    v.push([0,r,0],[0,-r,0])
    for(let i=0;i<10;i++){const a=i*2*Math.PI/10,y=h*(i%2===0?1:-1);v.push([r*Math.cos(a),y,r*Math.sin(a)])}
    return v }
  if(type==='D12'){ const sg=0.5*0.87,phi=(1+Math.sqrt(5))/2,ip=1/phi
    return [[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
      [0,phi,ip],[0,phi,-ip],[0,-phi,ip],[0,-phi,-ip],[ip,0,phi],[ip,0,-phi],[-ip,0,phi],[-ip,0,-phi],
      [phi,ip,0],[phi,-ip,0],[-phi,ip,0],[-phi,-ip,0]].map(p=>[p[0]*sg,p[1]*sg,p[2]*sg]) }
  if(type==='D20'){ const phi=(1+Math.sqrt(5))/2,r=0.8*0.88
    return [[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
      [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(p=>{const l=Math.hypot(...p);return [p[0]/l*r,p[1]/l*r,p[2]/l*r]}) }
  return []
}
function physFaces(type){
  const f=[]
  if(type==='D4') return [[0,2,1],[0,3,2],[0,1,3],[1,2,3]]
  if(type==='D8') return [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]]
  if(type==='D10'||type==='D90'){ for(let i=0;i<5;i++){const uc=2+i*2,lc=2+i*2+1,un=2+((i*2+2)%10);f.push([0,uc,lc],[0,lc,un])}
    for(let i=0;i<5;i++){const lc=2+i*2+1,un=2+((i*2+2)%10),ln=2+((i*2+3)%10);f.push([1,lc,un],[1,un,ln])} return f }
  if(type==='D12'){ const pg=[[0,12,2,17,16],[0,16,1,9,8],[0,8,4,14,12],[1,16,17,3,13],[1,13,15,5,9],[2,12,14,6,10],[2,10,11,3,17],[3,11,7,15,13],[4,8,9,5,18],[4,18,19,6,14],[5,15,7,19,18],[6,19,7,11,10]]
    pg.forEach(p=>{f.push([p[0],p[1],p[2]]);f.push([p[0],p[2],p[3]]);f.push([p[0],p[3],p[4]])}); return f }
  if(type==='D20') return [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
  return []
}

/* ---- getFaceCenter（原文逻辑）---- */
function getFaceCenter(type,face,data){
  const vi=face.vi,verts=data.verts
  if(type==='D4') return verts[vi[0]]
  if(type==='D10'||type==='D90'){
    const [v0,v1,v2,v3]=[verts[vi[0]],verts[vi[1]],verts[vi[2]],verts[vi[3]]]
    const c1=[0,1,2].map(k=>(v0[k]+v1[k]+v3[k])/3), c2=[0,1,2].map(k=>(v0[k]+v2[k]+v3[k])/3)
    return [0,1,2].map(k=>(v0[k]+c1[k]+c2[k])/3)
  }
  const c=[0,0,0]; vi.forEach(i=>{const v=verts[i]; c[0]+=v[0];c[1]+=v[1];c[2]+=v[2]})
  return c.map(x=>x/vi.length)
}

/* ========== 工具 ========== */
const norm=p=>{const l=Math.hypot(...p);return p.map(x=>x/l)}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const mean=arr=>[0,1,2].map(k=>arr.reduce((s,v)=>s+v[k],0)/arr.length)

console.log('════════════════════════════════════════════════════════')
console.log(' coc-miniprogram 骰子引擎 · 静态几何审计')
console.log('════════════════════════════════════════════════════════')

const TYPES=['D4','D6','D8','D10','D12','D20','D3']
const report={}

TYPES.forEach(type=>{
  const pv = type==='D6'||type==='D3' ? (()=>{const r=(DICE_RADIUS[type]||0.7)*0.7
      return [[r,r,r],[r,r,-r],[r,-r,r],[r,-r,-r],[-r,r,r],[-r,r,-r],[-r,-r,r],[-r,-r,-r]]})() : physVerts(type)
  const mv = meshVerts(type)
  const vd = VERTEX_DATA[type]
  const R={type}

  console.log(`\n───── ${type} ─────`)

  /* ① 物理质心偏移 */
  const centroid = mean(pv)                     // cannon 实际用的是原点，这里算"真实几何中心"
  const cLen = Math.hypot(...centroid)
  R.centroidOffset = cLen
  console.log(`① 物理凸包几何中心 = (${centroid.map(x=>x.toFixed(4)).join(', ')})  |偏移| = ${cLen.toFixed(4)}`)
  console.log(`   → cannon 用【局部原点】当质心；偏移 ${cLen.toFixed(4)} ${cLen>0.01?'⚠️ 质心错位（不倒翁风险）':'✅ 归位'}`)

  /* ② 顶点到几何中心的距离（是否正多面体：应全等） */
  const radii = pv.map(v=>dist(v,centroid))
  const rMin=Math.min(...radii), rMax=Math.max(...radii)
  R.radiusSpread = (rMax-rMin)/rMax
  console.log(`② 顶点半径 ${rMin.toFixed(4)} ~ ${rMax.toFixed(4)}  相对离散 ${(100*R.radiusSpread).toFixed(2)}% ${R.radiusSpread>0.02?'⚠️ 非正多面体':'✅'}`)

  /* ③ 法线绕序（仅凸包类） */
  if(!(type==='D6'||type==='D3')){
    try{
      const sp=new C.ConvexPolyhedron({vertices:pv.map(v=>new C.Vec3(v[0],v[1],v[2])),faces:physFaces(type)})
      let ok=0,bad=0
      sp.faceNormals.forEach((n,fi)=>{
        const f=physFaces(type)[fi]
        const fc=[0,1,2].map(k=>f.reduce((s,i)=>s+pv[i][k],0)/f.length)
        const out=[0,1,2].map(k=>fc[k]-centroid[k])
        if(dot([n.x,n.y,n.z],out)>0)ok++;else bad++
      })
      R.normals=`朝外 ${ok} / 朝内 ${bad}`
      console.log(`③ 凸包法线绕序：朝外 ${ok} / 朝内 ${bad} ${bad>0?'⚠️':'✅'}`)
      R.normalBad=bad
    }catch(e){ console.log(`③ 凸包构建失败: ${e.message}`); R.normalBad=-1 }
  } else { console.log(`③ 形状为 Box（cannon 原生，无需绕序检查）`); R.normalBad=0 }

  /* ④ 判定表顶点 vs 物理顶点是否同一套（缩放归一化后最近邻匹配） */
  const pvU = pv.map(v=>norm([v[0]-centroid[0],v[1]-centroid[1],v[2]-centroid[2]]))
  const vdC = mean(vd.verts)
  const vdU = vd.verts.map(v=>norm([v[0]-vdC[0],v[1]-vdC[1],v[2]-vdC[2]]))
  let maxNN=0
  vdU.forEach(a=>{ let best=Infinity; pvU.forEach(b=>{const d=dist(a,b); if(d<best)best=d}); if(best>maxNN)maxNN=best })
  R.vdVsPhys = maxNN
  console.log(`④ 判定表顶点 vs 物理顶点（归一化后最近邻最大距离）= ${maxNN.toFixed(4)} ${maxNN>0.05?'❌ 顶点表不匹配！':'✅ 同一套几何'}`)

  /* ⑤ 判定面心方向 vs 物理面法线 */
  let faceDirBad=0, maxAng=0, nCmp=0
  if(!(type==='D6'||type==='D3')){
    let physNorms=[]
    try{
      const sp=new C.ConvexPolyhedron({vertices:pv.map(v=>new C.Vec3(v[0],v[1],v[2])),faces:physFaces(type)})
      physNorms = sp.faceNormals.map(n=>[n.x,n.y,n.z])
    }catch(e){}
    // 把物理三角面归并到"主面"：D12 3 个三角=1 个五边面
    let mainNorms=physNorms
    if(type==='D12'){ mainNorms=[]; for(let i=0;i<physNorms.length;i+=3) mainNorms.push(physNorms[i]) }
    vd.faces.forEach(f=>{
      const fc=norm(getFaceCenter(type,f,vd))
      let best=Infinity
      mainNorms.forEach(n=>{ const d=Math.abs(dot(fc,norm(n))); const ang=Math.acos(Math.min(1,d))*180/Math.PI; if(ang<best)best=ang })
      if(best>maxAng)maxAng=best
      if(best>15)faceDirBad++
      nCmp++
    })
    R.faceDirMaxAngle=maxAng; R.faceDirBad=faceDirBad
    console.log(`⑤ 判定面心方向 vs 物理面法线：最大夹角 ${maxAng.toFixed(1)}°  (偏差面 ${faceDirBad}/${nCmp}) ${faceDirBad>0?'❌ 读数与实际朝上面不符':'✅ 一致'}`)
  } else {
    // Box：面心方向应为 ±轴
    let bad=0,maxA=0
    vd.faces.forEach(f=>{ const fc=norm(getFaceCenter(type,f,vd))
      let best=Infinity; [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(ax=>{
        const ang=Math.acos(Math.min(1,Math.abs(dot(fc,ax))))*180/Math.PI; if(ang<best)best=ang })
      if(best>maxA)maxA=best; if(best>15)bad++ })
    R.faceDirMaxAngle=maxA; R.faceDirBad=bad
    console.log(`⑤ 判定面心方向 vs Box 面法线：最大夹角 ${maxA.toFixed(1)}° ${bad>0?'❌':'✅ 一致'}`)
  }

  /* ⑥ 判定锚点长度（各面 |faceCenter - 判定表质心|）是否等长 */
  const anchors = vd.faces.map(f=>{const fc=getFaceCenter(type,f,vd); return dist(fc,vdC)})
  const aMin=Math.min(...anchors),aMax=Math.max(...anchors)
  R.anchorSpread = (aMax-aMin)/aMax
  console.log(`⑥ 判定锚点长度(到判定表中心) ${aMin.toFixed(4)} ~ ${aMax.toFixed(4)}  相对差 ${(100*R.anchorSpread).toFixed(1)}% ${R.anchorSpread>0.05?'⚠️ 锚点不等长(判定可能偏)':'✅ 等长'}`)

  /* ⑦ 视觉尺寸 vs 物理尺寸 */
  const mvC=mean(mv.map(v=>[v.x,v.y,v.z]))
  const mvR=mv.map(v=>Math.hypot(v.x-mvC[0],v.y-mvC[1],v.z-mvC[2]))
  const physR=radii.reduce((a,b)=>a+b,0)/radii.length
  const mvAvg=mvR.reduce((a,b)=>a+b,0)/mvR.length
  R.visualVsPhys = mvAvg/physR
  console.log(`⑦ 视觉外接半径 ${mvAvg.toFixed(4)} vs 物理 ${physR.toFixed(4)}  比值 ${R.visualVsPhys.toFixed(3)} ${Math.abs(R.visualVsPhys-1)>0.05?'⚠️ 视觉/物理尺寸不符(骰子会浮空或陷入)':'✅ 一致'}`)

  report[type]=R
})

/* ========== 汇总 ========== */
console.log('\n════════════════════════════════════════════════════════')
console.log(' 汇总表')
console.log('════════════════════════════════════════════════════════')
console.log('类型   质心偏移  半径离散  法线朝内  判定表匹配  面心夹角  锚点差  视觉/物理')
TYPES.forEach(t=>{const r=report[t]
  console.log(`${t.padEnd(5)}  ${r.centroidOffset.toFixed(4).padStart(7)}  ${(100*r.radiusSpread).toFixed(1).padStart(6)}%  ${String(r.normalBad).padStart(6)}   ${r.vdVsPhys.toFixed(4).padStart(8)}  ${r.faceDirMaxAngle.toFixed(1).padStart(6)}°  ${(100*r.anchorSpread).toFixed(1).padStart(5)}%  ${r.visualVsPhys.toFixed(3).padStart(7)}`)
})
console.log('\n【判据】质心偏移>0.01=不倒翁风险 | 判定表匹配>0.05=顶点表不一致 | 面心夹角>15°=读数错位')
