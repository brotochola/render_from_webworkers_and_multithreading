importScripts("pixi4webworkers.js");

const cantBunnies = 1200;
let FRAMENUM = 0;
let app;
let width, height, resolution, view;

// Puerto para comunicación directa con el logic worker
let logicPort;

// Buffer actual que estamos usando para renderizar
let currentX, currentY, currentRotation, currentScale;
let entityCount = 0;

// Array de sprites
const bunnies = [];
let lastTime = performance.now();
let deltaTime = 0;
let fps = 0;

// Loop de renderizado
function gameLoop() {
  FRAMENUM++;
  const now = performance.now();
  deltaTime = now - lastTime;
  lastTime = now;
  fps = 1000 / deltaTime;

  // Actualizar posiciones de todos los sprites desde los buffers
  if (currentX && currentY && currentRotation && currentScale) {
    for (let i = 0; i < entityCount; i++) {
      if (bunnies[i]) {
        bunnies[i].x = currentX[i];
        bunnies[i].y = currentY[i];
        bunnies[i].rotation = currentRotation[i];
        bunnies[i].scale.set(currentScale[i]);
      }
    }
  }

  // Log cada 60 frames para debug
  if (FRAMENUM % 30 === 0 && currentX) {
    self.postMessage({ msg: "fps", fps: fps });
  }
}

// Inicializar PIXI en el worker
async function initPIXI(e) {
  console.log("PIXI WORKER: Inicializando PIXI", e);

  // Recibir OffscreenCanvas del main thread
  width = e.width;
  height = e.height;
  resolution = e.resolution;
  view = e.view;

  // Crear la aplicación PIXI con el canvas offscreen
  app = new PIXI.Application({ width, height, resolution, view });

  // Cargar la textura
  const texture = await PIXI.Assets.load("/1.png");

  // Crear 1000 sprites de bunny
  for (let i = 0; i < cantBunnies; i++) {
    const bunny = new PIXI.Sprite(texture);
    bunny.anchor.set(0.5); // Centro del sprite
    bunnies.push(bunny);
    app.stage.addChild(bunny);
  }

  // Iniciar el ticker de PIXI
  app.ticker.add(gameLoop);

  console.log("PIXI WORKER: Inicialización completa - 1000 bunnies creados");
}

// Manejar mensajes entrantes
self.onmessage = (e) => {
  // Inicializar PIXI
  if (e.data.msg === "init") {
    initPIXI(e.data);
  }
  // Configurar el puerto del MessageChannel
  else if (e.data.msg === "setPort") {
    logicPort = e.data.port;

    // Escuchar mensajes que vengan del logic worker a través del puerto
    logicPort.onmessage = (e) => {
      if (e.data.msg === "updateData") {
        // Guardar los buffers viejos antes de reemplazarlos
        const oldX = currentX;
        const oldY = currentY;
        const oldRotation = currentRotation;
        const oldScale = currentScale;

        // Convertir los nuevos buffers a Float32Array y usarlos
        currentX = new Float32Array(e.data.X);
        currentY = new Float32Array(e.data.Y);
        currentRotation = new Float32Array(e.data.rotation);
        currentScale = new Float32Array(e.data.scale);
        entityCount = e.data.entityCount;

        // SIEMPRE devolver buffers al logic worker
        if (oldX) {
          // Devolver los buffers viejos
          logicPort.postMessage(
            {
              msg: "returnBuffers",
              X: oldX.buffer,
              Y: oldY.buffer,
              rotation: oldRotation.buffer,
              scale: oldScale.buffer,
            },
            [oldX.buffer, oldY.buffer, oldRotation.buffer, oldScale.buffer]
          );
        } else {
          // Primera vez: COPIAR los valores actuales para crear el segundo buffer
          console.log(
            "PIXI WORKER: Primera vez, copiando valores y devolviendo buffers"
          );
          const newX = new Float32Array(currentX);
          const newY = new Float32Array(currentY);
          const newRotation = new Float32Array(currentRotation);
          const newScale = new Float32Array(currentScale);

          logicPort.postMessage(
            {
              msg: "returnBuffers",
              X: newX.buffer,
              Y: newY.buffer,
              rotation: newRotation.buffer,
              scale: newScale.buffer,
            },
            [newX.buffer, newY.buffer, newRotation.buffer, newScale.buffer]
          );
        }
      }
    };

    console.log("PIXI WORKER: MessageChannel port configurado");
  }
  // Responder con el frame count actual
  else if (e.data === "getFrameCount") {
    self.postMessage({ msg: "frameCount", frameCount: FRAMENUM });
  }
};
