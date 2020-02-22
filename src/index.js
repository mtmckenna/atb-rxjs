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
  interval,
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
  scan,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap,
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
  setScale,
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
  round
} from "./helpers";
import Queue from "./queue";
import state from "./state";
window.gState = state;

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
const clock$ = interval(0, animationFrameScheduler).pipe(notPausedOperator, share());

// Don't tick when there's an ATB reason to wait
const timerClock$ = clock$.pipe(
  withLatestFrom(atbMode$, (_, mode) => mode),
  switchMap(mode => combineLatest(atbMap[mode])),
  map(thingsToWaitOn => !thingsToWaitOn.some(m => m))
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
const currentHeroClock$ = clock$.pipe(withLatestFrom(currentHero$, (_, hero) => hero));
const victory$ = timerClock$.pipe(
  filter(() => state.enemies.every(c => c.hp <= 0)),
  distinctUntilChanged()
);
const defeat$ = timerClock$.pipe(
  filter(() => state.heroes.every(c => c.hp <= 0)),
  distinctUntilChanged()
);

resize$.subscribe(resize);

clock$.subscribe(() => TWEEN.update());

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

clock$.subscribe(() => updateIfDifferent(selectedAtbEl, state.settings.atbMode));

currentHeroClock$.subscribe(hero => {
  if (!hero) return;
  const index = state.heroes.indexOf(hero);
  const magicMenu = magicMenuEls[index];
  getAvailableActions(magicMenu).forEach(row => {
    if (hero.magic[row.dataset.index].mpDrain > hero.mp) {
      unsetSelectable(row);
    } else {
      setSelectable(row);
    }
  });

  if (hero.hp <= 0) currentHero$.next(null);
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
});

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
  });

  animationQueue.add(won$);
});

defeat$.subscribe(() => {
  const defeat$ = defer(() => {
    setShrink(pauseEl);
    unsetShrink(lostEl);
    paused$.next(true);
  });

  animationQueue.add(defeat$);
});

state.heroes.forEach((hero, i) => {
  const nameEl = heroNameEls[i];
  const spriteEl = heroSpriteEls[i];
  const deadOperator = getCharacterIsDeadOperator(hero);
  const heroTimer$ = characterTimer$(hero);
  const heroDead$ = heroTimer$.pipe(deadOperator);
  const heroReady$ = heroTimer$.pipe(map(time => time === 100));
  const heroReadyOperator = getFilterWithLatestFromOperator(heroReady$, v => v);
  const heroClicks$ = getClicksForElements$([nameEl, spriteEl]).pipe(
    heroReadyOperator,
    noActionOperator
  );

  // Update mp display
  const incrementHpValue = getIncrementTowardsValueOperator(hero, "mp", "maxMp");
  clock$.pipe(incrementHpValue).subscribe(val => {
    updateIfDifferent(mpEls[i], `${Math.round(val)}`);
  });

  // Update hp display
  const incrementMpValue = getIncrementTowardsValueOperator(hero, "hp", "maxHp");
  clock$.pipe(incrementMpValue).subscribe(val => {
    updateIfDifferent(hpEls[i], `${Math.round(val)} / ${state.heroes[i].maxHp}`);
  });

  // Update timer display
  clock$.subscribe(() => updateWaitWidth(waitFillingEls[i], hero.wait));

  // Update name
  updateIfDifferent(heroNameEls[i], `${hero.name}`);

  // Make hero look to the left
  setScale(hero.el, -1, 1);

  heroReady$.pipe(filter(r => r)).subscribe(() => setHeroReady(i));
  heroReady$.pipe(filter(r => !r)).subscribe(() => unsetHeroReady(i));
  heroDead$.subscribe(() => unsetHeroReady(i));
  heroClicks$.subscribe(() => currentHero$.next(hero));
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
  };
  const sinkEffect = () => data.effect(sink);

  const square = generateItemSquare();
  const squarePos = getElementPosition(square);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.el);
  const startX = sourcePos.left + sourcePos.width / 2 - squarePos.width / 2;
  const startY = sourcePos.top + sourcePos.height / 2 - squarePos.height / 2;
  const endX = sinkPos.left + sinkPos.width / 2 - squarePos.width / 2;
  const endY = sinkPos.top + sinkPos.height / 2 - squarePos.height / 2;
  const toSinkX = endX - startX;
  const toSinkY = endY - startY;

  moveLeft(square, startX);
  moveTop(square, startY);

  // Animate square
  const drainWait$ = drainCharacterWait$(source);
  const fadeIn$ = opacityTween$(square, 0.0, 1.0);
  const removeItem$ = deferCharacterFunction$(source, removeItem);
  const rotate$ = rotateTween$(square, 0, 45);
  const toSink$ = translateTween$(square, 0, 0, toSinkX, toSinkY);
  const unrotate$ = rotateTween$(square, 45, 0);
  const sinkResponse$ = hitResponse$(sink, sinkEffect);
  const fadeOut$ = opacityTween$(square, 1.0, 0.0);
  const animation$ = combinedAnimations$(
    drainWait$,
    fadeIn$,
    removeItem$,
    rotate$,
    toSink$,
    unrotate$,
    sinkResponse$,
    fadeOut$
  ).pipe(finalize(() => square.remove()));

  const queueItem$ = doAnimationIfStillAlive$(source, animation$);
  animationQueue.add(queueItem$);
}

