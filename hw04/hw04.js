/* Homework 04 - 회전하는 풍차 애니메이션
    풍차의 크기(직사각형)과 날개(4개의 직사각형)를 그리고 다음 조건에 맞게 애니메이션을 구성
    1. 풍차 기둥은 고정되어 있음
    2. 풍차 날개는 중심점을 기준으로 회전
    3. 회전 속도는 sin 함수를 이용해 주기적으로 변화
    4. elapsedTime = currentTime - startTime (in seconds) 일 때,
        큰 날개는 sin(elapsedTime) * 𝜋 * 2.0 만큼 rotation, 작은 날개는 sin(elapsedTime) * 𝜋 * 10.0 만큼 rotation 
*/

import { resizeAspectRatio } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
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
            console.log("프로그램을 종료합니다.");
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error("프로그램 실행 중 오류 발생:", error);
    });
});

let shader
let pillar_vao, centerWing_vao, leftWing_vao, rightWing_vao;
let startTime = 0;
let bigRotationAngle = 0;
let smallRotationAngle = 0;


async function initShader() {
    const vertexShaderSource = await readShaderFile("hw04_shVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw04_shFrag.glsl");
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setupBuffers() {
    const brownColor = [0.65, 0.4, 0.2, 1.0];
    const whiteColor = [1.0, 1.0, 1.0, 1.0];
    const greyColor = [0.6, 0.6, 0.6, 1.0];

    const pillarVertices = new Float32Array([
        -0.1,  0.5, ...brownColor,
        -0.1, -0.5, ...brownColor,
         0.1, -0.5, ...brownColor,
         0.1,  0.5, ...brownColor
    ]);
    const centerWingVertices = new Float32Array([
        -0.3, 0.55, ...whiteColor,
        -0.3, 0.45, ...whiteColor,
         0.3, 0.45, ...whiteColor,
         0.3, 0.55, ...whiteColor
    ]);
    const leftWingVertices = new Float32Array([
        -0.38, 0.52, ...greyColor,
        -0.38, 0.48, ...greyColor,
        -0.22, 0.48, ...greyColor,
        -0.22, 0.52, ...greyColor
    ]);
    const rightWingVertices = new Float32Array([
        0.22, 0.52, ...greyColor,
        0.22, 0.48, ...greyColor,
        0.38, 0.48, ...greyColor,
        0.38, 0.52, ...greyColor
    ]);
    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ]);

    // EBO
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // VAO for Pillar, Center wing, Left wing, Right wing
    pillar_vao = createVaoVbo(pillarVertices, ebo);
    centerWing_vao = createVaoVbo(centerWingVertices, ebo);
    leftWing_vao = createVaoVbo(leftWingVertices, ebo);
    rightWing_vao = createVaoVbo(rightWingVertices, ebo);

    gl.bindVertexArray(null);
}

function createVaoVbo(vertices, ebo) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    return vao;
}

function centerWingMatrix() {
    const matrix = mat4.create();
    const Ta = mat4.create();
    const Tb = mat4.create();
    const R = mat4.create();
    mat4.translate(Ta, Ta, [0.0, -0.5, 0.0]);
    mat4.rotate(R, R, bigRotationAngle, [0, 0, 1]);
    mat4.translate(Tb, Tb, [0.0, 0.5, 0.0]);
    mat4.multiply(matrix, R, Ta);
    mat4.multiply(matrix, Tb, matrix);
    return matrix;
} 
function leftWingMatrix(centerMatrix) {
    const matrix = mat4.create();
    const local = mat4.create();
    const Ta = mat4.create();
    const Tb = mat4.create();
    const R = mat4.create();

    mat4.translate(Ta, Ta, [0.3, -0.5, 0.0]);
    mat4.rotate(R, R, -smallRotationAngle, [0, 0, 1]);
    mat4.translate(Tb, Tb, [-0.3, 0.5, 0.0]);

    mat4.multiply(local, R, Ta);
    mat4.multiply(local, Tb, local);
    mat4.multiply(matrix, centerMatrix, local);

    return matrix;
}
function rightWingMatrix(centerMatrix) {
    const matrix = mat4.create();
    const local = mat4.create();
    const Ta = mat4.create();
    const Tb = mat4.create();
    const R = mat4.create();

    mat4.translate(Ta, Ta, [-0.3, -0.5, 0.0]);
    mat4.rotate(R, R, -smallRotationAngle, [0, 0, 1]);
    mat4.translate(Tb, Tb, [0.3, 0.5, 0.0]);

    mat4.multiply(local, R, Ta);
    mat4.multiply(local, Tb, local);
    mat4.multiply(matrix, centerMatrix, local);

    return matrix;
}

function calculateAngle(time) {
    if (!startTime) startTime = time;
    const elapsedTime = (time - startTime) / 1000;
    
    bigRotationAngle = Math.PI * 2.0 * Math.sin(elapsedTime);
    smallRotationAngle = Math.PI * 10.0 * Math.sin(elapsedTime);
}

function drawPart(vao, matrix) {
    gl.bindVertexArray(vao);
    shader.setMat4("u_transform", matrix);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function render(currentTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();

    calculateAngle(currentTime);
    drawPart(pillar_vao, mat4.create());
    drawPart(centerWing_vao, centerWingMatrix());
    drawPart(leftWing_vao, leftWingMatrix(centerWingMatrix()));
    drawPart(rightWing_vao, rightWingMatrix(centerWingMatrix()));

    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error("WebGL 초기화 실패.");
        }
        await initShader();
        setupBuffers();
        requestAnimationFrame(render);
        return true;
    } catch (error) {
        console.error("Failed to initialize program", error);
        alert("프로그램 초기화에 실패했습니다.");
        return false;
    }
}