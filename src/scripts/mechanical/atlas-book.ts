import { motion } from "./settings";

type Plane = {
  element: HTMLElement;
  leaf: "left" | "right" | null;
  hinge: DOMMatrix | null;
  hingeOrigin: [number, number] | null;
  face: DOMMatrix;
  width: number;
  height: number;
  paintOrder: number;
};

/** Compose the real hinge hierarchy into one CSS transform per paper surface.
 * Nested transformed parents are flattened by some WebKit compositors. Keeping
 * the original DOM hierarchy, but projecting its surfaces into one 3D context,
 * gives both engines the same geometry and preserves front/back occlusion.
 * Layout is read only when selecting a book or resizing, never while folding.
 */
export function measureBook(board: HTMLElement, stage: HTMLElement) {
  board.classList.remove("is-projected");
  const book = board.querySelector<HTMLElement>(".atlas-book")!;
  const width = book.offsetWidth;
  const height = book.offsetHeight;
  const styles = getComputedStyle(board);
  const tilt = parseFloat(styles.getPropertyValue("--book-tilt"));
  const turn = parseFloat(styles.getPropertyValue("--book-turn"));
  const stageStyle = getComputedStyle(stage);
  const distance = parseFloat(
    stageStyle.getPropertyValue("--atlas-perspective"),
  );
  const origin = [
    stage.clientWidth / 2 - book.offsetLeft,
    stage.clientHeight * 0.45 - book.offsetTop,
  ];
  const perspective = new DOMMatrix();
  perspective.m34 = -1 / distance;
  const projection = new DOMMatrix()
    .translate(origin[0], origin[1])
    .multiply(perspective)
    .translate(-origin[0], -origin[1]);
  const planes: Plane[] = [];
  for (const element of book.querySelectorAll<HTMLElement>(
    ".atlas-spine, .atlas-surface, .atlas-pop-face, .atlas-pop-back",
  )) {
    const leaf = element.closest(".atlas-leaf");
    const hinge = element.closest<HTMLElement>(".atlas-hinge");
    const back = element.matches(".atlas-surface-back, .atlas-pop-back");
    const w = element.offsetWidth,
      h = element.offsetHeight;
    let face = new DOMMatrix().translate(
      element.offsetLeft,
      element.offsetTop,
      1,
    );
    if (back)
      face = face
        .translate(
          w / 2,
          h / 2,
          element.matches(".atlas-surface-back") ? -4 : -2,
        )
        .rotateAxisAngle(0, 1, 0, 180)
        .translate(-w / 2, -h / 2);
    element.style.setProperty("--plane-width", `${w}px`);
    element.style.setProperty("--plane-height", `${h}px`);
    planes.push({
      element,
      leaf: leaf
        ? leaf.classList.contains("atlas-leaf-left")
          ? "left"
          : "right"
        : null,
      hinge: hinge
        ? new DOMMatrix().translate(hinge.offsetLeft, hinge.offsetTop)
        : null,
      hingeOrigin: hinge ? [hinge.offsetWidth / 2, hinge.offsetHeight] : null,
      face,
      width: w,
      height: h,
      paintOrder: element.matches(".atlas-leaf-left > .atlas-surface-back")
        ? 10
        : !hinge
          ? 0
          : hinge.matches(".atlas-hinge-tree, .atlas-hinge-photo")
            ? 1
            : hinge.matches(".atlas-hinge-sign, .atlas-hinge-buildings")
              ? 2
              : 3,
    });
  }
  board.classList.add("is-projected");
  // Scroll chapters move only the inserts. Manual Open/Close can still fold
  // the cover by leaving its progress coupled to the inserts.
  return (progress: number, coverProgress = progress) => {
    const camera = projection
      .translate(width / 2 - width * 0.25 * (1 - coverProgress), height / 2)
      .scale(1 - motion.atlasFoldZoom * Math.sin(Math.PI * coverProgress))
      .rotateAxisAngle(1, 0, 0, tilt)
      .rotateAxisAngle(
        0,
        1,
        0,
        motion.atlasFoldYaw * Math.sin(Math.PI * coverProgress),
      )
      .rotateAxisAngle(0, 0, 1, turn)
      .translate(-width / 2, -height / 2);
    const left = new DOMMatrix()
      .translate(width / 2, height / 2, 5)
      .rotateAxisAngle(0, 1, 0, (1 - coverProgress) * motion.foldAngle)
      .translate(-width / 2, -height / 2);
    const right = new DOMMatrix().translate(width / 2, 0);
    // Paper pieces lie inside their page before the cover closes over them.
    const painted: { element: HTMLElement; depth: number; order: number }[] =
      [];
    for (const plane of planes) {
      let world = camera;
      if (plane.leaf)
        world = world.multiply(plane.leaf === "left" ? left : right);
      if (plane.hinge && plane.hingeOrigin) {
        const [x, y] = plane.hingeOrigin;
        // A moving cover must clear the left inserts. With the book held open,
        // both sides rise together, independently of the stationary pages.
        const opening =
          plane.leaf === "left"
            ? Math.min(progress, Math.max(0, coverProgress * 2 - 1))
            : progress;
        const rise =
          motion.riseClosed + opening * (motion.riseOpen - motion.riseClosed);
        world = world
          .multiply(plane.hinge)
          .translate(x, y)
          .rotateAxisAngle(1, 0, 0, rise)
          .translate(-x, -y);
      }
      const transform = world.multiply(plane.face);
      const project = (x: number, y: number) => {
        const p = transform.transformPoint({ x, y });
        return { x: p.x / p.w, y: p.y / p.w };
      };
      const a = project(0, 0),
        b = project(plane.width, 0),
        c = project(0, plane.height);
      const facing = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      // Explicit geometric culling avoids reversed back surfaces in WebKit's
      // software compositor. This follows the face, not a progress threshold.
      plane.element.style.setProperty(
        "--plane-visible",
        facing > 0.1 ? "visible" : "hidden",
      );
      plane.element.style.setProperty(
        "--plane-transform",
        transform.toString(),
      );
      const center = transform.transformPoint({
        x: plane.width / 2,
        y: plane.height / 2,
      });
      painted.push({
        element: plane.element,
        depth: center.z / center.w,
        order: plane.paintOrder,
      });
    }
    // WebKit's software painter also needs explicit order for coplanar paper.
    // The outside cover occludes the tucked-away inserts while it faces us.
    painted
      .sort((a, b) => a.order - b.order || a.depth - b.depth)
      .forEach(({ element }, i) => {
        element.style.setProperty("--plane-order", String(i + 1));
      });
  };
}
