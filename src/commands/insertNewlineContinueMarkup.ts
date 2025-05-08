/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  StateCommand,
  Text,
  EditorState,
  EditorSelection,
  ChangeSpec,
  countColumn,
  Line,
} from "@codemirror/state";
import {
  syntaxTree,
  indentUnit,
  getIndentUnit,
  indentString,
} from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";
import { markdownLanguage } from "@codemirror/lang-markdown";
import {
  getListNumberPosition,
  getPreviousSiblingListNumber,
  updateNextSiblingListNumber,
} from "./indentWithTab";

class Context {
  constructor(
    readonly node: SyntaxNode, // node
    readonly from: number, // node.from - line.from (line.from을 기준으로 했을 때의 node.from)
    readonly to: number, // 위의 from을 기준으로 재계산된 node.to
    readonly spaceBefore: string, // type 앞에 입력된 공백을 의미하는 것으로 추정. 예를 들어, "2. 123" 이렇게 입력하면 type은 "."이고, spaceBefore은 ""이 된다.
    readonly spaceAfter: string, // type 뒤에 입력된 공백을 의미하는 것으로 추정. 예를 들어, "2. 123" 이렇게 입력하면 spaceAfter는 " "이 된다.
    readonly type: string, // "", ">", ".", "-", "+", "*", "- [ ]", "+ [ ]", "* [ ]" 이런거 들어가는 듯
    // "" -> FencedCode, ">" -> Blockquote, "." -> OrderedList
    readonly item: SyntaxNode | null // node가 XList면 item은 ListItem이 들어감.
  ) {}

  /**
   * 노드 앞뒤 공백과 들여쓰기를 계산하여 공백 문자열 반환.
   * `maxWidth`가 주어지면 해당 길이만큼 padding.
   * @param maxWidth 헤딩 노드 문법의 최대 길이를 지정해주는 값
   * @param trailing 문법 이후에 공백을 붙일지 여부
   * @returns
   */
  blank(maxWidth: number | null, trailing = true) {
    let isBlockquote = ["Blockquote", "Alert"].includes(this.node.name);
    let result = this.spaceBefore + (isBlockquote ? ">" : "");
    if (maxWidth != null) {
      while (result.length < maxWidth) result += " ";
      return result;
    } else {
      for (
        let i = this.to - this.from - result.length - this.spaceAfter.length;
        i > 0;
        i--
      )
        result += " ";
      return result + (trailing ? this.spaceAfter : "");
    }
  }

  /**
   * (OrderedList인 경우) 새로운 번호를 계산해서 리턴하는 함수
   * @param doc 이전 줄에 입력된 텍스트 (여기서 '이전 줄'이란 엔터를 치기전 커서가 있던 줄)
   * @param add 이전 아이템의 숫자에 얼마나 더할지 정하는 값 (ex. 이전 줄: '2. 123'이고, marker(doc, 1)을 수행하면 '3'을 반환함)
   * @returns
   */
  marker(doc: Text, add: number) {
    const number =
      this.node.name == "OrderedList"
        ? String(+itemNumber(this.item!, doc)[2] + add)
        : "";
    return this.spaceBefore + number + this.type + this.spaceAfter;
  }
}

function getContext_v2(node: SyntaxNode, doc: Text) {
  const nodes: SyntaxNode[] = [];
  for (
    let cur: SyntaxNode | null = node;
    cur && cur.name != "Document";
    cur = cur.parent
  ) {
    if (["ListItem", "Blockquote", "Alert"].includes(cur.name)) {
      nodes.push(cur);
    }
  }

  const context: Context[] = [];
}

/**
 * 특정 위치의 말단 노드를 가져와서 해당 노드의 상위 노드를 순회하면서 Context 객체를 만들고 그 리스트를 반환
 * @param node 말단 노드
 * @param doc 지금까지 입력된 텍스트
 * @returns
 */
