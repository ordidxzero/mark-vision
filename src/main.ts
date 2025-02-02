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
import HorizontalRuleWidget from "./widgets/HorizontalRule";

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

const hashtag = (node: SyntaxNodeRef): Range<Decoration>[] => {
  const markerDeco = Decoration.mark({
    class: "cm-formatting cm-formatting-tag cm-tag cm-tag-begin",
  }).range(node.from, node.from + 1);
  const nodeDeco = Decoration.mark({
    class: "cm-tag cm-tag-end",
  }).range(node.from + 1, node.to);
  return [markerDeco, nodeDeco];
};

const mention = (node: SyntaxNodeRef): Range<Decoration>[] => {
  const markerDeco = Decoration.mark({
    class: "cm-formatting cm-formatting-mention cm-mention cm-mention-begin",
  }).range(node.from, node.from + 1);
  const nodeDeco = Decoration.mark({
    class: "cm-mention cm-mention-end",
  }).range(node.from + 1, node.to);
  return [markerDeco, nodeDeco];
};

const horizontalRule = (
  state: EditorState,
  node: SyntaxNodeRef
): Range<Decoration>[] => {
  const decorations: Range<Decoration>[] = [
    Decoration.line({ class: "cm-formatting cm-formatting-hr cm-hr" }).range(
      node.from
    ),
  ];
  const line = state.doc.lineAt(node.from);
  const [cursor] = state.selection.ranges;
  if (!isSelectionOverlapNode(cursor, node)) {
    decorations.push(
      ...[
        Decoration.widget({ widget: new HorizontalRuleWidget() }).range(
          line.from
        ),
        Decoration.replace({}).range(node.from, node.to),
      ]
    );
  }
  return decorations;
};

const escape = (
  state: EditorState,
  node: SyntaxNodeRef
): Range<Decoration>[] => {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  let deco = Decoration.replace({});
  if (isSelectionOverlapNode(cursor, node)) {
    deco = Decoration.mark({
      class: `cm-formatting cm-formatting-escape cm-escape`,
    });
  }
  decorations.push(deco.range(node.from, node.from + 1));
  return decorations;
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
        // * >> extensions/code.ts
        // * ===================================

        // * ==== 4. Horizontal Rule ====
        if (node.type.is("HorizontalRule")) {
          decorations.push(...horizontalRule(view.state, node));
        }
        // * ============================

        // * ==== 5. List ====
        // * >> markdown/extendedOrderedList.ts
        // * =================

        // * ==== 6. Link, Image, Footnote ====
        // * >> extensions/link.ts
        // * ==================================

        // * ==== 7. Quote ====
        // * >> extensions/quote.ts
        // * ==================

        // * ==== 8. HashTag ====
        if (node.type.is("Hashtag")) {
          decorations.push(...hashtag(node));
        }
        // * ====================

        // * ==== 9. Mention ====
        if (node.type.is("Mention")) {
          decorations.push(...mention(node));
        }
        // * ====================

        // * ==== 10. Escape ====
        if (node.type.is("Escape")) {
          decorations.push(...escape(view.state, node));
        }
        // * ====================

        // * ==== 11. Alert ====
        // * ===================

        // * ==== 12. Emoji ====
        // * ===================

        // * ==== 13. Table ====
        // * ===================

        // * ==== 14. Front matter ====
        // * ==========================
      },
    });

    return Decoration.set(decorations, true);
  }
}

export default MarkVisionPlugin;
