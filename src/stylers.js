import {
    enemySpriteEls,
    heroNameEls,
    heroSpriteEls,
    selectMenuEls,
    secondaryMenuEls
} from "./elements";

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

function highlightHero(heroIndex) {
    unhighlightHeroes();
    const el = heroNameEls[heroIndex];
    const spriteEl = heroSpriteEls[heroIndex];
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

function showSecondaryMenu(heroIndex) {
    hideSecondaryMenus();
    const el = secondaryMenuEls[heroIndex];
    unsetHide(el)
}

export {
    setTranslate,
    unsetTranslate,
    highlightHeroes,
    unhighlightHeroes,
    unhighlightAllCharacters,
    highlightHero,
    highlightEnemies,
    unhighlightEnemies,
    setHeroReady,
    unsetHeroReady,
    setSinkable,
    unsetSinkable,
    setSelectable,
    unsetSelectable,
    setSelected,
    unsetSelected,
    setHide,
    unsetHide,
    setShrink,
    unsetShrink,
    hideSecondaryMenus,
    showSecondaryMenu,
}