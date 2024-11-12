import { ViewPlugin } from "@codemirror/view";
import MarkVisionPlugin from "./main";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import Highlight, { highlightCSS } from "./markdown/highlight";
import { syntaxHighlighting } from "@codemirror/language";
import Underline, { underlineCSS } from "./markdown/underline";

export default function (config: any) {
  return ViewPlugin.fromClass(MarkVisionPlugin, {
    decorations: (v) => v.decorations,
    provide: (p) => [
      markdown({ base: markdownLanguage, extensions: [Highlight, Underline] }),
      syntaxHighlighting(highlightCSS),
      syntaxHighlighting(underlineCSS),
    ],
  });
}
