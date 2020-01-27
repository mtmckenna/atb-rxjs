import state from "./state";

function isHero(el) {
    return el.classList.contains("hero");
}

function isAction(el, type) {
    return el.dataset.action === type;
}

function characterFromElement(el) {
    const index = el.dataset.id;
    const characters = isHero(el) ? state.heroes : state.enemies;
    return characters[index];
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