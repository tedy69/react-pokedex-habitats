// The illustrated plate supplies the lighting. Its inked foreground, middle
// distance and horizon move by different amounts under the pointer.
export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

export const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D previousMap, currentMap;
uniform float previousKind, currentKind, blend, time, aspect, plateAspect;
uniform vec2 pointerPosition;

vec2 plateUv(float kind) {
  vec2 crop = min(vec2(1.0), vec2(aspect / plateAspect, plateAspect / aspect));
  vec2 uv = (vUv - 0.5) * crop + 0.5;
  float sides = smoothstep(0.16, 0.5, abs(uv.x - 0.5));
  float ground = 1.0 - smoothstep(0.02, 0.56, uv.y);
  float foreground = max(sides * 0.75, ground);
  float depth = mix(0.12, 0.54, 1.0 - uv.y) + foreground * foreground;
  uv = (uv - 0.5) * 0.977 + 0.5;
  uv += pointerPosition * vec2(0.0038, 0.0053) * depth;
  if (kind > 2.5) {
    float wind = sin(uv.x * 18.0 + time * 1.5) + 0.36 * sin(uv.x * 32.0 + time * 2.1);
    uv.x += 0.0019 * wind * sides * (0.55 + ground);
  }
  return uv;
}

vec3 forestLeaf(vec3 ink, vec2 p) {
  float cycle = mod(time + 1.4, 9.0);
  if (cycle > 4.3) return ink;
  float t = cycle / 4.3;
  vec2 center = vec2(0.71 + 0.095 * t + sin(t * 8.0) * 0.017, 0.88 - 0.59 * t);
  vec2 q = (p - center) * vec2(aspect, 1.0);
  float angle = sin(7.0 * t) * 1.2 + t * 2.5;
  q = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * q;
  q.x /= 0.019;
  q.y /= 0.0070;
  float width = max(0.0, 1.0 - q.x * q.x);
  float distance = max(abs(q.x) - 1.0, abs(q.y - 0.15 * q.x) - width);
  float alpha = (1.0 - smoothstep(-0.08, 0.10, distance)) * smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.80, 1.0, t));
  vec3 leaf = mix(vec3(0.42, 0.46, 0.21), vec3(0.66, 0.64, 0.31), smoothstep(-0.2, 0.12, q.y));
  return mix(ink, leaf, alpha * 0.86);
}

vec3 embers(vec3 ink, vec2 p) {
  for (int i = 0; i < 4; i++) {
    float n = float(i);
    float t = fract(time * (0.19 + n * 0.01) + n * 0.27);
    vec2 source = vec2(0.72 + n * 0.049, 0.12);
    vec2 q = (p - source - vec2(0.025 * sin(t * 5.0 + n) + t * 0.025, t * 0.37)) * vec2(aspect, 1.0);
    float spark = 1.0 - smoothstep(0.0007, 0.0042, length(q * vec2(1.0, 0.70)));
    ink = mix(ink, vec3(1.0, 0.71, 0.34), spark * sin(t * 3.14159));
  }
  return ink;
}

vec3 poolRipples(vec3 ink, vec2 p) {
  for (int i = 0; i < 3; i++) {
    float n = float(i);
    float t = fract(time * 0.15 + n * 0.34);
    vec2 q = (p - vec2(0.77 - n * 0.25, 0.22 + n * 0.04)) * vec2(aspect, 3.8);
    float d = length(q);
    float stroke = 1.0 - smoothstep(0.001, 0.008, abs(d - 0.015 - t * 0.145));
    float second = 1.0 - smoothstep(0.001, 0.006, abs(d - t * 0.135));
    float fade = sin(t * 3.14159) * (0.4 + 0.6 * smoothstep(-0.1, 0.09, q.y));
    ink = mix(ink, vec3(0.89, 0.94, 0.84), (stroke * 0.42 + second * 0.20) * fade);
  }
  return ink;
}

vec3 glint(vec3 ink, vec2 p) {
  float t = mod(time + 0.8, 10.0);
  if (t > 0.32) return ink;
  vec2 q = abs((p - vec2(0.81, 0.38)) * vec2(aspect, 1.0));
  float star = max(0.0, 1.0 - min(q.x * 410.0 + q.y * 48.0, q.y * 550.0 + q.x * 80.0));
  return mix(ink, vec3(1.0, 0.98, 0.61), star * sin(t / 0.32 * 3.14159));
}

vec3 motion(vec3 ink, float kind) {
  if (kind < 0.5) return forestLeaf(ink, vUv);
  if (kind < 1.5) return embers(ink, vUv);
  if (kind < 2.5) return poolRipples(ink, vUv);
  return glint(ink, vUv);
}

void main() {
  vec3 next = motion(texture2D(currentMap, plateUv(currentKind)).rgb, currentKind);
  if (blend < 1.0) {
    vec3 prev = motion(texture2D(previousMap, plateUv(previousKind)).rgb, previousKind);
    next = mix(prev, next, smoothstep(0.0, 1.0, blend));
  }
  gl_FragColor = vec4(next, 1.0);
}`
