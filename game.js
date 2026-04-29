const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  wave: document.querySelector("#wave"),
  enemies: document.querySelector("#enemies"),
  money: document.querySelector("#money"),
  health: document.querySelector("#health"),
  level: document.querySelector("#level"),
  xp: document.querySelector("#xp"),
  waveBonus: document.querySelector("#waveBonus"),
  overlay: document.querySelector("#overlay"),
  start: document.querySelector("#start"),
  playerName: document.querySelector("#playerName"),
  saveScore: document.querySelector("#saveScore"),
  leaderboardList: document.querySelector("#leaderboardList"),
  leaderboardStatus: document.querySelector("#leaderboardStatus"),
  levelUp: document.querySelector("#levelUp"),
  rewardGrid: document.querySelector("#rewardGrid"),
  rewardInfo: document.querySelector("#rewardInfo"),
  skipReward: document.querySelector("#skipReward"),
  settingsToggle: document.querySelector("#settingsToggle"),
  settingsPanel: document.querySelector("#settingsPanel"),
  autoStartBroke: document.querySelector("#autoStartBroke"),
  afkMode: document.querySelector("#afkMode"),
  autoCollectPowerups: document.querySelector("#autoCollectPowerups"),
  showAimLine: document.querySelector("#showAimLine"),
  reduceEffects: document.querySelector("#reduceEffects"),
  hotbarTooltips: document.querySelector("#hotbarTooltips"),
  devToggle: document.querySelector("#devToggle"),
  devPanel: document.querySelector("#devPanel"),
  devLock: document.querySelector("#devLock"),
  devPassword: document.querySelector("#devPassword"),
  devUnlock: document.querySelector("#devUnlock"),
  devActions: document.querySelector("#devActions"),
  devError: document.querySelector("#devError"),
  shop: document.querySelector("#shop"),
  shopGrid: document.querySelector("#shopGrid"),
  nextWave: document.querySelector("#nextWave"),
};

const keys = new Set();
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };
const LEADERBOARD_ENDPOINT = window.WAVEBOUND_LEADERBOARD_URL || "/api/leaderboard";

const upgrades = [
  {
    id: "damage",
    name: "Damage",
    text: "Bullets hit harder.",
    base: 40,
    scale: 1.33,
    apply: () => (state.player.damage += 7),
    value: () => `+7 damage`,
  },
  {
    id: "fireRate",
    name: "Fire Rate",
    text: "Shoot more often.",
    base: 55,
    scale: 1.38,
    apply: () => (state.player.fireDelay *= 0.92),
    value: () => `+8% attack speed`,
  },
  {
    id: "range",
    name: "Range",
    text: "Shots travel farther before fading.",
    base: 70,
    scale: 1.37,
    apply: () => (state.player.range += 0.16),
    value: () => `+16% range`,
  },
  {
    id: "speed",
    name: "Move Speed",
    text: "Outrun the swarm.",
    base: 45,
    scale: 1.34,
    apply: () => (state.player.speed += 22),
    value: () => `+22 speed`,
  },
  {
    id: "maxHealth",
    name: "Max Health",
    text: "Gain max health and heal.",
    base: 65,
    scale: 1.35,
    apply: () => {
      state.player.maxHealth += 20;
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 35);
    },
    value: () => `+20 max`,
  },
  {
    id: "armor",
    name: "Armor",
    text: "Take less contact damage.",
    base: 95,
    scale: 1.45,
    apply: () => (state.player.armor += 0.06),
    value: () => `+6% resist`,
  },
  {
    id: "magnet",
    name: "Pickup Magnet",
    text: "Grab powerups from farther away.",
    base: 80,
    scale: 1.42,
    apply: () => (state.player.magnet += 18),
    value: () => `+18 range`,
  },
  {
    id: "rewardOptions",
    name: "Reward Choices",
    text: "See more options when you level up.",
    base: 420,
    scale: 2.15,
    maxLevel: 3,
    apply: () => (state.rewardOptionBonus += 1),
    value: () => `+1 option`,
  },
  {
    id: "rewardPicks",
    name: "Extra Reward Pick",
    text: "Choose more rewards each level up.",
    base: 1200,
    scale: 3,
    maxLevel: 2,
    apply: () => (state.rewardPickBonus += 1),
    value: () => `+1 pick`,
  },
  {
    id: "gunSlot",
    name: "Gun Slot",
    text: "Equip one more gun after inventory unlocks.",
    base: 1500,
    scale: 3.25,
    maxLevel: 4,
    apply: () => (state.gunSlots += 1),
    value: () => `+1 gun slot`,
  },
  {
    id: "gearSlot",
    name: "Gear Slot",
    text: "Equip one more gear item after inventory unlocks.",
    base: 1300,
    scale: 3.4,
    maxLevel: 3,
    apply: () => (state.gearSlots += 1),
    value: () => `+1 gear slot`,
  },
  {
    id: "bulletSlot",
    name: "Bullet Mod Slot",
    text: "Equip one more bullet upgrade after inventory unlocks.",
    base: 1100,
    scale: 3,
    maxLevel: 4,
    apply: () => (state.bulletSlots += 1),
    value: () => `+1 bullet slot`,
  },
];

const enemyTypes = {
  runner: {
    shape: "triangle",
    color: "#ff9f43",
    minWave: 2,
    weight: (wave) => 0.9 + wave * 0.08,
    build: (wave) => ({
      radius: 14 + Math.min(8, wave * 0.18),
      speed: 165 + wave * 12 + Math.random() * 35,
      health: 30 + wave * 11,
      damage: 8 + wave * 1.25,
      worth: Math.floor(10 + wave * 2.7),
      xp: Math.floor(10 + wave * 2.3),
    }),
  },
  grunt: {
    shape: "circle",
    color: "#ff5d68",
    minWave: 1,
    weight: () => 3,
    build: (wave) => ({
      radius: 15 + Math.min(12, wave * 0.35),
      speed: 95 + wave * 8 + Math.random() * 25,
      health: 46 + wave * 18,
      damage: 11 + wave * 1.6,
      worth: Math.floor(8 + wave * 2.4),
      xp: Math.floor(9 + wave * 2.1),
    }),
  },
  tank: {
    shape: "square",
    color: "#9b8cff",
    minWave: 4,
    weight: (wave) => 0.55 + wave * 0.055,
    build: (wave) => ({
      radius: 20 + Math.min(16, wave * 0.45),
      speed: 55 + wave * 4.5 + Math.random() * 14,
      health: 260 + wave * 78 + wave ** 1.28 * 10,
      damage: 22 + wave * 2.5,
      worth: Math.floor(24 + wave * 5.6),
      xp: Math.floor(25 + wave * 4.2),
    }),
  },
};

const bossColors = ["#f7d046", "#4dd7ff", "#e875ff", "#7cf0b2"];

const powerupTypes = [
  {
    id: "heal",
    label: "+",
    name: "Heal",
    color: "#7cf0b2",
    instant: true,
    apply: () => {
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 32);
    },
  },
  {
    id: "cash",
    label: "$",
    name: "Cash",
    color: "#ffd166",
    instant: true,
    apply: () => {
      state.money += Math.floor(18 + state.wave * 5);
    },
  },
  {
    id: "rapid",
    label: "R",
    name: "Rapid Fire",
    color: "#72c7ff",
    duration: 7,
    apply: () => addTimedPowerup("rapid", 7),
  },
  {
    id: "damage",
    label: "D",
    name: "Double Damage",
    color: "#ff8a8f",
    duration: 7,
    apply: () => addTimedPowerup("damage", 7),
  },
  {
    id: "haste",
    label: "S",
    name: "Haste",
    color: "#ff9f43",
    duration: 8,
    apply: () => addTimedPowerup("haste", 8),
  },
  {
    id: "shield",
    label: "O",
    name: "Shield",
    color: "#9b8cff",
    duration: 8,
    apply: () => addTimedPowerup("shield", 8),
  },
];

const loadoutItems = {
  pistol: {
    kind: "gun",
    name: "Pistol",
    maxLevel: 3,
    stats: [
      { pellets: 1, spread: 0, speed: 780, damage: 1, fireRate: 1 },
      { pellets: 1, spread: 0, speed: 830, damage: 1.25, fireRate: 0.88 },
      { pellets: 2, spread: 0.08, speed: 860, damage: 1.15, fireRate: 0.78 },
    ],
  },
  shotgun: {
    kind: "gun",
    name: "Shotgun",
    maxLevel: 3,
    stats: [
      { pellets: 5, spread: 0.42, speed: 690, damage: 0.72, fireRate: 1.45 },
      { pellets: 7, spread: 0.46, speed: 720, damage: 0.78, fireRate: 1.25 },
      { pellets: 9, spread: 0.5, speed: 760, damage: 0.86, fireRate: 1.05 },
    ],
  },
  sniper: {
    kind: "gun",
    name: "Sniper",
    maxLevel: 3,
    stats: [
      { pellets: 1, spread: 0, speed: 1120, damage: 2.75, fireRate: 2.15, pierce: 2 },
      { pellets: 1, spread: 0, speed: 1220, damage: 3.55, fireRate: 1.92, pierce: 3 },
      { pellets: 1, spread: 0, speed: 1320, damage: 4.5, fireRate: 1.65, pierce: 5 },
    ],
  },
  smg: {
    kind: "gun",
    name: "SMG",
    maxLevel: 3,
    stats: [
      { pellets: 1, spread: 0.1, speed: 760, damage: 0.58, fireRate: 0.48 },
      { pellets: 1, spread: 0.12, speed: 800, damage: 0.68, fireRate: 0.38 },
      { pellets: 2, spread: 0.16, speed: 830, damage: 0.58, fireRate: 0.32 },
    ],
  },
  burst: {
    kind: "gun",
    name: "Burst Rifle",
    maxLevel: 3,
    stats: [
      { pellets: 3, spread: 0.16, speed: 850, damage: 0.74, fireRate: 1.05 },
      { pellets: 4, spread: 0.18, speed: 900, damage: 0.82, fireRate: 0.92 },
      { pellets: 5, spread: 0.2, speed: 940, damage: 0.88, fireRate: 0.78 },
    ],
  },
  assault: {
    kind: "gun",
    name: "Assault Rifle",
    maxLevel: 3,
    stats: [
      { pellets: 1, spread: 0.05, speed: 900, damage: 0.9, fireRate: 0.62, life: 0.95 },
      { pellets: 1, spread: 0.045, speed: 950, damage: 1.02, fireRate: 0.52, life: 1 },
      { pellets: 2, spread: 0.1, speed: 990, damage: 0.86, fireRate: 0.44, life: 1.05 },
    ],
  },
  repeater: {
    kind: "gun",
    name: "Repeater",
    maxLevel: 3,
    stats: [
      { pellets: 2, spread: 0.09, speed: 820, damage: 0.7, fireRate: 0.78, life: 0.9 },
      { pellets: 3, spread: 0.12, speed: 860, damage: 0.72, fireRate: 0.68, life: 0.95 },
      { pellets: 4, spread: 0.16, speed: 900, damage: 0.74, fireRate: 0.58, life: 1 },
    ],
  },
  marksman: {
    kind: "gun",
    name: "Marksman Rifle",
    maxLevel: 3,
    stats: [
      { pellets: 1, spread: 0.01, speed: 1020, damage: 1.65, fireRate: 1.08, pierce: 1, life: 1.15 },
      { pellets: 1, spread: 0.01, speed: 1100, damage: 2.05, fireRate: 0.94, pierce: 2, life: 1.22 },
      { pellets: 2, spread: 0.06, speed: 1160, damage: 1.72, fireRate: 0.86, pierce: 2, life: 1.28 },
    ],
  },
  scatterLaser: {
    kind: "gun",
    name: "Scatter Laser",
    maxLevel: 3,
    stats: [
      { pellets: 3, spread: 0.24, speed: 980, damage: 0.58, fireRate: 0.72, pierce: 1, life: 0.72 },
      { pellets: 4, spread: 0.28, speed: 1040, damage: 0.62, fireRate: 0.62, pierce: 1, life: 0.78 },
      { pellets: 5, spread: 0.32, speed: 1100, damage: 0.66, fireRate: 0.54, pierce: 2, life: 0.84 },
    ],
  },
  cannon: {
    kind: "gun",
    name: "Hand Cannon",
    maxLevel: 3,
    stats: [
      { pellets: 1, spread: 0.02, speed: 690, damage: 2.1, fireRate: 1.55, explosiveBonus: 1 },
      { pellets: 1, spread: 0.02, speed: 730, damage: 2.6, fireRate: 1.35, explosiveBonus: 1 },
      { pellets: 2, spread: 0.14, speed: 760, damage: 2.25, fireRate: 1.2, explosiveBonus: 2 },
    ],
  },
  minigun: {
    kind: "gun",
    name: "Minigun",
    maxLevel: 3,
    secretWave: 26,
    stats: [
      { pellets: 1, spread: 0.16, speed: 820, damage: 0.74, fireRate: 0.22 },
      { pellets: 1, spread: 0.14, speed: 870, damage: 0.86, fireRate: 0.17 },
      { pellets: 2, spread: 0.2, speed: 920, damage: 0.78, fireRate: 0.13 },
    ],
  },
  mines: {
    kind: "gear",
    name: "Mines",
    maxLevel: 3,
  },
  turret: {
    kind: "gear",
    name: "Turret",
    maxLevel: 3,
  },
  rocketTurret: {
    kind: "gear",
    name: "Rocket Turret",
    maxLevel: 3,
  },
  frostTurret: {
    kind: "gear",
    name: "Frost Turret",
    maxLevel: 3,
  },
  fireRing: {
    kind: "gear",
    name: "Fire Ring",
    maxLevel: 3,
  },
};

