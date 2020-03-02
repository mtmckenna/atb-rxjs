import TWEEN from "@tweenjs/tween.js";

import {
  waitFillingEls,
  heroNameEls,
  hpEls,
  mpEls,
  heroSpriteEls,
  pauseEl,
  unpauseEl,
  selectedAtbEl,
  atbModeEls
} from "./elements";

import {
  setTranslate,
  highlightHeroes,
  highlightHero,
  highlightEnemies,
  setHeroReady,
  unsetHeroReady,
  setSelected,
  setShrink,
  unsetShrink,
  showSecondaryMenu,
  hideSecondaryMenus,
  unhighlightAllCharacters,
  resize,
  updateIfDifferent,
  updateWaitWidth
} from "./stylers";

import { isAction, characterFromElement, getElementPosition } from "./helpers";

import state from "./state";

const atbMap = {
  Active: [],
  Recommended: [getAnimating],
  Wait: [getAnimating, getAction]
};

const battleState = {
  currentHero: null,
  paused: false,
  action: null,
  heroes: [],
  enemies: [],
  timers: []
};

const TRANSLATE_SPEED = 1000;

window.addEventListener("resize", resize);
document.addEventListener("click", clickHandler);
pauseEl.addEventListener("click", pause);
Array.from(atbModeEls).forEach(el => el.addEventListener("click", setAtbMode));

state.heroes.forEach((_, i) => {
  const nameEl = heroNameEls[i];
  const spriteEl = heroSpriteEls[i];
  const hero = state.heroes[i];
  [nameEl, spriteEl].forEach(el => el.addEventListener("click", () => selectHero(hero)));
});

function clickHandler(event) {
  const el = event.target;
  if (!el) return;
  if (battleState.paused) return;

  if (el.classList.contains("action")) {
    if (isAction(el, "attack")) {
      battleState.action = "attack";
      prepareAttack(el);
    }
  }

  if (el.classList.contains("sinkable")) performAction(el);
  if (el.classList.contains("hero-back")) goBackToBattle();
}

function goBackToBattle() {
  battleState.currentHero = null;
  battleState.action = null;
  unhighlightAllCharacters();
  hideSecondaryMenus();
}

function prepareAttack(el) {
  setSelected(el);
  highlightEnemies();
  highlightHeroes();
}

function performAction(el) {
  const sink = characterFromElement(el);
  if (battleState.action === "attack") {
    useAttack(battleState.currentHero, sink);
  }

  battleState.action = null;
  battleState.currentHero = null;
}

function selectHero(hero) {
  if (hero.wait < 100) return;
  if (hero.hp <= 0) return;
  if (battleState.paused) return;
  const index = state.heroes.indexOf(hero);
  battleState.currentHero = hero;
  highlightHero(index);
  showSecondaryMenu(index);
}

function setAtbMode(event) {
  const mode = event.target.dataset.mode;
  state.settings.atbMode = mode;
  unpause();
}

function pause() {
  battleState.paused = true;
  setShrink(pauseEl);
  unsetShrink(unpauseEl);
}

function unpause() {
  battleState.paused = false;
  setShrink(unpauseEl);
  unsetShrink(pauseEl);
}

function getAnimating() {
  return battleState.heroes.some(h => h.animating) || battleState.enemies.some(h => h.animating);
}

function getAction() {
  return !!battleState.action;
}

function useAttack(source, sink) {
  console.log(`${source.name} attacks ${sink.name}...`);
  const index = state.heroes.indexOf(source);
  unhighlightAllCharacters();
  hideSecondaryMenus();

  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.hitPointEl);
  const toSinkX = sinkPos.left - sourcePos.left;
  const toSinkY = sinkPos.top - sourcePos.top;

  const toSink = translateTween(source.el, 0, 0, toSinkX, toSinkY);
  const fromSink = translateTween(source.el, toSinkX, toSinkY, 0, 0);

  fromSink.onComplete(() => (battleState.heroes[index].animating = false));
  toSink.chain(fromSink);

  source.wait = 0;
  battleState.heroes[index].animating = true;

  toSink.start();
}

function updateTimers() {
  state.heroes.forEach((hero, i) => {
    if (battleState.heroes[i].animating) return;
    hero.wait = Math.min(hero.wait + 0.15, 100);
  });
}

function wait() {
  return atbMap[state.settings.atbMode].some(shouldWait => !!shouldWait());
}

function update() {
  TWEEN.update();
  if (!wait()) updateTimers();
  state.heroes.forEach((hero, i) => {
    if (hero.wait < 100 || hero.hp <= 0) {
      unsetHeroReady(i);
    } else {
      setHeroReady(i);
    }
  });
}

function draw() {
  requestAnimationFrame(draw);
  if (battleState.paused) return;
  update();

  waitFillingEls.forEach((el, i) => updateWaitWidth(el, state.heroes[i].wait));
  hpEls.forEach((el, i) =>
    updateIfDifferent(el, `${state.heroes[i].hp} / ${state.heroes[i].maxHp}`)
  );
  mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].mp}`));
  heroNameEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].name}`));
  updateIfDifferent(selectedAtbEl, state.settings.atbMode);
}

function config() {
  state.heroes.forEach((_, i) => {
    battleState.heroes[i] = { animating: false };
  });

  state.enemies.forEach((_, i) => {
    battleState.heroes[i] = { animating: false };
  });
}

function translateTween(el, x1, y1, x2, y2, speed = TRANSLATE_SPEED) {
  return new TWEEN.Tween({ x: x1, y: y1 })
    .to({ x: x2, y: y2 }, speed)
    .onUpdate(({ x, y }) => setTranslate(el, x, y));
}

config();
requestAnimationFrame(draw);
resize();
