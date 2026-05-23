window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
// إعداد الماوس والماوس السابق بالظبط زي السطر 28 في الفيديو
let mouse = { x: false, y: false };
let last_mouse = {};
let targetPoints = [];

function init(elemId) {
    canvas = document.getElementById(elemId);
    c = canvas.getContext('2d');
    
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    // سطر 19 في الفيديو: تهيئة لون الخلفية الشفاف
    c.fillStyle = "rgba(30,30,30,1)";
    c.fillRect(0, 0, w, h);
    
    createPoints();
    return { c: c, canvas: canvas };
}

function createPoints() {
    targetPoints = [];
    // توزيع نقاط الشبكة الساكنة في الخلفية ليتصل بها البرق
    const numPoints = Math.floor(w * h * 0.00025);
    for (let i = 0; i < numPoints; i++) {
        targetPoints.push({ x: Math.random() * w, y: Math.random() * h });
    }
}

// دالة حساب المسافة المكتوبة في السطر 32 بالفيديو
function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

init('canvas');

// تتبع حركة الماوس وحفظ الإحداثيات السابقة والحالية بدقة
window.addEventListener('mousemove', e => {
    if (!mouse.x) {
        last_mouse.x = e.clientX;
        last_mouse.y = e.clientY;
    } else {
        last_mouse.x = mouse.x;
        last_mouse.y = mouse.y;
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('touchmove', e => {
    if(e.touches.length > 0) {
        if (!mouse.x) {
            last_mouse.x = e.touches[0].clientX;
            last_mouse.y = e.touches[0].clientY;
        } else {
            last_mouse.x = mouse.x;
            last_mouse.y = mouse.y;
        }
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
}, { passive: true });

class ElectricalTentacle {
    constructor(angle) {
        this.angle = angle;
        this.length = 10; // عدد العقد لكل خيط كهربائي للحفاظ على النعومة
        this.nodes = [];
        for(let i=0; i<this.length; i++) {
            this.nodes.push({x: window.innerWidth/2, y: window.innerHeight/2, vx: 0, vy: 0});
        }
    }

    update(headX, headY, speed) {
        // العقدة الأولى تثبت في الرأس (مكان الماوس)
        this.nodes[0].x = headX;
        this.nodes[0].y = headY;

        // بقية العقد تندفع للخارج بناءً على سرعة حركة الماوس الحالية
        for (let i = 1; i < this.length; i++) {
            let node = this.nodes[i];
            let prev = this.nodes[i - 1];
            
            // حساب تمدد الخيط الكهربائي في زاويته الفريدة مضروباً في السرعة
            let targetX = prev.x + Math.cos(this.angle) * (speed * 1.6);
            let targetY = prev.y + Math.sin(this.angle) * (speed * 1.6);
            
            // فيزياء الجاذبية المرنة (Spring & Friction) للبرق
            node.vx += (targetX - node.x) * 0.08;
            node.vy += (targetY - node.y) * 0.08;
            node.vx *= 0.7;
            node.vy *= 0.7;
            
            node.x += node.vx;
            node.y += node.vy;
        }
    }

    draw(ctx) {
        // رسم النبضة الكهربائية الانسيابية
        ctx.beginPath();
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.length-1].x, this.nodes[this.length-1].y);
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // التوصيل بالنقاط الخلفية (تأثير تفريغ الشحنة الكهربائية)
        let tip = this.nodes[this.length - 1];
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.15)';
        for(let p of targetPoints) {
            if(dist(tip.x, tip.y, p.x, p.y) < 70) {
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }
    }
}

// إنشاء 16 خيط كهربائي ينتشرون بشكل دائري مثالي حول المركز
const tentacles = [];
const totalTentacles = 16;
for (let i = 0; i < totalTentacles; i++) {
    tentacles.push(new ElectricalTentacle((i / totalTentacles) * Math.PI * 2));
}

function loop() {
    // سر المسح الناعم اللي بيخلق تأثير ذيل الإضاءة الكهربائية بدون تراكم
    c.fillStyle = 'rgba(30, 30, 30, 0.25)';
    c.fillRect(0, 0, w, h);

    // رسم نجوم الخلفية الثابتة
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let p of targetPoints) {
        c.beginPath(); c.arc(p.x, p.y, 0.8, 0, Math.PI * 2); c.fill();
    }

    if (mouse.x && last_mouse.x) {
        // حساب السرعة الحركية الفعلية باستخدام دالة dist المأخوذة من الفيديو
        let speed = dist(last_mouse.x, last_mouse.y, mouse.x, mouse.y);
        
        // وضع حد أقصى للمط عند القفزات السريعة جداً بالماوس
        if(speed > 45) speed = 45; 

        tentacles.forEach(t => {
            t.update(mouse.x, mouse.y, speed);
            t.draw(c);
        });

        // رسم النواة المركزية المضيئة للوحش
        c.beginPath();
        c.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
    }

    window.requestAnimFrame(loop);
}

window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    createPoints();
});

loop();