import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Floating 3D wordmark.
 *
 * The wordmark strokes come from a grayscale mask (see
 * `scripts/build-logo-mask.py`). The mask is displaced onto a densely
 * subdivided plane, so the letters are real geometry with real normals: they
 * catch specular light along their rounded edges and read as extruded, not as a
 * flat sprite. Vertices are displaced once on the CPU at load time; the
 * per-frame loop only moves the group, so the animation stays cheap.
 */

const MASK_URL = '/xignis-wordmark-mask.png';

// Plane size in world units. Segments are sized so one quad is roughly 4px of
// the 1342px-wide mask: enough to resolve the hairline strokes without
// wasting triangles on the empty margins.
const PLANE_WIDTH = 6;
const SEGMENTS_X = 400;
const SEGMENTS_Y = 226;

// Edges of the smoothstep that turns the blurred mask into a plateau with
// steep walls. Lower values keep the stroke edges crisper.
const EDGE_START = 0.32;
const EDGE_END = 0.68;

const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);

const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Bilinear sample of a single-channel mask, with `v` flipped to image order. */
const sampleMask = (data, maskWidth, maskHeight, u, v) => {
  const px = clamp01(u) * (maskWidth - 1);
  const py = (1 - clamp01(v)) * (maskHeight - 1);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, maskWidth - 1);
  const y1 = Math.min(y0 + 1, maskHeight - 1);
  const fx = px - x0;
  const fy = py - y0;

  const at = (x, y) => data[(y * maskWidth + x) * 4] / 255;
  const top = at(x0, y0) + (at(x1, y0) - at(x0, y0)) * fx;
  const bottom = at(x0, y1) + (at(x1, y1) - at(x0, y1)) * fx;
  return top + (bottom - top) * fy;
};

/**
 * Displace a plane by the mask. Returns the geometry plus its height so the
 * caller can frame the camera without hardcoding the aspect ratio.
 */
const buildWordmarkGeometry = (mask, depth) => {
  const aspect = mask.width / mask.height;
  const geometry = new THREE.PlaneGeometry(
    PLANE_WIDTH,
    PLANE_WIDTH / aspect,
    SEGMENTS_X,
    SEGMENTS_Y
  );

  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < position.count; i += 1) {
    const sample = sampleMask(
      mask.data,
      mask.width,
      mask.height,
      uv.getX(i),
      uv.getY(i)
    );
    position.setZ(i, smoothstep(EDGE_START, EDGE_END, sample) * depth);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();

  return { geometry, width: PLANE_WIDTH, height: PLANE_WIDTH / aspect };
};

/**
 * Per-fragment normal map derived from the height field.
 *
 * Vertex normals alone band badly: a stroke is only ~10 vertices wide, so the
 * rounded bevel shades as discrete facets (very visible on the dot of the "i").
 * Sampling the gradient per fragment makes the shading smooth independently of
 * tessellation, so the mesh only has to carry the silhouette.
 *
 * Built through a canvas rather than a DataTexture so it shares the alphaMap's
 * flipY handling and the two cannot drift out of alignment.
 */
const buildNormalMap = (mask, depth) => {
  const { width, height, data } = mask;
  const heights = new Float32Array(width * height);

  for (let i = 0; i < heights.length; i += 1) {
    heights[i] = smoothstep(EDGE_START, EDGE_END, data[i * 4] / 255) * depth;
  }

  const at = (x, y) =>
    heights[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];

  const du = 1 / (width - 1);
  const dv = 1 / (height - 1);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // v runs opposite to image rows, hence the sign flip on dh/dv.
      const dhdu = (at(x + 1, y) - at(x - 1, y)) / (2 * du);
      const dhdv = -(at(x, y + 1) - at(x, y - 1)) / (2 * dv);

      const nx = -dhdu;
      const ny = -dhdv;
      const nz = 1;
      const length = Math.hypot(nx, ny, nz);

      const offset = (y * width + x) * 4;
      pixels.data[offset] = ((nx / length) * 0.5 + 0.5) * 255;
      pixels.data[offset + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      pixels.data[offset + 2] = ((nz / length) * 0.5 + 0.5) * 255;
      pixels.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(pixels, 0, 0);

  // Mip levels are correct here: averaging normals while minifying is exactly
  // what stops the bevels from speckling. The cutout map must NOT be mipmapped
  // (see the loader), which is why the two are handled separately.
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  return texture;
};

/** Soft radial gradient used as the backdrop glow behind the wordmark. */
const createGlowTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
};

/** Read the mask texture into CPU-side single-channel data. */
const readMask = image => {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  return {
    width: canvas.width,
    height: canvas.height,
    data: ctx.getImageData(0, 0, canvas.width, canvas.height).data
  };
};

