import {
    enemySpriteEls,
    heroNameEls,
    heroSpriteEls,
    selectMenuEls,
    secondaryMenuEls,
    groundWrapperEl,
    groundEl,
    spriteWrapperEls,
    backgroundEl
} from "./elements";

function setTranslate(el, left, top) {
    el.style.transform = `translate(${left}px, ${top}px)`;
}

function unsetTranslate(el) {
    el.style.transform = null;
}

function setAllCharactersAsSinkable() {
    const els = [heroNameEls, heroSpriteEls, enemySpriteEls].flat();
    els.forEach(setSelectable);    
    els.forEach(setSinkable);    
}

function unsetAllCharactersAsSinkable() {
    const els = [heroNameEls, heroSpriteEls, enemySpriteEls].flat();
    els.forEach(unsetSelectable);    
    els.forEach(unsetSinkable);    
}

// Do I need menus to ne selectable here?
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

function unhighlightHero(heroIndex) {
    const els = [heroSpriteEls[heroIndex], heroNameEls[heroIndex]];
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

function setReady(el) {
    el.classList.add("ready");
}

function unsetReady(el) {
    el.classList.remove("ready");
}

function setHeroReady(heroIndex) {
    const heroName = heroNameEls[heroIndex];
    const heroSprite = heroSpriteEls[heroIndex];
    [heroName, heroSprite].forEach(el => {
        setSelectable(el);
        setReady(el);
    });
}

function unsetHeroReady(heroIndex) {
    const heroName = heroNameEls[heroIndex];
    const heroSprite = heroSpriteEls[heroIndex];
    [heroName, heroSprite].forEach(el => {
        unsetSelectable(el);
        unsetReady(el);
    });
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
    unsetHide(el);
}

function moveTop(el, amount) {
    el.style.top = `${amount}px`;
}

function setHeight(el, height) {
    el.style.height = `${height}px`;
}

function setBackgroundImage(el, img) {
    el.style.backgroundImage = img;
}

function resize() {
    const groundSize = groundWrapperEl.getBoundingClientRect();
    const { height } = groundSize;
    const cosx = Math.cos(deg2rad(45));
    const rotatedGroundHeight = height * cosx;
    const groundOffset = height - rotatedGroundHeight;
    moveTop(groundEl, groundOffset / 2);
    Array.from(spriteWrapperEls).forEach((el) => setHeight(el, rotatedGroundHeight));
    setHeight(backgroundEl, groundOffset);
}

function deg2rad(degrees) {
    return degrees * Math.PI / 180;
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

export {
    setTranslate,
    unsetTranslate,
    highlightHeroes,
    unhighlightHero,
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
    setAllCharactersAsSinkable,
    unsetAllCharactersAsSinkable,
    setHide,
    unsetHide,
    setShrink,
    unsetShrink,
    hideSecondaryMenus,
    showSecondaryMenu,
    moveTop,
    setHeight,
    setBackgroundImage,
    resize,
    updateIfDifferent,
    updateWaitWidth,
}