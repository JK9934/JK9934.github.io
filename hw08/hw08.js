import { resizeAspectRatio, setupText, updateText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { Cone } from './cone.js';
import { Cube } from '../util/cube.js';     
import { Arcball } from '../util/arcball.js';

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
function initWebGL() {
    if (!gl) { 
        console.error("WebGL is not supported by your browser.");
        return false; }
    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    resizeAspectRatio(gl, canvas);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
let shader_phong;
async function initPhongShader() {
    const vertexShaderSource = await readShaderFile("hw08_shPhongVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw08_shPhongFrag.glsl");
    shader_phong = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}
let shader_gouraud;
async function initGouraudShader() {
    const vertexShaderSource = await readShaderFile("hw08_shGouraudVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw08_shGouraudFrag.glsl");
    shader_gouraud = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}
let lampShader;
async function initLampShader() {
    const vertexShaderSource = await readShaderFile('hw08_shLampVert.glsl');
    const fragmentShaderSource = await readShaderFile('hw08_shLampFrag.glsl');
    lampShader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

let modelMatrix = mat4.create();    
let lampModelMatrix = mat4.create();
let viewMatrix = mat4.create();     
let projMatrix = mat4.create();
const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });
const cone = new Cone(gl);          
const lamp = new Cube(gl);
let textOverlay2, textOverlay3;                    
let arcballMode = "CAMERA";     // "CAMERA" vs "MODEL"
let shadingMode = "FLAT";       // "FLAT" vs "SMOOTH"
let renderingMode = "PHONG";    // "PHONG" vs "GOURAUD"

const cameraPos = vec3.fromValues(0, 0, 3);
const lightPos = vec3.fromValues(1.0, 0.7, 1.0);
const lampSize = vec3.fromValues(0.1, 0.1, 0.1);

function setupKeyboardEvents() {
    document.addEventListener("keydown", (event) => {
        if (event.key == 'a') {
            if (arcballMode == "CAMERA") arcballMode = "MODEL";
            else arcballMode = "CAMERA";
            updateText(textOverlay2, "arcball mode: " + arcballMode);
        } else if (event.key == 'r') {
            arcball.reset();        
            mat4.identity(modelMatrix);
            arcballMode = "CAMERA";
            updateText(textOverlay2, "arcball mode: " + arcballMode);
        } else if (event.key == 's') {
            cone.copyVertexNormalsToNormals();
            cone.updateNormals();
            shadingMode = "SMOOTH";
            updateText(textOverlay3, "shading mode: " + shadingMode + " (" + renderingMode + ")");
            render();
        } else if (event.key == 'f') {
            cone.copyFaceNormalsToNormals();
            cone.updateNormals();
            shadingMode = "FLAT";
            updateText(textOverlay3, "shading mode: " + shadingMode + " (" + renderingMode + ")");
            render();
        } else if (event.key == 'g') {
            renderingMode = "GOURAUD";
            updateText(textOverlay3, "shading mode: " + shadingMode + " (" + renderingMode + ")");
            render();
        } else if (event.key == 'p') {
            renderingMode = "PHONG";
            updateText(textOverlay3, "shading mode: " + shadingMode + " (" + renderingMode + ")");
            render();
        }
    });
}
 
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (arcballMode == "CAMERA") {
        viewMatrix = arcball.getViewMatrix();
    } else {
        modelMatrix = arcball.getModelRotMatrix();
        viewMatrix = arcball.getViewCamDistanceMatrix();
    }
    if (renderingMode == "PHONG") {
        shader_phong.use();
        shader_phong.setMat4("u_model", modelMatrix);
        shader_phong.setMat4("u_view", viewMatrix);
        shader_phong.setVec3("u_viewPos", cameraPos);
        cone.draw(shader_phong);
    } else {
        shader_gouraud.use();
        shader_gouraud.setMat4("u_model", modelMatrix);
        shader_gouraud.setMat4("u_view", viewMatrix);
        shader_gouraud.setVec3("u_viewPos", cameraPos);
        cone.draw(shader_gouraud);
    }
    lampShader.use();
    lampShader.setMat4("u_view", viewMatrix);
    lamp.draw(lampShader);

    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error("Failed to initialize program.");
        }
        await initPhongShader();
        await initGouraudShader();
        await initLampShader();
        gl.enable(gl.DEPTH_TEST);

        mat4.lookAt(viewMatrix, cameraPos, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
        mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width/canvas.height, 0.1, 100.0);

        shader_phong.use();
        shader_phong.setMat4("u_projection", projMatrix);
        shader_phong.setVec3("material.diffuse", vec3.fromValues(1.0, 0.5, 0.3));
        shader_phong.setVec3("material.specular", vec3.fromValues(0.5, 0.5, 0.5));
        shader_phong.setFloat("material.shininess", 128);
        shader_phong.setVec3("light.position", lightPos);
        shader_phong.setVec3("light.ambient", vec3.fromValues(0.2, 0.2, 0.2));
        shader_phong.setVec3("light.diffuse", vec3.fromValues(0.7, 0.7, 0.7));
        shader_phong.setVec3("light.specular", vec3.fromValues(1.0, 1.0, 1.0));
        shader_phong.setVec3("u_viewPos", cameraPos);

        shader_gouraud.use();
        shader_gouraud.setMat4("u_projection", projMatrix);
        shader_gouraud.setVec3("material.diffuse", vec3.fromValues(1.0, 0.5, 0.3));
        shader_gouraud.setVec3("material.specular", vec3.fromValues(0.5, 0.5, 0.5));
        shader_gouraud.setFloat("material.shininess", 128);
        shader_gouraud.setVec3("light.position", lightPos);
        shader_gouraud.setVec3("light.ambient", vec3.fromValues(0.2, 0.2, 0.2));
        shader_gouraud.setVec3("light.diffuse", vec3.fromValues(0.7, 0.7, 0.7));
        shader_gouraud.setVec3("light.specular", vec3.fromValues(1.0, 1.0, 1.0));
        shader_gouraud.setVec3("u_viewPos", cameraPos);

        mat4.translate(lampModelMatrix, lampModelMatrix, lightPos);
        mat4.scale(lampModelMatrix, lampModelMatrix, lampSize);

        lampShader.use();
        lampShader.setMat4("u_projection", projMatrix);
        lampShader.setMat4("u_model", lampModelMatrix);

        setupText(canvas, "Cone with Lighting", 1);
        textOverlay2 = setupText(canvas, "arcball mode: " + arcballMode, 2);
        textOverlay3 = setupText(canvas, "shading mode: " + shadingMode + " (" + renderingMode + ")", 3);
        setupText(canvas, "Press 'a' to change arcball mode", 4);
        setupText(canvas, "Press 'r' to reset arcball", 5);
        setupText(canvas, "Press 's' to switch to smooth shading", 6);
        setupText(canvas, "Press 'f' to switch to flat shading", 7);
        setupText(canvas, "Press 'g' to switch to Gouraud shading", 8);
        setupText(canvas, "Press 'p' to switch to Phong shading", 9);
        setupKeyboardEvents();

        requestAnimationFrame(render);
        return true;
    } catch(error) {
        console.error("Failed to initialize program:", error);
        alert("Failed to initialize program.");
        return false;
    }
}