import { markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { countColumn, EditorSelection, StateCommand } from "@codemirror/state";
import { SyntaxNode, Tree } from "@lezer/common";
import { getContext, normalizeIndent } from "./insertNewlineContinueMarkup";

function isMark(node: SyntaxNode) {
  return node.name == "QuoteMark" || node.name == "ListMark";
}

function contextNodeForDelete(tree: Tree, pos: number) {
  let node = tree.resolveInner(pos, -1),
    scan = pos;
  if (isMark(node)) {
    scan = node.from;
    node = node.parent!;
  }
  for (let prev; (prev = node.childBefore(scan)); ) {
    if (isMark(prev)) {
      scan = prev.from;
    } else if (prev.name == "OrderedList" || prev.name == "BulletList") {
      node = prev.lastChild!;
      scan = node.to;
    } else {
      break;
    }
  }
  return node;
}

export const deleteMarkupBackward: StateCommand = ({ state, dispatch }) => {
  let tree = syntaxTree(state);
  let dont = null,
    changes = state.changeByRange((range) => {
      let pos = range.from,
        { doc } = state;
      if (range.empty && markdownLanguage.isActiveAt(state, range.from)) {
        let line = doc.lineAt(pos);
        let context = getContext(contextNodeForDelete(tree, pos), doc);
        if (context.length) {
          let inner = context[context.length - 1];
          let spaceEnd =
            inner.to - inner.spaceAfter.length + (inner.spaceAfter ? 1 : 0);
          // Delete extra trailing space after markup
          if (
            pos - line.from > spaceEnd &&
            !/\S/.test(line.text.slice(spaceEnd, pos - line.from))
          )
            return {
              range: EditorSelection.cursor(line.from + spaceEnd),
              changes: { from: line.from + spaceEnd, to: pos },
            };
          if (
            pos - line.from == spaceEnd &&
            // Only apply this if we're on the line that has the
            // construct's syntax, or there's only indentation in the
            // target range
            (!inner.item ||
              line.from <= inner.item.from ||
              !/\S/.test(line.text.slice(0, inner.to)))
          ) {
            let start = line.from + inner.from;
            // Replace a list item marker with blank space
            if (
              inner.item &&
              inner.node.from < inner.item.from &&
              /\S/.test(line.text.slice(inner.from, inner.to))
            ) {
              let insert = inner.blank(
                countColumn(line.text, 4, inner.to) -
                  countColumn(line.text, 4, inner.from)
              );
              if (start == line.from) insert = normalizeIndent(insert, state);
              return {
                range: EditorSelection.cursor(start + insert.length),
                changes: { from: start, to: line.from + inner.to, insert },
              };
            }
            // Delete one level of indentation
            if (start < pos)
              return {
                range: EditorSelection.cursor(start),
                changes: { from: start, to: pos },
              };
          }
        }
      }
      return (dont = { range });
    });
  if (dont) return false;
  dispatch(
    state.update(changes, { scrollIntoView: true, userEvent: "delete" })
  );
  return true;
};
