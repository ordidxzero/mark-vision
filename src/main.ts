import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, SelectionRange } from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";
import { isSelectionOverlapNode } from "./utils/cursor";
import { generateDecorationRanges } from "./utils/decoration";

const hiddenDecoration = Decoration.replace({});

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

const heading = (
  state: EditorState,
  node: SyntaxNodeRef
): Range<Decoration>[] => {
  const [cursor] = state.selection.ranges;
  const decorations: Range<Decoration>[] = [];
  const level = node.name.split("Heading")[1];

  if (node.name.includes("Setext")) {
    const endLine = state.doc.lineAt(node.to);
    let deco = Decoration.mark({ class: `cm-heading cm-heading-${level}` });
    if (isSelectionOverlapNode(cursor, node)) {
      deco = Decoration.mark({
        class: `cm-formatting cm-formatting-heading cm-formatting-heading-${level} cm-heading cm-heading-${level}`,
      });
    }
    decorations.push(deco.range(endLine.from, endLine.from + endLine.length));
  } else {
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
    decorations.push(deco.range(node.from, node.from + +level + 1));
  }

  return decorations;
};

function camelToSnake(camelCaseStr: string) {
  return camelCaseStr
    .replace(/([a-z])([A-Z])/g, "$1-$2") // 소문자와 대문자 사이에 '_' 추가
    .toLowerCase(); // 결과를 소문자로 변환
}

const emphasis = (
  cursor: SelectionRange,
  node: SyntaxNodeRef
): Range<Decoration>[] => {
  const decorations: Range<Decoration>[] = [];
  const name = camelToSnake(node.name);

  const markerLength = node.type.is("Emphasis") ? 1 : 2;

  decorations.push(
    Decoration.mark({ class: `cm-${name}` }).range(
      node.from + markerLength,
      node.to - markerLength
    )
  );

  const markerDeco = isSelectionOverlapNode(cursor, node)
    ? Decoration.mark({
        class: `cm-formatting cm-formatting-${name} cm-${name}`,
      })
    : hiddenDecoration;

  decorations.push(
    ...generateDecorationRanges(markerDeco, [
      [node.from, node.from + markerLength],
      [node.to - markerLength, node.to],
    ])
  );

  return decorations;
};

const code = (
  cursor: SelectionRange,
  node: SyntaxNodeRef
): Range<Decoration>[] => {
  const decorations: Range<Decoration>[] = [];
  const name = camelToSnake(node.name);
  if (node.type.is("InlineCode")) {
    decorations.push(
      Decoration.mark({ class: `cm-${name}` }).range(node.from + 1, node.to - 1)
    );

    const markerDeco = isSelectionOverlapNode(cursor, node)
      ? Decoration.mark({
          class: `cm-formatting cm-formatting-${name} cm-${name}`,
        })
      : hiddenDecoration;

    decorations.push(
      ...generateDecorationRanges(markerDeco, [
        [node.from, node.from + 1],
        [node.to - 1, node.to],
      ])
    );
    return decorations;
  }

  return [Decoration.line({ class: "temp" }).range(node.from)];
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
  return [hiddenDecoration.range(node.from, node.to + 1)];
};

const hashtag = (node: SyntaxNodeRef): Range<Decoration>[] => {
  const markerDeco = Decoration.mark({
    class: "cm-formatting cm-formatting-tag cm-tag cm-tag-begin",
  }).range(node.from, node.from + 1);
  const nodeDeco = Decoration.mark({
    class: "cm-tag cm-tag-end",
  }).range(node.from + 1, node.to);
  return [markerDeco, nodeDeco];
};

const horizontalRule = (node: SyntaxNodeRef): Range<Decoration> => {
  return Decoration.line({ class: "cm-horizontal-rule" }).range(node.from);
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
        decorations.push(...activeLine(view.state, cursor));

        // * ==== 1. Heading ====
        if (node.name.includes("Heading")) {
          decorations.push(...heading(view.state, node));
        }
        // * ====================

        // * ==== 2. Emphasis ====
        if (
          [
            "Emphasis", // *, _, **, __ (StrongEmphasis도 같이 계산)
            "StrongEmphasis",
            "Strikethrough", // ~~
            "Highlight", // ==
            "Underline", // --
          ].includes(node.name)
        ) {
          decorations.push(...emphasis(cursor, node));
        }
        // * =====================

        // * ==== 3. InlineCode, FencedCode ====
        if (node.name.includes("Code") && !node.name.includes("Mark")) {
          // InlineCode, FencedCode, CodeText
          decorations.push(...code(cursor, node));
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
        // * >> extensions/link.ts
        // * ==================================

        // * ==== 7. Quote ====
        if (node.name.toLowerCase().includes("quote")) {
          decorations.push(...quote(node, view.state));
        }
        // * ==================

        // * ==== 8. HashTag ====
        if (node.type.is("Hashtag")) {
          decorations.push(...hashtag(node));
        }
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
