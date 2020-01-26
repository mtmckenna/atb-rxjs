// Fix bug where clicking on name of hero during attack does stuff
// Can't select hero as sink when their bar isn't 100%

import {
    concat,
    fromEvent,
    interval,
    animationFrameScheduler,
    BehaviorSubject,
    Observable,
} from "rxjs";

import {
    filter,
    map,
    pluck,
    share,
    switchMap,
    tap,
    take,
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
    enemySpriteEls,
    secondaryMenuEls,
    secondaryMenuBackEls,
    pauseEl,
    unpauseEl,
    selectedAtbEl,
    atbModeEls,
} from "./elements";

import {
    setTranslate,
    unsetTranslate,
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
    unhighlightEnemies,
    unhighlightAllCharacters,
    resize,
    updateIfDifferent,
    updateWaitWidth,
    setAllCharactersAsSinkable,
    unsetAllCharactersAsSinkable
} from "./stylers";

import {
    isAction,
    characterFromElement,
    getElementPosition,
} from "./helpers";

import state from "./state";

const currentHero$ = new BehaviorSubject();
currentHero$.next(null);

const action$ = new BehaviorSubject();
action$.next(null);

const paused$ = new BehaviorSubject();
paused$.next(false);

const animating$ = new BehaviorSubject();
animating$.next(false);

// Map of ATB modes to a list of streams that can pause the timer from filling
// i.e. Active mode never stops, Recommended stops when the characters are 
// animating, and Wait stops when either the characters are animating or
// the player has selected an action (e.g. attack)
const atbMap = { Active: [], Recommended: [animating$], Wait: [animating$, action$] };

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
    map(([event, _]) => event)
);

const resize$ = fromEvent(window, "resize");
const pauseClick$ = fromEvent(pauseEl, "click");
const selectableClicks$ = clicks$.pipe(filter(event => event.target.classList.contains("selectable")));

// Any selectable element on which an action (e.g. attack, magic) can happen
const sinkClicks$ = selectableClicks$.pipe(filter(event => event.target.classList.contains("sinkable")));

// Any selectable element on which an action cannot happen
const nonSinkClicks$ = selectableClicks$.pipe(filter(event => !event.target.classList.contains("sinkable")));

// Current ATB mode
const atbMode$ = fromEvent(atbModeEls, "click").pipe(
    pluck("target", "dataset", "mode"),
    startWith(state.settings.atbMode)
);

const wait$ = clock$.pipe(
    withLatestFrom(atbMode$),
    // Emit true if any of the things in this ATB mode that can cause the timer to pause are truthy
    map(([_, mode]) => atbMap[mode].some(m => !!m.value)),
);

const timers$ = state.heroes.map(hero => {
    return clock$.pipe(
        withLatestFrom(wait$),
        // Add 0 to timer if we're waiting...
        map(([_, wait]) => wait ? 0 : .1),
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
    const timer$ = timers$[i]
    return clicksForElements$([el, spriteEl]).pipe(
        withLatestFrom(timer$, action$),
        filter(([_, timer, action]) => timer === 100 && !action)
    ).subscribe(() => currentHero$.next(hero));
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

clicks$.pipe(
    filter(event => event.target && event.target.classList.contains("action")),
    withLatestFrom(currentHero$),
    map(([event, hero]) => [event.target, hero]),
).subscribe(([el, hero]) => action$.next([el, hero]));

action$.pipe(filter(action => !!action)).subscribe(setAllCharactersAsSinkable);
action$.pipe(filter(action => !action)).subscribe(unsetAllCharactersAsSinkable);

const attack$ = action$.pipe(
    filter(action => !!action),
    filter(([el, _]) => isAction(el, "attack")),
    map(([_, hero]) => hero),
    switchMap(hero => sinkClicks$.pipe(take(1), map(event => [hero, event.target]), takeUntil(nonSinkClicks$))),
    map(([hero, el]) => ({ source: hero, sink: characterFromElement(el) }))
);

attack$.subscribe(({ source, sink }) => {
    attack(source, sink);
    action$.next(null);
    currentHero$.next(null);
});

timers$.forEach((timer$, i) => {
    const hero = state.heroes[i];
    timer$.subscribe(time => hero.wait = time);
    timer$.pipe(filter(time => time === 100)).subscribe(() => setHeroReady(i));
    timer$.pipe(filter(time => time <   100)).subscribe(() => unsetHeroReady(i));
});

function clicksForElements$(elements) {
    if (!Array.isArray(elements)) elements = [elements];
    return clicks$.pipe(filter(event => elements.includes(event.target)));
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
    animation$.subscribe(() => animating$.next(true), null, () => animating$.next(false));
}

function getTransform$(el, transform) {
    return new Observable(subscriber => {
        transform();
        subscriber.next(el);
        fromEvent(el, "transitionend")
        .pipe(filter(event => event.propertyName === "transform"))
        .subscribe(() => {
            subscriber.next(null);
            subscriber.complete(null);
        });
    });
}

function draw() {
    requestAnimationFrame(draw);
    waitFillingEls.forEach((el, i) => updateWaitWidth(el, state.heroes[i].wait));
    hpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].hp} / ${state.heroes[i].maxHp}`));
    mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].mp}`));
    heroNameEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].name}`));
    updateIfDifferent(selectedAtbEl, state.settings.atbMode);
}

requestAnimationFrame(draw);
resize();