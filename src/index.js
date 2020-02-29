// if queued enemy is dead, pick diff enemy on attack

import TWEEN from "@tweenjs/tween.js";

import {
  animationFrameScheduler,
  combineLatest,
  BehaviorSubject,
  concat,
  defer,
  EMPTY,
  fromEvent,
  iif,
  forkJoin,
  merge,
  Observable,
  of
} from "rxjs";

import {
  delay,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  mapTo,
  pluck,
  repeat,
  scan,
  share,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom
} from "rxjs/operators";

import {
  atbModeEls,
  getAvailableActions,
  heroNameEls,
  hpEls,
  heroMenuEls,
  heroSpriteEls,
  heroMenuBackEls,
  itemMenuEls,
  lostEl,
  mpEls,
  magicMenuEls,
  pauseEl,
  secondaryMenuBackEls,
  selectedAtbEl,
  unpauseEl,
  waitFillingEls,
  wonEl
} from "./elements";

import {
  fillItemMenu,
  fillMagicMenu,
  generateHpDrainText,
  generateItemSquare,
  generateMagicBall,
  getRotation,
  hideItemMenu,
  hideMagicMenu,
  hideSecondaryMenus,
  highlightHero,
  moveTop,
  moveLeft,
  resize,
  selectAction,
  setAllCharactersAsSinkable,
  setHeight,
  setHeroReady,
  setOpacity,
  setRotate,
  setSelectable,
  setShrink,
  setTranslate,
  setWidth,
  setWon,
  showItemMenu,
  showMagicMenu,
  showSecondaryMenu,
  unhighlightEnemies,
  unhighlightAllCharacters,
  unsetAllCharactersAsSinkable,
  unsetHeroReady,
  unsetSelectable,
  unsetSelected,
  unsetShrink,
  updateIfDifferent,
  updateWaitWidth
} from "./stylers";

import {
  characterFromElement,
  clamp,
  getElementPosition,
  getRandomElement,
  hasClass,
  isHero,
  round,
  removeElementFromArray
} from "./helpers";

import Queue from "./queue";
import state from "./state";

const TRANSLATE_SPEED = 1000;
const animationQueue = new Queue();
const currentHero$ = new BehaviorSubject(null).pipe(distinctUntilChanged());
const action$ = new BehaviorSubject(null);
const paused$ = new BehaviorSubject(false);

const actioning$ = action$.pipe(map(action => !!action));
const animating$ = animationQueue.size$.pipe(map(count => count > 0));

// Map of ATB modes to a list of streams that can pause the timer from filling
// i.e. Active mode never stops, Recommended stops when the characters are
// animating, and Wait stops when either the characters are animating or
// the player has selected an action (e.g. attack)
const atbMap = {
  Active: [of(false)],
  Recommended: [animating$],
  Wait: [animating$, actioning$]
};

const atbMode$ = fromEvent(atbModeEls, "click").pipe(
  pluck("target", "dataset", "mode"),
  startWith(state.settings.atbMode)
);

// Don't tick if pasued
const notPausedOperator = getFilterWithLatestFromOperator(paused$, v => !v);
const clock$ = of(null, animationFrameScheduler).pipe(repeat(), notPausedOperator, share());

// Don't tick when there's an ATB reason to wait
const timerClock$ = clock$.pipe(
  withLatestFrom(atbMode$, (_, mode) => mode),
  switchMap(mode => combineLatest(atbMap[mode])),
  filter(thingsToWaitOn => !thingsToWaitOn.some(m => m))
);

// Ignore clicks if we're paused
const clicks$ = fromEvent(document, "click").pipe(
  notPausedOperator,
  map(event => event.target),
  share()
);

const resize$ = fromEvent(window, "resize");
const pauseClick$ = fromEvent(pauseEl, "click");
const secondaryMenuBackClicks$ = getClicksForElements$(secondaryMenuBackEls).pipe(mapTo(false));
const noActionOperator = getFilterWithLatestFromOperator(action$, v => !v);

const heroMenuBackClicks$ = getClicksForElements$(heroMenuBackEls);
const menuLinkClicks$ = clicks$.pipe(
  filter(el => hasClass(el, "menu-link")),
  pluck("dataset", "menuName")
);
const menuLevels$ = merge(menuLinkClicks$, secondaryMenuBackClicks$);
const magicMenu$ = menuLevels$.pipe(filter(menu => menu === "magic"));
const itemMenu$ = menuLevels$.pipe(filter(menu => menu === "item"));
const noMenu$ = menuLevels$.pipe(filter(menu => !menu));

