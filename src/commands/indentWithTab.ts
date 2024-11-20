/* eslint-disable @typescript-eslint/no-unused-vars */
import { getIndentUnit, indentString, indentUnit } from "@codemirror/language";
import {
  ChangeSpec,
  countColumn,
  EditorSelection,
  EditorState,
  Line,
  SelectionRange,
  StateCommand,
} from "@codemirror/state";
import { EditorView, KeyBinding } from "@codemirror/view";

export function indentDecoration(view: EditorView) {
  if (view.state.readOnly) return false;
  return true;
}

function changeBySelectedLine(
  state: EditorState,
  f: (line: Line, changes: ChangeSpec[], range: SelectionRange) => void
) {
  let atLine = -1;
  return state.changeByRange((range) => {
    const changes: ChangeSpec[] = [];
    for (let pos = range.from; pos <= range.to; ) {
      const line = state.doc.lineAt(pos);
      if (line.number > atLine && (range.empty || range.to > line.from)) {
        f(line, changes, range);
        atLine = line.number;
      }
      pos = line.to + 1;
    }
    const changeSet = state.changes(changes);
    return {
      changes,
      range: EditorSelection.range(
        changeSet.mapPos(range.anchor, 1),
        changeSet.mapPos(range.head, 1)
      ),
    };
  });
}

export function getListNumberPosition(
  line: Line,
  match: RegExpExecArray
): [number, number] {
  const [fullMatch, indent, delimiter, after] = match;
  const from = line.from + indent.length;
  const to = line.from + fullMatch.length - delimiter.length - after.length;
  return [from, to];
}

function getListNumber(match: RegExpExecArray) {
  const [listMatch, _, delimiter] = match;
  const listNumber = listMatch.split(delimiter)[0].trim();
  return parseInt(listNumber, 10);
}

export function getPreviousSiblingListNumber(
  state: EditorState,
  line: Line,
  condition: (match: RegExpExecArray) => boolean,
  breakCondition?: (match: RegExpExecArray) => boolean
) {
  for (let i = line.number - 1; i > 0; i--) {
    const prevLine = state.doc.line(i);
    const match = /^( *)\d+([.)])( *)/.exec(prevLine.text);
    if (!match || breakCondition?.(match)) {
      break;
    }
    if (match && condition(match)) {
      return getListNumber(match);
    }
  }
  return 0;
}

function counter(init = 0) {
  let n = init < 0 ? 0 : init;
  return (_: number) => {
    n++;
    return n;
  };
}

export function updateNextSiblingListNumber(
  state: EditorState,
  line: Line,
  condition: (match: RegExpExecArray) => boolean,
  breakCondition?: (match: RegExpExecArray) => boolean,
  initNumber = -1
): ChangeSpec[] {
  const changes: ChangeSpec[] = [];

  if (initNumber === -1) {
    initNumber = getPreviousSiblingListNumber(
      state,
      line,
      condition,
      breakCondition
    );
  }

  const factory = counter(initNumber);

  for (let i = line.number + 1; i < state.doc.lines + 1; i++) {
    const nextLine = state.doc.line(i);
    const match = /^( *)\d+([.)])( *)/.exec(nextLine.text);
    if (!match || breakCondition?.(match)) {
      break;
    }
    if (condition(match)) {
      const [from, to] = getListNumberPosition(nextLine, match);
      const num = getListNumber(match);
      changes.push({ from, to, insert: factory(num).toString() });
    }
  }

  return changes;
}

export const indentMore: StateCommand = ({ state, dispatch }) => {
  if (state.readOnly) return false;

  const changes = changeBySelectedLine(state, (line, changes) => {
    const match = /^( *)\d+([.)])( *)/.exec(line.text);

    if (match) {
      const [_, indent, __] = match;
      const [from, to] = getListNumberPosition(line, match);
      const prevNumber = getPreviousSiblingListNumber(
        state,
        line,
        (match) => match[1].length == indent.length + 2,
        (match) => match[1].length == indent.length
      );
      const updatedNumber = prevNumber + 1;
      changes.push({ from, to, insert: updatedNumber.toString() });
      changes.push(
        ...updateNextSiblingListNumber(
          state,
          line,
          (match) => match[1].length === indent.length + 2,
          (match) => match[1].length === indent.length,
          updatedNumber
        )
      );
      changes.push(
        ...updateNextSiblingListNumber(
          state,
          line,
          (match) => match[1].length === indent.length,
          (match) => match[1].length === indent.length - 2
        )
      );
    }
    changes.push({ from: line.from, insert: state.facet(indentUnit) });
  });

  dispatch(state.update(changes, { userEvent: "input.indent" }));
  return true;
};

/// Remove a [unit](#language.indentUnit) of indentation from all
/// selected lines.
export const indentLess: StateCommand = ({ state, dispatch }) => {
  if (state.readOnly) return false;

  const changes = changeBySelectedLine(state, (line, changes) => {
    const match = /^( *)\d+([.)])( *)/.exec(line.text);
    // space: line.from부터 실제 글자가 나타날 때까지의 공백을 추출한다.
    // ex. "    2. 123" -> "    " / "2. 123" -> ""
    const space = /^\s*/.exec(line.text)![0];

    if (!space) return; // space가 없으면 아무것도 안함

    // 이 함수가 적용되기 전 상태의 col을 가져옴. ex. "  2. 123" -> col = 2
    const col = countColumn(space, state.tabSize);
    let keep = 0;

    // 이 함수가 적용되기 전 상태의 공백을 가져옴. ex. "  2. 123" -> insert = "  "
    // space와 insert는 같은 값 아닌가 싶겠지만, 공백을 직접 입력해서 들여쓰기하는 경우가 있기 때문에 값이 다르다.
    const insert = indentString(state, Math.max(0, col - getIndentUnit(state)));

    while (
      keep < space.length &&
      keep < insert.length &&
      space.charCodeAt(keep) == insert.charCodeAt(keep)
    )
      keep++;

    if (match) {
      const [_, indent, __] = match;
      const [from, to] = getListNumberPosition(line, match);
      const prevNumber = getPreviousSiblingListNumber(
        state,
        line,
        (match) => match[1].length == indent.length - 2
      );
      const updatedNumber = prevNumber + 1;
      changes.push({ from, to, insert: updatedNumber.toString() });
      changes.push(
        ...updateNextSiblingListNumber(
          state,
          line,
          (match) => match[1].length === indent.length - 2,
          (match) => match[1].length === indent.length - 4,
          updatedNumber
        )
      );
      changes.push(
        ...updateNextSiblingListNumber(
          state,
          line,
          (match) => match[1].length === indent.length,
          (match) => match[1].length === indent.length - 2,
          0
        )
      );
    }

    changes.push({
      from: line.from + keep,
      to: line.from + space.length,
      insert: insert.slice(keep),
    });
  });

  dispatch(state.update(changes, { userEvent: "delete.dedent" }));
  return true;
};

// StateCommand는 기본적으로 transaction을 키보드와 바인딩하는 역할임.
export const indentWithTab: KeyBinding = {
  key: "Tab",
  run: indentMore,
  shift: indentLess,
};
