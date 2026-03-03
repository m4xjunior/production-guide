"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Vec3Like = {
  x?: number;
  y?: number;
  z?: number;
};

type AssemblyVisualConfig = {
  modelUrl?: string;
  focusNode?: string;
  from?: Vec3Like;
  to?: Vec3Like;
  camera?: Vec3Like & { zoom?: number };
  durationMs?: number;
  loop?: boolean;
  label?: string;
  instruction?: string;
};

interface StepAssemblyViewerProps {
  sourceUrl: string;
  className?: string;
  stepLabel?: string;
}

function easeInOutSine(value: number): number {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function toVector3(value: Vec3Like | undefined, fallback: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    value?.x ?? fallback.x,
    value?.y ?? fallback.y,
    value?.z ?? fallback.z,
  );
}

function isJsonUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".json");
  } catch {
    return url.toLowerCase().includes(".json");
  }
}

function enhanceMaterial(material: THREE.Material): THREE.Material {
  const cloned = material.clone() as THREE.Material & {
    emissive?: THREE.Color;
    emissiveIntensity?: number;
  };

  if ("emissive" in cloned) {
    cloned.emissive = new THREE.Color("#22c55e");
  }
  if ("emissiveIntensity" in cloned) {
    cloned.emissiveIntensity = 0.7;
  }

  return cloned;
}

