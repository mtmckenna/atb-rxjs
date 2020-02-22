import state from "./state";

function isHero(el) {
  return el.classList.contains("hero");
}

function isAction(el, type) {
  return el.dataset.action === type;
}

function characterFromElement(el) {
  const index = el.dataset.index;
  const characters = isHero(el) ? state.heroes : state.enemies;
  return characters[index];
}

function getElementPosition(el) {
  const pos = el.getBoundingClientRect();
  return { left: pos.left, top: pos.top, width: pos.width, height: pos.height };
}

function hasClass(el, className) {
  return el.classList.contains(className);
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function round(num) {
  return Math.ceil(num * 100) / 100;
}

export {
  isHero,
  isAction,
  characterFromElement,
  getElementPosition,
  hasClass,
  getRandomElement,
  clamp,
  round
};
