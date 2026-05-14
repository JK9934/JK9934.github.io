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
    vec3 direction;         // light direction
    vec3 ambient;           // ambient strength                 // Ka
    vec3 diffuse;           // diffuse strength                 // Kd
    vec3 specular;          // specular strength                // Ks
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;
uniform int u_toonLevel;

void main() {
    float level = float(u_toonLevel);

    // ambient
    vec3 rgb = material.diffuse;
    vec3 ambient = light.ambient * rgb;

    // diffuse
    vec3 normal = normalize(frag_normal);
    vec3 lightDir = normalize(light.direction);
    float dotNormalLight = max(dot(normal, lightDir), 0.0);
    float toonDiffuse = floor(dotNormalLight * level) / level;                      
    vec3 diffuse = light.diffuse * toonDiffuse * rgb;

    // specular
    vec3 viewDir = normalize(u_viewPos - frag_position);
    vec3 reflectDir = reflect(-lightDir, normal);

    float toonSpecular = 0.0;
    if (dotNormalLight > 0.0) {
        float rawSpec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
        toonSpecular = floor(rawSpec * level) / level;
    }
    vec3 specular = light.specular * toonSpecular * material.specular;

    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, 1.0);
}