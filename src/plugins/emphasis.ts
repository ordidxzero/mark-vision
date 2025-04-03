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
import { generateDecorationRanges } from "../utils/decoration";

function camelToSnake(camelCaseStr: string) {
  return camelCaseStr
    .replace(/([a-z])([A-Z])/g, "$1-$2") // 소문자와 대문자 사이에 '_' 추가
    .toLowerCase(); // 결과를 소문자로 변환
}

const EMPHASIS_LIST = [
  "Emphasis", // *, _, **, __ (StrongEmphasis도 같이 계산)
  "StrongEmphasis",
  "Strikethrough", // ~~
  "Highlight", // ==
  "Underline", // --
];

class EmphasisPlugin implements PluginValue {
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
        if (EMPHASIS_LIST.includes(node.name)) {
          const name = camelToSnake(node.name);
          const markerSize = node.type.is("Emphasis") ? 1 : 2;

          decorations.push(
            Decoration.mark({ class: `cm-${name}` }).range(
              node.from + markerSize,
              node.to - markerSize
            )
          );

          const markerDecoration = isSelectionOverlapNode(cursor, node)
            ? Decoration.mark({
                class: `cm-formatting cm-formatting-${name} cm-${name}`,
              })
            : Decoration.replace({});

          decorations.push(
            ...generateDecorationRanges(markerDecoration, [
              [node.from, node.from + markerSize],
              [node.to - markerSize, node.to],
            ])
          );
        }
      },
    });

    return Decoration.set(decorations, true);
  }
}

const emphasisPlugin = ViewPlugin.fromClass(EmphasisPlugin, {
  decorations: (v) => v.decorations,
});

const highlightTheme = EditorView.baseTheme({
  ".cm-highlight": {
    backgroundColor: "rgba(255, 177, 80, 0.3)",
  },
  ".cm-highlight:has(+ .cm-formatting-highlight)": {
    padding: "1px 0",
  },
  ".cm-highlight:not(.cm-formatting-highlight):not(:has(+ .cm-formatting-highlight))":
    {
      borderRadius: "2px",
      padding: "1px 4px",
    },
  ".cm-formatting-highlight:has(+ .cm-highlight)": {
    borderTopLeftRadius: "2px",
    borderBottomLeftRadius: "2px",
    padding: "1px 0 1px 4px",
  },
  ".cm-highlight + .cm-formatting-highlight": {
    borderTopRightRadius: "2px",
    borderBottomRightRadius: "2px",
    padding: "1px 4px 1px 0",
  },
});

const underlineTheme = EditorView.baseTheme({
  ".cm-underline": {
    textDecoration: "underline",
  },
});

const emphasis = () => [emphasisPlugin, highlightTheme, underlineTheme];

export default emphasis;
