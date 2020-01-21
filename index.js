// Fix bug where clicking on name of hero during attack does stuff

import {
    fromEvent,
    interval,
    animationFrameScheduler,
    BehaviorSubject,
    zip,
} from "rxjs";

import {
    filter,
    map,
    share,
    switchMap,
    tap,
    take,
    takeUntil,
    withLatestFrom,
} from "rxjs/operators";

import {
    waitFillingEls,
    heroNameEls,
    hpEls,
    mpEls,
    heroSpriteEls,
    enemySpriteEls,
    secondaryMenuEls,
    selectMenuEls,
    pauseEl,
    unpauseEl
} from "./elements";

import state from "./state";

const currentHero$ = new BehaviorSubject();
currentHero$.next(null);

const action$ = new BehaviorSubject();
action$.next(null);

const pause$ = new BehaviorSubject();
pause$.next(false);

const clock$ = interval(0, animationFrameScheduler).pipe(
    withLatestFrom(pause$),
    filter(([_, paused]) => !paused),
    map(([clock, _]) => clock),
    share()
    );

const wait$ = clock$.pipe(
    withLatestFrom(action$),
    map(([_, action]) => action ? true : false),
);

const timers$ = state.heroes.map(hero => {
    return zip(clock$, wait$).pipe(
        filter(([_, wait]) => !wait),
        map(() => Math.min(hero.wait + .25, 100))
        );
});

const clicks$ = fromEvent(document, "click").pipe(
    withLatestFrom(pause$),
    filter(([_, paused]) => !paused),
    map(([event, _]) => event),
    share()
);

const pauseClick$ = fromEvent(pauseEl, "click").pipe(share());
const unpauseClick$ = pauseClick$.pipe(take(1), switchMap(() => fromEvent(unpauseEl, "click")));
const selectableClicks$ = clicks$.pipe(filter(event => event.target.classList.contains("selectable")));
const sinkClicks$ = selectableClicks$.pipe(filter(event => event.target.classList.contains("sinkable")));
const nonSinkClicks$ = selectableClicks$.pipe(filter(event => !event.target.classList.contains("sinkable")));

pauseClick$.subscribe(() => {
    pause$.next(true);
    setShrink(pauseEl);
    unsetShrink(unpauseEl);
});

unpauseClick$.subscribe(() => {
    pause$.next(false);
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
    highlightHero(hero);
    showSecondaryMenu(hero);
});

currentHero$.pipe(filter(hero => !hero)).subscribe(() => {
    unhighlightAllCharacters();
    hideSecondaryMenus();
});

clicksForElements$(secondaryMenuEls.map(el => el.getElementsByClassName("secondary-back")[0]))
.subscribe(() => {
    currentHero$.next(null);
    action$.next(null);
});

clicks$.pipe(
    filter(event => event.target && event.target.classList.contains("action")),
    withLatestFrom(currentHero$),
    map(([event, hero]) => [event.target, hero]),
).subscribe(([event, hero]) => action$.next([event, hero]));

const attack$ = action$.pipe(
    filter(action => !!action),
    filter(([el, _]) => isAction(el, "attack")),
    tap(([el, _]) => prepareAction(el)),
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
    timer$.subscribe(time => setTime(hero, time));
    timer$.pipe(filter(time => time === 100)).subscribe(() => setHeroReady(i));
    timer$.pipe(filter(time => time <   100)).subscribe(() => unsetHeroReady(i));
});

function clicksForElements$(elements) {
    if (!Array.isArray(elements)) elements = [elements];
    return clicks$.pipe(filter(event => elements.includes(event.target)));
}

function characterFromElement(el) {
    const characters = isHero(el) ? state.heroes : state.enemies;
    const characterEls = isHero(el) ? heroSpriteEls : enemySpriteEls;
    return characters[characterEls.indexOf(el)];
}

function setTime(hero, time) {
    hero.wait = time;
}

function prepareAction(el) {
    setSelected(el);
    highlightEnemies();
    highlightHeroes();
}

function isHero(el) {
    return el.classList.contains("hero");
}