// Any element on which an action (e.g. attack, magic) can happen
const sinkClicks$ = clicks$.pipe(filter(el => hasClass(el, "sinkable")));
const actionSelected$ = action$.pipe(filter(action => !!action));
const actionUnselected$ = action$.pipe(filter(action => !action));
const currentHeroDead$ = clock$.pipe(
  withLatestFrom(currentHero$, (_, hero) => hero),
  filter(hero => !!hero),
  filter(hero => hero.hp <= 0)
);

const victory$ = clock$.pipe(
  map(() => state.enemies.every(c => c.hp <= 0)),
  distinctUntilChanged(),
  filter(won => won)
);

const defeat$ = timerClock$.pipe(
  map(() => state.heroes.every(c => c.hp <= 0)),
  distinctUntilChanged(),
  filter(lost => lost)
);

const noCurrentHeroOperator = getFilterWithLatestFromOperator(currentHero$, h => !h);
const readyHeroes = [];

resize$.subscribe(resize);

clock$.pipe(noCurrentHeroOperator).subscribe(() => {
  if (readyHeroes.length) currentHero$.next(readyHeroes[0]);
});

menuLevels$.subscribe(() => {
  action$.next(null);
});

noMenu$.subscribe(() => {
  hideMagicMenu();
  hideItemMenu();
});

itemMenu$.pipe(withLatestFrom(currentHero$)).subscribe(([_, hero]) => {
  showItemMenu(state.heroes.indexOf(hero));
});

magicMenu$.pipe(withLatestFrom(currentHero$)).subscribe(([_, hero]) => {
  showMagicMenu(state.heroes.indexOf(hero));
});

pauseClick$.subscribe(() => {
  paused$.next(true);
  setShrink(pauseEl);
  unsetShrink(unpauseEl);
});

atbMode$.subscribe(mode => {
  state.settings.atbMode = mode;
  paused$.next(false);
  setShrink(unpauseEl);
  unsetShrink(pauseEl);
});

clock$.subscribe(() => {
  TWEEN.update();
  updateIfDifferent(selectedAtbEl, state.settings.atbMode);
});

currentHero$.pipe(filter(hero => !!hero)).subscribe(hero => {
  const index = state.heroes.indexOf(hero);
  const { magic, items } = hero;
  const magicMenu = magicMenuEls[index];
  const itemcMenu = itemMenuEls[index];
  fillMagicMenu(magicMenu, magic);
  fillItemMenu(itemcMenu, items);
  highlightHero(index);
  showSecondaryMenu(index);
  removeElementFromArray(readyHeroes, hero);
});

currentHeroDead$.subscribe(() => currentHero$.next(null));

currentHero$.pipe(filter(hero => !hero)).subscribe(() => {
  action$.next(null);
  unhighlightAllCharacters();
  hideSecondaryMenus();
});

heroMenuBackClicks$.subscribe(() => {
  currentHero$.next(null);
  action$.next(null);
});

clicks$
  .pipe(
    filter(el => hasClass(el, "selectable")),
    filter(el => hasClass(el, "action")),
    withLatestFrom(currentHero$)
  )
  .subscribe(([el, hero]) => {
    const action = el.dataset.action;
    return action$.next({ source: hero, action, el });
  });

action$.pipe(filter(action => !!action)).subscribe(({ el }) => {
  setAllCharactersAsSinkable();
  selectAction(el);
});

actionUnselected$.subscribe(() => {
  heroMenuEls.forEach(unsetSelected);
  unsetAllCharactersAsSinkable();
});

const attack$ = actionSelected$.pipe(
  filter(({ action }) => action === "attack"),
  waitForSinkClickOperator,
  filter(({ sink }) => sink.hp > 0),
  filter(({ source, sink }) => source !== sink)
);

const magic$ = actionSelected$.pipe(
  filter(({ action }) => action === "magic"),
  waitForSinkClickOperator,
  filter(({ sink }) => sink.hp > 0)
);

const item$ = actionSelected$.pipe(
  filter(({ action }) => action === "item"),
  waitForSinkClickOperator,
  filter(({ sink }) => sink.hp > 0)
);

attack$.subscribe(({ source, sink }) => {
  const attackDamage = source.attack;
  unhighlightEnemies();
  hideSecondaryMenus();
  useAttack(source, sink, attackDamage);
  completeAction();
});

magic$.subscribe(({ source, sink, el }) => {
  const magicData = source.magic[el.dataset.index];
  unhighlightEnemies();
  hideSecondaryMenus();
  useMagic(source, sink, magicData);
  completeAction();
});

