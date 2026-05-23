window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(cb) { window.setTimeout(cb, 1000 / 60); };
})();

let canvas, c, w, h;
let mouse = { x: false, y: false, targetX: 0, targetY: 0 };
let particles = [];

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
    createParticles();
}

// إنشاء جزيئات الغبار المضيء الفخم
function createParticles() {
    particles = [];
    const numParticles = Math.floor(w * h * 0.00025); // كثافة هادية ومريحة للعين
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            baseX: Math.random() * w,
            baseY: Math.random() * h,
            size: Math.random() * 1.2 + 0.5,
            speed: Math.random() * 0.05 + 0.02
        });
    }
}

init('canvas');

window.addEventListener('mousemove', e => { mouse.targetX = e.clientX; mouse.targetY = e.clientY; mouse.x = true; });
window.addEventListener('touchmove', e => { 
    if(e.touches.length > 0) { mouse.targetX = e.touches[0].clientX; mouse.targetY = e.touches[0].clientY; mouse.x = true; }
}, { passive: true });

function loop() {
    // مسح كلي نظيف تماماً يمنع البكسلة والسيحان نهائياً
    c.fillStyle = '#060609'; 
    c.fillRect(0, 0, w, h);

    // تتبع ناعم جداً لمكان الإصبع أو الماوس
    if (mouse.x) {
        mouse.targetX += (mouse.targetX - mouse.targetX) * 0.1;
        mouse.targetY += (mouse.targetY - mouse.targetY) * 0.1;
    }

    // تحديث ورسم الجزيئات
    for (let p of particles) {
        if (mouse.x) {
            // حساب المسافة بين النجم والمصلح/الماوس
            let dx = mouse.targetX - p.x;
            let dy = mouse.targetY - p.y;
            let distance = Math.hypot(dx, dy);
            
            // لو قريبة من إيدك، يحصل انجذاب مغناطيسي مرن وفخم
            if (distance < 120) {
                p.x += dx * p.speed;
                p.y += dy * p.speed;
            } else {
                // العودة للمكان الأصلي بنعومة لو بعدت عنها
                p.x += (p.baseX - p.x) * 0.05;
                p.y += (p.baseY - p.y) * 0.05;
            }
        }

        // رسم النجوم بتوهج شفاف ورايق
        c.fillStyle = 'rgba(100, 180, 255, 0.7)';
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
    }

    // رسم النواة المركزية المضيئة في السنتر (مكان إيدك)
    if (mouse.x) {
        c.beginPath();
        c.arc(mouse.targetX, mouse.targetY, 4, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
        
        // هالة ضوئية خفيفة جداً حول السنتر
        c.beginPath();
        c.arc(mouse.targetX, mouse.targetY, 15, 0, Math.PI * 2);
        c.fillStyle = 'rgba(100, 180, 255, 0.15)';
        c.fill();
    }

    window.requestAnimFrame(loop);
}

loop();