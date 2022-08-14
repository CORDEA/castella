import {
    AmbientLight,
    BoxGeometry,
    CircleGeometry,
    Color, CylinderGeometry,
    FogExp2,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    PointLight,
    Scene,
    WebGLRenderer
} from 'three';
import {TTFLoader} from "three/examples/jsm/loaders/TTFLoader.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";
import {Font} from "three/examples/jsm/loaders/FontLoader.js";
import {Reflector} from "three/examples/jsm/objects/Reflector.js";
import {OimoPhysics} from "three/examples/jsm/physics/OimoPhysics.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

const nodes = [
    {
        subject: 'Hello World',
        content: 'Hello World',
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
    },
];

let scene, camera, subjects, contents, font, light, mirror, renderer, physics, stats;
let index = 0;

function textParam() {
    return {
        font: font,
        size: 2,
        height: 0.5
    };
}

async function init() {
    const container = document.getElementById('container');
    scene = new Scene();
    scene.background = new Color(0xbdbdbd);
    scene.fog = new FogExp2(0xbdbdbd, 0.02);
    subjects = new Group();
    contents = new Group();
    scene.add(subjects);
    scene.add(contents);

    camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 5, 30);
    camera.lookAt(0, 0, 0);

    scene.add(new AmbientLight(0xffffff, 0.3));
    light = new PointLight(0xffffff, 1.2);
    light.position.y = 20;
    scene.add(light);

    renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    physics = await OimoPhysics();

    stats = new Stats();
    container.appendChild(stats.dom);

    observeResize();
    observeEvents(container);
    const loader = new TTFLoader();
    loader.load('font.ttf', function (json) {
        font = new Font(json);
        addNodes();
        animate();
    });
}

function observeResize() {
    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        mirror.getRenderTarget().setSize(
            window.innerWidth * window.devicePixelRatio,
            window.innerHeight * window.devicePixelRatio
        );
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
    });
}

function observeEvents(e) {
    e.addEventListener('click', function () {
        index += 1;
    });
}

function addNodes() {
    const material = new MeshStandardMaterial({
        color: 0xc2185b,
        metalness: 0.3,
        roughness: 0.6
    });
    const param = textParam();
    const geometries = nodes.map(function (e) {
        const node = new TextGeometry(e.subject, param);
        node.computeBoundingBox();
        node.center();
        return node;
    });
    const max = geometries
        .map((e) => e.boundingBox.max.x - e.boundingBox.min.x)
        .reduce((p, e) => p < e ? e : p, 0);
    const c = (max * nodes.length) * 1.1;
    const r = c / (2 * Math.PI);

    light.position.z = r + 15;
    const padding = param.height * 2 + 3;
    addMirror(r, padding);
    addStage(r, padding);

    for (let i = 0; i < geometries.length; i++) {
        const node = geometries[i];
        const angle = Math.PI * 2 / nodes.length * i;
        const z = r * Math.cos(angle) - r;
        const x = r * Math.sin(angle);
        const mesh = new Mesh(node, material);
        const outer = createOuter(mesh);
        outer.position.set(x, 0, z);
        outer.rotation.y = angle;
        subjects.add(outer);
    }
}

function addMirror(radius, padding) {
    const circle = new CircleGeometry(radius + padding, 64);
    mirror = new Reflector(circle, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0xbdbdbd
    });
    mirror.position.y = -5;
    mirror.position.z = -radius;
    mirror.rotation.x = -Math.PI / 2;
    scene.add(mirror);
}

function addStage(radius, padding) {
    const height = 20;
    const r = radius + padding;
    const cylinder = new CylinderGeometry(r, r, height, 64);
    const material = new MeshBasicMaterial({
        color: 0xffffff,
    });
    const mesh = new Mesh(cylinder, material);
    const outer = new BoxGeometry(r * 2, height, r * 2);
    const outerMesh = new Mesh(
        outer,
        new MeshBasicMaterial({
            opacity: 0,
            transparent: true
        }),
    );
    outerMesh.add(mesh);
    outerMesh.position.y = -(5.01 + height / 2);
    outerMesh.position.z = -radius;
    scene.add(outerMesh);
    physics.addMesh(outerMesh);
}

function createContent(index) {
    const first = subjects.children[0];
    const node = new TextGeometry(nodes[index].content, textParam());
    node.computeBoundingBox();
    node.center();
    const material = new MeshStandardMaterial({
        color: 0xc2185b,
        metalness: 0.3,
        roughness: 0.6
    });
    const mesh = new Mesh(node, material);
    const outer = createOuter(mesh);
    outer.position.set(
        first.position.x,
        first.position.y + 15,
        first.position.z
    );
    return outer;
}

function createOuter(base) {
    const box = base.geometry.boundingBox;
    const outer = new BoxGeometry(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
    );
    const outerMesh = new Mesh(
        outer,
        new MeshBasicMaterial({
            opacity: 0,
            transparent: true
        }),
    );
    outerMesh.add(base);
    return outerMesh;
}

function animate() {
    requestAnimationFrame(animate);
    if (index > 0 && contents.children.length < index) {
        const subject = subjects.children[index - 1];
        const content = createContent(index - 1);
        contents.add(content);
        physics.addMesh(subject, 1);
        physics.addMesh(content, 1);
    }
    renderer.render(scene, camera);
    stats.update();
}

init();
