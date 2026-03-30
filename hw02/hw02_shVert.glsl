#version 300 es

in vec3 aPosition;
in vec3 aColor;
uniform vec3 uOffset;
out vec3 vColor;

void main() {
    gl_Position = vec4(aPosition + uOffset, 1.0);
    vColor = aColor;
}
