import {
    waitFillingEls,
    heroNameEls,
    hpEls,
    mpEls,
    heroSpriteEls,
    enemySpriteEls,
    secondaryMenuEls,
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
} from "./stylers";

import state from "./state";

const atbMap = { Active: [], Recommended: [getAnimating], Wait: [getAnimating, getAction] };

const battleState = {
    currentHero: null,
    paused: false,
    action: null,
    animating: false,
    timers: [],
};

document.addEventListener("click", clickHandler);
pauseEl.addEventListener("click", pause);

Array.from(atbModeEls).forEach(el => el.addEventListener("click", setAtbMode));

function clickHandler(event) {
    console.log("click", event);
}

state.heroes.forEach((_, i) => {
    const nameEl = heroNameEls[i];
    const spriteEl = heroSpriteEls[i];
    const hero = state.heroes[i];
    [nameEl, spriteEl].forEach(el => {
        el.addEventListener("click", () => selectHero(hero));
    });
});

function selectHero(hero) {
    console.log("select ", hero);
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
    return battleState.animating;
}

function getAction() {
    return battleState.action;
}

function updateTimers(increase) {
    state.heroes.forEach(hero => {
        hero.wait = Math.min(hero.wait + increase, 100)
    })
}

function update() {
    updateTimers(.2);
}

function draw() {
    if (!battleState.paused) update();
    requestAnimationFrame(draw);
    waitFillingEls.forEach((el, i) => updateWaitWidth(el, state.heroes[i].wait));
    hpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].hp} / ${state.heroes[i].maxHp}`));
    mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].mp}`));
    heroNameEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].name}`));
    updateIfDifferent(selectedAtbEl, state.settings.atbMode);
}

requestAnimationFrame(draw);
resize();