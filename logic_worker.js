// Logic worker - Boids con double-buffering
let FRAMENUM = 0;

const ENTITY_COUNT = 1200;
const WIDTH = 800;
const HEIGHT = 600;

// Parámetros de los Boids
const VISUAL_RANGE = 75;
const PROTECTED_RANGE = 20;
const CENTERING_FACTOR = 0.005;
const AVOID_FACTOR = 0.05;
const MATCHING_FACTOR = 0.05;
const MAX_SPEED = 4;
const MIN_SPEED = 2;
const TURN_FACTOR = 0.2;
const MARGIN = 50;

// Clase Boid
class Boid {
  constructor(index, x, y) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
  }

  // Regla 1: Cohesión - volar hacia el centro de masa de vecinos
  cohesion() {
    let centerX = 0;
    let centerY = 0;

    for (let other of this.neighbors) {
      if (other === this) continue;

      centerX += other.x;
      centerY += other.y;
    }

    if (this.neighbors.length > 0) {
      centerX /= this.neighbors.length;
      centerY /= this.neighbors.length;

      this.vx += (centerX - this.x) * CENTERING_FACTOR;
      this.vy += (centerY - this.y) * CENTERING_FACTOR;
    }
  }

  // Regla 2: Separación - evitar colisiones con vecinos cercanos
  separation() {
    let moveX = 0;
    let moveY = 0;

    for (let other of this.neighbors) {
      if (other === this) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PROTECTED_RANGE && dist > 0) {
        moveX -= dx / dist;
        moveY -= dy / dist;
      }
    }

    this.vx += moveX * AVOID_FACTOR;
    this.vy += moveY * AVOID_FACTOR;
  }

  // Regla 3: Alineación - igualar velocidad con vecinos
  alignment() {
    let avgVX = 0;
    let avgVY = 0;
    let numNeighbors = 0;

    for (let other of this.neighbors) {
      if (other === this) continue;

      avgVX += other.vx;
      avgVY += other.vy;
      numNeighbors++;
    }

    if (numNeighbors > 0) {
      avgVX /= numNeighbors;
      avgVY /= numNeighbors;

      this.vx += (avgVX - this.vx) * MATCHING_FACTOR;
      this.vy += (avgVY - this.vy) * MATCHING_FACTOR;
    }
  }

  // Mantener dentro de los límites de la pantalla
  keepWithinBounds() {
    if (this.x < MARGIN) {
      this.vx += TURN_FACTOR;
    }
    if (this.x > WIDTH - MARGIN) {
      this.vx -= TURN_FACTOR;
    }
    if (this.y < MARGIN) {
      this.vy += TURN_FACTOR;
    }
    if (this.y > HEIGHT - MARGIN) {
      this.vy -= TURN_FACTOR;
    }
  }

  // Limitar velocidad
  limitSpeed() {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }

    if (speed < MIN_SPEED) {
      this.vx = (this.vx / speed) * MIN_SPEED;
      this.vy = (this.vy / speed) * MIN_SPEED;
    }
  }

  getNeighbors(boids) {
    return boids.filter((other) => {
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const distSq = dx * dx + dy * dy;
      return distSq < VISUAL_RANGE * VISUAL_RANGE;
    });
  }

  // Actualizar posición
  update(boids) {
    // Aplicar las tres reglas de los boids
    this.neighbors = this.getNeighbors(boids);
    this.cohesion(boids);
    this.separation(boids);
    this.alignment(boids);

    // Mantener dentro de límites
    this.keepWithinBounds();

    // Limitar velocidad
    this.limitSpeed();

    // Actualizar posición
    this.x += this.vx;
    this.y += this.vy;
  }

  // Calcular rotación basada en velocidad
  getRotation() {
    return Math.atan2(this.vy, this.vx) + Math.PI / 2;
  }
}

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
  for (let i = 0; i < ENTITY_COUNT; i++) {
    boids[i].update(boids);
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