export function getContext(node: SyntaxNode, doc: Text) {
  const nodes: SyntaxNode[] = [];
  for (
    let cur: SyntaxNode | null = node;
    cur && cur.name != "Document";
    cur = cur.parent // parent를 순회한다.
  ) {
    // 특정 타입의 노드만 저장한다. (ListItem, Blockquote, Alert, FencedCode)
    // 엔터를 입력했을 때 문법이 자동으로 입력되어야하는 노드들만 저장하는 것으로 보인다.
    if (
      cur.name == "ListItem" ||
      cur.name == "Blockquote" ||
      cur.name == "Alert" ||
      cur.name == "FencedCode"
    )
      nodes.push(cur);
  }

  const context: Context[] = [];
  // nodes는 뒤로 갈수록 상위 노드가 저장되어있으므로 역으로 순회하는 것으로 추정된다.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    let match = null;
    const line = doc.lineAt(node.from); // 노드가 위치한 Line
    const startPos = node.from - line.from; // 노드의 시작 위치 (line.from을 기준으로 했을 때의 node.from)
    if (node.name == "FencedCode") {
      // spaceBefore, spaceAfter, type을 전부 빈 문자열로 설정
      // ? FencedCode를 처리할 필요가 있을까?
      context.push(new Context(node, startPos, startPos, "", "", "", null));
    } else if (
      (node.name == "Blockquote" || node.name == "Alert") &&
      (match = /^ *>( *)/.exec(line.text.slice(startPos)))
      // /^ *>( *)/.exec(">  123")
      // ['>  ', '  '] 이렇게 나옴
    ) {
      let after = match[1],
        len = match[0].length;
      if (after.length >= 2) {
        len -= after.length - 1;
        after = after.slice(0, 1);
      }
      context.push(
        new Context(
          node,
          startPos,
          startPos + len,
          "", // spaceBefore
          after, // spaceAfter
          ">", // type
          null
        )
      );
    } else if (
      node.name == "ListItem" &&
      node.parent!.name == "OrderedList" &&
      (match = /^( *)\d+([.)])( *)/.exec(line.text.slice(startPos)))
      // /^( *)\d+([.)])( *)/.exec("2. 123")
      // -> [ "2. ", "", ".", " "] 이렇게 나옴
    ) {
      let after = match[3],
        len = match[0].length;
      if (after.length >= 2) {
        len -= after.length - 1;
        after = after.slice(0, 1);
      }
      context.push(
        new Context(
          node.parent!,
          startPos,
          startPos + len,
          match[1], // spaceBefore
          after, // spaceAfter
          match[2], // type
          node
        )
      );
    } else if (
      node.name == "ListItem" &&
      node.parent!.name == "BulletList" &&
      (match = /^( *)([-+*])( {1,4}\[[ xX]\])?( +)/.exec(
        line.text.slice(startPos)
      ))
      // /^( *)([-+*])( {1,4}\[[ xX]\])?( +)/.exec("- 123")
      // ['- ', '', '-', undefined, ' ']

      // /^( *)([-+*])( {1,4}\[[ xX]\])?( +)/.exec("-  [ ] 123")
      // ['-  [ ] ', '', '-', '  [ ]', ' ']
    ) {
      let after = match[4],
        len = match[0].length;
      if (after.length > 4) {
        after = after.slice(0, after.length - 4);
        len -= 4;
      }
      let type = match[2];
      if (match[3]) type += match[3].replace(/[xX]/, " ");
      context.push(
        new Context(
          node.parent!,
          startPos,
          startPos + len,
          match[1], // spaceBefore
          after, // spaceAfter
          type, // type
          node
        )
      );
    }
  }
  return context;
}

/**
 * OrderedList 내 ListItem의 숫자를 가져오는 함수
 * @param item node
 * @param doc node의 텍스트
 * @returns
 */
function itemNumber(item: SyntaxNode, doc: Text) {
  // item.from + 10인 이유는 그냥 OrderedList의 숫자를 9자리로 제한하기 위한 용도인듯.
  // /^(\s*)(\d+|[A-Z]{1,2}|[a-z]{1,2})(?=[.)])/.exec("AA. 123") > 알파벳 두자리까지 지원하도록 수정하는 경우
  // /^(\s*)(\d+|[A-Z]{1,3}|(?=[LXVI])(XC|XL|L?X{0,3})(IX|IV|V?I{0,3}))(?=[.)])/.exec("CCCC. 123") > 로마 숫자까지 지원하는 경우 (검증 필요)
  // /^(\s*)(\d+)(?=[.)])/.exec("11. 123")
  //  -> [ "11", "", "11" ]
  return /^(\s*)(\d+)(?=[.)])/.exec(doc.sliceString(item.from, item.to))!;
}

/**
 * OrderedList의 숫자를 다시 정렬하는 함수
 * @param node 123
 * @param state 123
 * @param changes 123
 */
function reorderList(
  node: SyntaxNode,
  state: EditorState,
  changes: ChangeSpec[]
) {
  const line = state.doc.lineAt(node.from);
  const match = /^( *)\d+([.)])( *)/.exec(line.text);

  if (match && match[1].length > 0) {
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
}

/**
 * ..
 * @param after 123
 * @param doc 123
 * @param changes 123
 * @param offset 123
 */
