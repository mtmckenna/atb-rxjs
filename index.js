import {
    fromEvent,
    interval,
    animationFrameScheduler,
    Subject,
} from "rxjs";

import {
    filter,
    map,
    share,
    switchMap,
    tap,
    withLatestFrom,
} from "rxjs/operators";

const state = {
    heros: [
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

// Add to the wait timer
const waits$ = Array(3).fill().map((_, i) => {
    const hero = state.heros[i];
    return clock$.pipe(map(() => Math.min(hero.wait + .25, 100)));
});

const selectedHero$ = new Subject();
selectedHero$.next(null);

const heroClick$ = Array(3).fill().map((_, i) => {
    const el = heroNameEls[i];
    const spriteEl = heroSpriteEls[i];
    const hero = state.heros[i];
    const wait$ = waits$[i]
    return fromEvent([el, spriteEl], "click").pipe(
        withLatestFrom(wait$),
        filter(([_, wait]) => wait === 100),
        tap(() => selectedHero$.next(hero))
    ).subscribe();
});

selectedHero$.pipe(filter(hero => !!hero), tap(selectHero),    tap(showSecondaryMenu)).subscribe();
selectedHero$.pipe(filter(hero => !hero),  tap(unselectHeros), tap(hideSecondaryMenus)).subscribe();

fromEvent(secondaryMenuEls.map(el => el.getElementsByClassName("secondary-back")[0]), "click")
.pipe(tap(() => selectedHero$.next(null))).subscribe();

const action$ = fromEvent(document, "click").pipe(
    filter(event => event.target.classList.contains("action")),
    withLatestFrom(selectedHero$),
    map(([event, hero]) => [event.target, hero])
);

const sinkClicks$ = fromEvent(document, "click").pipe(filter(event => event.target.classList.contains("selectable")));

const attack$ = action$.pipe(
    filter(([el, _]) => isAction(el, "attack")),
    tap(([el, _]) => prepareAction(el)),
    map(([_, hero]) => hero),
    switchMap(hero => sinkClicks$.pipe(map((event) => [hero, event]))),
    map(([hero, event]) => ({ source: hero, sink: state.enemies[enemySpriteEls.indexOf(event.target)] }))
);

attack$.subscribe(({ source, sink }) => {
    attack(source, sink);
});

// hero name is no longer grayed out when timer is full
waits$.map((wait$, i) =>{
    return wait$.subscribe((timer) => {
        setReady(heroNameEls[i], timer === 100);
        setReady(heroSpriteEls[i], timer === 100);
        state.heros[i].wait = timer;
    });
})

function prepareAction(el) {
    setSelected(el, true);
    highlightEnemies();
}

function isAction(el, type) {
    return el.dataset.action === type;
}

function attack(source, sink) {
    console.log(`${source.name} attacks ${sink.name}...`);
    source.wait = 0;
    unselectHeros();
    hideSecondaryMenus();
}

function unselectHeros() {
    const els = [heroNameEls, heroSpriteEls, secondaryMenuEls, selectMenuEls].flat();
    els.forEach(el=> setSelected(el, false));
    unhighlightEnemies();
}

function selectHero(hero) {
    unselectHeros();
    const el = heroNameEls[state.heros.indexOf(hero)];
    const spriteEl = heroSpriteEls[state.heros.indexOf(hero)];
    setSelected(el, true);
    setSelected(spriteEl, true);
}

function highlightEnemies() {
    enemySpriteEls.forEach((el) => setSelectable(el, true))
}

function unhighlightEnemies() {
    enemySpriteEls.forEach((el) => setSelectable(el, false))
}

function setReady(element, isReady) {
    if (isReady) {
        element.classList.add("ready");
    } else {
        element.classList.remove("ready");
    }
}

function setSelected(element, isSelected) {
    if (isSelected) {
        element.classList.add("selected");
    } else {
        element.classList.remove("selected");
        const children = Array.from(element.getElementsByClassName("selected"));
        children.forEach((el) => el.classList.remove("selected"));
    }   
}

function setSelectable(element, isSelectable) {
    if (isSelectable) {
        element.classList.add("selectable");
    } else {
        element.classList.remove("selectable");
    }   
}

function hideSecondaryMenus() {
    secondaryMenuEls.forEach((el) => {
        el.classList.remove("show");
        el.classList.add("hide");    
    });
}

function showSecondaryMenu(hero) {
    hideSecondaryMenus();
    const el = secondaryMenuEls[state.heros.indexOf(hero)];
    el.classList.remove("hide");
    el.classList.add("show");
}

function draw() {
    requestAnimationFrame(draw);
    waitFillingEls.forEach((el, i) => el.style.width = `${state.heros[i].wait}%`);
    hpEls.forEach((el, i) => updateIfDifferent(el, `${state.heros[i].hp} / ${state.heros[i].maxHp}`));
    mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heros[i].mp}`));
    heroSpriteEls.forEach((el, i) => updateIfDifferent(el, `${state.heros[i].name}`));
    heroNameEls.forEach((el, i) => updateIfDifferent(el, `${state.heros[i].name}`));
    enemySpriteEls.forEach((el, i) => updateIfDifferent(el, `${state.enemies[i].name}`));
}

function updateIfDifferent(element, value) {
    if (element.textContent !== value) {
        element.textContent = value;
    }
}

requestAnimationFrame(draw)
