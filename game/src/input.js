// Keyboard and mouse input for Palmera City. Keys are tracked by code so
// WASD and arrows both work; mouse position is kept in canvas coordinates.
export function createInput(canvas) {
  const keys = {};
  const pressed = {};
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const anyKey = { value: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
    anyKey.value = true;
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function onMouseDown(e) { onMouseMove(e); mouse.down = true; mouse.clicked = true; anyKey.value = true; }
  function onMouseUp() { mouse.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    keys, pressed, mouse, anyKey,
    down(code) { return !!keys[code]; },
    // True only on the frame the key went down.
    wasPressed(code) { return !!pressed[code]; },
    // Movement axes: -1..1 for up/down and left/right.
    axisY() {
      let v = 0;
      if (keys['KeyW'] || keys['ArrowUp']) v -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) v += 1;
      return v;
    },
    axisX() {
      let v = 0;
      if (keys['KeyA'] || keys['ArrowLeft']) v -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) v += 1;
      return v;
    },
    endFrame() {
      for (const k in pressed) pressed[k] = false;
      mouse.clicked = false;
      anyKey.value = false;
    },
  };
}
