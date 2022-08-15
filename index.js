import {
    AmbientLight,
    BoxGeometry,
    CircleGeometry,
    Clock,
    Color,
    CylinderGeometry,
    FogExp2,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Scene,
    SpotLight,
    SpotLightHelper,
    WebGLRenderer
} from 'three';
import {TTFLoader} from "three/examples/jsm/loaders/TTFLoader.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";
import {Font} from "three/examples/jsm/loaders/FontLoader.js";
import {Reflector} from "three/examples/jsm/objects/Reflector.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {
    Mat3,
    OBoxGeometry,
    RigidBody,
    RigidBodyConfig,
    RigidBodyType,
    Shape,
    ShapeConfig,
    Vec3,
    World
} from "three/examples/jsm/libs/OimoPhysics/index.js";

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

const STATE_CONTENT_DROP = 0;
const STATE_CONTENT_DROPPED = 1;
const STATE_SUBJECT_DROP = 2;
const STATE_SUBJECT_DROPPED = 3;
const STATE_SUBJECT_ROTATED = 4;
const STATE_END = 5;

let scene, camera, world, clock, subjects, contents, font, mirror, renderer, stats, radius;
let lights, lightHelpers;
let bodies = new WeakMap();
let index = -1;
let state = STATE_SUBJECT_ROTATED;

function textParam() {
    return {
        font: font,
        size: 2,
        height: 0.5
    };
}

function init() {
    const container = document.getElementById('container');
    scene = new Scene();
    scene.background = new Color(0xbdbdbd);
    scene.fog = new FogExp2(0xbdbdbd, 0.02);
    subjects = new Group();
    contents = new Group();
    scene.add(subjects);
    scene.add(contents);

    camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(0, 5, 40);
    camera.lookAt(0, 0, 0);

    scene.add(new AmbientLight(0xffffff, 0.1));
    lights = [createLight(4), createLight(0), createLight(-4)];
    lightHelpers = lights.map((e) => new SpotLightHelper(e));
    lights.forEach((e) => scene.add(e));
    lightHelpers.forEach((e) => scene.add(e));

    renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    world = new World();
    clock = new Clock();
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

function createLight(x) {
    const light = new SpotLight(0xffffff, 0.7);
    light.penumbra = 0.3;
    light.angle = Math.PI / 6;
    light.position.set(x, 8, 0);
    return light;
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
    radius = c / (2 * Math.PI);

    lights.forEach((e) => e.position.z = radius);
    const padding = param.height * 2 + 3;
    addMirror(radius, padding);
    addStage(radius, padding);

    for (let i = 0; i < geometries.length; i++) {
        const node = geometries[i];
        const angle = Math.PI * 2 / nodes.length * i;
        const z = radius * Math.cos(angle) - radius;
        const x = radius * Math.sin(angle);
        const mesh = new Mesh(node, material);
        mesh.position.set(x, 0, z);
        mesh.rotation.y = angle;
        subjects.add(mesh);
        giveBody(mesh, RigidBodyType.STATIC);
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
    cylinder.computeBoundingBox();
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
    mesh.position.y = -(5.01 + height / 2);
    mesh.position.z = -radius;
    scene.add(mesh);
    giveBody(mesh, RigidBodyType.STATIC);
}

function createContent(index) {
    const subject = subjects.children[index];
    const node = new TextGeometry(nodes[index].content, textParam());
    node.computeBoundingBox();
    node.center();
    const material = new MeshStandardMaterial({
        color: 0xc2185b,
        metalness: 0.3,
        roughness: 0.6
    });
    const mesh = new Mesh(node, material);
    mesh.position.set(
        subject.position.x,
        subject.position.y + 15,
        subject.position.z
    );
    return mesh;
}

function giveBody(mesh, type) {
    const box = mesh.geometry.boundingBox;
    const geometry = new OBoxGeometry(
        new Vec3(
            (box.max.x - box.min.x) / 2,
            (box.max.y - box.min.y) / 2,
            (box.max.z - box.min.z) / 2
        )
    );
    const shapeConfig = new ShapeConfig();
    shapeConfig.geometry = geometry;
    const bodyConfig = new RigidBodyConfig();
    bodyConfig.type = type;
    bodyConfig.position = new Vec3(mesh.position.x, mesh.position.y, mesh.position.z);
    bodyConfig.rotation = new Mat3()
        .appendRotationEq(mesh.rotation.x, 1, 0, 0)
        .appendRotationEq(mesh.rotation.y, 0, 1, 0)
        .appendRotationEq(mesh.rotation.z, 0, 0, 1);
    const body = new RigidBody(bodyConfig);
    body.addShape(new Shape(shapeConfig));
    world.addRigidBody(body);
    bodies.set(mesh, body);
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
        if (state === STATE_SUBJECT_ROTATED) {
            index += 1;
            state = STATE_CONTENT_DROP;
        }
        if (state === STATE_CONTENT_DROPPED) {
            state = STATE_SUBJECT_DROP;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (delta > 0) {
        world.step(delta);
    }
    for (const child of subjects.children.concat(contents.children)) {
        const body = bodies.get(child);
        child.position.copy(body.getPosition());
        child.quaternion.copy(body.getOrientation());
    }
    switch (state) {
        case STATE_CONTENT_DROP:
            const content = createContent(index);
            contents.add(content);
            giveBody(content, RigidBodyType.DYNAMIC);
            state = STATE_CONTENT_DROPPED;
            break;
        case STATE_SUBJECT_DROP:
            const subject = subjects.children[index];
            bodies.get(subject).setType(RigidBodyType.DYNAMIC);
            if (index >= nodes.length - 1) {
                state = STATE_END;
            } else {
                state = STATE_SUBJECT_DROPPED;
            }
            break;
        case STATE_SUBJECT_DROPPED:
            const front = subjects.children[index + 1];
            if (front.rotation.y > 0) {
                for (const child of subjects.children.slice(index + 1)) {
                    const body = bodies.get(child)
                    const mat = body
                        .getRotation()
                        .appendRotationEq(-0.01, 0, 1, 0);
                    const z = radius * mat.e00 - radius;
                    const x = radius * mat.e02;
                    body.setPosition(new Vec3(x, 0, z));
                    body.setRotation(mat);
                }
            } else {
                state = STATE_SUBJECT_ROTATED;
            }
            break;
    }
    lightHelpers.forEach((e) => e.update());
    renderer.render(scene, camera);
    stats.update();
}

init();
