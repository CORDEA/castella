import {
    AmbientLight,
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    Clock,
    Color,
    CylinderGeometry,
    Float32BufferAttribute,
    FogExp2,
    Group,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Raycaster,
    Scene,
    SpotLight,
    SpotLightHelper,
    Vector2,
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
    SphericalJoint,
    SphericalJointConfig,
    Vec3,
    World
} from "three/examples/jsm/libs/OimoPhysics/index.js";
import {Interpolator} from './interpolator';

const nodes = [
    {
        subject: 'Hello World',
        content: 'Hello World',
        clickable: true
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
        clickable: true
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
        clickable: false
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
        clickable: true
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
        clickable: false
    },
    {
        subject: 'Hello World',
        content: 'Hello World',
        clickable: false
    },
];
const colors = {
    background: 0xeeeeee,
    fog: 0x757575,
    light: 0xffffff,
    stage: 0x90a4ae,
    text: 0xe91e63,
    selectedText: 0x560027,
    cord: [
        0, 0, 0,
        1, 0, 0
    ]
};
const angle = Math.PI * 2 / nodes.length;

const STATE_CONTENT_DROP = 0;
const STATE_CONTENT_DROPPED = 1;
const STATE_SUBJECT_DROP = 2;
const STATE_SUBJECT_DROPPED = 3;
const STATE_SUBJECT_ROTATED = 4;
const STATE_END = 5;

const interpolator = new Interpolator(40);

let camera, world, raycaster, clock, font, mirror, renderer, stats, radius;
let scene, subjects, clickables, stage, roof, cord;
let lights, lightHelpers;
let pointer = new Vector2();
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
    scene.background = new Color(colors.background);
    scene.fog = new FogExp2(colors.fog, 0.02);
    subjects = new Group();
    clickables = new Group();
    scene.add(subjects);
    scene.add(clickables);

    camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(0, 5, 40);
    camera.lookAt(0, 0, 0);

    scene.add(new AmbientLight(colors.light, 0.1));
    lights = [createLight(4), createLight(0), createLight(-4)];
    lightHelpers = lights.map((e) => new SpotLightHelper(e));
    lights.forEach((e) => scene.add(e));
    lightHelpers.forEach((e) => scene.add(e));

    renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    raycaster = new Raycaster();
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
    const light = new SpotLight(colors.light, 0.5);
    light.penumbra = 0.3;
    light.angle = Math.PI / 6;
    light.position.set(x, 8, 0);
    return light;
}

function addNodes() {
    const material = new MeshStandardMaterial({
        color: colors.text,
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
    stage = createStage(padding);
    roof = createRoof();
    addCord();
    scene.add(stage);
    scene.add(roof);
    giveBody(stage, RigidBodyType.DYNAMIC);
    giveBody(roof, RigidBodyType.STATIC);
    giveJoint(stage, roof);

    for (let i = 0; i < geometries.length; i++) {
        const node = geometries[i];
        const a = angle * i;
        const z = radius * Math.cos(a) - radius;
        const x = radius * Math.sin(a);
        const mesh = new Mesh(node, material);
        mesh.position.set(x, 0, z);
        mesh.rotation.y = a;
        subjects.add(mesh);
        giveBody(mesh, RigidBodyType.STATIC);
    }
}

function createStage(padding) {
    const height = 0.5;
    const r = radius + padding;
    const cylinder = new CylinderGeometry(r, r, height, 64);
    cylinder.computeBoundingBox();
    const material = new MeshBasicMaterial({
        color: colors.stage
    });
    const mesh = new Mesh(cylinder, material);
    const circle = new CircleGeometry(r, 64);
    mirror = new Reflector(circle, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: colors.stage
    });
    mirror.position.y = height / 2 + 0.01;
    mirror.rotation.x = -Math.PI / 2;
    mesh.add(mirror);

    mesh.position.y = -8;
    mesh.position.z = -radius;
    return mesh;
}

function createRoof() {
    const box = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({
        color: 0x000000
    });
    box.computeBoundingBox();
    const mesh = new Mesh(box, material);
    mesh.position.y = 25;
    mesh.position.z = -radius;
    return mesh;
}

function addCord() {
    const buffer = new BufferGeometry();
    buffer.setAttribute(
        'color',
        new Float32BufferAttribute(
            colors.cord,
            3
        )
    );
    const material = new LineBasicMaterial({vertexColors: true});
    cord = new Line(buffer, material);
    scene.add(cord);
}

function createContent(index) {
    const node = nodes[index];
    const subject = subjects.children[index];
    const geometry = new TextGeometry(node.content, textParam());
    geometry.computeBoundingBox();
    geometry.center();
    const material = new MeshStandardMaterial({
        color: colors.text,
        metalness: 0.3,
        roughness: 0.6
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(
        subject.position.x,
        subject.position.y + 22,
        subject.position.z
    );
    mesh.rotation.y = Math.PI / 18;
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

function giveJoint(mesh1, mesh2) {
    const body1 = bodies.get(mesh1);
    const body2 = bodies.get(mesh2);
    const config = new SphericalJointConfig();
    config.init(
        body1,
        body2,
        body1.getPosition().add(body2.getPosition()).scale(0.5)
    )
    const joint = new SphericalJoint(config);
    world.addJoint(joint);
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
    e.addEventListener('pointermove', function (e) {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (delta > 0) {
        world.step(delta);
    }
    const children = scene.children
        .concat(subjects.children)
        .concat(clickables.children);
    for (const child of children) {
        const body = bodies.get(child);
        if (body) {
            child.position.copy(body.getPosition());
            child.quaternion.copy(body.getOrientation());
        }
    }
    cord.geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
            [
                roof.position.x, roof.position.y, roof.position.z,
                stage.position.x, stage.position.y, stage.position.z
            ],
            3
        ),
    );
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickables.children);
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const mesh = intersect.object;
        mesh.material.color.setHex(colors.selectedText);
    } else {
        clickables.children.forEach((e) => e.material.color.setHex(colors.text));
    }
    switch (state) {
        case STATE_CONTENT_DROP:
            const content = createContent(index);
            if (nodes[index].clickable) {
                clickables.add(content);
            } else {
                scene.add(content);
            }
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
            const progress = interpolator.getInterpolation();
            if (progress <= 1) {
                for (const child of subjects.children.slice(index + 1)) {
                    const body = bodies.get(child)
                    const mat = body
                        .getRotation()
                        .appendRotationEq(-(angle * interpolator.getDelta()), 0, 1, 0);
                    const z = radius * mat.e00 - radius;
                    const x = radius * mat.e02;
                    body.setPosition(new Vec3(x, 0, z));
                    body.setRotation(mat);
                }
                interpolator.next();
            } else {
                interpolator.reset();
                state = STATE_SUBJECT_ROTATED;
            }
            break;
    }
    lightHelpers.forEach((e) => e.update());
    renderer.render(scene, camera);
    stats.update();
}

init();
