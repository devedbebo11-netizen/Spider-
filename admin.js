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
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    createStaticPoints();
}

function createStaticPoints() {
    staticPoints = [];
    const numStaticPoints = Math.floor(w * h * 0.0004); // كثافة متوازنة
    for (let i = 0; i < numStaticPoints; i++) {
        staticPoints.push({ x: Math.random() * w, y: Math.random() * h });
    }
}

init('canvas');

const updateMouse = (x, y) => { mouse.targetX = x; mouse.targetY = y; };
window.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
window.addEventListener('touchmove', e => { if(e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
mouse.x = mouse.targetX = w / 2; mouse.y = mouse.targetY = h / 2;

class Node {
    constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; }
    update(tX, tY, spring, friction) {
        this.vx += (tX - this.x) * spring; this.vy += (tY - this.y) * spring;
        this.vx *= friction; this.vy *= friction;
        this.x += this.vx; this.y += this.vy;
    }
}

class Tentacle {
    constructor(angleOffset) {
        this.nodes = [];
        for (let i = 0; i < 15; i++) this.nodes.push(new Node(mouse.x, mouse.y));
        this.spring = 0.03 + Math.random() * 0.03; this.friction = 0.8 + Math.random() * 0.05;
        this.angleOffset = angleOffset; // زاوية الرجل الفريدة
    }

    update(hX, hY) {
        // --- تعديل هندسي حيوي هنا ---
        // بدل ما أول عقدة تلحق (headX, headY) مباشرة، هي بتلحق نقطة حول الرأس
        // بناءً على زاوية الرجل الفريدة ومسافة فاصلة 15 بكسل.
        const legBaseX = hX + Math.cos(this.angleOffset) * 15;
        const legBaseY = hY + Math.sin(this.angleOffset) * 15;
        this.nodes[0].update(legBaseX, legBaseY, this.spring, this.friction);

        for (let i = 1; i < this.nodes.length; i++) {
            this.nodes[i].update(this.nodes[i-1].x, this.nodes[i-1].y, this.spring, this.friction);
        }
    }

    draw(ctx) {
        // رسم الخيط الرئيسي للرجل
        ctx.beginPath(); ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.nodes.length-1].x, this.nodes[this.nodes.length-1].y);
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

        // ربط الطرف بالنقاط الخلفية بذكاء
        const tip = this.nodes[this.nodes.length - 1];
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.1)';
        for (let p of staticPoints) {
            const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
            if (dist < 100) { 
                ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            }
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI*2); ctx.fill();
    }
}

const tentacles = [];
const numTentacles = 12; // تقليل عدد الأرجل لتفاصيل أوضح
for (let i = 0; i < numTentacles; i++) {
    // حساب زاوية فريدة لكل رجل لضمان انتشار دائري متساوي
    const angleOffset = (i / numTentacles) * Math.PI * 2;
    tentacles.push(new Tentacle(angleOffset)); 
}
let angle = 0;

function loop() {
    c.fillStyle = 'rgba(3, 3, 5, 0.25)'; // تأثير Trail متوازن
    c.fillRect(0, 0, w, h);

    // رسم نقاط الخلفية
    c.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let p of staticPoints) {
        c.beginPath(); c.arc(p.x, p.y, 0.8, 0, Math.PI*2); c.fill();
    }

    // تنعيم حركة مركز الماوس
    mouse.x += (mouse.targetX - mouse.x) * 0.1; 
    mouse.y += (mouse.targetY - mouse.y) * 0.1;
    
    // حركة تموجية بسيطة للرأس
    angle += 0.05;
    let headX = mouse.x + Math.cos(angle) * 10; 
    let headY = mouse.y + Math.sin(angle) * 10;

    // تحديث ورسم كل رجل منفصلة
    tentacles.forEach(t => { 
        t.update(headX, headY); 
        t.draw(c); 
    });

    // رسم النواة المركزية المضيئة
    c.beginPath(); c.arc(headX, headY, 5, 0, Math.PI*2);
    c.fillStyle = '#ffffff'; c.shadowBlur = 20; c.shadowColor = '#6495ed'; c.fill(); c.shadowBlur = 0;

    window.requestAnimFrame(loop);
}

loop();