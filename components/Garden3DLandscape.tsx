// 🌟 Professional 3D Garden using Three.js
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Tree, TreeType, TreeGrowthStage } from '../types';

interface Garden3DLandscapeProps {
  trees: Tree[];
  loading?: boolean;
}

// Helper functions to create different tree types

// 🌴 PALM TREE - Islamic theme with palm leaves at top
const createPalmTree = (group: THREE.Group, scale: number, growth: TreeGrowthStage) => {
  // Tall thin trunk with segments
  const trunkHeight = 2.0 * scale;
  const trunkRadius = 0.08 * scale;

  // Segmented trunk
  for (let i = 0; i < 5; i++) {
    const segmentGeom = new THREE.CylinderGeometry(
      trunkRadius * (1 - i * 0.05),
      trunkRadius * (1 - i * 0.05 + 0.05),
      trunkHeight / 5,
      6
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9
    });
    const segment = new THREE.Mesh(segmentGeom, trunkMat);
    segment.position.y = (trunkHeight / 10) + i * (trunkHeight / 5);
    segment.castShadow = true;
    group.add(segment);
  }

  // Palm leaves at top (6-8 leaves radiating outward)
  const leafCount = growth === TreeGrowthStage.MatureTree ? 8 : 6;
  const leafColor = 0x228B22;

  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2;
    const leafGeom = new THREE.ConeGeometry(0.15 * scale, 0.8 * scale, 4);
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor });
    const leaf = new THREE.Mesh(leafGeom, leafMat);

    leaf.position.y = trunkHeight;
    leaf.position.x = Math.cos(angle) * 0.3 * scale;
    leaf.position.z = Math.sin(angle) * 0.3 * scale;
    leaf.rotation.z = Math.PI / 4;
    leaf.rotation.y = angle;
    leaf.castShadow = true;
    group.add(leaf);
  }

  // Crown sphere for mature trees
  if (growth === TreeGrowthStage.MatureTree) {
    const crownGeom = new THREE.SphereGeometry(0.4 * scale, 8, 8);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xFF69B4,
      emissive: 0xFF69B4,
      emissiveIntensity: 0.2
    });
    const crown = new THREE.Mesh(crownGeom, crownMat);
    crown.position.y = trunkHeight;
    crown.castShadow = true;
    group.add(crown);
  }
};

// 🌲 PINE TREE - Conical layers, prayer-like pointing upward
const createPineTree = (group: THREE.Group, scale: number, growth: TreeGrowthStage) => {
  // Thin trunk
  const trunkGeom = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 1.2 * scale, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.6 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Multiple cone layers (3-5 layers)
  const layers = growth === TreeGrowthStage.MatureTree ? 5 : 3;
  const pineColor = 0x2E8B57; // Sea green for pine

  for (let i = 0; i < layers; i++) {
    const layerHeight = 1.2 * scale + i * 0.4 * scale;
    const layerSize = (0.7 - i * 0.12) * scale;

    const coneGeom = new THREE.ConeGeometry(layerSize, 0.8 * scale, 6);
    const coneMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? pineColor : 0xFFD700,
      emissive: i % 2 === 0 ? 0x000000 : 0xFFD700,
      emissiveIntensity: 0.1
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = layerHeight;
    cone.castShadow = true;
    group.add(cone);
  }
};

// 🌳 OAK TREE - Strong, thick trunk with round canopy
const createOakTree = (group: THREE.Group, scale: number, growth: TreeGrowthStage) => {
  // Thick trunk
  const trunkGeom = new THREE.CylinderGeometry(0.15 * scale, 0.22 * scale, 1.3 * scale, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6B4423,
    roughness: 1.0
  });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.65 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Large round canopy (multiple spheres for volume)
  const canopyColor = 0x3CB371; // Medium sea green
  const canopySize = growth === TreeGrowthStage.MatureTree ? 1.0 : 0.7;

  // Main canopy
  const mainCanopyGeom = new THREE.SphereGeometry(canopySize * scale, 8, 8);
  const canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor });
  const mainCanopy = new THREE.Mesh(mainCanopyGeom, canopyMat);
  mainCanopy.position.y = 1.6 * scale;
  mainCanopy.castShadow = true;
  group.add(mainCanopy);

  // Additional smaller canopy spheres for texture
  if (growth === TreeGrowthStage.MatureTree) {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const smallCanopyGeom = new THREE.SphereGeometry(0.5 * scale, 6, 6);
      const smallCanopy = new THREE.Mesh(smallCanopyGeom, canopyMat);
      smallCanopy.position.y = 1.5 * scale;
      smallCanopy.position.x = Math.cos(angle) * 0.4 * scale;
      smallCanopy.position.z = Math.sin(angle) * 0.4 * scale;
      smallCanopy.castShadow = true;
      group.add(smallCanopy);
    }
  }
};

