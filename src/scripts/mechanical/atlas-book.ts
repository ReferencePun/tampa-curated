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
  back: boolean;
};

type TurningLeaf = { progress: number; incoming: boolean };

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
  const offset = { x: book.offsetLeft, y: book.offsetTop };
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
      back,
    });
  }
  board.classList.add("is-projected");
  return (progress: number, coverProgress = progress, turning?: TurningLeaf) => {
    const turnProgress = turning?.progress ?? 0;
    // A slight change in view gives the upright leaf more room. The caller
    // fits both spreads together so their shared sheet never separates.
    const turnArc = Math.sin(Math.PI * turnProgress);
    const pageTilt = tilt - 15 * turnArc;
    const camera = projection
      .translate(
        width / 2 - width * 0.25 * (1 - coverProgress),
        height / 2,
      )
      .scale(1 - motion.atlasFoldZoom * Math.sin(Math.PI * coverProgress))
      .rotateAxisAngle(1, 0, 0, pageTilt)
      .rotateAxisAngle(
        0,
        1,
        0,
        motion.atlasFoldYaw * Math.sin(Math.PI * coverProgress),
      )
      .rotateAxisAngle(0, 0, 1, turn)
      .translate(-width / 2, -height / 2);
    const left = turning?.incoming
      ? new DOMMatrix().translate(width / 2, 0, 5 * turnProgress)
          .rotateAxisAngle(0, 1, 0, 180 * (1 - turnProgress))
          .translate(-width / 2, 0)
      : new DOMMatrix()
          .translate(width / 2, height / 2, 5)
          .rotateAxisAngle(0, 1, 0, (1 - coverProgress) * motion.foldAngle)
          .translate(-width / 2, -height / 2);
    const right = new DOMMatrix().translate(
      width / 2, 0, turning && !turning.incoming ? 5 * turnProgress : 0,
    );
    if (turning && !turning.incoming)
      right.rotateAxisAngleSelf(0, 1, 0, -180 * turnProgress);
    // Paper pieces lie inside their page before the cover closes over them.
    const painted: {
      element: HTMLElement; depth: number; order: number;
      transform: DOMMatrix; visible: boolean;
    }[] = [];
    const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
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
      const visible = facing > 0.1 &&
        !(turning && (plane.back || (!plane.leaf && turning.incoming)));
      if (visible) {
        for (const p of [a, b, c, project(plane.width, plane.height)]) {
          bounds.left = Math.min(bounds.left, p.x + offset.x);
          bounds.right = Math.max(bounds.right, p.x + offset.x);
          bounds.top = Math.min(bounds.top, p.y + offset.y);
          bounds.bottom = Math.max(bounds.bottom, p.y + offset.y);
        }
      }
      const center = transform.transformPoint({
        x: plane.width / 2,
        y: plane.height / 2,
      });
      // All projected planes share a paint context. Moving faces sit above
      // both static pages, including the next spread's right page underneath.
      const moving = turning && plane.leaf === (turning.incoming ? "left" : "right");
      painted.push({
        element: plane.element,
        depth: center.z / center.w,
        order: (moving ? 20 : 0) + plane.paintOrder,
        transform,
        visible,
      });
    }
    // WebKit's software painter also needs explicit order for coplanar paper.
    // The outside cover occludes the tucked-away inserts while it faces us.
    painted.sort((a, b) => a.order - b.order || a.depth - b.depth);
    return {
      bounds,
      paint(view = new DOMMatrix()) {
        const fit = new DOMMatrix().translate(-offset.x, -offset.y)
          .multiply(view).translate(offset.x, offset.y);
        painted.forEach(({ element, transform, visible, order }, i) => {
          element.style.setProperty("--plane-transform", fit.multiply(transform).toString());
          element.style.setProperty("--plane-visible", visible ? "visible" : "hidden");
          element.style.setProperty("--plane-order", String(order * 20 + i + 1));
        });
      },
    };
  };
}
