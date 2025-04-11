import {
  WidgetType,
  EditorView,
  Decoration,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
  PluginValue,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, RangeSet } from "@codemirror/state";
import { iterateVisibleSyntaxTree } from "../utils/syntaxTree";
import { isSelectionOverlapNode } from "../utils/cursor";

class FootRefWidget extends WidgetType {
  id: string;
  constructor(readonly refID: string) {
    super();
    this.id = crypto.randomUUID();
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
    anchor.innerText = this.refID;
    anchor.target = "_blank";
    anchor.classList.add("cm-footref");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

function iterateFootnotes(
  text: string,
  from: number,
  iterateFn: (refID: string, startPos: number, endPos: number) => void
) {
  let startPos = from;
  text.replace(/\[\^([a-zA-Z0-9]+)\]/g, (outer, inner) => {
    iterateFn(inner, startPos, startPos + outer.length);
    startPos += outer.length;
    return ""; // 대체 문자열은 무시
  });
}

class FootnotePlugin implements PluginValue {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.process(update.view);
    }
  }

  process(view: EditorView) {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;
    const isFootnotes = /^(?:\[\^[a-zA-Z0-9]+\])+$/;
    const refs: Map<string, { from: number; to: number }> = new Map();

    iterateVisibleSyntaxTree(view, {
      enter(node) {
        if (node.matchContext(["LinkReference"]) && node.type.is("LinkLabel")) {
          const linkLabel = view.state.doc.sliceString(node.from, node.to);
          const refID = linkLabel.match(/\[\^([a-zA-Z0-9]+)\]/)![1];
          const ref = refs.get(refID);
          if (ref) {
            const footref = new FootRefWidget(refID);
            const deco = Decoration.replace({
              widget: footref,
              side: -1,
            });
            decorations.push(deco.range(ref.from, ref.to));
            return false;
          }
        }
        if (node.type.is("Link")) {
          const text = view.state.doc.sliceString(node.from, node.to);
          if (isFootnotes.test(text) && !isSelectionOverlapNode(cursor, node)) {
            iterateFootnotes(text, node.from, (refID, from, to) =>
              refs.set(refID, { from, to })
            );
          }
        }
      },
    });

    return Decoration.set(decorations, true);
  }
}

const footnotePlugin = ViewPlugin.fromClass(FootnotePlugin, {
  decorations: (v) => v.decorations,
});

const baseTheme = EditorView.baseTheme({
  "a.cm-footref": {
    fontWeight: "bold",
  },
  "sup.cm-footref": {
    margin: "0 2px",
  },
});

const footnote = () => [footnotePlugin, baseTheme];

export default footnote;
