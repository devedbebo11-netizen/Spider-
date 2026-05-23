window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
let staticPoints = []; // مصفوفة لتخزين النقاط البيضاء الساكنة

function init(elemId) {
    canvas = document.getElementById(elemId);
    c = canvas.getContext('2d');
    resize(); // تعيين الحجم الأولي
    window.addEventListener('resize', resize);
    return { c: c, canvas: canvas };
}

function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    createStaticPoints(); // إعادة إنشاء النقاط عند تغيير حجم الشاشة
}

// إنشاء آلاف النقاط الساكنة العشوائية لتغطية الشاشة بالكامل
function createStaticPoints() {
    staticPoints = [];
    const numStaticPoints = Math.floor(w * h * 0.001); // كثافة النقاط بناءً على حجم الشاشة
    for (let i = 0; i < numStaticPoints; i++) {
        staticPoints.push({
            x: Math.random() * w,
            y: Math.random() * h
        });
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
    constructor(numNodes) {
        this.nodes = []; for (let i = 0; i < numNodes; i++) this.nodes.push(new Node(mouse.x, mouse.y));
        this.spring = 0.04 + Math.random() * 0.04; this.friction = 0.8 + Math.random() * 0.05;
        this.tipLinks = []; // الروابط النشطة من طرف الخيط إلى النقاط الساكنة
    }

    update(hX, hY) {
        this.nodes[0].update(hX, hY, this.spring, this.friction);
        for (let i = 1; i < this.nodes.length; i++) this.nodes[i].update(this.nodes[i-1].x, this.nodes[i-1].y, this.spring, this.friction);
        this.updateTipLinks();
    }

    // ربط طرف كل خيط بأقرب نقاط ساكنة بيضاء
    updateTipLinks() {
        const tip = this.nodes[this.nodes.length - 1];
        this.tipLinks = [];
        let points = [...staticPoints];
        
        // البحث عن أقرب 3 نقاط ساكنة
        for(let j=0; j<3; j++) {
            let nearest = null;
            let minDist = Infinity;
            for(let p of points) {
                const dist = Math.hypot(tip.x - p.x, tip.y - p.y);
                if(dist < minDist && dist < 150) { // يجب أن تكون النقطة قريبة بما يكفي
                    minDist = dist;
                    nearest = p;
                }
            }
            if(nearest) {
                this.tipLinks.push(nearest);
                points.splice(points.indexOf(nearest), 1); // لا نختار نفس النقطة مرتين
            }
        }
    }

    draw(ctx) {
        // رسم الخيط نفسه
        ctx.beginPath(); ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.nodes.length-1].x, this.nodes[this.nodes.length-1].y);
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)'; ctx.lineWidth = 2; ctx.stroke();

        // رسم روابط "بيانات" من طرف الخيط إلى النقاط الساكنة
        const tip = this.nodes[this.nodes.length - 1];
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let p of this.tipLinks) {
            ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            // تمييز النقاط المرتبطة بتوهج أزرق خفيف
            ctx.fillStyle = 'rgba(150, 200, 255, 0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
        }

        // رسم طرف الخيط كنقطة مضيئة
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI*2); ctx.fill();
    }
}

const tentacles = [];
for (let i = 0; i < 16; i++) tentacles.push(new Tentacle(20)); // المزيد من الأرجل لشبكة بيانات أكثر كثافة
let angle = 0;

function loop() {
    // رسم طبقة شفافة لعمل تأثير الـ Trail دون تغطية كل شيء
    c.fillStyle = 'rgba(3, 3, 5, 0.2)';
    c.fillRect(0, 0, w, h);

    // رسم كافة النقاط الساكنة البيضاء الصغيرة في كل فريم (على خلفية سوداء)
    c.fillStyle = 'rgba(255, 255, 255, 0.3)'; // نقاط بيضاء خافتة كشبكة خلفية
    for (let p of staticPoints) {
        c.beginPath(); c.arc(p.x, p.y, 1.2, 0, Math.PI*2); c.fill();
    }

    mouse.x += (mouse.targetX - mouse.x) * 0.1; mouse.y += (mouse.targetY - mouse.y) * 0.1;
    angle += 0.06;
    let headX = mouse.x + Math.cos(angle) * 10; let headY = mouse.y + Math.sin(angle) * 10;

    tentacles.forEach(t => { t.update(headX, headY); t.draw(c); });

    // رسم النواة المركزية المضيئة
    c.beginPath(); c.arc(headX, headY, 5, 0, Math.PI*2);
    c.fillStyle = '#ffffff'; c.shadowBlur = 20; c.shadowColor = '#6495ed'; c.fill(); c.shadowBlur = 0;

    window.requestAnimFrame(loop);
}

loop();