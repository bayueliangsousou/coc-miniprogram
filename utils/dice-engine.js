// utils/dice-engine.js
// 骰子引擎模块 —— 可嵌入任何页面
const { createScopedThreejs } = require('threejs-miniprogram')

let THREE = null, scene = null, camera = null, renderer = null, canvas = null
let animFrameId = null, isAnimating = false, animResolve = null, initRetryCount = 0
let diceMeshes = [], physicsWorld = null, diceBodies = [], diceStateMap = new Map()
let C = null

/* ============================================================
   Constants
   ============================================================ */
const PHYSICS_CONFIG = { GRAVITY:-30,SLEEP_LINEAR:0.01,SLEEP_ANGULAR:0.01,ADJUST_WINDOW:12,STABLE_DOT:0.93 }
const DICE_RADIUS = { D3:0.78,D4:0.95,D6:0.78,D8:0.7,D10:0.7,D90:0.7,D12:0.34,D20:0.7 }
const DICE_MASS = { D3:0.80,D4:0.80,D6:1.00,D8:1.10,D10:1.20,D90:1.20,D12:1.40,D20:1.60 }
const VERTEX_DATA = {
  D4:{verts:[[0.658,0,0],[-0.329,0,0.570],[-0.329,0,-0.570],[0,0.930,0]],faces:[{v:1,vi:[3,0,1]},{v:4,vi:[2,3,0]},{v:3,vi:[1,2,3]},{v:2,vi:[0,1,2]}]},
  D3:{verts:[[0.5,0.5,0.5],[-0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[0.5,-0.5,-0.5],[-0.5,-0.5,-0.5]],faces:[{v:1,vi:[0,4,6,2]},{v:1,vi:[1,3,7,5]},{v:2,vi:[0,1,5,4]},{v:2,vi:[2,6,7,3]},{v:3,vi:[0,2,3,1]},{v:3,vi:[4,5,7,6]}]},
  D6:{verts:[[0.5,0.5,0.5],[-0.5,0.5,0.5],[0.5,-0.5,0.5],[-0.5,-0.5,0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[0.5,-0.5,-0.5],[-0.5,-0.5,-0.5]],faces:[{v:2,vi:[0,4,6,2]},{v:5,vi:[1,3,7,5]},{v:3,vi:[0,1,5,4]},{v:4,vi:[2,6,7,3]},{v:1,vi:[0,2,3,1]},{v:6,vi:[4,5,7,6]}]},
  D8:{verts:[[0,0,0.7],[0,0,-0.7],[0.7,0,0],[-0.7,0,0],[0,0.7,0],[0,-0.7,0]],faces:[{v:6,vi:[0,2,4]},{v:4,vi:[0,4,3]},{v:2,vi:[0,3,5]},{v:8,vi:[0,5,2]},{v:7,vi:[1,4,2]},{v:1,vi:[1,3,4]},{v:3,vi:[1,5,3]},{v:5,vi:[1,2,5]}]},
  D10:{verts:[[0,0.704,0],[0,-0.704,0],[0.704,0.074,0],[0.570,-0.074,0.414],[0.218,0.074,0.670],[-0.218,-0.074,0.670],[-0.570,0.074,0.414],[-0.704,-0.074,0],[-0.570,0.074,-0.414],[-0.218,-0.074,-0.670],[0.218,0.074,-0.670],[0.570,-0.074,-0.414]],faces:[{v:6,vi:[0,2,3,4]},{v:4,vi:[0,4,5,6]},{v:2,vi:[0,6,7,8]},{v:0,vi:[0,8,9,10]},{v:8,vi:[0,10,11,2]},{v:1,vi:[1,3,4,5]},{v:3,vi:[1,5,6,7]},{v:5,vi:[1,7,8,9]},{v:7,vi:[1,9,10,11]},{v:9,vi:[1,11,2,3]}]},
  D90:{verts:[[0,0.704,0],[0,-0.704,0],[0.704,0.074,0],[0.570,-0.074,0.414],[0.218,0.074,0.670],[-0.218,-0.074,0.670],[-0.570,0.074,0.414],[-0.704,-0.074,0],[-0.570,0.074,-0.414],[-0.218,-0.074,-0.670],[0.218,0.074,-0.670],[0.570,-0.074,-0.414]],faces:[{v:60,vi:[0,2,3,4]},{v:40,vi:[0,4,5,6]},{v:20,vi:[0,6,7,8]},{v:0,vi:[0,8,9,10]},{v:80,vi:[0,10,11,2]},{v:10,vi:[1,3,4,5]},{v:30,vi:[1,5,6,7]},{v:50,vi:[1,7,8,9]},{v:70,vi:[1,9,10,11]},{v:90,vi:[1,11,2,3]}]},
  // D12 正十二面体 - 20个顶点, 12个五边形面
  // 顶点: 从 createD12Mesh() 对齐 (未缩放, 由 group.scale 统一应用)
  D12:{verts:[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],[0,1.618,0.618],[0,1.618,-0.618],[0,-1.618,0.618],[0,-1.618,-0.618],[0.618,0,1.618],[0.618,0,-1.618],[-0.618,0,1.618],[-0.618,0,-1.618],[1.618,0.618,0],[1.618,-0.618,0],[-1.618,0.618,0],[-1.618,-0.618,0]],
  faces:[{v:2,vi:[0,12,2,17,16]},{v:1,vi:[0,16,1,9,8]},{v:3,vi:[0,8,4,14,12]},{v:4,vi:[1,16,17,3,13]},{v:5,vi:[1,13,15,5,9]},{v:10,vi:[2,12,14,6,10]},{v:8,vi:[2,10,11,3,17]},{v:7,vi:[3,11,7,15,13]},{v:6,vi:[4,8,9,5,18]},{v:11,vi:[4,18,19,6,14]},{v:9,vi:[5,15,7,19,18]},{v:12,vi:[6,19,7,11,10]}]},
  // D20 正二十面体 - 12个顶点, 20个三角形面
  // 顶点: 归一化并缩放到 r=0.8 (与 createD20Mesh() 一致)
  D20:{verts:[[0,0.421,0.681],[0,-0.421,0.681],[0,0.421,-0.681],[0,-0.421,-0.681],[0.681,0.421,0],[-0.681,0.421,0],[0.681,-0.421,0],[-0.681,-0.421,0],[0.421,0,0.681],[-0.421,0,0.681],[0.421,0,-0.681],[-0.421,0,-0.681]],
  faces:[{v:1,vi:[0,1,8]},{v:14,vi:[0,8,4]},{v:13,vi:[0,4,5]},{v:2,vi:[0,5,9]},{v:7,vi:[0,9,1]},{v:3,vi:[1,6,8]},{v:11,vi:[8,6,10]},{v:17,vi:[8,10,4]},{v:19,vi:[4,10,2]},{v:5,vi:[4,2,5]},{v:9,vi:[5,2,11]},{v:16,vi:[5,11,9]},{v:4,vi:[9,11,7]},{v:18,vi:[9,7,1]},{v:8,vi:[1,7,6]},{v:12,vi:[3,6,7]},{v:15,vi:[3,7,11]},{v:10,vi:[3,11,2]},{v:20,vi:[3,2,10]},{v:6,vi:[3,10,6]}]}
}

/* ============================================================
   Texture helpers
   ============================================================ */
function canvasToTexture(offCanvas) {
  try {
    if (!THREE) return null
    var w = offCanvas.width, h = offCanvas.height
    var flipped = wx.createOffscreenCanvas({ type:'2d', width:w, height:h })
    var fCtx = flipped.getContext('2d')
    fCtx.setTransform(1,0,0,-1,0,h-1); fCtx.drawImage(offCanvas,0,0)
    var imageData = fCtx.getImageData(0,0,w,h)
    if (!imageData) return null
    var texture = new THREE.DataTexture(imageData.data,w,h,THREE.RGBAFormat)
    texture.flipY=false; texture.magFilter=THREE.LinearFilter
    texture.minFilter=THREE.LinearFilter; texture.generateMipmaps=false; texture.needsUpdate=true
    return texture
  } catch(e) { return null }
}

function makeTex(number,bgColor,textColor,fontSize,size){
  size=size||256
  try {
    var offCanvas=wx.createOffscreenCanvas({type:'2d',width:size,height:size})
    var ctx=offCanvas.getContext('2d'); ctx.fillStyle=bgColor; ctx.fillRect(0,0,size,size)
    ctx.fillStyle=textColor; ctx.font='bold '+fontSize+'px Arial'
    ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(String(number),size/2,size/2)
    return canvasToTexture(offCanvas)
  } catch(e) { return null }
}

/* ============================================================
   Quaternion
   ============================================================ */
function rotateByQuat(v,quat){
  var qx=quat.x||0,qy=quat.y||0,qz=quat.z||0,qw=quat.w||1,px=v[0],py=v[1],pz=v[2]
  return {
    x:(1-2*(qy*qy+qz*qz))*px+2*(qx*qy-qw*qz)*py+2*(qx*qz+qw*qy)*pz,
    y:2*(qx*qy+qw*qz)*px+(1-2*(qx*qx+qz*qz))*py+2*(qy*qz-qw*qx)*pz,
    z:2*(qx*qz-qw*qy)*px+2*(qy*qz+qw*qx)*py+(1-2*(qx*qx+qy*qy))*pz
  }
}

/* ============================================================
   Dice mesh creation
   ============================================================ */
function createD3Mesh(){
  var group=new THREE.Group(),faceNumbers=[1,1,2,2,3,3]
  var materials=faceNumbers.map(function(n){
    var tex=makeTex(n,'#67DD7B','#000000',140)
    return tex?new THREE.MeshLambertMaterial({map:tex,transparent:false}):new THREE.MeshStandardMaterial({color:0x8B4513})
  })
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),materials))
  group.scale.set(0.90,0.90,0.90); group.userData={type:'D3'}; return group
}

