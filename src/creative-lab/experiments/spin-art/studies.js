import { SpinArt, STEP } from "./model.js";
export const STUDIES = {
  flare: {
    name: "Vermilion hour",
    subtitle: "Citrus, cobalt & a little disorder",
  },
  tide: { name: "The blue hour", subtitle: "Ink carried by a quiet current" },
  nocturne: {
    name: "After hours",
    subtitle: "Bright pigment on midnight paper",
  },
};
/** Original short pours, spun out by the very same wet-paint model. */
export function makeStudy(name = "flare") {
  const m = new SpinArt({
    speed: name === "tide" ? 54 : 72,
    palette: "citrus",
    paper: name === "nocturne" ? "night" : "ivory",
    spread: 0.95,
    viscosity: 0.3,
    thickness: 18,
  });
  const wait = (seconds) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) m.advance(STEP);
  };
  m.setMotor(true);
  wait(0.8);
  const colors =
    name === "tide"
      ? ["#315f8d", "#76a8a8", "#d2bb85", "#243958"]
      : name === "nocturne"
        ? ["#cd6b94", "#a4d4d6", "#e6c66b", "#b19cd1"]
        : ["#eb692a", "#e7b72e", "#234f99", "#eee5c9"];
  const phase = name === "tide" ? 1.2 : name === "nocturne" ? 2.3 : 0;
  for (let layer = 0; layer < 4; layer++) {
    m.update({
      ink: colors[layer],
      style: layer === 0 ? "dots" : "stream",
      thickness: layer === 0 ? 24 : layer === 3 ? 9 : 19,
      opacity: 0.95,
      dripRate: layer === 0 ? 12 : 18,
      viscosity: layer === 3 ? 0.48 : 0.3,
    });
    for (let burst = 0; burst < 3; burst++) {
      const duration = layer === 0 ? 0.16 : layer === 3 ? 0.24 : 0.38,
        base = 0.09 + 0.045 * burst + 0.025 * layer;
      m.begin(base, 0.03 * Math.sin(phase + burst));
      for (let i = 0; i < duration / STEP; i++) {
        const t = (i * STEP) / duration,
          r =
            base +
            t * (layer === 3 ? 0.43 : 0.24) +
            Math.sin(t * 4 + phase) * 0.025;
        m.move(r, Math.sin(t * 3 + burst + phase) * 0.055);
        m.advance(STEP);
      }
      m.end();
      wait(0.27 + burst * 0.085 + layer * 0.04);
    }
    wait(0.6);
  }
  // A few deliberately off-center drops and fine satellites around the main pours.
  m.update({
    style: "splatter",
    ink: colors[1],
    thickness: 7,
    dripRate: 10,
    viscosity: 0.6,
  });
  for (let i = 0; i < 4; i++) {
    m.begin(0.24 + i * 0.08, 0.09);
    m.end();
    wait(0.19);
  }
  wait(3);
  m.setMotor(false);
  m.angle = 0;
  return m.serialize();
}
