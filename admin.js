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
    // تقليل الكثافة عشان الشاشة تكون رايقة ومريحة للعين
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

class SpiderLeg {
    constructor(side, index, totalLegsPerSide) {
        this.nodes = [];
        // 7 عقد لكل رجلเพื่อให้ حركتها متمفصلة مثل العنكبوت الحقيقي
        for (let i = 0; i < 7; i++) this.nodes.push(new Node(mouse.x, mouse.y));
        
        this.spring = 0.06; 
        this.friction = 0.75;
        
        // توزيع زوايا الأرجل بشكل طبيعي (أرجل للأمام وأرجل للخلف)
        const baseAngle = side === 'left' ? Math.PI : 0;
        const spread = Math.PI / 3; // مدى انتشار الأرجل
        this.angle = baseAngle + (index / (totalLegsPerSide - 1) - 0.5) * spread;
        
        // إحداثيات خطوة الرجل الحالية والمستهدفة
        this.stepX = mouse.x;
        this.stepY = mouse.y;
    }

    update(bodyX, bodyY, bodyAngle) {
        // 1. تحديد قاعدة الرجل بناءً على جسم العنكبوت وزاويته
        const legBaseX = bodyX + Math.cos(this.angle + bodyAngle) * 12;
        const legBaseY = bodyY + Math.sin(this.angle + bodyAngle) * 12;
        
        // 2. حساب المكان المثالي البصري للرجل على الأرض (الهدف الطبيعي للرجل)
        const idealX = legBaseX + Math.cos(this.angle + bodyAngle) * 70;
        const idealY = legBaseY + Math.sin(this.angle + bodyAngle) * 70;
        
        // 3. ذكاء الخطوة: لو الرجل بعدت عن مكانها المثالي، تبحث عن أقرب نقطة بيضاء وتاخد خطوة سريعة لها
        const distToIdeal = Math.hypot(this.stepX - idealX, this.stepY - idealY);
        if (distToIdeal > 45) { 
            let nearestPoint = { x: idealX, y: idealY };
            let minDist = Infinity;
            
            for (let p of staticPoints) {
                const d = Math.hypot(idealX - p.x, idealY - p.y);
                if (d < minDist) {
                    minDist = d;
                    nearestPoint = p;
                }
            }
            this.stepX = nearestPoint.x;
            this.stepY = nearestPoint.y;
        }

        // 4. تحديث حركة العقد الفيزيائية (الرجل تتبع قاعدة الجسم وتثبت في نقطة الخطوة)
        this.nodes[0].x = legBaseX;
        this.nodes[0].y = legBaseY;
        
        for (let i = 1; i < this.nodes.length - 1; i++) {
            this.nodes[i].update(this.nodes[i-1].x, this.nodes[i-1].y, this.spring, this.friction);
        }
        
        // الطرف الأخير من الرجل يثبت تماماً في الأرض (نقطة الخطوة)
        const last = this.nodes[this.nodes.length - 1];
        last.update(this.stepX, this.stepY, 0.2, 0.6);
    }

    draw(ctx) {
        ctx.beginPath(); 
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.nodes.length - 1].x, this.nodes[this.nodes.length - 1].y);
        
        ctx.strokeStyle = 'rgba(90, 160, 255, 0.75)'; // خطوط زرقاء واضحة ونحيفة
        ctx.lineWidth = 1.8; 
        ctx.stroke();
    }
}

// إنشاء العنكبوت بـ 8 أرجل فقط (4 يمين و 4 شمال) لتحديد المظهر
const legs = [];
for (let i = 0; i < 4; i++) legs.push(new SpiderLeg('left', i, 4));
for (let i = 0; i < 4; i++) legs.push(new SpiderLeg('right', i, 4));

let lastBodyX = mouse.x;
let lastBodyY = mouse.y;

function loop() {
    // مسح قوي لإزالة أي زحمة خيوط قديمة وضمان نظافة الشاشة
    c.fillStyle = 'rgba(3, 3, 5, 0.45)';
    c.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // رسم نقاط الخلفية بشكل هادئ جداً
    c.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let p of staticPoints) {
        c.beginPath(); c.arc(p.x, p.y, 0.8, 0, Math.PI*2); c.fill();
    }

    // حركة الجسم
    mouse.x += (mouse.targetX - mouse.x) * 0.06; 
    mouse.y += (mouse.targetY - mouse.y) * 0.06;

    // حساب زاوية اتجاه جسم العنكبوت بناءً على حركته (عشان يلف بوجهه مع اتجاه الماوس)
    const dx = mouse.x - lastBodyX;
    const dy = mouse.y - lastBodyY;
    const bodyAngle = Math.atan2(dy, dx);
    
    if (Math.hypot(dx, dy) > 0.5) {
        lastBodyX += dx * 0.8;
        lastBodyY += dy * 0.8;
    }

    // تحديث ورسم الـ 8 أرجل الواضحة
    legs.forEach(leg => { 
        leg.update(mouse.x, mouse.y, bodyAngle); 
        leg.draw(c); 
    });

    // رسم جسم العنكبوت (نواة بيضاء ممتدة قليلاً كالرأس والصدر)
    c.beginPath(); 
    c.arc(mouse.x, mouse.y, 5, 0, Math.PI*2);
    c.fillStyle = '#ffffff'; 
    c.shadowBlur = 10;
    c.shadowColor = '#5aa0ff';
    c.fill();
    c.shadowBlur = 0;

    window.requestAnimFrame(loop);
}

loop();