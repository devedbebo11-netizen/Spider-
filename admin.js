window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
let mouse = { x: false, y: false };
let last_mouse = {};
let targetPoints = [];

function init(elemId) {
    canvas = document.getElementById(elemId);
    c = canvas.getContext('2d');
    
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    
    c.fillStyle = "rgba(30,30,30,1)";
    c.fillRect(0, 0, w, h);
    
    createPoints();
    return { c: c, canvas: canvas };
}

// زيادة توزيع النقاط في الشاشة كلها عشان العنكبوت يتمدد لها
function createPoints() {
    targetPoints = [];
    const numPoints = Math.floor(w * h * 0.0003);
    for (let i = 0; i < numPoints; i++) {
        targetPoints.push({ x: Math.random() * w, y: Math.random() * h });
    }
}

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
        this.length = 14; // زيادة العقد لـ 14 عشان الرجل تطول وتفضل مرنة وانسيابية
        this.nodes = [];
        for(let i=0; i<this.length; i++) {
            this.nodes.push({x: window.innerWidth/2, y: window.innerHeight/2, vx: 0, vy: 0});
        }
    }

    update(headX, headY, speed) {
        this.nodes[0].x = headX;
        this.nodes[0].y = headY;

        // الحسبة الجديدة لتكبير الأرجل وجعلها تفرش لمسافات بعيدة
        for (let i = 1; i < this.length; i++) {
            let node = this.nodes[i];
            let prev = this.nodes[i - 1];
            
            // ضربنا الـ speed في 4.5 وزودنا مسافة ثابتة (25 بكسل) لكل عقدة 
            // عشان الأرجل تفتح وتفرش لبرة مجرد ما الماوس يتحرك حركة بسيطة
            let targetX = prev.x + Math.cos(this.angle) * (speed * 4.5 + 25);
            let targetY = prev.y + Math.sin(this.angle) * (speed * 4.5 + 25);
            
            // فيزياء مرنة وسلسة للتحكم في الأبعاد الجديدة
            node.vx += (targetX - node.x) * 0.06;
            node.vy += (targetY - node.y) * 0.06;
            node.vx *= 0.72;
            node.vy *= 0.72;
            
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
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.5)';
        ctx.lineWidth = 1.8; // تظليل الخط أثقل سيكة عشان يبان فخم وميختفيش في المسافات البعيدة
        ctx.stroke();

        // زيادة مدى اتصال أطراف العنكبوت بالشبكة الخارجية لـ 150 بكسل عشان يلقط النقط البعيدة
        let tip = this.nodes[this.length - 1];
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.18)';
        for(let p of targetPoints) {
            if(dist(tip.x, tip.y, p.x, p.y) < 150) { 
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }
    }
}

// 12 رجل متوازنة عشان يفضل الشكل نظيف وفخم
const tentacles = [];
const totalTentacles = 12;
for (let i = 0; i < totalTentacles; i++) {
    tentacles.push(new ElectricalTentacle((i / totalTentacles) * Math.PI * 2));
}

function loop() {
    c.fillStyle = 'rgba(30, 30, 30, 0.22)'; // تقليل المسح سيكة عشان يدي الـ Trail مظهر أطول وأضخم
    c.fillRect(0, 0, w, h);

    for (let p of targetPoints) {
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath(); c.arc(p.x, p.y, 0.9, 0, Math.PI * 2); c.fill();
    }

    if (mouse.x && last_mouse.x) {
        let speed = dist(last_mouse.x, last_mouse.y, mouse.x, mouse.y);
        
        // رفعنا سقف السرعة الأقصى لـ 90 عشان يمد براحته لأطراف الشاشة الكبيرة
        if(speed > 90) speed = 90; 

        tentacles.forEach(t => {
            t.update(mouse.x, mouse.y, speed);
            t.draw(c);
        });

        c.beginPath();
        c.arc(mouse.x, mouse.y, 4.5, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
    }

    // تنعيم حركة التراجع والرجوع للسنتر عند التوقف
    if (mouse.x && last_mouse.x) {
        last_mouse.x += (mouse.x - last_mouse.x) * 0.08;
        last_mouse.y += (mouse.y - last_mouse.y) * 0.08;
    }

    window.requestAnimFrame(loop);
}

window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    createPoints();
});

loop();