import { clamp } from "./settings";

const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function pageTurn(from: number, progress: number) {
  const t = clamp(progress);
  return {
    from,
    to: from + 1,
    progress: t,
    departing: 1 - ease(t / 0.2),
    arriving: ease((t - 0.78) / 0.22),
  };
}
export type PageTurn = ReturnType<typeof pageTurn>;

/** A leaf turns right-to-left across each chapter boundary. Its front belongs
 * to the outgoing spread and its reverse to the incoming spread. Both scenes
 * are present during the turn; reversing the scroll retraces the same geometry.
 */
export function atlasFrame(progress: number, count: number) {
  const position = clamp(progress) * count;
  const index = Math.min(count - 1, Math.floor(position));
  const local = position - index;
  const turn = index > 0 && local < 0.2
    ? pageTurn(index - 1, (local + 0.3) / 0.5)
    : index < count - 1 && local > 0.7
      ? pageTurn(index, (local - 0.7) / 0.5)
      : null;
  const openness = turn
    ? (index === turn.from ? turn.departing : turn.arriving)
    : index === 0 ? ease(local / 0.2) : 1;
  return { index, openness, turn };
}
