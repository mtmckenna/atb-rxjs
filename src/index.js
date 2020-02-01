// Add items
// HP lowers on attack
// MP lowers on magic
// HP/MP text animates
// Enemies attack
// Can win

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
  secondaryMenuEls
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
  unsetOpacity
} from "./stylers";

import { characterFromElement, getElementPosition } from "./helpers";

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
  pluck("dataset", "menuName"),
  withLatestFrom(currentHero$)
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
    map(ticking => (ticking ? 0.1 : 0)),
    map(increase => Math.min(hero.wait + increase, 100))
  );
});

resize$.subscribe(resize);

menuLevels$.subscribe(menu => {
  action$.next(null);

  if (menu) {
    showMagicMenu(state.heroes.indexOf(currentHero$.value));
  } else {
    hideMagicMenu();
  }
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
  const el = heroNameEls[i];
  const spriteEl = heroSpriteEls[i];
  const hero = state.heroes[i];
  const timer$ = timers$[i];
  return getClicksForElements$([el, spriteEl])
    .pipe(
      withLatestFrom(timer$, action$),
      filter(([_, timer, action]) => timer === 100 && !action)
    )
    .subscribe(() => currentHero$.next(hero));
});

currentHero$.pipe(filter(hero => !!hero)).subscribe(hero => {
  const index = state.heroes.indexOf(hero);
  const { magic } = hero;
  const menu = magicMenuEls[index];
  fillMagicMenu(menu, magic);
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
    filter(el => el.classList.contains("action")),
    withLatestFrom(currentHero$)
  )
  .subscribe(([el, hero]) => {
    const action = el.dataset.action;
    return action$.next({ source: hero, action, el });
  });

action$.pipe(filter(action => !!action)).subscribe(({ el }) => {
  setAllCharactersAsSinkable();
  setSelected(el);
});

actionUnselected$.subscribe(() => {
  heroMenuEls.forEach(unsetSelected);
  unsetAllCharactersAsSinkable();
});

const waitForSinkClick = input$ =>
  input$.pipe(
    switchMap(({ source }) =>
      sinkClicks$.pipe(
        takeUntil(actionUnselected$),
        take(1),
        map(el => ({ source, sink: characterFromElement(el) }))
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
  attack(source, sink);
  completeAction();
});

magic$.subscribe(({ source, sink }) => {
  magic(source, sink);
  completeAction();
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

function magic(source, sink) {
  console.log(`${source.name} magics ${sink.name}...`);
  source.wait = 0;
  unhighlightEnemies();
  hideSecondaryMenus();
  const ball = generateMagicBall("blue");
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
  animation$.subscribe(null, null, () => animatingCount$.next(-1));
}

function attack(source, sink) {
  console.log(`${source.name} attacks ${sink.name}...`);
  source.wait = 0;
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
  hpEls.forEach((el, i) =>
    updateIfDifferent(el, `${state.heroes[i].hp} / ${state.heroes[i].maxHp}`)
  );
  mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].mp}`));
  heroNameEls.forEach((el, i) =>
    updateIfDifferent(el, `${state.heroes[i].name}`)
  );
  updateIfDifferent(selectedAtbEl, state.settings.atbMode);
}

requestAnimationFrame(draw);
resize();