const bulletUpgradeIds = new Set(["burn", "explosive", "ricochet"]);

const levelRewards = [
  {
    id: "pistol",
    type: "Gun",
    name: "Pistol Upgrade",
    text: "Upgrade your starter pistol. Level 3 fires paired shots.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("pistol"),
  },
  {
    id: "shotgun",
    type: "Gun",
    name: "Shotgun",
    text: "Add or upgrade a wide pellet blast. Higher levels fire faster with more pellets.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("shotgun"),
  },
  {
    id: "sniper",
    type: "Gun",
    name: "Sniper",
    text: "Add or upgrade slow, piercing, high-damage shots.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("sniper"),
  },
  {
    id: "smg",
    type: "Gun",
    name: "SMG",
    text: "Add or upgrade a fast-firing spray weapon.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("smg"),
  },
  {
    id: "burst",
    type: "Gun",
    name: "Burst Rifle",
    text: "Add or upgrade accurate burst fire for mid-range damage.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("burst"),
  },
  {
    id: "assault",
    type: "Gun",
    name: "Assault Rifle",
    text: "Add or upgrade steady automatic rifle fire with solid range.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("assault"),
  },
  {
    id: "repeater",
    type: "Gun",
    name: "Repeater",
    text: "Add or upgrade a multi-shot rifle that stacks more barrels each level.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("repeater"),
  },
  {
    id: "marksman",
    type: "Gun",
    name: "Marksman Rifle",
    text: "Add or upgrade a precise piercing rifle between pistol and sniper.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("marksman"),
  },
  {
    id: "scatterLaser",
    type: "Gun",
    name: "Scatter Laser",
    text: "Add or upgrade fast piercing spread shots for close and mid range.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("scatterLaser"),
  },
  {
    id: "cannon",
    type: "Gun",
    name: "Hand Cannon",
    text: "Add or upgrade heavy explosive shots.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("cannon"),
  },
  {
    id: "minigun",
    type: "Secret Gun",
    name: "Minigun",
    text: "A secret wave 26+ weapon. Replaces a gun if your gun slots are full.",
    maxLevel: 3,
    minWave: 26,
    apply: () => equipOrUpgradeItem("minigun"),
  },
  {
    id: "burn",
    type: "Ammo",
    name: "Burn Rounds",
    text: "Equip or upgrade burning bullets. Uses a bullet mod slot.",
    maxLevel: 4,
    apply: () => equipOrUpgradeBullet("burn"),
  },
  {
    id: "explosive",
    type: "Ammo",
    name: "Explosive Bullets",
    text: "Equip or upgrade splash damage bullets. Uses a bullet mod slot.",
    maxLevel: 3,
    apply: () => equipOrUpgradeBullet("explosive"),
  },
  {
    id: "mines",
    type: "Gadget",
    name: "Mines",
    text: "Add or upgrade a mine layer in your loadout. Higher levels drop stronger mines faster.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("mines"),
  },
  {
    id: "turret",
    type: "Gadget",
    name: "Auto Turret",
    text: "Add or upgrade a buffed shoulder turret that shoots the closest enemy.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("turret"),
  },
  {
    id: "rocketTurret",
    type: "Gadget",
    name: "Rocket Turret",
    text: "Add or upgrade a slower turret that fires explosive shots.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("rocketTurret"),
  },
  {
    id: "frostTurret",
    type: "Gadget",
    name: "Frost Turret",
    text: "Add or upgrade a rapid turret with piercing, burning blue shots.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("frostTurret"),
  },
  {
    id: "fireRing",
    type: "Gadget",
    name: "Ring of Fire",
    text: "Add or upgrade a burning aura around the player.",
    maxLevel: 3,
    apply: () => equipOrUpgradeItem("fireRing"),
  },
  {
    id: "ricochet",
    type: "Ammo",
    name: "Ricochet",
    text: "Equip or upgrade extra bullet pierce. Uses a bullet mod slot.",
    maxLevel: 3,
    apply: () => equipOrUpgradeBullet("ricochet"),
  },
  {
    id: "overclock",
    type: "Stats",
    name: "Overclock",
    text: "All equipped guns fire faster. Stacks up to 5.",
    maxLevel: 5,
    apply: () => (state.perks.overclock += 1),
  },
  {
    id: "vampire",
    type: "Survival",
    name: "Life Siphon",
    text: "Heal a little on each kill. Stacks up to 3.",
    maxLevel: 3,
    apply: () => (state.perks.vampire += 1),
  },
  {
    id: "focus",
    type: "Stats",
    name: "Focus",
    text: "Gain permanent damage and fire rate.",
    maxLevel: 8,
    apply: () => {
      state.player.damage += 5;
      state.player.fireDelay *= 0.94;
    },
  },
  {
    id: "vitality",
    type: "Stats",
    name: "Vitality",
    text: "Gain max health and heal immediately.",
    maxLevel: 8,
    apply: () => {
      state.player.maxHealth += 18;
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 45);
    },
  },
];

function createRewardLevels() {
  const levels = Object.fromEntries(levelRewards.map((reward) => [reward.id, 0]));
  return levels;
}

function createInventoryItem(id, level = 1) {
  const uid = `${id}-${state?.nextItemUid ?? 0}`;
  if (state) state.nextItemUid += 1;
  return { uid, id, level };
}

const state = {
  running: false,
  pausedForShop: false,
  pausedForLevelUp: false,
  wave: 1,
  money: 0,
  xp: 0,
  level: 1,
  xpToNext: 45,
  kills: 0,
  finalScore: 0,
  leaderboard: [],
  leaderboardOnline: false,
  pendingLevelUps: 0,
  rewardOptionBonus: 0,
  rewardPickBonus: 0,
  rewardPicksRemaining: 0,
  currentRewards: [],
  rewardLevels: createRewardLevels(),
  nextItemUid: 1,
  inventoryUnlocked: false,
  gunSlots: 2,
  gearSlots: 1,
  bulletSlots: 3,
  inventory: [{ uid: "pistol-0", id: "pistol", level: 1 }],
  bulletUpgrades: [],
  itemCooldowns: {},
  perks: {
    burn: 0,
    explosive: 0,
    mines: 0,
    vampire: 0,
    ricochet: 0,
    overclock: 0,
    turret: 0,
    rocketTurret: 0,
    frostTurret: 0,
    fireRing: 0,
  },
  bullets: [],
  bossBullets: [],
  enemies: [],
  mines: [],
  powerups: [],
  activePowerups: {},
  particles: [],
  settings: {
    autoStartWhenBroke: false,
    afkMode: false,
    autoCollectPowerups: false,
    showAimLine: false,
    reduceEffects: false,
    hotbarTooltips: true,
  },
  lastTime: 0,
  spawnLeft: 0,
  spawnTimer: 0,
  player: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: 310,
    health: 100,
    maxHealth: 100,
    damage: 24,
    fireDelay: 190,
    range: 1,
    lastShot: 0,
    dashCooldown: 0,
    armor: 0,
    magnet: 18,
    mineTimer: 0,
    turretTimer: 0,
    rocketTurretTimer: 0,
    frostTurretTimer: 0,
    ringTimer: 0,
  },
  levels: Object.fromEntries(upgrades.map((upgrade) => [upgrade.id, 0])),
};

