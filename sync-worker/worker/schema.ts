import { createTLSchema, defaultBindingSchemas, defaultShapeSchemas } from "@tldraw/tlschema";
import { DISCOURSE_NODE_SHAPE, discourseNodeShapeSchema } from "@dg/shared";

// The server must know every custom shape the client uses, with the same props
// validators and migrations, or clients fail schema validation on connect.
export const schema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    [DISCOURSE_NODE_SHAPE]: discourseNodeShapeSchema,
  },
  bindings: { ...defaultBindingSchemas },
});
