  // scroll reveal
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{threshold:0.15});
  items.forEach(i=>io.observe(i));

  // extend rail line dynamically to match content height per section
  document.querySelectorAll('.rail-line').forEach(rail=>{
    const sibling = rail.nextElementSibling;
    if(sibling){ rail.style.minHeight = sibling.offsetHeight + 'px'; }
  });
  window.addEventListener('resize', ()=>{
    document.querySelectorAll('.rail-line').forEach(rail=>{
      const sibling = rail.nextElementSibling;
      if(sibling){ rail.style.minHeight = sibling.offsetHeight + 'px'; }
    });
  });

  // black hole / robotic HUD background scene
  (function(){
    const canvas = document.getElementById('bhCanvas');
    const ctx = canvas.getContext('2d');
    const hudTop = document.getElementById('hudTop');
    const hudBottom = document.getElementById('hudBottom');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W, H, cx, cy, dpr;
    const VOID = '9,12,17';
    const RED = [229,9,20];        // deep red
    const VERMILLION = [227,66,38]; // warm red-orange accent, mixed with the red glow

    // twinkling starfield
    let stars = [];
    function generateStars(){
      const count = Math.round((W*H)/9000);
      stars = Array.from({length:count}, ()=>({
        x: Math.random()*W,
        y: Math.random()*H,
        r: 0.4 + Math.random()*1.3,
        phase: Math.random()*Math.PI*2,
        speed: 0.6 + Math.random()*1.2,
        baseAlpha: 0.35 + Math.random()*0.65
      }));
    }

    // comets that streak across every few seconds
    let comets = [];
    let nextCometAt = performance.now() + (3000 + Math.random()*2000);
    function spawnComet(){
      const fromLeft = Math.random() < 0.5;
      const startY = H*(0.05 + Math.random()*0.5);
      const angle = (fromLeft ? 1 : -1) * (0.28 + Math.random()*0.18); // downward diagonal
      const speed = 9 + Math.random()*5;
      comets.push({
        x: fromLeft ? -40 : W+40,
        y: startY,
        vx: (fromLeft?1:-1)*speed,
        vy: speed*Math.tan(angle),
        trail: []
      });
    }

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W*dpr; canvas.height = H*dpr;
      canvas.style.width = W+'px'; canvas.style.height = H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      cx = W*0.74; cy = H*0.53; // right side of the hero, filling the empty space next to the name
      hudTop.style.left = cx+'px';    hudTop.style.top = (cy-150)+'px';
      hudBottom.style.left = cx+'px'; hudBottom.style.top = (cy+142)+'px';
      generateStars();
    }
    window.addEventListener('resize', resize);
    resize();

    // orbiting robotic "data node" particles, Keplerian-ish (closer = faster)
    const N = 46;
    const particles = [];
    for(let i=0;i<N;i++){
      const rx = 95 + Math.random()*320;      // orbit radius (x)
      particles.push({
        rx,
        ry: rx*0.34,                          // flattened ellipse
        angle: Math.random()*Math.PI*2,
        speed: (0.006 + Math.random()*0.01) * (120/rx),
        size: 1 + Math.random()*2,
        vermillion: Math.random() < 0.35,
        tilt: (Math.random()-0.5)*0.25
      });
    }

    let diskRot = 0;

    function ringPath(rx, ry, rot){
      ctx.beginPath();
      for(let a=0;a<=Math.PI*2+0.05;a+=0.05){
        const x = cx + Math.cos(a)*rx;
        const y = cy + Math.sin(a)*ry + Math.sin(a+rot)*6;
        if(a===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
    }

    function drawFrame(t){
      // trailing fade instead of hard clear -> soft motion blur, matches page bg exactly
      ctx.fillStyle = `rgba(${VOID},0.22)`;
      ctx.fillRect(0,0,W,H);

      // twinkling starfield
      ctx.save();
      stars.forEach(s=>{
        const tw = reduceMotion ? 1 : (0.5 + 0.5*Math.sin(t*0.001*s.speed + s.phase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${(s.baseAlpha*tw).toFixed(3)})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.restore();

      // comets streaking past
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for(let i=comets.length-1;i>=0;i--){
        const c = comets[i];
        c.x += c.vx; c.y += c.vy;
        c.trail.push({x:c.x,y:c.y});
        if(c.trail.length > 22) c.trail.shift();

        for(let k=0;k<c.trail.length-1;k++){
          const p0 = c.trail[k], p1 = c.trail[k+1];
          const a = (k/c.trail.length) * 0.85;
          ctx.beginPath();
          ctx.moveTo(p0.x,p0.y);
          ctx.lineTo(p1.x,p1.y);
          ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
          ctx.lineWidth = 1.6 * (k/c.trail.length) + 0.3;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 10;
        ctx.arc(c.x, c.y, 1.8, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if(c.x < -60 || c.x > W+60 || c.y < -60 || c.y > H+60) comets.splice(i,1);
      }
      ctx.restore();
      if(!reduceMotion && t > nextCometAt){
        spawnComet();
        nextCometAt = t + (3000 + Math.random()*2000);
      }

      // faint accretion disk rings (robotic HUD orbit lines)
      ctx.save();
      for(let i=0;i<3;i++){
        const rx = 168 + i*70;
        const ry = rx*0.34;
        ringPath(rx, ry, diskRot*(1+i*0.15));
        ctx.strokeStyle = `rgba(${RED},${0.12 - i*0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // glowing accretion arcs (the "light" bending around the hole) — red/vermillion mix
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for(let i=0;i<2;i++){
        const rx = 214 + i*48;
        const ry = rx*0.30;
        const grad = ctx.createLinearGradient(cx-rx, cy, cx+rx, cy);
        grad.addColorStop(0.00, `rgba(${RED},0)`);
        grad.addColorStop(0.35, `rgba(${RED},0.6)`);
        grad.addColorStop(0.55, `rgba(${VERMILLION},0.65)`);
        grad.addColorStop(0.75, `rgba(${RED},0.45)`);
        grad.addColorStop(1.00, `rgba(${RED},0)`);
        ringPath(rx, ry, diskRot*(1+i*0.2));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      ctx.restore();

      // event horizon core — bigger, warm red/vermillion glow
      const coreR = 84;
      const coreGrad = ctx.createRadialGradient(cx,cy,0, cx,cy,coreR*2.4);
      coreGrad.addColorStop(0, 'rgba(0,0,0,1)');
      coreGrad.addColorStop(0.42, 'rgba(18,4,4,0.96)');
      coreGrad.addColorStop(0.65, `rgba(${RED},0.32)`);
      coreGrad.addColorStop(0.85, `rgba(${VERMILLION},0.22)`);
      coreGrad.addColorStop(1, `rgba(${VERMILLION},0)`);
      ctx.beginPath();
      ctx.fillStyle = coreGrad;
      ctx.arc(cx,cy,coreR*2.4,0,Math.PI*2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = '#000';
      ctx.arc(cx,cy,coreR,0,Math.PI*2);
      ctx.fill();

      // thin photon-ring rim (robotic scanner edge), warm mixed color
      const rimGrad = ctx.createLinearGradient(cx-coreR, cy, cx+coreR, cy);
      rimGrad.addColorStop(0, `rgba(${RED},0.95)`);
      rimGrad.addColorStop(0.5, `rgba(${VERMILLION},0.95)`);
      rimGrad.addColorStop(1, `rgba(${RED},0.95)`);
      ctx.beginPath();
      ctx.arc(cx,cy,coreR+2.2,0,Math.PI*2);
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = `rgba(${VERMILLION},0.8)`;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // orbiting data-node particles + occasional synapse links
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pos = particles.map(p=>{
        if(!reduceMotion) p.angle += p.speed;
        const x = cx + Math.cos(p.angle)*p.rx;
        const y = cy + Math.sin(p.angle)*p.ry + Math.sin(p.angle*2+p.tilt)*4;
        return {x,y,p};
      });
      // faint links between nearby nodes -> circuit / neural feel
      for(let i=0;i<pos.length;i++){
        for(let j=i+1;j<pos.length;j++){
          const dx = pos[i].x-pos[j].x, dy = pos[i].y-pos[j].y;
          const d = Math.sqrt(dx*dx+dy*dy);
          if(d < 46){
            ctx.beginPath();
            ctx.moveTo(pos[i].x,pos[i].y);
            ctx.lineTo(pos[j].x,pos[j].y);
            ctx.strokeStyle = `rgba(${RED},${0.12*(1-d/46)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      pos.forEach(({x,y,p})=>{
        const col = p.vermillion ? VERMILLION : RED;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${col},0.9)`;
        ctx.shadowColor = `rgba(${col},0.9)`;
        ctx.shadowBlur = 6;
        ctx.rect(x-p.size/2, y-p.size/2, p.size, p.size);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.restore();

      diskRot += reduceMotion ? 0 : 0.004;
    }

    // zoom the black hole in as the user scrolls down the page (already bigger + tilted from the start)
    const BASE_SCALE = 1.35;
    const TILT_DEG = 7; // slight tilt to the right
    function updateScrollZoom(){
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / (scrollable * 0.55), 1) : 0;
      const scale = BASE_SCALE + progress * 1.3; // grows further as you scroll
      canvas.style.transform = `rotate(${TILT_DEG}deg) scale(${scale})`;
    }
    window.addEventListener('scroll', updateScrollZoom, {passive:true});
    updateScrollZoom();

    if(reduceMotion){
      drawFrame(performance.now());
    } else {
      function loop(t){ drawFrame(t); updateScrollZoom(); requestAnimationFrame(loop); }
      requestAnimationFrame(loop);
    }
  })();
