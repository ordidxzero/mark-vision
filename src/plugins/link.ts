import {
  WidgetType,
  EditorView,
  Decoration,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
  PluginValue,
} from "@codemirror/view";
import { Range } from "@codemirror/state";
import { isSelectionOverlapNode } from "../utils/cursor";
import { iterateVisibleSyntaxTree } from "../utils/syntaxTree";

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

class LinkWidget extends WidgetType {
  constructor(readonly title: string, readonly href: string) {
    super();
  }

  eq(other: LinkWidget) {
    return other.title == this.title && other.href === this.href;
  }

  toDOM() {
    const wrap = document.createElement("a");
    wrap.setAttribute("aria-hidden", "false");
    wrap.className = "cm-link";
    wrap.href = this.href;
    wrap.innerText = this.title;
    wrap.target = "_blank";
    wrap.classList.add("cm-link");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

class LinkPlugin implements PluginValue {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.process(update.view);
    }
  }

  process(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;

    iterateVisibleSyntaxTree(view, {
      enter(node) {
        if (
          node.matchContext(["Link"]) &&
          node.type.is("URL") &&
          node.node.nextSibling?.type.is("LinkMark")
        ) {
          const linkNode = node.node.parent!;
          const line = view.state.doc.sliceString(linkNode.from, linkNode.to);
          const matches = line.match(linkRegex)!;
          const title = matches[1];
          const url = matches[2];
          const marks = linkNode.getChildren("LinkMark");

          if (isSelectionOverlapNode(cursor, linkNode)) {
            marks.forEach((mark, i) => {
              if (i < 2) {
                decorations.push(
                  Decoration.mark({
                    class: "cm-formatting cm-formatting-link cm-link",
                  }).range(mark.from, mark.to)
                );
                if (i == 1) {
                  decorations.push(
                    Decoration.mark({
                      class: "cm-link",
                    }).range(mark.to, mark.to + title.length)
                  );
                }
                return;
              }
              decorations.push(
                Decoration.mark({
                  class: "cm-formatting cm-formatting-url cm-url",
                }).range(mark.from, mark.to)
              );
              if (i == 2) {
                decorations.push(
                  Decoration.mark({
                    class: "cm-url",
                  }).range(mark.to, mark.to + url.length)
                );
              }
            });
          } else {
            const NodeWidget = LinkWidget;

            const deco = Decoration.replace({
              widget: new NodeWidget(title, url),
            });
            decorations.push(deco.range(linkNode.from, linkNode.to));
          }
        }
      },
    });

    return Decoration.set(decorations, true);
  }
}

const linkPlugin = ViewPlugin.fromClass(LinkPlugin, {
  decorations: (v) => v.decorations,
});

const baseTheme = EditorView.baseTheme({
  "a.cm-link": {
    backgroundColor: "oklch(92.2% 0 0)",
    padding: "0.15rem 0.25rem",
    borderRadius: "0.25rem",
    transition: "100ms",
  },
  "a.cm-link:hover": {
    backgroundColor: "oklch(87% 0 0)",
  },
});

const link = () => [linkPlugin, baseTheme];

export default link;
