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

function createPoints() {
    targetPoints = [];
    const numPoints = Math.floor(w * h * 0.00025);
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
        this.length = 12; // عدد عقد مثالي للنعومة والتمدد
        this.nodes = [];
        for(let i=0; i<this.length; i++) {
            this.nodes.push({x: window.innerWidth/2, y: window.innerHeight/2, vx: 0, vy: 0});
        }
    }

    update(headX, headY, speed) {
        this.nodes[0].x = headX;
        this.nodes[0].y = headY;

        // المعادلة الذهبية الموزونة: طول مفرود وكبير بس محكوم ومستحيل يكسر
        for (let i = 1; i < this.length; i++) {
            let node = this.nodes[i];
            let prev = this.nodes[i - 1];
            
            // هنا السر: تمدد تدريجي مريح ومبني على طول ثابت (22) + ديناميكي آمن (speed * 1.8)
            let targetX = prev.x + Math.cos(this.angle) * (22 + speed * 1.8);
            let targetY = prev.y + Math.sin(this.angle) * (22 + speed * 1.8);
            
            // فيزياء مرنة ناعمة جداً تمنع الشطحات المفاجئة والعبث البصري
            node.vx += (targetX - node.x) * 0.1; 
            node.vy += (targetY - node.y) * 0.1;
            node.vx *= 0.65; // كبح السرعة الزائدة للحفاظ على انسيابية المنحنى
            node.vy *= 0.65;
            
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
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // التوصيل العاقل والذكي بالنقاط الخلفية
        let tip = this.nodes[this.length - 1];
        ctx.strokeStyle = 'rgba(90, 165, 250, 0.15)';
        for(let p of targetPoints) {
            if(dist(tip.x, tip.y, p.x, p.y) < 90) { // مسافة شبكة معتدلة ورايقة
                ctx.beginPath();
                ctx.moveTo(tip.x, tip.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }
    }
}

// 12 رجل متناسقة وموزعة بدقة دائرية هندسية
const tentacles = [];
const totalTentacles = 12;
for (let i = 0; i < totalTentacles; i++) {
    tentacles.push(new ElectricalTentacle((i / totalTentacles) * Math.PI * 2));
}

function loop() {
    // مسح ناعم ومظبوط بالملي يمنع بقاء أي خيوط ميتة في الخلفية
    c.fillStyle = 'rgba(30, 30, 30, 0.25)';
    c.fillRect(0, 0, w, h);

    for (let p of targetPoints) {
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath(); c.arc(p.x, p.y, 0.8, 0, Math.PI * 2); c.fill();
    }

    if (mouse.x && last_mouse.x) {
        let speed = dist(last_mouse.x, last_mouse.y, mouse.x, mouse.y);
        
        // وضع كابح سقف أقصى للسرعة لمنع الانفجار العبثي للخطوط
        if(speed > 45) speed = 45; 

        tentacles.forEach(t => {
            t.update(mouse.x, mouse.y, speed);
            t.draw(c);
        });

        c.beginPath();
        c.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
    }

    if (mouse.x && last_mouse.x) {
        last_mouse.x += (mouse.x - last_mouse.x) * 0.1;
        last_mouse.y += (mouse.y - last_mouse.y) * 0.1;
    }

    window.requestAnimFrame(loop);
}

window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    createPoints();
});

loop();