function isBossWave(wave) {
  return wave > 0 && wave % 5 === 0;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function worldSize() {
  return canvas.getBoundingClientRect();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function startRun() {
  Object.assign(state, {
    running: true,
    pausedForShop: false,
    pausedForLevelUp: false,
    wave: 1,
    money: 0,
    xp: 0,
    level: 1,
    xpToNext: 45,
    kills: 0,
    finalScore: 0,
    pendingLevelUps: 0,
    rewardOptionBonus: 0,
    rewardPickBonus: 0,
    rewardPicksRemaining: 0,
    currentRewards: [],
    rewardLevels: createRewardLevels(),
    nextItemUid: 1,
    inventoryUnlocked: false,
    gunSlots: 2,
    gearSlots: 1,
    bulletSlots: 3,
    inventory: [{ uid: "pistol-0", id: "pistol", level: 1 }],
    bulletUpgrades: [],
    itemCooldowns: {},
    perks: {
      burn: 0,
      explosive: 0,
      mines: 0,
      vampire: 0,
      ricochet: 0,
      overclock: 0,
      turret: 0,
      rocketTurret: 0,
      frostTurret: 0,
      fireRing: 0,
    },
    bullets: [],
    bossBullets: [],
    enemies: [],
    mines: [],
    powerups: [],
    activePowerups: {},
    particles: [],
    lastTime: performance.now(),
  });
  Object.assign(state.player, {
    x: worldSize().width / 2,
    y: worldSize().height / 2,
    speed: 310,
    health: 100,
    maxHealth: 100,
    damage: 24,
    fireDelay: 190,
    range: 1,
    lastShot: 0,
    dashCooldown: 0,
    armor: 0,
    magnet: 18,
    mineTimer: 0,
    turretTimer: 0,
    rocketTurretTimer: 0,
    frostTurretTimer: 0,
    ringTimer: 0,
  });
  for (const upgrade of upgrades) state.levels[upgrade.id] = 0;
  ui.overlay.classList.add("hidden");
  ui.saveScore.classList.add("hidden");
  ui.levelUp.classList.add("hidden");
  ui.shop.classList.remove("open");
  ui.waveBonus.textContent = "";
  beginWave();
}

function beginWave() {
  state.pausedForShop = false;
  state.bullets = [];
  state.bossBullets = [];
  state.enemies = [];
  state.mines = [];
  state.powerups = [];
  state.particles = [];
  state.spawnLeft = isBossWave(state.wave) ? Math.floor(1 + state.wave * 0.42) : Math.floor(5 + state.wave * 1.85);
  state.spawnTimer = 0;
  ui.shop.classList.remove("open");
  if (isBossWave(state.wave)) spawnBosses();
}

function finishWave() {
  const bonus = Math.floor(20 + state.wave * 14 + state.wave ** 1.18 * 7);
  state.money += bonus;
  if (state.wave >= 5) state.inventoryUnlocked = true;
  ui.waveBonus.textContent = `Wave bonus +$${bonus}${state.wave === 5 ? " - Inventory unlocked" : ""}`;
  state.wave += 1;
  state.pausedForShop = true;
  state.bullets = [];
  state.bossBullets = [];
  state.mines = [];
  state.powerups = [];
  state.particles = [];
  keys.clear();
  mouse.down = false;
  mouse.x = state.player.x + 40;
  mouse.y = state.player.y;
  renderShop();
  ui.shop.classList.add("open");
  maybeAutoStartWave();
}

function chooseEnemyType() {
  const available = Object.entries(enemyTypes).filter(([, type]) => state.wave >= type.minWave);
  const totalWeight = available.reduce((sum, [, type]) => sum + type.weight(state.wave), 0);
  let roll = Math.random() * totalWeight;

  for (const [key, type] of available) {
    roll -= type.weight(state.wave);
    if (roll <= 0) return [key, type];
  }

  return available[available.length - 1];
}

function edgeSpawn(margin = 28) {
  const size = worldSize();
  const side = Math.floor(Math.random() * 4);
  return {
    x: side === 0 ? -margin : side === 1 ? size.width + margin : Math.random() * size.width,
    y: side === 2 ? -margin : side === 3 ? size.height + margin : Math.random() * size.height,
  };
}

function spawnEnemy() {
  const [typeName, type] = chooseEnemyType();
  const stats = scaleEnemyStats(type.build(state.wave));
  const spawn = edgeSpawn();
  const enemy = {
    x: spawn.x,
    y: spawn.y,
    type: typeName,
    shape: type.shape,
    color: type.color,
    radius: stats.radius,
    speed: stats.speed,
    health: stats.health,
    maxHealth: stats.health,
    damage: stats.damage,
    hitCooldown: 0,
    worth: stats.worth,
    xp: stats.xp,
    burnTime: 0,
    burnDamage: 0,
  };
  state.enemies.push(enemy);
  state.spawnLeft -= 1;
}

function spawnBosses() {
  const bossTier = state.wave / 5;
  const bossCount = state.wave >= 30 ? 3 : state.wave >= 15 ? 2 : 1;
  const mainSides = 5 + bossTier;
  const playerScale = getPlayerPowerScale();
  const lateBossScale = 1.28 + Math.max(0, bossTier - 1) * 0.42 + Math.max(0, bossTier - 5) * 0.24;

  for (let i = 0; i < bossCount; i += 1) {
    const sides = Math.max(6, mainSides - i * 2);
    const spawn = edgeSpawn(56 + i * 18);
    const health = Math.floor(
      (1700 + state.wave * 340 + bossTier ** 2 * 310 + i * state.wave * 260) * playerScale * lateBossScale,
    );
    state.enemies.push({
      x: spawn.x,
      y: spawn.y,
      type: "boss",
      shape: "polygon",
      polygonSides: sides,
      boss: true,
      color: bossColors[i % bossColors.length],
      radius: 34 + bossTier * 3 + i * 5,
      speed: (40 + state.wave * 2.65 - i * 3) * (1 + (playerScale - 1) * 0.12),
      health,
      maxHealth: health,
      damage: (38 + state.wave * 4.8 + i * 13) * (1 + (playerScale - 1) * 0.5),
      hitCooldown: 0,
      worth: Math.floor(95 + state.wave * 18 + i * state.wave * 8),
      xp: Math.floor(120 + state.wave * 22 + i * state.wave * 10),
      burnTime: 0,
      burnDamage: 0,
      attackTimer: 1.9 + i * 0.35,
      summonTimer: 4.4 + i * 0.65,
      bossTier,
    });
  }
}

function spawnBossMinion(boss) {
  const typeNames = state.wave >= 12 ? ["runner", "grunt", "tank"] : ["runner", "grunt"];
  const typeName = typeNames[Math.floor(Math.random() * typeNames.length)];
  const type = enemyTypes[typeName];
  const stats = scaleEnemyStats(type.build(Math.max(1, state.wave - 2)));
  const angle = Math.random() * Math.PI * 2;
  const distanceFromBoss = boss.radius + 28 + Math.random() * 24;
  const healthBoost = 1 + boss.bossTier * 0.09;
  const minion = {
    x: boss.x + Math.cos(angle) * distanceFromBoss,
    y: boss.y + Math.sin(angle) * distanceFromBoss,
    type: typeName,
    shape: type.shape,
    color: type.color,
    radius: stats.radius * 0.88,
    speed: stats.speed * 1.08,
    health: Math.floor(stats.health * healthBoost),
    maxHealth: Math.floor(stats.health * healthBoost),
    damage: stats.damage * 0.88,
    hitCooldown: 0,
    worth: Math.floor(stats.worth * 0.55),
    xp: Math.floor(stats.xp * 0.55),
    burnTime: 0,
    burnDamage: 0,
    summoned: true,
  };
  state.enemies.push(minion);
  burst(minion.x, minion.y, boss.color, 10);
}

function bossShoot(boss) {
  const bossTier = boss.bossTier || state.wave / 5;
  const baseAngle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
  const volley = Math.min(8, 2 + Math.floor(bossTier / 2));
  const spread = 0.18 + Math.min(0.55, bossTier * 0.045);
  const damage = boss.damage * (0.18 + Math.min(0.16, bossTier * 0.018));
  const speed = 250 + bossTier * 22;

  for (let i = 0; i < volley; i += 1) {
    const offset = volley === 1 ? 0 : ((i - (volley - 1) / 2) / Math.max(1, volley - 1)) * spread;
    const angle = baseAngle + offset;
    state.bossBullets.push({
      x: boss.x + Math.cos(angle) * (boss.radius + 8),
      y: boss.y + Math.sin(angle) * (boss.radius + 8),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7 + Math.min(8, bossTier),
      damage,
      color: boss.color,
      life: 3.2,
    });
  }

  const radialCount = Math.min(18, 7 + Math.floor(bossTier * 1.25));
  for (let i = 0; i < radialCount; i += 1) {
    const angle = (i / radialCount) * Math.PI * 2 + performance.now() * 0.0006;
    state.bossBullets.push({
      x: boss.x + Math.cos(angle) * (boss.radius + 8),
      y: boss.y + Math.sin(angle) * (boss.radius + 8),
      vx: Math.cos(angle) * (speed * 0.72),
      vy: Math.sin(angle) * (speed * 0.72),
      radius: 5 + Math.min(6, bossTier * 0.7),
      damage: damage * 0.5,
      color: boss.color,
      life: 2.4,
    });
  }
  burst(boss.x, boss.y, boss.color, 8);
}

function getItemId(item) {
  return typeof item === "string" ? item : item.id;
}

function getItemUid(item) {
  return typeof item === "string" ? item : item.uid;
}

function getInventoryEntriesById(id) {
  return state.inventory.filter((item) => getItemId(item) === id);
}

function getHighestInventoryLevel(id) {
  return getInventoryEntriesById(id).reduce((highest, item) => Math.max(highest, getItemLevel(item)), 0);
}

function syncLoadoutRewardLevel(id) {
  state.rewardLevels[id] = getHighestInventoryLevel(id);
}

function getItemLevel(item) {
  if (typeof item === "object" && item) return item.level || 0;
  if (loadoutItems[item]) return getHighestInventoryLevel(item);
  return state.rewardLevels[item] || 0;
}

function getItemStats(itemId) {
  const id = getItemId(itemId);
  const item = loadoutItems[id];
  const level = Math.max(1, getItemLevel(itemId));
  return item.stats[Math.min(item.stats.length - 1, level - 1)];
}

function getGunDamage(item) {
  const weapon = getItemStats(item);
  return state.player.damage * weapon.damage * (state.activePowerups.damage ? 2 : 1);
}

function getGunFireDelay(item) {
  const weapon = getItemStats(item);
  const overclockMultiplier = 1 - state.perks.overclock * 0.06;
  return state.player.fireDelay * weapon.fireRate * Math.max(0.58, overclockMultiplier) * (state.activePowerups.rapid ? 0.45 : 1);
}

function getPlayerSpeed() {
  return state.player.speed * (state.activePowerups.haste ? 1.45 : 1);
}

function currentMoveVector(useMouseFallback = false) {
  let dx = 0;
  let dy = 0;
  if (keys.has("w")) dy -= 1;
  if (keys.has("s")) dy += 1;
  if (keys.has("a")) dx -= 1;
  if (keys.has("d")) dx += 1;

  if (!dx && !dy && useMouseFallback) {
    dx = mouse.x - state.player.x;
    dy = mouse.y - state.player.y;
  }

  const mag = Math.hypot(dx, dy) || 1;
  return { x: dx / mag, y: dy / mag };
}

function dashPlayer() {
  if (
    !state.running ||
    state.pausedForShop ||
    state.pausedForLevelUp ||
    state.settings.afkMode ||
    state.player.dashCooldown > 0
  ) {
    return;
  }

  const size = worldSize();
  const direction = currentMoveVector(true);
  const distance = 150 + Math.min(70, (getPlayerSpeed() - 310) * 0.18);
  state.player.x = clamp(state.player.x + direction.x * distance, 20, size.width - 20);
  state.player.y = clamp(state.player.y + direction.y * distance, 20, size.height - 20);
  state.player.dashCooldown = 0.85;
  burst(state.player.x, state.player.y, "#72c7ff", 16);
}

function getIncomingDamage(damage) {
  const armorMultiplier = Math.max(0.45, 1 - state.player.armor);
  return damage * armorMultiplier * (state.activePowerups.shield ? 0.45 : 1);
}

function getPlayerPowerScale() {
  const rewardPower = Object.values(state.rewardLevels).reduce((sum, level) => sum + level, 0);
  const shopPower = Object.values(state.levels).reduce((sum, level) => sum + level, 0);
  const levelPower = Math.max(0, state.level - 2) * 0.04;
  const loadoutPower =
    Math.max(0, state.inventory.length - 1) * 0.055 + state.inventory.reduce((sum, item) => sum + getItemLevel(item), 0) * 0.012 + state.bulletUpgrades.length * 0.045;
  return 1 + Math.min(1.45, levelPower + rewardPower * 0.018 + shopPower * 0.014 + loadoutPower);
}

function scaleEnemyStats(stats) {
  const playerScale = getPlayerPowerScale();
  const pressure = playerScale - 1;
  return {
    ...stats,
    speed: stats.speed * (1 + pressure * 0.13),
    health: Math.floor(stats.health * playerScale),
    damage: stats.damage * (1 + pressure * 0.62),
  };
}

function addTimedPowerup(id, duration) {
  state.activePowerups[id] = Math.max(state.activePowerups[id] || 0, duration);
}

function spawnPowerup(x, y, guaranteed = false) {
  const dropChance = guaranteed ? 1 : Math.min(0.28, 0.13 + state.wave * 0.005);
  if (Math.random() > dropChance) return;

  const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
  state.powerups.push({
    ...type,
    x,
    y,
    radius: 13,
    life: 12,
    bob: Math.random() * Math.PI * 2,
  });
}

function shoot(now) {
  const target = state.settings.afkMode ? closestEnemyTo(state.player) : null;
  if (state.settings.afkMode && !target) return;
  if (!target && !mouse.down) return;
  const angle = target
    ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
    : Math.atan2(mouse.y - state.player.y, mouse.x - state.player.x);
  for (const inventoryItem of state.inventory) {
    const itemId = getItemId(inventoryItem);
    const item = loadoutItems[itemId];
    if (item.kind !== "gun") continue;
    const cooldownKey = getItemUid(inventoryItem);
    if (now - (state.itemCooldowns[cooldownKey] || 0) < getGunFireDelay(inventoryItem)) continue;
    shootGun(inventoryItem, angle);
    state.itemCooldowns[cooldownKey] = now;
  }
}

function shootGun(item, angle) {
  const itemId = getItemId(item);
  const weapon = getItemStats(item);
  const pellets = weapon.pellets;

  for (let i = 0; i < pellets; i += 1) {
    const offset = pellets === 1 ? 0 : ((i - (pellets - 1) / 2) / Math.max(1, pellets - 1)) * weapon.spread;
    const shotAngle = angle + offset + (Math.random() - 0.5) * weapon.spread * 0.18;
    state.bullets.push({
      x: state.player.x + Math.cos(shotAngle) * 22,
      y: state.player.y + Math.sin(shotAngle) * 22,
      vx: Math.cos(shotAngle) * weapon.speed,
      vy: Math.sin(shotAngle) * weapon.speed,
      radius: state.perks.explosive ? 6 : 5,
      damage: getGunDamage(item),
      pierce: (weapon.pierce || 0) + state.perks.ricochet,
      explosive: state.perks.explosive + (weapon.explosiveBonus || 0),
      burn: state.perks.burn,
      source: itemId,
      hitEnemies: new Set(),
      life: (weapon.life || (itemId === "sniper" ? 1.1 : 0.85)) * state.player.range,
    });
  }
}

function closestEnemyTo(point, maxRange = Infinity) {
  let target = null;
  let bestDistance = maxRange;
  for (const enemy of state.enemies) {
    const targetDistance = distance(point, enemy);
    if (targetDistance < bestDistance) {
      bestDistance = targetDistance;
      target = enemy;
    }
  }
  return target;
}

function fireTurretBullet(id, level, target, options) {
  const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
  state.bullets.push({
    x: state.player.x + Math.cos(angle) * 20,
    y: state.player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * options.speed,
    vy: Math.sin(angle) * options.speed,
    radius: options.radius,
    damage: options.damage,
    pierce: options.pierce,
    explosive: options.explosive,
    burn: options.burn,
    source: id,
    hitEnemies: new Set(),
    life: options.life,
  });
  burst(state.player.x, state.player.y, options.color, options.burst);
}

function getEquippedItem(id) {
  return state.inventory.find((item) => getItemId(item) === id);
}

function updateMines(dt) {
  const mineItem = getEquippedItem("mines");
  const mineLevel = getItemLevel(mineItem);
  if (mineLevel && (keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d"))) {
    state.player.mineTimer -= dt;
    if (state.player.mineTimer <= 0) {
      state.mines.push({
        x: state.player.x,
        y: state.player.y,
        radius: 10,
        blast: 68 + mineLevel * 24,
        damage: 135 + mineLevel * 85 + state.wave * 14,
        arm: 0.25,
        life: 7,
      });
      state.player.mineTimer = Math.max(0.65, 1.9 - mineLevel * 0.38);
    }
  }

  const turretItem = getEquippedItem("turret");
  const turretLevel = getItemLevel(turretItem);
  if (turretLevel) {
    state.player.turretTimer -= dt;
    if (state.player.turretTimer <= 0) {
      const target = closestEnemyTo(state.player, 620);
      if (target) {
        fireTurretBullet("turret", turretLevel, target, {
          speed: 870 + turretLevel * 95,
          radius: 5 + turretLevel,
          damage: state.player.damage * (1.05 + turretLevel * 0.42),
          pierce: state.perks.ricochet + (turretLevel >= 3 ? 1 : 0),
          explosive: state.perks.explosive,
          burn: state.perks.burn,
          life: 0.95,
          color: "#4dd7ff",
          burst: 4,
        });
      }
      state.player.turretTimer = Math.max(0.24, 0.7 - turretLevel * 0.1);
    }
  }

  const rocketTurretItem = getEquippedItem("rocketTurret");
  const rocketTurretLevel = getItemLevel(rocketTurretItem);
  if (rocketTurretLevel) {
    state.player.rocketTurretTimer = (state.player.rocketTurretTimer || 0) - dt;
    if (state.player.rocketTurretTimer <= 0) {
      const target = closestEnemyTo(state.player, 680);
      if (target) {
        fireTurretBullet("rocketTurret", rocketTurretLevel, target, {
          speed: 640 + rocketTurretLevel * 70,
          radius: 7 + rocketTurretLevel,
          damage: state.player.damage * (1.35 + rocketTurretLevel * 0.5),
          pierce: 0,
          explosive: state.perks.explosive + 2 + rocketTurretLevel,
          burn: state.perks.burn,
          life: 1.15,
          color: "#ffd166",
          burst: 5,
        });
      }
      state.player.rocketTurretTimer = Math.max(0.55, 1.55 - rocketTurretLevel * 0.22);
    }
  }

  const frostTurretItem = getEquippedItem("frostTurret");
  const frostTurretLevel = getItemLevel(frostTurretItem);
  if (frostTurretLevel) {
    state.player.frostTurretTimer = (state.player.frostTurretTimer || 0) - dt;
    if (state.player.frostTurretTimer <= 0) {
      const target = closestEnemyTo(state.player, 560);
      if (target) {
        fireTurretBullet("frostTurret", frostTurretLevel, target, {
          speed: 980 + frostTurretLevel * 85,
          radius: 4 + frostTurretLevel,
          damage: state.player.damage * (0.72 + frostTurretLevel * 0.24),
          pierce: 1 + frostTurretLevel + state.perks.ricochet,
          explosive: state.perks.explosive,
          burn: state.perks.burn + 1,
          life: 0.9,
          color: "#72c7ff",
          burst: 3,
        });
      }
      state.player.frostTurretTimer = Math.max(0.18, 0.46 - frostTurretLevel * 0.06);
    }
  }

  const ringItem = getEquippedItem("fireRing");
  const ringLevel = getItemLevel(ringItem);
  if (ringLevel) {
    state.player.ringTimer -= dt;
    const ringRadius = 54 + ringLevel * 18;
    if (state.player.ringTimer <= 0) {
      for (const enemy of state.enemies) {
        if (distance(enemy, state.player) <= ringRadius + enemy.radius) {
          enemy.health -= 18 + ringLevel * 16 + state.wave * 2.4;
          enemy.burnTime = Math.max(enemy.burnTime, 1.6);
          enemy.burnDamage = Math.max(enemy.burnDamage, 6 + ringLevel * 5);
        }
      }
      burst(state.player.x, state.player.y, "#ff9f43", 8);
      state.player.ringTimer = Math.max(0.18, 0.55 - ringLevel * 0.07);
    }
  }

  for (const mine of state.mines) {
    mine.arm -= dt;
    mine.life -= dt;
    if (mine.arm <= 0 && state.enemies.some((enemy) => distance(mine, enemy) < mine.radius + enemy.radius + 6)) {
      explode(mine.x, mine.y, mine.blast, mine.damage);
      mine.life = 0;
    }
  }
  state.mines = state.mines.filter((mine) => mine.life > 0);
}

function explode(x, y, radius, damage) {
  burst(x, y, "#ff9f43", 22);
  for (const enemy of state.enemies) {
    const blastDistance = distance({ x, y }, enemy);
    if (blastDistance <= radius + enemy.radius) {
      const falloff = 1 - Math.min(0.75, blastDistance / (radius + enemy.radius));
      enemy.health -= damage * falloff;
    }
  }
}

function addExperience(amount) {
  state.xp += amount;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.pendingLevelUps += 1;
    state.xpToNext = xpNeededForLevel(state.level);
  }
}

function xpNeededForLevel(level) {
  return Math.floor(45 + level * 24 + level ** 1.35 * 11);
}

function getRewardOptionCount() {
  return 3 + state.rewardOptionBonus;
}

function getRewardPickCount() {
  return 1 + state.rewardPickBonus;
}

function getGunCount() {
  return state.inventory.filter((item) => loadoutItems[getItemId(item)].kind === "gun").length;
}

function getGearCount() {
  return state.inventory.filter((item) => loadoutItems[getItemId(item)].kind === "gear").length;
}

function getLoadoutItemsByKind(kind) {
  return state.inventory.filter((item) => loadoutItems[getItemId(item)].kind === kind);
}

function getLowestLevelLoadoutItem(kind) {
  return getLoadoutItemsByKind(kind).sort((a, b) => getItemLevel(a) - getItemLevel(b))[0];
}

function getLowestLevelBulletUpgrade() {
  return [...state.bulletUpgrades].sort((a, b) => getItemLevel(a) - getItemLevel(b))[0];
}

function clearRemovedItem(id) {
  const remainingLevel = loadoutItems[id] ? getHighestInventoryLevel(id) : 0;
  state.rewardLevels[id] = remainingLevel;
  delete state.itemCooldowns[id];
  if (state.perks[id] !== undefined) state.perks[id] = remainingLevel;
  if (id === "mines") state.player.mineTimer = 0;
  if (id === "turret") state.player.turretTimer = 0;
  if (id === "rocketTurret") state.player.rocketTurretTimer = 0;
  if (id === "frostTurret") state.player.frostTurretTimer = 0;
  if (id === "fireRing") state.player.ringTimer = 0;
}

function hasLoadoutSpaceFor(id) {
  if (!state.inventoryUnlocked) return getInventoryEntriesById(id).length > 0;
  const item = loadoutItems[id];
  if (getInventoryEntriesById(id).some((entry) => getItemLevel(entry) < item.maxLevel)) return true;
  if (item.kind === "gun") return getGunCount() < state.gunSlots;
  if (item.kind === "gear") return getGearCount() < state.gearSlots;
  return true;
}

function canEquipOrReplaceLoadoutItem(id) {
  if (!state.inventoryUnlocked) return getInventoryEntriesById(id).length > 0;
  const item = loadoutItems[id];
  if (getInventoryEntriesById(id).some((entry) => getItemLevel(entry) < item.maxLevel)) return true;
  if (item.kind === "gun" && getInventoryEntriesById(id).some((entry) => getItemLevel(entry) >= item.maxLevel)) return state.gunSlots > 0;
  if (item.kind === "gun") return state.gunSlots > 0;
  if (item.kind === "gear") return state.gearSlots > 0;
  return true;
}

function hasBulletSpaceFor(id) {
  if (!state.inventoryUnlocked) return state.bulletUpgrades.includes(id);
  return state.bulletUpgrades.includes(id) || state.bulletUpgrades.length < state.bulletSlots;
}

function canEquipOrReplaceBullet(id) {
  if (!state.inventoryUnlocked) return state.bulletUpgrades.includes(id);
  return state.bulletUpgrades.includes(id) || state.bulletSlots > 0;
}

function removeLoadoutItem(uid) {
  const oldItem = state.inventory.find((item) => getItemUid(item) === uid);
  if (!oldItem) return;
  const oldId = getItemId(oldItem);
  state.inventory = state.inventory.filter((item) => getItemUid(item) !== uid);
  delete state.itemCooldowns[uid];
  clearRemovedItem(oldId);
}

function syncGearPerk(id) {
  const level = getHighestInventoryLevel(id);
  if (id === "mines") state.perks.mines = level;
  if (id === "turret") state.perks.turret = level;
  if (id === "rocketTurret") state.perks.rocketTurret = level;
  if (id === "frostTurret") state.perks.frostTurret = level;
  if (id === "fireRing") state.perks.fireRing = level;
}

function equipOrUpgradeItem(id, replaceUid = null) {
  const item = loadoutItems[id];
  const upgradeTarget = getInventoryEntriesById(id).find((entry) => getItemLevel(entry) < item.maxLevel);
  if (upgradeTarget) {
    upgradeTarget.level += 1;
    syncLoadoutRewardLevel(id);
    syncGearPerk(id);
    return true;
  }

  if (!canEquipOrReplaceLoadoutItem(id)) return false;
  if (!hasLoadoutSpaceFor(id)) {
    if (!replaceUid) return false;
    removeLoadoutItem(replaceUid);
  }
  state.inventory.push(createInventoryItem(id, 1));
  syncLoadoutRewardLevel(id);
  syncGearPerk(id);
  return true;
}

function equipOrUpgradeBullet(id, replaceId = null) {
  if (!state.bulletUpgrades.includes(id)) {
    if (!canEquipOrReplaceBullet(id)) return false;
    if (!hasBulletSpaceFor(id)) {
      const oldId = replaceId;
      if (!oldId) return false;
      state.bulletUpgrades = state.bulletUpgrades.filter((bulletId) => bulletId !== oldId);
      clearRemovedItem(oldId);
    }
    state.bulletUpgrades.push(id);
  }

  state.rewardLevels[id] += 1;
  state.perks[id] = state.rewardLevels[id];
  return true;
}

function openLevelUp() {
  state.pausedForLevelUp = true;
  mouse.down = false;
  keys.clear();
  state.pendingLevelUps -= 1;
  state.rewardPicksRemaining = getRewardPickCount();
  state.currentRewards = chooseLevelRewards(getRewardOptionCount());
  if (state.currentRewards.length === 0) {
    state.player.damage += 6;
    state.player.maxHealth += 12;
    state.player.health = Math.min(state.player.maxHealth, state.player.health + 30);
    state.pausedForLevelUp = false;
    if (state.pendingLevelUps > 0) openLevelUp();
    return;
  }
  renderLevelRewards();
  ui.levelUp.classList.remove("hidden");
}

function chooseLevelRewards(count) {
  const available = levelRewards.filter((reward) => {
    const item = loadoutItems[reward.id];
    const bulletUpgrade = bulletUpgradeIds.has(reward.id);
    const requiresInventory = item || bulletUpgrade;
    const canLevel = item
      ? getInventoryEntriesById(reward.id).some((entry) => getItemLevel(entry) < reward.maxLevel) ||
        (item.kind === "gun" && state.inventoryUnlocked && getInventoryEntriesById(reward.id).some((entry) => getItemLevel(entry) >= reward.maxLevel)) ||
        getInventoryEntriesById(reward.id).length === 0
      : state.rewardLevels[reward.id] < reward.maxLevel;
    if (!canLevel) return false;
    if (reward.minWave && state.wave < reward.minWave) return false;
    if (!requiresInventory) return true;
    if (!state.inventoryUnlocked && reward.id !== "pistol") return false;
    if (item) return canEquipOrReplaceLoadoutItem(reward.id);
    return canEquipOrReplaceBullet(reward.id);
  });
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function renderLevelRewards() {
  ui.rewardGrid.innerHTML = "";
  ui.rewardInfo.textContent = `Level ${state.level} - pick ${getRewardPickCount() - state.rewardPicksRemaining + 1} of ${getRewardPickCount()}`;

  for (const reward of state.currentRewards) {
    const card = document.createElement("button");
    card.className = "reward";
    const item = loadoutItems[reward.id];
    const bulletUpgrade = bulletUpgradeIds.has(reward.id);
    let itemText = "";
    if (item) {
      const entries = getInventoryEntriesById(reward.id);
      const upgrading = entries.some((entry) => getItemLevel(entry) < reward.maxLevel);
      const replacing = !upgrading && !hasLoadoutSpaceFor(reward.id);
      itemText = `${upgrading ? "Upgrade" : replacing ? "Choose replacement" : entries.length ? "Add copy" : "Equip"} - `;
    } else if (bulletUpgrade) {
      const replacing = !state.bulletUpgrades.includes(reward.id) && !hasBulletSpaceFor(reward.id);
      const oldId = replacing ? getLowestLevelBulletUpgrade() : "";
      const oldName = oldId ? levelRewards.find((option) => option.id === oldId).name : "";
      itemText = `${state.bulletUpgrades.includes(reward.id) ? "Upgrade" : replacing ? `Replace ${oldName}` : "Equip"} - `;
    }
    card.innerHTML = `
      <small>${itemText}${reward.type} - Level ${getItemLevel(reward.id)}/${reward.maxLevel}</small>
      <strong>${reward.name}</strong>
      <p>${reward.text}</p>
    `;
    card.addEventListener("click", () => chooseReward(reward));
    ui.rewardGrid.append(card);
  }
}

function skipRewardPick() {
  state.rewardPicksRemaining -= 1;
  if (state.rewardPicksRemaining > 0 && state.currentRewards.length > 0) {
    renderLevelRewards();
    return;
  }
  ui.levelUp.classList.add("hidden");
  state.pausedForLevelUp = false;
  if (state.pendingLevelUps > 0) openLevelUp();
}

function needsReplacement(reward) {
  const item = loadoutItems[reward.id];
  if (item) {
    const upgrading = getInventoryEntriesById(reward.id).some((entry) => getItemLevel(entry) < reward.maxLevel);
    return !upgrading && !hasLoadoutSpaceFor(reward.id);
  }
  if (bulletUpgradeIds.has(reward.id)) return !state.bulletUpgrades.includes(reward.id) && !hasBulletSpaceFor(reward.id);
  return false;
}

function renderReplacementChoices(reward) {
  ui.rewardGrid.innerHTML = "";
  const item = loadoutItems[reward.id];
  const loadoutCandidates = item
    ? getLoadoutItemsByKind(item.kind).filter((entry) => getItemId(entry) !== reward.id)
    : [];
  const candidates = item
    ? loadoutCandidates.map((entry) => ({ key: getItemUid(entry), id: getItemId(entry), level: getItemLevel(entry), type: item.kind }))
    : state.bulletUpgrades.filter((id) => id !== reward.id).map((id) => ({ key: id, id, level: getItemLevel(id), type: "bullet" }));
  ui.rewardInfo.textContent = `Choose what ${reward.name} replaces`;

  for (const candidate of candidates) {
    const card = document.createElement("button");
    card.className = "reward";
    const name = loadoutItems[candidate.id]?.name || levelRewards.find((option) => option.id === candidate.id)?.name || candidate.id;
    card.innerHTML = `
      <small>Replace - Level ${candidate.level}</small>
      <strong>${name}</strong>
      <p>${reward.name} will take this slot. The replaced item returns to the reward pool.</p>
    `;
    card.addEventListener("click", () => chooseReward(reward, candidate.key));
    ui.rewardGrid.append(card);
  }
}

function chooseReward(reward, replacementKey = null) {
  if (!replacementKey && needsReplacement(reward)) {
    renderReplacementChoices(reward);
    return;
  }

  const applied = loadoutItems[reward.id]
    ? equipOrUpgradeItem(reward.id, replacementKey)
    : bulletUpgradeIds.has(reward.id)
      ? equipOrUpgradeBullet(reward.id, replacementKey)
      : reward.apply();
  if ((loadoutItems[reward.id] || bulletUpgradeIds.has(reward.id)) && applied === false) return;
  if (!loadoutItems[reward.id] && !bulletUpgradeIds.has(reward.id)) state.rewardLevels[reward.id] += 1;
  state.rewardPicksRemaining -= 1;
  state.currentRewards = state.currentRewards.filter((option) => {
    if (option.id === reward.id) return false;
    const item = loadoutItems[option.id];
    if (item) return canEquipOrReplaceLoadoutItem(option.id);
    if (bulletUpgradeIds.has(option.id)) return canEquipOrReplaceBullet(option.id);
    return true;
  });

  if (state.rewardPicksRemaining > 0 && state.currentRewards.length > 0) {
    renderLevelRewards();
    return;
  }

  ui.levelUp.classList.add("hidden");
  state.pausedForLevelUp = false;
  if (state.pendingLevelUps > 0) openLevelUp();
}

function update(dt, now) {
  state.player.dashCooldown = Math.max(0, state.player.dashCooldown - dt);
  if (!state.running || state.pausedForShop || state.pausedForLevelUp) return;
  const size = worldSize();
  let dx = 0;
  let dy = 0;
  if (!state.settings.afkMode) {
    const direction = currentMoveVector();
    if (keys.has("w") || keys.has("s") || keys.has("a") || keys.has("d")) {
      dx = direction.x;
      dy = direction.y;
    }
  }
  const playerSpeed = getPlayerSpeed();
  state.player.x = clamp(state.player.x + dx * playerSpeed * dt, 20, size.width - 20);
  state.player.y = clamp(state.player.y + dy * playerSpeed * dt, 20, size.height - 20);

  shoot(now);
  updateMines(dt);

  for (const id of Object.keys(state.activePowerups)) {
    state.activePowerups[id] -= dt;
    if (state.activePowerups[id] <= 0) delete state.activePowerups[id];
  }

  if (state.spawnLeft > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = Math.max(0.18, 0.85 - state.wave * 0.025);
    }
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  state.bullets = state.bullets.filter((bullet) => bullet.life > 0);

  for (const bullet of state.bossBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (distance(bullet, state.player) < bullet.radius + state.player.radius) {
      state.player.health -= getIncomingDamage(bullet.damage);
      bullet.life = 0;
      burst(state.player.x, state.player.y, bullet.color, 10);
      if (state.player.health <= 0) endRun();
    }
  }
  state.bossBullets = state.bossBullets.filter((bullet) => bullet.life > 0);

  for (const enemy of state.enemies) {
    if (enemy.burnTime > 0) {
      enemy.health -= enemy.burnDamage * dt;
      enemy.burnTime -= dt;
    }

    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
    enemy.hitCooldown -= dt;

    if (enemy.boss) {
      const bossTier = enemy.bossTier || state.wave / 5;
      enemy.attackTimer -= dt;
      enemy.summonTimer -= dt;
      if (enemy.attackTimer <= 0) {
        bossShoot(enemy);
        enemy.attackTimer = Math.max(0.9, 2.55 - bossTier * 0.13);
      }
      if (enemy.summonTimer <= 0) {
        const summons = state.wave >= 25 ? 2 : 1;
        for (let i = 0; i < summons; i += 1) spawnBossMinion(enemy);
        enemy.summonTimer = Math.max(2.45, 6.1 - bossTier * 0.2);
      }
    }

    if (distance(enemy, state.player) < enemy.radius + state.player.radius && enemy.hitCooldown <= 0) {
      state.player.health -= getIncomingDamage(enemy.damage);
      enemy.hitCooldown = 0.55;
      burst(state.player.x, state.player.y, "#ff5d68", 8);
      if (state.player.health <= 0) endRun();
    }
  }

  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (bullet.hitEnemies.has(enemy)) continue;
      if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
        bullet.hitEnemies.add(enemy);
        enemy.health -= bullet.damage;
        if (bullet.burn) {
          enemy.burnTime = Math.max(enemy.burnTime, 2.6);
          enemy.burnDamage = Math.max(enemy.burnDamage, 7 + bullet.burn * 5 + state.wave * 0.8);
        }
        if (bullet.explosive) explode(bullet.x, bullet.y, 46 + bullet.explosive * 12, bullet.damage * (0.32 + bullet.explosive * 0.08));
        bullet.pierce -= 1;
        if (bullet.pierce < 0) bullet.life = 0;
        burst(bullet.x, bullet.y, "#ffd166", 5);
        break;
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.health > 0) return true;
    state.kills += 1;
    state.money += enemy.worth;
    addExperience(enemy.xp);
    if (state.perks.vampire) {
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 2 + state.perks.vampire * 2);
    }
    burst(enemy.x, enemy.y, "#7cf0b2", 14);
    spawnPowerup(enemy.x, enemy.y, enemy.boss);
    if (enemy.boss && state.wave >= 15) spawnPowerup(enemy.x + 18, enemy.y - 12, true);
    return false;
  });

  if (state.pendingLevelUps > 0) {
    openLevelUp();
    return;
  }

  for (const powerup of state.powerups) {
    powerup.life -= dt;
    powerup.bob += dt * 5;
    if (state.settings.autoCollectPowerups) {
      const pullRange = 260 + state.player.magnet;
      const pullDistance = distance(powerup, state.player);
      if (pullDistance < pullRange && pullDistance > 1) {
        const pullSpeed = 95 + (1 - pullDistance / pullRange) * 220;
        powerup.x += ((state.player.x - powerup.x) / pullDistance) * pullSpeed * dt;
        powerup.y += ((state.player.y - powerup.y) / pullDistance) * pullSpeed * dt;
      }
    }
    if (distance(powerup, state.player) < powerup.radius + state.player.radius + state.player.magnet) {
      powerup.apply();
      powerup.life = 0;
      burst(powerup.x, powerup.y, powerup.color, 12);
    }
  }
  state.powerups = state.powerups.filter((powerup) => powerup.life > 0);

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.enemies.length === 0 && state.spawnLeft === 0) finishWave();
}

