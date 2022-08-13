import {Color, Group, PerspectiveCamera, Scene, WebGLRenderer} from 'three';

const container = document.getElementById('container');
const scene = new Scene();
scene.background = new Color(0xbdbdbd);
const group = new Group();
scene.add(group);

const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight);

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

renderer.render(scene, camera);
