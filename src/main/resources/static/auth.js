const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let w = window.innerWidth, h = window.innerHeight;
function resizeCanvas() { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; }
resizeCanvas(); window.addEventListener('resize', resizeCanvas);
const balls = [];
for(let i=0;i<25;i++){
  balls.push({x:Math.random()*w, y:Math.random()*h, r:50+80*Math.random(), dx:(Math.random()-.5)*.4, dy:(Math.random()-.5)*.4, c:[[80,227,193,0.23],[80,200,250,0.23],[255,230,99,0.19],[32,185,124,0.19]][i%4]});
}
function animateBokeh(){
  ctx.clearRect(0,0,w,h);
  for(let b of balls){
    b.x += b.dx; b.y += b.dy;
    if(b.x<0||b.x>w) b.dx*=-1;
    if(b.y<0||b.y>h) b.dy*=-1;
    let g = ctx.createRadialGradient(b.x,b.y,10,b.x,b.y,b.r);
    g.addColorStop(0, `rgba(${b.c[0]},.97)`);
    g.addColorStop(1, `rgba(${b.c[0]},0.0)`);
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,2*Math.PI,!1);
    ctx.fillStyle=g;
    ctx.fill();
  }
  requestAnimationFrame(animateBokeh);
}
animateBokeh();
