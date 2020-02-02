const heroMenu = document.getElementById("hero-menu");
const magicMenu = document.getElementById("magic-menu");
const itemMenu = document.getElementById("item-menu");

const waitEls = Array(3)
  .fill()
  .map((_, i) => {
    return document
      .getElementById(`hero-${i}-stats`)
      .getElementsByClassName("progress-bar")[0];
  });

const waitFillingEls = Array(3)
  .fill()
  .map((_, i) => {
    return waitEls[i].getElementsByClassName("progress-bar-filling")[0];
  });

const heroNameEls = Array(3)
  .fill()
  .map((_, i) => {
    return document.getElementById(`hero-name-${i}`);
  });

const hpEls = Array(3)
  .fill()
  .map((_, i) => {
    return document
      .getElementById(`hero-${i}-stats`)
      .getElementsByClassName("hp")[0];
  });

const mpEls = Array(3)
  .fill()
  .map((_, i) => {
    return document
      .getElementById(`hero-${i}-stats`)
      .getElementsByClassName("mp")[0];
  });

const heroSpriteEls = Array(3)
  .fill()
  .map((_, i) => {
    return document
      .getElementById(`hero-${i}`)
      .getElementsByClassName("sprite")[0];
  });

const enemySpriteEls = Array(3)
  .fill()
  .map((_, i) => {
    return document
      .getElementById(`enemy-${i}`)
      .getElementsByClassName("sprite")[0];
  });

const heroMenuEls = Array(3)
  .fill()
  .map((_, i) => {
    const menu = heroMenu.cloneNode(true);
    menu.id = `hero-menu-${i}`;
    heroMenu.parentNode.insertBefore(menu, menu.nextSibling);
    return menu;
  });

const magicMenuEls = Array(3)
  .fill()
  .map((_, i) => {
    const menu = magicMenu.cloneNode(true);
    menu.id = `magic-menu-hero-${i}`;
    magicMenu.parentNode.insertBefore(menu, menu.nextSibling);
    return menu;
  });

const itemMenuEls = Array(3)
  .fill()
  .map((_, i) => {
    const menu = itemMenu.cloneNode(true);
    menu.id = `item-menu-hero-${i}`;
    itemMenu.parentNode.insertBefore(menu, menu.nextSibling);
    return menu;
  });

const secondaryMenuEls = [magicMenuEls, itemMenuEls].flat();

const secondaryMenuBackEls = secondaryMenuEls.map(
  el => el.getElementsByClassName("secondary-back")[0]
);

const heroMenuBackEls = heroMenuEls.map(
  el => el.getElementsByClassName("hero-back")[0]
);

const unpauseEl = document.getElementById("unpause");

const pauseEl = document.getElementById("pause");

const selectedAtbEl = document.getElementById("selected-atb");

const atbModeEls = document.getElementsByClassName("atb-mode");

const groundWrapperEl = document.getElementsByClassName("ground-wrapper")[0];

const groundEl = document.getElementsByClassName("ground")[0];

const spriteWrapperEls = document.getElementsByClassName("sprites");

const backgroundEl = document.getElementsByClassName("background")[0];

const battleEl = document.getElementsByClassName("top")[0];

function getAvailableActions() {
  return Array.from(document.getElementsByClassName("action"));
}

export {
  battleEl,
  pauseEl,
  unpauseEl,
  waitEls,
  waitFillingEls,
  heroNameEls,
  hpEls,
  mpEls,
  heroSpriteEls,
  enemySpriteEls,
  heroMenuEls,
  heroMenuBackEls,
  secondaryMenuEls,
  secondaryMenuBackEls,
  magicMenuEls,
  itemMenuEls,
  selectedAtbEl,
  atbModeEls,
  groundWrapperEl,
  groundEl,
  spriteWrapperEls,
  backgroundEl,
  getAvailableActions
};
