export const readingGuides = [
  {
    slug: "a-first-look",
    number: "01",
    title: "A first look",
    headline: "START WITH THE CITY.",
    deck: "A skyline, a side street, a different way of looking. Three chapters to find your bearings in the first edition.",
    theme: "blue",
    image: "tampa-palms",
    imageAlt: "Palm trees framing a high-rise building in Tampa",
    treatment: "mono",
    introduction:
      "You don’t have to begin with a destination. Begin with a detail: the shape of a roofline, the shade beneath a palm, the turn you usually pass. This reading route moves from the publication’s point of view to the scale of a single neighborhood.",
    question:
      "What changes when you look at a familiar place as if you have just arrived?",
    chapters: [
      {
        title: "Look up. Then look closer.",
        label: "THE POINT OF VIEW",
        collection: "stories",
        slug: "the-city-now",
        copy: "The opening essay introduces our way of seeing. It asks what lies beyond the postcard view: the people opening their doors, the rooms where conversations begin, and the decisions that give a place its character.",
      },
      {
        title: "Leave room for a detour.",
        label: "THE CHANGE OF PACE",
        collection: "stories",
        slug: "the-long-way-home",
        copy: "A neighborhood makes more sense when you give it time. This essay considers the pleasure of changing a familiar route, and the kind of close attention we want to bring to future neighborhood reporting.",
      },
      {
        title: "Find a place to begin.",
        label: "THE NEIGHBORHOOD",
        collection: "neighborhoods",
        slug: "ybor-city",
        copy: "The sample Ybor City guide brings that approach down to street level. Follow the connections between a place, its stories, and its people; then use the complete neighborhood index to see how the rest of the edition fits together.",
      },
    ],
  },
  {
    slug: "after-dark",
    number: "02",
    title: "After dark",
    headline: "WHEN THE LIGHT CHANGES.",
    deck: "The city after sundown, the rooms that bring people together, and the quiet rituals on either side of a night out.",
    theme: "red",
    image: "tampa-night",
    imageAlt: "Downtown Tampa lights reflected on the water at night",
    treatment: "natural",
    introduction:
      "Night changes the way we notice a city. A window becomes a pool of light; a table becomes a meeting place. These three pieces follow that change of atmosphere, from the idea of a good evening to the everyday places that make us feel at home.",
    question: "Is it the room you remember, or the conversation you had in it?",
    chapters: [
      {
        title: "Stay a little longer.",
        label: "AFTER SUNDOWN",
        collection: "stories",
        slug: "after-hours",
        copy: "A sketch of the nightlife stories we want to tell: the people behind a room, the choices that shape its mood, and the regulars who give it a history. This sample essay describes an editorial approach, not a list of recommended bars.",
      },
      {
        title: "Make yourself a regular.",
        label: "THE EVERYDAY TABLE",
        collection: "stories",
        slug: "a-table-for-everyone",
        copy: "The conversation continues in daylight. Our café essay asks what people return for, and how an ordinary shared space becomes part of a daily rhythm. Food and drink are the beginning of the story, rather than its entire subject.",
      },
      {
        title: "See a different skyline.",
        label: "THE CITY AT NIGHT",
        collection: "neighborhoods",
        slug: "downtown",
        copy: "Water and reflected light give the Downtown sample guide its visual starting point. Read it alongside the photo journal for another perspective on the same city. Practical visits, venue information, and a verified evening itinerary are still to come.",
      },
    ],
  },
  {
    slug: "creative-tampa",
    number: "03",
    title: "Independent minds",
    headline: "MADE OF INDEPENDENT MINDS.",
    deck: "The ideas, working spaces, and small decisions behind a creative city. A reading route for the curious.",
    theme: "ochre",
    image: "portrait-five",
    imageAlt:
      "Illustrative stock portrait; the model is not a named Tampa Curated profile subject",
    treatment: "ochre",
    introduction:
      "A finished object only tells part of the story. We’re interested in the experiments, collaborations, and ordinary working days behind it. This route connects the first edition’s creative themes with the interview format we hope to fill with real conversations.",
    question:
      "What would you make if you gave the unfinished idea a little more room?",
    chapters: [
      {
        title: "Find the conversation.",
        label: "A SHARED LANGUAGE",
        collection: "stories",
        slug: "a-new-creative-class",
        copy: "The opening piece considers how individual practices become a scene. It sets out the intention behind People to Watch: spending time with work while it is still taking shape, with space for uncertainty and experimentation.",
      },
      {
        title: "Look behind the front door.",
        label: "INDEPENDENCE IN PRACTICE",
        collection: "stories",
        slug: "independent-by-design",
        copy: "A room can hold a point of view. This essay looks at the questions behind an independent business: what its owners choose to keep, what they choose to change, and what a place can give back to its neighbors.",
      },
      {
        title: "Meet the profile format.",
        label: "THE MAKER’S PERSPECTIVE",
        collection: "people",
        slug: "nia-brooks",
        copy: "Nia Brooks is a fictional designer created for this demonstration. Her sample profile shows the space we will make for a maker’s own words, original portraits, and verified work. Read it as a preview of the interview format, not a real biography.",
      },
    ],
  },
] as const;

export const publicationPages = [
  {
    title: "The issue archive",
    deck: "Every edition, in one place. Begin with Issue 001: The City Now.",
    type: "Issue archive",
    path: "issues/",
  },
  {
    title: "Issue 001 — The City Now",
    deck: "The first edition: six essays, five fictional profiles, and six sample neighborhood guides.",
    type: "Issue",
    path: "issues/001/",
  },
  {
    title: "Reading guides",
    deck: "Three ways into the publication: a first look, after dark, and independent minds.",
    type: "Reading guides",
    path: "guides/",
  },
  ...readingGuides.map((guide) => ({
    title: guide.title,
    deck: guide.deck,
    type: "Reading guide",
    path: `guides/${guide.slug}/`,
  })),
  {
    title: "Tampa, in four frames",
    deck: "A photo journal of Tampa palms, Ybor City, the skyline, and reflected light, with full photography credits.",
    type: "Photo journal",
    path: "photo-journal/",
  },
];