function createD4Mesh(){
  var group=new THREE.Group(),L=20,h=Math.sqrt(2/3)*L,r=L/Math.sqrt(3)
  var V=[new THREE.Vector3(0,h,0),new THREE.Vector3(r,0,0),new THREE.Vector3(-r/2,0,r*Math.sqrt(3)/2),new THREE.Vector3(-r/2,0,-r*Math.sqrt(3)/2)]
  var faces=[{vi:[0,3,1]},{vi:[0,1,2]},{vi:[0,2,3]},{vi:[1,3,2]}]
  var D4_TEX_NUMS=[[1,4,2],[1,2,3],[1,3,4],[2,4,3]]
  function makeD4Tex(nums){
    try{
      var sz=256,offCanvas=wx.createOffscreenCanvas({type:'2d',width:sz,height:sz})
      var ctx=offCanvas.getContext('2d');ctx.fillStyle='#67DD7B';ctx.fillRect(0,0,sz,sz)
      var top={x:128,y:20},left={x:20,y:240},right={x:236,y:240}
      var center={x:(top.x+left.x+right.x)/3,y:(top.y+left.y+right.y)/3}
      ctx.strokeStyle='#000000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(right.x,right.y);ctx.lineTo(left.x,left.y);ctx.closePath();ctx.stroke()
      ctx.fillStyle='#000000';ctx.font='bold 48px Arial'
      function drawNumAt(num,fromX,fromY){
        var dx=center.x-fromX,dy=center.y-fromY,angle=Math.atan2(dy,dx),offset=55
        var x=fromX+Math.cos(angle)*offset,y=fromY+Math.sin(angle)*offset
        ctx.save();ctx.translate(x,y);ctx.rotate(angle-Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle'
        ctx.fillText(String(num),0,0);ctx.restore()
      }
      drawNumAt(nums[0],top.x,top.y);drawNumAt(nums[1],right.x,right.y);drawNumAt(nums[2],left.x,left.y)
      return canvasToTexture(offCanvas)
    }catch(e){return null}
  }
  faces.forEach(function(f,idx){
    var a=V[f.vi[0]],b=V[f.vi[1]],c=V[f.vi[2]]
    var geo=new THREE.BufferGeometry()
    geo.addAttribute('position',new THREE.Float32BufferAttribute([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z],3))
    geo.addAttribute('uv',new THREE.Float32BufferAttribute([0.5,0.9,0.9,0.1,0.1,0.1],2))
    geo.setIndex([0,1,2]);geo.computeVertexNormals()
    var tex=makeD4Tex(D4_TEX_NUMS[idx])
    var mat=tex?new THREE.MeshLambertMaterial({map:tex,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}):new THREE.MeshStandardMaterial({color:0x4CAF50,side:THREE.DoubleSide})
    group.add(new THREE.Mesh(geo,mat))
  })
  group.scale.set(0.060,0.060,0.060);group.userData={type:'D4'};return group
}

function createD6Mesh(){
  var group=new THREE.Group(),faceNumbers=[2,5,3,4,1,6]
  var materials=faceNumbers.map(function(n){
    var tex=makeTex(n,'#67DD7B','#000000',140)
    return tex?new THREE.MeshLambertMaterial({map:tex,transparent:false}):new THREE.MeshStandardMaterial({color:0x2196F3})
  })
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),materials))
  group.scale.set(0.90,0.90,0.90);group.userData={type:'D6'};return group
}

