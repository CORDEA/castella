import {
    AmbientLight,
    Color, FogExp2,
    Group,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    Scene,
    SpotLight,
    WebGLRenderer
} from 'three';
import {TTFLoader} from "three/examples/jsm/loaders/TTFLoader.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";
import {Font} from "three/examples/jsm/loaders/FontLoader.js";

const container = document.getElementById('container');
const scene = new Scene();
scene.background = new Color(0xbdbdbd);
scene.fog = new FogExp2(0xbdbdbd, 0.0006);
const group = new Group();
scene.add(group);

const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, 0, 800);

scene.add(new AmbientLight(0xffffff, 0.1));
const light = new SpotLight(0xffffff, 2);
light.position.set(0, 200, 1000);
scene.add(light);

const renderer = new WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
});

const loader = new TTFLoader();
loader.load('font.ttf', function (json) {
    const font = new Font(json);
    let nodes = [
        'Hello World',
        'Hello World',
        'Hello World',
        'Hello World',
        'Hello World',
        'Hello World'
    ].map(function (e) {
        const geometry = new TextGeometry(e, {
            font: font,
            size: 70,
            height: 10
        });
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        return geometry;
    });
    const max = nodes
        .map((e) => e.boundingBox.max.x - e.boundingBox.min.x)
        .reduce((p, e) => p < e ? e : p, 0);
    const c = (max * nodes.length) * 1.1;
    const r = c / (2 * Math.PI);
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.center();
        const material = new MeshStandardMaterial({
            color: 0xc2185b,
            metalness: 0.3,
            roughness: 0.6
        });
        const mesh = new Mesh(node, material);
        mesh.position.z = -r;
        const angle = Math.PI * 2 / nodes.length * i;
        mesh.position.z += r * Math.cos(angle);
        mesh.position.x += r * Math.sin(angle);
        mesh.rotation.y = angle;
        group.add(mesh);
    }
    renderer.render(scene, camera);
});
