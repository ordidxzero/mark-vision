import { MarkdownConfig } from "@lezer/markdown";
import { styleTags, Tag, tags } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/language";

const HighlightDelim = { resolve: "Highlight", mark: "EmphasisMark" };

const highlightTag = Tag.define();

let Punctuation = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\u2010-\u2027]/;

export const highlightCSS = HighlightStyle.define([
  {
    tag: highlightTag,
    // backgroundColor: "rgba(255, 177, 80, 0.3)",
    // padding: "2px",
    // borderRadius: "2px",
  },
]);

const Highlight: MarkdownConfig = {
  defineNodes: ["Highlight"],
  parseInline: [
    {
      name: "Highlight",
      parse(cx, next, start) {
        // next: 사용자가 입력한 문자 (혹은 특정 delimiter의 시작 위치에서의 문자)
        // start: 특정 delimiter의 시작 위치
        // 문자가 입력될 때마다 이 함수가 호출된다. -1을 리턴하면 아무것도 안하는 것.
        // console.log(next, start);
        if (
          next != 61 /* '=' */ ||
          cx.char(start + 1) != 61 ||
          cx.char(start + 2) == 61
        ) {
          return -1;
        }
        const before = cx.slice(start - 1, start);
        const after = cx.slice(start + 2, start + 3);
        let sBefore = /\s|^$/.test(before);
        let sAfter = /\s|^$/.test(after);
        let pBefore = Punctuation.test(before),
          pAfter = Punctuation.test(after);
        return cx.addDelimiter(
          HighlightDelim,
          start,
          start + 2,
          !sAfter && (!pAfter || sBefore || pBefore),
          !sBefore && (!pBefore || sAfter || pAfter)
        );
      },
      after: "Emphasis",
    },
  ],
  props: [
    styleTags({
      "Highlight/...": tags.special(highlightTag),
    }),
  ],
};

export default Highlight;
