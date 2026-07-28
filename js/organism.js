/* The organism — one mycelial body for the whole page.
   Two page-length canvases: an under-layer (below content, above band
   backgrounds) and an over-layer that occasionally crosses boxes.
   Tentacles adapt colour to the band they pass through, steer around
   the writing, and keep sprouting while the page is open.
   Density per page via <body data-organism="full|sparse|off">. */
(() => {
  const MODE = document.body.dataset.organism || 'sparse';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* rotating epigraphs */
  const spores = window.SPORES || [];
  let si = Math.floor(Math.random() * Math.max(spores.length, 1));
  const quoteEl = document.getElementById('quote'), citeEl = document.getElementById('cite');
  const showSpore = () => {
    if (!spores.length) return;
    quoteEl.textContent = '»' + spores[si].quote + '«';
    citeEl.textContent = spores[si].attribution;
  };
  showSpore();
  const epigraph = document.getElementById('epigraph');
  if (epigraph) epigraph.addEventListener('click', () => { si = (si + 1) % spores.length; showSpore(); });

  if (MODE === 'off') return;

  const under = document.getElementById('tent-under');
  const over  = document.getElementById('tent-over');
  if (!under || !over) return;

  const PAL = {
    biolume:[70,232,212], magenta:[255,61,156], violet:[138,99,210],
    acid:[200,242,75], ghost:[239,234,255], electric:[93,120,255]
  };
  const DARK_HUES = [PAL.biolume, PAL.magenta, PAL.violet, PAL.acid, PAL.ghost];
  const LIGHT_SAFE = h => (h === PAL.ghost || h === PAL.acid) ? PAL.violet : h;

  let canvasTop = 0, jobs = [], running = false, sproutTimer = null, sprouts = 0, bands = [];

  const pageRect = el => {
    const r = el.getBoundingClientRect();
    return {x:r.left+scrollX, y:r.top+scrollY-canvasTop, w:r.width, h:r.height,
            cx:r.left+scrollX+r.width/2, cy:r.top+scrollY-canvasTop+r.height/2};
  };
  const angleDiff = (a,b) => ((a-b+Math.PI*3)%(Math.PI*2))-Math.PI;

  function makeTentacle(x0,y0,ang0,len0,segs,hueA,hueB,alpha,repulsors,W,H){
    const pts=[[x0,y0]], angs=[ang0];
    let x=x0,y=y0,ang=ang0,len=len0,curl=0;
    for(let i=0;i<segs;i++){
      ang += (Math.random()-.5)*.22 + curl;
      if (Math.random()<.03)  curl=(Math.random()<.5?1:-1)*(.05+Math.random()*.13);
      if (Math.random()<.05)  curl*=.4;
      for (const r of repulsors){
        const dx=x-r.cx, dy=y-r.cy;
        const reach = Math.max(r.w,r.h)/2 + r.influence;
        const d = Math.hypot(dx,dy);
        if (d < reach){
          const away = Math.atan2(dy,dx);
          ang += angleDiff(away,ang) * r.strength * (1-d/reach);
        }
      }
      if (x<15)   ang += angleDiff(0,ang)*.25;
      if (x>W-15) ang += angleDiff(Math.PI,ang)*.25;
      if (y>H-10) ang += angleDiff(-Math.PI/2,ang)*.3;
      x+=Math.cos(ang)*len; y+=Math.sin(ang)*len;
      pts.push([x,y]); angs.push(ang); len*=.997;
    }
    return {pts,angs,hueA,hueB,alpha,drawn:1,delay:Math.floor(Math.random()*90),
            parent:null,spawnI:0,len0};
  }

  const styleAt = y => {
    for (const b of bands) if (y>=b.top && y<b.bot) return b;
    return {dark:true};
  };
  const lerp3 = (a,b,f) => [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f].map(Math.round);

  function drawSeg(x,t,i){
    const {pts,hueA,hueB,alpha}=t, n=pts.length, f=1-i/n;
    const y=(pts[i-1][1]+pts[i][1])/2;
    const g=styleAt(y);
    let hue = g.dark ? lerp3(hueA,hueB,i/n) : lerp3(LIGHT_SAFE(hueA),LIGHT_SAFE(hueB),i/n);
    const aMod = (g.dark?1:.5)*alpha;
    const pulse = 1 + .22*Math.sin(i*.35);
    x.strokeStyle=`rgba(${hue},${(f*.5+.08)*aMod})`;
    x.lineWidth=(f*4.6+.4)*pulse;
    x.beginPath(); x.moveTo(pts[i-1][0],pts[i-1][1]); x.lineTo(pts[i][0],pts[i][1]); x.stroke();
    if (i%5===0 && i<n*.85){
      const dx=pts[i][0]-pts[i-1][0], dy=pts[i][1]-pts[i-1][1], m=Math.hypot(dx,dy)||1;
      const off=(f*4.6+2.2)*pulse;
      x.fillStyle=`rgba(${hue},${(f*.45+.1)*aMod})`;
      x.beginPath(); x.arc(pts[i][0]-dy/m*off, pts[i][1]+dx/m*off, f*1.8+.5, 0, 7); x.fill();
    }
    if (i===n-1){
      x.fillStyle=`rgba(${hue},${.85*aMod})`;
      x.shadowColor=`rgba(${hue},.9)`; x.shadowBlur=8;
      x.beginPath(); x.arc(pts[i][0],pts[i][1],1.6,0,7); x.fill();
      x.shadowBlur=0;
      if (g.dark && Math.random()<.3) fruit(x, pts[i][0], pts[i][1], t.angs[i], hue, aMod);
    }
  }

  function fruit(x,px,py,ang,hue,a){
    const up = -Math.PI/2 + (Math.random()-.5)*.6;
    const h = 10+Math.random()*8, r = 5.5+Math.random()*3.5;
    const tx = px+Math.cos(up)*h, ty = py+Math.sin(up)*h;
    x.strokeStyle=`rgba(${hue},${.7*a})`; x.lineWidth=1.1;
    x.beginPath(); x.moveTo(px,py);
    x.quadraticCurveTo(px+Math.cos(up+.5)*h*.5, py+Math.sin(up+.5)*h*.5, tx,ty); x.stroke();
    x.shadowColor=`rgba(${hue},.9)`; x.shadowBlur=10;
    x.beginPath(); x.arc(tx,ty,r,Math.PI+up-Math.PI/2+.2,up-Math.PI/2-.2+Math.PI*2);
    x.strokeStyle=`rgba(${hue},${.9*a})`; x.lineWidth=1.4; x.stroke();
    x.shadowBlur=0;
    for(let k=-1;k<=1;k++){
      x.beginPath(); x.moveTo(tx,ty);
      x.lineTo(tx+Math.cos(up+Math.PI/2)*r*.7*k+Math.cos(up)*-2, ty+Math.sin(up+Math.PI/2)*r*.7*k+Math.sin(up)*-2);
      x.strokeStyle=`rgba(${hue},${.45*a})`; x.lineWidth=.7; x.stroke();
    }
    for(let k=0;k<4;k++){
      x.fillStyle=`rgba(${hue},${(.25+Math.random()*.3)*a})`;
      x.beginPath(); x.arc(tx+(Math.random()-.5)*r*3, ty+r+Math.random()*10, .7, 0, 7); x.fill();
    }
  }

  function branch(parent,depth,repulsors,W,H,out){
    if (depth>=2 || parent.pts.length<50) return;
    const kids = Math.random()<.75 ? (Math.random()<.4?2:1) : 0;
    for(let k=0;k<kids;k++){
      const i = Math.floor(parent.pts.length*(.3+Math.random()*.4));
      const child = makeTentacle(
        parent.pts[i][0], parent.pts[i][1],
        parent.angs[i] + (Math.random()<.5?1:-1)*(.5+Math.random()*.6),
        parent.len0*.75, Math.floor(parent.pts.length*.55),
        parent.hueB, DARK_HUES[Math.floor(Math.random()*DARK_HUES.length)],
        parent.alpha*.85, repulsors, W, H);
      child.parent=parent; child.spawnI=i;
      out.push(child);
      branch(child,depth+1,repulsors,W,H,out);
    }
  }

  function drawStars(){
    const cv = document.getElementById('stars');
    if (!cv) return;
    const dpr = Math.min(devicePixelRatio||1, 2);
    const W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W*dpr; cv.height = H*dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0);
    x.strokeStyle = 'rgba(239,234,255,.07)';
    [0.32,0.46,0.62].forEach(r => {
      x.lineWidth = 1;
      x.beginPath(); x.arc(W/2, H*0.42, Math.min(W,H)*r, 0, 7); x.stroke();
    });
    for (let i=0;i<130;i++){
      const px=Math.random()*W, py=Math.random()*H, a=.12+Math.random()*.4;
      if (Math.random()<.82){
        x.fillStyle=`rgba(239,234,255,${a})`;
        x.beginPath(); x.arc(px,py,Math.random()*1.3+.3,0,7); x.fill();
      } else {
        const s=2+Math.random()*3.5;
        x.strokeStyle=`rgba(239,234,255,${a})`; x.lineWidth=.8;
        x.beginPath(); x.moveTo(px-s,py); x.lineTo(px+s,py); x.moveTo(px,py-s); x.lineTo(px,py+s); x.stroke();
      }
    }
    const glyphs=['☿','♀','♄','♃','⊕','♆','☽','✶'];
    for (let i=0;i<9;i++){
      const px=Math.random()*W, py=Math.random()*H;
      x.save(); x.translate(px,py); x.rotate((Math.random()-.5)*.9);
      x.fillStyle=`rgba(239,234,255,${.1+Math.random()*.22})`;
      x.font=`${14+Math.random()*20}px serif`;
      x.fillText(glyphs[i%glyphs.length],0,0); x.restore();
    }
  }

  function buildOrganism(){
    const anchor = document.querySelector('header.g-dark, main, section');
    if (!anchor) return;
    canvasTop = anchor.offsetTop;
    const totalH = document.body.scrollHeight - canvasTop;
    if (totalH < 300) return;
    const dpr = Math.min(devicePixelRatio||1, 1.5);
    const ctxs = [under,over].map(cv=>{
      cv.style.top = canvasTop+'px';
      cv.style.height = totalH+'px';
      cv.width = cv.offsetWidth*dpr; cv.height = totalH*dpr;
      const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0);
      return x;
    });
    const W = under.offsetWidth, H = totalH;

    /* ground map from .g-dark / .g-light sections + footer */
    bands = [...document.querySelectorAll('.g-dark, .g-light, footer')].map(el=>{
      const r = pageRect(el);
      return {top:r.y, bot:r.y+r.h, dark:!el.classList.contains('g-light')};
    });

    /* the writing is protected; boxes only gently deflect */
    const textR  = [...document.querySelectorAll('.hero-text, .band-head, .prose, .prose-body, .member-head, .patches-band h2, .patches-band .eyebrow, .band-notes h2, .news-grid')]
                   .map(el=>({...pageRect(el), strength:.5, influence:70}));
    const boxesR = [...document.querySelectorAll('.patch, .person-card')]
                   .map(el=>({...pageRect(el), strength:.18, influence:30}));
    const underRep = [...textR];
    const overRep  = [...textR.map(r=>({...r,strength:.9})), ...boxesR];

    const seeds = [];
    const octo = document.getElementById('octo');
    const full = MODE === 'full';
    if (octo){
      const o = pageRect(octo);
      for(let i=0;i<5;i++) seeds.push({x:o.x+o.w*(.15+.7*Math.random()), y:o.y+o.h*.8, a:Math.PI/2+(Math.random()-.5)*1.2});
    }
    const edgeN = full ? 6 : 4;
    for(let i=0;i<edgeN;i++) seeds.push({x:(i%2)?W-4:4, y:H*(.12+Math.random()*.7), a:(i%2? Math.PI*.75 : Math.PI*.25)+(Math.random()-.5)*.6});
    if (full){
      for(let i=0;i<3;i++) seeds.push({x:W*(.1+Math.random()*.8), y:H-6, a:-Math.PI/2+(Math.random()-.5)*.8});
      for(let i=0;i<4;i++) seeds.push({x:W*(.08+Math.random()*.84), y:H*(.3+Math.random()*.4), a:Math.PI/2*(Math.random()<.6?1:-1)+(Math.random()-.5)});
      const patches = document.querySelector('.patches');
      const cards = [...document.querySelectorAll('.patch')].map(pageRect);
      if (patches && cards.length>=4){
        const pr = pageRect(patches);
        const chan1 = (cards[0].x+cards[0].w + cards[1].x)/2;
        const chan2 = (cards[2].x+cards[2].w + cards[3].x)/2;
        seeds.push({x:chan1, y:pr.y-60, a:Math.PI/2+(Math.random()-.5)*.3});
        seeds.push({x:chan2, y:pr.y-60, a:Math.PI/2+(Math.random()-.5)*.3});
        const rowGap = (cards[0].y+cards[0].h + cards[2].y)/2;
        seeds.push({x:pr.x-40,      y:rowGap, a:(Math.random()-.5)*.4});
        seeds.push({x:pr.x+pr.w+40, y:rowGap, a:Math.PI+(Math.random()-.5)*.4});
      }
    }

    jobs = [];
    const mkSet = (ctx,rep,seedList,alpha) => {
      const ts=[];
      seedList.forEach(s=>{
        const hueA=DARK_HUES[Math.floor(Math.random()*DARK_HUES.length)];
        const hueB=DARK_HUES[Math.floor(Math.random()*DARK_HUES.length)];
        const t=makeTentacle(s.x,s.y,s.a,10+Math.random()*4,110+Math.floor(Math.random()*70),hueA,hueB,alpha,rep,W,H);
        ts.push(t); branch(t,0,rep,W,H,ts);
      });
      jobs.push({x:ctx,ts,rep,W,H});
    };
    mkSet(ctxs[0], underRep, seeds, 1);
    const overSeeds = [];
    const overN = full ? 5 : 2;
    for(let i=0;i<overN;i++) overSeeds.push({x:W*(.08+Math.random()*.84), y:H*Math.random()*.6, a:Math.PI/2+(Math.random()-.5)*1.1});
    mkSet(ctxs[1], overRep, overSeeds, .4);

    if (reducedMotion){
      jobs.forEach(({x,ts})=>ts.forEach(t=>{for(let i=1;i<t.pts.length;i++){try{drawSeg(x,t,i)}catch(e){break}}}));
      return;
    }
    kick();
    clearInterval(sproutTimer); sprouts=0;
    sproutTimer = setInterval(()=>{
      if (document.hidden || sprouts>=24) return;
      const set = jobs[0];
      if (!set || !set.ts.length) return;
      const host = set.ts[Math.floor(Math.random()*set.ts.length)];
      if (!host || host.drawn<20) return;
      const i = Math.floor(host.drawn*(0.2+Math.random()*.7));
      const s = makeTentacle(host.pts[i][0],host.pts[i][1],
        host.angs[i]+(Math.random()<.5?1:-1)*(.6+Math.random()*.7),
        7, 16+Math.floor(Math.random()*22),
        host.hueB, DARK_HUES[Math.floor(Math.random()*DARK_HUES.length)],
        .8, set.rep, set.W, set.H);
      set.ts.push(s); sprouts++; kick();
    }, 3200);
  }

  function kick(){
    if (running) return; running=true;
    const step = () => {
      let alive=false;
      jobs.forEach(({x,ts})=>ts.forEach(t=>{
        try{
          if (t.delay>0){ t.delay--; alive=true; return; }
          if (t.parent && t.parent.drawn<t.spawnI){ alive=true; return; }
          for(let k=0;k<2 && t.drawn<t.pts.length;k++,t.drawn++) drawSeg(x,t,t.drawn);
          if (t.drawn<t.pts.length) alive=true;
        }catch(e){ t.drawn = t.pts.length; }
      }));
      if (alive) requestAnimationFrame(step); else running=false;
    };
    requestAnimationFrame(step);
  }

  const boot = () => { drawStars(); buildOrganism(); };
  if (document.readyState==='complete') boot();
  else addEventListener('load', boot);
  let rT; addEventListener('resize', ()=>{ clearTimeout(rT); rT=setTimeout(boot,300); });
})();
