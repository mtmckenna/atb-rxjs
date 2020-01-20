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

export {
    waitEls,
    waitFillingEls,
    heroNameEls,
    hpEls,
    mpEls,
    heroSpriteEls,
    enemySpriteEls,
    secondaryMenuEls,
    selectMenuEls
};