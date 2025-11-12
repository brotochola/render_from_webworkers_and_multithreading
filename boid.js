// Boid configuration and class - shared between workers and main thread
// This file works with both importScripts() and ES6 imports

const ENTITY_COUNT = 3000;
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
  cohesion(boids, dtRatio) {
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

      this.vx += (centerX - this.x) * CENTERING_FACTOR * dtRatio;
      this.vy += (centerY - this.y) * CENTERING_FACTOR * dtRatio;
    }
  }

  // Regla 2: Separación - evitar colisiones con vecinos cercanos
  separation(boids, dtRatio) {
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

    this.vx += moveX * AVOID_FACTOR * dtRatio;
    this.vy += moveY * AVOID_FACTOR * dtRatio;
  }

  // Regla 3: Alineación - igualar velocidad con vecinos
  alignment(boids, dtRatio) {
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

      this.vx += (avgVX - this.vx) * MATCHING_FACTOR * dtRatio;
      this.vy += (avgVY - this.vy) * MATCHING_FACTOR * dtRatio;
    }
  }

  // Mantener dentro de los límites de la pantalla
  keepWithinBounds(dtRatio) {
    if (this.x < MARGIN) {
      this.vx += TURN_FACTOR * dtRatio;
    }
    if (this.x > WIDTH - MARGIN) {
      this.vx -= TURN_FACTOR * dtRatio;
    }
    if (this.y < MARGIN) {
      this.vy += TURN_FACTOR * dtRatio;
    }
    if (this.y > HEIGHT - MARGIN) {
      this.vy -= TURN_FACTOR * dtRatio;
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
  update(boids, dtRatio = 1.0) {
    // Aplicar las tres reglas de los boids
    this.neighbors = this.getNeighbors(boids);
    this.cohesion(boids, dtRatio);
    this.separation(boids, dtRatio);
    this.alignment(boids, dtRatio);

    // Mantener dentro de límites
    this.keepWithinBounds(dtRatio);

    // Limitar velocidad
    this.limitSpeed();

    // Actualizar posición (multiplicar velocidad por deltaTime ratio)
    this.x += this.vx * dtRatio;
    this.y += this.vy * dtRatio;
  }

  // Calcular rotación basada en velocidad
  getRotation() {
    return Math.atan2(this.vy, this.vx) + Math.PI / 2;
  }
}
