import { SelectionRange } from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";

/**
 * Selection이 특정 범위 [from, to] 사이에 있는지 여부를 체크하는 함수
 * @param selection SelectionRange
 * @param from 시작 위치
 * @param to 끝 위치
 * @returns
 */
export function isSelectionBetween(
  selection: SelectionRange,
  from: number,
  to: number
) {
  return selection.from >= from && selection.to <= to;
}

/**
 * Node가 Selection 내에 있는지 여부를 체크하는 함수
 * @param selection SelectionRange
 * @param node SyntaxNodeRef
 * @returns
 */
export function isNodeWithinSelection(
  selection: SelectionRange,
  node: SyntaxNodeRef
) {
  return selection.from <= node.from && selection.to >= node.to;
}

/**
 * Selection이 Node를 일부 걸치고 있는지 여부를 체크하는 함수
 * @param selection SelectionRange
 * @param node SyntaxNodeRef
 * @returns
 */
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

/**
 * Selection과 Node가 겹치는지 여부를 체크하는 함수
 * @param selection SelectionRange
 * @param node SyntaxNodeRef
 * @returns
 */
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
