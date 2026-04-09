export class SquarePiramid {
    constructor(gl) {
        this.gl = gl;
        
        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        this.vertices = new Float32Array([
            // bottom face (1st quadrant -> 2nd quadrant -> 3rd quadrant -> 4th quadrant)
             0.5,  0.0,  0.5,   0.5,  0.0, -0.5,  -0.5,  0.0, -0.5,  -0.5,  0.0,  0.5,
            // x+ face (1st qudrant & 2nd quadrant)
             0.5,  0.0,  0.5,   0.5,  0.0, -0.5,   0.0,  1.0,  0.0,
            // z- face (2nd quadrant & 3rd qudrant)
             0.5,  0.0, -0.5,  -0.5,  0.0, -0.5,   0.0,  1.0,  0.0,
            // x- face (3rd qudrant & 4th qudrant)
            -0.5,  0.0, -0.5,  -0.5,  0.0,  0.5,   0.0,  1.0,  0.0,
            // z+ face (4th qudrant & 1st qudrant)
            -0.5,  0.0,  0.5,   0.5,  0.0,  0.5,   0.0,  1.0,  0.0
        ]);

        this.normals = new Float32Array([
            // bottom face
            0, -1, 0,   0, -1, 0,   0, -1, 0,   0, -1, 0,
            // x+ face
            2/Math.sqrt(5), 1/Math.sqrt(5), 0,   2/Math.sqrt(5), 1/Math.sqrt(5), 0,   2/Math.sqrt(5), 1/Math.sqrt(5), 0,
            // z- face
            0, 1/Math.sqrt(5), -2/Math.sqrt(5),   0, 1/Math.sqrt(5), -2/Math.sqrt(5),   0, 1/Math.sqrt(5), -2/Math.sqrt(5),
            // x- face
            -2/Math.sqrt(5), 1/Math.sqrt(5), 0,  -2/Math.sqrt(5), 1/Math.sqrt(5), 0,  -2/Math.sqrt(5), 1/Math.sqrt(5), 0,
            // z+ face
            0, 1/Math.sqrt(5), 2/Math.sqrt(5),   0, 1/Math.sqrt(5), 2/Math.sqrt(5),   0, 1/Math.sqrt(5), 2/Math.sqrt(5)
        ]);

        this.colors = new Float32Array([
            // bottom face - white
            1, 1, 1, 1,   1, 1, 1, 1,   1, 1, 1, 1,   1, 1, 1, 1,
            // x+ face - yellow
            1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1, 
            // z- face - magenta
            1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,
            // x- face - cyan
            0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
            // z+ face - red
            1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1
        ]);

        this.texCoords = new Float32Array([
            // bottom face
            1.0, 1.0,   1.0, 0.0,   0.0, 0.0,   0.0, 1.0,
            // x+ face
            0.5, 1.0,   0.0, 0.0,   1.0, 0.0,
            // z- face
            0.5, 1.0,   0.0, 0.0,   1.0, 0.0,
            // x- face
            0.5, 1.0,   0.0, 0.0,   1.0, 0.0,   
            // z+ face
            0.5, 1.0,   0.0, 0.0,   1.0, 0.0,
        ]);

        this.indices = new Uint16Array([
            // bottom face
            0, 1, 2,   2, 3, 0,
            // x+ face
            4, 5, 6,
            // z- face
            7, 8, 9,
            // x- face
            10, 11, 12,
            // z+ face
            13, 14, 15
        ]);

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // 버퍼 크기 계산
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        // gl.bufferSubData(target, offset, data): target buffer의 
        //     offset 위치부터 data를 copy (즉, data를 buffer의 일부에만 copy)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        // EBO에 인덱스 데이터 복사
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertex attributes 설정
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);  // normal
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);  // color
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);  // texCoord

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {

        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}