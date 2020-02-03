import {
  battleEl,
  enemySpriteEls,
  heroNameEls,
  heroSpriteEls,
  heroMenuEls,
  magicMenuEls,
  itemMenuEls,
  groundWrapperEl,
  groundEl,
  spriteWrapperEls,
  backgroundEl,
  secondaryMenuEls,
  getAvailableActions
} from "./elements";

function setStyle(propName, formattingFunction = v => v) {
  return function(el) {
    const args = Array.from(arguments).slice(1, arguments.length);
    const formatttedValue = formattingFunction(...args);
    if (el.style[propName] !== formatttedValue) {
      el.style[propName] = formatttedValue;
    }
  };
}

function unsetStyle(propName) {
  return function(el) {
    if (!!el.style[propName]) {
      el.style[propName] = null;
    }
  };
}

function setClass(className) {
  return function(el) {
    if (!el.classList.contains(className)) {
      el.classList.add(className);
    }
  };
}

function unsetClass(className) {
  return function(el) {
    if (el.classList.contains(className)) {
      el.classList.remove(className);
    }
  };
}

const setReady = setClass("ready");
const unsetReady = unsetClass("ready");

const unsetSinkable = unsetClass("sinkable");
const setSinkable = setClass("sinkable");

const unsetSelectable = unsetClass("selectable");
const setSelectable = setClass("selectable");

const unsetHide = unsetClass("hide");
const setHide = setClass("hide");

const unsetShrink = unsetClass("shrink");
const setShrink = setClass("shrink");

const unsetDead = unsetClass("dead");
const setDead = setClass("dead");

const setSelected = setClass("selected");

function unsetSelected(element) {
  element.classList.remove("selected");
  const children = Array.from(element.getElementsByClassName("selected"));
  children.forEach(el => el.classList.remove("selected"));
}

const setMagicBallBackground = setStyle(
  "background",
  v => `radial-gradient(${v} 0%, rgba(0, 0, 0, 0) 50%)`
);

const setTranslate = setStyle(
  "transform",
  (left, top) => `translate(${left}px, ${top}px)`
);
const unsetTranslate = unsetStyle("transform");
const updateWaitWidth = setStyle("width", v => `${v}%`);
const moveTop = setStyle("top", v => `${v}px`);
const moveLeft = setStyle("left", v => `${v}px`);
const setHeight = setStyle("height", v => `${v}px`);
const setBackgroundImage = setStyle("backgroundImage");
const setOpacity = setStyle("opacity");
const unsetOpacity = unsetStyle("opacity");

function setAllCharactersAsSinkable() {
  const els = [heroNameEls, heroSpriteEls, enemySpriteEls].flat();
  els.forEach(setSelectable);
  els.forEach(setSinkable);
}

function unsetAllCharactersAsSinkable() {
  const els = [heroNameEls, heroSpriteEls, enemySpriteEls].flat();
  els.forEach(unsetSelectable);
  els.forEach(unsetSinkable);
}

function highlightHeroes() {
  const els = [heroNameEls, heroSpriteEls].flat();
  els.forEach(setSelectable);
  els.forEach(setSinkable);
}

function unhighlightHeroes() {
  const els = [heroNameEls, heroSpriteEls].flat();
  els.forEach(unsetSelectable);
  els.forEach(unsetSelected);
  els.forEach(unsetSinkable);
}

function unhighlightHero(heroIndex) {
  const els = [heroSpriteEls[heroIndex], heroNameEls[heroIndex]];
  els.forEach(unsetSelectable);
  els.forEach(unsetSelected);
  els.forEach(unsetSinkable);
}

function unhighlightAllCharacters() {
  unhighlightHeroes();
  unhighlightEnemies();
}

function highlightHero(heroIndex) {
  unhighlightHeroes();
  const el = heroNameEls[heroIndex];
  const spriteEl = heroSpriteEls[heroIndex];
  setSelected(el);
  setSelected(spriteEl);
}

function highlightEnemies() {
  enemySpriteEls.forEach(setSelectable);
  enemySpriteEls.forEach(setSinkable);
}

function unhighlightEnemies() {
  enemySpriteEls.forEach(unsetSelectable);
  enemySpriteEls.forEach(unsetSinkable);
}