function renumberList(
  after: SyntaxNode,
  doc: Text,
  changes: ChangeSpec[],
  offset = 0
) {
  for (let prev = -1, node = after; ; ) {
    if (node.name == "ListItem") {
      const m = itemNumber(node, doc);
      const number = +m[2];
      if (prev >= 0) {
        // if (number != prev + 1) return;
        changes.push({
          from: node.from + m[1].length,
          to: node.from + m[0].length,
          insert: String(prev + 2 + offset),
        });
      }
      prev = number;
    }
    const next = node.nextSibling;
    if (!next) break;
    node = next;
  }
}

/**
 * ..
 * @param content 123
 * @param state 123
 * @returns
 */
export function normalizeIndent(content: string, state: EditorState) {
  const blank = /^[ \t]*/.exec(content)![0].length;
  if (!blank || state.facet(indentUnit) != "\t") return content;
  const col = countColumn(content, 4, blank);
  let space = "";
  for (let i = col; i > 0; ) {
    if (i >= 4) {
      space += "\t";
      i -= 4;
    } else {
      space += " ";
      i--;
    }
  }
  return space + content.slice(blank);
}

/**
 * ..
 * @param node 123
 * @param doc 123
 * @returns
 */
function nonTightList(node: SyntaxNode, doc: Text) {
  if (node.name != "OrderedList" && node.name != "BulletList") return false;
  const first = node.firstChild!,
    second = node.getChild("ListItem", "ListItem");
  if (!second) return false;
  const line1 = doc.lineAt(first.to),
    line2 = doc.lineAt(second.from);
  const empty = /^[\s>]*$/.test(line1.text);
  return line1.number + (empty ? 0 : 1) < line2.number;
}

/**
 * ..
 * @param context 123
 * @param state 123
 * @param line 123
 * @returns
 */
function blankLine(context: Context[], state: EditorState, line: Line) {
  let insert = "";
  for (let i = 0, e = context.length - 2; i <= e; i++) {
    insert += context[i].blank(
      i < e
        ? countColumn(line.text, 4, context[i + 1].from) - insert.length
        : null,
      i < e
    );
  }
  return normalizeIndent(insert, state);
}

