// Logic worker - Boids con double-buffering
importScripts("boid.js");

let FRAMENUM = 0;

// DOUBLE BUFFER: Dos sets completos de arrays
let frontX = new Float32Array(ENTITY_COUNT);
let frontY = new Float32Array(ENTITY_COUNT);
let frontRotation = new Float32Array(ENTITY_COUNT);
let frontScale = new Float32Array(ENTITY_COUNT);

let backX = new Float32Array(ENTITY_COUNT);
let backY = new Float32Array(ENTITY_COUNT);
let backRotation = new Float32Array(ENTITY_COUNT);
let backScale = new Float32Array(ENTITY_COUNT);

// Array de objetos Boid
const boids = [];

// Inicializar todos los boids
for (let i = 0; i < ENTITY_COUNT; i++) {
  const x = Math.random() * WIDTH;
  const y = Math.random() * HEIGHT;
  const boid = new Boid(i, x, y);
  boids.push(boid);

  const scale = 0.3 + Math.random() * 0.2;

  // Inicializar ambos buffers
  backX[i] = frontX[i] = x;
  backY[i] = frontY[i] = y;
  backRotation[i] = frontRotation[i] = boid.getRotation();
  backScale[i] = frontScale[i] = scale;
}

// Puerto para comunicación directa con el pixi worker
let pixiPort;
let waitingForReturn = false;

// Función para mandar data al pixi worker usando double-buffering
function mandarDataAPixiWorker() {
  if (!pixiPort) {
    console.error("LOGIC WORKER: pixiPort no está configurado todavía");
    return;
  }

  if (waitingForReturn) {
    return;
  }

  waitingForReturn = true;

  // Transferir el backBuffer (zero-copy)
  pixiPort.postMessage(
    {
      msg: "updateData",
      X: backX.buffer,
      Y: backY.buffer,
      rotation: backRotation.buffer,
      scale: backScale.buffer,
      frameNum: FRAMENUM,
      entityCount: ENTITY_COUNT,
    },
    [backX.buffer, backY.buffer, backRotation.buffer, backScale.buffer]
  );

  // Swap buffers
  [backX, frontX] = [frontX, backX];
  [backY, frontY] = [frontY, backY];
  [backRotation, frontRotation] = [frontRotation, backRotation];
  [backScale, frontScale] = [frontScale, backScale];
}

let deltaTime,
  lastTime = performance.now(),
  fps;

// Loop principal del juego
function gameLoop() {
  FRAMENUM++;
  const now = performance.now();
  deltaTime = now - lastTime;
  lastTime = now;
  fps = 1000 / deltaTime;

  // Actualizar cada boid (aplicando las reglas de boids)
  // deltaTime ratio normalizado a 60fps (16.67ms)
  const dtRatio = deltaTime / 16.67;
  for (let i = 0; i < ENTITY_COUNT; i++) {
    boids[i].update(boids, dtRatio);
  }

  // Escribir al backBuffer
  for (let i = 0; i < ENTITY_COUNT; i++) {
    backX[i] = boids[i].x;
    backY[i] = boids[i].y;
    backRotation[i] = boids[i].getRotation();
    // backScale se mantiene igual
  }

  // Enviar automáticamente cada frame
  mandarDataAPixiWorker();

  // Log cada 30 frames para debug
  if (FRAMENUM % 30 === 0) {
    self.postMessage({ msg: "fps", fps: fps });
  }

  requestAnimationFrame(gameLoop);
}

// Manejar mensajes entrantes
self.onmessage = (e) => {
  if (e.data.msg === "setPort") {
    pixiPort = e.data.port;

    pixiPort.onmessage = (e) => {
      if (e.data.msg === "returnBuffers") {
        // Recibimos el buffer viejo de vuelta
        frontX = new Float32Array(e.data.X);
        frontY = new Float32Array(e.data.Y);
        frontRotation = new Float32Array(e.data.rotation);
        frontScale = new Float32Array(e.data.scale);

        waitingForReturn = false;
      }
    };

    console.log("LOGIC WORKER: MessageChannel port configurado");
    mandarDataAPixiWorker();
  } else if (e.data === "mandarDataAPixiWorker") {
    mandarDataAPixiWorker();
  }
};

// Iniciar el game loop
gameLoop();