function setHeroReady(heroIndex) {
  const heroName = heroNameEls[heroIndex];
  const heroSprite = heroSpriteEls[heroIndex];
  [heroName, heroSprite].forEach(el => {
    setSelectable(el);
    setReady(el);
  });
}

function unsetHeroReady(heroIndex) {
  const heroName = heroNameEls[heroIndex];
  const heroSprite = heroSpriteEls[heroIndex];
  [heroName, heroSprite].forEach(el => {
    unsetSelectable(el);
    unsetReady(el);
  });
}

function hideSecondaryMenus() {
  heroMenuEls.forEach(el => {
    setHide(el);
    unsetSelected(el);
  });
}

function showSecondaryMenu(heroIndex) {
  hideSecondaryMenus();
  const el = heroMenuEls[heroIndex];
  unsetHide(el);
}

function hideMenus() {}

function hideMagicMenu() {
  magicMenuEls.forEach(el => {
    setHide(el);
    unsetSelected(el);
  });
}

function showMagicMenu(heroIndex) {
  const el = magicMenuEls[heroIndex];
  unsetHide(el);
}

function resize() {
  const groundSize = groundWrapperEl.getBoundingClientRect();
  const { height } = groundSize;
  const cosx = Math.cos(deg2rad(45));
  const rotatedGroundHeight = height * cosx;
  const groundOffset = height - rotatedGroundHeight;
  moveTop(groundEl, groundOffset / 2);
  Array.from(spriteWrapperEls).forEach(el =>
    setHeight(el, rotatedGroundHeight)
  );
  setHeight(backgroundEl, groundOffset);
}

function deg2rad(degrees) {
  return (degrees * Math.PI) / 180;
}

function updateIfDifferent(element, value) {
  if (element.textContent !== value) {
    element.textContent = value;
  }
}

function createRow(text, classes, data = {}) {
  const row = document.createElement("div");
  row.classList.add(...classes);
  Object.keys(data).forEach(key => {
    row.dataset[key] = data[key];
  });

  row.textContent = text;

  return row;
}

function createActionRow(text, action, index) {
  const classes = ["row", "selectable", "action", "clearable"];
  const data = { action, index: parseInt(index) };
  return createRow(text, classes, data);
}

function fillMenuFunction(type) {
  return function(element, things) {
    clearRows(element);
    things.forEach((thing, index) => {
      element.appendChild(createActionRow(thing.name, type, index));
    });
  };
}

const fillMagicMenu = fillMenuFunction("magic");
const fillItemMenu = fillMenuFunction("item");

function clearRows(element) {
  const clearables = element.getElementsByClassName("clearable");
  Array.from(clearables).forEach(el => el.remove());
}

function generateMagicBall(color) {
  const ball = document.createElement("div");
  ball.classList.add("magic-ball");
  setMagicBallBackground(ball, color);
  battleEl.appendChild(ball);

  return ball;
}

function selectAction(el) {
  const actionEls = getAvailableActions();
  actionEls.forEach(unsetSelected);
  setSelected(el);
}

export {
  generateMagicBall,
  fillMagicMenu,
  fillItemMenu,
  clearRows,
  setTranslate,
  unsetTranslate,
  highlightHeroes,
  unhighlightHero,
  unhighlightHeroes,
  unhighlightAllCharacters,
  highlightHero,
  highlightEnemies,
  unhighlightEnemies,
  setHeroReady,
  unsetHeroReady,
  setSinkable,
  unsetSinkable,
  setSelectable,
  unsetSelectable,
  setSelected,
  unsetSelected,
  setAllCharactersAsSinkable,
  unsetAllCharactersAsSinkable,
  setHide,
  unsetHide,
  setShrink,
  unsetShrink,
  setDead,
  unsetDead,
  setOpacity,
  unsetOpacity,
  hideSecondaryMenus,
  showSecondaryMenu,
  moveTop,
  moveLeft,
  setHeight,
  setBackgroundImage,
  resize,
  updateIfDifferent,
  updateWaitWidth,
  showMagicMenu,
  hideMagicMenu,
  setMagicBallBackground,
  selectAction
};