/// This command, when invoked in Markdown context with cursor
/// selection(s), will create a new line with the markup for
/// blockquotes and lists that were active on the old line. If the
/// cursor was directly after the end of the markup for the old line,
/// trailing whitespace and list markers are removed from that line.
///
/// The command does nothing in non-Markdown context, so it should
/// not be used as the only binding for Enter (even in a Markdown
/// document, HTML and code regions might use a different language).
export const insertNewlineContinueMarkup: StateCommand = ({
  state,
  dispatch,
}) => {
  const tree = syntaxTree(state);
  const { doc } = state; // Enter 치기 이전까지의 문서 정보
  let dont = null;

  // state.changeByRange: 활성화된 selection에 있는 Range를 파라미터로 넘겨준 콜백함수를 통해 새로운 변경사항(changes)과 selection의 집합으로 만듦.
  // state.changeByRange의 리턴값은 dispatch 함수에 전달할 수 있는 TransactionSpec임.
  const changes = state.changeByRange((range) => {
    // range.empty: Range가 비어있는지 여부. insertNewlineContinueMarkup의 목적은 새로운 줄로 넘어 갔을 때 실행되어야하는 함수이므로 비어있지 않은 경우 실행되면 안됨.
    // markdownLanguage.isActiveAt: Markdown 모드 활성화 여부. 비활성화되어있는 경우 insertNewlineContinueMarkup는 실행되면 안됨.
    if (!range.empty || !markdownLanguage.isActiveAt(state, range.from))
      return (dont = { range });
    // return (dont = { range }) ---> dont에 { range }를 할당하면서 { range }를 리턴한다.

    // 이제 기본적인 실행 조건은 만족함
    // pos: Enter 치기 이전 줄 마지막의 위치
    const pos = range.from;
    // line: Enter 치기 이전 줄
    const line = doc.lineAt(pos);

    // tree.resolveInner(pos, -1)는 pos 위치에 있는 가장 말단 노드를 가져옴.
    const context = getContext(tree.resolveInner(pos, -1), doc);

    // pos: range.from이고, line은 pos를 기준으로 Line을 가져온거 아닌가? 무조건 pos == line.from 아닌가??
    // range.from이 line 중간에 있으면 pos != line.from임. 예를 들어, "3423|4234" 위치에서 엔터치는 경우를 생각해보자.

    // context의 마지막 요소의 시작 위치가 pos - line.from보다 큰 경우에 pop으로 제거
    while (context.length && context[context.length - 1].from > pos - line.from)
      context.pop();
    if (!context.length) return (dont = { range });
    const inner = context[context.length - 1];

    if (
      /^( *)\d+([.)])( *)/.exec(line.text) === null &&
      /^( *)([-+*])( {1,4}\[[ xX]\])?( +)/.exec(line.text) === null &&
      /^ *>( ?)/.exec(line.text) === null
    ) {
      return (dont = { range });
    }

    // pos >= inner.to - inner.spaceAfter.length의 의미는 "1. "에서 Enter를 치거나, "1.    " 이런 상황에서 엔터를 치는 경우를 말한다.
    // 만약 "1|.   " 여기서 엔터를 치게 되면 다음 줄은 공백이 아니므로 pos >= inner.to - inner.spaceAfter.length는 False다.
    // /\S/.test -> 공백이 아니어야 true
    const emptyLine =
      pos >= inner.to - inner.spaceAfter.length &&
      !/\S/.test(line.text.slice(inner.to)); // "1. 123"에서 "123"을 체크한다. "2. "인 경우 True

    // inner.item이 있고, Line이 공백인 경우 (inner.item은 XList만 가지고 있다)
    // "1. "을 입력하고 엔터치는 경우임
    if (inner.item && emptyLine) {
      const first = inner.node.firstChild!,
        second = inner.node.getChild("ListItem", "ListItem");
      // Not second item or blank line before: delete a level of markup
      if (
        first.to >= pos ||
        (second && second.to <= pos) ||
        (line.from > 0 && !/[^\s>]/.test(doc.lineAt(line.from - 1).text))
      ) {
        const next = context.length > 1 ? context[context.length - 2] : null;

        let delTo,
          insert = "";

        let posTo = pos;

        if (next && next.item) {
          // 문법을 중첩해서 사용하는 경우에만 의미 있음
          // ex. 1. 1.
          // Re-add marker for the list at the next level
          delTo = line.from + next.from;
          insert = next.marker(doc, 1);
        } else {
          delTo = line.from + (next ? next.to : 0);
        }

        const space = /^\s*/.exec(line.text)![0];
        let cursorPos = delTo + insert.length;
        let keep = 0;

        // space는 삭제하지 않는다.
        if (space) {
          const col = countColumn(space, state.tabSize);
          insert = indentString(state, Math.max(0, col - getIndentUnit(state)));
          while (
            keep < space.length &&
            keep < insert.length &&
            space.charCodeAt(keep) == insert.charCodeAt(keep)
          )
            keep++;
          insert = insert.slice(keep);
          delTo = line.from + keep;
          posTo = line.from + space.length;
          cursorPos = delTo - keep + line.text.length - (posTo - delTo);
        }

        const changes: ChangeSpec[] = [{ from: delTo, to: posTo, insert }];
        if (inner.node.name == "OrderedList")
          reorderList(first, state, changes);

        // 문법을 중첩해서 사용하는 경우에만 의미 있음
        if (next && next.node.name == "OrderedList")
          renumberList(next.item!, doc, changes);
        return { range: EditorSelection.cursor(cursorPos), changes };
      }
    }

    // Blockquote, Alert에서 빈 줄일 때 엔터치면 개행 문자를 삽입한다.
    // 삽입하지 않으면 줄바뀜을 인식하지 못하는 문제가 있기 때문이다.
    if (["Blockquote", "Alert"].includes(inner.node.name) && emptyLine) {
      const quoted = />\s*$/.exec(line.text);

      if (quoted && quoted.index == inner.from) {
        const changes = state.changes([
          { from: line.from + quoted.index, to: line.to, insert: "\n" },
        ]);
        return { range: range.map(changes), changes };
      }
    }

    const changes: ChangeSpec[] = [];
    if (inner.node.name == "OrderedList")
      renumberList(inner.item!, doc, changes);

    const continued = inner.item && inner.item.from < line.from;
    let insert = "";
    // If not dedented
    if (
      !continued ||
      /^[\s\d.)\-+*>]*/.exec(line.text)![0].length >= inner.to
    ) {
      for (let i = 0, e = context.length - 1; i <= e; i++) {
        insert +=
          i == e && !continued
            ? context[i].marker(doc, 1)
            : context[i].blank(
                i < e
                  ? countColumn(line.text, 4, context[i + 1].from) -
                      insert.length
                  : null
              );
      }
    }

    let from = pos;
    while (
      from > line.from &&
      /\s/.test(line.text.charAt(from - line.from - 1))
    )
      from--;
    insert = normalizeIndent(insert, state);
    if (nonTightList(inner.node, state.doc))
      insert = blankLine(context, state, line) + state.lineBreak + insert;
    changes.push({ from, to: pos, insert: state.lineBreak + insert });
    return { range: EditorSelection.cursor(from + insert.length + 1), changes };
  });
  if (dont) return false;
  dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
  return true;
};
