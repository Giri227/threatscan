
// Neural Sentinel Grid - Three.js Implementation

let scene, camera, renderer;
let shield, particles, entropyCube;
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let typingCharge = 0.5; // Base intensity

// Settings
const PARTICLE_COUNT = 2000; // Optimal for verified performance
const SHIELD_RADIUS = 1.2;
const RAIN_SPEED = 0.05;

export const ThreeGuard = {
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 1. Scene Setup
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.03); // Deep void fog

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // 2. The Singularity Shield (Icosahedron)
        const geometry = new THREE.IcosahedronGeometry(SHIELD_RADIUS, 1); // Level 1 subdivision for "crystalline" look
        const material = new THREE.MeshStandardMaterial({
            color: 0x000000,
            wireframe: true,
            emissive: 0x00F0FF,
            emissiveIntensity: 0.5,
            roughness: 0.0,
            metalness: 0.9
        });
        shield = new THREE.Mesh(geometry, material);
        scene.add(shield);

        // Inner Core (to block background lines behind it)
        const coreGeo = new THREE.IcosahedronGeometry(SHIELD_RADIUS * 0.95, 1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        shield.add(core);

        // Lights
        const pointLight = new THREE.PointLight(0x00F0FF, 1, 100);
        pointLight.position.set(2, 2, 5);
        scene.add(pointLight);
        const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
        scene.add(ambientLight);

        // 3. Data Rain (Points)
        const rainGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
            // Spread wide
            posArray[i] = (Math.random() - 0.5) * 30;
        }

        rainGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const rainMat = new THREE.PointsMaterial({
            size: 0.03,
            color: 0x00F0FF,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.6
        });

        particles = new THREE.Points(rainGeo, rainMat);
        scene.add(particles);

        // 4. Entropy Cube (Noise Reactivity)
        const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const cubeMat = new THREE.MeshBasicMaterial({ color: 0x7000FF, wireframe: true });
        entropyCube = new THREE.Mesh(cubeGeo, cubeMat);
        entropyCube.position.set(3, -2, 0); // Bottom right corner visually
        scene.add(entropyCube);

        // Events
        window.addEventListener('resize', this.onWindowResize, false);
        document.addEventListener('mousemove', this.onMouseMove, false);

        // Input Typing Charge
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                typingCharge = 2.5; // Burst
            });
        });

        // Start Loop
        this.animate();
    },

    onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    },

    onMouseMove(event) {
        // Normalize mouse pos (-1 to 1)
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    },

    animate() {
        requestAnimationFrame(ThreeGuard.animate.bind(ThreeGuard));

        const time = Date.now() * 0.001;

        // --- Shield Logic ---
        // Pulse
        const pulse = 1 + Math.sin(time * 2) * 0.05;
        shield.scale.set(pulse, pulse, pulse);

        // Rotation (Auto + Mouse Lerp)
        shield.rotation.z += 0.002;

        // Target rotation based on mouse
        targetRotationX = mouseY * 0.5;
        targetRotationY = mouseX * 0.5;

        // Lerp functionality for smooth "heavy" feel
        shield.rotation.x += (targetRotationX - shield.rotation.x) * 0.05;
        shield.rotation.y += (targetRotationY - shield.rotation.y) * 0.05;

        // Decay Charge
        if (typingCharge > 0.5) {
            typingCharge -= 0.05;
        }
        shield.material.emissiveIntensity = typingCharge;


        // --- Data Rain Logic (Vector Math) ---
        const positions = particles.geometry.attributes.position.array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            let x = positions[ix];
            let y = positions[iy];
            let z = positions[iz];

            // Vector to center (0,0,0) - (x,y,z) = (-x, -y, -z)
            // Normalize roughly by dividing by distance (simplified for speed)
            const d = Math.sqrt(x * x + y * y + z * z);

            if (d < 1.0) {
                // "Event Horizon": Reset to edge
                // Randomize new pos at edge
                const r = 10 + Math.random() * 10;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                positions[ix] = r * Math.sin(phi) * Math.cos(theta);
                positions[iy] = r * Math.sin(phi) * Math.sin(theta);
                positions[iz] = r * Math.cos(phi);
            } else {
                // Move towards center
                // V_norm * speed
                positions[ix] -= (x / d) * RAIN_SPEED * (1 + typingCharge * 0.1); // Speed up with charge
                positions[iy] -= (y / d) * RAIN_SPEED * (1 + typingCharge * 0.1);
                positions[iz] -= (z / d) * RAIN_SPEED * (1 + typingCharge * 0.1);
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;

        // --- Entropy Cube ---
        entropyCube.rotation.x += 0.01 + Math.abs(mouseY) * 0.05;
        entropyCube.rotation.y += 0.01 + Math.abs(mouseX) * 0.05;

        renderer.render(scene, camera);
    }
};
