import {
    fromEvent,
    interval,
    animationFrameScheduler,
    BehaviorSubject,
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

const state = {
    heroes: [
        { name: "Terra",  maxHp: 1500, hp: 1250, mp: 75,  wait: 10, magic: ["Ice", "Bolt"], items: ["Potion"] },
        { name: "Locke",  maxHp: 600,  hp: 475,  mp: 200, wait: 90, magic: ["Fire"],        items: [] },
        { name: "Celes",  maxHp: 250,  hp: 750,  mp: 120, wait: 0,  magic: ["Restore"],     items: ["Potion", "Potion"] }
    ],
    enemies: [
        { name: "Wererat", maxHp: 1500, hp: 1250, mp: 75,  wait: 0, magic: ["Ice", "Bolt"], items: ["Potion"] },
        { name: "Cactuar", maxHp: 600,  hp: 475,  mp: 200, wait: 0, magic: ["Fire"],        items: [] },
        { name: "Ultros",  maxHp: 250,  hp: 750,  mp: 120, wait: 90,  magic: ["Restore"],   items: ["Potion", "Potion"] }
    ]
};

const secondaryMenu = document.getElementById("secondary-menu");
const selectMenu = document.getElementById("select-menu");

const waitEls = Array(3).fill().map((_, i) => {
    return document
        .getElementById(`hero-${i}-stats`)
        .getElementsByClassName("progress-bar")[0];
});

const waitFillingEls = Array(3).fill().map((_, i) => {
    return waitEls[i].getElementsByClassName("progress-bar-filling")[0];
});

const heroNameEls = Array(3).fill().map((_, i) => {
    return document.getElementById(`hero-name-${i}`);
});

const hpEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`hero-${i}-stats`)
    .getElementsByClassName("hp")[0];
});

const mpEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`hero-${i}-stats`)
    .getElementsByClassName("mp")[0];
});

const heroSpriteEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`hero-${i}`)
    .getElementsByClassName("sprite")[0];
});

const enemySpriteEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`enemy-${i}`)
    .getElementsByClassName("sprite")[0];
});

const secondaryMenuEls = Array(3).fill().map((_, i) => {
    const menu = secondaryMenu.cloneNode(true);
    menu.id = `secondary-menu-hero-${i}`;
    secondaryMenu.parentNode.insertBefore(menu, menu.nextSibling);
    return menu;
});

const selectMenuEls = Array(3).fill().map((_, i) => {
    const menu = selectMenu.cloneNode(true);
    menu.id = `select-menu-hero-${i}`;
    selectMenu.parentNode.insertBefore(menu, menu.nextSibling);
    return menu;
});

const clock$ = interval(0, animationFrameScheduler).pipe(share());

const waits$ = Array(3).fill().map((_, i) => {
    const hero = state.heroes[i];
    return clock$.pipe(map(() => Math.min(hero.wait + .25, 100)), share());
});

const currentHero$ = new BehaviorSubject();
currentHero$.next(null);

const action$ = new BehaviorSubject();
action$.next(null);

Array(3).fill().map((_, i) => {
    const el = heroNameEls[i];
    const spriteEl = heroSpriteEls[i];
    const hero = state.heroes[i];
    const wait$ = waits$[i]
    return fromEvent([el, spriteEl], "click").pipe(
        withLatestFrom(wait$, action$),
        filter(([_, wait, action]) => wait === 100 && !action),
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

fromEvent(secondaryMenuEls.map(el => el.getElementsByClassName("secondary-back")[0]), "click")
.subscribe(() => {
    currentHero$.next(null);
    action$.next(null);
});

fromEvent(document, "click").pipe(
    filter(event => event.target.classList.contains("action")),
    withLatestFrom(currentHero$),
    map(([event, hero]) => [event.target, hero]),
).subscribe(([event, hero]) => action$.next([event, hero]));

const selectableClicks$ = fromEvent(document, "click").pipe(filter(event => event.target.classList.contains("selectable")));
const sinkClicks$ = selectableClicks$.pipe(filter(event => event.target.classList.contains("sinkable")));
const nonSinkClicks$ = selectableClicks$.pipe(filter(event => !event.target.classList.contains("sinkable")));

const attack$ = action$.pipe(
    filter(action => !!action),
    filter(([el, _]) => isAction(el, "attack")),
    tap(([el, _]) => prepareAction(el)),
    map(([_, hero]) => hero),
    switchMap(hero => sinkClicks$.pipe(take(1), map((event) => [hero, event.target]), takeUntil(nonSinkClicks$))),
    map(([hero, el]) => ({ source: hero, sink: characterFromElement(el) }))
);

attack$.subscribe(({ source, sink }) => {
    attack(source, sink);
    action$.next(null);
    currentHero$.next(null);
});

waits$.forEach((wait$, i) => {
    const hero = state.heroes[i];
    wait$.subscribe(time => setTime(hero, time));
    wait$.pipe(filter(time => time === 100)).subscribe(() => setHeroReady(i));
    wait$.pipe(filter(time => time <   100)).subscribe(() => unsetHeroReady(i));
});

function characterFromElement(el) {
    const characters = isHero(el) ? state.heroes : state.enemies;
    const characterEls = isHero(el) ? heroSpriteEls : enemySpriteEls;
    return characters[characterEls.indexOf(el)];
}

function isHero(el) {
    return el.classList.contains("hero");
}

function setTime(hero, time) {
    hero.wait = time;
}

function prepareAction(el) {
    setSelected(el);
    highlightEnemies();
    highlightHeroes();
}

function isAction(el, type) {
    return el.dataset.action === type;
}

function attack(source, sink) {
    console.log(`${source.name} attacks ${sink.name}...`);
    source.wait = 0;
    unhighlightHeroes();
    hideSecondaryMenus();
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

function hideSecondaryMenus() {
    secondaryMenuEls.forEach((el) => {
        el.classList.remove("show");
        el.classList.add("hide");    
    });
}

function showSecondaryMenu(hero) {
    hideSecondaryMenus();
    const el = secondaryMenuEls[state.heroes.indexOf(hero)];
    el.classList.remove("hide");
    el.classList.add("show");
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