function burst(x, y, color, count) {
  const particleCount = state.settings.reduceEffects ? Math.max(1, Math.ceil(count * 0.35)) : count;
  for (let i = 0; i < particleCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.25 + Math.random() * 0.35,
    });
  }
}

function endRun() {
  state.running = false;
  state.pausedForLevelUp = false;
  state.finalScore = calculateScore();
  ui.start.textContent = "Restart Run";
  ui.overlay.querySelector("p").textContent = `Wave ${state.wave} - Score ${state.finalScore} - Kills ${state.kills}`;
  ui.saveScore.classList.remove("hidden");
  ui.levelUp.classList.add("hidden");
  ui.overlay.classList.remove("hidden");
  ui.shop.classList.remove("open");
}

function calculateScore() {
  return Math.floor(state.wave * 1000 + state.kills * 70 + state.level * 250 + state.money);
}

function localLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem("waveboundLeaderboard") || "[]");
  } catch {
    return [];
  }
}

function setLocalLeaderboard(scores) {
  localStorage.setItem("waveboundLeaderboard", JSON.stringify(scores.slice(0, 10)));
}

function normalizeScores(scores) {
  return [...scores]
    .filter((score) => score && score.name && Number.isFinite(Number(score.score)))
    .map((score) => ({ name: String(score.name).slice(0, 16), score: Math.floor(Number(score.score)), wave: Math.floor(Number(score.wave || 0)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function renderLeaderboard(scores = state.leaderboard) {
  state.leaderboard = normalizeScores(scores);
  ui.leaderboardList.innerHTML = "";
  if (state.leaderboard.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No scores yet";
    ui.leaderboardList.append(empty);
  } else {
    for (const score of state.leaderboard) {
      const row = document.createElement("li");
      row.textContent = `${score.name} - ${score.score} (wave ${score.wave})`;
      ui.leaderboardList.append(row);
    }
  }
  ui.leaderboardStatus.textContent = state.leaderboardOnline
    ? "Online leaderboard connected."
    : "Local scores only. Add /api/leaderboard on your website for cross-device scores.";
}

async function loadLeaderboard() {
  const localScores = localLeaderboard();
  renderLeaderboard(localScores);
  if (location.protocol === "file:") return;
  try {
    const response = await fetch(LEADERBOARD_ENDPOINT);
    if (!response.ok) throw new Error("Leaderboard unavailable");
    const scores = await response.json();
    state.leaderboardOnline = true;
    renderLeaderboard(scores);
  } catch {
    state.leaderboardOnline = false;
    renderLeaderboard(localScores);
  }
}

async function saveLeaderboardScore() {
  const name = ui.playerName.value.trim().slice(0, 16) || "Player";
  const score = { name, score: state.finalScore || calculateScore(), wave: state.wave, date: new Date().toISOString() };
  const localScores = normalizeScores([...localLeaderboard(), score]);
  setLocalLeaderboard(localScores);
  ui.saveScore.classList.add("hidden");
  renderLeaderboard(localScores);

  if (location.protocol === "file:") return;
  try {
    const response = await fetch(LEADERBOARD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(score),
    });
    if (!response.ok) throw new Error("Save failed");
    state.leaderboardOnline = true;
    const scores = await response.json();
    renderLeaderboard(scores);
  } catch {
    state.leaderboardOnline = false;
    renderLeaderboard(localScores);
  }
}

function drawGrid(size) {
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x < size.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size.height);
    ctx.stroke();
  }
  for (let y = 0; y < size.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size.width, y);
    ctx.stroke();
  }
}

function drawEnemy(enemy) {
  const healthRatio = enemy.health / enemy.maxHealth;
  ctx.fillStyle = enemy.color;

  if (enemy.shape === "polygon") {
    drawPolygon(enemy.x, enemy.y, enemy.radius, enemy.polygonSides, -Math.PI / 2, true);
  } else if (enemy.shape === "triangle") {
    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius * 1.25);
    ctx.lineTo(enemy.radius * 1.05, enemy.radius * 0.85);
    ctx.lineTo(-enemy.radius * 1.05, enemy.radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (enemy.shape === "square") {
    const side = enemy.radius * 1.75;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-side / 2, -side / 2, side, side);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  const barWidth = enemy.boss ? enemy.radius * 2.5 : enemy.radius * 2;
  const barHeight = enemy.boss ? 7 : 4;
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 14, barWidth, barHeight);
  ctx.fillStyle = "#7cf0b2";
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 14, barWidth * healthRatio, barHeight);
  if (enemy.burnTime > 0) {
    ctx.strokeStyle = "rgba(255,159,67,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPowerup(powerup) {
  const floatY = Math.sin(powerup.bob) * 3;
  ctx.save();
  ctx.translate(powerup.x, powerup.y + floatY);
  ctx.fillStyle = powerup.color;
  ctx.shadowColor = powerup.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#101316";
  ctx.font = "900 13px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(powerup.label, 0, 0.5);
  ctx.restore();
}

function drawPolygon(x, y, radius, sides, rotation, stroke) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.stroke();
  }
}

