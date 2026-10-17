import palms from "../assets/photos/tampa-palms.jpg";
import night from "../assets/photos/tampa-night.jpg";
import ybor from "../assets/photos/ybor.jpg";
import aerial from "../assets/photos/tampa-aerial.jpg";
import one from "../assets/photos/portrait-one.jpg";
import two from "../assets/photos/portrait-two.jpg";
import three from "../assets/photos/portrait-three.jpg";
import four from "../assets/photos/portrait-four.jpg";
import five from "../assets/photos/portrait-five.jpg";
import cocktail from "../assets/photos/cocktail.jpg";
import restaurant from "../assets/photos/restaurant.jpg";
import coffee from "../assets/photos/coffee.jpg";
import type { ImageMetadata } from "astro";
export const photos: Record<string, ImageMetadata> = {
  "tampa-palms": palms,
  "tampa-night": night,
  ybor,
  "tampa-aerial": aerial,
  "portrait-one": one,
  "portrait-two": two,
  "portrait-three": three,
  "portrait-four": four,
  "portrait-five": five,
  cocktail,
  restaurant,
  coffee,
};
