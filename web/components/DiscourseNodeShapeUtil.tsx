"use client";

import { BaseBoxShapeUtil, HTMLContainer, resizeBox, stopEventPropagation, type TLResizeInfo } from "tldraw";
import {
  DEFAULT_NODE_SHAPE_SIZE,
  DISCOURSE_NODE_SHAPE,
  discourseNodeShapeMigrations,
  discourseNodeShapeProps,
  type DiscourseNodeShape,
} from "@dg/shared";
import { useGraph } from "./GraphProvider";
import { openNodeFromShapeUtil, useCanvasUi } from "./CanvasUiContext";

export class DiscourseNodeShapeUtil extends BaseBoxShapeUtil<DiscourseNodeShape> {
  static override type = DISCOURSE_NODE_SHAPE;
  static override props = discourseNodeShapeProps;
  static override migrations = discourseNodeShapeMigrations;

  getDefaultProps(): DiscourseNodeShape["props"] {
    return {
      ...DEFAULT_NODE_SHAPE_SIZE,
      nodeId: "",
      title: "Untitled node",
      nodeType: "",
      typeLabel: "Node",
      color: "#374151",
    };
  }

  override canEdit() {
    return false;
  }
  override canResize() {
    return true;
  }
  override isAspectRatioLocked() {
    return false;
  }
  override onResize(shape: DiscourseNodeShape, info: TLResizeInfo<DiscourseNodeShape>) {
    return resizeBox(shape, info);
  }
  override onDoubleClick(shape: DiscourseNodeShape) {
    if (shape.props.nodeId) openNodeFromShapeUtil(shape.props.nodeId);
  }

  component(shape: DiscourseNodeShape) {
    return <DiscourseNodeCard shape={shape} />;
  }

  getIndicatorPath(shape: DiscourseNodeShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 10);
    return path;
  }
}

function DiscourseNodeCard({ shape }: { shape: DiscourseNodeShape }) {
  const { index } = useGraph();
  const { openNode, openNodeId } = useCanvasUi();
  const { w, h, nodeId } = shape.props;

  // Prefer live data from the node store; fall back to the snapshot in the shape.
  const node = index?.nodesById.get(nodeId);
  const type = node ? index?.typesById.get(node.type) : undefined;
  const title = node?.title ?? shape.props.title;
  const typeLabel = type?.label ?? shape.props.typeLabel;
  const color = type?.color ?? shape.props.color;
  const missing = Boolean(index && nodeId && !node);
  const isOpen = openNodeId === nodeId;
  const compact = h < 80;

  return (
    <HTMLContainer
      style={{
        width: w,
        height: h,
        pointerEvents: "all",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        border: `2px solid ${color}`,
        boxShadow: isOpen ? `0 0 0 3px ${color}33` : "0 1px 2px rgba(0,0,0,0.06)",
        borderRadius: 10,
        overflow: "hidden",
        color: "#1f2a24",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "4px 8px" : "6px 10px",
          background: color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {typeLabel}
          {missing && <span style={{ marginLeft: 6, opacity: 0.8 }}>· not in store</span>}
        </span>
        <span style={{ opacity: 0.8, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{nodeId}</span>
        <button
          type="button"
          onPointerDown={stopEventPropagation}
          onClick={(e) => {
            e.stopPropagation();
            if (nodeId) openNode(nodeId);
          }}
          title="Open in sidebar"
          style={{
            border: "1px solid rgba(255,255,255,0.6)",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            borderRadius: 5,
            fontSize: 11,
            padding: "1px 7px",
            cursor: "pointer",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          Open
        </button>
      </div>
      {!compact && (
        <div
          style={{
            flex: 1,
            padding: "8px 10px",
            fontSize: w < 220 ? 12 : 14,
            lineHeight: 1.35,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: Math.max(1, Math.floor((h - 40) / (w < 220 ? 16 : 19))),
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </div>
      )}
    </HTMLContainer>
  );
}
