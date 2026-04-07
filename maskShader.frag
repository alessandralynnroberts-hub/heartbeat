precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D tex;

void main() {

  vec4 color = texture2D(tex, vTexCoord);

  if(color.a < 0.1){
    discard;
  }

  gl_FragColor = color;
}