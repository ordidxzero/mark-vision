import { EditorState, Extension, Range, StateField } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { isSelectionOverlapNode } from "../utils/cursor";

class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement("hr");
    hr.classList.add("cm-hr-line");
    return hr;
  }

  ignoreEvent() {
    return false;
  }
}

const hrPlugin = (): Extension => {
  const hrDecoration = Decoration.replace({
    widget: new HorizontalRuleWidget(),
    block: true,
  });

  const decorate = (state: EditorState) => {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = state.selection.ranges;

    syntaxTree(state).iterate({
      enter(node) {
        if (node.type.is("HorizontalRule")) {
          if (isSelectionOverlapNode(cursor, node)) {
            decorations.push(
              Decoration.line({
                class: "cm-formatting cm-formatting-hr-line cm-hr-line",
              }).range(node.from)
            );
          } else {
            decorations.push(hrDecoration.range(node.from, node.to));
          }
        }
      },
    });

    return Decoration.set(decorations, true);
  };

  const hrStateField = StateField.define<DecorationSet>({
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

  return hrStateField;
};

const baseTheme = EditorView.baseTheme({
  "hr.cm-hr-line": {
    margin: "0.35rem 0.5rem",
  },
  "&light hr.cm-hr-line": {
    borderColor: "oklch(0.869 0.005 56.366)",
  },
  "&dark hr.cm-hr-line": {
    borderColor: "oklch(0.444 0.011 73.639)",
  },
});

const hr = () => [hrPlugin(), baseTheme];

export default hr;
