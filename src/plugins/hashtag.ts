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

class HashtagPlugin implements PluginValue {
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
        if (node.type.is("Hashtag")) {
          const isMouseOver = isSelectionOverlapNode(cursor, node);

          const markerDeco = isMouseOver
            ? Decoration.mark({
                class:
                  "cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin",
              })
            : Decoration.mark({
                class: "cm-hashtag cm-hashtag-begin",
              });

          const nodeDeco = isMouseOver
            ? Decoration.mark({
                class:
                  "cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-end",
              })
            : Decoration.mark({ class: "cm-hashtag cm-hashtag-end" });
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

const hashtagPlugin = ViewPlugin.fromClass(HashtagPlugin, {
  decorations: (v) => v.decorations,
});

const baseTheme = EditorView.baseTheme({
  ".cm-hashtag": {
    backgroundColor: "#008CFF",
  },
  ".cm-hashtag *": {
    fontSize: "0.75rem",
  },
  ".cm-hashtag.cm-hashtag-begin": {
    borderRadius: "2px 0 0 2px",
    padding: "1px 0 1px 4px",
  },
  ".cm-hashtag.cm-hashtag-end": {
    borderRadius: "0 2px 2px 0",
    padding: "1px 4px 1px 0",
  },
});

const hashtag = () => [hashtagPlugin, baseTheme];

export default hashtag;
