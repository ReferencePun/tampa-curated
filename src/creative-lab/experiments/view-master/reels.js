// Literal URLs let bundlers and the portable exporter discover every asset.
const photos = [
  new URL("./assets/palms.jpg", import.meta.url).href,
  new URL("./assets/facade.jpg", import.meta.url).href,
  new URL("./assets/portrait.jpg", import.meta.url).href,
];
const scenes = (items, kind) =>
  items.map(([title, theme, caption], i) => ({
    id: `${kind}-${i}`,
    kind,
    title,
    theme,
    caption,
    seed: i,
  }));
export const REELS = {
  atlas: {
    version: 1,
    id: "atlas",
    title: "An atlas of elsewhere",
    description: "Six invented places. No ticket required.",
    scenes: scenes(
      [
        [
          "The last light",
          "harbor",
          "A small lighthouse watches the boats find their way home.",
        ],
        [
          "The glass garden",
          "garden",
          "A conservatory, a winding path, and a place to sit for a while.",
        ],
        [
          "Blue hour avenue",
          "city",
          "Little windows, a quiet street, and one more corner to turn.",
        ],
        [
          "A sea of quiet",
          "coast",
          "Striped umbrellas and a very long afternoon.",
        ],
        [
          "The night observatory",
          "observatory",
          "A copper dome pointed at everything we do not know.",
        ],
        [
          "Postcard from the moon",
          "moon",
          "An imaginary outpost at the far end of the reel.",
        ],
      ],
      "illustration",
    ),
  },
  miniatures: {
    version: 1,
    id: "miniatures",
    title: "Small worlds, big days",
    description: "Six dimensional dioramas, built one tiny shape at a time.",
    scenes: scenes(
      [
        [
          "Harbour in a matchbox",
          "harbor",
          "Painted roofs, a working quay, and a tiny red boat.",
        ],
        ["The garden pavilion", "garden", "A pocket-sized botanical retreat."],
        [
          "Sunday on the square",
          "city",
          "A miniature town with nowhere urgent to be.",
        ],
        [
          "The little riviera",
          "coast",
          "Pastel cabins on the edge of an invented sea.",
        ],
        [
          "The star keeper",
          "observatory",
          "A miniature observatory on a terraced hill.",
        ],
        [
          "Faraway station",
          "moon",
          "A friendly lunar base, assembled from impossible souvenirs.",
        ],
      ],
      "world",
    ),
  },
  photos: {
    version: 1,
    id: "photos",
    title: "Collected in the light",
    description: "Three photographic records. Flat images, seen clearly.",
    scenes: [
      {
        id: "palms",
        kind: "photo",
        title: "Looking up in Tampa",
        caption: "Brandon Burridge / Unsplash. Palms and architecture.",
        src: photos[0],
      },
      {
        id: "facade",
        kind: "photo",
        title: "The factory facade",
        caption: "Ikuna / Unsplash. Ybor Factory Building.",
        src: photos[1],
      },
      {
        id: "portrait",
        kind: "photo",
        title: "A face in the light",
        caption:
          "Christopher Campbell / Unsplash. Stock portrait; not a Tampa profile.",
        src: photos[2],
      },
    ],
  },
};
