import {
  concat,
  fromEvent,
  interval,
  animationFrameScheduler,
  BehaviorSubject,
  Observable
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
} from "rxjs/operators";

import {
  waitFillingEls,
  heroNameEls,
  hpEls,
  mpEls,
  heroSpriteEls,
  secondaryMenuBackEls,
  pauseEl,
  unpauseEl,
  selectedAtbEl,
  atbModeEls
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
  unsetAllCharactersAsSinkable
} from "./stylers";

import { characterFromElement, getElementPosition } from "./helpers";

import state from "./state";

const currentHero$ = new BehaviorSubject();
currentHero$.next(null);

const action$ = new BehaviorSubject();
action$.next(null);

const paused$ = new BehaviorSubject();
paused$.next(false);

const animatingCount$ = new BehaviorSubject().pipe(
  scan((acc, val) => acc + val, 0)
);
animatingCount$.next(0);

const animating$ = animatingCount$.pipe(map(count => count > 0));

// Map of ATB modes to a list of streams that can pause the timer from filling
// i.e. Active mode never stops, Recommended stops when the characters are
// animating, and Wait stops when either the characters are animating or
// the player has selected an action (e.g. attack)
const atbMap = {
  Active: [],
  Recommended: [animating$],
  Wait: [animating$, action$]
};

const clock$ = interval(0, animationFrameScheduler).pipe(
  withLatestFrom(paused$),
  // Don't emit if the game is paused
  filter(([_, paused]) => !paused),
  map(([clock, _]) => clock),
  share()
);

const clicks$ = fromEvent(document, "click").pipe(
  withLatestFrom(paused$),
  filter(([_, paused]) => !paused),
  map(([event, _]) => event.target)
);

const resize$ = fromEvent(window, "resize");
const pauseClick$ = fromEvent(pauseEl, "click");

// Any element on which an action (e.g. attack, magic) can happen
const sinkClicks$ = clicks$.pipe(
  filter(el => el.classList.contains("sinkable"))
);

const actionSelected$ = action$.pipe(filter(action => !!action));
const actionUnselected$ = action$.pipe(filter(action => !action));

// Current ATB mode
const atbMode$ = fromEvent(atbModeEls, "click").pipe(
  pluck("target", "dataset", "mode"),
  startWith(state.settings.atbMode)
);

const wait$ = clock$.pipe(
  withLatestFrom(atbMode$),
  // Emit true if any of the things in this ATB mode that can cause the timer to pause are truthy
  map(([_, mode]) => atbMap[mode].some(m => !!m.value))
);

const timers$ = state.heroes.map(hero => {
  return clock$.pipe(
    withLatestFrom(wait$),
    // Add 0 to timer if we're waiting...
    map(([_, wait]) => (wait ? 0 : 0.3)),
    map(increase => Math.min(hero.wait + increase, 100))
  );
});

resize$.subscribe(resize);

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
  return clicksForElements$([el, spriteEl])
    .pipe(
      withLatestFrom(timer$, action$),
      filter(([_, timer, action]) => timer === 100 && !action)
    )
    .subscribe(() => currentHero$.next(hero));
});

currentHero$.pipe(filter(hero => !!hero)).subscribe(hero => {
  const index = state.heroes.indexOf(hero);
  highlightHero(index);
  showSecondaryMenu(index);
});

currentHero$.pipe(filter(hero => !hero)).subscribe(() => {
  unhighlightAllCharacters();
  hideSecondaryMenus();
});

clicksForElements$(secondaryMenuBackEls).subscribe(() => {
  currentHero$.next(null);
  action$.next(null);
});

clicks$
  .pipe(
    filter(el => el.classList.contains("action")),
    withLatestFrom(currentHero$)
  )
  .subscribe(([el, hero]) =>
    action$.next({ source: hero, action: "attack", el })
  );

action$.pipe(filter(action => !!action)).subscribe(({ el }) => {
  setAllCharactersAsSinkable();
  setSelected(el);
});

actionUnselected$.subscribe(unsetAllCharactersAsSinkable);

const attack$ = actionSelected$.pipe(
  switchMap(({ source }) =>
    sinkClicks$.pipe(
      takeUntil(actionUnselected$),
      take(1),
      map(el => ({ source, el }))
    )
  ),
  map(({ source, el }) => ({ source, sink: characterFromElement(el) }))
);

attack$.subscribe(({ source, sink }) => {
  attack(source, sink);
  action$.next(null);
  currentHero$.next(null);
});

timers$.forEach((timer$, i) => {
  const hero = state.heroes[i];
  timer$.subscribe(time => (hero.wait = time));
  timer$.pipe(filter(time => time === 100)).subscribe(() => setHeroReady(i));
  timer$.pipe(filter(time => time < 100)).subscribe(() => unsetHeroReady(i));
});

function clicksForElements$(elements) {
  if (!Array.isArray(elements)) elements = [elements];
  return clicks$.pipe(filter(el => elements.includes(el)));
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

  const toSink$ = getTransform$(source.el, () => setTranslate(source.el, x, y));
  const fromSink$ = getTransform$(source.el, () => unsetTranslate(source.el));
  const animation$ = concat(toSink$, fromSink$);
  animating$.next(1);
  animation$.subscribe(null, null, () => animating$.next(-1));
}

function getTransform$(el, transform) {
  return new Observable(subscriber => {
    transform();
    fromEvent(el, "transitionend")
      .pipe(filter(event => event.propertyName === "transform"))
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
