import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, SelectionRange } from "@codemirror/state";

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
      enter() {
        decorations.push(...activeLine(view.state, cursor));
      },
    });

    return Decoration.set(decorations, true);
  }
}

export default MarkVisionPlugin;
