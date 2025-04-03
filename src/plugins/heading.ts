import { Line, Range } from "@codemirror/state";
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

class HeadingPlugin implements PluginValue {
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

    iterateVisibleSyntaxTree(view, {
      enter(node) {
        // HeaderMark는 고려하지 않는다.
        if (node.name.includes("Heading")) {
          const level = +node.name.split("Heading")[1];
          // SetextHeading을 처리하는 로직 (===, ---를 사용하는 Heading)
          if (node.name.includes("Setext")) {
            const lastChild = node.node.lastChild!; // ===, ---를 감지하기 위함
            let line: Line = view.state.doc.lineAt(node.from);

            while (line.text !== "===" && line.text !== "---") {
              decorations.push(
                Decoration.line({
                  class: `cm-heading cm-heading-${level}`,
                }).range(line.from)
              );
              line = view.state.doc.lineAt(
                line.to + 1 >= lastChild.from ? lastChild.from : line.to + 1
              );
              if (line.from === lastChild.from) break;
            }
            let decoration = Decoration.line({
              class: `cm-heading-line cm-heading-line-${level}`,
            });
            if (isSelectionOverlapNode(cursor, node)) {
              decoration = Decoration.line({
                class: `cm-formatting cm-formatting-heading-line cm-formatting-heading-line-${level} cm-heading-line cm-heading-line-${level}`,
              });
            }
            decorations.push(decoration.range(line.from));
          } else {
            // #을 사용하는 Heading
            decorations.push(
              Decoration.line({
                class: `cm-heading cm-heading-${level}`,
              }).range(node.from)
            );
            let deco = Decoration.replace({});
            if (isSelectionOverlapNode(cursor, node)) {
              deco = Decoration.mark({
                class: `cm-formatting cm-formatting-heading cm-formatting-heading-${level} cm-heading cm-heading-${level}`,
              });
            }
            decorations.push(deco.range(node.from, node.from + level + 1));
          }
          return;
        }
      },
    });

    return Decoration.set(decorations, true);
  }
}

const headingPlugin = ViewPlugin.fromClass(HeadingPlugin, {
  decorations: (v) => v.decorations,
});

const baseTheme = EditorView.baseTheme({
  ".cm-heading": {
    fontWeight: "bold",
    margin: "0.5rem 0 0.35rem 0",
  },
  ".cm-heading *": {
    textDecoration: "none",
  },
  ".cm-heading-line *": {
    textDecoration: "none",
  },
  ".cm-heading-1": {
    fontSize: "2.027rem",
    lineHeight: "1.15",
    color: "oklch(0.577 0.245 27.325)", // dark and light common
  },
  ".cm-heading-2": {
    fontSize: "1.802rem",
    lineHeight: "1.15",
    color: "oklch(0.769 0.188 70.08)", // dark and light common
  },
  ".cm-heading-3": {
    fontSize: "1.602rem",
    lineHeight: "1.15",
    color: "oklch(0.905 0.182 98.111)", // dark and light common
  },
  ".cm-heading-4": {
    fontSize: "1.424rem",
    lineHeight: "1.15",
    color: "oklch(0.841 0.238 128.85)", // dark and light common
  },
  ".cm-heading-5": {
    fontSize: "1.266rem",
    lineHeight: "1.15",
    color: "oklch(0.746 0.16 232.661)", // dark and light common
  },
  ".cm-heading-6": {
    fontSize: "1.125rem",
    lineHeight: "1.15",
    color: "oklch(0.714 0.203 305.504)", // dark and light common
  },
});

const heading = () => [headingPlugin, baseTheme];

export default heading;
