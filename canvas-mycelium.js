(function() {
  'use strict';

  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let nodes = [];
  let connections = [];
  let mouse = { x: -1000, y: -1000 };
  let animId = null;
  let isPaused = false;
  let dpr = 1;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CONFIG = {
    nodeCount: 80,
    maxConnDist: 160,
    nodeRadius: { min: 2, max: 6 },
    growthSpeed: 0.15,
    pulseSpeed: 0.008,
    repulsionRadius: 120,
    repulsionStrength: 0.5,
    colorBg: 'rgba(10, 15, 10, 0.96)',
    colorNode: 'rgba(212, 168, 67, {a})',
    colorConnection: 'rgba(90, 125, 90, {a})',
    colorGlow: 'rgba(212, 168, 67, 0.05)',
  };

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    canvas._w = w;
    canvas._h = h;
  }

  function randomNode(w, h) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: CONFIG.nodeRadius.min + Math.random() * (CONFIG.nodeRadius.max - CONFIG.nodeRadius.min),
      phase: Math.random() * Math.PI * 2,
      pulse: Math.random(),
    };
  }

  function init() {
    resize();
    nodes = [];
    connections = [];
    const w = canvas._w;
    const h = canvas._h;
    for (let i = 0; i < CONFIG.nodeCount; i++) {
      nodes.push(randomNode(w, h));
    }
  }

  function getNeighbors(node, radius) {
    const result = [];
    for (const other of nodes) {
      if (other === node) continue;
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) result.push({ node: other, dist });
    }
    return result;
  }

  function update() {
    const w = canvas._w;
    const h = canvas._h;

    for (const node of nodes) {
      // Add gentle drift
      node.vx += (Math.random() - 0.5) * 0.02;
      node.vy += (Math.random() - 0.5) * 0.02;

      // Damping
      node.vx *= 0.98;
      node.vy *= 0.98;

      // Mouse repulsion
      const dmx = node.x - mouse.x;
      const dmy = node.y - mouse.y;
      const dmDist = Math.sqrt(dmx * dmx + dmy * dmy);
      if (dmDist < CONFIG.repulsionRadius && dmDist > 0) {
        const force = (CONFIG.repulsionRadius - dmDist) / CONFIG.repulsionRadius * CONFIG.repulsionStrength;
        node.vx += (dmx / dmDist) * force;
        node.vy += (dmy / dmDist) * force;
      }

      // Apply velocity
      node.x += node.vx * CONFIG.growthSpeed;
      node.y += node.vy * CONFIG.growthSpeed;

      // Wrap around edges
      if (node.x < -50) node.x = w + 50;
      if (node.x > w + 50) node.x = -50;
      if (node.y < -50) node.y = h + 50;
      if (node.y > h + 50) node.y = -50;

      // Pulse
      node.pulse += CONFIG.pulseSpeed;
    }
  }

  function draw() {
    const w = canvas._w;
    const h = canvas._h;

    // Background
    ctx.fillStyle = CONFIG.colorBg;
    ctx.fillRect(0, 0, w, h);

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.maxConnDist && dist > 0) {
          const alpha = (1 - dist / CONFIG.maxConnDist) * 0.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = CONFIG.colorConnection.replace('{a}', alpha);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Ambient glow
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    glow.addColorStop(0, 'rgba(212, 168, 67, 0.03)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Draw nodes
    for (const node of nodes) {
      const pulse = 0.6 + 0.4 * Math.sin(node.pulse);
      const alpha = 0.4 + 0.6 * pulse;
      const radius = node.r * (1 + 0.3 * pulse);

      // Glow
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 4);
      grad.addColorStop(0, `rgba(212, 168, 67, ${0.15 * pulse})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 4, 0, Math.PI * 2);
      ctx.fill();

      // Node
      ctx.fillStyle = CONFIG.colorNode.replace('{a}', alpha);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animate() {
    if (isPaused) return;
    update();
    draw();
    animId = requestAnimationFrame(animate);
  }

  function start() {
    if (prefersReduced) {
      // Static frame
      resize();
      nodes = [];
      const w = canvas._w;
      const h = canvas._h;
      for (let i = 0; i < CONFIG.nodeCount; i++) {
        nodes.push(randomNode(w, h));
      }
      draw();
      return;
    }
    init();
    animate();
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    isPaused = true;
  }

  // Event listeners
  canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas._w / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas._h / rect.height);
  });

  canvas.addEventListener('mouseleave', function() {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = (touch.clientX - rect.left) * (canvas._w / rect.width);
    mouse.y = (touch.clientY - rect.top) * (canvas._h / rect.height);
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      const wasPaused = isPaused;
      stop();
      init();
      if (!wasPaused) {
        isPaused = false;
        animate();
      }
    }, 200);
  });

  // Visibility change
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stop();
    } else {
      isPaused = false;
      if (!animId) animate();
    }
  });

  // Export for app.js
  window.mycelium = { start, stop, resize };

  // Auto-start if canvas is visible and not reduced motion
  if (!prefersReduced) {
    start();
  } else {
    start(); // start will draw a static frame for reduced motion
  }
})();
