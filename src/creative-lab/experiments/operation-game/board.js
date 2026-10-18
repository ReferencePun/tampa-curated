import { channelPolygon } from "./model.js";
export const OBJECTS = [
  {
    name: "Tangled thought",
    kind: "knot",
    color: "#b27439",
    note: "Thinking about thinking again.",
  },
  {
    name: "Spare butterfly",
    kind: "butterfly",
    color: "#d9765b",
    note: "An uninvited flutter of nerves.",
  },
  {
    name: "Midnight biscuit",
    kind: "biscuit",
    color: "#be974d",
    note: "For emergencies after eleven.",
  },
  {
    name: "Pocket thunder",
    kind: "cloud",
    color: "#62859a",
    note: "A very small grudge.",
  },
  {
    name: "Lost marbles",
    kind: "marbles",
    color: "#51877c",
    note: "Three of them. At last.",
  },
  {
    name: "Dancing screw",
    kind: "screw",
    color: "#9b7169",
    note: "One foot keeps tapping.",
  },
];
const routes = [
  [
    [315, 278],
    [345, 260],
    [386, 265],
    [413, 289],
  ],
  [
    [486, 316],
    [520, 336],
    [535, 377],
    [506, 399],
  ],
  [
    [334, 397],
    [368, 372],
    [400, 390],
    [419, 428],
  ],
  [
    [271, 457],
    [256, 494],
    [287, 526],
    [322, 520],
  ],
  [
    [383, 520],
    [414, 536],
    [430, 569],
    [406, 598],
  ],
  [
    [514, 520],
    [543, 548],
    [534, 589],
    [498, 602],
  ],
];
export function createBoard(config, seed = 1) {
  const order = [0, 1, 2, 3, 4, 5];
  let s = seed >>> 0;
  const random = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
  if (config.mode === "silly")
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  const width = { gentle: 54, steady: 44, expert: 34 }[config.difficulty];
  return {
    width: 900,
    height: 720,
    name: "Milo",
    cavities: routes.slice(0, config.objectCount).map((r, i) => {
      const path = r.map(([x, y]) => ({ x, y })),
        item = OBJECTS[order[i]];
      return {
        ...item,
        id: "cavity-" + i,
        path,
        polygon: channelPolygon(path, width),
        width,
        start: path[0],
        exit: path.at(-1),
        exitRadius: 9,
        radius: 8,
      };
    }),
    rules: { points: 100, penalty: 25, strikes: 3 },
  };
}
