export const siteConfig = {
  name: "Tampa Curated",
  description:
    "An independent eye on the people, places, and ideas defining Tampa.",
  issue: "No. 001",
  // Add real, public URLs when the publication is ready. Empty values render honest text.
  newsletterUrl: "", // e.g. your hosted Buttondown or Mailchimp signup page (https://…)
  instagramUrl: "",
  contactEmail: "",
};

export const navigation = [
  ["01", "Places", "places/"],
  ["02", "People", "people/"],
  ["03", "Stories", "stories/"],
  ["04", "Neighborhoods", "neighborhoods/"],
  ["05", "The List", "the-list/"],
  ["06", "About", "about/"],
] as const;

export const editionNavigation = [
  ["07", "Issues", "issues/"],
  ["08", "Reading guides", "guides/"],
  ["09", "Photo journal", "photo-journal/"],
] as const;

export const categories = [
  "Restaurants",
  "Bars & Nightlife",
  "Coffee",
  "Shopping",
  "Art & Culture",
  "Wellness",
  "Hotels",
  "Services",
] as const;
