import { syntaxTree } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";

export function iterateVisibleSyntaxTree(
  view: EditorView,
  iterateFns: {
    enter(node: SyntaxNodeRef): boolean | void;
    leave?(node: SyntaxNodeRef): void;
  }
) {
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({ ...iterateFns, from, to });
  }
}
