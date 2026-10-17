import { clamp } from "./settings";

/** One native-scroll chapter per spread: unfold, pause for reading, fold away.
 * The scenery changes with its inserts flat; the book itself stays open.
 * The last pop-up stays raised as the reader continues down the page.
 * Absolute progress reverses naturally.
 */
export function atlasFrame(progress: number, count: number) {
  const position = clamp(progress) * count;
  const index = Math.min(count - 1, Math.floor(position));
  const local = position - index;
  const ease = (value: number) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const openness =
    local < 0.22
      ? ease(local / 0.22)
      : index < count - 1 && local > 0.78
        ? 1 - ease((local - 0.78) / 0.22)
        : 1;
  return { index, openness };
}
