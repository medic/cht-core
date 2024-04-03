const $ = require('jquery');

const ACTIVE_BG_COLOR = '#0000ff';
const INACTIVE_BG_COLOR = '#cccccc';
const ARC_COLOR = '#cccccc';

const drawArc = (ctx, c, arc) => {
  const arcRadians = Math.PI * arc / 180;
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, -Math.PI / 2, arcRadians - (Math.PI / 2), false);
  ctx.lineTo(c.x, c.y);
  ctx.fillStyle = c.color;
  ctx.fill();
};

const drawCircle = (ctx, c) => drawArc(ctx, c, 360);

const drawBackgroundCircle = (ctx, c, color) => drawCircle(ctx, { ...c, color });

const drawTimerArc = (ctx, c, offset, lim) => drawArc(
  ctx,
  { ...c, color: ARC_COLOR },
  offset * 180 / lim
);

const drawAnimation = (ctx, circle, offset, lim) => {
  drawBackgroundCircle(ctx, circle, ACTIVE_BG_COLOR);
  drawTimerArc(ctx, circle, offset, lim);
};

const setupAudio = () => {
  const androidSoundSupport = window.medicmobile_android &&
    typeof window.medicmobile_android.playAlert === 'function';
  if (androidSoundSupport) {
    return { play: () => window.medicmobile_android.playAlert() };
  }
  return new Audio('/audio/alert.mp3');
};

let audio;
const getAudio = () => {
  if (!audio) {
    audio = setupAudio();
  }
  return audio;
};

const animate = function(canvas, duration, onComplete) {
  const lim = duration * 500; // Half of the time the animation should take in milliseconds
  const ctx = canvas.getContext('2d');

  let running;

  const circle = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    r: Math.min(canvas.width, canvas.height) / 2
  };

  const resetTimer = () => {
    running = false;
    drawBackgroundCircle(ctx, circle, INACTIVE_BG_COLOR);
  };

  const startTimer = () => {
    running = true;
    setTimeout(() => animateFrame(Date.now()), 0);
  };

  const animateFrame = (start) => {
    if (!running) {
      return;
    }

    const offset = Date.now() - start;
    if (offset < lim * 2) {
      drawAnimation(ctx, circle, offset, lim);
      requestAnimationFrame(() => animateFrame(start));
      return;
    }

    resetTimer();
    if ($(canvas).closest('body').length > 0) {
      // only beep if the canvas is still attached to the DOM
      getAudio().play();
    }
    onComplete();
  };

  // set up initial state
  resetTimer();

  canvas.addEventListener('click', () => {
    if (running) {
      resetTimer();
      return;
    }
    startTimer();
  });
};

module.exports = { animate };
