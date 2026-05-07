#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_color;
layout(location = 3) in vec2 a_texCoord;

out vec3 lightingColor;     // resulting color at each vertex, send it to fragment shader

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

struct Light {
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    vec3 frag_position = vec3(u_model * vec4(a_position, 1.0));
    vec3 frag_normal = mat3(transpose(inverse(u_model))) * a_normal;

    // ambient
    vec3 rgb = material.diffuse;                                // Ia, Id
    vec3 ambient = light.ambient * rgb;                         // Ka * Ia

    // diffuse
    vec3 normal = normalize(frag_normal);                       // N
    vec3 lightDir = normalize(light.position - frag_position);  // L
    float dotNormalLight = max(dot(normal, lightDir), 0.0);     // N L                      
    vec3 diffuse = light.diffuse * dotNormalLight * rgb;        // Kd * N·L * Id

    // specular
    vec3 viewDir = normalize(u_viewPos - frag_position);        // V
    vec3 reflectDir = reflect(-lightDir, normal);               // R (-lightDir: lightDir의 반대방향)

    float spec = 0.0;
    if (dotNormalLight > 0.0) {
        spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);     // (R·V)^n
    }
    vec3 specular = light.specular * spec * material.specular;  // Ks * (R·V)^n * Is 

    lightingColor = ambient + diffuse + specular;
}