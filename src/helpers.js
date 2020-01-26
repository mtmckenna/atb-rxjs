import state from "./state";
import { enemySpriteEls, heroSpriteEls } from "./elements";

function isHero(el) {
    return el.classList.contains("hero");
}

function isAction(el, type) {
    return el.dataset.action === type;
}

function characterFromElement(el) {
    const characters = isHero(el) ? state.heroes : state.enemies;
    const characterEls = isHero(el) ? heroSpriteEls : enemySpriteEls;
    return characters[characterEls.indexOf(el)];
}

function getElementPosition(el) {
    const pos = el.getBoundingClientRect();
    return { left: pos.left, top: pos.top };
}

export {
    isHero,
    isAction,
    characterFromElement,
    getElementPosition,
}