function createD8Mesh(){
  var group=new THREE.Group()
  var V=[new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1),new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)]
  var faces=[{vi:[0,2,4],num:6},{vi:[0,4,3],num:4},{vi:[0,3,5],num:2},{vi:[0,5,2],num:8},{vi:[1,4,2],num:7},{vi:[1,3,4],num:1},{vi:[1,5,3],num:3},{vi:[1,2,5],num:5}]
  faces.forEach(function(f){
    var a=V[f.vi[0]],b=V[f.vi[1]],c=V[f.vi[2]]
    var normal=new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b,a),new THREE.Vector3().subVectors(c,a)).normalize()
    var up=Math.abs(normal.y)>0.99?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0)
    var tangent=new THREE.Vector3().crossVectors(normal,up).normalize()
    var bitangent=new THREE.Vector3().crossVectors(normal,tangent)
    function proj(v){return{u:v.dot(tangent),v:v.dot(bitangent)}}
    var pA=proj(a),pB=proj(b),pC=proj(c)
    var cU=(pA.u+pB.u+pC.u)/3,cV=(pA.v+pB.v+pC.v)/3
    var maxD=Math.max(Math.hypot(pA.u-cU,pA.v-cV),Math.hypot(pB.u-cU,pB.v-cV),Math.hypot(pC.u-cU,pC.v-cV))||1
    function toUV(p){return[0.5+0.45*(p.u-cU)/maxD,0.5+0.45*(p.v-cV)/maxD]}
    var geo=new THREE.BufferGeometry()
    geo.addAttribute('position',new THREE.Float32BufferAttribute([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z],3))
    geo.addAttribute('uv',new THREE.Float32BufferAttribute(toUV(pA).concat(toUV(pB),toUV(pC)),2))
    geo.setIndex([0,1,2]);geo.computeVertexNormals()
    var tex=makeTex(f.num,'#67DD7B','#000000',107)
    var mat=tex?new THREE.MeshLambertMaterial({map:tex,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}):new THREE.MeshStandardMaterial({color:0x67DD7B,side:THREE.DoubleSide})
    group.add(new THREE.Mesh(geo,mat))
  })
  group.scale.set(0.70,0.70,0.70);group.userData={type:'D8'};return group
}

