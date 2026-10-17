// Original schematic compositions. These are editorial motifs, not survey maps.
export const atlasScenes: Record<
  string,
  {
    accent: string;
    motif: string;
    stamp: string;
    street: string;
    roof: string;
    water: string;
  }
> = {
  "ybor-city": {
    accent: "#ae2c22",
    motif: "brick",
    stamp: "HISTORY WITH A PULSE",
    street: "BRICK / IRON / MEMORY",
    roof: "M0 90V42H45V23H100V8H165V23H220V42H280V90Z",
    water: "M0 290 Q180 250 300 330 T700 300",
  },
  "seminole-heights": {
    accent: "#987126",
    motif: "porch",
    stamp: "A LITTLE OFFBEAT",
    street: "PORCH / SHADE / RITUAL",
    roof: "M0 90V55L65 0L130 55V90H150V45L210 0L280 55V90Z",
    water: "M0 70 Q130 90 160 210 T350 400",
  },
  "hyde-park": {
    accent: "#56634b",
    motif: "garden",
    stamp: "OLD ROOTS. NEW RITUALS.",
    street: "CANOPY / CORNER / PAUSE",
    roof: "M0 90V40H30V20H110V40H130V90H150V40H180V15H250V40H280V90Z",
    water: "M480 0 Q420 140 570 230 T700 400",
  },
  downtown: {
    accent: "#123f73",
    motif: "tower",
    stamp: "LOOK UP. LOOK CLOSER.",
    street: "WATER / CONCRETE / SKY",
    roof: "M0 90V38H30V10H65V90H80V25H105V0H140V90H160V50H185V20H220V90H240V5H280V90Z",
    water: "M0 80 Q230 30 300 200 T700 340",
  },
  "tampa-heights": {
    accent: "#a04f32",
    motif: "workshop",
    stamp: "ROOM TO MAKE SOMETHING",
    street: "RIVER / WORKSHOP / TABLE",
    roof: "M0 90V40L70 5L140 40V90H155V35L225 0L280 35V90Z",
    water: "M80 0 Q250 120 120 250 T300 400",
  },
  "water-street": {
    accent: "#416a70",
    motif: "waterfront",
    stamp: "A DIFFERENT CITY RHYTHM",
    street: "WALK / GATHER / REPEAT",
    roof: "M0 90V0H65V90H80V25H125V90H145V10H210V90H225V35H280V90Z",
    water: "M0 270 Q200 210 370 290 T700 240",
  },
};
