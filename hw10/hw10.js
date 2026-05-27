import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { initCamera, initRenderer, initStats, initOrbitControls } from './util.js';

const scene = new THREE.Scene();
let camera = initCamera();
camera.position.set(150, 50, 0); camera.lookAt(scene.position); scene.add(camera);
const renderer = initRenderer();
const stats = initStats();
let orbitControls = initOrbitControls(camera, renderer);
orbitControls.enableDamping = true;

const gui = new GUI();
const controls = new function() {
    this.currentCamera = "Perspective";
    this.switchCamera = function() {
        if (camera instanceof THREE.PerspectiveCamera) {
            scene.remove(camera);
            camera = null;
            camera = new THREE.OrthographicCamera(-window.innerWidth / 16, window.innerWidth / 16,
                                    window.innerHeight / 16, -window.innerHeight / 16, -200, 500);
            camera.position.set(150, 50, 0);
            camera.lookAt(scene.position);
            scene.add(camera);

            orbitControls.dispose();
            orbitControls = null;
            orbitControls = initOrbitControls(camera, renderer);
            orbitControls.enableDamping = true;
            this.currentCamera = "Orthographic";
        } else {
            scene.remove(camera);
            camera = null;
            camera = initCamera();
            camera.position.set(150, 50, 0);
            camera.lookAt(scene.position);
            scene.add(camera);

            orbitControls.dispose();
            orbitControls = null;
            orbitControls = initOrbitControls(camera, renderer);
            orbitControls.enableDamping = true;
            this.currentCamera = "Perspective";
        }
    }

    this.rotationSpeed_Mercury = 0.02; this.orbitSpeed_Mercury = 0.02;
    this.rotationSpeed_Venus = 0.015; this.orbitSpeed_Venus = 0.015;
    this.rotationSpeed_Earth = 0.01; this.orbitSpeed_Earth = 0.01;
    this.rotationSpeed_Mars = 0.008; this.orbitSpeed_Mars = 0.008;
};
const cameraFolder = gui.addFolder("Camera");
cameraFolder.add(controls, "switchCamera").name("Switch Camera Type");
cameraFolder.add(controls, "currentCamera").name("Current Camera").listen();
const mercuryFolder = gui.addFolder("Mercury");
mercuryFolder.add(controls, "rotationSpeed_Mercury", 0, 0.1, 0.001).name("Rotation Speed");
mercuryFolder.add(controls, "orbitSpeed_Mercury", 0, 0.1, 0.001).name("Orbit Speed");
const venusFolder = gui.addFolder("Venus");
venusFolder.add(controls, "rotationSpeed_Venus", 0, 0.1, 0.001).name("Rotation Speed");
venusFolder.add(controls, "orbitSpeed_Venus", 0, 0.1, 0.001).name("Orbit Speed");
const earthFolder = gui.addFolder("Earth");
earthFolder.add(controls, "rotationSpeed_Earth", 0, 0.1, 0.001).name("Rotation Speed");
earthFolder.add(controls, "orbitSpeed_Earth", 0, 0.1, 0.001).name("Orbit Speed");
const marsFolder = gui.addFolder("Mars");
marsFolder.add(controls, "rotationSpeed_Mars", 0, 0.1, 0.001).name("Rotation Speed");
marsFolder.add(controls, "orbitSpeed_Mars", 0, 0.1, 0.001).name("Orbit Speed");

const ambientLight = new THREE.AmbientLight(0x222222, 1);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 5000, 0, 1.5);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const sunGeometry = new THREE.SphereGeometry(10);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd66 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const textureLoader = new THREE.TextureLoader();
const mercuryGeometry = new THREE.SphereGeometry(1.5);
const mercuryMaterial = new THREE.MeshStandardMaterial({ color: '#a6a6a6', map: textureLoader.load('./Mercury.jpg') });
const mercury = new THREE.Mesh(mercuryGeometry, mercuryMaterial);
mercury.name = "Mercury";
mercury.position.x = 20;
const venusGeometry = new THREE.SphereGeometry(3);
const venusMaterial = new THREE.MeshStandardMaterial({ color: '#e39e1c', map: textureLoader.load('./Venus.jpg') });
const venus = new THREE.Mesh(venusGeometry, venusMaterial);
venus.name = "Venus";
venus.position.x = 35;
const earthGeometry = new THREE.SphereGeometry(3.5);
const earthMaterial = new THREE.MeshStandardMaterial({ color: '#3498db', map: textureLoader.load('./Earth.jpg') });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.name = "Earth";
earth.position.x = 50;
const marsGeometry = new THREE.SphereGeometry(2.5);
const marsMaterial = new THREE.MeshStandardMaterial({ color: '#c0392b', map: textureLoader.load('./Mars.jpg') });
const mars = new THREE.Mesh(marsGeometry, marsMaterial);
mars.name = "Mars";
mars.position.x = 65;

const mercuryOrbit = new THREE.Object3D();
scene.add(mercuryOrbit);
mercuryOrbit.add(mercury);
const venusOrbit = new THREE.Object3D();
scene.add(venusOrbit);
venusOrbit.add(venus);
const earthOrbit = new THREE.Object3D();
scene.add(earthOrbit);
earthOrbit.add(earth);
const marsOrbit = new THREE.Object3D();
scene.add(marsOrbit);
marsOrbit.add(mars);

render();
function render() {
    stats.update();
    orbitControls.update();

    mercury.rotation.y += controls.rotationSpeed_Mercury;
    mercuryOrbit.rotation.y += controls.orbitSpeed_Mercury;
    venus.rotation.y += controls.rotationSpeed_Venus;
    venusOrbit.rotation.y += controls.orbitSpeed_Venus;
    earth.rotation.y += controls.rotationSpeed_Earth;
    earthOrbit.rotation.y += controls.orbitSpeed_Earth;
    mars.rotation.y += controls.rotationSpeed_Mars;
    marsOrbit.rotation.y += controls.orbitSpeed_Mars;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}
