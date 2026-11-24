import { createShapeId, type Editor, type TLShapeId, type VecLike } from "tldraw";
import { DEFAULT_NODE_SHAPE_SIZE, DISCOURSE_NODE_SHAPE, type DiscourseNodeShape, type GraphNode } from "@dg/shared";
import type { GraphIndex } from "./graph";

/** Every discourse-node shape on the current page, keyed by node id. */
export function nodeShapesOnPage(editor: Editor): Map<string, DiscourseNodeShape> {
  const out = new Map<string, DiscourseNodeShape>();
  for (const s of editor.getCurrentPageShapes()) {
    if (s.type === DISCOURSE_NODE_SHAPE) {
      const shape = s as DiscourseNodeShape;
      out.set(shape.props.nodeId, shape);
    }
  }
  return out;
}

/**
 * Place a node on the canvas. If `near` is given the shape goes to the right of that point,
 * otherwise it lands at the viewport centre, staggered so repeated inserts don't stack exactly.
 */
export function addNodeShape(
  editor: Editor,
  index: GraphIndex,
  node: GraphNode,
  opts: { near?: VecLike; select?: boolean } = {},
): TLShapeId {
  const type = index.typesById.get(node.type);
  const { w, h } = DEFAULT_NODE_SHAPE_SIZE;
  let x: number, y: number;
  if (opts.near) {
    x = opts.near.x;
    y = opts.near.y;
  } else {
    const c = editor.getViewportPageBounds().center;
    const n = editor.getCurrentPageShapes().length % 8;
    x = c.x - w / 2 + n * 24;
    y = c.y - h / 2 + n * 24;
  }
  const id = createShapeId();
  editor.createShape<DiscourseNodeShape>({
    id,
    type: DISCOURSE_NODE_SHAPE,
    x,
    y,
    props: {
      w,
      h,
      nodeId: node.id,
      title: node.title,
      nodeType: node.type,
      typeLabel: type?.label ?? node.type,
      color: type?.color ?? "#374151",
    },
  });
  if (opts.select !== false) editor.select(id);
  return id;
}

/** Place `node` next to the shape that shows `anchorNodeId`, or at the viewport centre. */
export function addNodeShapeNextTo(editor: Editor, index: GraphIndex, node: GraphNode, anchorNodeId: string | null) {
  const existing = nodeShapesOnPage(editor);
  const already = existing.get(node.id);
  if (already) {
    editor.select(already.id);
    editor.zoomToSelection({ animation: { duration: 250 } });
    return already.id;
  }
  const anchor = anchorNodeId ? existing.get(anchorNodeId) : undefined;
  if (!anchor) return addNodeShape(editor, index, node);
  const bounds = editor.getShapePageBounds(anchor.id);
  const siblings = [...existing.values()].filter(
    (s) => bounds && Math.abs(s.x - (bounds.maxX + 60)) < 1,
  ).length;
  return addNodeShape(editor, index, node, {
    near: bounds ? { x: bounds.maxX + 60, y: bounds.minY + siblings * (DEFAULT_NODE_SHAPE_SIZE.h + 24) } : undefined,
  });
}