item$.subscribe(({ source, sink, el }) => {
  const itemData = source.items[el.dataset.index];
  unhighlightEnemies();
  hideSecondaryMenus();
  useItem(source, sink, itemData);
  completeAction();
});

victory$.subscribe(() => {
  const won$ = defer(() => {
    setShrink(pauseEl);
    unsetShrink(wonEl);
    paused$.next(true);
    const heroes = state.heroes.filter(hero => hero.hp > 0);
    heroes.forEach(hero => setWon(hero.el));
    return Promise.resolve();
  });

  animationQueue.add(won$);
});

defeat$.subscribe(() => {
  const defeat$ = defer(() => {
    setShrink(pauseEl);
    unsetShrink(lostEl);
    paused$.next(true);
    const enemies = state.enemies.filter(enemy => enemy.hp > 0);
    enemies.forEach(enemy => setWon(enemy.el));
    return Promise.resolve();
  });

  animationQueue.add(defeat$);
});

state.heroes.forEach((hero, i) => {
  const nameEl = heroNameEls[i];
  const spriteEl = heroSpriteEls[i];
  const heroTimer$ = characterTimer$(hero);

  const heroDead$ = heroTimer$.pipe(filter(() => hero.hp <= 0));
  const heroReady$ = clock$.pipe(
    map(() => hero.wait === 100),
    map(ready => (hero.hp > 0 ? ready : false)),
    distinctUntilChanged()
  );
  const heroReadyOperator = getFilterWithLatestFromOperator(heroReady$, v => v);
  const heroClicks$ = getClicksForElements$([nameEl, spriteEl]).pipe(
    heroReadyOperator,
    noActionOperator
  );

  // Set name
  updateIfDifferent(heroNameEls[i], `${hero.name}`);

  // Update MP display
  const incrementHpValue = getIncrementTowardsValueOperator(hero, "mp", "maxMp");
  clock$.pipe(incrementHpValue).subscribe(val => {
    updateIfDifferent(mpEls[i], `${val}`);
  });

  // Update HP display
  const incrementMpValue = getIncrementTowardsValueOperator(hero, "hp", "maxHp");
  clock$.pipe(incrementMpValue).subscribe(val => {
    updateIfDifferent(hpEls[i], `${val} / ${state.heroes[i].maxHp}`);
  });

  // Update timer display
  clock$.subscribe(() => updateWaitWidth(waitFillingEls[i], hero.wait));

  // Disable magic that costs too much MP
  clock$.subscribe(() => {
    const magicMenu = magicMenuEls[i];
    getAvailableActions(magicMenu).forEach(row => {
      unsetSelectable(row);
      const spell = hero.magic[row.dataset.index];
      if (spell.mpDrain < hero.mp) setSelectable(row);
    });
  });

  // Set hero as ready
  heroReady$.pipe(filter(r => r)).subscribe(() => {
    if (!readyHeroes.includes(hero)) readyHeroes.push(hero);
    setHeroReady(i);
  });

  // Set hero as not ready
  heroReady$.pipe(filter(r => !r)).subscribe(() => {
    removeElementFromArray(readyHeroes, hero);
    unsetHeroReady(i);
  });

  // Set hero as not raeady if dead
  heroDead$.subscribe(() => unsetHeroReady(i));

  // Set hero as current hero
  heroClicks$.subscribe(() => currentHero$.next(hero));

  // Update wait timer
  heroTimer$.subscribe(time => (hero.wait = time));
});

// Configure enemies
state.enemies.forEach(enemy => {
  const timer$ = characterTimer$(enemy);
  const ready$ = timer$.pipe(
    distinctUntilChanged(),
    filter(time => time === 100)
  );

  timer$.subscribe(time => (enemy.wait = time));
  ready$.subscribe(() => {
    const sink = getRandomElement(state.heroes.filter(hero => hero.hp > 0));
    if (sink) useAttack(enemy, sink, enemy.attack);
  });
});

function completeAction() {
  action$.next(null);
  currentHero$.next(null);
}

function getClicksForElements$(elements) {
  if (!Array.isArray(elements)) elements = [elements];
  return clicks$.pipe(filter(el => elements.includes(el)));
}

