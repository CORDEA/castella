import {Color, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer} from 'three';
import {TTFLoader} from "three/examples/jsm/loaders/TTFLoader.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";
import {Font} from "three/examples/jsm/loaders/FontLoader.js";

const container = document.getElementById('container');
const scene = new Scene();
scene.background = new Color(0xbdbdbd);
const group = new Group();
scene.add(group);

const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight);
camera.position.set(0, 0, 1000);

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
    const text = new TextGeometry('Hello World', {
        font: font,
        size: 70,
        height: 10
    });
    text.computeBoundingBox();
    text.computeVertexNormals();

    const center = -0.5 * (text.boundingBox.max.x - text.boundingBox.min.x);
    const material = new MeshBasicMaterial({
        color: 0xffffff
    });
    const mesh = new Mesh(text, material);
    mesh.position.x = center;
    mesh.rotation.y = Math.PI / 6;
    group.add(mesh);

    renderer.render(scene, camera);
});
