window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
// تعريف الماوس والماوس السابق بالظبط زي السطر 28 في الفيديو
let mouse = { x: false, y: false };
let last_mouse = {};
let targetPoints = [];

function init(elemId) {
    canvas = document.getElementById(elemId);
    c = canvas.getContext('2d');
    
    // ضبط الأبعاد المبدئية بالظبط زي السطر 17 و 18 بالفيديو
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    // اللون الخلفي المكتوب في السطر 19
    c.fillStyle = "rgba(30,30,30,1)";
    c.fillRect(0, 0, w, h);
    
    createPoints();
    return { c: c, canvas: canvas };
}

function createPoints() {
    targetPoints = [];
    const numPoints = Math.floor(w * h * 0.0003);
    for (let i = 0; i < numPoints; i++) {
        targetPoints.push({ x: Math.random() * w, y: Math.random() * h });
    }
}

// دالة حساب المسافة المكتوبة أسفل الفيديو (السطر 32): function dist(p1x, p1y, p2x, p2y)
function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

init('canvas');

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
        this.length = 12; // عدد العقد لكل خيط كهربائي
        this.nodes = [];
        for(let i=0; i<this.length; i++) {
            this.nodes.push({x: w/2, y: h/2, vx: 0, vy: 0});
        }
    }

    update(headX, headY, speed) {
        // العقدة الأولى تتبع الرأس مباشرة
        this.nodes[0].x = headX;
        this.nodes[0].y = headY;

        // بقية العقد تتحرك بناءً على سرعة حركة الماوس (الـ speed الفعلي)
        for (let i = 1; i < this.length; i++) {
            let node = this.nodes[i];
            let prev = this.nodes[i - 1];
            
            // حساب الاستهداف مع إضافة تأثير انتشار زاويي بناءً على حركة الماوس
            let targetX = prev.x + Math.cos(this.angle) * (speed * 1.5);
            let targetY = prev.y + Math.sin(this.angle) * (speed * 1.5);
            
            // فيزياء الحركة المتجهة والجاذبية المرنة
            node.vx += (targetX - node.x) * 0.08;
            node.vy += (targetY - node.y) * 0.08;
            node.vx *= 0.75;
            node.vy *= 0.75;
            
            node.x += node.vx;
            node.y += node.vy;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.length - 1; i++) {
            let xc = (this.nodes[i].x + this.nodes[i+1].x) / 2;
            let yc = (this.nodes[i].y + this.nodes[i+1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
        }
        ctx.lineTo(this.nodes[this.length-1].x, this.nodes[this.length-1].y);
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ربط أطراف الوحش الكهربائي بالنقاط الخلفية الساكنة عند التمدد فقط
        let tip = this.nodes[this.length - 1];
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.12)';
        for(let p of targetPoints) {
            if(dist(tip.x, tip.y, p.x, p.y) < 65) {
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }
    }
}

// إنشاء 16 خيط كهربائي دائري مفرود
const tentacles = [];
for (let i = 0; i < 16; i++) {
    tentacles.push(new ElectricalTentacle((i / 16) * Math.PI * 2));
}

function loop() {
    // تفريغ الخلفية بـ Trail ناعم جداً لا يترك شوائب ميتة
    c.fillStyle = 'rgba(3, 3, 5, 0.28)';
    c.fillRect(0, 0, w, h);

    // رسم النجوم/النقاط الخلفية الساكنة
    c.fillStyle = 'rgba(255,255,255,0.4)';
    for (let p of targetPoints) {
        c.beginPath(); c.arc(p.x, p.y, 0.9, 0, Math.PI * 2); c.fill();
    }

    if (mouse.x && last_mouse.x) {
        // حساب سرعة حركة الماوس الفعلية باستخدام دالة المسافة dist
        let speed = dist(last_mouse.x, last_mouse.y, mouse.x, mouse.y);
        
        // منع المط اللانهائي عند الحركات الفجائية السريعة جداً
        if(speed > 40) speed = 40; 

        // تحديث ورسم الخيوط الكهربائية
        tentacles.forEach(t => {
            t.update(mouse.x, mouse.y, speed);
            t.draw(c);
        });

        // رسم السنتر المضيء في مكان الماوس الحالي
        c.beginPath();
        c.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
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