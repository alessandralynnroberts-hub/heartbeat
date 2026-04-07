let tripodFish;

let rotateFaster = 0;


let hoverFarther = 0;



let vibrate = 0;

let portButton;
let port;
let writer;


let maskShader;

function preload() {
  
  
  tripodFish = loadModel("tripodfish.obj", true);
  
  
  
scales = loadImage("blueScales.png", true);
  
  
  
  leeHead = loadImage("leeHead2.png", true);
  
  
  
  
  maskShader = loadShader("maskShader.vert", "maskShader.frag");
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  

 portButton = createButton("Connect Arduino");
 portButton.position(20, 20);
portButton.mousePressed(connectSerial);

  let gl = this._renderer.GL;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

async function connectSerial() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  writer = port.writable.getWriter();
  console.log("Serial connected");
}

function draw() {
  clear();
  drawLee();

 
  if (writer && frameCount % 5 === 0) {
  
    let speedValue = constrain(Math.pow(rotateFaster, 1.5) * 60, 1, 255);
    writer.write(new Uint8Array([speedValue]));
  }
//had to make the speed changes much more dramatic so that i can actually see the difference
 
  
  
  orbitControl();
  
  
  
  
  
  
  noStroke();
  
  
  
  
  scale(-1, -1, 1);
  
  
  
  texture(scales);

  rotateY((frameCount * 0.01) + rotateFaster);
  
  
  translate(0, sin(frameCount * (0.04 + vibrate)) * (20 + hoverFarther), 200);

  tint(100, 200, 170);
  
  
  
  
  model(tripodFish);
}

function drawLee() {

  
  
  
  
  
  push();
  
  
  
  
  shader(maskShader);
  
  
  
  
  
  maskShader.setUniform("tex", leeHead);

  translate(0, sin(frameCount * (0.04 + vibrate)) * 20, 0);
  
  
  
  
  noStroke();
  
  
  
  
  texture(leeHead);
  
  
  
  
  plane(400, 400);

  resetShader();
  
  
  
  
  pop();
}

function mouseClicked() {
  
  
  rotateFaster += 0.5;
  
  
  
hoverFarther += 10;
  
  
  
  vibrate += 0.05;
}

function mouseReleased() {
  if (writer) {
    writer.write(new Uint8Array([0])); 
  }
}