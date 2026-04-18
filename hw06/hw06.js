import { resizeAspectRatio, setupText, updateText, Axes } from "../util/util.js";
import { Shader, readShaderFile } from "../util/shader.js";
import { Cube } from "../util/cube.js";
import { Arcball } from "../util/arcball.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
function initWebGL() {
    if (!gl) {
        console.error("WebGL 2 is not supported by your browser.");
        return false;
    }
    canvas.width = 1400;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    resizeAspectRatio(gl, canvas);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    return true;
}

let isInitialized = false;
document.addEventListener("DOMContentLoaded", () => {
    if (isInitialized) {
        console.log("Already initialized.");
        return;
    }
    isInitialized = true;
    main().then(success => {
        if (!success) {
            console.log("Program terminated.");
            return;
        }
    }).catch(error => {
        console.error("Program terminated with error:", error);
    });
});

let shader;
const axes = new Axes(gl, 2,0);
const cube = new Cube(gl);

let location = [ [0.0, 0.0, 0.0], [2.0, 0.5, -3.0], [-1.5, -0.5, -2.5], [3.0, 0.0, -4.0], [-3.0, 0.0, 1.0] ];
let modelMatrices = Array(5);
for (let i = 0; i < 5; i++) {
    modelMatrices[i] = mat4.create();
    mat4.translate(modelMatrices[i], modelMatrices[i], vec3.fromValues(...location[i]));
}
let viewMatrix_perspective = mat4.create();
let viewMatrix_parallel = mat4.create();
let projMatrix_perspective = mat4.create();
let projMatrix_parallel = mat4.create();
mat4.lookAt(viewMatrix_parallel, vec3.fromValues(0, 15, 0), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, -1));

let startTime;
let lastFrameTime;
let textOverlay;

let cameraPosition = vec3.fromValues(0, 0, 5);
let cameraFront = vec3.fromValues(0, 0, -1);
let cameraUp = vec3.fromValues(0, 1, 0);
let yaw = -90;      // yaw angle, rotation about y-axis (degree)
let pitch = 0;      // pitch angle, rotation about x-axis (degree)
const cameraSpeed = 2.5;
const mouseSensitivity = 0.1;
const keys = {
    'w': false,
    'a': false,
    's': false,
    'd': false
}

async function initShader() {
    const vertexShaderSource = await readShaderFile("hw06_shVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw06_shFrag.glsl");
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}
document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) { keys[key] = true; }
});
document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) { keys[key] = false; }
});
canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
    console.log("Canvas clicked, requesting pointer lock.");
});
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement == canvas) {
        console.log("Pointer is locked.");
        document.addEventListener("mousemove", updateCamera);
    } else {
        console.log("Pointer is unlocked.");
        document.removeEventListener("mousemove", updateCamera);
    }
})
function updateCamera(event) {
    const xoffset = event.movementX * mouseSensitivity;
    const yoffset = -event.movementY * mouseSensitivity;
    yaw += xoffset;
    pitch += yoffset;

    if (pitch > 89.0) pitch = 89.0;
    if (pitch < -89.0) pitch = -89.0;

    const direction = vec3.create();
    direction[0] = Math.cos(glMatrix.toRadian(yaw)) * Math.cos(glMatrix.toRadian(pitch));
    direction[1] = Math.sin(glMatrix.toRadian(pitch));
    direction[2] = Math.sin(glMatrix.toRadian(yaw)) * Math.cos(glMatrix.toRadian(pitch));
    vec3.normalize(cameraFront, direction);
}

function render() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    // camera movement based on keyboard input
    const cameraDistance = cameraSpeed * deltaTime;

    // change the camera position
    if (keys['w']) {        // move camera forward (to the +cameraFront direction)
        vec3.scaleAndAdd(cameraPosition, cameraPosition,cameraFront, cameraDistance);
    }
    if (keys['s']) {        // move camera backward (to the -cameraFront direction)
        vec3.scaleAndAdd(cameraPosition, cameraPosition,cameraFront, -cameraDistance);
    }
    if (keys['a']) {        // move camera to the left (to the -cameraRight direction)
        const cameraRight = vec3.create();
        vec3.cross(cameraRight,cameraFront, cameraUp);
        vec3.normalize(cameraRight, cameraRight);
        vec3.scaleAndAdd(cameraPosition, cameraPosition, cameraRight, -cameraDistance);
    }
    if (keys['d']) {        // move camera to the right (to the +cameraRight direction)
        const cameraRight = vec3.create();
        vec3.cross(cameraRight,cameraFront, cameraUp);
        vec3.normalize(cameraRight, cameraRight);
        vec3.scaleAndAdd(cameraPosition, cameraPosition, cameraRight, cameraDistance);
    }

    mat4.lookAt(viewMatrix_perspective,
        cameraPosition,         // camera position
        vec3.add(vec3.create(), cameraPosition, cameraFront),    // camera front
        cameraUp);              // up 

    
    gl.viewport(0, 0, 700, 700);
    gl.scissor(0, 0, 700, 700);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    shader.use();
    shader.setMat4("u_view", viewMatrix_perspective);
    shader.setMat4("u_projection", projMatrix_perspective);
    for (let i = 0; i < 5; i++) {
        shader.setMat4("u_model", modelMatrices[i]);
        cube.draw(shader);
    }
    axes.draw(viewMatrix_perspective, projMatrix_perspective);

    gl.viewport(700, 0, 700, 700);
    gl.scissor(700, 0, 700, 700);
    gl.clearColor(0.05, 0.15, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    shader.use();
    shader.setMat4("u_view", viewMatrix_parallel);
    shader.setMat4("u_projection", projMatrix_parallel);
    for (let i = 0; i < 5; i++) {
        shader.setMat4("u_model", modelMatrices[i]);
        cube.draw(shader);
    }
    axes.draw(viewMatrix_parallel, projMatrix_parallel);

    updateText(textOverlay, "Camera pos: (" + cameraPosition[0].toFixed(1) + ", " + cameraPosition[1].toFixed(1) + ", "
            + cameraPosition[2].toFixed(1) + ") | Yaw: " + yaw.toFixed(1) + "° | Pitch: " + pitch.toFixed(1) + "°");
    
    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error("Failed to initialize WebGL.");
        }
        await initShader();
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.SCISSOR_TEST);
    
        textOverlay = setupText(canvas, "Camera pos: (" + cameraPosition[0].toFixed(1) + ", " + cameraPosition[1].toFixed(1) + ", "
            + cameraPosition[2].toFixed(1) + ") | Yaw: " + yaw.toFixed(1) + "° | Pitch: " + pitch.toFixed(1) + "°", 1);
        setupText(canvas, "WASD: move camera | Mouse: look (click to lock) | ESC: unlock", 2);
        setupText(canvas, "Left: Perspective (FP) Right: Orthographic (Top-Down)", 3);

        mat4.perspective(projMatrix_perspective, glMatrix.toRadian(60), (canvas.width / 2) / canvas.height , 0.1, 100.0);
        mat4.ortho(projMatrix_parallel, -10, 10, -10, 10, 0.1, 100.0);

        lastFrameTime = Date.now();
        requestAnimationFrame(render);
        return true;
    } catch(error) {
        console.error("Failed to initialize program:", error);
        alert("Failed to initialize program.");
        return false;
    }
}