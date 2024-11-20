import { tags as t } from "@lezer/highlight";
import type {
  Line,
  BlockContext,
  MarkdownConfig,
  NodeSpec,
} from "@lezer/markdown";

export enum Type {
  Document = 1,

  CodeBlock,
  FencedCode,
  Blockquote,
  HorizontalRule,
  BulletList,
  OrderedList,
  ListItem,
  ATXHeading1,
  ATXHeading2,
  ATXHeading3,
  ATXHeading4,
  ATXHeading5,
  ATXHeading6,
  SetextHeading1,
  SetextHeading2,
  HTMLBlock,
  LinkReference,
  Paragraph,
  CommentBlock,
  ProcessingInstructionBlock,

  // Inline
  Escape,
  Entity,
  HardBreak,
  Emphasis,
  StrongEmphasis,
  Link,
  Image,
  InlineCode,
  HTMLTag,
  Comment,
  ProcessingInstruction,
  Autolink,

  // Smaller tokens
  HeaderMark,
  QuoteMark,
  ListMark,
  LinkMark,
  EmphasisMark,
  CodeMark,
  CodeText,
  CodeInfo,
  LinkTitle,
  LinkLabel,
  URL,
}

const NODE_NAME = "ExtendedOrderedList";

const nodeSpecs: NodeSpec[] = [
  {
    name: NODE_NAME,
    block: true,
    style: t.list,
  },
];

export function space(ch: number) {
  return ch == 32 || ch == 9 || ch == 10 || ch == 13;
}

function inList(cx: any, type: Type) {
  for (let i = cx.stack.length - 1; i >= 0; i--)
    if (cx.stack[i].type == type) return true;
  return false;
}

function isOrderedList(line: Line, cx: BlockContext, breaking: boolean) {
  let pos = line.pos,
    next = line.next;
  for (;;) {
    if (next >= 48 && next <= 57 /* '0-9' */) pos++;
    else break;
    if (pos == line.text.length) return -1;
    next = line.text.charCodeAt(pos);
  }
  if (
    pos == line.pos ||
    pos > line.pos + 9 ||
    (next != 46 && next != 41) /* '.)' */ ||
    (pos < line.text.length - 1 && !space(line.text.charCodeAt(pos + 1))) ||
    (breaking &&
      !inList(cx, Type.OrderedList) &&
      (line.skipSpace(pos + 1) == line.text.length ||
        pos > line.pos + 1 ||
        line.next != 49)) /* '1' */
  )
    return -1;
  return pos + 1 - line.pos;
}

function getListIndent(line: Line, pos: number) {
  const indentAfter = line.countIndent(pos, line.pos, line.indent);
  const indented = line.countIndent(line.skipSpace(pos), pos, indentAfter);
  return indented >= indentAfter + 5 ? indentAfter + 1 : indented;
}

const ExtendedOrderedList = {
  defineNodes: nodeSpecs,
  remove: ["OrderedList"],
  parseBlock: [
    {
      name: NODE_NAME,
      before: "IndentedCode",
      parse(cx, line) {
        const size = isOrderedList(line, cx, false);
        if (size < 0) return false;
        if (cx.parentType().name !== "OrderedList")
          cx.startComposite(
            "OrderedList",
            line.basePos,
            line.text.charCodeAt(line.pos + size - 1)
          );
        const newBase = getListIndent(line, line.pos + size);
        cx.startComposite("ListItem", line.basePos, newBase - line.baseIndent);
        cx.addElement(
          cx.elt(
            "ListMark",
            cx.lineStart + line.pos,
            cx.lineStart + line.pos + size
          )
        );
        line.moveBaseColumn(newBase);
        return cx.nextLine();
      },
    },
  ],
} as MarkdownConfig;

export default ExtendedOrderedList;
