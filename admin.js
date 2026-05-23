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
    const dpr = window.devicePixelRatio || 1;
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    c.scale(dpr, dpr);
    
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    createStaticPoints();
}

function createStaticPoints() {
    staticPoints = [];
    // توزيع نقاط بيضاء متزنة ومتباعدة في الخلفية
    const numStaticPoints = Math.floor(window.innerWidth * window.innerHeight * 0.0004); 
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
        this.vx += (tX - this.x) * spring; 
        this.vy += (tY - this.y) * spring;
        this.vx *= friction; 
        this.vy *= friction;
        this.x += this.vx; 
        this.y += this.vy;
    }
}

class Tentacle {
    constructor(angleOffset) {
        this.nodes = []; 
        // 10 عقد فقط لكل رجل للحفاظ على خطوط مشدودة وقصيرة
        for (let i = 0; i < 10; i++) this.nodes.push(new Node(mouse.x, mouse.y));
        this.spring = 0.03 + Math.random() * 0.02; 
        this.friction = 0.8;
        this.angleOffset = angleOffset; // الزاوية الخاصة بالرجل حول الجسم
    }

    update(hX, hY) {
        this.nodes[0].update(hX, hY, this.spring, this.friction);
        for (let i = 1; i < this.nodes.length; i++) {
            this.nodes[i].update(this.nodes[i-1].x, this.nodes[i-1].y, this.spring, this.friction);
        }
    }

    draw(ctx, hX, hY) {
        // رسم الخيط الرئيسي للرجل
        ctx.beginPath(); 
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.nodes.length-1].x, this.nodes[this.nodes.length-1].y);
        
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.3)'; 
        ctx.lineWidth = 1.2; 
        ctx.stroke();

        // امتداد ذكي للطرف يربطه بالنقاط البيضاء القريبة في نفس اتجاه زاوية الرجل
        const tip = this.nodes[this.nodes.length - 1];
        
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.1)';
        for (let p of staticPoints) {
            const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
            // بيربط فقط بالنقاط القريبة جداً (أقل من 80 بكسل) عشان نمنع خيوط الـ Orbit الطويلة
            if (dist < 80) { 
                ctx.beginPath(); 
                ctx.moveTo(tip.x, tip.y); 
                ctx.lineTo(p.x, p.y); 
                ctx.stroke();
            }
        }
    }
}

const tentacles = [];
const numTentacles = 16; // 16 رجل متزنة جداً
for (let i = 0; i < numTentacles; i++) {
    const angleOffset = (i / numTentacles) * Math.PI * 2;
    tentacles.push(new Tentacle(angleOffset)); 
}

function loop() {
    // زيادة مسح الشاشة لـ 0.35 عشان يمسح الخيوط القديمة فوراً ويمنع تراكم الدوائر
    c.fillStyle = 'rgba(3, 3, 5, 0.35)';
    c.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // رسم النقاط البيضاء في الخلفية بثبات
    c.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let p of staticPoints) {
        c.beginPath(); 
        c.arc(p.x, p.y, 0.8, 0, Math.PI*2); 
        c.fill();
    }

    // تتبع ناعم ومباشر للماوس بدون أي دورتين أو تموج ذاتي
    mouse.x += (mouse.targetX - mouse.x) * 0.08; 
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    // الرأس هو مكان الماوس بالظبط
    let headX = mouse.x;
    let headY = mouse.y;

    tentacles.forEach(t => { 
        t.update(headX, headY); 
        t.draw(c, headX, headY); 
    });

    // رسم السنتر الأبيض المضيء
    c.beginPath(); 
    c.arc(headX, headY, 3.5, 0, Math.PI*2);
    c.fillStyle = '#ffffff'; 
    c.fill();

    window.requestAnimFrame(loop);
}

loop();