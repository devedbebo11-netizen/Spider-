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
    const numStaticPoints = Math.floor(window.innerWidth * window.innerHeight * 0.0003); 
    for (let i = 0; i < numStaticPoints; i++) {
        staticPoints.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight });
    }
}

init('canvas');

const updateMouse = (x, y) => { mouse.targetX = x; mouse.targetY = y; };
window.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
window.addEventListener('touchmove', e => { if(e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

mouse.x = mouse.targetX = window.innerWidth / 2; 
mouse.y = mouse.targetY = window.innerHeight / 2;

// --- كلاس القطعة المستقيمة الصارمة (IK Segment) ---
class Segment {
    constructor(length, angle) {
        this.x = 0; this.y = 0;
        this.length = length;
        this.angle = angle;
        this.nextX = 0; this.nextY = 0;
    }
    update() {
        this.nextX = this.x + Math.cos(this.angle) * this.length;
        this.nextY = this.y + Math.sin(this.angle) * this.length;
    }
}

// --- كلاس الرجل الهندسي الصارم ---
class TightLeg {
    constructor(angleOffset, numSegments, segmentLength) {
        this.segments = [];
        this.angleOffset = angleOffset;
        for (let i = 0; i < numSegments; i++) {
            this.segments.push(new Segment(segmentLength, angleOffset));
        }
    }

    // الحسابات العكسية الصارمة تمنع الأرجل من التجمع عشوائياً
    update(baseX, baseY, targetX, targetY) {
        let total = this.segments.length;
        
        // 1. الطرف يلحق الهدف الخارجي المحدد له
        let last = this.segments[total - 1];
        let dx = targetX - last.x;
        let dy = targetY - last.y;
        last.angle = Math.atan2(dy, dx);
        last.x = targetX - Math.cos(last.angle) * last.length;
        last.y = targetY - Math.sin(last.angle) * last.length;
        last.update();

        for (let i = total - 2; i >= 0; i--) {
            let nextSeg = this.segments[i + 1];
            this.segments[i].angle = Math.atan2(nextSeg.y - this.segments[i].y, nextSeg.x - this.segments[i].x);
            this.segments[i].x = nextSeg.x - Math.cos(this.segments[i].angle) * this.segments[i].length;
            this.segments[i].y = nextSeg.y - Math.sin(this.segments[i].angle) * this.segments[i].length;
            this.segments[i].update();
        }

        // 2. إعادة تثبيت القاعدة إجبارياً في جسم العنكبوت لمنع الانفصال والمط
        this.segments[0].x = baseX;
        this.segments[0].y = baseY;
        this.segments[0].update();

        for (let i = 1; i < total; i++) {
            this.segments[i].x = this.segments[i - 1].nextX;
            this.segments[i].y = this.segments[i - 1].nextY;
            this.segments[i].update();
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 0; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].nextX, this.segments[i].nextY);
        }
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // رسم النقطة في نهاية الرجل وربطها بالنقاط البيضاء القريبة فقط
        let last = this.segments[this.segments.length - 1];
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.15)';
        for (let p of staticPoints) {
            let d = Math.hypot(last.nextX - p.x, last.nextY - p.y);
            if (d < 60) {
                ctx.beginPath(); ctx.moveTo(last.nextX, last.nextY); ctx.lineTo(p.x, p.y); ctx.stroke();
            }
        }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(last.nextX, last.nextY, 2, 0, Math.PI*2); ctx.fill();
    }
}

// إنشاء 8 أرجل موزعة بدقة متناهية (4 يمين و4 شمال)
const legs = [];
const numLegs = 8;
for (let i = 0; i < numLegs; i++) {
    // توزيع الأرجل على محيط الجسم بشكل دائري منتظم ثابت
    let angleOffset = (i / numLegs) * Math.PI * 2;
    // كل رجل مكونة من 4 قطع فقط، طول كل قطعة 15 بكسل (للحفاظ على قوام مشدود)
    legs.push(new TightLeg(angleOffset, 4, 15)); 
}

function loop() {
    // زيادة مسح الفريمات لـ 0.45 لقتل الهالات والخطوط القديمة فوراً
    c.fillStyle = 'rgba(3, 3, 5, 0.45)';
    c.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // رسم النقاط البيضاء
    c.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let p of staticPoints) {
        c.beginPath(); c.arc(p.x, p.y, 0.8, 0, Math.PI*2); c.fill();
    }

    // تتبع حاد ومباشر وسريع للماوس
    mouse.x += (mouse.targetX - mouse.x) * 0.12; 
    mouse.y += (mouse.targetY - mouse.y) * 0.12;

    legs.forEach(leg => {
        // حساب المكان الأقصى المسموح لكل رجل للانتشار فيه حول الجسم لمنع التجمع والسيحان
        let targetX = mouse.x + Math.cos(leg.angleOffset) * 55;
        let targetY = mouse.y + Math.sin(leg.angleOffset) * 55;
        
        leg.update(mouse.x, mouse.y, targetX, targetY);
        leg.draw(c);
    });

    // رسم مركز العنكبوت المضيء
    c.beginPath(); c.arc(mouse.x, mouse.y, 4, 0, Math.PI*2);
    c.fillStyle = '#ffffff'; c.fill();

    window.requestAnimFrame(loop);
}

loop();