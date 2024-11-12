import { MarkdownConfig } from "@lezer/markdown";
import { styleTags, Tag, tags } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/language";

const UnderlineDelim = { resolve: "Underline", mark: "UnderlineMark" };

const underlineTag = Tag.define();

export const underlineCSS = HighlightStyle.define([
  { tag: underlineTag, textDecoration: "underline" },
]);

const Underline: MarkdownConfig = {
  defineNodes: ["Underline", "UnderlineMark"],
  parseInline: [
    {
      name: "Underline",
      parse(cx, next, pos) {
        if (next != 45 /* '-' */ || cx.char(pos + 1) != 45) return -1;
        return cx.addDelimiter(UnderlineDelim, pos, pos + 2, true, true);
      },
      after: "Emphasis",
    },
  ],
  props: [
    styleTags({
      UnderlineMark: tags.processingInstruction,
      Underline: tags.special(underlineTag),
    }),
  ],
};

export default Underline;