function useItem(source, sink, data) {
  console.log(`${source.name} items ${sink.name}...`);

  const removeItem = () => {
    const item = source.items.find(item => (item.name = data.name));
    source.items.splice(source.items.indexOf(item), 1);
    return Promise.resolve();
  };

  const sinkEffect = () => {
    data.effect(sink);
    return Promise.resolve();
  };

  const square = generateItemSquare();
  const squarePos = getElementPosition(square);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.hitPointEl);
  const startX = sourcePos.left + sourcePos.width / 2 - squarePos.width / 2;
  const startY = sourcePos.top + sourcePos.height / 2 - squarePos.height / 2;
  const endX = sinkPos.left + sinkPos.width / 2 - squarePos.width / 2;
  const endY = sinkPos.top + sinkPos.height / 2 - squarePos.height / 2;
  const toSinkX = endX - startX;
  const toSinkY = endY - startY;

  moveLeft(square, startX);
  moveTop(square, startY);
  drainCharacterWait(source);

  // Animate square
  const fadeIn$ = opacityTween$(square, 0.0, 1.0);
  const removeItem$ = defer(() => removeItem());
  const rotate$ = rotateTween$(square, 0, 45);
  const toSink$ = translateTween$(square, 0, 0, toSinkX, toSinkY);
  const unrotate$ = rotateTween$(square, 45, 0);
  const sinkResponse$ = hitResponse$(sink, sinkEffect);
  const fadeOut$ = opacityTween$(square, 1.0, 0.0);
  const animation$ = combinedAnimations$(
    fadeIn$,
    removeItem$,
    rotate$,
    toSink$,
    unrotate$,
    sinkResponse$,
    fadeOut$
  ).pipe(finalize(() => square.remove()));

  const queueItem$ = doAnimationIfStillAlive$(source, animation$);
  animationQueue.add(queueItem$, source);
}

function useMagic(source, sink, data) {
  console.log(`${source.name} magics ${sink.name}...`);
  const hpDrain = sink.hp - data.damage;

  const ball = generateMagicBall(data.color);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.hitPointEl);
  const x = sinkPos.left - sourcePos.left;
  const y = sinkPos.top - sourcePos.top;

  moveTop(ball, sourcePos.top);
  moveLeft(ball, sourcePos.left);

  const sinkEffect = () => {
    updateCharacterStats(sink, sink.wait, hpDrain, sink.mp);
    animateHpDrainText(sink, data.damage);
    return Promise.resolve();
  };

  const drainMp = () => {
    updateCharacterStats(source, 0, source.hp, source.mp - data.mpDrain);
    return Promise.resolve();
  };

  drainCharacterWait(source);

  // Animate magic ball
  const fadeIn$ = opacityTween$(ball, 0.0, 1.0);
  const drainMp$ = defer(() => drainMp());
  const toSink$ = translateTween$(ball, 0, 0, x, y);
  const shake$ = shakeTween$(sink.el, 0, 0, 15, 100);

  const sinkResponse$ = hitResponse$(sink, sinkEffect);
  const fadeOut$ = opacityTween$(ball, 1.0, 0.0);
  const animation$ = combinedAnimations$(
    fadeIn$,
    drainMp$,
    toSink$,
    shake$,
    sinkResponse$,
    fadeOut$
  ).pipe(finalize(() => ball.remove()));

  const queueItem$ = doAnimationIfStillAlive$(source, animation$);
  animationQueue.add(queueItem$, source);
}

function useAttack(source, sink, damage) {
  console.log(`${source.name} attacks ${sink.name}...`);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.hitPointEl);
  const toSinkX = sinkPos.left - sourcePos.left;
  const toSinkY = sinkPos.top - sourcePos.top;

  const sinkEffect = () => {
    sink.hp = Math.max(sink.hp - damage, 0);
    animateHpDrainText(sink, damage);
    return Promise.resolve();
  };

  drainCharacterWait(source);

  const fadeInHitPoint$ = opacityTween$(source.hitPointEl, 0.0, 0.5, 100);
  const toSink$ = translateTween$(source.el, 0, 0, toSinkX, toSinkY);
  const shake$ = shakeTween$(sink.el, 0, 0, 15, 100);
  const sinkResponse$ = hitResponse$(sink, sinkEffect);
  const fromSink$ = translateTween$(source.el, toSinkX, toSinkY, 0, 0);
  const fadeOutHitPoint$ = opacityTween$(source.hitPointEl, 1.0, 0.0, 100);
  const animation$ = combinedAnimations$(
    fadeInHitPoint$,
    toSink$,
    shake$,
    sinkResponse$,
    fromSink$,
    fadeOutHitPoint$
  );
  const queueItem$ = doAnimationIfStillAlive$(source, animation$);

  animationQueue.add(queueItem$, source);
}

