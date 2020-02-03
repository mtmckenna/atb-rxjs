// Add items
// HP lowers on attack
// Enemies attack
// Can win
// distinctUntilChanged

import {
  concat,
  fromEvent,
  interval,
  merge,
  animationFrameScheduler,
  BehaviorSubject,
  Observable,
  combineLatest,
  of
} from "rxjs";

import {
  filter,
  map,
  pluck,
  share,
  switchMap,
  take,
  scan,
  takeUntil,
  withLatestFrom,
  startWith,
  tap,
  mapTo
} from "rxjs/operators";

import {
  waitFillingEls,
  heroNameEls,
  hpEls,
  mpEls,
  heroMenuEls,
  heroSpriteEls,
  heroMenuBackEls,
  secondaryMenuBackEls,
  pauseEl,
  unpauseEl,
  selectedAtbEl,
  atbModeEls,
  itemMenuEls,
  magicMenuEls,
  getAvailableActions,
  enemySpriteEls
} from "./elements";

import {
  setTranslate,
  unsetTranslate,
  highlightHero,
  setHeroReady,
  unsetHeroReady,
  setSelected,
  setShrink,
  unsetShrink,
  showSecondaryMenu,
  hideSecondaryMenus,
  unhighlightEnemies,
  unhighlightAllCharacters,
  resize,
  updateIfDifferent,
  updateWaitWidth,
  setAllCharactersAsSinkable,
  unsetAllCharactersAsSinkable,
  showMagicMenu,
  hideMagicMenu,
  fillMagicMenu,
  unsetSelected,
  generateMagicBall,
  moveTop,
  moveLeft,
  setOpacity,
  unsetOpacity,
  selectAction,
  unsetSelectable,
  setDead,
  unsetDead
} from "./stylers";

import { characterFromElement, getElementPosition, isHero } from "./helpers";

import state from "./state";

const currentHero$ = new BehaviorSubject(null);
const action$ = new BehaviorSubject(null);
const paused$ = new BehaviorSubject(false);
const animatingCount$ = new BehaviorSubject(0).pipe(
  scan((acc, val) => acc + val, 0)
);

const actioning$ = action$.pipe(map(action => !!action));
const animating$ = animatingCount$.pipe(map(count => count > 0));

// Map of ATB modes to a list of streams that can pause the timer from filling
// i.e. Active mode never stops, Recommended stops when the characters are
// animating, and Wait stops when either the characters are animating or
// the player has selected an action (e.g. attack)
const atbMap = {
  Active: [of(false)],
  Recommended: [animating$],
  Wait: [animating$, actioning$]
};

const clock$ = interval(0, animationFrameScheduler).pipe(
  withLatestFrom(paused$),
  // Don't emit if the game is paused
  filter(([_, paused]) => !paused),
  map(([clock, _]) => clock),
  share()
);

// Don't recognize clicks if we're paused
const clicks$ = fromEvent(document, "click").pipe(
  withLatestFrom(paused$),
  filter(([_, paused]) => !paused),
  map(([event, _]) => event.target)
);

const resize$ = fromEvent(window, "resize");
const pauseClick$ = fromEvent(pauseEl, "click");
const menuLinkClicks$ = clicks$.pipe(
  filter(el => el.classList.contains("menu-link")),
  pluck("dataset", "menuName")
  // withLatestFrom(currentHero$)
);

const characterStillSelected$ = currentHero$.pipe(mapTo(false));

const secondaryMenuBackClicks$ = fromEvent(secondaryMenuBackEls, "click").pipe(
  mapTo(false)
);

const menuLevels$ = merge(
  menuLinkClicks$,
  characterStillSelected$,
  secondaryMenuBackClicks$
);

const magicMenu$ = menuLevels$.pipe(filter(menu => menu === "magic"));
const itemMenu$ = menuLevels$.pipe(filter(menu => menu === "item"));
const noMenu$ = menuLevels$.pipe(filter(menu => !menu));

const heroMenuBackClicks$ = getClicksForElements$(heroMenuBackEls);

// Any element on which an action (e.g. attack, magic) can happen
const sinkClicks$ = clicks$.pipe(
  filter(el => el.classList.contains("sinkable"))
);

