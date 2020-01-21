import { heroSpriteEls, enemySpriteEls } from "./elements";

const terra = { name: "Terra",  el: heroSpriteEls[0], maxHp: 1500, hp: 1250, mp: 75,  wait: 10, magic: ["Ice", "Bolt"], items: ["Potion"] };
const locke = { name: "Locke",  el: heroSpriteEls[1], maxHp: 600,  hp: 475,  mp: 200, wait: 100, magic: ["Fire"],        items: [] };
const celes = { name: "Celes",  el: heroSpriteEls[2], maxHp: 250,  hp: 750,  mp: 120, wait: 0,  magic: ["Restore"],     items: ["Potion", "Potion"] };

const wererat = { name: "Wererat", el: enemySpriteEls[0], maxHp: 1500, hp: 1250, mp: 75,  wait: 0, magic: ["Ice", "Bolt"], items: ["Potion"] };
const cactuar = { name: "Cactuar", el: enemySpriteEls[1], maxHp: 600,  hp: 475,  mp: 200, wait: 0, magic: ["Fire"],        items: [] };
const ultros  = { name: "Ultros",  el: enemySpriteEls[2], maxHp: 250,  hp: 750,  mp: 120, wait: 90,  magic: ["Restore"],   items: ["Potion", "Potion"] };

const state = { heroes: [terra, locke, celes], enemies: [wererat, cactuar, ultros] };

export default state;