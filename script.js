const canvas = document.getElementById('spiderCanvas');
const ctx = canvas.getContext('2d');

// ضبط أبعاد الـ Canvas لتناسب الشاشة بالكامل
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// إحداثيات الماوس (تبدأ من مركز الشاشة)
const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
};

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// تتبع اللمس للموبايل
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
});

// --- كلاس يمثل قطعة واحدة من رجل العنكبوت ---
class Segment {
    constructor(x, y, length, angle) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = angle;
        this.nextX = this.x + Math.cos(this.angle) * this.length;
        this.nextY = this.y + Math.sin(this.angle) * this.length;
    }

    // حساب الاتجاه نحو الهدف (الحركة العكسية)
    follow(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        this.angle = Math.atan2(dy, dx);
        
        // شد القطعة باتجاه الهدف
        this.x = targetX - Math.cos(this.angle) * this.length;
        this.y = targetY - Math.sin(this.angle) * this.length;
    }

    update() {
        this.nextX = this.x + Math.cos(this.angle) * this.length;
        this.nextY = this.y + Math.sin(this.angle) * this.length;
    }
}

// --- كلاس يمثل رجل واحدة (مجموعة قطع متصلة) ---
class Leg {
    constructor(baseX, baseY, numSegments, segmentLength) {
        this.segments = [];
        let currentX = baseX;
        let currentY = baseY;

        for (let i = 0; i < numSegments; i++) {
            this.segments.push(new Segment(currentX, currentY, segmentLength, 0));
            currentX = this.segments[i].nextX;
            currentY = this.segments[i].nextY;
        }
    }

    // تحديث حركة الرجل بناءً على مكان الرأس (Target) ومكان التثبيت (Base)
    update(targetX, targetY, baseX, baseY) {
        // 1. الرأس يتبع الهدف (الماوس أو مركز جسم العنكبوت)
        let total = this.segments.length;
        this.segments[total - 1].follow(targetX, targetY);
        this.segments[total - 1].update();

        for (let i = total - 2; i >= 0; i--) {
            this.segments[i].follow(this.segments[i + 1].x, this.segments[i + 1].y);
            this.segments[i].update();
        }

        // 2. إعادة تثبيت قاعدة الرجل في جسم العنكبوت (Forward Kinematics Pass)
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
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.7)'; // لون أزرق خفيف مضيء
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

// --- كلاس العنكبوت بالكامل ---
class Spider {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.legs = [];
        this.numLegs = 8; // عدد الأرجل

        // إنشاء الأرجل حول الجسم
        for (let i = 0; i < this.numLegs; i++) {
            // 10 قطع في كل رجل، طول القطعة 15 بكسل
            this.legs.push(new Leg(this.x, this.y, 10, 15)); 
        }
    }

    update(targetX, targetY) {
        // حركة ناعمة للجسم ليلحق الماوس (Lerp)
        this.x += (targetX - this.x) * 0.1;
        this.y += (targetY - this.y) * 0.1;

        // تحديث كل رجل بناءً على زاوية انتشارها حول الجسم
        this.legs.forEach((leg, index) => {
            const angle = (index / this.numLegs) * Math.PI * 2;
            // تحديد أطراف الأرجل الخارجية عشان تتحرك بشكل طبيعي
            const targetDist = 120; 
            const legTargetX = targetX + Math.cos(angle) * targetDist;
            const legTargetY = targetY + Math.sin(angle) * targetDist;

            leg.update(legTargetX, legTargetY, this.x, this.y);
        });
    }

    draw(ctx) {
        // رسم الأرجل أولاً
        this.legs.forEach(leg => leg.draw(ctx));

        // رسم جسم العنكبوت (النقطة المضيئة)
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#6495ed'; // توهج أزرق
        ctx.fill();
        ctx.shadowBlur = 0; // إعادة تعيين التوهج عشان ما يبوظ باقي الرسم
    }
}

// إنشاء نسخة من العنكبوت في مركز الشاشة
const spider = new Spider(canvas.width / 2, canvas.height / 2);

// حلقة الأنيكيشن المستمرة
function animate() {
    // رسم طبقة شفافة سوداء لعمل تأثير الـ Trail (التدرج أو الذيل خلف الحركة)
    ctx.fillStyle = 'rgba(5, 5, 8, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    spider.update(mouse.x, mouse.y);
    spider.draw(ctx);

    requestAnimationFrame(animate);
}

animate();