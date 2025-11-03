// self.addEventListener("message", (e) => {
//   let date = performance.now();

//   try {
//     let func = eval(e.data.func);
//     let resp = func(e.data.dataToPass);
//     self.postMessage({
//       msg: "listo",
//       resp: resp,
//       timeItTook: performance.now() - date,
//     });
//   } catch (err) {
//     self.postMessage({ msg: "error", err });
//   }

//   // return arr;
// });

let arr = [];
const cantItems = 1000;
let typedArr = new Float32Array(cantItems * 4);

for (let i = 0; i < 1000; i++) {
  arr.push({ x: Math.random(), y: Math.random() });
}

let lastTime = performance.now();

// setInterval(() => {
//   loop();
// }, 1000 / 60);

function loop() {
  const deltaTime = performance.now() - lastTime;
  self.postMessage({ deltaTime, lastTime, arr });
  lastTime = performance.now();
  requestAnimationFrame(loop);
}
loop();