function draw() {
  const size = worldSize();
  ctx.clearRect(0, 0, size.width, size.height);
  drawGrid(size);

  if (state.pausedForShop) {
    drawWaveCleared(size);
    drawInventorySlots(size);
    return;
  }

  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.life * 2.4, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const bullet of state.bullets) {
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const bullet of state.bossBullets) {
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  for (const mine of state.mines) {
    drawMine(mine);
  }

  for (const powerup of state.powerups) {
    drawPowerup(powerup);
  }

  const aim = state.pausedForShop ? 0 : Math.atan2(mouse.y - state.player.y, mouse.x - state.player.x);
  if (state.settings.showAimLine) {
    ctx.save();
    ctx.strokeStyle = "rgba(124,240,178,0.34)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
    ctx.restore();
  }

  drawPlayerGearEffects();

  ctx.save();
  ctx.translate(state.player.x, state.player.y);
  ctx.rotate(aim);
  if (state.activePowerups.shield) {
    ctx.rotate(-aim);
    ctx.strokeStyle = "rgba(155,140,255,0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(aim);
  }
  ctx.fillStyle = "#72c7ff";
  ctx.beginPath();
  ctx.roundRect(-18, -14, 36, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#f3f6f4";
  ctx.fillRect(6, -5, 28, 10);
  const equippedTurret = state.inventory.find((item) => ["turret", "rocketTurret", "frostTurret"].includes(getItemId(item)));
  if (equippedTurret) {
    ctx.rotate(-aim);
    drawItemIcon(getItemId(equippedTurret), 2, -23, 24, getItemLevel(equippedTurret));
  }
  ctx.restore();

  drawInventorySlots(size);
  drawActivePowerups();
}

function drawWaveCleared(size) {
  ctx.fillStyle = "rgba(9, 12, 13, 0.62)";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.fillStyle = "#f3f6f4";
  ctx.font = "800 30px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Wave cleared", size.width / 2, size.height / 2 - 16);
  ctx.font = "700 16px Inter, system-ui";
  ctx.fillStyle = "#c8d2cd";
  ctx.fillText("Buy upgrades, then start the next wave.", size.width / 2, size.height / 2 + 18);
}

