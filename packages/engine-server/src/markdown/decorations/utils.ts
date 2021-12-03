import type {
  DEngine,
  IDendronError,
  NonOptional,
  NoteProps,
  Decoration,
} from "@dendronhq/common-all";
import { Node } from "hast";
import { DendronASTNode } from "../types";

export { DECORATION_TYPES } from "@dendronhq/common-all";
export type { Decoration };

export type DecoratorOut<D extends Decoration = Decoration> = {
  decorations: D[];
  errors?: IDendronError[];
};

export type DecoratorIn<N extends Omit<DendronASTNode, "children"> = Node> = {
  node: NonOptional<N, "position">;
  note: NoteProps;
  noteText: string;
  engine: DEngine;
};

export type Decorator<
  N extends Omit<DendronASTNode, "children">,
  D extends Decoration = Decoration
> = (opts: DecoratorIn<N>) => DecoratorOut<D>;
