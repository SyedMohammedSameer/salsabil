// 🌟 Professional 3D Garden using Three.js
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Tree, TreeType, TreeGrowthStage } from '../types';

interface Garden3DLandscapeProps {
  trees: Tree[];
  loading?: boolean;
}

const Garden3DLandscape: React.FC<Garden3DLandscapeProps> = ({ trees, loading = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  useEffect(() => {
    if (!mountRef.current || trees.length === 0) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 20, 50);
    sceneRef.current = scene;

    // Camera setup (Isometric-style)
    const width = mountRef.current.clientWidth;
    const height = 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7CFC00,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(40, 20, 0x228B22, 0x32CD32);
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Create trees
    const gridSize = Math.ceil(Math.sqrt(trees.length));
    const spacing = 3;
    const offset = (gridSize * spacing) / 2;

    trees.forEach((tree, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;

      // Position with some randomness
      const x = col * spacing - offset + (Math.random() - 0.5) * 0.5;
      const z = row * spacing - offset + (Math.random() - 0.5) * 0.5;

      // Tree size based on growth stage
      const scale =
        tree.growthStage === TreeGrowthStage.Seed ? 0.3 :
        tree.growthStage === TreeGrowthStage.Sprout ? 0.5 :
        tree.growthStage === TreeGrowthStage.Sapling ? 0.7 :
        tree.growthStage === TreeGrowthStage.YoungTree ? 0.9 : 1.2;

      // Create tree group
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, 0, z);
      (treeGroup as any).userData = { tree };

      // Trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 1 * scale, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = (0.5 * scale);
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Foliage (cone or sphere based on type)
      let foliageMaterial: THREE.MeshStandardMaterial;

      if (tree.type === TreeType.QuranReading || tree.type === TreeType.Dhikr) {
        foliageMaterial = new THREE.MeshStandardMaterial({
          color: tree.type === TreeType.QuranReading ? 0xFF69B4 : 0xFFD700
        });
      } else {
        foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
      }

      const foliageGeometry = tree.growthStage === TreeGrowthStage.MatureTree
        ? new THREE.SphereGeometry(0.8 * scale, 8, 8)
        : new THREE.ConeGeometry(0.6 * scale, 1.2 * scale, 8);

      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = tree.growthStage === TreeGrowthStage.MatureTree
        ? 1.5 * scale
        : 1.6 * scale;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      // Add subtle glow for mature trees
      if (tree.growthStage === TreeGrowthStage.MatureTree) {
        const glowGeometry = new THREE.SphereGeometry(0.85 * scale, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.1
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 1.5 * scale;
        treeGroup.add(glow);
      }

      scene.add(treeGroup);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Gentle camera rotation
      if (camera && sceneRef.current) {
        const time = Date.now() * 0.0001;
        camera.position.x = Math.cos(time) * 15;
        camera.position.z = Math.sin(time) * 15;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !object.parent.userData.tree) {
          object = object.parent as THREE.Object3D;
        }
        if (object.parent && object.parent.userData.tree) {
          setSelectedTree(object.parent.userData.tree);
        }
      }
    };

    mountRef.current.addEventListener('click', onMouseClick);

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeEventListener('click', onMouseClick);
        if (rendererRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      renderer.dispose();
    };
  }, [trees]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = 400;

        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🌱</div>
          <p className="text-lg text-slate-600 dark:text-slate-400">Growing your 3D garden...</p>
        </div>
      </div>
    );
  }

  if (trees.length === 0) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-4">🌱</div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Your 3D Garden Awaits
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Complete focus sessions to watch your garden grow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={mountRef}
        className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-200 dark:border-emerald-800"
        style={{ height: '400px', cursor: 'pointer' }}
      />

      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌳</span>
          <div>
            <div className="font-bold">{trees.length} Trees</div>
            <div className="text-xs opacity-80">Click to select</div>
          </div>
        </div>
      </div>

      {/* Tree Detail Modal */}
      {selectedTree && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTree(null)}
        >
          <div
            className="bg-gradient-to-br from-white to-emerald-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border-2 border-emerald-300 dark:border-emerald-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-7xl mb-4">🌳</div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                {selectedTree.varietyName || 'Focus Tree'}
              </h3>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-slate-700/60 rounded-xl">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Focus Time</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedTree.focusMinutes} min</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-slate-700/60 rounded-xl">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Planted</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTree.plantedAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-slate-700/60 rounded-xl">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Growth</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTree.growthStage.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTree(null)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Garden3DLandscape;