function createD10Mesh(mode){
  var group=new THREE.Group(),scale=1,R=0.765*scale,H=0.0808*scale
  function getVertex(i){
    if(i===0)return new THREE.Vector3(0,R,0)
    if(i===1)return new THREE.Vector3(0,-R,0)
    var idx=i-2,angle=(idx*Math.PI*2)/10,y=H*(idx%2===0?1:-1)
    return new THREE.Vector3(R*Math.cos(angle),y,R*Math.sin(angle))
  }
  var kiteFaces=[]
  for(var i=0;i<5;i++){var uc=2+i*2,lc=2+i*2+1,un=2+((i*2+2)%10);kiteFaces.push([0,uc,lc,un])}
  for(var i=0;i<5;i++){var lc=2+i*2+1,un=2+((i*2+2)%10),ln=2+((i*2+3)%10);kiteFaces.push([1,lc,un,ln])}
  var kiteNums=mode==='tens'?[60,40,20,0,80,10,30,50,70,90]:[6,4,2,0,8,1,3,5,7,9]
  kiteFaces.forEach(function(fv,fi){
    var v0=getVertex(fv[0]),v1=getVertex(fv[1]),v2=getVertex(fv[2]),v3=getVertex(fv[3])
    var center=new THREE.Vector3().add(v0).add(v1).add(v2).add(v3).divideScalar(4)
    var tangent=new THREE.Vector3().subVectors(v3,v1).normalize()
    var midEdge=new THREE.Vector3().addVectors(v1,v3).divideScalar(2)
    var bitangent=new THREE.Vector3().subVectors(v0,midEdge).normalize()
    function toLocal2D(v){var dv=new THREE.Vector3().subVectors(v,center);return new THREE.Vector2(dv.dot(tangent),dv.dot(bitangent))}
    var p0=toLocal2D(v0),p1=toLocal2D(v1),p2=toLocal2D(v2),p3=toLocal2D(v3)
    var allPts=[p0,p1,p2,p3]
    var minX=Math.min.apply(null,allPts.map(function(p){return p.x}))
    var maxX=Math.max.apply(null,allPts.map(function(p){return p.x}))
    var minY=Math.min.apply(null,allPts.map(function(p){return p.y}))
    var maxY=Math.max.apply(null,allPts.map(function(p){return p.y}))
    var rangeX=maxX-minX||1,rangeY=maxY-minY||1
    function toUV(p){
      var isTop=fi<5
      var u=isTop?(0.95-0.9*(p.x-minX)/rangeX):(0.05+0.9*(p.x-minX)/rangeX)
      var v=0.25+0.7*(p.y-minY)/rangeY
      return new THREE.Vector2(u,v)
    }
    var geo=new THREE.BufferGeometry()
    var verts=new Float32Array([v0.x,v0.y,v0.z,v1.x,v1.y,v1.z,v2.x,v2.y,v2.z,v0.x,v0.y,v0.z,v2.x,v2.y,v2.z,v3.x,v3.y,v3.z])
    var uvs=new Float32Array([toUV(p0).x,toUV(p0).y,toUV(p1).x,toUV(p1).y,toUV(p2).x,toUV(p2).y,toUV(p0).x,toUV(p0).y,toUV(p2).x,toUV(p2).y,toUV(p3).x,toUV(p3).y])
    geo.addAttribute('position',new THREE.Float32BufferAttribute(verts,3))
    geo.addAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
    geo.setIndex([0,1,2,3,4,5]);geo.computeVertexNormals()
    var tex=makeTex(kiteNums[fi],mode==='tens'?'#67DD7B':'#67DD7B','#000000',100)
    var mat=tex?new THREE.MeshPhongMaterial({map:tex,side:THREE.DoubleSide}):new THREE.MeshStandardMaterial({color:mode==='tens'?0x607D8B:0xF5F5DC,side:THREE.DoubleSide})
    group.add(new THREE.Mesh(geo,mat))
  })
  group.scale.set(0.92,0.92,0.92);group.userData={type:'D10'};return group
}

function createD90Mesh(){return createD10Mesh('tens')}

function createD12Mesh(){
  var group=new THREE.Group(),phi=(1+Math.sqrt(5))/2,invPhi=1/phi
  var verts=[new THREE.Vector3(1,1,1),new THREE.Vector3(1,1,-1),new THREE.Vector3(1,-1,1),new THREE.Vector3(1,-1,-1),new THREE.Vector3(-1,1,1),new THREE.Vector3(-1,1,-1),new THREE.Vector3(-1,-1,1),new THREE.Vector3(-1,-1,-1),new THREE.Vector3(0,phi,invPhi),new THREE.Vector3(0,phi,-invPhi),new THREE.Vector3(0,-phi,invPhi),new THREE.Vector3(0,-phi,-invPhi),new THREE.Vector3(invPhi,0,phi),new THREE.Vector3(invPhi,0,-phi),new THREE.Vector3(-invPhi,0,phi),new THREE.Vector3(-invPhi,0,-phi),new THREE.Vector3(phi,invPhi,0),new THREE.Vector3(phi,-invPhi,0),new THREE.Vector3(-phi,invPhi,0),new THREE.Vector3(-phi,-invPhi,0)]
  var faceVIs=[[0,12,2,17,16],[0,16,1,9,8],[0,8,4,14,12],[1,16,17,3,13],[1,13,15,5,9],[2,12,14,6,10],[2,10,11,3,17],[3,11,7,15,13],[4,8,9,5,18],[4,18,19,6,14],[5,15,7,19,18],[6,19,7,11,10]]
  // D12 面值（与 VERTEX_DATA 一致）
  var faceNums=[2,1,3,4,5,10,8,7,6,11,9,12]
  faceVIs.forEach(function(vi,idx){
    var num=faceNums[idx],v=vi.map(function(i){return verts[i].clone()})
    var center=new THREE.Vector3();v.forEach(function(vx){center.add(vx)});center.divideScalar(5)
    var normal=center.clone().normalize()
    var ref=new THREE.Vector3(1,0,0);if(Math.abs(normal.dot(ref))>0.9)ref=new THREE.Vector3(0,1,0)
    var tangent=ref.clone().cross(normal).normalize(),bitangent=normal.clone().cross(tangent).normalize()
    var pts2D=v.map(function(p){return{x:p.clone().sub(center).dot(tangent),y:p.clone().sub(center).dot(bitangent)}})
    var cx=0,cy=0;pts2D.forEach(function(p){cx+=p.x;cy+=p.y});cx/=pts2D.length;cy/=pts2D.length
    var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity
    pts2D.forEach(function(p){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)})
    var range=Math.max(maxX-minX,maxY-minY||1)*1.1
    var uvs=pts2D.map(function(p){return[0.5-(p.x-cx)/range,0.5-(p.y-cy)/range]})
    var tris=[[0,1,2],[0,2,3],[0,3,4]]
    tris.forEach(function(ti){
      var geo=new THREE.BufferGeometry(),positions=[],uvData=[]
      ti.forEach(function(viIdx){positions.push(v[viIdx].x,v[viIdx].y,v[viIdx].z);uvData.push(uvs[viIdx][0],uvs[viIdx][1])})
      geo.addAttribute('position',new THREE.Float32BufferAttribute(positions,3))
      geo.addAttribute('uv',new THREE.Float32BufferAttribute(uvData,2))
      geo.setIndex([0,1,2]);geo.computeVertexNormals()
      var tex=makeTex(num,'#67DD7B','#000000',140)
      var mat=tex?new THREE.MeshLambertMaterial({map:tex,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}):new THREE.MeshStandardMaterial({color:0x9C27B0,side:THREE.DoubleSide})
      group.add(new THREE.Mesh(geo,mat))
    })
  })
  group.scale.set(0.34,0.34,0.34);group.userData={type:'D12'};return group
}