function useMagic(source, sink, data) {
  console.log(`${source.name} magics ${sink.name}...`);
  const hpDrain = sink.hp - data.damage;

  const ball = generateMagicBall(data.color);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.el);
  const x = sinkPos.left - sourcePos.left;
  const y = sinkPos.top - sourcePos.top;

  moveTop(ball, sourcePos.top);
  moveLeft(ball, sourcePos.left);

  const sinkEffect = () => {
    updateCharacterStats(sink, sink.wait, hpDrain, sink.mp);
    animateHpDrainText(sink, data.damage);
  };

  const drainMp = () => updateCharacterStats(source, 0, source.hp, source.mp - data.mpDrain);

  // Animate magic ball
  const drainWait$ = drainCharacterWait$(source);
  const fadeIn$ = opacityTween$(ball, 0.0, 1.0);
  const drainMp$ = deferCharacterFunction$(source, drainMp);
  const toSink$ = translateTween$(ball, 0, 0, x, y);
  const shake$ = shakeTween$(sink.el, 0, 0, 15, 100);

  const sinkResponse$ = hitResponse$(sink, sinkEffect);
  const fadeOut$ = opacityTween$(ball, 1.0, 0.0);
  const animation$ = combinedAnimations$(
    drainWait$,
    fadeIn$,
    drainMp$,
    toSink$,
    shake$,
    sinkResponse$,
    fadeOut$
  ).pipe(finalize(() => ball.remove()));

  const queueItem$ = doAnimationIfStillAlive$(source, animation$);
  animationQueue.add(queueItem$);
}

function useAttack(source, sink, damage) {
  console.log(`${source.name} attacks ${sink.name}...`);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.el);
  const toSinkX = sinkPos.left - sourcePos.left;
  const toSinkY = sinkPos.top - sourcePos.top;

  const sinkEffect = () => {
    sink.hp = Math.max(sink.hp - damage, 0);
    animateHpDrainText(sink, damage);
  };

  const drainWait$ = drainCharacterWait$(source);
  const toSink$ = translateTween$(source.el, 0, 0, toSinkX, toSinkY);
  const shake$ = shakeTween$(sink.el, 0, 0, 15, 100);
  const sinkResponse$ = hitResponse$(sink, sinkEffect);
  const fromSink$ = translateTween$(source.el, toSinkX, toSinkY, 0, 0);
  const animation$ = combinedAnimations$(drainWait$, toSink$, shake$, sinkResponse$, fromSink$);
  const queueItem$ = doAnimationIfStillAlive$(source, animation$);
  animationQueue.add(queueItem$);
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
        return Math.min(Math.max(acc + inc, 0), object[maxKey]);
      }, object[key])
    );
  };
}

function getCharacterIsDeadOperator(character) {
  return input$ => input$.pipe(filter(() => character.hp <= 0));
}

function getCharacterIsAliveOperator(character) {
  return input$ => input$.pipe(filter(() => character.hp > 0));
}

function characterTimer$(character) {
  const deadOperator = getCharacterIsDeadOperator(character);
  const aliveOperator = getCharacterIsAliveOperator(character);

  const aliveTimer$ = timerClock$.pipe(
    aliveOperator,
    map(ticking => (ticking ? 0.15 : 0)),
    map(increase => round(Math.min(character.wait + increase, 100)))
  );

  const deadTimer$ = timerClock$.pipe(deadOperator, mapTo(0));
  const timer$ = merge(aliveTimer$, deadTimer$);

  return timer$;
}

function deferCharacterFunction$(character, fn) {
  return defer(() => {
    fn();
    return [character];
  });
}

function drainCharacterWait$(character) {
  const drainWait = () => (character.wait = 0);
  return deferCharacterFunction$(character, drainWait);
}

function hitResponse$(character, effect) {
  const effect$ = deferCharacterFunction$(characterFromElement, effect).pipe(
    delay(500),
    map(() => (character.hp === 0 ? 90 : 0)),
    switchMap(angle => rotateTween$(character.el, getRotation(character.el), angle, 200))
  );

  return effect$;
}

function shakeTween$(el, x, y, amount, speed = TRANSLATE_SPEED) {
  return getTweenEnd$(
    new TWEEN.Tween({ x })
      .to({ x: x + amount }, speed)
      .repeat(1)
      .yoyo()
      .onUpdate(({ x }) => setTranslate(el, x, y))
  );
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

function updateCharacterStats(character, wait, hp, mp) {
  character.hp = clamp(hp, 0, character.maxHp);
  character.mp = clamp(mp, 0, character.maxMp);
  character.wait = clamp(wait, 0, 100);
}

resize();
