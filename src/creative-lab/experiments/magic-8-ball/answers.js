/** Original answer collections. Replace or extend these in another application. */
export const ANSWER_SETS = {
  classic: {
    name: "Yes / no / perhaps",
    description: "For questions with a fork in the road.",
    answers: [
      ["yes", "Yes. Make a little room for it."],
      ["yes", "The odds lean your way."],
      ["yes", "Take the next small step."],
      ["yes", "A quiet but definite yes."],
      ["no", "Not this time."],
      ["no", "Let this one pass."],
      ["no", "The answer leans away."],
      ["no", "Choose a different door."],
      ["maybe", "There is more to discover."],
      ["maybe", "Ask after a little distance."],
      ["maybe", "Leave room for a surprise."],
      ["maybe", "Not yet. Let it settle."],
    ],
  },
  poetic: {
    name: "Poetic & mysterious",
    description: "A thought to carry away, rather than a verdict.",
    answers: [
      ["maybe", "The door opens inward."],
      ["yes", "Follow the quiet current."],
      ["maybe", "A small light is still a light."],
      ["no", "Do not water a painted flower."],
      ["yes", "The tide remembers the shore."],
      ["maybe", "Listen where the noise ends."],
      ["yes", "Something is taking root."],
      ["no", "Leave one stone unturned."],
      ["maybe", "The moon has not finished its sentence."],
      ["yes", "An opening is also an answer."],
      ["maybe", "Let the silence change shape."],
      ["no", "You cannot hurry the fog."],
    ],
  },
  absurd: {
    name: "Beautifully absurd",
    description: "An unusually unqualified advisory committee.",
    answers: [
      ["yes", "The committee of moths approves."],
      ["maybe", "Consult the nearest houseplant."],
      ["yes", "Yes, but wear your imaginary cape."],
      ["no", "The moon misplaced the paperwork."],
      ["maybe", "Ask a pigeon with a briefcase."],
      ["yes", "Your future has excellent snacks."],
      ["no", "The tiny wizard is on lunch."],
      ["maybe", "Have you tried being a fern?"],
      ["yes", "Proceed at the speed of soup."],
      ["no", "The council of spoons objects."],
      ["maybe", "Mercury is in the stationery cupboard."],
      ["yes", "A very small trumpet says yes."],
    ],
  },
  creative: {
    name: "Creative provocations",
    description: "A little nudge for a thing you are making.",
    answers: [
      ["prompt", "Remove one thing. Make the absence useful."],
      ["prompt", "Borrow a rule from the sea."],
      ["prompt", "Make the smallest part enormous."],
      ["prompt", "Let a mistake become the pattern."],
      ["prompt", "Begin with the part you keep avoiding."],
      ["prompt", "Use only what is within reach."],
      ["prompt", "Draw the sound it would make."],
      ["prompt", "Give an ordinary object a secret."],
      ["prompt", "Try the opposite, very gently."],
      ["prompt", "Leave one edge unfinished."],
      ["prompt", "Make a version that fits in your pocket."],
      ["prompt", "Let two unrelated ideas share a room."],
    ],
  },
};
export const DEFAULTS = {
  answerSet: "poetic",
  intensity: 1,
  opacity: 0.65,
  revealSpeed: 1,
  color: "#315c66",
  lightAngle: 315,
  lighting: 1,
  autoShake: false,
  interval: 14,
  seed: 32,
};
export const PRESETS = {
  tide: { name: "01 · The quiet tide", settings: { ...DEFAULTS } },
  velvet: {
    name: "02 · Velvet oracle",
    settings: {
      ...DEFAULTS,
      color: "#544065",
      opacity: 0.8,
      revealSpeed: 0.75,
      lighting: 1.2,
      lightAngle: 300,
    },
  },
  brass: {
    name: "03 · The yes / no machine",
    settings: {
      ...DEFAULTS,
      answerSet: "classic",
      color: "#766044",
      opacity: 0.5,
      revealSpeed: 1.25,
      seed: 107,
    },
  },
  absurd: {
    name: "04 · A very small wizard",
    settings: {
      ...DEFAULTS,
      answerSet: "absurd",
      color: "#755250",
      intensity: 1.4,
      revealSpeed: 1.15,
      seed: 805,
    },
  },
  studio: {
    name: "05 · A nudge for the studio",
    settings: {
      ...DEFAULTS,
      answerSet: "creative",
      color: "#3a4f7d",
      opacity: 0.55,
      lighting: 1.1,
      seed: 314,
    },
  },
};
export function hash(v) {
  let n = v >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function stringHash(s) {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function validateSets(sets) {
  if (
    !sets ||
    typeof sets !== "object" ||
    !Object.keys(sets).length ||
    Object.keys(sets).length > 20
  )
    throw Error("Provide between one and twenty answer sets.");
  for (const [id, set] of Object.entries(sets)) {
    if (
      !/^[a-z0-9-]{1,40}$/.test(id) ||
      typeof set.name !== "string" ||
      set.name.length > 80 ||
      !Array.isArray(set.answers) ||
      set.answers.length < 2 ||
      set.answers.length > 100 ||
      set.answers.some(
        (a) =>
          !Array.isArray(a) ||
          !["yes", "no", "maybe", "prompt"].includes(a[0]) ||
          typeof a[1] !== "string" ||
          !a[1].trim() ||
          a[1].length > 110,
      )
    )
      throw Error(
        "Each answer set needs 2–100 short original answers with a valid tone.",
      );
  }
  return sets;
}
/** Seeded shuffle bags: no immediate repeats, every answer appears once per cycle. */
export class AnswerEngine {
  constructor(seed = 32, sets = ANSWER_SETS) {
    this.sets = validateSets(sets);
    this.reset(seed);
  }
  reset(seed) {
    this.seed = Math.max(1, Math.min(9999, Math.round(seed) || 32));
    this.draws = {};
  }
  next(mode) {
    const set = this.sets[mode];
    if (!set) throw Error("Unknown answer set.");
    const count = this.draws[mode] || 0,
      n = set.answers.length,
      cycle = Math.floor(count / n),
      slot = count % n,
      offset = Math.floor(hash(this.seed ^ stringHash(mode)) * n);
    let ids = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(
        hash(this.seed + stringHash(mode) + i * 991) * (i + 1),
      );
      [ids[i], ids[j]] = [ids[j], ids[i]];
    } // Rotate the fixed bag between cycles, while preserving a different boundary answer.
    const index = ids[(slot + offset + cycle * (n > 2 ? 1 : 0)) % n],
      answer = set.answers[index];
    this.draws[mode] = count + 1;
    return {
      id: `${mode}-${index}`,
      mode,
      setName: set.name,
      tone: answer[0],
      text: answer[1],
      number: count + 1,
    };
  }
  snapshot() {
    return { seed: this.seed, draws: { ...this.draws } };
  }
  restore(s) {
    if (
      !s ||
      !Number.isInteger(s.seed) ||
      s.seed < 1 ||
      s.seed > 9999 ||
      !s.draws ||
      typeof s.draws !== "object" ||
      Array.isArray(s.draws) ||
      Object.keys(s.draws).some(
        (k) =>
          !this.sets[k] ||
          !Number.isInteger(s.draws[k]) ||
          s.draws[k] < 0 ||
          s.draws[k] > 1e6,
      )
    )
      throw Error("Invalid answer sequence.");
    this.seed = s.seed;
    this.draws = { ...s.draws };
  }
}
