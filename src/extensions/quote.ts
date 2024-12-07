import {
  WidgetType,
  EditorView,
  Decoration,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, RangeSet } from "@codemirror/state";
import { isSelectionOverlapNode } from "../utils/cursor";

// DOM 요소를 만드는 역할
class BlockquoteWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.innerText = this.text;
    wrap.setAttribute("aria-hidden", "false");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

// 실제 Decoration을 적용하는 역할
function quotes(state: EditorState) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.type.is("Blockquote")) {
        const isMouseOver = isSelectionOverlapNode(cursor, node);
        const startLine = state.doc.lineAt(node.from);
        const endLine = state.doc.lineAt(node.to);

        for (
          let lineNum = startLine.number;
          lineNum <= endLine.number;
          lineNum++
        ) {
          let backgroundDecoClass = "cm-blockquote cm-blockquote-bg";
          const line = state.doc.line(lineNum);
          if (line.number === startLine.number) {
            backgroundDecoClass +=
              " cm-blockquote-begin cm-blockquote-begin-bg";
          }
          if (line.number === endLine.number) {
            backgroundDecoClass += " cm-blockquote-end cm-blockquote-end-bg";
          }
          decorations.push(
            Decoration.line({ class: backgroundDecoClass }).range(line.from)
          );

          if (isMouseOver) {
            decorations.push(
              Decoration.mark({
                class: "cm-formatting cm-formatting-blockquote cm-blockquote",
              }).range(line.from, line.from + 2)
            );
          } else {
            decorations.push(
              Decoration.replace({
                widget: new BlockquoteWidget(line.text.slice(2)),
              }).range(line.from, line.from + line.length)
            );
          }
        }
      }
    },
  });
  return RangeSet.of(decorations, true);
}

const quotePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = quotes(view.state);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet)
        this.decorations = quotes(update.view.state);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export default quotePlugin;
