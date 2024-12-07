import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import MarkVisionPlugin from "./main";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import Highlight, { highlightCSS } from "./markdown/highlight";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import Underline, { underlineCSS } from "./markdown/underline";
import taskPlugin from "./extensions/task";
import ExtendedOrderedList from "./markdown/extendedOrderedList";
import { EditorState, Prec } from "@codemirror/state";
import { insertNewlineContinueMarkup } from "./commands/insertNewlineContinueMarkup";
import { indentWithTab } from "./commands/indentWithTab";
import linkPlugin from "./extensions/link";
import Hashtag, { hashtagCSS } from "./markdown/hashtag";
import Mention, { mentionCSS } from "./markdown/mention";
import codePlugin from "./extensions/code";
import quotePlugin from "./extensions/quote";
import footnotePlugin from "./extensions/footnote";

export default function (config: any) {
  return ViewPlugin.fromClass(MarkVisionPlugin, {
    decorations: (v) => v.decorations,
    provide: (p) => [
      EditorView.baseTheme({
        "&.cm-focused": {
          outline: "none",
        },
      }),
      Prec.high(
        keymap.of([
          { key: "Enter", run: insertNewlineContinueMarkup },
          indentWithTab,
        ])
      ),
      taskPlugin,
      linkPlugin,
      codePlugin,
      quotePlugin,
      footnotePlugin,
      syntaxHighlighting(highlightCSS),
      syntaxHighlighting(underlineCSS),
      syntaxHighlighting(hashtagCSS),
      syntaxHighlighting(mentionCSS),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.theme({
        // Highlight Styling
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

        // InlineCode Styling
        ".cm-inline-code": {
          backgroundColor: "rgba(135, 131, 120, 0.15)",
        },
        ".cm-inline-code:has(+ .cm-formatting-inline-code)": {
          padding: "1px 0",
        },
        ".cm-inline-code:not(.cm-formatting-inline-code):not(:has(+ .cm-formatting-inline-code))":
          {
            borderRadius: "2px",
            padding: "1px 4px",
          },
        ".cm-formatting-inline-code:has(+ .cm-inline-code)": {
          borderTopLeftRadius: "2px",
          borderBottomLeftRadius: "2px",
          padding: "1px 0 1px 4px",
        },
        ".cm-inline-code + .cm-formatting-inline-code": {
          borderTopRightRadius: "2px",
          borderBottomRightRadius: "2px",
          padding: "1px 4px 1px 0",
        },

        // Link Styling
        ".cm-anchor": {
          textDecoration: "underline",
          color: "blue",
        },

        // Hashtag Styling
        ".cm-tag": {
          backgroundColor: "#008CFF",
        },
        ".cm-tag *": {
          fontSize: "0.75rem",
        },
        ".cm-tag.cm-tag-begin": {
          borderRadius: "2px 0 0 2px",
          padding: "1px 0 1px 4px",
        },
        ".cm-tag.cm-tag-end": {
          borderRadius: "0 2px 2px 0",
          padding: "1px 4px 1px 0",
        },

        // Mention Styling
        ".cm-mention": {
          backgroundColor: "rgba(135, 131, 120, 0.15)",
        },
        ".cm-mention *": {
          fontSize: "0.75rem",
        },
        ".cm-mention.cm-mention-begin": {
          borderRadius: "2px 0 0 2px",
          padding: "1px 0 1px 4px",
        },
        ".cm-mention.cm-mention-end": {
          borderRadius: "0 2px 2px 0",
          padding: "1px 4px 1px 0",
        },

        // Horizontal Rule Styling
        ".cm-hr": {
          display: "flex",
          alignItems: "center",
        },
        ".cm-hr hr": {
          width: "100%",
          borderColor: "black",
        },

        // Codeblock Styling
        ".cm-line.cm-codeblock-bg": {
          display: "flex",
          backgroundColor: "rgb(156, 156, 156, 0.15)",
          margin: "0 8px",
          paddingLeft: "8px",
        },
        ".cm-codeblock-bg.cm-codeblock-begin-bg": {
          borderTopLeftRadius: "4px",
          borderTopRightRadius: "4px",
        },
        ".cm-codeblock-bg.cm-codeblock-end-bg": {
          borderBottomLeftRadius: "4px",
          borderBottomRightRadius: "4px",
        },

        // Blockquote Styling
        ".cm-line.cm-blockquote-bg": {
          display: "flex",
          backgroundColor: "rgb(156, 156, 156, 0.15)",
          margin: "0 8px",
          paddingLeft: "8px",
          borderLeft: "1px solid black",
        },
        ".cm-blockquote-bg.cm-blockquote-begin-bg": {
          borderTopRightRadius: "4px",
        },
        ".cm-blockquote-bg.cm-blockquote-end-bg": {
          borderBottomRightRadius: "4px",
        },
      }),
      markdown({
        base: markdownLanguage,
        extensions: [
          ExtendedOrderedList,
          Highlight,
          Underline,
          Hashtag,
          Mention,
        ],
        addKeymap: false,
      }),
      EditorView.lineWrapping,
    ],
  });
}
