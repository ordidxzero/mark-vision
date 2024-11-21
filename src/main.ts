import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range } from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";
import { isSelectionOverlapNode } from "./utils";

const decorationHide = Decoration.mark({ class: "cm-token" });

const heading = (node: SyntaxNodeRef): Range<Decoration> => {
  if (node.name.includes("Heading")) {
    const level = node.name.split("Heading")[1];
    return Decoration.line({
      class: `cm-heading-${level} cm-heading-line`,
    }).range(node.from);
  }

  if (node.type.is("HeaderMark")) {
    if (
      node.matchContext(["SetextHeading1"]) ||
      node.matchContext(["SetextHeading2"])
    ) {
      return Decoration.line({
        class: "cm-heading-line cm-heading-setex-line",
      }).range(node.from);
    } else {
      return decorationHide.range(node.from, node.to + 1);
    }
  }

  throw Error("Not Implemented");
};

function camelToSnake(camelCaseStr: string) {
  return camelCaseStr
    .replace(/([a-z])([A-Z])/g, "$1-$2") // 소문자와 대문자 사이에 '_' 추가
    .toLowerCase(); // 결과를 소문자로 변환
}

const emphasis = (node: SyntaxNodeRef): Range<Decoration> => {
  if (node.name.includes("Mark")) {
    return decorationHide.range(node.from, node.to);
  }
  return Decoration.mark({ class: `cm-${camelToSnake(node.name)}` }).range(
    node.from,
    node.to
  );
};

const code = (node: SyntaxNodeRef): Range<Decoration> => {
  if (node.type.is("CodeMark") && node.matchContext(["InlineCode"])) {
    return decorationHide.range(node.from, node.to);
  }

  return Decoration.line({ class: "temp" }).range(node.from);
};

const list = (node: SyntaxNodeRef): Range<Decoration> => {
  return Decoration.mark({ class: "cm-list-item" }).range(
    node.from,
    node.to + 1
  );
};

const quote = (
  node: SyntaxNodeRef,
  state: EditorState
): Range<Decoration>[] => {
  if (node.type.is("Blockquote")) {
    const blockquouteLines = state.doc
      .sliceString(node.from, node.to)
      .split("\n").length;
    const startLine = state.doc.lineAt(node.from);
    const endLine = state.doc.line(startLine.number + blockquouteLines - 1);
    return [
      Decoration.line({ class: "cm-block-quote-begin" }).range(startLine.from),
      Decoration.line({ class: "cm-block-quote-end" }).range(endLine.from),
    ];
  }
  return [decorationHide.range(node.from, node.to + 1)];
};

const horizontalRule = (node: SyntaxNodeRef): Range<Decoration> => {
  return Decoration.line({ class: "cm-horizontal-rule-line" }).range(node.from);
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
        // cursor가 node 안에 있거나 node가 selection range에 포함되는 경우, 토큰을 보여준다.
        if (
          !node.type.is("Document") &&
          !node.type.is("Paragraph") &&
          !node.name.includes("Mark") &&
          isSelectionOverlapNode(cursor, node)
        ) {
          return false;
        }

        // * ==== 1. Heading ====
        if (node.name.includes("Heading") || node.type.is("HeaderMark")) {
          decorations.push(heading(node));
        }
        // * ====================

        // * ==== 2. Emphasis ====
        if (
          [
            "Emphasis", // *, _, **, __ (StrongEmphasis도 같이 계산)
            "Strikethrough", // ~~
            "Highlight", // ==
            "Underline", // --
          ].some((name) => node.name.includes(name))
        ) {
          decorations.push(emphasis(node));
        }
        // * =====================

        // * ==== 3. InlineCode, FencedCode ====
        if (node.name.includes("Code")) {
          // InlineCode, FencedCode, CodeMark, CodeText
          decorations.push(code(node));
        }
        // * ===================================

        // * ==== 4. Horizontal Rule ====
        if (node.type.is("HorizontalRule")) {
          decorations.push(horizontalRule(node));
        }
        // * ============================

        // * ==== 5. List ====
        if (node.type.is("ListMark")) {
          decorations.push(list(node));
        }
        // * =================

        // * ==== 6. Link, Image, Footnote ====
        // * ==================================

        // * ==== 7. Quote ====
        if (node.name.toLowerCase().includes("quote")) {
          decorations.push(...quote(node, view.state));
        }
        // * ==================

        // * ==== 8. HashTag ====
        // * ====================

        // * ==== 9. Mention ====
        // * ====================

        // * ==== 10. Alert ====
        // * ===================

        // * ==== 11. Emoji ====
        // * ===================

        // * ==== 12. Table ====
        // * ===================

        // * ==== 13. Front matter ====
        // * ==========================
      },
    });

    return Decoration.set(decorations, true);
  }
}

export default MarkVisionPlugin;