function drawMine(mine) {
  ctx.save();
  ctx.translate(mine.x, mine.y);
  ctx.fillStyle = mine.arm > 0 ? "#69736f" : "#ffd166";
  ctx.strokeStyle = "rgba(255,255,255,0.56)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, mine.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlayerGearEffects() {
  const ringItem = getEquippedItem("fireRing");
  const ringLevel = getItemLevel(ringItem);
  if (ringLevel) {
    const radius = 54 + ringLevel * 18;
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    ctx.strokeStyle = "rgba(255,159,67,0.58)";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff9f43";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([10, 12]);
    ctx.rotate(performance.now() * 0.002);
    ctx.strokeStyle = "rgba(255,209,102,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawItemIcon(id, x, y, size, level = 0) {
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#f3f6f4";
  ctx.fillStyle = "#f3f6f4";
  ctx.lineWidth = Math.max(2, size * 0.08);

  if (id === "pistol") {
    ctx.fillRect(-half * 0.55, -half * 0.12, half * 0.85, half * 0.24);
    ctx.fillRect(-half * 0.15, half * 0.08, half * 0.26, half * 0.42);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(half * 0.2, -half * 0.07, half * 0.42, half * 0.14);
  } else if (id === "shotgun") {
    ctx.strokeStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(-half * 0.62, 0);
    ctx.lineTo(half * 0.62, -half * 0.22);
    ctx.moveTo(-half * 0.56, half * 0.18);
    ctx.lineTo(half * 0.66, half * 0.14);
    ctx.stroke();
  } else if (id === "sniper") {
    ctx.strokeStyle = "#72c7ff";
    ctx.beginPath();
    ctx.moveTo(-half * 0.72, 0);
    ctx.lineTo(half * 0.78, 0);
    ctx.moveTo(-half * 0.18, -half * 0.22);
    ctx.lineTo(half * 0.28, -half * 0.22);
    ctx.stroke();
  } else if (id === "smg") {
    ctx.fillStyle = "#7cf0b2";
    ctx.fillRect(-half * 0.6, -half * 0.16, half * 1.05, half * 0.32);
    ctx.fillRect(-half * 0.18, half * 0.12, half * 0.18, half * 0.45);
  } else if (id === "burst") {
    ctx.strokeStyle = "#9b8cff";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-half * 0.58, i * half * 0.18);
      ctx.lineTo(half * 0.58, i * half * 0.18);
      ctx.stroke();
    }
  } else if (id === "assault") {
    ctx.fillStyle = "#72c7ff";
    ctx.fillRect(-half * 0.62, -half * 0.15, half * 0.95, half * 0.3);
    ctx.fillStyle = "#f3f6f4";
    ctx.fillRect(-half * 0.18, half * 0.1, half * 0.2, half * 0.42);
    ctx.strokeStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(half * 0.32, 0);
    ctx.lineTo(half * 0.72, 0);
    ctx.stroke();
  } else if (id === "repeater") {
    ctx.strokeStyle = "#7cf0b2";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-half * 0.64, i * half * 0.15);
      ctx.lineTo(half * 0.7, i * half * 0.15);
      ctx.stroke();
    }
    ctx.fillStyle = "#f3f6f4";
    ctx.fillRect(-half * 0.52, half * 0.22, half * 0.32, half * 0.18);
  } else if (id === "marksman") {
    ctx.strokeStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(-half * 0.72, 0);
    ctx.lineTo(half * 0.74, 0);
    ctx.moveTo(-half * 0.38, half * 0.2);
    ctx.lineTo(half * 0.05, half * 0.2);
    ctx.moveTo(half * 0.18, -half * 0.22);
    ctx.lineTo(half * 0.46, -half * 0.22);
    ctx.stroke();
  } else if (id === "scatterLaser") {
    ctx.strokeStyle = "#e875ff";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-half * 0.58, 0);
      ctx.lineTo(half * 0.66, i * half * 0.28);
      ctx.stroke();
    }
    ctx.fillStyle = "#72c7ff";
    ctx.beginPath();
    ctx.arc(-half * 0.52, 0, half * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "cannon") {
    ctx.fillStyle = "#ff8a8f";
    ctx.beginPath();
    ctx.roundRect(-half * 0.58, -half * 0.24, half * 1.05, half * 0.48, size * 0.12);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(half * 0.52, 0, half * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "minigun") {
    ctx.strokeStyle = "#f3f6f4";
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-half * 0.62, i * half * 0.12);
      ctx.lineTo(half * 0.62, i * half * 0.12);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-half * 0.72, -half * 0.22, half * 0.22, half * 0.44);
  } else if (id === "mines") {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#101316";
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === "turret") {
    ctx.fillStyle = "#4dd7ff";
    ctx.beginPath();
    ctx.arc(-half * 0.14, 0, half * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, -half * 0.1, half * 0.58, half * 0.2);
    ctx.strokeStyle = "#f3f6f4";
    ctx.beginPath();
    ctx.moveTo(-half * 0.16, half * 0.28);
    ctx.lineTo(-half * 0.48, half * 0.58);
    ctx.moveTo(-half * 0.16, half * 0.28);
    ctx.lineTo(half * 0.22, half * 0.58);
    ctx.stroke();
  } else if (id === "rocketTurret") {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(-half * 0.18, 0, half * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a8f";
    ctx.beginPath();
    ctx.roundRect(0, -half * 0.17, half * 0.68, half * 0.34, size * 0.08);
    ctx.fill();
  } else if (id === "frostTurret") {
    ctx.fillStyle = "#72c7ff";
    ctx.beginPath();
    ctx.arc(-half * 0.12, 0, half * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f3f6f4";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(half * 0.66, 0);
    ctx.moveTo(half * 0.38, -half * 0.22);
    ctx.lineTo(half * 0.62, 0);
    ctx.lineTo(half * 0.38, half * 0.22);
    ctx.stroke();
  } else if (id === "fireRing") {
    ctx.strokeStyle = "#ff9f43";
    ctx.lineWidth = Math.max(3, size * 0.11);
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.65);
    ctx.lineTo(half * 0.18, -half * 0.22);
    ctx.lineTo(-half * 0.08, -half * 0.32);
    ctx.closePath();
    ctx.fill();
  } else if (id === "burn") {
    ctx.fillStyle = "#ff9f43";
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.72);
    ctx.bezierCurveTo(half * 0.5, -half * 0.2, half * 0.22, half * 0.58, 0, half * 0.62);
    ctx.bezierCurveTo(-half * 0.48, half * 0.34, -half * 0.3, -half * 0.18, 0, -half * 0.72);
    ctx.fill();
  } else if (id === "explosive") {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const radius = i % 2 ? half * 0.28 : half * 0.62;
      const angle = -Math.PI / 2 + (i / 8) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  } else if (id === "ricochet") {
    ctx.strokeStyle = "#7cf0b2";
    ctx.beginPath();
    ctx.moveTo(-half * 0.6, half * 0.42);
    ctx.lineTo(half * 0.2, -half * 0.38);
    ctx.lineTo(half * 0.56, -half * 0.08);
    ctx.moveTo(half * 0.2, -half * 0.38);
    ctx.lineTo(half * 0.18, half * 0.12);
    ctx.stroke();
  }

  if (level > 0) {
    ctx.fillStyle = "#101316";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half * 0.58, half * 0.55, half * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f3f6f4";
    ctx.font = `900 ${Math.max(9, size * 0.26)}px Inter, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(level, half * 0.58, half * 0.56);
  }
  ctx.restore();
}

function drawInventorySlot(id, x, y, size, type, locked = false) {
  const filled = Boolean(id);
  const level = filled ? getItemLevel(id) : 0;
  const itemId = filled ? getItemId(id) : "";
  const maxLevel = filled ? levelRewards.find((reward) => reward.id === itemId)?.maxLevel || loadoutItems[itemId]?.maxLevel || 1 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = filled ? "rgba(27,33,37,0.92)" : locked ? "rgba(27,33,37,0.34)" : "rgba(27,33,37,0.68)";
  ctx.strokeStyle = type === "gun" ? "rgba(114,199,255,0.72)" : type === "gear" ? "rgba(255,209,102,0.72)" : "rgba(124,240,178,0.72)";
  ctx.lineWidth = filled ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, 8);
  ctx.fill();
  ctx.stroke();
  if (filled) {
    drawItemIcon(itemId, 0, -5, size * 0.58, level);
    const pipCount = Math.min(maxLevel, 5);
    const pipGap = size * 0.08;
    const pipWidth = Math.min(8, (size - pipGap * (pipCount + 1)) / pipCount);
    const startX = -(pipCount * pipWidth + (pipCount - 1) * pipGap) / 2;
    for (let i = 0; i < pipCount; i += 1) {
      ctx.fillStyle = i < level ? "#ffd166" : "rgba(243,246,244,0.18)";
      ctx.beginPath();
      ctx.roundRect(startX + i * (pipWidth + pipGap), size * 0.29, pipWidth, 4, 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f3f6f4";
    ctx.font = `900 ${Math.max(8, size * 0.18)}px Inter, system-ui`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`LV${level}`, -size / 2 + 5, -size / 2 + 4);
  } else {
    ctx.fillStyle = locked ? "rgba(243,246,244,0.18)" : "rgba(243,246,244,0.32)";
    ctx.font = `900 ${size * 0.38}px Inter, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type === "gun" ? "G" : type === "gear" ? "U" : "B", 0, 1);
  }
  ctx.restore();
}