function createD20Mesh(){
  var group=new THREE.Group(),phi=(1+Math.sqrt(5))/2,r=0.8
  function n(a,b,c){var m=Math.sqrt(a*a+b*b+c*c);return new THREE.Vector3(a/m*r,b/m*r,c/m*r)}
  var verts=[n(0,1,phi),n(0,-1,phi),n(0,1,-phi),n(0,-1,-phi),n(1,phi,0),n(-1,phi,0),n(1,-phi,0),n(-1,-phi,0),n(phi,0,1),n(-phi,0,1),n(phi,0,-1),n(-phi,0,-1)]
  var faceIndices=[[0,1,8],[0,8,4],[0,4,5],[0,5,9],[0,9,1],[1,6,8],[8,6,10],[8,10,4],[4,10,2],[4,2,5],[5,2,11],[5,11,9],[9,11,7],[9,7,1],[1,7,6],[3,6,7],[3,7,11],[3,11,2],[3,2,10],[3,10,6]]
  var nums=[1,14,13,2,7,3,11,17,19,5,9,16,4,18,8,12,15,10,20,6]
  faceIndices.forEach(function(idx,fi){
    var v0=verts[idx[0]],v1=verts[idx[1]],v2=verts[idx[2]]
    var center=new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3)
    var normal=v0.clone().sub(v1).cross(v2.clone().sub(v1)).normalize()
    var ref=new THREE.Vector3(1,0,0);if(Math.abs(normal.dot(ref))>0.9)ref=new THREE.Vector3(0,1,0)
    var tangent=ref.clone().cross(normal).normalize(),bitangent=normal.clone().cross(tangent).normalize()
    function to2D(v){var dv=v.clone().sub(center);return new THREE.Vector2(dv.dot(tangent),dv.dot(bitangent))}
    var p0=to2D(v0),p1=to2D(v1),p2=to2D(v2)
    var cx=(p0.x+p1.x+p2.x)/3,cy=(p0.y+p1.y+p2.y)/3
    var maxDist=Math.max(p0.distanceTo(new THREE.Vector2(cx,cy)),p1.distanceTo(new THREE.Vector2(cx,cy)),p2.distanceTo(new THREE.Vector2(cx,cy)))
    var scale=0.4/(maxDist||1)
    var uvs=[0.5+(p0.x-cx)*scale,0.5-(p0.y-cy)*scale,0.5+(p1.x-cx)*scale,0.5-(p1.y-cy)*scale,0.5+(p2.x-cx)*scale,0.5-(p2.y-cy)*scale]
    var geo=new THREE.BufferGeometry()
    geo.addAttribute('position',new THREE.Float32BufferAttribute([v0.x,v0.y,v0.z,v1.x,v1.y,v1.z,v2.x,v2.y,v2.z],3))
    geo.addAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
    geo.setIndex([0,1,2]);geo.computeVertexNormals()
    var tex=makeTex(nums[fi],'#67DD7B','#000000',67)
    var mat=tex?new THREE.MeshLambertMaterial({map:tex,color:0xffffff,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}):new THREE.MeshStandardMaterial({color:0xF44336,side:THREE.DoubleSide})
    group.add(new THREE.Mesh(geo,mat))
  })
  group.scale.set(0.88,0.88,0.88);group.userData={type:'D20'};return group
}

function createDice(type){
  var mesh
  switch(type){
    case'D3':mesh=createD3Mesh();break
    case'D4':mesh=createD4Mesh();break
    case'D6':mesh=createD6Mesh();break
    case'D8':mesh=createD8Mesh();break
    case'D10':mesh=createD10Mesh('unit');break
    case'D90':mesh=createD90Mesh();break
    case'D12':mesh=createD12Mesh();break
    case'D20':mesh=createD20Mesh();break
    case'D100':
      var tens=createD10Mesh('tens'),unit=createD10Mesh('unit')
      tens.userData={type:'D10',d10Mode:'tens'};unit.userData={type:'D10',d10Mode:'unit'}
      return{isD100:true,children:[tens,unit]}
    default:mesh=createD6Mesh()
  }
  mesh.position.set((Math.random()-0.5)*2,4+Math.random()*2,(Math.random()-0.5)*2)
  mesh.rotation.set(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2)
  return mesh
}

