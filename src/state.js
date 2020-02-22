import { heroNameEls, heroSpriteEls, enemySpriteEls } from "./elements";

const magic1 = [
  { name: "Ice", damage: 10, mpDrain: 20, color: "blue" },
  { name: "Bolt", damage: 15, mpDrain: 30, color: "white" }
];

const magic2 = [{ name: "Fire", damage: 40, mpDrain: 35, color: "red" }];

const magic3 = [{ name: "Restore", damage: -20, mpDrain: 20, color: "green" }];

const potion = { name: "Potion", effect: c => (c.hp = Math.min(c.maxHp, c.hp + 150)) };
const ether = { name: "Ether", effect: c => (c.mp = Math.min(c.maxMp, c.mp + 100)) };

const hero1 = {
  name: "Wizard",
  el: heroSpriteEls[0],
  nameEl: heroNameEls[0],
  attack: 200,
  maxHp: 1500,
  maxMp: 100,
  hp: 200,
  mp: 25,
  wait: 100,
  magic: magic1,
  items: [potion, ether]
};
const hero2 = {
  name: "Firefox",
  el: heroSpriteEls[1],
  nameEl: heroNameEls[1],
  attack: 300,
  maxHp: 600,
  maxMp: 300,
  hp: 200,
  mp: 200,
  wait: 100,
  magic: magic2,
  items: [ether]
};
const hero3 = {
  name: "Warrior",
  el: heroSpriteEls[2],
  nameEl: heroNameEls[2],
  attack: 400,
  maxHp: 250,
  maxMp: 130,
  hp: 150,
  mp: 120,
  wait: 50,
  magic: magic3,
  items: [potion, potion]
};

const enemy1 = {
  name: "Deathknight",
  el: enemySpriteEls[0],
  attack: 40,
  maxHp: 1500,
  hp: 10,
  mp: 75,
  wait: 80,
  magic: magic1,
  items: [potion]
};
const enemy2 = {
  name: "Goblin",
  el: enemySpriteEls[1],
  attack: 25,
  maxHp: 30,
  hp: 20,
  mp: 200,
  wait: 80,
  magic: magic2,
  items: [ether]
};
const enemy3 = {
  name: "Skeleton",
  el: enemySpriteEls[2],
  attack: 50,
  maxHp: 250,
  hp: 20,
  mp: 120,
  wait: 80,
  magic: magic3,
  items: [potion, potion]
};

const settings = { atbMode: "Recommended" };

const state = {
  heroes: [hero1, hero2, hero3],
  enemies: [enemy1, enemy2, enemy3],
  settings
};

export default state;