function getInventorySlotLayout(size) {
  const guns = state.inventory.filter((item) => loadoutItems[getItemId(item)].kind === "gun");
  const gear = state.inventory.filter((item) => loadoutItems[getItemId(item)].kind === "gear");
  const bulletMods = state.bulletUpgrades;
  const totalSlots = state.gunSlots + state.gearSlots + state.bulletSlots;
  const gap = size.width < 520 ? 6 : 8;
  const groupGap = size.width < 520 ? 10 : 18;
  const availableWidth = Math.max(220, size.width - 28);
  const maxSlotSize = (availableWidth - (totalSlots - 1) * gap - groupGap * 2) / totalSlots;
  const slotSize = Math.floor(clamp(maxSlotSize, 34, 48));
  const totalWidth = totalSlots * slotSize + (totalSlots - 1) * gap + groupGap * 2;
  let x = size.width / 2 - totalWidth / 2 + slotSize / 2;
  const y = size.height - slotSize / 2 - (size.width < 520 ? 58 : 14);
  const locked = !state.inventoryUnlocked;
  const slots = [];

  for (let i = 0; i < state.gunSlots; i += 1) {
    slots.push({ id: guns[i], x, y, size: slotSize, type: "gun", locked: locked && !guns[i] });
    x += slotSize + gap;
  }
  x += groupGap - gap;
  for (let i = 0; i < state.gearSlots; i += 1) {
    slots.push({ id: gear[i], x, y, size: slotSize, type: "gear", locked });
    x += slotSize + gap;
  }
  x += groupGap - gap;
  for (let i = 0; i < state.bulletSlots; i += 1) {
    slots.push({ id: bulletMods[i], x, y, size: slotSize, type: "bullet", locked });
    x += slotSize + gap;
  }

  return { slots, slotSize, totalWidth, y };
}

function getHotbarItemInfo(id, type) {
  const itemId = getItemId(id);
  const reward = levelRewards.find((option) => option.id === itemId);
  const item = loadoutItems[itemId];
  const maxLevel = reward?.maxLevel || item?.maxLevel || 1;
  const typeName = type === "gun" ? "Gun" : type === "gear" ? "Utility" : "Bullet effect";
  return {
    name: item?.name || reward?.name || "Unknown",
    typeName,
    level: getItemLevel(id),
    maxLevel,
  };
}

function drawHotbarTooltip(size, slots) {
  if (!state.settings.hotbarTooltips) return;
  const hovered = slots.find(
    (slot) =>
      slot.id &&
      mouse.x >= slot.x - slot.size / 2 &&
      mouse.x <= slot.x + slot.size / 2 &&
      mouse.y >= slot.y - slot.size / 2 &&
      mouse.y <= slot.y + slot.size / 2,
  );
  if (!hovered) return;

  const info = getHotbarItemInfo(hovered.id, hovered.type);
  const title = info.name;
  const detail = `${info.typeName} - Level ${info.level}/${info.maxLevel}`;
  const padding = 10;
  ctx.save();
  ctx.font = "900 13px Inter, system-ui";
  const width = Math.max(ctx.measureText(title).width, ctx.measureText(detail).width) + padding * 2;
  const height = 48;
  let x = clamp(mouse.x + 14, 8, size.width - width - 8);
  let y = mouse.y - height - 14;
  if (y < 8) y = mouse.y + 16;

  ctx.fillStyle = "rgba(16,19,22,0.94)";
  ctx.strokeStyle =
    hovered.type === "gun" ? "rgba(114,199,255,0.78)" : hovered.type === "gear" ? "rgba(255,209,102,0.78)" : "rgba(124,240,178,0.78)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f3f6f4";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, x + padding, y + 8);
  ctx.font = "800 11px Inter, system-ui";
  ctx.fillStyle = "#98a39c";
  ctx.fillText(detail, x + padding, y + 28);
  ctx.restore();
}

function drawInventorySlots(size) {
  const layout = getInventorySlotLayout(size);

  ctx.save();
  ctx.fillStyle = "rgba(16,19,22,0.54)";
  ctx.beginPath();
  ctx.roundRect(size.width / 2 - layout.totalWidth / 2 - 10, layout.y - layout.slotSize / 2 - 10, layout.totalWidth + 20, layout.slotSize + 20, 8);
  ctx.fill();

  for (const slot of layout.slots) drawInventorySlot(slot.id, slot.x, slot.y, slot.size, slot.type, slot.locked);
  ctx.restore();
  drawHotbarTooltip(size, layout.slots);
}

