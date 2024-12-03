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
      }),
      markdown({
        base: markdownLanguage,
        extensions: [ExtendedOrderedList, Highlight, Underline],
        addKeymap: false,
      }),
      EditorView.lineWrapping,
    ],
  });
}
