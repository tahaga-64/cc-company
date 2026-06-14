import { useEffect, useRef, Suspense, lazy } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const WebGLBackground = lazy(() => import('./WebGLBackground'));

// ─── helpers ──────────────────────────────────────────────────────────────────

function splitChars(text) {
  return [...text].map((ch, i) => (
    <span
      key={i}
      className="cp-char"
      style={{ display: 'inline-block', willChange: 'transform, opacity' }}
    >
      {ch === ' ' ? ' ' : ch}
    </span>
  ));
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, color, delay = 0 }) {
  const numRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const el = numRef.current;
    if (!el || typeof value !== 'number') return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: cardRef.current,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
    tl.from(cardRef.current, { y: 32, opacity: 0, duration: 0.6, ease: 'power3.out', delay })
      .from({ n: 0 }, {
        n: value,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate() { el.textContent = Math.round(this.targets()[0].n); },
      }, '<0.1');
    return () => tl.kill();
  }, [value, delay]);

  return (
    <div
      ref={cardRef}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '28px 24px',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        ref={numRef}
        style={{
          fontSize: 48,
          fontWeight: 900,
          color,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          marginBottom: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {typeof value === 'number' ? 0 : value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </div>
    </div>
  );
}

// ─── DeptCard ─────────────────────────────────────────────────────────────────

function DeptCard({ dept, stats, onNavigate, index }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = gsap.from(el, {
      y: 48,
      opacity: 0,
      duration: 0.65,
      ease: 'power3.out',
      delay: index * 0.07,
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
    return () => st.kill();
  }, [index]);

  return (
    <button
      ref={ref}
      onClick={() => onNavigate('department', dept.id)}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
        width: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(129,140,248,0.08)';
        e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: '#f0f2f7' }}>{dept.name}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
          {dept.fileCount} files
        </span>
      </div>
      {dept.role && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, lineHeight: 1.5 }}>
          {dept.role}
        </div>
      )}
      {dept.subfolders.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {dept.subfolders.map(f => (
            <span
              key={f}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(129,140,248,0.12)',
                color: '#a5b4fc',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {f}/
            </span>
          ))}
        </div>
      )}
      {stats[dept.id] && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.entries(stats[dept.id]).map(([s, c]) => (
            <span
              key={s}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(52,211,153,0.1)',
                color: '#6ee7b7',
              }}
            >
              {s}: {c}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompanyPage({ data, onNavigate }) {
  const org         = data.organization || {};
  const departments = data.departments  || [];
  const stats       = data.departmentStats || {};
  const todoStats   = data.todos?.today?.stats || { incomplete: 0, complete: 0 };
  const totalFiles  = departments.reduce((sum, d) => sum + d.fileCount, 0);

  const scrollRef     = useRef(null);   // scroll container
  const contentRef    = useRef(null);   // inner content (Lenis target)
  const scrollValRef  = useRef(0);      // passed to WebGL uniform
  const heroRef       = useRef(null);
  const titleRef      = useRef(null);
  const subtitleRef   = useRef(null);
  const taglineRef    = useRef(null);

  // ── Lenis smooth scroll ────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: false,
    });

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.defaults({ scroller: wrapper });

    lenis.on('scroll', ({ scroll, velocity }) => {
      scrollValRef.current = velocity * 60;
      ScrollTrigger.update();
      void scroll;
    });

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.defaults({ scroller: window });
    };
  }, []);

  // ── GSAP 3D hero typography ────────────────────────────────────────────────
  useEffect(() => {
    const title    = titleRef.current;
    const subtitle = subtitleRef.current;
    const tagline  = taglineRef.current;
    if (!title) return;

    const chars = title.querySelectorAll('.cp-char');

    const ctx = gsap.context(() => {
      // 3D emergence: chars fly from deep z-space, rotated on X axis
      gsap.set(title, { perspective: 900 });
      gsap.from(chars, {
        z: -800,
        rotateX: -90,
        opacity: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: { each: 0.035, from: 'start' },
        delay: 0.15,
      });

      if (subtitle) {
        gsap.from(subtitle, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.55,
        });
      }

      if (tagline) {
        gsap.from(tagline, {
          clipPath: 'inset(0 100% 0 0)',
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          delay: 0.85,
        });
      }

      // Scroll-driven: hero fades and scales down as you scroll
      gsap.to(heroRef.current, {
        opacity: 0,
        scale: 0.92,
        y: -60,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8,
        },
      });
    });

    return () => ctx.revert();
  }, [org.business]);

  // ── Section headers clip-path reveal ──────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.cp-section-title').forEach(el => {
        gsap.from(el, {
          clipPath: 'inset(0 100% 0 0)',
          opacity: 0,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      });
    });
    return () => ctx.revert();
  }, [departments.length]);

  const name    = org.business || 'My Company';
  const goals   = org.goals    || 'Building something remarkable.';
  const since   = org.createdDate;

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* WebGL fluid — fixed behind everything */}
      <Suspense fallback={null}>
        <WebGLBackground scrollRef={scrollValRef} />
      </Suspense>

      {/* Dark overlay to ensure text readability */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(180deg, rgba(4,6,18,0.45) 0%, rgba(4,6,18,0.25) 50%, rgba(4,6,18,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          zIndex: 2,
        }}
      >
        <div ref={contentRef}>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section
            ref={heroRef}
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 clamp(24px, 6vw, 80px)',
              position: 'relative',
            }}
          >
            {/* Organization label */}
            {since && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(165,180,252,0.7)',
                  marginBottom: 24,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                Since {since}
              </div>
            )}

            {/* Giant title — split into chars for GSAP */}
            <h1
              ref={titleRef}
              style={{
                fontSize: 'clamp(52px, 10vw, 140px)',
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                color: '#ffffff',
                margin: 0,
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
            >
              {splitChars(name)}
            </h1>

            {/* Goals / tagline */}
            <p
              ref={subtitleRef}
              style={{
                marginTop: 28,
                fontSize: 'clamp(16px, 2.2vw, 22px)',
                fontWeight: 500,
                lineHeight: 1.55,
                color: 'rgba(240,242,247,0.65)',
                maxWidth: 560,
              }}
            >
              {goals}
            </p>

            {/* Accent line */}
            <div
              ref={taglineRef}
              style={{
                marginTop: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                clipPath: 'inset(0 0% 0 0)',
              }}
            >
              <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #818cf8, #34d399)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                {departments.length} Departments &nbsp;·&nbsp; {totalFiles} Files
              </span>
            </div>

            {/* Scroll hint */}
            <div
              style={{
                position: 'absolute',
                bottom: 40,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                opacity: 0.35,
                animation: 'cp-float 2.4s ease-in-out infinite',
              }}
            >
              <div style={{ width: 1, height: 48, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.7))' }} />
              <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>scroll</span>
            </div>
          </section>

          {/* ── Stats ──────────────────────────────────────────────────────── */}
          <section style={{ padding: 'clamp(60px, 8vw, 120px) clamp(24px, 6vw, 80px)' }}>
            <div className="cp-section-title" style={sectionTitleStyle}>
              At a Glance
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
              marginTop: 32,
            }}>
              <StatCard value={departments.length}     label="Departments"     color="#818cf8" delay={0}    />
              <StatCard value={totalFiles}             label="Total Files"     color="#60a5fa" delay={0.08} />
              <StatCard value={todoStats.incomplete}   label="Open TODOs"      color="#fbbf24" delay={0.16} />
              <StatCard value={todoStats.complete}     label="Completed Today" color="#34d399" delay={0.24} />
            </div>
          </section>

          {/* ── Departments ────────────────────────────────────────────────── */}
          {departments.length > 0 && (
            <section style={{ padding: '0 clamp(24px, 6vw, 80px) clamp(80px, 10vw, 160px)' }}>
              <div className="cp-section-title" style={sectionTitleStyle}>
                Departments
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14,
                marginTop: 32,
              }}>
                {departments.map((dept, i) => (
                  <DeptCard
                    key={dept.id}
                    dept={dept}
                    stats={stats}
                    onNavigate={onNavigate}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      <style>{`
        @keyframes cp-float {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  );
}

const sectionTitleStyle = {
  fontSize: 'clamp(28px, 4vw, 48px)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
  color: '#ffffff',
  lineHeight: 1,
};
