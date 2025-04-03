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

class MentionPlugin implements PluginValue {
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
        if (node.type.is("Mention")) {
          const isMouseOver = isSelectionOverlapNode(cursor, node);

          const markerDeco = isMouseOver
            ? Decoration.mark({
                class:
                  "cm-formatting cm-formatting-mention cm-mention cm-mention-begin",
              })
            : Decoration.mark({
                class: "cm-mention cm-mention-begin",
              });

          const nodeDeco = isMouseOver
            ? Decoration.mark({
                class:
                  "cm-formatting cm-formatting-mention cm-mention cm-mention-end",
              })
            : Decoration.mark({ class: "cm-mention cm-mention-end" });
          decorations.push(
            markerDeco.range(node.from, node.from + 1),
            nodeDeco.range(node.from + 1, node.to)
          );
        }
      },
    });

    return Decoration.set(decorations);
  }
}

const mentionPlugin = ViewPlugin.fromClass(MentionPlugin, {
  decorations: (v) => v.decorations,
});

const baseTheme = EditorView.baseTheme({
  ".cm-mention": {
    backgroundColor: "rgba(135, 131, 120, 0.15)",
  },
  ".cm-mention *": {
    fontSize: "0.75rem",
  },
  ".cm-mention.cm-mention-begin": {
    borderRadius: "2px 0 0 2px",
    padding: "1px 0 1px 4px",
  },
  ".cm-mention.cm-mention-end": {
    borderRadius: "0 2px 2px 0",
    padding: "1px 4px 1px 0",
  },
});

const mention = () => [mentionPlugin, baseTheme];

export default mention;
