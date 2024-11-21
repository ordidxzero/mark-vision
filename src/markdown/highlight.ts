import { MarkdownConfig } from "@lezer/markdown";
import { styleTags, Tag, tags } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/language";

const HighlightDelim = { resolve: "Highlight", mark: "HighlightMark" };

const highlightTag = Tag.define();

export const highlightCSS = HighlightStyle.define([
  {
    tag: highlightTag,
    backgroundColor: "rgba(255, 177, 80, 0.3)",
    padding: "2px",
    borderRadius: "2px",
  },
]);

const Highlight: MarkdownConfig = {
  defineNodes: ["Highlight", "HighlightMark"],
  parseInline: [
    {
      name: "Highlight",
      parse(cx, next, pos) {
        if (next != 61 /* '=' */ || cx.char(pos + 1) != 61) return -1;
        return cx.addDelimiter(HighlightDelim, pos, pos + 2, true, true);
      },
      after: "Emphasis",
    },
  ],
  props: [
    styleTags({
      HighlightMark: tags.meta,
      Highlight: tags.special(highlightTag),
    }),
  ],
};

export default Highlight;