// 🌾 WILLOW TREE - Graceful with drooping branches
const createWillowTree = (group: THREE.Group, scale: number, growth: TreeGrowthStage) => {
  // Medium trunk slightly curved
  const trunkGeom = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.4 * scale, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B7355 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.7 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Drooping branches (hanging cones)
  const branchCount = growth === TreeGrowthStage.MatureTree ? 12 : 8;
  const willowColor = 0x9ACD32; // Yellow green

  for (let i = 0; i < branchCount; i++) {
    const angle = (i / branchCount) * Math.PI * 2;
    const radius = 0.4 * scale;

    // Drooping branch (inverted cone)
    const branchGeom = new THREE.ConeGeometry(0.1 * scale, 0.9 * scale, 4);
    const branchMat = new THREE.MeshStandardMaterial({ color: willowColor });
    const branch = new THREE.Mesh(branchGeom, branchMat);

    branch.position.y = 1.5 * scale;
    branch.position.x = Math.cos(angle) * radius;
    branch.position.z = Math.sin(angle) * radius;
    branch.rotation.x = Math.PI; // Flip upside down for drooping effect
    branch.castShadow = true;
    group.add(branch);
  }

  // Top canopy
  const topCanopyGeom = new THREE.SphereGeometry(0.5 * scale, 8, 8);
  const topCanopyMat = new THREE.MeshStandardMaterial({ color: willowColor });
  const topCanopy = new THREE.Mesh(topCanopyGeom, topCanopyMat);
  topCanopy.position.y = 1.8 * scale;
  topCanopy.castShadow = true;
  group.add(topCanopy);
};

// 🍎 FRUIT TREE - Round with small fruit spheres
const createFruitTree = (group: THREE.Group, scale: number, growth: TreeGrowthStage) => {
  // Standard trunk
  const trunkGeom = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.2 * scale, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.6 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  // Round foliage
  const foliageGeom = new THREE.SphereGeometry(0.8 * scale, 8, 8);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
  const foliage = new THREE.Mesh(foliageGeom, foliageMat);
  foliage.position.y = 1.5 * scale;
  foliage.castShadow = true;
  group.add(foliage);

  // Add fruits for mature trees
  if (growth === TreeGrowthStage.MatureTree || growth === TreeGrowthStage.YoungTree) {
    const fruitCount = 6;
    const fruitColor = 0xFF6347; // Tomato red for fruits

    for (let i = 0; i < fruitCount; i++) {
      const angle = (i / fruitCount) * Math.PI * 2;
      const fruitGeom = new THREE.SphereGeometry(0.12 * scale, 6, 6);
      const fruitMat = new THREE.MeshStandardMaterial({
        color: fruitColor,
        emissive: fruitColor,
        emissiveIntensity: 0.3
      });
      const fruit = new THREE.Mesh(fruitGeom, fruitMat);

      fruit.position.y = 1.3 * scale + Math.random() * 0.4 * scale;
      fruit.position.x = Math.cos(angle) * 0.6 * scale;
      fruit.position.z = Math.sin(angle) * 0.6 * scale;
      fruit.castShadow = true;
      group.add(fruit);
    }
  }
};

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

      // Create different tree structures based on type
      switch (tree.type) {
        case TreeType.QuranReading:
          // PALM TREE (Islamic theme)
          createPalmTree(treeGroup, scale, tree.growthStage);
          break;

        case TreeType.Dhikr:
          // PINE/CONIFER TREE (Prayer-like, pointing upward)
          createPineTree(treeGroup, scale, tree.growthStage);
          break;

        case TreeType.Work:
          // OAK TREE (Strong, sturdy with thick trunk)
          createOakTree(treeGroup, scale, tree.growthStage);
          break;

        case TreeType.Study:
          // WILLOW TREE (Graceful, flowing)
          createWillowTree(treeGroup, scale, tree.growthStage);
          break;

        case TreeType.GeneralFocus:
        default:
          // FRUIT TREE (Round with fruits)
          createFruitTree(treeGroup, scale, tree.growthStage);
          break;
      }

      // Add subtle glow for mature trees
      if (tree.growthStage === TreeGrowthStage.MatureTree) {
        const glowGeometry = new THREE.SphereGeometry(0.9 * scale, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.15
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