/* ============================================================
   Physics
   ============================================================ */
function initCANNON(){
  if(C)return C
  try{C=require('cannon-es');return C}catch(e){console.error('[CANNON] load fail');return null}
}

function createPhysicsWorld(){
  var C=initCANNON();if(!C)return null
  var world=new C.World();world.gravity.set(0,-30,0)
  world.broadphase=new C.NaiveBroadphase();world.solver.iterations=15
  var groundMat=new C.Material();groundMat.friction=1.5;groundMat.restitution=0.05
  var diceMat=new C.Material();diceMat.friction=1.2;diceMat.restitution=0.05
  world.addContactMaterial(new C.ContactMaterial(groundMat,diceMat,{friction:1.5,restitution:0.05}))
  var gb=new C.Body({mass:0,shape:new C.Plane(),material:groundMat})
  gb.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(gb)
  var AH_X=3.5,AH_Z=4.5,WALL_HALF_H=1.5,WALL_HALF_T=0.1
  var walls=[
    {pos:[AH_X+WALL_HALF_T,WALL_HALF_H,0],half:[WALL_HALF_T,WALL_HALF_H,AH_Z]},
    {pos:[-AH_X-WALL_HALF_T,WALL_HALF_H,0],half:[WALL_HALF_T,WALL_HALF_H,AH_Z]},
    {pos:[0,WALL_HALF_H,AH_Z+WALL_HALF_T],half:[AH_X,WALL_HALF_H,WALL_HALF_T]},
    {pos:[0,WALL_HALF_H,-AH_Z-WALL_HALF_T],half:[AH_X,WALL_HALF_H,WALL_HALF_T]}
  ]
  walls.forEach(function(w){
    var body=new C.Body({mass:0,shape:new C.Box(new C.Vec3(w.half[0],w.half[1],w.half[2])),material:groundMat})
    body.position.set(w.pos[0],w.pos[1],w.pos[2]);world.addBody(body)
  })
  return world
}

function createConvexBody(type,radius){
  var C=initCANNON();if(!C)return null
  var verts=[],faces=[],s,L,h,r,phi,ip,sg,pg,i,a,y,uc,lc,un,ln,rv
  switch(type){
    case'D4':
      s=0.060;L=20;h=Math.sqrt(2/3)*L;r=L/Math.sqrt(3)
      rv=[[0,h,0],[r,0,0],[-r/2,0,r*Math.sqrt(3)/2],[-r/2,0,-r*Math.sqrt(3)/2]]
      verts=rv.map(function(v){return new C.Vec3(v[0]*s,v[1]*s,v[2]*s)})
      faces=[[0,2,1],[0,3,2],[0,1,3],[1,2,3]];break
    case'D8':
      s=0.70;rv=[[0,0,s],[0,0,-s],[s,0,0],[-s,0,0],[0,s,0],[0,-s,0]]
      verts=rv.map(function(v){return new C.Vec3(v[0],v[1],v[2])})
      faces=[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]];break
    case'D10':case'D90':
      s=1*0.92;r=0.765*s;h=0.0808*s;verts.push(new C.Vec3(0,r,0),new C.Vec3(0,-r,0))
      for(i=0;i<10;i++){a=i*Math.PI*2/10;y=h*(i%2===0?1:-1);verts.push(new C.Vec3(r*Math.cos(a),y,r*Math.sin(a)))}
      for(i=0;i<5;i++){uc=2+i*2;lc=2+i*2+1;un=2+((i*2+2)%10);faces.push([0,uc,lc],[0,lc,un])}
      for(i=0;i<5;i++){lc=2+i*2+1;un=2+((i*2+2)%10);ln=2+((i*2+3)%10);faces.push([1,lc,un],[1,un,ln])};break
    case'D12':
      sg=0.5*0.87;phi=(1+Math.sqrt(5))/2;ip=1/phi
      rv=[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],[0,phi,ip],[0,phi,-ip],[0,-phi,ip],[0,-phi,-ip],[ip,0,phi],[ip,0,-phi],[-ip,0,phi],[-ip,0,-phi],[phi,ip,0],[phi,-ip,0],[-phi,ip,0],[-phi,-ip,0]]
      verts=rv.map(function(v){return new C.Vec3(v[0]*sg,v[1]*sg,v[2]*sg)})
      pg=[[0,12,2,17,16],[0,16,1,9,8],[0,8,4,14,12],[1,16,17,3,13],[1,13,15,5,9],[2,12,14,6,10],[2,10,11,3,17],[3,11,7,15,13],[4,8,9,5,18],[4,18,19,6,14],[5,15,7,19,18],[6,19,7,11,10]]
      pg.forEach(function(p){faces.push([p[0],p[1],p[2]],[p[0],p[2],p[3]],[p[0],p[3],p[4]])});break
    case'D20':
      phi=(1+Math.sqrt(5))/2;r=0.8*0.88
      rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
      verts=rv.map(function(v){var l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);return new C.Vec3(v[0]/l*r,v[1]/l*r,v[2]/l*r)})
      faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];break
  }
  try{return new C.ConvexPolyhedron({vertices:verts,faces:faces})}catch(e){console.error('[ConvexBody]',type,e);return null}
}

