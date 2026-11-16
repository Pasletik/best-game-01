// Keyboard and pointer input. Actions are bit flags, like the starter's: the game loop reads
// them, then the caller clears the one-shot ones. Pointer positions are kept in logical
// (1280x720) coordinates, so the layout never depends on the window size.
export const ACTION_START = 1; // Space or Enter: start the wave / begin / restart
export const ACTION_PAUSE = 2; // P
export const ACTION_MUTE = 4; // M
export const ACTION_ESCAPE = 8; // Escape: deselect / close a panel
export const ACTION_TOWER_1 = 16; // 1: pick Spark Spire
export const ACTION_TOWER_2 = 32; // 2: pick Ember Cannon
export const ACTION_TOWER_3 = 64; // 3: pick Frost Brazier
export const ACTION_SPEED = 128; // F: toggle 1x / 2x speed

const KEY_ACTIONS = {
  Space: ACTION_START,
  Enter: ACTION_START,
  KeyP: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  Escape: ACTION_ESCAPE,
  Digit1: ACTION_TOWER_1,
  Digit2: ACTION_TOWER_2,
  Digit3: ACTION_TOWER_3,
  KeyF: ACTION_SPEED,
};

export function createInput() {
  const input = {
    x: -1,
    y: -1,
    down: false,
    clicked: false,
    clickX: 0,
    clickY: 0,
    actions: 0,
  };

  function toLogical(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  function attach(canvas) {
    canvas.addEventListener('pointermove', (event) => {
      const p = toLogical(event, canvas);
      input.x = p.x;
      input.y = p.y;
    });
    canvas.addEventListener('pointerdown', (event) => {
      const p = toLogical(event, canvas);
      input.x = p.x;
      input.y = p.y;
      input.down = true;
      input.clicked = true;
      input.clickX = p.x;
      input.clickY = p.y;
    });
    canvas.addEventListener('pointerup', () => {
      input.down = false;
    });
    canvas.addEventListener('pointerleave', () => {
      input.x = -1;
      input.y = -1;
      input.down = false;
    });
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const action = KEY_ACTIONS[event.code];
      if (action !== undefined) {
        input.actions |= action;
        event.preventDefault();
      }
    });
  }

  function takeActions() {
    const actions = input.actions;
    input.actions = 0;
    return actions;
  }

  function takeClick() {
    if (!input.clicked) return null;
    input.clicked = false;
    return { x: input.clickX, y: input.clickY };
  }

  return { input, attach, takeActions, takeClick };
}
