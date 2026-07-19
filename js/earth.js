/* ============================================================================
 * earth.js — 3D 赛博地球（Three.js，CDN 按需加载）
 * 球体 + 粒子星空 + 青/紫氛围点光源 + 自转 + 滚动视差。
 * CDN 加载失败 / 低端设备 → 自动降级为 Canvas 2D 星空，不影响任何功能。
 * ==========================================================================*/

const Earth = {
  ok: false,

  init() {
    const low = Utils.isLowEnd();
    /* 动态加载 Three.js（按需导入，失败降级） */
    const script = document.createElement('script');
    script.src = CONFIG.threeJsCdn;
    script.async = true;
    script.onload = () => { try { this._init3D(low); this.ok = true; } catch (e) { this._fallback2D(); } };
    script.onerror = () => this._fallback2D();
    document.head.appendChild(script);
    /* 8 秒兜底：CDN 超时也降级 */
    setTimeout(() => { if (!this.ok && !this._fell) this._fallback2D(); }, 8000);
  },

  _init3D(low) {
    const canvas = document.getElementById('bg-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !low });
    renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 0.4, 3);

    /* 地球：线框球 + 内层实心暗球（无外部纹理，保证离线可用） */
    const globe = new THREE.Group();
    const solid = new THREE.Mesh(
      new THREE.SphereGeometry(0.98, 48, 48),
      new THREE.MeshStandardMaterial({ color: 0x060a18, roughness: 0.4, metalness: 0.2 })
    );
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.16 })
    );
    /* 地球表面光点（对应足迹，数量随足迹增多变亮 —— 模块联动） */
    const dotGeo = new THREE.BufferGeometry();
    const dotCount = 300;
    const pos = new Float32Array(dotCount * 3);
    for (let i = 0; i < dotCount; i++) {
      const t = Math.acos(2 * Math.random() - 1), p = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.sin(t) * Math.cos(p);
      pos[i * 3 + 1] = Math.cos(t);
      pos[i * 3 + 2] = Math.sin(t) * Math.sin(p);
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
      color: 0x00d4ff, size: 0.012, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
    }));
    globe.add(solid, wire, dots);
    globe.position.y = -0.6;
    scene.add(globe);
    this.globe = globe;

    /* 粒子星空：BufferGeometry，范围 -50~50，低端降级 */
    const starCount = low ? CONFIG.perf.starCountLow : CONFIG.perf.starCountHigh;
    const starGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) sp[i] = (Math.random() - 0.5) * 100;
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xaad4ff, size: 0.02, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
    }));
    scene.add(stars);

    /* 灯光系统（需求文档 16.1 参数） */
    scene.add(new THREE.AmbientLight(0x222244, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(5, 3, 5); scene.add(sun);
    const l1 = new THREE.PointLight(0x00d4ff, 50, 20);
    const l2 = new THREE.PointLight(0x7b2d8e, 50, 20);
    scene.add(l1, l2);

    /* 足迹数量 → 地球光点亮度（联动设计） */
    const footprints = Utils.get('footprints', []);
    dots.material.opacity = Math.min(1, 0.5 + footprints.length * 0.05);

    let t = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      t += 0.005;
      globe.rotation.y += 0.001;             // 自转
      stars.rotation.y += 0.0002;            // 星空缓慢旋转（浩瀚感）
      l1.position.set(Math.cos(t) * 3, 1, Math.sin(t) * 3);      // 赛博青绕转
      l2.position.set(Math.cos(t + Math.PI) * 3, -1, Math.sin(t + Math.PI) * 3); // 禅意紫绕转
      /* 滚动视差：地球缓慢缩放/位移 */
      const sc = Math.min(scrollY / innerHeight, 1.5);
      globe.position.y = -0.6 - sc * 0.5;
      globe.scale.setScalar(1 - sc * 0.15);
      renderer.render(scene, camera);
    };
    animate();

    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  },

  /* ---- 降级：Canvas 2D 星空（Three.js CDN 不可用时） ---- */
  _fallback2D() {
    if (this._fell) return; this._fell = true;
    const c3 = document.getElementById('bg-canvas');
    if (c3) c3.style.display = 'none';
    const cv = document.getElementById('bg-fallback');
    cv.style.display = 'block';
    const ctx = cv.getContext('2d');
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.6 + 0.2, p: Math.random() * Math.PI * 2
    }));
    let t = 0;
    (function draw() {
      requestAnimationFrame(draw);
      t += 0.016;
      ctx.clearRect(0, 0, cv.width, cv.height);
      stars.forEach(st => {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * st.s + st.p));
        ctx.globalAlpha = tw * 0.8;
        ctx.fillStyle = '#9fd8ff';
        ctx.beginPath();
        ctx.arc(st.x * cv.width, st.y * cv.height, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    })();
  },

  /* ---- 留言提交时地球闪烁一次（模块联动） ---- */
  flash() {
    if (!this.ok || !this.globe) return;
    const g = this.globe;
    let n = 0;
    const iv = setInterval(() => {
      g.children[1].material.opacity = n % 2 ? 0.16 : 0.5;
      if (++n > 5) { clearInterval(iv); g.children[1].material.opacity = 0.16; }
    }, 120);
  }
};

window.Earth = Earth;
