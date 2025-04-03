import { Range } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { iterateVisibleSyntaxTree } from "../utils/syntaxTree";
import { isSelectionOverlapNode } from "../utils/cursor";

class EscapePlugin implements PluginValue {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.process(update.view);
    }
  }

  process(view: EditorView) {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;

    iterateVisibleSyntaxTree(view, {
      enter(node) {
        if (node.type.is("Escape")) {
          let deco = Decoration.replace({});
          if (isSelectionOverlapNode(cursor, node)) {
            deco = Decoration.mark({
              class: `cm-formatting cm-formatting-escape cm-escape`,
            });
          }
          decorations.push(deco.range(node.from, node.from + 1));
        }
      },
    });

    return Decoration.set(decorations);
  }
}

const escapePlugin = ViewPlugin.fromClass(EscapePlugin, {
  decorations: (v) => v.decorations,
});

const escape = () => [escapePlugin];

export default escape;
