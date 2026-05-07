#version 300 es
precision highp float;

in vec3 frag_position;      // modelMatrix(M) * localPosition from vertex shader
in vec3 frag_normal;        // transpose(inverse(M)) * localNormal from vertex shader
out vec4 FragColor;

struct Material {
    vec3 diffuse;           // surface's diffuse color          // Ia, Id
    vec3 specular;          // surface's specular color         // Is
    float shininess;        // specular shininess               // n
};
struct Light {
    vec3 position;          // light position
    vec3 ambient;           // ambient strength                 // Ka
    vec3 diffuse;           // diffuse strength                 // Kd
    vec3 specular;          // specular strength                // Ks 
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

void main() {
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

    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, 1.0);
}