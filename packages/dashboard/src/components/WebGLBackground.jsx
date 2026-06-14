import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Vertex shader ───────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── Fragment shader — 2-layer FBM domain warp ───────────────────────────────

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uScroll;

  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(hash(i),              hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    ) * 2.0 - 1.0;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(0.8660, -0.5000, 0.5000, 0.8660);
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p  = m * p * 2.01;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t  = uTime * 0.045;

    // Mouse warp
    vec2 m = uMouse - 0.5;
    uv += m * 0.06 * (1.0 - length(m));

    // Scroll parallax
    uv.y -= uScroll * 0.0012;

    // Layer 1 — direction field q
    vec2 q = vec2(
      fbm(uv * 1.5 + t),
      fbm(uv * 1.5 + vec2(5.2, 1.3) + t)
    );

    // Layer 2 — warped by q
    vec2 r = vec2(
      fbm(uv * 1.2 + 4.2 * q + vec2(1.7, 9.2) + t * 0.8),
      fbm(uv * 1.2 + 4.2 * q + vec2(8.3, 2.8) + t * 0.8)
    );

    float f = fbm(uv + 3.0 * r + t * 0.4);
    f = f * 0.5 + 0.5;

    // Palette: deep void → indigo → electric violet → ice teal
    vec3 c0 = vec3(0.004, 0.008, 0.027); // #010207  void
    vec3 c1 = vec3(0.035, 0.028, 0.165); // #090730  deep indigo
    vec3 c2 = vec3(0.118, 0.039, 0.314); // #1e0a50  electric violet
    vec3 c3 = vec3(0.031, 0.157, 0.298); // #08284c  ice teal
    vec3 c4 = vec3(0.275, 0.110, 0.502); // #461c80  bright violet accent

    vec3 col = c0;
    col = mix(col, c1, smoothstep(0.15, 0.45, f));
    col = mix(col, c2, smoothstep(0.40, 0.70, f));
    col = mix(col, c3, smoothstep(0.65, 0.88, f) * 0.45);
    col = mix(col, c4, smoothstep(0.80, 1.00, f) * 0.25);

    // Mouse proximity glow — cyan corona
    float md = length(uMouse - vUv);
    col += vec3(0.008, 0.028, 0.120) * smoothstep(0.60, 0.0, md);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Inner plane component (inside Canvas) ───────────────────────────────────

function FluidPlane({ scrollRef }) {
  const mouseRef  = useRef(new THREE.Vector2(0.5, 0.5));
  const velRef    = useRef(0);

  const uniforms = useRef({
    uTime:   { value: 0 },
    uMouse:  { value: new THREE.Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
  });

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.set(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight,
      );
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(({ clock }) => {
    const u = uniforms.current;
    u.uTime.value = clock.getElapsedTime();
    u.uMouse.value.lerp(mouseRef.current, 0.035);

    const target = scrollRef?.current ?? 0;
    velRef.current += (target - velRef.current) * 0.07;
    u.uScroll.value = velRef.current;
  });

  return (
    <mesh scale={[2, 2, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms.current}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Canvas wrapper ───────────────────────────────────────────────────────────

export default function WebGLBackground({ scrollRef }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 1], fov: 75, near: 0.1, far: 10 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        style={{ width: '100%', height: '100%' }}
      >
        <FluidPlane scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}
