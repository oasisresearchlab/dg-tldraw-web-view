import { T } from "@tldraw/validate";
import {
  createShapePropsMigrationSequence,
  type RecordProps,
  type TLBaseShape,
} from "@tldraw/tlschema";

/** Shape type id shared by the client (ShapeUtil) and the sync server (schema). */
export const DISCOURSE_NODE_SHAPE = "discourse-node" as const;

export interface DiscourseNodeShapeProps {
  w: number;
  h: number;
  /** Id of the node in the imported node store (web/public/graph.json). */
  nodeId: string;
  /** Snapshot of the node title at placement time; refreshed from the store when present. */
  title: string;
  /** Node type id (e.g. "CLM") and label, snapshotted so the shape renders without the store. */
  nodeType: string;
  typeLabel: string;
  /** CSS color snapshot for the type. */
  color: string;
}

export type DiscourseNodeShape = TLBaseShape<typeof DISCOURSE_NODE_SHAPE, DiscourseNodeShapeProps>;

// Register the shape in tldraw's global shape map so it is part of the TLShape union
// (needed for BaseBoxShapeUtil, editor.createShape<…>, and shape.type narrowing).
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    [DISCOURSE_NODE_SHAPE]: DiscourseNodeShapeProps;
  }
}

export const discourseNodeShapeProps: RecordProps<DiscourseNodeShape> = {
  w: T.number,
  h: T.number,
  nodeId: T.string,
  title: T.string,
  nodeType: T.string,
  typeLabel: T.string,
  color: T.string,
};

export const discourseNodeShapeMigrations = createShapePropsMigrationSequence({
  sequence: [],
});

/** Passed to createTLSchema({ shapes }) on the server and used by the ShapeUtil on the client. */
export const discourseNodeShapeSchema = {
  props: discourseNodeShapeProps,
  migrations: discourseNodeShapeMigrations,
};

export const DEFAULT_NODE_SHAPE_SIZE = { w: 280, h: 120 };
