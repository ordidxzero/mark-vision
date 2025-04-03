import {
  WidgetType,
  EditorView,
  Decoration,
  DecorationSet,
} from "@codemirror/view";
import { EditorState, Extension, Range, StateField } from "@codemirror/state";
import { isSelectionOverlapNode } from "../utils/cursor";
import { syntaxTree } from "@codemirror/language";

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

class ImageWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  eq(other: ImageWidget) {
    return other.url === this.url;
  }

  toDOM() {
    const wrap = document.createElement("img");
    wrap.setAttribute("aria-hidden", "false");
    wrap.className = "cm-image";
    wrap.src = this.url;
    wrap.title = this.text;
    wrap.classList.add("cm-image");
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

const imagePlugin = (): Extension => {
  const decorationFactory = (
    caption: string,
    link: string,
    type: "replace" | "widget" = "widget"
  ) => {
    if (type === "widget") {
      return Decoration.widget({
        widget: new ImageWidget(caption, link),
        block: true,
        inlineOrder: true,
        side: 1,
      });
    }
    return Decoration.replace({
      widget: new ImageWidget(caption, link),
      block: true,
      inlineOrder: true,
      side: 1,
    });
  };

  const decorate = (state: EditorState) => {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = state.selection.ranges;

    syntaxTree(state).iterate({
      enter(node) {
        if (
          node.matchContext(["Image"]) &&
          node.type.is("URL") &&
          node.node.nextSibling?.type.is("LinkMark")
        ) {
          const imageNode = node.node.parent!;
          const link = state.doc.sliceString(imageNode.from, imageNode.to);
          const matches = link.match(linkRegex)!;
          const caption = matches[1];
          const imageLink = matches[2];
          const marks = imageNode.getChildren("LinkMark");

          if (isSelectionOverlapNode(cursor, imageNode)) {
            marks.forEach((mark, i) => {
              if (i == 0) {
                const imageMark: [number, number] = [mark.from, mark.from + 1];
                const captionMark: [number, number] = [mark.from + 1, mark.to];
                decorations.push(
                  Decoration.mark({
                    class:
                      "cm-formatting cm-formatting-image cm-image cm-image-marker",
                  }).range(...imageMark)
                );
                decorations.push(
                  Decoration.mark({
                    class:
                      "cm-formatting cm-formatting-image cm-image cm-image-caption",
                  }).range(...captionMark)
                );
                decorations.push(
                  Decoration.mark({
                    class: "cm-image cm-image-caption",
                  }).range(mark.to, mark.to + caption.length)
                );
                return;
              }
              if (i == 1) {
                decorations.push(
                  Decoration.mark({
                    class:
                      "cm-formatting cm-formatting-image cm-image cm-image-caption",
                  }).range(mark.from, mark.to)
                );
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
                  }).range(mark.to, mark.to + imageLink.length)
                );
              }
            });
            const deco = decorationFactory(caption, imageLink, "widget");
            decorations.push(deco.range(imageNode.to));
          } else {
            const deco = decorationFactory(caption, imageLink, "replace");
            decorations.push(deco.range(imageNode.from, imageNode.to));
          }
        }
      },
    });

    return Decoration.set(decorations, true);
  };

  const imageStateField = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state);
    },

    update(_, transaction) {
      return decorate(transaction.state);
    },

    provide(field) {
      return EditorView.decorations.from(field);
    },
  });

  return imageStateField;
};

const baseTheme = EditorView.baseTheme({});

const image = () => [imagePlugin(), baseTheme];

export default image;
