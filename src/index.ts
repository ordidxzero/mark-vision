import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import MarkVisionPlugin from "./main";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import Highlight from "./markdown/highlight";
import Underline from "./markdown/underline";
import ExtendedOrderedList from "./markdown/extendedOrderedList";
import { Prec } from "@codemirror/state";
import { insertNewlineContinueMarkup } from "./commands/insertNewlineContinueMarkup";
import { indentWithTab } from "./commands/indentWithTab";
import Hashtag from "./markdown/hashtag";
import Mention from "./markdown/mention";
import quotePlugin from "./extensions/quote";
import footnotePlugin from "./extensions/footnote";
import { Alert } from "./markdown/alert";
import heading from "./plugins/heading";
import emphasis from "./plugins/emphasis";
import hr from "./plugins/hr";
import code from "./plugins/code";
import escape from "./plugins/escape";
import mention from "./plugins/mention";
import hashtag from "./plugins/hashtag";
import task from "./plugins/task";
import image from "./plugins/image";
import link from "./plugins/link";

export default function (config?: any) {
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
      heading(),
      emphasis(),
      hr(),
      code(),
      escape(),
      mention(),
      hashtag(),
      task(),
      link(),
      image(),
      quotePlugin,
      footnotePlugin,
      EditorView.theme({
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
          Alert,
        ],
        addKeymap: false,
      }),
      EditorView.lineWrapping,
    ],
  });
}
