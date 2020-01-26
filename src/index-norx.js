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

import {
    isAction,
    characterFromElement,
    getElementPosition,
} from "./helpers";

import state from "./state";

const atbMap = { Active: [], Recommended: [getAnimating], Wait: [getAnimating, getAction] };

const battleState = {
    currentHero: null,
    paused: false,
    action: null,
    animating: false,
    heroes: [],
    enemies: [],
    timers: [],
};

window.addEventListener("resize", resize);
document.addEventListener("click", clickHandler);
pauseEl.addEventListener("click", pause);
Array.from(atbModeEls).forEach(el => el.addEventListener("click", setAtbMode));

function clickHandler(event) {
    const el = event.target;
    if (!el) return;
    if (battleState.paused) return;

    if (el.classList.contains("action")) {
        if (isAction(el, "attack")) {
            battleState.action = "attack";
            prepareAttack(el);
        }
    }

    if (el.classList.contains("sinkable")) performAction(el);
    if (el.classList.contains("secondary-back")) goBackToBattle();
}

function goBackToBattle() {
    battleState.currentHero = null;
    battleState.action = null;
    unhighlightAllCharacters();
    hideSecondaryMenus();
}

function prepareAttack(el) {
    setSelected(el);
    highlightEnemies();
    highlightHeroes();
}

state.heroes.forEach((_, i) => {
    const nameEl = heroNameEls[i];
    const spriteEl = heroSpriteEls[i];
    const hero = state.heroes[i];
    [nameEl, spriteEl].forEach(el => el.addEventListener("click", () => selectHero(hero)));
});

function performAction(el) {
    const sink = characterFromElement(el);
    if (battleState.action === "attack") {
        attack(battleState.currentHero, sink);
    }

    battleState.action = null;
    battleState.currentHero = null;
}

function selectHero(hero) {
    if (hero.wait < 100) return;
    const index = state.heroes.indexOf(hero);
    battleState.currentHero = hero;
    highlightHero(index);
    showSecondaryMenu(index);
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

function attack(source, sink) {
    console.log(`${battleState.currentHero.name} attacks ${sink.name}...`);
    source.wait = 0;
    unhighlightAllCharacters();
    hideSecondaryMenus();
    const sourcePos = getElementPosition(source.el);
    const sinkPos = getElementPosition(sink.el);
    const x = sinkPos.left - sourcePos.left;
    const y = sinkPos.top - sourcePos.top;
    
    setTranslate(source.el, x, y);
    source.el.addEventListener("transitionend", translateCallback);

    function translateCallback(event) {
        if (event.propertyName !== "transform") return;
        const updatedPos = getElementPosition(source.el);
        
        if (updatedPos.left === sourcePos.left && updatedPos.top === sourcePos.top) {
            source.el.removeEventListener("transitionend", translateCallback);
            return;
        }

        unsetTranslate(source.el);
    }
}

function updateTimers(increase) {
    state.heroes.forEach(hero => {
        hero.wait = Math.min(hero.wait + increase, 100)
    })
}

function wait() {
    return atbMap[state.settings.atbMode].some(shouldWait => !!shouldWait());
}

function update() {
    const timeIncrease = wait() ? 0 : .1;
    updateTimers(timeIncrease);
    state.heroes.forEach((hero, i) => {
        if (hero.wait < 100) {
            unsetHeroReady(i);
        } else {
            setHeroReady(i);
        }
    });
}

function draw() {
    requestAnimationFrame(draw);
    if (battleState.paused) return;
    update();
    waitFillingEls.forEach((el, i) => updateWaitWidth(el, state.heroes[i].wait));
    hpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].hp} / ${state.heroes[i].maxHp}`));
    mpEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].mp}`));
    heroNameEls.forEach((el, i) => updateIfDifferent(el, `${state.heroes[i].name}`));
    updateIfDifferent(selectedAtbEl, state.settings.atbMode);
}

function config() {
    state.heroes.forEach((_, i) => {
        battleState.heroes[i] = { animating: false };
    });

    state.enemies.forEach((_, i) => {
        battleState.heroes[i] = { animating: false };
    });
}

config();
requestAnimationFrame(draw);
resize();