const actionSelected$ = action$.pipe(filter(action => !!action));
const actionUnselected$ = action$.pipe(filter(action => !action));

const atbMode$ = fromEvent(atbModeEls, "click").pipe(
  pluck("target", "dataset", "mode"),
  startWith(state.settings.atbMode)
);

const timerClock$ = clock$.pipe(
  withLatestFrom(atbMode$, (_, mode) => mode),
  switchMap(mode => combineLatest(atbMap[mode])),
  map(thingsToWaitOn => !thingsToWaitOn.some(m => m)),
  share()
);

const timers$ = state.heroes.map(hero => {
  return timerClock$.pipe(
    map(ticking => (ticking ? 0.3 : 0)),
    map(increase => Math.min(hero.wait + increase, 100))
  );
});

resize$.subscribe(resize);

noMenu$.subscribe(() => {
  hideMagicMenu();
});

magicMenu$.subscribe(() => {
  const hero = currentHero$.value;
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

state.heroes.forEach((_, i) => {
  const nameEl = heroNameEls[i];
  const spriteEl = heroSpriteEls[i];
  const hero = state.heroes[i];
  const timer$ = timers$[i];
  return getClicksForElements$([nameEl, spriteEl])
    .pipe(
      withLatestFrom(timer$, action$),
      filter(([_, timer, _2]) => timer === 100),
      filter(([_, _2, action]) => !action)
    )
    .subscribe(() => currentHero$.next(hero));
});

currentHero$.pipe(filter(hero => !!hero)).subscribe(hero => {
  const index = state.heroes.indexOf(hero);
  const { magic } = hero;
  const menu = magicMenuEls[index];
  fillMagicMenu(menu, magic);
  // Can't use magic that requires more MP than you have
  getAvailableActions(menu).forEach(row => {
    if (hero.magic[row.dataset.index].mpDrain > hero.mp) {
      unsetSelectable(row);
    }
  });
  highlightHero(index);
  showSecondaryMenu(index);
});

currentHero$.pipe(filter(hero => !hero)).subscribe(() => {
  unhighlightAllCharacters();
  hideSecondaryMenus();
});

heroMenuBackClicks$.subscribe(() => {
  currentHero$.next(null);
  action$.next(null);
});

clicks$
  .pipe(
    filter(el => el.classList.contains("selectable")),
    filter(el => el.classList.contains("action")),
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

const waitForSinkClick = input$ =>
  input$.pipe(
    switchMap(({ source, el }) =>
      sinkClicks$.pipe(
        takeUntil(actionUnselected$),
        take(1),
        map(sinkEl => ({ source, sink: characterFromElement(sinkEl), el }))
      )
    )
  );

const attack$ = actionSelected$.pipe(
  filter(({ action }) => action === "attack"),
  waitForSinkClick
);

const magic$ = actionSelected$.pipe(
  filter(({ action }) => action === "magic"),
  waitForSinkClick
);

const item$ = actionSelected$.pipe(
  filter(({ action }) => action === "item"),
  waitForSinkClick
);

attack$.subscribe(({ source, sink }) => {
  const attackDamage = source.attack;
  attack(source, sink, attackDamage);
  completeAction();
});

magic$.subscribe(({ source, sink, el }) => {
  const magicData = source.magic[el.dataset.index];
  magic(source, sink, magicData);
  completeAction();
});

function incrementTowardsValueFunction(object, key, maxKey) {
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

state.heroes.forEach((hero, i) => {
  // Update mp display
  const incrementHpValue = incrementTowardsValueFunction(hero, "mp", "maxMp");
  clock$.pipe(incrementHpValue).subscribe(val => {
    updateIfDifferent(mpEls[i], `${parseInt(val)}`);
  });

  // Update hp display
  const incrementMpValue = incrementTowardsValueFunction(hero, "hp", "maxHp");
  clock$.pipe(incrementMpValue).subscribe(val => {
    updateIfDifferent(hpEls[i], `${parseInt(val)} / ${state.heroes[i].maxHp}`);
  });

  // Check if hero is dead
  // const nameEl = heroNameEls[i];
  const spriteEl = heroSpriteEls[i];
  const clockAfterAnimations$ = clock$.pipe(
    withLatestFrom(animating$, (_, animating) => animating),
    filter(animating => !animating)
  );

  clockAfterAnimations$
    .pipe(filter(() => hero.hp <= 0))
    .subscribe(() => setDead(spriteEl));
  clockAfterAnimations$
    .pipe(filter(() => hero.hp > 0))
    .subscribe(() => unsetDead(spriteEl));
});

// Check if characters are dead
state.enemies.forEach((enemy, i) => {
  // Check if enemy is dead

  const clockAfterAnimations$ = clock$.pipe(
    withLatestFrom(animating$, (_, animating) => animating),
    filter(animating => !animating)
  );

  const spriteEl = enemySpriteEls[i];
  clockAfterAnimations$
    .pipe(filter(() => enemy.hp <= 0))
    .subscribe(() => setDead(spriteEl));
  clockAfterAnimations$
    .pipe(filter(() => enemy.hp > 0))
    .subscribe(() => unsetDead(spriteEl));
});

function completeAction() {
  action$.next(null);
  currentHero$.next(null);
}

timers$.forEach((timer$, i) => {
  const hero = state.heroes[i];
  timer$.subscribe(time => (hero.wait = time));
  timer$.pipe(filter(time => time === 100)).subscribe(() => setHeroReady(i));
  timer$.pipe(filter(time => time < 100)).subscribe(() => unsetHeroReady(i));
});

function getClicksForElements$(elements) {
  if (!Array.isArray(elements)) elements = [elements];
  return clicks$.pipe(filter(el => elements.includes(el)));
}

function magic(source, sink, data) {
  console.log(`${source.name} magics ${sink.name}...`);
  source.wait = 0;
  source.mp -= data.mpDrain;
  if (source.mp < 0) source.mp = 0;
  unhighlightEnemies();
  hideSecondaryMenus();
  const ball = generateMagicBall(data.color);
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.el);
  moveTop(ball, sourcePos.top);
  moveLeft(ball, sourcePos.left);
  const x = sinkPos.left - sourcePos.left;
  const y = sinkPos.top - sourcePos.top;

  const fadeIn$ = getTransitionEnd$(ball, "opacity", () =>
    setOpacity(ball, 1.0)
  );
  const toSink$ = getTransitionEnd$(ball, "transform", () =>
    setTranslate(ball, x, y)
  );
  const fadeOut$ = getTransitionEnd$(ball, "opacity", () => unsetOpacity(ball));
  const animation$ = concat(fadeIn$, toSink$, fadeOut$);
  animatingCount$.next(1);
  animation$.subscribe(null, null, () => {
    ball.remove();
    animatingCount$.next(-1);
  });
}

function attack(source, sink, damage) {
  console.log(`${source.name} attacks ${sink.name}...`);
  source.wait = 0;
  sink.hp = Math.max(sink.hp - damage, 0);
  unhighlightEnemies();
  hideSecondaryMenus();
  const sourcePos = getElementPosition(source.el);
  const sinkPos = getElementPosition(sink.el);
  const x = sinkPos.left - sourcePos.left;
  const y = sinkPos.top - sourcePos.top;

  const toSink$ = getTransitionEnd$(source.el, "transform", () =>
    setTranslate(source.el, x, y)
  );
  const fromSink$ = getTransitionEnd$(source.el, "transform", () =>
    unsetTranslate(source.el)
  );
  const animation$ = concat(toSink$, fromSink$);
  animatingCount$.next(1);
  animation$.subscribe(null, null, () => animatingCount$.next(-1));
}

function getTransitionEnd$(el, property, transform) {
  return new Observable(subscriber => {
    transform();
    fromEvent(el, "transitionend")
      .pipe(filter(event => event.propertyName === property))
      .subscribe(() => subscriber.complete(null));
  });
}

function draw() {
  requestAnimationFrame(draw);
  waitFillingEls.forEach((el, i) => updateWaitWidth(el, state.heroes[i].wait));
  heroNameEls.forEach((el, i) =>
    updateIfDifferent(el, `${state.heroes[i].name}`)
  );
  updateIfDifferent(selectedAtbEl, state.settings.atbMode);
}

setOpacity(document.body, 1.0);

requestAnimationFrame(draw);
resize();
