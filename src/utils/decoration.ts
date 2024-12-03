import { Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";

export function generateDecorationRanges(
  decoration: Decoration,
  ranges: Array<[number, number]>
): Range<Decoration>[] {
  return ranges.map((range) => decoration.range(range[0], range[1]));
}