async function resolveVisualSource(sourceUrl: string): Promise<{
  modelUrl: string;
  config: AssemblyVisualConfig;
}> {
  if (!isJsonUrl(sourceUrl)) {
    return {
      modelUrl: sourceUrl,
      config: {},
    };
  }

  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar la configuracion visual (${response.status})`);
  }

  const parsed = (await response.json()) as AssemblyVisualConfig;
  if (!parsed.modelUrl || typeof parsed.modelUrl !== "string") {
    throw new Error("La configuracion visual no contiene 'modelUrl'");
  }

  return {
    modelUrl: parsed.modelUrl,
    config: parsed,
  };
}

export function StepAssemblyViewer({
  sourceUrl,
  className,
  stepLabel,
}: StepAssemblyViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlayLabel, setOverlayLabel] = useState<string>("Guia visual");
  const [overlayInstruction, setOverlayInstruction] = useState<string>("");

  useEffect(() => {
    let disposed = false;
    let animationFrameId = 0;
    let resizeObserver: ResizeObserver | null = null;

    const mount = mountRef.current;
    if (!mount || !sourceUrl) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
    camera.position.set(2.4, 2, 2.4);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
    keyLight.position.set(3, 4, 2);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-2, 2, -3);

    scene.add(ambient, keyLight, fillLight);

    const loader = new GLTFLoader();

    const setRendererSize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      const aspect = width / height;
      const frustumHeight = 3;
      const frustumWidth = frustumHeight * aspect;

      camera.left = -frustumWidth / 2;
      camera.right = frustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    setRendererSize();

    const boot = async () => {
      try {
        const { modelUrl, config } = await resolveVisualSource(sourceUrl);
        if (disposed) return;

        setOverlayLabel(config.label || "Guia visual");
        setOverlayInstruction(config.instruction || "");

        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;

            const root = gltf.scene;
            scene.add(root);

            const bounds = new THREE.Box3().setFromObject(root);
            const center = bounds.getCenter(new THREE.Vector3());
            const size = bounds.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 1);

            const focusObject = config.focusNode
              ? root.getObjectByName(config.focusNode)
              : undefined;
            const animatedObject = focusObject ?? root;

            if (focusObject) {
              focusObject.traverse((child) => {
                if (!(child instanceof THREE.Mesh)) return;
                if (Array.isArray(child.material)) {
                  child.material = child.material.map((material) => enhanceMaterial(material));
                  return;
                }
                child.material = enhanceMaterial(child.material);
              });
            }

            const targetPosition = animatedObject.position.clone();
            const startPosition = toVector3(
              config.from,
              targetPosition.clone().add(new THREE.Vector3(0, maxDim * 0.2, 0)),
            );
            const endPosition = toVector3(config.to, targetPosition);

            animatedObject.position.copy(startPosition);

            const marker = new THREE.Group();
            marker.position.copy(endPosition);

            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(maxDim * 0.12, Math.max(maxDim * 0.008, 0.01), 16, 48),
              new THREE.MeshBasicMaterial({
                color: "#22c55e",
                transparent: true,
                opacity: 0.5,
              }),
            );
            ring.rotation.x = Math.PI / 2;

            const arrow = new THREE.Mesh(
              new THREE.ConeGeometry(Math.max(maxDim * 0.035, 0.02), Math.max(maxDim * 0.12, 0.06), 16),
              new THREE.MeshBasicMaterial({
                color: "#16a34a",
                transparent: true,
                opacity: 0.65,
              }),
            );
            arrow.position.y = Math.max(maxDim * 0.1, 0.08);

            marker.add(ring, arrow);
            scene.add(marker);

            const desiredZoom = config.camera?.zoom ?? 1.1;
            const defaultCameraPosition = center.clone().add(new THREE.Vector3(maxDim * 1.45, maxDim * 1.15, maxDim * 1.45));
            const configuredCamera = toVector3(config.camera, defaultCameraPosition);

            camera.position.copy(configuredCamera);
            camera.zoom = desiredZoom;
            camera.lookAt(center);
            camera.updateProjectionMatrix();

            const durationMs = Math.max(config.durationMs ?? 1800, 700);
            const shouldLoop = config.loop ?? true;
            const startTime = performance.now();

            const animate = (now: number) => {
              if (disposed) return;

              const elapsed = now - startTime;
              const linearPhase = shouldLoop
                ? ((elapsed % durationMs) / durationMs)
                : Math.min(elapsed / durationMs, 1);

              const pingPongPhase = shouldLoop
                ? linearPhase < 0.5
                  ? linearPhase * 2
                  : (1 - linearPhase) * 2
                : linearPhase;

              const easedPhase = easeInOutSine(pingPongPhase);
              const currentPosition = new THREE.Vector3().lerpVectors(startPosition, endPosition, easedPhase);
              animatedObject.position.copy(currentPosition);

              const pulse = 0.42 + Math.abs(Math.sin(elapsed / 420)) * 0.34;
              (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
              (arrow.material as THREE.MeshBasicMaterial).opacity = Math.min(pulse + 0.1, 0.85);

              root.rotation.y = Math.sin(elapsed / 2200) * 0.08;

              renderer.render(scene, camera);
              animationFrameId = window.requestAnimationFrame(animate);
            };

            setIsLoading(false);
            animationFrameId = window.requestAnimationFrame(animate);
          },
          undefined,
          (loadError) => {
            if (disposed) return;
            console.error("Error cargando modelo 3D:", loadError);
            setError("No se pudo cargar el modelo 3D");
            setIsLoading(false);
          },
        );
      } catch (bootError) {
        if (disposed) return;
        console.error("Error preparando guía visual:", bootError);
        setError("No se pudo cargar la guia visual");
        setIsLoading(false);
      }
    };

    void boot();

    resizeObserver = new ResizeObserver(() => {
      setRendererSize();
    });
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      if (resizeObserver) resizeObserver.disconnect();
      renderer.dispose();
      mount.innerHTML = "";
    };
  }, [sourceUrl]);

  return (
    <div className={`relative aspect-video${className ? ` ${className}` : ""}`}>
      <div ref={mountRef} className="absolute inset-0" />

      <div className="absolute top-2 left-2 bg-background/85 border border-border rounded px-2 py-1 text-xs font-semibold text-foreground">
        {stepLabel ?? overlayLabel}
      </div>

      {overlayInstruction && (
        <div className="absolute left-2 right-2 bottom-2 bg-background/85 border border-border rounded px-2 py-1 text-xs text-foreground">
          {overlayInstruction}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <p className="text-sm text-muted-foreground">Cargando animacion 3D...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
