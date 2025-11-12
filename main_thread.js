// Main thread implementation - all logic and rendering in one thread
// Boid, ENTITY_COUNT, WIDTH, HEIGHT are loaded from boid.js

function initMainThread(width, height, resolution) {
  console.log("Initializing MAIN THREAD mode");

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = width * resolution;
  canvas.height = height * resolution;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  document.body.appendChild(canvas);

  // Initialize boids
  const boids = [];
  for (let i = 0; i < ENTITY_COUNT; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    const boid = new Boid(i, x, y);
    boids.push(boid);
  }

  // PIXI setup
  let app,
    bunnies = [];
  let logicFPS = 0,
    renderFPS = 0;
  let logicLastTime = performance.now();
  let renderLastTime = performance.now();
  let logicFrameNum = 0,
    renderFrameNum = 0;

  // Initialize PIXI
  (async function () {
    app = new PIXI.Application({
      width,
      height,
      resolution,
      view: canvas,
    });

    // Load texture
    const texture = await PIXI.Assets.load("/1.png");

    // Create sprites
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const bunny = new PIXI.Sprite(texture);
      bunny.anchor.set(0.5);
      const scale = 0.3 + Math.random() * 0.2;
      bunny.scale.set(scale);
      bunnies.push(bunny);
      app.stage.addChild(bunny);
    }

    console.log("MAIN THREAD: Initialization complete - 1200 bunnies created");

    // Start loops
    requestAnimationFrame(gameLoop);
    app.ticker.add(renderLoop);
  })();

  // Logic loop (equivalent to logic_worker)
  function gameLoop() {
    logicFrameNum++;
    const now = performance.now();
    const deltaTime = now - logicLastTime;
    const deltaTimeRatio = deltaTime / 16.67;
    logicLastTime = now;
    logicFPS = 1000 / deltaTime;

    // Update boids
    for (let i = 0; i < ENTITY_COUNT; i++) {
      boids[i].update(boids, deltaTimeRatio);
    }

    // Update sprites positions directly (no buffer transfer needed)
    for (let i = 0; i < ENTITY_COUNT; i++) {
      if (bunnies[i]) {
        bunnies[i].x = boids[i].x;
        bunnies[i].y = boids[i].y;
        bunnies[i].rotation = boids[i].getRotation();
      }
    }

    // Log FPS
    if (logicFrameNum % 30 === 0) {
      document.querySelector("#logicWorkerFPS").textContent =
        "logic fps: " + logicFPS.toFixed(2);
    }

    requestAnimationFrame(gameLoop);
  }

  // Render loop (equivalent to pixi_worker)
  function renderLoop() {
    renderFrameNum++;
    const now = performance.now();
    const deltaTime = now - renderLastTime;
    renderLastTime = now;
    renderFPS = 1000 / deltaTime;

    // Log FPS
    if (renderFrameNum % 30 === 0) {
      document.querySelector("#pixiWorkerFPS").textContent =
        "render fps: " + renderFPS.toFixed(2);
    }
  }
}