function isAction(el, type) {
    return el.dataset.action === type;
}

function getElementPosition(el) {
    const pos = el.getBoundingClientRect();
    return { left: pos.left, top: pos.top };
}

function attack(source, sink) {
    console.log(`${source.name} attacks ${sink.name}...`);
    source.wait = 0;
    unhighlightHeroes();
    hideSecondaryMenus();
    const sourcePos = getElementPosition(source.el);
    const sinkPos = getElementPosition(sink.el);
    const x = sinkPos.left - sourcePos.left;
    const y = sinkPos.top - sourcePos.top;
    setTranslate(source.el, x, y);

    singleDoneTransformingStream$(source.el).pipe(
        tap(() => unsetTranslate(source.el)),
        switchMap(() => singleDoneTransformingStream$(source.el))
    ).subscribe();
}

function singleDoneTransformingStream$(el) {
    return fromEvent(el, "transitionend").pipe(filter((event) => event.propertyName === "transform"), take(1));
}

function setTranslate(el, left, top) {
    el.style.transform = `translate(${left}px, ${top}px)`;
}

function unsetTranslate(el) {
    el.style.transform = null;
}

function highlightHeroes() {
    const els = [heroNameEls, heroSpriteEls, secondaryMenuEls, selectMenuEls].flat();
    els.forEach(setSelectable);
    els.forEach(setSinkable);
}

function unhighlightHeroes() {
    const els = [heroNameEls, heroSpriteEls, secondaryMenuEls, selectMenuEls].flat();
    els.forEach(unsetSelectable);
    els.forEach(unsetSelected);
    els.forEach(unsetSinkable);
}

function unhighlightAllCharacters() {
    unhighlightHeroes();
    unhighlightEnemies();
}

function highlightHero(hero) {
    unhighlightHeroes();
    const el = heroNameEls[state.heroes.indexOf(hero)];
    const spriteEl = heroSpriteEls[state.heroes.indexOf(hero)];
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
    setSelectable(heroName);
    setSelectable(heroSprite);
}

function unsetHeroReady(heroIndex) {
    const heroName = heroNameEls[heroIndex];
    const heroSprite = heroSpriteEls[heroIndex];
    unsetSelectable(heroName);
    unsetSelectable(heroSprite);
}

function unsetSinkable(element) {
    element.classList.remove("sinkable");
}

function setSinkable(element) {
    element.classList.add("sinkable");
}

function setSelected(element) {
    element.classList.add("selected");
}

function unsetSelected(element) {
    element.classList.remove("selected");
    const children = Array.from(element.getElementsByClassName("selected"));
    children.forEach((el) => el.classList.remove("selected"));
}

function setSelectable(element) {
    element.classList.add("selectable");
}

function unsetSelectable(element) {
    element.classList.remove("selectable");
}

function setHide(element) {
    element.classList.add("hide");    
}

function unsetHide(element) {
    element.classList.remove("hide");    
}

function setShrink(element) {
    element.classList.add("shrink");    
}

function unsetShrink(element) {
    element.classList.remove("shrink");    
}

function hideSecondaryMenus() {
    secondaryMenuEls.forEach((el) => {
        setHide(el);
    });
}

function showSecondaryMenu(hero) {
    hideSecondaryMenus();
    const el = secondaryMenuEls[state.heroes.indexOf(hero)];
    unsetHide(el)
}

function draw() {
    requestAnimationFrame(draw);
    waitFillingEls.forEach((el, i) => updateWaitWidth(el, state.heroes[i].wait));
    hpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].hp} / ${state.heroes[i].maxHp}`));
    mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].mp}`));
    heroSpriteEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].name}`));
    heroNameEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].name}`));
    enemySpriteEls.forEach((el, i) => updateIfDifferent(el, `${state.enemies[i].name}`));
}

function updateWaitWidth(el, percentage) {
    if (parseInt(el.style.width) !== percentage) {
        el.style.width = `${percentage}%`;
    }
}

function updateIfDifferent(element, value) {
    if (element.textContent !== value) {
        element.textContent = value;
    }
}

requestAnimationFrame(draw)