function getFilterWithLatestFromOperator(stream$, conditionFunction) {
  return function(input$) {
    return input$.pipe(
      withLatestFrom(stream$),
      filter(([_, value]) => conditionFunction(value)),
      map(([s]) => s)
    );
  };
}

function waitForSinkClickOperator(input$) {
  return input$.pipe(
    switchMap(({ source, el }) =>
      sinkClicks$.pipe(
        takeUntil(actionUnselected$),
        map(sinkEl => characterFromElement(sinkEl)),
        map(sink => ({ source, sink, el }))
      )
    )
  );
}

function getIncrementTowardsValueOperator(object, key, maxKey) {
  return function(input$) {
    return input$.pipe(
      scan(acc => {
        const diff = object[key] - acc;
        let inc = object[maxKey] / 240; // Amount to increment by
        if (diff < 0) inc = -inc;
        if (diff === 0) inc = 0;
        return round(Math.min(Math.max(acc + inc, 0), object[maxKey]), 0);
      }, object[key])
    );
  };
}

function characterTimer$(character) {
  return timerClock$.pipe(
    mapTo(0.15),
    map(increase => (character.hp > 0 ? increase : 0)),
    map(increase => (!animationQueue.isQueued(character) ? increase : 0)),
    map(increase => round(Math.min(character.wait + increase, 100)))
  );
}

function hitResponse$(character, effect) {
  return defer(() => effect()).pipe(
    delay(500),
    map(() => (character.hp === 0 ? -90 : 0)),
    map(angle => (isHero(character.el) ? angle : -angle)),
    switchMap(angle => rotateTween$(character.el, getRotation(character.el), angle, 200))
  );
}

function shakeTween$(el, x, y, amount, speed = TRANSLATE_SPEED) {
  const shake = new TWEEN.Tween({ x })
    .to({ x: x + amount }, speed)
    .repeat(1)
    .yoyo()
    .onUpdate(({ x }) => setTranslate(el, x, y));

  const unShake = new TWEEN.Tween({ x: x + amount })
    .to({ x }, speed)
    .onUpdate(({ x }) => setTranslate(el, x, y));

  shake.chain(unShake);

  return getTweenEnd$(shake);
}

function translateTween$(el, x1, y1, x2, y2, speed = TRANSLATE_SPEED) {
  return getTweenEnd$(
    new TWEEN.Tween({ x: x1, y: y1 })
      .to({ x: x2, y: y2 }, speed)
      .onUpdate(({ x, y }) => setTranslate(el, x, y))
  );
}

function opacityTween$(el, start, end, speed = TRANSLATE_SPEED) {
  return getTweenEnd$(
    new TWEEN.Tween({ opacity: start })
      .to({ opacity: end }, speed)
      .onUpdate(({ opacity }) => setOpacity(el, opacity))
  );
}

function rotateTween$(el, start, end, speed = TRANSLATE_SPEED) {
  return getTweenEnd$(
    new TWEEN.Tween({ angle: start })
      .to({ angle: end }, speed)
      .onUpdate(({ angle }) => setRotate(el, angle))
  );
}

function combinedAnimations$() {
  return forkJoin(concat(...arguments));
}

function doAnimationIfStillAlive$(character, animation$) {
  return iif(() => character.hp > 0, animation$, EMPTY);
}

function getTweenEnd$(tween) {
  return new Observable(subscriber => {
    tween.start();
    tween.onComplete(() => {
      subscriber.next();
      subscriber.complete();
    });
  });
}

function animateHpDrainText(character, drain) {
  const hpDrainText = generateHpDrainText(drain);
  const pos = getElementPosition(character.el);
  moveTop(hpDrainText, pos.top);
  moveLeft(hpDrainText, pos.left);
  setHeight(hpDrainText, pos.height);
  setWidth(hpDrainText, pos.width);

  const fadeIn$ = opacityTween$(hpDrainText, 0.0, 1.0, 500).pipe(delay(500));
  const fadeOut$ = opacityTween$(hpDrainText, 1.0, 0.0, 500);
  const fade$ = concat(fadeIn$, fadeOut$);

  const floatUp$ = translateTween$(hpDrainText, 0, 0, 0, -pos.height / 2, 1500);
  floatUp$.subscribe();
  fade$.subscribe(null, null, () => hpDrainText.remove());
}

function drainCharacterWait(character) {
  character.wait = 0;
}

function updateCharacterStats(character, wait, hp, mp) {
  character.hp = clamp(hp, 0, character.maxHp);
  character.mp = clamp(mp, 0, character.maxMp);
  character.wait = clamp(wait, 0, 100);
}

resize();