function drawActivePowerups() {
  const active = Object.entries(state.activePowerups);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "800 12px Inter, system-ui";

  active.forEach(([id, time], index) => {
    const type = powerupTypes.find((powerup) => powerup.id === id);
    const x = 14;
    const y = 44 + index * 24;
    ctx.fillStyle = "rgba(16,19,22,0.78)";
    ctx.beginPath();
    ctx.roundRect(x, y - 10, 130, 18, 6);
    ctx.fill();
    ctx.fillStyle = type.color;
    ctx.fillRect(x + 4, y - 6, clamp(time / (type.duration || 1), 0, 1) * 72, 10);
    ctx.fillStyle = "#f3f6f4";
    ctx.fillText(type.name, x + 82, y);
  });
  ctx.restore();
}

function updateHud() {
  ui.wave.textContent = state.wave;
  ui.enemies.textContent = state.enemies.length + state.spawnLeft;
  ui.money.textContent = `$${Math.floor(state.money)}`;
  ui.health.textContent = `${Math.max(0, Math.ceil(state.player.health))}/${state.player.maxHealth}`;
  ui.level.textContent = state.level;
  ui.xp.textContent = `${Math.floor(state.xp)}/${state.xpToNext} XP`;
}

function upgradeCost(upgrade) {
  return Math.floor(upgrade.base * upgrade.scale ** state.levels[upgrade.id]);
}

function isShopUpgradeLocked(upgrade) {
  return ["gunSlot", "gearSlot", "bulletSlot"].includes(upgrade.id) && !state.inventoryUnlocked;
}

function isShopUpgradeCapped(upgrade) {
  return Boolean(upgrade.maxLevel && state.levels[upgrade.id] >= upgrade.maxLevel);
}

function canBuyShopUpgrade(upgrade) {
  return !isShopUpgradeLocked(upgrade) && !isShopUpgradeCapped(upgrade) && state.money >= upgradeCost(upgrade);
}

function canAffordAnyShopUpgrade() {
  return upgrades.some((upgrade) => canBuyShopUpgrade(upgrade));
}

function maybeAutoStartWave() {
  if (!state.running || !state.pausedForShop) return;
  const shouldAutoStart = () =>
    state.settings.afkMode || (state.settings.autoStartWhenBroke && !canAffordAnyShopUpgrade());
  if (!shouldAutoStart()) return;
  window.setTimeout(() => {
    if (state.running && state.pausedForShop && shouldAutoStart()) {
      beginWave();
    }
  }, state.settings.afkMode ? 900 : 450);
}

function renderShop() {
  ui.shopGrid.innerHTML = "";
  for (const upgrade of upgrades) {
    const level = state.levels[upgrade.id];
    const cost = upgradeCost(upgrade);
    const capped = isShopUpgradeCapped(upgrade);
    const locked = isShopUpgradeLocked(upgrade);
    const card = document.createElement("article");
    card.className = "upgrade";
    card.innerHTML = `
      <small>Level ${level}${upgrade.maxLevel ? `/${upgrade.maxLevel}` : ""}</small>
      <h2>${upgrade.name}</h2>
      <p>${upgrade.text} <strong>${upgrade.value()}</strong></p>
      <button ${locked || capped || state.money < cost ? "disabled" : ""}>${locked ? "Unlocks after wave 5" : capped ? "Maxed" : `Buy $${cost}`}</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      if (locked || capped || state.money < cost) return;
      state.money -= cost;
      state.levels[upgrade.id] += 1;
      upgrade.apply();
      renderShop();
      maybeAutoStartWave();
      updateHud();
    });
    ui.shopGrid.append(card);
  }
}

function ensureRunStarted() {
  if (!state.running) startRun();
}

function setLateGameBuild() {
  const lateLevels = {
    damage: 8,
    fireRate: 7,
    range: 5,
    speed: 5,
    maxHealth: 6,
    armor: 4,
    magnet: 4,
    rewardOptions: 2,
    rewardPicks: 1,
    gunSlot: 3,
    gearSlot: 3,
    bulletSlot: 2,
  };
  const lateRewards = {
    shotgun: 3,
    assault: 3,
    marksman: 3,
    repeater: 3,
    minigun: 2,
    mines: 3,
    turret: 3,
    rocketTurret: 2,
    fireRing: 3,
    burn: 4,
    explosive: 3,
    ricochet: 3,
    overclock: 4,
    vampire: 2,
    focus: 6,
    vitality: 5,
  };

  Object.assign(state, {
    wave: 30,
    money: 4500,
    xp: 0,
    level: 24,
    xpToNext: xpNeededForLevel(24),
    kills: 420,
    pendingLevelUps: 0,
    rewardOptionBonus: lateLevels.rewardOptions,
    rewardPickBonus: lateLevels.rewardPicks,
    rewardPicksRemaining: 0,
    currentRewards: [],
    rewardLevels: createRewardLevels(),
    nextItemUid: 100,
    inventoryUnlocked: true,
    gunSlots: 2 + lateLevels.gunSlot,
    gearSlots: 1 + lateLevels.gearSlot,
    bulletSlots: 3 + lateLevels.bulletSlot,
    inventory: [
      { uid: "shotgun-late", id: "shotgun", level: 3 },
      { uid: "assault-late", id: "assault", level: 3 },
      { uid: "marksman-late", id: "marksman", level: 3 },
      { uid: "repeater-late", id: "repeater", level: 3 },
      { uid: "minigun-late", id: "minigun", level: 2 },
      { uid: "mines-late", id: "mines", level: 3 },
      { uid: "turret-late", id: "turret", level: 3 },
      { uid: "rocketTurret-late", id: "rocketTurret", level: 2 },
      { uid: "fireRing-late", id: "fireRing", level: 3 },
    ],
    bulletUpgrades: ["burn", "explosive", "ricochet"],
    itemCooldowns: {},
    perks: {
      burn: lateRewards.burn,
      explosive: lateRewards.explosive,
      mines: lateRewards.mines,
      vampire: lateRewards.vampire,
      ricochet: lateRewards.ricochet,
      overclock: lateRewards.overclock,
      turret: lateRewards.turret,
      rocketTurret: lateRewards.rocketTurret,
      frostTurret: 0,
      fireRing: lateRewards.fireRing,
    },
    bullets: [],
    bossBullets: [],
    enemies: [],
    mines: [],
    powerups: [],
    activePowerups: {},
    particles: [],
  });

  for (const upgrade of upgrades) state.levels[upgrade.id] = lateLevels[upgrade.id] || 0;
  for (const [id, level] of Object.entries(lateRewards)) state.rewardLevels[id] = level;

  Object.assign(state.player, {
    x: worldSize().width / 2,
    y: worldSize().height / 2,
    speed: 420,
    health: 345,
    maxHealth: 345,
    damage: 120,
    fireDelay: 116,
    range: 1.8,
    lastShot: 0,
    dashCooldown: 0,
    armor: 0.24,
    magnet: 90,
    mineTimer: 0,
    turretTimer: 0,
    rocketTurretTimer: 0,
    frostTurretTimer: 0,
    ringTimer: 0,
  });

  setAfkMode(false);
  state.pausedForShop = false;
  state.pausedForLevelUp = false;
  ui.levelUp.classList.add("hidden");
  ui.shop.classList.remove("open");
  beginWave();
}

function devAction(action) {
  ensureRunStarted();

  if (action === "money") {
    state.money += 1000;
    renderShop();
  }

  if (action === "xp") {
    addExperience(state.xpToNext);
    if (state.pendingLevelUps > 0 && !state.pausedForLevelUp) openLevelUp();
  }

  if (action === "level" && !state.pausedForLevelUp) {
    state.level += 1;
    state.pendingLevelUps += 1;
    openLevelUp();
  }

  if (action === "shop") {
    finishWave();
  }

  if (action === "boss") {
    state.wave = Math.max(5, Math.ceil(state.wave / 5) * 5);
    state.pausedForShop = false;
    state.pausedForLevelUp = false;
    ui.levelUp.classList.add("hidden");
    beginWave();
  }

  if (action === "late") {
    setLateGameBuild();
  }

  if (action === "clear") {
    state.enemies = [];
    state.spawnLeft = 0;
    finishWave();
  }

  if (action === "heal") {
    state.player.health = state.player.maxHealth;
  }

  updateHud();
}

function unlockDevTools() {
  if (ui.devPassword.value === "08-27-10") {
    ui.devLock.classList.add("hidden");
    ui.devActions.classList.remove("hidden");
    ui.devError.textContent = "";
    return;
  }

  ui.devError.textContent = "Wrong password";
  ui.devPassword.value = "";
  ui.devPassword.focus();
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(dt, now);
  updateHud();
  draw();
  requestAnimationFrame(loop);
}

function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable;
}

function gameKey(event) {
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") return "shift";
  if (event.code?.startsWith("Key")) return event.code.slice(3).toLowerCase();
  return event.key.toLowerCase();
}

function setAfkMode(enabled) {
  state.settings.afkMode = enabled;
  ui.afkMode.checked = enabled;
  keys.clear();
  mouse.down = false;
  maybeAutoStartWave();
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (isTypingTarget(event.target)) return;
  const key = gameKey(event);
  if (["w", "a", "s", "d", "r", "shift"].includes(key)) event.preventDefault();
  if (key === "r" && !event.repeat) {
    setAfkMode(!state.settings.afkMode);
    return;
  }
  if (key === "shift" && !event.repeat) {
    dashPlayer();
    return;
  }
  keys.add(key);
});
window.addEventListener("keyup", (event) => {
  if (isTypingTarget(event.target)) return;
  const key = gameKey(event);
  if (["w", "a", "s", "d", "r", "shift"].includes(key)) event.preventDefault();
  keys.delete(key);
});
canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
});
canvas.addEventListener("mousedown", () => (mouse.down = true));
window.addEventListener("mouseup", () => (mouse.down = false));
ui.start.addEventListener("click", startRun);
ui.saveScore.addEventListener("click", saveLeaderboardScore);
ui.skipReward.addEventListener("click", skipRewardPick);
ui.nextWave.addEventListener("click", beginWave);
ui.settingsToggle.addEventListener("click", () => {
  ui.settingsPanel.classList.toggle("hidden");
});
ui.autoStartBroke.addEventListener("change", () => {
  state.settings.autoStartWhenBroke = ui.autoStartBroke.checked;
  maybeAutoStartWave();
});
ui.afkMode.addEventListener("change", () => setAfkMode(ui.afkMode.checked));
ui.autoCollectPowerups.addEventListener("change", () => {
  state.settings.autoCollectPowerups = ui.autoCollectPowerups.checked;
});
ui.showAimLine.addEventListener("change", () => {
  state.settings.showAimLine = ui.showAimLine.checked;
});
ui.reduceEffects.addEventListener("change", () => {
  state.settings.reduceEffects = ui.reduceEffects.checked;
});
ui.hotbarTooltips.addEventListener("change", () => {
  state.settings.hotbarTooltips = ui.hotbarTooltips.checked;
});
ui.devToggle.addEventListener("click", () => {
  ui.devPanel.classList.toggle("hidden");
  if (!ui.devPanel.classList.contains("hidden") && ui.devActions.classList.contains("hidden")) {
    ui.devPassword.focus();
  }
});
ui.devUnlock.addEventListener("click", unlockDevTools);
ui.devPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") unlockDevTools();
});
ui.devActions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-dev]");
  if (!button) return;
  devAction(button.dataset.dev);
});

resizeCanvas();
renderShop();
updateHud();
loadLeaderboard();
requestAnimationFrame(loop);
