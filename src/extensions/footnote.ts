import {
  WidgetType,
  EditorView,
  Decoration,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, RangeSet } from "@codemirror/state";

// DOM 요소를 만드는 역할
class FootnoteWidget extends WidgetType {
  constructor(
    readonly refID: string,
    readonly id: string,
    readonly text: string
  ) {
    super();
  }

  eq(other: FootnoteWidget) {
    return other.refID == this.refID && other.id == this.id;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "false");
    wrap.className = "cm-footnote";
    wrap.id = this.id;
    const order = wrap.appendChild(document.createElement("span"));
    order.innerText = this.refID + ".";
    const content = wrap.appendChild(document.createElement("span"));
    content.innerText = this.text;
    const anchor = wrap.appendChild(document.createElement("a"));
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = (e.target as HTMLAnchorElement).href;
    });
    anchor.href = `#ref-${this.id}`;
    anchor.innerText = `[^${this.refID}]`;
    anchor.target = "_blank";
    anchor.classList.add("cm-ref");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

class FootRefWidget extends WidgetType {
  id: string;
  constructor(readonly refID: string) {
    super();
    this.id = self.crypto.randomUUID();
  }

  eq(other: FootRefWidget) {
    return other.refID == this.refID;
  }

  toDOM() {
    const wrap = document.createElement("sup");
    wrap.setAttribute("aria-hidden", "false");
    wrap.className = "cm-footref";
    wrap.id = `ref-${this.id}`;
    const anchor = wrap.appendChild(document.createElement("a"));
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = (e.target as HTMLAnchorElement).href;
    });
    anchor.href = `#${this.refID}`;
    anchor.innerText = `[^${this.refID}]`;
    anchor.target = "_blank";
    anchor.classList.add("cm-footref");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

// 실제 Decoration을 적용하는 역할
function footnotes(state: EditorState) {
  const widgets: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  const refs: Map<string, { from: number; to: number }> = new Map();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.matchContext(["LinkReference"]) && node.type.is("LinkLabel")) {
        const footnote = state.doc.sliceString(node.from, node.to);
        const refID = footnote.replace(/[^\d]/g, "");
        const ref = refs.get(refID);
        if (ref) {
          if (cursor.from < ref.from || cursor.to > ref.to) {
            const footref = new FootRefWidget(refID);
            const deco = Decoration.replace({
              widget: footref,
              side: 0,
            });
            widgets.push(deco.range(ref.from, ref.to));
          }
        }
        return false;
      }

      if (node.type.is("Link")) {
        const link = state.doc.sliceString(node.from, node.to);
        if (!link.endsWith("]") || !link.startsWith("[^")) {
          return false;
        }

        // [^1][^2] 이런 식으로 작성된 경우
        // [^1][^2][^3] -> [^1][^2], [^3] 나눠서 파싱됨
        if (link.includes("][")) {
          let startPos = node.from;
          const links = link
            .split("][")
            .map((l) =>
              l.startsWith("[") ? `${l}]` : l.endsWith("]") ? `[${l}` : `[${l}]`
            );
          const refIDs = links.map((l) => l.replace(/[^\d]/g, ""));
          refIDs.forEach((refID) => {
            const len = refID.length + 3;
            refs.set(refID, { from: startPos, to: startPos + len });
            startPos += len;
          });
        } else {
          const refID = link.replace(/[^\d]/g, "");
          refs.set(refID, { from: node.from, to: node.to });
        }
      }
    },
  });
  return RangeSet.of(widgets, true);
}

const footnotePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = footnotes(view.state);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.startState) != syntaxTree(update.state)
      )
        this.decorations = footnotes(update.view.state);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export default footnotePlugin;
