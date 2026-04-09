import { resizeAspectRatio, Axes } from "../util/util.js";
import { Shader, readShaderFile } from "../util/shader.js";
import { SquarePiramid } from "./squarePiramid.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext('webgl2');
function initWebGL() {
    if (!gl) {
        console.error("WebGL 2 is not supported by your browser.");
        return false;
    }
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    resizeAspectRatio(gl, canvas);
    return true;
}

let isInitialized = false;
document.addEventListener("DOMContentLoaded", () => {
    if (isInitialized) {
        console.log("Already initialized.");
        return;
    }
    main().then(success => {
        if (!success) {
            console.log("Program terminated.");
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error("Program terminated with error:", error);
    });
});

let axes = new Axes(gl, 1.8);
let squarePiramid = new SquarePiramid(gl);
let shader = null;

let modelMatrix = mat4.create();
mat4.identity(modelMatrix);
let viewMatrix = mat4.create();
let projMatrix = mat4.create();

let startTime;
let cameraCircleRadius = 3.0;
let cameraCircleSpeedXZ = 90.0;
let cameraCircleSpeedY = 45.0;

async function initShader() {
    const vertexShaderSource = await readShaderFile("hw05_shVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw05_shFrag.glsl");
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // compute the elapsed time from the start time
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000;

    let camX = cameraCircleRadius * Math.sin(glMatrix.toRadian(cameraCircleSpeedXZ * elapsedTime));
    let camY = 5.0 * Math.sin(glMatrix.toRadian(cameraCircleSpeedY * elapsedTime)) + 5.0;
    let camZ = cameraCircleRadius * Math.cos(glMatrix.toRadian(cameraCircleSpeedXZ * elapsedTime));
    mat4.lookAt(viewMatrix,
        vec3.fromValues(camX, camY, camZ),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 1, 0)
    );

    // draw the cube
    shader.use();
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setMat4('u_projection', projMatrix);
    squarePiramid.draw(shader);

    // draw the axes (using the axes'shader)
    axes.draw(viewMatrix, projMatrix);

    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL initialization failed');
        }
        await initShader();

        // Projection transformation matrix
        mat4.perspective(
            projMatrix,
            glMatrix.toRadian(60),  // field of view (fov, degree)
            canvas.width / canvas.height, // aspect ratio
            0.1, // near
            100.0 // far
        );

        startTime = Date.now();

        requestAnimationFrame(render);
        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program');
        return false;
    }
}

