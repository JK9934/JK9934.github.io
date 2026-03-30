import { resizeAspectRatio, setupText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }
    canvas.width = 600;
    canvas.height = 600;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    resizeAspectRatio(gl, canvas);
    return true;
}

let shader = null;
let vao = null;
let offset = new Float32Array([0.0, 0.0, 0.0]);

async function initShader() {
    const vertexShaderSource = await readShaderFile('hw02_shVert.glsl');
    const fragmentShaderSource = await readShaderFile('hw02_shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setupBuffers() {
    const vertices = new Float32Array([
       -0.1, -0.1, 0.0, 1.0, 0.0, 0.0,    // left bottom & red
       0.1, -0.1, 0.0, 1.0, 0.0, 0.0,     // right bottom & red
       0.1, 0.1, 0.0, 1.0, 0.0, 0.0,      // right top & red
       -0.1, 0.1, 0.0, 1.0, 0.0, 0.0     // left top & red
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    shader.setAttribPointer('aPosition', 3, gl.FLOAT, false, 24, 0);
    shader.setAttribPointer('aColor', 3, gl.FLOAT, false, 24, 12);
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        const step = 0.01;
        const limit = 0.9;

        if (event.key == 'ArrowUp' && offset[1] + step <= limit) {
            offset[1] += step;
        }
        else if (event.key == 'ArrowDown' && offset[1] - step >= -limit) {
            offset[1] -= step;
        }
        else if (event.key == 'ArrowRight' && offset[0] + step <= limit) {
            offset[0] += step;
        }
        else if (event.key == 'ArrowLeft' && offset[0] - step >= -limit) {
            offset[0] -= step;
        }
    });
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    shader.use();
    shader.setVec3('uOffset', offset);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render());
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        await initShader();
        setupBuffers();

        setupText(canvas, 'Use arrow keys to move the rectangle.');
        setupKeyboardEvents();

        render();
        return true;
    } catch(error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});