function checkDiceStability(body,type){
  var data=VERTEX_DATA[type];if(!data||!data.faces)return{isStable:true}
  var threshold=(type==='D10'||type==='D90')?0.55:PHYSICS_CONFIG.STABLE_DOT
  var maxDot=-1,q=body.quaternion
  for(var fi=0;fi<data.faces.length;fi++){
    var f=data.faces[fi],vi=f.vi,verts=data.verts
    if(!vi||vi.length<3)continue
    var v0=verts[vi[0]],v1=verts[vi[1]],v2=verts[vi[2]]
    var e1=[v1[0]-v0[0],v1[1]-v0[1],v1[2]-v0[2]],e2=[v2[0]-v0[0],v2[1]-v0[1],v2[2]-v0[2]]
    var n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]
    var ln=Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);if(ln<0.0001)continue
    var wn=rotateByQuat([n[0]/ln,n[1]/ln,n[2]/ln],q)
    if(Math.abs(wn.y)>maxDot)maxDot=Math.abs(wn.y)
  }
  return{isStable:maxDot>=threshold,confidence:maxDot}
}

function snapToGround(body){
  var shape=body.shapes[0];if(!shape||!shape.vertices)return
  var verts=shape.vertices,q=body.quaternion,minY=Infinity
  for(var i=0;i<verts.length;i++){
    var rv=rotateByQuat([verts[i].x,verts[i].y,verts[i].z],q)
    if(body.position.y+rv.y<minY)minY=body.position.y+rv.y
  }
  body.position.y-=minY-0.003
  body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.sleep()
}

/* ============================================================
   Result calculation
   ============================================================ */
function getFaceCenter(type,face,data){
  var vi=face.vi,verts=data.verts;if(!vi||!verts)return[0,0,0]
  if(type==='D4'){var vp=verts[vi[0]];return vp?[vp[0],vp[1],vp[2]]:[0,0,0]}
  if(type==='D10'||type==='D90'){
    var v0=verts[vi[0]],v1=verts[vi[1]],v2=verts[vi[2]],v3=verts[vi[3]]
    if(!v0||!v1||!v2||!v3)return[0,0,0]
    var c1x=(v0[0]+v1[0]+v3[0])/3,c1y=(v0[1]+v1[1]+v3[1])/3,c1z=(v0[2]+v1[2]+v3[2])/3
    var c2x=(v0[0]+v2[0]+v3[0])/3,c2y=(v0[1]+v2[1]+v3[1])/3,c2z=(v0[2]+v2[2]+v3[2])/3
    return[(v0[0]+c1x+c2x)/3,(v0[1]+c1y+c2y)/3,(v0[2]+c1z+c2z)/3]
  }
  var cx=0,cy=0,cz=0,c=0
  for(var i=0;i<vi.length;i++){var v=verts[vi[i]];if(v){cx+=v[0];cy+=v[1];cz+=v[2];c++}}
  return c>0?[cx/c,cy/c,cz/c]:[0,0,0]
}

function getResultByVertexIntersection(type,mesh){
  var data=VERTEX_DATA[type];if(!data)return 1
  var quat={x:mesh.quaternion.x,y:mesh.quaternion.y,z:mesh.quaternion.z,w:mesh.quaternion.w}
  var centerY=mesh.position.y
  var results=data.faces.map(function(f){
    var fc=getFaceCenter(type,f,data),w=rotateByQuat(fc,quat)
    return{face:f,worldY:centerY+w.y}
  })
  results.sort(function(a,b){return b.worldY-a.worldY})
  return results[0].face.v
}

/* ============================================================
   Public API
   ============================================================ */

function init(cvs, cssWidth, cssHeight) {
  canvas = cvs
  THREE = createScopedThreejs(canvas)
  scene = new THREE.Scene()
  // transparent background —— 角色卡页面内容穿透作为"桌面"
  scene.background = null
  var dpr = (wx.getSystemInfoSync().pixelRatio || 2)
  camera = new THREE.PerspectiveCamera(55, cssWidth / (cssHeight || 1), 0.1, 100)
  camera.position.set(0, 14, 1.76)
  camera.lookAt(0, 0, 1.76)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(dpr)
  renderer.setSize(cssWidth, cssHeight)
  renderer.setClearColor(0x000000, 0)
  // 光照（只照亮骰子，不照亮背景因为已透明）
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  var dir = new THREE.DirectionalLight(0xffffff, 0.7)
  dir.position.set(10, 15, 10); scene.add(dir)
  // 不添加地面/网格 —— 角色卡页面就是"桌面"
  return true
}

function startRenderLoop() {
  function loop() {
    if (!renderer || !scene || !camera) return
    if (isAnimating) updatePhysics()
    renderer.render(scene, camera)
    animFrameId = canvas.requestAnimationFrame(loop)
  }
  loop()
}

function stopRenderLoop() {
  if (animFrameId && canvas) { canvas.cancelAnimationFrame(animFrameId); animFrameId = null }
}

function updatePhysics() {
  if (!physicsWorld || diceBodies.length === 0) return
  physicsWorld.step(1 / 60)
  for (var i = 0; i < diceBodies.length; i++) {
    var body = diceBodies[i], mesh = diceMeshes[i]
    if (!mesh || !body) continue
    mesh.position.set(body.position.x, body.position.y, body.position.z)
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    if (!diceStateMap.has(body)) diceStateMap.set(body, { slowFrames: 0, isFinished: false, type: mesh.userData.type || 'D6' })
    var state = diceStateMap.get(body); if (state.isFinished) continue
    var speed = body.velocity.length(), angSpeed = body.angularVelocity.length()
    var isSlow = speed < PHYSICS_CONFIG.SLEEP_LINEAR && angSpeed < PHYSICS_CONFIG.SLEEP_ANGULAR
    if (!isSlow) { state.slowFrames = 0; state.inAdjust = false; continue }
    state.slowFrames++
    if (!state.inAdjust && state.slowFrames >= 3) state.inAdjust = true
    if (state.inAdjust) {
      var stable = checkDiceStability(body, state.type)
      if (stable.isStable || state.slowFrames >= PHYSICS_CONFIG.ADJUST_WINDOW) {
        body.sleep(); state.isFinished = true
        snapToGround(body); mesh.position.set(body.position.x, body.position.y, body.position.z)
        checkAllDiceFinished()
      }
    }
  }
}

