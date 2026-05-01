import { resizeAspectRatio, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { SquarePiramid } from './squarePiramid.js';
import { Arcball } from '../util/arcball.js';
import { loadTexture } from '../util/texture.js';

const canvas = document.getElementById("glCanvas"); const gl = canvas.getContext("webgl2");
function initWebGL() {
    if (!gl) {
        console.error("WebGL is not supported by your browser.");
        return false;
    }
    canvas.width = 700;
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
let shader;
async function initShader() {
    const vertexShaderSource = await readShaderFile("hw07_shVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw07_shFrag.glsl");
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

let modelMatrix = mat4.create();
let viewMatrix = mat4.create();
let projMatrix = mat4.create();
const axes = new Axes(gl, 1,5);
const squarePiramid = new SquarePiramid(gl);
const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });
const texture = loadTexture(gl, true, './sunrise.jpg');

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    viewMatrix = arcball.getViewMatrix();

    shader.use();
    shader.setMat4("u_model", modelMatrix);
    shader.setMat4("u_view", viewMatrix);
    shader.setMat4("u_projection", projMatrix);
    squarePiramid.draw(shader);
    axes.draw(viewMatrix, projMatrix);

    requestAnimationFrame(render);
}
async function main() {
    try {
        if (!initWebGL()) {
            throw new Error("Failed to initialize WebGL.");
        }
        await initShader();
        gl.enable(gl.DEPTH_TEST);
        mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -3));
        mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width/canvas.height, 0.1, 1000.0);

        // bottom face
        squarePiramid.texCoords[0] = 0.0; squarePiramid.texCoords[1] = 1.0;
        squarePiramid.texCoords[2] = 0.0; squarePiramid.texCoords[3] = 0.0;
        squarePiramid.texCoords[4] = 1.0; squarePiramid.texCoords[5] = 0.0;
        squarePiramid.texCoords[6] = 1.0; squarePiramid.texCoords[7] = 1.0;
        // x+ face
        squarePiramid.texCoords[8] = 0.0; squarePiramid.texCoords[9] = 0.0;
        squarePiramid.texCoords[10] = 0.25; squarePiramid.texCoords[11] = 0.0;
        squarePiramid.texCoords[12] = 0.125; squarePiramid.texCoords[13] = 1.0;
        // z- face
        squarePiramid.texCoords[14] = 0.25; squarePiramid.texCoords[15] = 0.0;
        squarePiramid.texCoords[16] = 0.5; squarePiramid.texCoords[17] = 0.0;
        squarePiramid.texCoords[18] = 0.375; squarePiramid.texCoords[19] = 1.0;
        // x- face
        squarePiramid.texCoords[20] = 0.5; squarePiramid.texCoords[21] = 0.0;
        squarePiramid.texCoords[22] = 0.75; squarePiramid.texCoords[23] = 0.0;
        squarePiramid.texCoords[24] = 0.625; squarePiramid.texCoords[25] = 1.0;
        // z+ face
        squarePiramid.texCoords[26] = 0.75; squarePiramid.texCoords[27] = 0.0;
        squarePiramid.texCoords[28] = 1.0; squarePiramid.texCoords[29] = 0.0;
        squarePiramid.texCoords[30] = 0.875; squarePiramid.texCoords[31] = 1.0;
        // reinitialize the buffer
        squarePiramid.initBuffers();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        shader.setInt("u_texture", 0);

        requestAnimationFrame(render);
        return true;
    } catch(error) {
        console.error("Failed to initialize program:", error);
        alert("Failed to initialize program.");
        return false;
    }
}