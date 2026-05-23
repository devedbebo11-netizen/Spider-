const canvas = document.getElementById('spiderCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resize();
window.addEventListener('resize', resize);

const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, targetX: window.innerWidth / 2, targetY: window.innerHeight / 2 };

window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
});

window.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
    }
}, { passive: true });

// كلاس النقطة الفيزيائية (Verlet Particle)
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
    }
    update(gravityX, gravityY) {
        const vx = (this.x - this.oldX) * 0.95; // احتكاك خفيف للانسيابية
        const vy = (this.y - this.oldY) * 0.95;
        this.oldX = this.x;
        this.oldY = this.y;
        this.x += vx + gravityX;
        this.y += vy + gravityY;
    }
}

// كلاس الحبل/الرجل المتقدمة
class Tentacle {
    constructor(baseX, baseY, length, count) {
        this.particles = [];
        this.segLength = length / count;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(baseX, baseY + i * this.segLength));
        }
    }

    update(baseX, baseY, targetX, targetY) {
        // تثبيت القاعدة في الجسم
        this.particles[0].x = baseX;
        this.particles[0].y = baseY;

        // تحديث الفيزياء لكل نقطة
        for (let i = 1; i < this.particles.length; i++) {
            this.particles[i].update(0, 0.1); // جاذبية خفيفة جداً للأسفل لإعطاء وزن
        }

        // حل القيود الفيزيائية (Relaxation Loops) لجعل الحركة ناعمة وسائلة كأنها حبل حقيقي
        for (let loops = 0; loops < 6; loops++) {
            // ربط النقاط ببعضها بالدور
            for (let i = 0; i < this.particles.length - 1; i++) {
                const p1 = this.particles[i];
                const p2 = this.particles[i+1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = this.segLength - dist;
                const percent = (diff / dist) * 0.5;
                const offsetX = dx * percent;
                const offsetY = dy * percent;

                if (i !== 0) {
                    p1.x -= offsetX;
                    p1.y -= offsetY;
                }
                p2.x += offsetX;
                p2.y += offsetY;
            }
            
            // سحب طرف الرجل الأخير برفق ناحية الهدف الخارجي (تأثير الانتشار)
            const last = this.particles[this.particles.length - 1];
            last.x += (targetX - last.x) * 0.1;
            last.y += (targetY - last.y) * 0.1;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.particles[0].x, this.particles[0].y);
        
        // رسم المنحنيات باستخدام البيزير ليكون الانحناء ناعم بدون زوايا حادة
        for (let i = 1; i < this.particles.length - 1; i++) {
            const xc = (this.particles[i].x + this.particles[i + 1].x) / 2;
            const yc = (this.particles[i].y + this.particles[i + 1].y) / 2;
            ctx.quadraticCurveTo(this.particles[i].x, this.particles[i].y, xc, yc);
        }
        
        ctx.lineTo(this.particles[this.particles.length - 1].x, this.particles[this.particles.length - 1].y);
        
        // ستايل النيون الأزرق المضيء عالي الجودة
        ctx.strokeStyle = 'rgba(120, 180, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

class PremiumSpider {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.tentacles = [];
        this.numLegs = 12; // زيادة عدد الأرجل لتفاصيل أغنى كالفيديو

        for (let i = 0; i < this.numLegs; i++) {
            // كل رجل طولها 180 بكسل ومكونة من 16 نقطة فيزيائية للحصول على مرونة فائقة
            this.tentacles.push(new Tentacle(this.x, this.y, 180, 16)); 
        }
    }

    update(targetX, targetY) {
        // حركة مرنة جداً للجسم يتبع الماوس بسلاسة (Ease-out)
        this.x += (targetX - this.x) * 0.08;
        this.y += (targetY - this.y) * 0.08;

        this.tentacles.forEach((t, i) => {
            const angle = (i / this.numLegs) * Math.PI * 2;
            // حساب مكان انتشار أطراف الأرجل في الفراغ
            const radius = 140; 
            const tTargetX = targetX + Math.cos(angle) * radius;
            const tTargetY = targetY + Math.sin(angle) * radius;

            t.update(this.x, this.y, tTargetX, tTargetY);
        });
    }

    draw(ctx) {
        // تفعيل الدمج اللوني المضيء (Screen Mode) زي الألعاب الفخمة
        ctx.globalCompositeOperation = 'screen';
        
        // عمل توهج نيون أزرق حول الأرجل والجسم
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(0, 100, 255, 0.9)';

        this.tentacles.forEach(t => t.draw(ctx));

        // رسم قلب العنكبوت المضيء (الرأس)
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ffffff';
        ctx.fill();

        // إعادة تعيين الإعدادات للافتراضي حتى لا تؤثر على باقي الأنميشن
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }
}

const spider = new PremiumSpider(window.innerWidth / 2, window.innerHeight / 2);

function loop() {
    // خلفية سوداء شبه شفافة لترك أثر (Motion Blur / Trail) سينمائي خلف الحركة
    ctx.fillStyle = 'rgba(3, 3, 5, 0.25)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // تنعيم حركة الماوس
    mouse.x += (mouse.targetX - mouse.x) * 0.1;
    mouse.y += (mouse.targetY - mouse.y) * 0.1;

    spider.update(mouse.x, mouse.y);
    spider.draw(ctx);

    requestAnimationFrame(loop);
}

loop();