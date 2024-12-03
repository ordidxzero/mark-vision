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
import { isSelectionOverlapNode } from "../utils/cursor";
import { generateDecorationRanges } from "../utils/decoration";

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

// DOM 요소를 만드는 역할
class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  eq(other: LinkWidget) {
    return other.text == this.text && other.url === this.url;
  }

  toDOM() {
    const wrap = document.createElement("a");
    wrap.setAttribute("aria-hidden", "false");
    wrap.href = this.url;
    wrap.innerText = this.text;
    wrap.target = "_blank";
    wrap.classList.add("cm-anchor");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

class ImageWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  eq(other: ImageWidget) {
    return other.text == this.text && other.url === this.url;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "false");
    wrap.className = "cm-image";
    const anchor = wrap.appendChild(document.createElement("img"));
    anchor.src = this.url;
    anchor.title = this.text;
    anchor.classList.add("cm-image");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

// 실제 Decoration을 적용하는 역할
function links(state: EditorState) {
  const widgets: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (["Link", "Image"].includes(node.name)) {
        const link = state.doc.sliceString(node.from, node.to);
        if (link.endsWith("]")) return false;

        const matches = link.match(linkRegex);

        if (matches) {
          const title = matches[1];
          const url = matches[2];
          if (isSelectionOverlapNode(cursor, node)) {
            const name = node.name.toLowerCase();
            widgets.push(
              Decoration.mark({ class: `cm-${name}` }).range(
                node.from + 1,
                node.from + 1 + title.length
              )
            );
            widgets.push(
              ...generateDecorationRanges(
                Decoration.mark({
                  class: `cm-formatting cm-formatting-${name} cm-${name}`,
                }),
                [
                  [node.from, node.from + 1],
                  [
                    node.from + 1 + title.length,
                    node.from + 1 + title.length + 1,
                  ],
                ]
              )
            );
            widgets.push(
              Decoration.mark({ class: "cm-url" }).range(
                node.from + 1 + title.length + 1 + 1,
                node.from + 1 + title.length + 1 + 1 + url.length
              )
            );
            widgets.push(
              ...generateDecorationRanges(
                Decoration.mark({
                  class: "cm-formatting cm-formatting-url cm-url",
                }),
                [
                  [
                    node.from + 1 + title.length + 1,
                    node.from + 1 + title.length + 1 + 1,
                  ],
                  [
                    node.from + 1 + title.length + 1 + 1 + url.length,
                    node.from + 1 + title.length + 1 + 1 + url.length + 1,
                  ],
                ]
              )
            );
          } else {
            const NodeWidget = node.type.is("Link") ? LinkWidget : ImageWidget;

            const deco = Decoration.replace({
              widget: new NodeWidget(title, url),
              side: 1,
            });
            widgets.push(deco.range(node.from, node.to));
          }
        }
        return;
      }
    },
  });
  return RangeSet.of(widgets, true);
}

const linkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = links(view.state);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet)
        this.decorations = links(update.view.state);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export default linkPlugin;
