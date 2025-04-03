import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, SelectionRange } from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";
import { isSelectionOverlapNode } from "./utils/cursor";
import HorizontalRuleWidget from "./widgets/HorizontalRule";

const activeLine = (
  state: EditorState,
  selection: SelectionRange
): Range<Decoration>[] => {
  const startLine = state.doc.lineAt(selection.from);
  if (selection.from !== selection.to) {
    const endLine = state.doc.lineAt(selection.to);
    if (startLine.number != endLine.number) {
      return Array.from(
        { length: endLine.number - startLine.number + 1 },
        (_, i) =>
          Decoration.line({ class: "cm-active" }).range(
            state.doc.line(startLine.number + i).from
          )
      );
    }
  }
  return [Decoration.line({ class: "cm-active" }).range(startLine.from)];
};

const hashtag = (node: SyntaxNodeRef): Range<Decoration>[] => {
  const markerDeco = Decoration.mark({
    class: "cm-formatting cm-formatting-tag cm-tag cm-tag-begin",
  }).range(node.from, node.from + 1);
  const nodeDeco = Decoration.mark({
    class: "cm-tag cm-tag-end",
  }).range(node.from + 1, node.to);
  return [markerDeco, nodeDeco];
};

const mention = (node: SyntaxNodeRef): Range<Decoration>[] => {
  const markerDeco = Decoration.mark({
    class: "cm-formatting cm-formatting-mention cm-mention cm-mention-begin",
  }).range(node.from, node.from + 1);
  const nodeDeco = Decoration.mark({
    class: "cm-mention cm-mention-end",
  }).range(node.from + 1, node.to);
  return [markerDeco, nodeDeco];
};

const escape = (
  state: EditorState,
  node: SyntaxNodeRef
): Range<Decoration>[] => {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  let deco = Decoration.replace({});
  if (isSelectionOverlapNode(cursor, node)) {
    deco = Decoration.mark({
      class: `cm-formatting cm-formatting-escape cm-escape`,
    });
  }
  decorations.push(deco.range(node.from, node.from + 1));
  return decorations;
};

class MarkVisionPlugin implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.process(update.view);
    }
  }

  process(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;

    syntaxTree(view.state).iterate({
      enter(node) {
        decorations.push(...activeLine(view.state, cursor));
      },
    });

    return Decoration.set(decorations, true);
  }
}

export default MarkVisionPlugin;
