import { heroNameEls, heroSpriteEls, enemySpriteEls } from "./elements";

const magic1 = [
  { name: "Ice", damage: 10, mpDrain: 20, color: "blue" },
  { name: "Bolt", damage: 15, mpDrain: 30, color: "white" }
];

const magic2 = [{ name: "Fire", damage: 40, mpDrain: 35, color: "red" }];

const magic3 = [{ name: "Restore", damage: -20, mpDrain: 20, color: "green" }];

const hero1 = {
  name: "Wizard",
  el: heroSpriteEls[0],
  nameEl: heroNameEls[0],
  maxHp: 1500,
  hp: 1250,
  mp: 75,
  wait: 100,
  magic: magic1,
  items: ["Potion"]
};
const hero2 = {
  name: "Firefox",
  el: heroSpriteEls[1],
  nameEl: heroNameEls[1],
  maxHp: 600,
  hp: 475,
  mp: 200,
  wait: 100,
  magic: magic2,
  items: []
};
const hero3 = {
  name: "Warrior",
  el: heroSpriteEls[2],
  nameEl: heroNameEls[2],
  maxHp: 250,
  hp: 750,
  mp: 120,
  wait: 50,
  magic: magic3,
  items: ["Potion", "Potion"]
};

const enemy1 = {
  name: "Deathknight",
  el: enemySpriteEls[0],
  maxHp: 1500,
  hp: 1250,
  mp: 75,
  wait: 0,
  magic: ["Ice", "Bolt"],
  items: ["Potion"]
};
const enemy2 = {
  name: "Goblin",
  el: enemySpriteEls[1],
  maxHp: 600,
  hp: 475,
  mp: 200,
  wait: 0,
  magic: ["Fire"],
  items: []
};
const enemy3 = {
  name: "Skeleton",
  el: enemySpriteEls[2],
  maxHp: 250,
  hp: 750,
  mp: 120,
  wait: 90,
  magic: ["Restore"],
  items: ["Potion", "Potion"]
};

const settings = { atbMode: "Wait" };

const state = {
  heroes: [hero1, hero2, hero3],
  enemies: [enemy1, enemy2, enemy3],
  settings
};

export default state;