function checkAllDiceFinished() {
  var entries = []; diceStateMap.forEach(function(s, b) { entries.push([b, s]) })
  for (var i = 0; i < entries.length; i++) { if (!entries[i][1].isFinished) return }
  isAnimating = false
  if (animResolve) { animResolve(); animResolve = null }
}

function addDiceToScene(type) {
  if (!scene || !THREE) return null
  var result = createDice(type)
  if (!result) return null
  if (result.isD100) { result.children.forEach(function(m) { scene.add(m); diceMeshes.push(m) }); return result }
  scene.add(result); diceMeshes.push(result); return result
}

function clearAllDice() {
  if (physicsWorld) { diceBodies.forEach(function(b) { try { physicsWorld.removeBody(b) } catch (e) {} }); diceBodies = [] }
  diceStateMap.clear()
  diceMeshes.forEach(function(m) { try { scene.remove(m) } catch (e) {} }); diceMeshes = []
  isAnimating = false
  if (animResolve) { animResolve(); animResolve = null }
}

function startThrowAnimation() {
  if (isAnimating) return Promise.resolve()
  if (diceMeshes.length === 0) return Promise.resolve()
  initCANNON()
  if (physicsWorld) { diceBodies.forEach(function(b) { physicsWorld.removeBody(b) }) }
  physicsWorld = createPhysicsWorld(); diceBodies = []; diceStateMap.clear()
  isAnimating = true
  for (var i = 0; i < diceMeshes.length; i++) {
    var mesh = diceMeshes[i], type = mesh.userData.type || 'D6', radius = DICE_RADIUS[type] || 0.7
    var body = null
    if (type === 'D6' || type === 'D3') {
      var r = radius * 0.7
      var mat = new C.Material(); mat.friction = 1.2; mat.restitution = 0.05
      body = new C.Body({ mass: DICE_MASS[type] || 1, shape: new C.Box(new C.Vec3(r, r, r)), material: mat, allowSleep: true, linearDamping: 0.15, angularDamping: 0.30 })
    } else {
      var shape = createConvexBody(type, radius); if (!shape) continue
      var mat = new C.Material(); mat.friction = 1.2; mat.restitution = 0.05
      body = new C.Body({ mass: DICE_MASS[type] || 1, shape: shape, material: mat, allowSleep: true, linearDamping: type === 'D4' ? 0.25 : 0.15, angularDamping: type === 'D4' ? 0.50 : 0.30 })
    }
    var angle = (i / diceMeshes.length) * Math.PI * 2
    body.position.set(Math.cos(angle) * (1 + Math.random()), 3 + Math.random() * 2, Math.sin(angle) * (1.5 + Math.random() * 1.5))
    body.quaternion.set(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w)
    body.velocity.set((Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4)
    var axes = [0, 1, 2].sort(function() { return Math.random() - 0.5 }).slice(0, 2)
    var av = [0, 0, 0]; axes.forEach(function(a) { av[a] = 8 + Math.random() * 4 })
    body.angularVelocity.set(av[0], av[1], av[2]); body.wakeUp()
    physicsWorld.addBody(body); diceBodies.push(body)
  }
  return new Promise(function(resolve) { animResolve = resolve })
}

function calculateResults() {
  var ret = [], total = 0, rid = 0
  var tens = null, unit = null
  for (var i = 0; i < diceMeshes.length; i++) {
    var m = diceMeshes[i]; if (!m) continue
    var t = m.userData.type || 'D6'; var v
    switch (t) {
      case 'D4': v = getResultByVertexIntersection('D4', m); break
      case 'D3': v = getResultByVertexIntersection('D3', m); break
      case 'D8': v = getResultByVertexIntersection('D8', m); break
      case 'D10':
        if (m.userData.d10Mode === 'tens') { tens = getResultByVertexIntersection('D90', m); continue }
        if (m.userData.d10Mode === 'unit') { unit = getResultByVertexIntersection('D10', m); continue }
        v = getResultByVertexIntersection('D10', m); break
      case 'D90': v = getResultByVertexIntersection('D90', m); break
      case 'D12': v = getResultByVertexIntersection('D12', m); break
      case 'D20': v = getResultByVertexIntersection('D20', m); break
      default: v = getResultByVertexIntersection('D6', m)
    }
    if (typeof v === 'number') { ret.push({ id: rid++, type: t.toLowerCase(), value: v }); total += v }
  }
  if (tens !== null && unit !== null) { var dv = tens + unit; ret.push({ id: rid++, type: 'd100', value: dv }); total += dv }
  return { results: ret, totalSum: total }
}

function getDiceMeshes() { return diceMeshes }
function getIsAnimating() { return isAnimating }

module.exports = {
  init, startRenderLoop, stopRenderLoop,
  addDiceToScene, clearAllDice,
  startThrowAnimation, calculateResults,
  getDiceMeshes, getIsAnimating
}
