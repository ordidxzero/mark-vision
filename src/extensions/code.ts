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
import { generateDecorationRanges } from "../utils/decoration";

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

// DOM 요소를 만드는 역할
class CodeblockWidget extends WidgetType {
  constructor(readonly codeInfo?: string) {
    super();
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "false");
    if (this.codeInfo !== undefined) {
      const codeInfoWrapper = document.createElement("span");
      codeInfoWrapper.innerText = this.codeInfo;
      wrap.appendChild(codeInfoWrapper);
    }
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

// 실제 Decoration을 적용하는 역할
function code(state: EditorState) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.type.is("InlineCode")) {
        decorations.push(
          Decoration.mark({ class: `cm-inline-code` }).range(
            node.from + 1,
            node.to - 1
          )
        );

        const markerDeco = isSelectionOverlapNode(cursor, node)
          ? Decoration.mark({
              class: `cm-formatting cm-formatting-inline-code cm-inline-code`,
            })
          : Decoration.replace({});

        decorations.push(
          ...generateDecorationRanges(markerDeco, [
            [node.from, node.from + 1],
            [node.to - 1, node.to],
          ])
        );
      }

      if (node.type.is("FencedCode")) {
        const isMouseOver = isSelectionOverlapNode(cursor, node);
        const startLine = state.doc.lineAt(node.from);
        const endLine = state.doc.lineAt(node.to);

        for (
          let lineNum = startLine.number;
          lineNum <= endLine.number;
          lineNum++
        ) {
          let backgroundDecoClass = "cm-codeblock cm-codeblock-bg";
          const line = state.doc.line(lineNum);
          if (line.number === startLine.number) {
            backgroundDecoClass += " cm-codeblock-begin cm-codeblock-begin-bg";
          }
          if (line.number === endLine.number) {
            backgroundDecoClass += " cm-codeblock-end cm-codeblock-end-bg";
          }

          decorations.push(
            Decoration.line({ class: backgroundDecoClass }).range(line.from)
          );
        }

        if (isMouseOver) {
          decorations.push(
            Decoration.mark({
              class: `cm-formatting cm-formatting-codeblock cm-codeblock`,
            }).range(startLine.from, startLine.from + startLine.length)
          );
          if (endLine.length !== 0) {
            decorations.push(
              Decoration.mark({
                class: `cm-formatting cm-formatting-codeblock cm-codeblock`,
              }).range(endLine.from, endLine.from + endLine.length)
            );
          }
        } else {
          const startLineText = startLine.text.slice(3);
          decorations.push(
            Decoration.replace({
              widget: new CodeblockWidget(startLineText),
            }).range(startLine.from, startLine.to)
          );
          decorations.push(
            Decoration.replace({ widget: new CodeblockWidget() }).range(
              endLine.from,
              endLine.to
            )
          );
        }
      }
    },
  });
  return RangeSet.of(decorations, true);
}

const codePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = code(view.state);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet)
        this.decorations = code(update.view.state);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export default codePlugin;