const Logo3D = ({
  color = '#08EF01',
  glowColor = '#08EF01',
  glow = true,
  depth = 0.42,
  floatIntensity = 1,
  parallax = 0.22,
  metalness = 0.72,
  roughness = 0.24,
  background = '#020401'
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    let scene;
    let camera;
    let geometry;
    let material;
    let glowTexture;
    let frame = 0;
    let cleanupTextureLoader;
    let backdrop = null;
    const ownedTextures = [];

    const pointer = new THREE.Vector2();
    const targetPointer = new THREE.Vector2();
    const clock = new THREE.Clock();

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const rendererOptions = { alpha: true, antialias: true, powerPreference: 'high-performance' };
    renderer = new THREE.WebGLRenderer(rendererOptions);
    renderer.setClearColor(new THREE.Color(background), 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    // A studio environment gives the bevels something to reflect; without it the
    // letters read as flat plastic no matter how many lights are added.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-3.2, 4.4, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight(new THREE.Color(color), 3.4);
    rim.position.set(4.6, -1.6, -3.4);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(new THREE.Color(glowColor), 0.7);
    fill.position.set(2.8, 3.2, 2.4);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0x0b1f08, 1.2));

    const pivot = new THREE.Group();
    scene.add(pivot);

    let wordmark = null;

    const onResize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      // `updateStyle` must stay on: with it disabled the canvas keeps no CSS
      // size and lays out at its buffer size (x devicePixelRatio), so on a
      // retina display the canvas overflows and only one corner is visible.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      if (wordmark) {
        const vFov = (camera.fov * Math.PI) / 180;
        const tanHalf = Math.tan(vFov / 2);

        // Portrait viewports are height-rich and width-poor, so a single wide
        // margin leaves the wordmark looking small on phones.
        const margin = camera.aspect < 0.85 ? 1.18 : 1.5;

        // Reserve the lower strip of the viewport for the tagline. Without this
        // a short landscape window stacks the two on top of each other.
        const reserve = height < 520 ? 0.26 : height < 700 ? 0.18 : 0.1;
        const usableHeight = height * (1 - reserve);

        // Fit in pixels and take the scale that satisfies the tighter axis, so
        // the framing is exact instead of approximate.
        const pxPerWorld = Math.min(
          width / (margin * wordmark.width),
          usableHeight / (margin * wordmark.height)
        );

        camera.position.z = height / pxPerWorld / (2 * tanHalf);
        // Centre the wordmark in the area above the reserved tagline strip.
        camera.position.y = (-height * reserve) / 2 / pxPerWorld;
      }
    };

    const onPointerMove = event => {
      const rect = container.getBoundingClientRect();
      targetPointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1
      );
    };

    const onPointerLeave = () => targetPointer.set(0, 0);

    const renderFrame = () => {
      frame = requestAnimationFrame(renderFrame);

      const elapsed = clock.getElapsedTime();
      const motion = motionQuery.matches ? 0 : floatIntensity;

      // Ease the pointer so the parallax never snaps.
      pointer.lerp(targetPointer, 0.045);

      pivot.position.y = Math.sin(elapsed * 0.62) * 0.13 * motion;
      pivot.rotation.y = Math.sin(elapsed * 0.34) * 0.1 * motion + pointer.x * parallax;
      pivot.rotation.x = Math.cos(elapsed * 0.27) * 0.05 * motion - pointer.y * parallax;
      pivot.rotation.z = Math.sin(elapsed * 0.21) * 0.015 * motion;

      if (backdrop) {
        const pulse = 1 + Math.sin(elapsed * 0.5) * 0.045 * motion;
        backdrop.scale.setScalar(pulse);
      }

      renderer.render(scene, camera);
    };

    const loader = new THREE.TextureLoader();
    cleanupTextureLoader = () => loader.abort?.();

    loader.load(
      MASK_URL,
      texture => {
        const image = texture.image;
        const mask = readMask(image);
        const built = buildWordmarkGeometry(mask, depth);

        geometry = built.geometry;
        wordmark = { width: built.width, height: built.height };

        // Mipmapping the cutout erodes the silhouette into a sawtooth under
        // alphaTest, so the mask is sampled without mip levels.
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const normalMap = buildNormalMap(mask, depth);
        ownedTextures.push(texture, normalMap);

        material = new THREE.MeshPhysicalMaterial({
          // The mask doubles as the cutout: without it the flat area between the
          // letters still shades as metal and reads as a solid green quad.
          alphaMap: texture,
          alphaTest: 0.42,
          normalMap,
          normalScale: new THREE.Vector2(1.15, 1.15),
          color: new THREE.Color(color).multiplyScalar(0.5),
          metalness,
          roughness,
          side: THREE.DoubleSide,
          clearcoat: 0.6,
          clearcoatRoughness: 0.16,
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.12,
          envMapIntensity: 0.85
        });

        const mesh = new THREE.Mesh(geometry, material);
        pivot.add(mesh);

        if (glow) {
          glowTexture = createGlowTexture();
          const backdrop = new THREE.Mesh(
            new THREE.PlaneGeometry(built.width * 2.1, built.height * 2.6),
            new THREE.MeshBasicMaterial({
              map: glowTexture,
              color: new THREE.Color(glowColor),
              transparent: true,
              opacity: 0.38,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
          );
          backdrop.position.z = -3;
          scene.add(backdrop);
        }

        // `texture` is still bound as the alphaMap, so it must outlive the load
        // callback and is disposed with the scene.
        onResize();
        renderFrame();
      },
      undefined,
      () => {
        // Without the mask there is nothing to render; the rest of the page
        // (headline, tagline) still shows.
        container.dataset.failed = 'true';
      }
    );

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries[0].isIntersecting;
        if (visible && frame === 0) renderFrame();
        if (!visible && frame !== 0) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    onResize();
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    // Recompute the framing on element resize too, not just window resize, so
    // the wordmark still fits when the layout settles or rotates.
    const resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(container);

    window.addEventListener('resize', onResize);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;

      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      observer.disconnect();
      cleanupTextureLoader?.();

      scene.traverse(object => {
        if (object.isMesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(entry => entry.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      ownedTextures.forEach(entry => entry.dispose());
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [color, glowColor, glow, depth, floatIntensity, parallax, metalness, roughness, background]);

  return <div ref={containerRef} className="logo-3d" />;
};

export default Logo3D;
