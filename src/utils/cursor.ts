import { SelectionRange } from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";

export function isSelectionBetween(
  selection: SelectionRange,
  from: number,
  to: number
) {
  return selection.from >= from && selection.to <= to;
}

export function isNodeWithinSelection(
  selection: SelectionRange,
  node: SyntaxNodeRef
) {
  return selection.from <= node.from && selection.to >= node.to;
}

export function isSelectionPartiallyOverlapNode(
  selection: SelectionRange,
  node: SyntaxNodeRef
) {
  return (
    (selection.from >= node.from &&
      selection.from <= node.to &&
      selection.to >= node.to) ||
    (selection.from <= node.from &&
      selection.to >= node.from &&
      selection.to <= node.to)
  );
}

export function isSelectionOverlapNode(
  selection: SelectionRange,
  node: SyntaxNodeRef
) {
  return (
    isSelectionBetween(selection, node.from, node.to) ||
    isNodeWithinSelection(selection, node) ||
    isSelectionPartiallyOverlapNode(selection, node)
  );
}
