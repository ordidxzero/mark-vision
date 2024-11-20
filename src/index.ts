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
import { Prec } from "@codemirror/state";
import { insertNewlineContinueMarkup } from "./commands/insertNewlineContinueMarkup";
import { indentWithTab } from "./commands/indentWithTab";

export default function (config: any) {
  return ViewPlugin.fromClass(MarkVisionPlugin, {
    decorations: (v) => v.decorations,
    provide: (p) => [
      EditorView.theme({
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
      syntaxHighlighting(highlightCSS),
      syntaxHighlighting(underlineCSS),
      syntaxHighlighting(defaultHighlightStyle),
      markdown({
        base: markdownLanguage,
        extensions: [ExtendedOrderedList, Highlight, Underline],
        addKeymap: false,
      }),
      EditorView.lineWrapping,
    ],
  });
}
