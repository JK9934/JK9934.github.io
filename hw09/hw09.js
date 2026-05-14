import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { Cylinder } from '../util/cylinder.js';
import { Arcball } from '../util/arcball.js';

const canvas = document.getElementById("glCanvas"); const gl = canvas.getContext("webgl2");
function initWebGL() {
    if (!gl) { console.error("WebGL is not supported by your browser."); return false; }
    canvas.width = 700; canvas.height = 700; gl.viewport(0, 0, canvas.width, canvas.height);
    resizeAspectRatio(gl, canvas); gl.clearColor(0.0, 0.0, 0.0, 1.0); return true;
}
let isInitialized = false;
document.addEventListener("DOMContentLoaded", () => {
    if (isInitialized) { console.log("Already initialized."); return; }
    main().then(success => {
        if (!success) { console.log("Program terminated."); return; } isInitialized = true;
    }).catch(error => { console.error("Program terminated with error:", error); });
});
let shader;
async function initShader() {
    const vertexShaderSource = await readShaderFile("hw09_shVert.glsl");
    const fragmentShaderSource = await readShaderFile("hw09_shFrag.glsl");
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

let modelMatrix = mat4.create();    
let viewMatrix = mat4.create();     
let projMatrix = mat4.create();
const cylinder = new Cylinder(gl, 32);          
const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });
const axes = new Axes(gl, 1.5);
let textOverlay2, textOverlay3;
let arcballMode = "CAMERA"; // "CAMERA" vs "MODEL"
let toonLevel = 1;          //  1 ~ 5

const cameraPos = vec3.fromValues(0, 0, 3);
const lightDirection = vec3.fromValues(1.0, 0.25, 0.5);
const shininess = 32.0;

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
        } else if (event.key >= '1' && event.key <= '5') {
            toonLevel = parseInt(event.key);
            updateText(textOverlay3, "toon levels: " + toonLevel)
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

    shader.use();
    shader.setInt("u_toonLevel", toonLevel);
    shader.setMat4("u_model", modelMatrix);
    shader.setMat4("u_view", viewMatrix);
    shader.setVec3("u_viewPos", cameraPos);
    cylinder.draw(shader);

    axes.draw(viewMatrix, projMatrix);
    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error("Failed to initialize program.");
        }
        await initShader();     gl.enable(gl.DEPTH_TEST);

        mat4.lookAt(viewMatrix, cameraPos, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
        mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width/canvas.height, 0.1, 100.0);
        cylinder.copyVertexNormalsToNormals();
        cylinder.updateNormals();

        shader.use();
        shader.setMat4("u_projection", projMatrix);
        shader.setVec3("material.diffuse", vec3.fromValues(1.0, 0.5, 0.3));
        shader.setVec3("material.specular", vec3.fromValues(1.0, 0.5, 0.0));
        shader.setFloat("material.shininess", shininess);
        shader.setVec3("light.direction", lightDirection);
        shader.setVec3("light.ambient", vec3.fromValues(0.2, 0.2, 0.2));
        shader.setVec3("light.diffuse", vec3.fromValues(0.7, 0.7, 0.7));
        shader.setVec3("light.specular", vec3.fromValues(1.0, 1.0, 1.0));
        shader.setVec3("u_viewPos", cameraPos);

        setupText(canvas, "TOON SHADING", 1);
        textOverlay2 = setupText(canvas, "arcball mode: " + arcballMode, 2);
        textOverlay3 = setupText(canvas, "toon levels: " + toonLevel, 3);
        setupText(canvas, "Press a/r to change/reset arcball mode", 4);
        setupText(canvas, "Press 1 - 5 to change toon shading levels", 5);
        setupKeyboardEvents();

        requestAnimationFrame(render);
        return true;
    } catch(error) {
        console.error("Failed to initialize program:", error);
        alert("Failed to initialize program."); return false;
    }
}