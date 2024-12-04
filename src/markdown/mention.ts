import { MarkdownConfig } from "@lezer/markdown";
import { styleTags, Tag, tags } from "@lezer/highlight";
import { HighlightStyle, syntaxTree } from "@codemirror/language";

const mentionTag = Tag.define();

export const mentionCSS = HighlightStyle.define([{ tag: mentionTag }]);

function space(ch: number) {
  return ch == 32 || ch == 9 || ch == 10 || ch == 13;
}

const Mention: MarkdownConfig = {
  defineNodes: ["Mention", "MentionMark"],
  parseInline: [
    {
      name: "Mention",
      parse(cx, next, pos) {
        // pos: 현재 위치, next: 현재 위치에 입력된 문자
        // cx.char(pos+1)은 next보다 뒤에 있음. 즉, cx.char(pos) = next임
        if (
          next != 64 /* '#' */ ||
          (pos > 0 && cx.char(pos - 1) == 64) /* '##' */
        )
          return -1;

        const marker = cx.elt("MentionMark", pos, pos + 1);

        let to = -1;
        for (let i = pos + 1; i < cx.end; i++) {
          const next = cx.char(i);
          if (space(next)) break;
          if (next == 35) return -1;
          to = i;
        }
        if (to == -1) return -1;
        return cx.addElement(cx.elt("Mention", pos, to + 1, [marker]));
      },
      after: "Emphasis",
    },
  ],
  props: [
    styleTags({
      MentionMark: tags.processingInstruction,
      Mention: tags.special(mentionTag),
    }),
  ],
};

export default Mention;

// const tagOptions = [
//   "constructor",
//   "deprecated",
//   "link",
//   "param",
//   "returns",
//   "type",
// ].map((tag) => ({
//   label: "#" + tag,
//   type: "keyword",
// }));

// export function completeHashtag(context: CompletionContext) {
//   const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
//   if (nodeBefore.name !== "HeaderMark" && nodeBefore.name !== "Paragraph") {
//     // TODO: ListItem 등과 겹쳐질 때를 처리해야 함
//     return null;
//   }

//   if (nodeBefore.from > 0) {
//     if (
//       ![" ", "\n"].includes(
//         context.state.sliceDoc(nodeBefore.from - 1, nodeBefore.from)
//       )
//     ) {
//       return null;
//     }
//   }

//   const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos);
//   const tagBefore = /#\w*$/.exec(textBefore);

//   if (!tagBefore && !context.explicit) return null;

//   return {
//     from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
//     options: tagOptions,
//     validFor: /^(#\w*)?$/,
//   };
// }
