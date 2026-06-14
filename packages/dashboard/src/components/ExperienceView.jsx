/**
 * ExperienceView — Cinematic Renaissance × Streetwear Digital World
 *
 * Four-act scroll experience:
 *   Act I  (0–25%)   Void          — "BEYOND THE CANVAS"
 *   Act II (25–50%)  Gallery       — Renaissance hall, floating skateboard
 *   Act III(50–75%)  Feature       — Baroque spotlight, floating sneaker
 *   Act IV (75–100%) Finale        — Parchment dawn, shopping bag, "WEAR THE MUSEUM"
 *
 * Stack: R3F + GLSL FBM + GSAP ScrollTrigger + Lenis + @react-three/postprocessing
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles, RoundedBox, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

// ─── Inline font (Playfair Display via CSS injection) ────────────────────────

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&display=swap');
`;

// ─── Renaissance Backdrop GLSL ───────────────────────────────────────────────

const BACK_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACK_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSection;   // 0–1 global scroll progress
  uniform vec2  uMouse;

  varying vec2 vUv;

  // ── Noise infrastructure ──────────────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y) * 2.0 - 1.0;
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(0.8660,-0.5000, 0.5000, 0.8660);
    for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p * 2.01; a *= 0.5; }
    return v;
  }
  float fbmFast(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.1 + vec2(1.3, 0.7); a *= 0.5; }
    return v;
  }

  // ── Oil-paint canvas crackle ──────────────────────────────────────────────
  float crackle(vec2 p) {
    float c = 0.0;
    c += fbmFast(p * 12.0) * 0.6;
    c += fbmFast(p * 28.0 + 3.3) * 0.3;
    c += noise(p * 55.0) * 0.1;
    return c * 0.5 + 0.5;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.06;
    float s = uSection;

    // Mouse parallax warp
    vec2 m = uMouse - 0.5;
    uv += m * 0.04 * (1.0 - length(m));

    // FBM domain warp (2 layers)
    vec2 q = vec2(fbm(uv * 1.4 + t), fbm(uv * 1.4 + vec2(5.2, 1.3) + t));
    vec2 r = vec2(fbm(uv * 1.1 + 3.8*q + t*0.7), fbm(uv * 1.1 + 3.8*q + vec2(8.3,2.8) + t*0.7));
    float f = fbm(uv + 2.5*r + t*0.35) * 0.5 + 0.5;

    // Oil-paint texture overlay
    float paint = crackle(uv + t * 0.01);
    f = mix(f, f * 0.7 + paint * 0.3, 0.55);

    // ── Palette definitions ───────────────────────────────────────────────────
    // Act I — Void: jet black → deep purple
    vec3 vA0 = vec3(0.008, 0.008, 0.020);
    vec3 vA1 = vec3(0.045, 0.015, 0.090);
    vec3 vA2 = vec3(0.095, 0.035, 0.155);
    vec3 actI = mix(mix(vA0, vA1, smoothstep(0.2,0.55,f)), vA2, smoothstep(0.5,0.85,f)*0.4);

    // Act II — Gallery: burnt sienna → warm amber → antique gold
    vec3 vB0 = vec3(0.090, 0.035, 0.012); // burnt sienna shadow
    vec3 vB1 = vec3(0.200, 0.100, 0.028); // warm amber mid
    vec3 vB2 = vec3(0.330, 0.200, 0.050); // antique gold light
    vec3 vB3 = vec3(0.480, 0.310, 0.090); // golden highlight
    vec3 actII = mix(mix(vB0, vB1, smoothstep(0.18,0.48,f)), mix(vB2, vB3, smoothstep(0.52,0.82,f)), smoothstep(0.35,0.65,f));

    // Act III — Feature: midnight indigo → cobalt → gold accent
    vec3 vC0 = vec3(0.010, 0.020, 0.075);
    vec3 vC1 = vec3(0.035, 0.060, 0.180);
    vec3 vC2 = vec3(0.080, 0.120, 0.240);
    vec3 vC3 = vec3(0.280, 0.220, 0.060); // gold accent flecks
    vec3 actIII = mix(mix(vC0, vC1, smoothstep(0.15,0.45,f)), vC2, smoothstep(0.40,0.72,f));
    actIII = mix(actIII, vC3, smoothstep(0.75,0.95,f) * 0.35);

    // Act IV — Finale: raw umber → parchment cream
    vec3 vD0 = vec3(0.065, 0.040, 0.018);
    vec3 vD1 = vec3(0.170, 0.120, 0.065);
    vec3 vD2 = vec3(0.380, 0.290, 0.165);
    vec3 vD3 = vec3(0.620, 0.510, 0.330); // warm parchment
    vec3 actIV = mix(mix(vD0, vD1, smoothstep(0.12,0.40,f)), mix(vD2, vD3, smoothstep(0.42,0.78,f)), smoothstep(0.28,0.72,f));

    // Blend acts
    vec3 col = actI;
    col = mix(col, actII,  smoothstep(0.18, 0.32, s));
    col = mix(col, actIII, smoothstep(0.43, 0.57, s));
    col = mix(col, actIV,  smoothstep(0.68, 0.82, s));

    // Oil-paint saturation boost in middle acts
    float satBoost = smoothstep(0.18, 0.38, s) * smoothstep(0.82, 0.65, s);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * (col / max(vec3(lum), 0.001)), satBoost * 0.35);

    // Canvas texture micro-detail
    col += (paint - 0.5) * 0.04;

    // Radial vignette
    float vg = 1.0 - smoothstep(0.45, 1.1, length(vUv - 0.5) * 1.4);
    col *= vg;

    // Mouse proximity warm glow
    float md = length(uMouse - vUv);
    vec3 glowCol = mix(vec3(0.4, 0.25, 0.06), vec3(0.1, 0.05, 0.25), s);
    col += glowCol * (1.0 - smoothstep(0.0, 0.50, md)) * 0.06;

    gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
  }
`;

// ─── Renaissance Backdrop ────────────────────────────────────────────────────

function RenaissancePlane({ sectionRef, mouseRef }) {
  const meshRef = useRef();

  const uniforms = useRef({
    uTime:    { value: 0 },
    uSection: { value: 0 },
    uMouse:   { value: new THREE.Vector2(0.5, 0.5) },
  });

  useFrame(({ clock }) => {
    uniforms.current.uTime.value    = clock.getElapsedTime();
    uniforms.current.uSection.value += (sectionRef.current - uniforms.current.uSection.value) * 0.04;
    uniforms.current.uMouse.value.lerp(mouseRef.current, 0.03);
  });

  return (
    <mesh ref={meshRef} scale={[2.2, 2.2, 1]} position={[0, 0, -1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={BACK_VERT}
        fragmentShader={BACK_FRAG}
        uniforms={uniforms.current}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Gold Dust Particles ─────────────────────────────────────────────────────

function GoldDust({ sectionRef }) {
  const COUNT = 1800;
  const meshRef = useRef();

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const sz  = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
      const t = Math.random();
      // Gold → silver → cream gradient
      col[i * 3 + 0] = 0.8 + t * 0.2;
      col[i * 3 + 1] = 0.65 + t * 0.25;
      col[i * 3 + 2] = 0.15 + t * 0.5;
      sz[i] = 0.008 + Math.random() * 0.018;
    }
    return [pos, col, sz];
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      const base = positions[i * 3 + 1];
      posAttr.array[i * 3 + 1] = base + Math.sin(t * 0.18 + i * 0.83) * 0.04;
      posAttr.array[i * 3 + 0] = positions[i * 3] + Math.sin(t * 0.12 + i * 0.47) * 0.025;
    }
    posAttr.needsUpdate = true;

    // Fade during gallery act
    const s = sectionRef.current;
    const op = 0.12 + smootherstep(0, 0.25, s) * 0.5 - smootherstep(0.75, 1.0, s) * 0.3;
    meshRef.current.material.opacity = op;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color"    count={COUNT} array={colors}    itemSize={3} />
        <bufferAttribute attach="attributes-size"     count={COUNT} array={sizes}     itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.12}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function smootherstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ─── Atmospheric Fog Plane ───────────────────────────────────────────────────

function FogPlane({ sectionRef }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const s = sectionRef.current;
    // Dense fog in gallery (act II)
    const density = smootherstep(0.18, 0.35, s) * 0.22 - smootherstep(0.65, 0.82, s) * 0.12;
    ref.current.material.opacity = Math.max(0, density);
  });
  return (
    <mesh ref={ref} position={[0, -0.5, 0.3]} scale={[4, 1.5, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#c8a060"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Products ────────────────────────────────────────────────────────────────
// Geometric stand-ins. Swap mesh contents with useGLTF() when GLTF files are available.

function Skateboard({ sectionRef }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const s = sectionRef.current;
    // Visible in act II (gallery)
    const vis = smootherstep(0.20, 0.32, s) * (1 - smootherstep(0.48, 0.58, s));
    groupRef.current.visible = vis > 0.01;
    groupRef.current.children.forEach(c => { if (c.material) c.material.opacity = vis; });

    groupRef.current.position.x = Math.sin(t * 0.4) * 0.12 + 0.85;
    groupRef.current.position.y = Math.sin(t * 0.28 + 1.1) * 0.08 - 0.05;
    groupRef.current.rotation.x = Math.sin(t * 0.22) * 0.12 - 0.15;
    groupRef.current.rotation.y = t * 0.15 + Math.PI * 0.18;
    groupRef.current.rotation.z = Math.sin(t * 0.18 + 0.5) * 0.06;
    groupRef.current.scale.setScalar(vis * 0.9 + 0.1);
  });

  return (
    <group ref={groupRef}>
      {/* Deck */}
      <RoundedBox args={[0.95, 0.065, 2.6]} radius={0.08} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a0e06" roughness={0.75} metalness={0.08} transparent />
      </RoundedBox>
      {/* Grip tape graphic (slightly lighter top) */}
      <RoundedBox args={[0.88, 0.008, 2.45]} radius={0.04} smoothness={2} position={[0, 0.037, 0]}>
        <meshStandardMaterial color="#0c0806" roughness={0.95} transparent />
      </RoundedBox>
      {/* Gold trucks */}
      {[0.9, -0.9].map((z, i) => (
        <group key={i} position={[0, -0.07, z]}>
          <mesh>
            <boxGeometry args={[0.72, 0.055, 0.18]} />
            <meshStandardMaterial color="#c8a84b" metalness={0.92} roughness={0.12} transparent emissive="#8B6914" emissiveIntensity={0.25} />
          </mesh>
          {/* Wheels */}
          {[-0.3, 0.3].map((x, j) => (
            <mesh key={j} position={[x, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.115, 0.115, 0.09, 20]} />
              <meshStandardMaterial color="#f0ead8" roughness={0.55} transparent />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Sneaker({ sectionRef }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const s = sectionRef.current;
    // Visible in act III (feature)
    const vis = smootherstep(0.48, 0.60, s) * (1 - smootherstep(0.73, 0.82, s));
    groupRef.current.visible = vis > 0.01;
    groupRef.current.children.forEach(c => { if (c.material) c.material.opacity = vis; });

    groupRef.current.position.x = Math.sin(t * 0.32) * 0.10;
    groupRef.current.position.y = Math.sin(t * 0.25 + 0.8) * 0.09 + 0.1;
    groupRef.current.rotation.y = t * 0.22;
    groupRef.current.rotation.x = Math.sin(t * 0.18) * 0.08;
    groupRef.current.scale.setScalar((vis * 0.85 + 0.15) * 1.15);
  });

  return (
    <group ref={groupRef}>
      {/* Sole platform */}
      <RoundedBox args={[0.95, 0.14, 2.3]} radius={0.06} smoothness={4} position={[0, -0.22, 0]}>
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} transparent
          emissive="#fff8f0" emissiveIntensity={0.12} />
      </RoundedBox>
      {/* Midsole */}
      <RoundedBox args={[0.85, 0.08, 2.1]} radius={0.04} smoothness={3} position={[0, -0.12, 0]}>
        <meshStandardMaterial color="#1a1a2e" roughness={0.4} transparent
          emissive="#2233aa" emissiveIntensity={0.18} />
      </RoundedBox>
      {/* Upper body */}
      <RoundedBox args={[0.76, 0.38, 1.85]} radius={0.08} smoothness={4} position={[0, 0.12, -0.1]}>
        <meshStandardMaterial color="#0e0e22" roughness={0.5} metalness={0.1} transparent
          emissive="#1133cc" emissiveIntensity={0.10} />
      </RoundedBox>
      {/* Toe cap */}
      <mesh position={[0, 0.05, 0.78]}>
        <sphereGeometry args={[0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0e0e22" roughness={0.45} transparent
          emissive="#1133cc" emissiveIntensity={0.10} />
      </mesh>
      {/* Gold lace eyelets */}
      {[-0.3, -0.1, 0.1, 0.3].map((z, i) => (
        <mesh key={i} position={[0, 0.35, z - 0.15]}>
          <torusGeometry args={[0.055, 0.012, 8, 16]} />
          <meshStandardMaterial color="#c8a84b" metalness={0.95} roughness={0.08} transparent
            emissive="#f0c030" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function ShoppingBag({ sectionRef }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const s = sectionRef.current;
    // Visible in act IV (finale)
    const vis = smootherstep(0.73, 0.84, s);
    groupRef.current.visible = vis > 0.01;
    groupRef.current.children.forEach(c => { if (c.material) c.material.opacity = vis; });

    groupRef.current.position.x = Math.sin(t * 0.28 + 1.5) * 0.09 - 0.5;
    groupRef.current.position.y = Math.sin(t * 0.22) * 0.07 + 0.05;
    groupRef.current.rotation.y = t * 0.12 + Math.sin(t * 0.35) * 0.2;
    groupRef.current.scale.setScalar(vis * 0.9 + 0.1);
  });

  return (
    <group ref={groupRef}>
      {/* Bag body */}
      <RoundedBox args={[1.05, 1.50, 0.55]} radius={0.05} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#f5edd8" roughness={0.72} metalness={0.02} transparent
          emissive="#f0d890" emissiveIntensity={0.05} />
      </RoundedBox>
      {/* Gold logo strip */}
      <mesh position={[0, 0.05, 0.28]}>
        <boxGeometry args={[0.65, 0.12, 0.01]} />
        <meshStandardMaterial color="#c8a84b" metalness={0.95} roughness={0.08} transparent
          emissive="#f0c030" emissiveIntensity={0.3} />
      </mesh>
      {/* Handles — twisted gold rope */}
      {[-0.25, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0.99, 0]} rotation={[0, 0, x > 0 ? 0.18 : -0.18]}>
          <torusGeometry args={[0.22, 0.022, 10, 24, Math.PI * 1.05]} />
          <meshStandardMaterial color="#b8941e" metalness={0.88} roughness={0.12} transparent
            emissive="#d4a820" emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* Bottom fold */}
      <RoundedBox args={[0.95, 0.07, 0.47]} radius={0.03} smoothness={3} position={[0, -0.77, 0]}>
        <meshStandardMaterial color="#d8c8a8" roughness={0.8} transparent />
      </RoundedBox>
    </group>
  );
}

// ─── Volumetric Light Shafts (billboard planes) ──────────────────────────────

function LightShafts({ sectionRef }) {
  const shafts = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    x: (i - 2) * 0.55 + (Math.random() - 0.5) * 0.3,
    rot: (i - 2) * 0.08,
    delay: i * 0.3,
  })), []);

  const refs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = sectionRef.current;
    // Only in gallery act (act II)
    const base = smootherstep(0.22, 0.38, s) * (1 - smootherstep(0.55, 0.68, s));
    shafts.forEach((sh, i) => {
      const el = refs.current[i];
      if (!el) return;
      el.material.opacity = base * (0.04 + Math.sin(t * 0.3 + sh.delay) * 0.015);
    });
  });

  return (
    <>
      {shafts.map((sh, i) => (
        <mesh
          key={i}
          ref={el => { refs.current[i] = el; }}
          position={[sh.x, 0.2, -0.3]}
          rotation={[0, 0, sh.rot]}
        >
          <planeGeometry args={[0.18, 4.0]} />
          <meshBasicMaterial
            color="#f0c060"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── Camera drift ────────────────────────────────────────────────────────────

function CameraDrift({ sectionRef }) {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const s = sectionRef.current;
    camera.position.x = Math.sin(t * 0.12) * 0.08 + s * 0.05;
    camera.position.y = Math.sin(t * 0.09 + 0.5) * 0.06 - s * 0.03;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Full 3D Scene ───────────────────────────────────────────────────────────

function Scene3D({ sectionRef, mouseRef }) {
  return (
    <>
      <RenaissancePlane sectionRef={sectionRef} mouseRef={mouseRef} />
      <GoldDust sectionRef={sectionRef} />
      <FogPlane sectionRef={sectionRef} />
      <LightShafts sectionRef={sectionRef} />
      <Skateboard sectionRef={sectionRef} />
      <Sneaker sectionRef={sectionRef} />
      <ShoppingBag sectionRef={sectionRef} />
      <CameraDrift sectionRef={sectionRef} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.18}
          luminanceSmoothing={0.6}
          intensity={1.8}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          offset={[0.0008, 0.0008]}
          blendFunction={BlendFunction.NORMAL}
        />
        <Vignette eskil={false} offset={0.12} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

// ─── HTML Typography Sections ─────────────────────────────────────────────────

const S = {
  section: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '0 8vw',
    position: 'relative',
    pointerEvents: 'none',
  },
  serif: {
    fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    letterSpacing: '-0.01em',
    lineHeight: 0.92,
  },
  mono: {
    fontFamily: '"Courier New", monospace',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
};

function ActI() {
  return (
    <section style={S.section}>
      <p style={{ ...S.mono, fontSize: 'clamp(9px,1.1vw,13px)', color: 'rgba(180,140,60,0.75)', marginBottom: '2rem', pointerEvents: 'none' }}>
        DIGITAL COLLECTION · VOL. I
      </p>
      <h1 style={{ ...S.serif, fontSize: 'clamp(52px,8.5vw,128px)', color: '#f5e8c0', marginBottom: '1.5rem', maxWidth: '14ch' }}>
        BEYOND<br />THE<br />CANVAS
      </h1>
      <p style={{ ...S.mono, fontSize: 'clamp(10px,1.0vw,12px)', color: 'rgba(200,168,75,0.6)', marginTop: '2.5rem' }}>
        SCROLL TO ENTER THE MUSEUM
      </p>
    </section>
  );
}

function ActII() {
  return (
    <section style={{ ...S.section, alignItems: 'flex-end' }}>
      <p style={{ ...S.mono, fontSize: 'clamp(9px,1.0vw,12px)', color: 'rgba(140,90,30,0.7)', marginBottom: '1.5rem' }}>
        THE GALLERY · 1503
      </p>
      <h2 style={{ ...S.serif, fontSize: 'clamp(36px,6vw,96px)', color: '#e8c880', textAlign: 'right', maxWidth: '16ch' }}>
        WHERE<br />TRADITION<br />MEETS<br />TOMORROW
      </h2>
      <p style={{ ...S.serif, fontStyle: 'italic', fontSize: 'clamp(14px,1.6vw,22px)', color: 'rgba(210,170,80,0.65)', marginTop: '2rem', textAlign: 'right', maxWidth: '38ch' }}>
        "The Renaissance masters painted the streets of eternity —<br />
        we walk them now."
      </p>
    </section>
  );
}

function ActIII() {
  return (
    <section style={S.section}>
      <p style={{ ...S.mono, fontSize: 'clamp(9px,1.0vw,12px)', color: 'rgba(80,120,220,0.7)', marginBottom: '1.5rem' }}>
        THE FEATURE · SS 2025
      </p>
      <h2 style={{ ...S.serif, fontSize: 'clamp(38px,6.5vw,104px)', color: '#c8d8ff', maxWidth: '14ch' }}>
        THE<br />FUTURE<br />IS<br />TIMELESS
      </h2>
      <div style={{ marginTop: '2.5rem', borderLeft: '2px solid rgba(100,130,220,0.4)', paddingLeft: '1.5rem' }}>
        <p style={{ ...S.mono, fontSize: 'clamp(10px,1.0vw,13px)', color: 'rgba(150,180,255,0.65)', lineHeight: 1.9 }}>
          LIMITED EDITION<br />
          BAROQUE SERIES NO. 001
        </p>
      </div>
    </section>
  );
}

function ActIV() {
  return (
    <section style={{ ...S.section, alignItems: 'center', textAlign: 'center' }}>
      <p style={{ ...S.mono, fontSize: 'clamp(9px,1.0vw,12px)', color: 'rgba(140,100,40,0.7)', marginBottom: '1.5rem' }}>
        FINALE · THE COLLECTION
      </p>
      <h2 style={{ ...S.serif, fontSize: 'clamp(42px,7.5vw,120px)', color: '#d4b870', maxWidth: '16ch', textAlign: 'center' }}>
        WEAR<br />THE<br />MUSEUM
      </h2>
      <p style={{ ...S.serif, fontStyle: 'italic', fontSize: 'clamp(14px,1.5vw,20px)', color: 'rgba(180,140,80,0.65)', marginTop: '2rem', maxWidth: '42ch', lineHeight: 1.7 }}>
        Every stitch a brushstroke. Every silhouette a masterpiece.
      </p>
      <p style={{ ...S.mono, fontSize: 'clamp(9px,1.0vw,12px)', color: 'rgba(160,120,50,0.5)', marginTop: '3rem', letterSpacing: '0.2em' }}>
        ✦ SHOP THE COLLECTION ✦
      </p>
    </section>
  );
}

// ─── ExperienceView ──────────────────────────────────────────────────────────

export default function ExperienceView({ onBack }) {
  const containerRef = useRef(null);
  const sectionRef   = useRef(0);       // 0–1 scroll progress (read each frame, no re-renders)
  const mouseRef     = useRef(new THREE.Vector2(0.5, 0.5));

  // Inject Google Fonts
  useEffect(() => {
    const id = 'experience-fonts';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = FONT_STYLE;
      document.head.appendChild(style);
    }
  }, []);

  // Global mouse tracker (updates ref, no re-renders)
  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Lenis + GSAP ScrollTrigger
  useEffect(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;

    const lenis = new Lenis({
      wrapper,
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // @ts-ignore
      autoRaf: false,
    });

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.defaults({ scroller: wrapper });

    lenis.on('scroll', ScrollTrigger.update);

    // Master progress tracker (drives sectionRef which feeds WebGL uniforms)
    const scrollTween = ScrollTrigger.create({
      trigger: wrapper.querySelector('.exp-scroll-content'),
      scroller: wrapper,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { sectionRef.current = self.progress; },
    });

    // Per-section entrance animations
    ['[data-act="1"]', '[data-act="2"]', '[data-act="3"]', '[data-act="4"]'].forEach((sel, i) => {
      const el = wrapper.querySelector(sel);
      if (!el) return;
      const children = el.querySelectorAll('h1, h2, p');
      gsap.set(children, { opacity: 0, y: 40 });
      ScrollTrigger.create({
        trigger: el,
        scroller: wrapper,
        start: 'top 72%',
        once: true,
        onEnter: () => {
          gsap.to(children, {
            opacity: 1,
            y: 0,
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.12,
            delay: 0.05,
          });
        },
      });
    });

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.defaults({ scroller: window });
      scrollTween.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden auto',
        background: '#010208',
        zIndex: 200,
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: 24,
          left: 24,
          zIndex: 400,
          background: 'rgba(10,8,20,0.65)',
          border: '1px solid rgba(200,168,75,0.35)',
          color: 'rgba(200,168,75,0.9)',
          fontFamily: '"Courier New", monospace',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: '8px 16px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.target.style.background = 'rgba(200,168,75,0.18)'; }}
        onMouseLeave={e => { e.target.style.background = 'rgba(10,8,20,0.65)'; }}
      >
        ← EXIT
      </button>

      {/* Fixed WebGL Canvas */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 1.2], fov: 70, near: 0.1, far: 20 }}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%' }}
        >
          <Scene3D sectionRef={sectionRef} mouseRef={mouseRef} />
        </Canvas>
      </div>

      {/* HTML scroll content */}
      <div
        className="exp-scroll-content"
        style={{ position: 'relative', zIndex: 10, minHeight: '400vh' }}
      >
        <div data-act="1"><ActI /></div>
        <div data-act="2"><ActII /></div>
        <div data-act="3"><ActIII /></div>
        <div data-act="4"><ActIV /></div>
      </div>
    </div>
  );
}
