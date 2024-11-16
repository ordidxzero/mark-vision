import { ViewPlugin } from "@codemirror/view";
import MarkVisionPlugin from "./main";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import Highlight, { highlightCSS } from "./markdown/highlight";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import Underline, { underlineCSS } from "./markdown/underline";
import taskPlugin from "./extensions/task";

export default function (config: any) {
  return ViewPlugin.fromClass(MarkVisionPlugin, {
    decorations: (v) => v.decorations,
    provide: (p) => [
      taskPlugin,
      syntaxHighlighting(highlightCSS),
      syntaxHighlighting(underlineCSS),
      syntaxHighlighting(defaultHighlightStyle),
      markdown({
        base: markdownLanguage,
        extensions: [Highlight, Underline],
        addKeymap: false,
      }),
    ],
  });
}
