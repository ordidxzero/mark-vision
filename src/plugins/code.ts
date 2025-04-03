import {
  WidgetType,
  EditorView,
  Decoration,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
  PluginValue,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, RangeSet } from "@codemirror/state";
import { isSelectionOverlapNode } from "../utils/cursor";
import { generateDecorationRanges } from "../utils/decoration";
import { iterateVisibleSyntaxTree } from "../utils/syntaxTree";

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

class CodePlugin implements PluginValue {
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
          const startLine = view.state.doc.lineAt(node.from);
          const endLine = view.state.doc.lineAt(node.to);
          for (
            let lineNum = startLine.number;
            lineNum <= endLine.number;
            lineNum++
          ) {
            let backgroundDecoClass = "cm-codeblock cm-codeblock-bg";
            const line = view.state.doc.line(lineNum);
            if (line.number === startLine.number) {
              backgroundDecoClass +=
                " cm-codeblock-begin cm-codeblock-begin-bg";
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

    return Decoration.set(decorations, true);
  }
}

const codePlugin = ViewPlugin.fromClass(CodePlugin, {
  decorations: (v) => v.decorations,
});

const inlineCodeTheme = EditorView.baseTheme({
  ".cm-inline-code": {
    backgroundColor: "rgba(135, 131, 120, 0.15)",
  },
  ".cm-inline-code:has(+ .cm-formatting-inline-code)": {
    padding: "1px 0",
  },
  ".cm-inline-code:not(.cm-formatting-inline-code):not(:has(+ .cm-formatting-inline-code))":
    {
      borderRadius: "2px",
      padding: "1px 4px",
    },
  ".cm-formatting-inline-code:has(+ .cm-inline-code)": {
    borderTopLeftRadius: "2px",
    borderBottomLeftRadius: "2px",
    padding: "1px 0 1px 4px",
  },
  ".cm-inline-code + .cm-formatting-inline-code": {
    borderTopRightRadius: "2px",
    borderBottomRightRadius: "2px",
    padding: "1px 4px 1px 0",
  },
});

const fencedCodeTheme = EditorView.baseTheme({
  ".cm-line.cm-codeblock-bg": {
    display: "flex",
    backgroundColor: "rgb(156, 156, 156, 0.15)",
    margin: "0 8px",
    paddingLeft: "8px",
  },
  ".cm-codeblock-bg.cm-codeblock-begin-bg": {
    borderTopLeftRadius: "4px",
    borderTopRightRadius: "4px",
  },
  ".cm-codeblock-bg.cm-codeblock-end-bg": {
    borderBottomLeftRadius: "4px",
    borderBottomRightRadius: "4px",
  },
});

const code = () => [codePlugin, inlineCodeTheme, fencedCodeTheme];

export default code;
