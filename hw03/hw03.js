import { resizeAspectRatio, setupText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
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

// Global variables
let isInitialized = false;
let shader = null;
let vao = null;
let positionBuffer = null;
let isDrawing = false;
let status = 0;     // status: 0 (시작 전), status: 1 (원 그린 후), status: 2 (선분 그린 후)
let center, circlePoint, radius = null;
let startPoint, endPoint = null;
let intersections = [];
let axes = new Axes(gl, 0.85);

// DomContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized.");
        return;
    }
    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }       
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

async function initShader() {
    const vertexShaderSource = await readShaderFile('hw03_shVert.glsl');
    const fragmentShaderSource = await readShaderFile('hw03_shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}
function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    shader.setAttribPointer('aPosition', 2, gl.FLOAT, false, 0, 0);
}

// 좌표 변환
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

// 원 생성
function createCircleVertices(center, radius) {
    const vertices = [];
    for (let i = 1; i <= 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const x = center[0] + radius * Math.cos(angle);
        const y = center[1] + radius * Math.sin(angle);
        vertices.push(x, y);
    }
    return new Float32Array(vertices);
}

// 교점 유무 및 교점 좌표 계산 함수
function computeIntersection(center, radius, startPoint, endPoint) {
    let dx = endPoint[0] - startPoint[0];
    let dy = endPoint[1] - startPoint[1];
    let fx = startPoint[0] - center[0];
    let fy = startPoint[1] - center[1];

    let a = dx * dx + dy * dy;
    let b = 2 * (fx * dx + fy * dy);
    let c = fx * fx + fy * fy - radius * radius;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return;

    let t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    let t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    if (t1 >= 0 && t1 <= 1) {
        intersections.push([startPoint[0] + t1 * dx, startPoint[1] + t1 * dy]);
    }
    if (t2 >=0 && t2 <= 1) {
        intersections.push([startPoint[0] + t2 * dx, startPoint[1] + t2 * dy]);
    }
}

// 마우스 이벤트
function setupMouseEvents() {
    function handleMouseDown(event) {        
        event.preventDefault();     
        event.stopPropagation();

        const rect = canvas.getBoundingClientRect(); 
        const x = event.clientX - rect.left;            
        const y = event.clientY - rect.top;          

        if (!isDrawing && status == 0) {
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            center = [glX, glY];
            isDrawing = true;
        }
        else if (!isDrawing && status == 1) {
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true;
        }       
    }
    function handleMouseMove(event) {          
        if (isDrawing && status == 0) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            circlePoint = [glX, glY];
            radius = Math.sqrt((center[0] - circlePoint[0]) **2 + (center[1] - circlePoint[1]) **2);
            render();
        }
        else if (isDrawing && status == 1) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            endPoint = [glX, glY];
            render();
        }
    }
    function handleMouseUp() {              
        if (isDrawing && status == 0) {
            setupText(canvas, "Circle: center (" + center[0].toFixed(2) + ", " + center[1].toFixed(2) + ") radius = " + radius.toFixed(2), 1);
        } else if (isDrawing && status == 1) {
            setupText(canvas, "Line segment: (" + startPoint[0].toFixed(2) + ", " + startPoint[1].toFixed(2) + ") ~ ("
                + endPoint[0].toFixed(2) + ", " + endPoint[1].toFixed(2) + ")", 2);
            computeIntersection(center, radius, startPoint, endPoint);
            if (intersections.length == 0) {
                setupText(canvas, "No interaction", 3);
            } else if (intersections.length == 1) {
                setupText(canvas, "Intersection Points: 1 Point 1: (" + intersections[0][0].toFixed(2) 
                    + ", " + intersections[0][1].toFixed(2) + ")", 3);
            } else if (intersections.length == 2) {
                setupText(canvas, "Intersection Points: 2 Point 1: (" + intersections[0][0].toFixed(2) + ", " + intersections[0][1].toFixed(2)
                    + ") Point 2: (" + intersections[1][0].toFixed(2) + ", " + intersections[1][1].toFixed(2) + ")", 3);
            }
        }
        status += 1;
        isDrawing = false;
        render();
    }
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);   
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    
    // 임시 원 및 임시 선분 그리기
    if (isDrawing && status == 0) {
        shader.setVec4('uColor', [0.5, 0.5, 0.5, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, createCircleVertices(center, radius), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINE_LOOP, 0, 100);
    }
    else if (isDrawing && status == 1) {
        shader.setVec4('uColor', [0.5, 0.5, 0.5, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...endPoint]), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINES, 0, 2)
    }
    // 최종 원 및 최종 선분 그리기
    if (status >= 1) {
        shader.setVec4('uColor', [1.0, 0.0, 1.0, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, createCircleVertices(center, radius), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINE_LOOP, 0, 100);
    }
    if (status >= 2) {
        shader.setVec4('uColor', [0.0, 1.0, 1.0, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...endPoint]), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINES, 0, 2);
        for (let point of intersections) {
            shader.setVec4('uColor', [1.0, 1.0, 0.0, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(point), gl.STATIC_DRAW);
            gl.drawArrays(gl.POINTS, 0, 1);
        }
    }
    axes.draw(mat4.create(), mat4.create());
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        await initShader();
        setupBuffers();
    
        setupMouseEvents();
        render();
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
