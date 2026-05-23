window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
let staticPoints = [];

function init(elemId) {
    canvas = document.getElementById(elemId);
    c = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return { c: c, canvas: canvas };
}

function resize() {
    // حل مشكلة البكسلة وجودة الـ Retina على الآيفون بالـ Device Pixel Ratio
    const dpr = window.devicePixelRatio || 1;
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    c.scale(dpr, dpr);
    
    // ضبط الحجم الفعلي بالـ CSS
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    createStaticPoints();
}

function createStaticPoints() {
    staticPoints = [];
    // تقليل العدد وضبط التوزيع عشان الحسابات متقفلش المتصفح
    const numStaticPoints = Math.floor(window.innerWidth * window.innerHeight * 0.0005); 
    for (let i = 0; i < numStaticPoints; i++) {
        staticPoints.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight
        });
    }
}

init('canvas');

const updateMouse = (x, y) => { mouse.targetX = x; mouse.targetY = y; };
window.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
window.addEventListener('touchmove', e => { if(e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

mouse.x = mouse.targetX = window.innerWidth / 2; 
mouse.y = mouse.targetY = window.innerHeight / 2;

class Node {
    constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; }
    update(tX, tY, spring, friction) {
        this.vx += (tX - this.x) * spring; this.vy += (tY - this.y) * spring;
        this.vx *= friction; this.vy *= friction;
        this.x += this.vx; this.y += this.vy;
    }
}

class Tentacle {
    constructor(numNodes) {
        this.nodes = []; 
        for (let i = 0; i < numNodes; i++) this.nodes.push(new Node(mouse.x, mouse.y));
        this.spring = 0.02 + Math.random() * 0.03; // حركة أبطأ وأنعم زي الـ Rust
        this.friction = 0.85 + Math.random() * 0.05;
    }

    update(hX, hY) {
        this.nodes[0].update(hX, hY, this.spring, this.friction);
        for (let i = 1; i < this.nodes.length; i++) {
            this.nodes[i].update(this.nodes[i-1].x, this.nodes[i-1].y, this.spring, this.friction);
        }
    }

    draw(ctx) {
        ctx.beginPath(); 
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.nodes.length-1].x, this.nodes[this.nodes.length-1].y);
        
        // لون نيون فخم ورفيع جداً يمنع بهت الشاشة
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.25)'; 
        ctx.lineWidth = 1; 
        ctx.stroke();

        // ربط الأطراف بشكل منسق مع النقاط القريبة دون تداخل عشوائي
        const tip = this.nodes[this.nodes.length - 1];
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.08)';
        for (let p of staticPoints) {
            const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
            if (dist < 100) { // لو النقطة قريبة يعمل خيط طاقة خفيف جداً
                ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            }
        }
    }
}

const tentacles = [];
// زيادة عدد الأرجل لـ 24 مع تقليل العقد لسرعة الـ Rendering
for (let i = 0; i < 24; i++) tentacles.push(new Tentacle(12)); 
let angle = 0;

function loop() {
    // مسح الشاشة بالكامل مع الحفاظ على ذيل خفيف (Motion Blur) لتجنب الخطوط الميتة
    c.fillStyle = 'rgba(3, 3, 5, 0.15)';
    c.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // رسم النجوم/النقاط الخلفية
    c.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let p of staticPoints) {
        c.beginPath(); c.arc(p.x, p.y, 0.8, 0, Math.PI*2); c.fill();
    }

    mouse.x += (mouse.targetX - mouse.x) * 0.05; 
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
    
    angle += 0.02;
    let headX = mouse.x + Math.cos(angle) * 15; 
    let headY = mouse.y + Math.sin(angle) * 15;

    tentacles.forEach(t => { t.update(headX, headY); t.draw(c); });

    // النواة المركزية
    c.beginPath(); c.arc(headX, headY, 3, 0, Math.PI*2);
    c.fillStyle = '#ffffff'; c.fill();

    window.requestAnimFrame(loop);
}

loop();