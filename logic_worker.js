// Logic worker - maneja la lógica del juego con double-buffering
let FRAMENUM = 0;

const ENTITY_COUNT = 1000;

// DOUBLE BUFFER: Dos sets completos de arrays
// frontBuffer: el que acabamos de mandar y estamos esperando que vuelva
// backBuffer: el que estamos escribiendo AHORA
let frontX = new Float32Array(ENTITY_COUNT);
let frontY = new Float32Array(ENTITY_COUNT);
let frontRotation = new Float32Array(ENTITY_COUNT);
let frontScale = new Float32Array(ENTITY_COUNT);

let backX = new Float32Array(ENTITY_COUNT);
let backY = new Float32Array(ENTITY_COUNT);
let backRotation = new Float32Array(ENTITY_COUNT);
let backScale = new Float32Array(ENTITY_COUNT);

// Inicializar AMBOS buffers con los MISMOS valores
for (let i = 0; i < ENTITY_COUNT; i++) {
  const x = Math.random() * 800;
  const y = Math.random() * 600;
  const rot = Math.random() * Math.PI * 2;
  const scale = 0.5 + Math.random() * 0.5;

  backX[i] = frontX[i] = x;
  backY[i] = frontY[i] = y;
  backRotation[i] = frontRotation[i] = rot;
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
    // Esperando que vuelva el buffer, no enviamos
    return;
  }

  waitingForReturn = true;

  // Transferir el backBuffer (zero-copy, super rápido)
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

  // IMPORTANTE: después de transferir, perdemos acceso a backBuffer
  // Hacemos swap para poder seguir escribiendo en frontBuffer
  [backX, frontX] = [frontX, backX];
  [backY, frontY] = [frontY, backY];
  [backRotation, frontRotation] = [frontRotation, backRotation];
  [backScale, frontScale] = [frontScale, backScale];
}

let deltaTime, lastTime, fps;

// Loop principal del juego
function gameLoop() {
  FRAMENUM++;
  const now = performance.now();
  deltaTime = now - lastTime;
  lastTime = now;
  fps = 1000 / deltaTime;

  // Simular cálculos de lógica: mover entidades
  for (let i = 0; i < ENTITY_COUNT; i++) {
    backX[i] += (Math.random() - 0.5) * 0.01;
    backY[i] += (Math.random() - 0.5) * 0.01;
    backRotation[i] += Math.random() * -0.5 * 0.1;

    // Mantener dentro de pantalla
    if (backX[i] < 0) backX[i] = 800;
    if (backX[i] > 800) backX[i] = 0;
    if (backY[i] < 0) backY[i] = 600;
    if (backY[i] > 600) backY[i] = 0;
  }

  // Enviar automáticamente cada frame
  mandarDataAPixiWorker();

  // Log cada 60 frames para debug
  if (FRAMENUM % 30 === 0) {
    self.postMessage({ msg: "fps", fps: fps });
  }

  requestAnimationFrame(gameLoop);
}

// Manejar mensajes entrantes
self.onmessage = (e) => {
  // Si recibimos el puerto del MessageChannel, configurarlo
  if (e.data.msg === "setPort") {
    pixiPort = e.data.port;

    // Escuchar mensajes que vengan del pixi worker a través del puerto
    pixiPort.onmessage = (e) => {
      if (e.data.msg === "returnBuffers") {
        // Recibimos el buffer viejo de vuelta - ahora lo usamos como frontBuffer
        frontX = new Float32Array(e.data.X);
        frontY = new Float32Array(e.data.Y);
        frontRotation = new Float32Array(e.data.rotation);
        frontScale = new Float32Array(e.data.scale);

        waitingForReturn = false;
      }
    };

    console.log("LOGIC WORKER: MessageChannel port configurado");

    // Enviar el primer frame
    mandarDataAPixiWorker();
  }
  // Si el main thread nos pide mandar data manualmente
  else if (e.data === "mandarDataAPixiWorker") {
    mandarDataAPixiWorker();
  }
};

// Iniciar el game loop
gameLoop();
