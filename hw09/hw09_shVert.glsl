#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_color;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec3 frag_position;
out vec3 frag_normal;
out vec2 frag_texCoord;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    frag_position = vec3(u_model * vec4(a_position, 1.0));
    frag_normal = mat3(transpose(inverse(u_model))) * a_normal;
}