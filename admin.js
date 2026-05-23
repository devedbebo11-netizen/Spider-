window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
let mouse = { x: false, y: false, targetX: 0, targetY: 0 };
let last_mouse = {};
let stars = [];

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
    createStars();
}

// إنشاء نجوم هادئة في الخلفية متباعدة ومريحة للعين
function createStars() {
    stars = [];
    const numStars = Math.floor(w * h * 0.0002); // كثافة قليلة وفخمة
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            brightness: Math.random() * 0.4 + 0.2
        });
    }
}

init('canvas');

window.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
window.addEventListener('touchmove', e => { 
    if(e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY); 
}, { passive: true });

function updateMouse(x, y) {
    if (!mouse.x) {
        last_mouse.x = x; last_mouse.y = y;
    } else {
        last_mouse.x = mouse.x; last_mouse.y = mouse.y;
    }
    mouse.x = x;
    mouse.y = y;
}

class LightBolt {
    constructor(angle) {
        this.angle = angle;
        this.segments = 5; // عدد قطع قليل جداً عشان نمنع الزحمة والخيوط الكتير
    }

    draw(ctx, headX, headY, speed) {
        // طول النبضة بيعتمد على سرعة الماوس، لو الماوس وقف الطول بيبقى 0 وتختفي فوراً
        let currentLength = speed * 1.5; 
        if (currentLength < 5) return; // إخفاء النبضة تماماً لو الحركة بطيئة

        let currentX = headX;
        let currentY = headY;

        ctx.beginPath();
        ctx.moveTo(currentX, currentY);

        for (let i = 0; i < this.segments; i++) {
            // إضافة كسر فيزياء البرق (انحناء حاد ونظيف مش حلزوني)
            let segX = currentX + Math.cos(this.angle) * (currentLength / this.segments);
            let segY = currentY + Math.sin(this.angle) * (currentLength / this.segments);
            
            // زجزاج خفيف جداً يدي إحساس الكهرباء النظيفة
            if (i > 0 && i < this.segments - 1) {
                segX += (Math.random() - 0.5) * 6;
                segY += (Math.random() - 0.5) * 6;
            }

            ctx.lineTo(segX, segY);
            currentX = segX;
            currentY = segY;
        }

        ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)'; // لون أزرق بريميوم شفاف ونحيف
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // ربط نهاية النبضة بأقرب نجمة في الخلفية بشكل متطاير وسريع
        for (let s of stars) {
            let d = Math.hypot(currentX - s.x, currentY - s.y);
            if (d < 50) {
                ctx.beginPath();
                ctx.moveTo(currentX, currentY);
                ctx.lineTo(s.x, s.y);
                ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
                ctx.stroke();
            }
        }
    }
}

// إنشاء 12 نبضة دائرية متباعدة ونظيفة
const bolts = [];
const numBolts = 12;
for (let i = 0; i < numBolts; i++) {
    bolts.push(new LightBolt((i / numBolts) * Math.PI * 2));
}

function loop() {
    // مسح كلي حاد وسريع جداً يمنع تراكم أي خطوط قديمة أو بكسلة نهائياً
    c.fillStyle = '#050508'; 
    c.fillRect(0, 0, w, h);

    // رسم نجوم الخلفية
    for (let s of stars) {
        c.fillStyle = `rgba(255, 255, 255, ${s.brightness})`;
        c.beginPath(); c.arc(s.x, s.y, 0.8, 0, Math.PI * 2); c.fill();
    }

    if (mouse.x && last_mouse.x) {
        // حساب السرعة الفعلية للماوس
        let speed = Math.hypot(mouse.x - last_mouse.x, mouse.y - last_mouse.y);
        if (speed > 50) speed = 50; // سقف أقصى لمنع التمدد المشوه

        // رسم النبضات النظيفة
        bolts.forEach(b => b.draw(c, mouse.x, mouse.y, speed));

        // النواة المضيئة
        c.beginPath();
        c.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();

        // تقليل السرعة تدريجياً عند التوقف عشان تلم فوراً
        last_mouse.x += (mouse.x - last_mouse.x) * 0.1;
        last_mouse.y += (mouse.y - last_mouse.y) * 0.1;
    }

    window.requestAnimFrame(loop);
}

loop();