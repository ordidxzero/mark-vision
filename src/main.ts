import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";

class MarkVisionPlugin implements PluginValue {
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

    syntaxTree(view.state).iterate({
      enter(node) {
        // 1. Heading
        // 2. Emphasis
        // 3. Inline Code
        // 4. Horizontal Rule
        // 5. List
        // 6. Link, Image, Footnote
        // 7. Code Block
        // 8. Quote
        // 9. HashTag
        // 10. Mention
        // 11. Alert
        // 12. Emoji
        // 13. Table
        // 14. Front matter
      },
    });

    return Decoration.set(decorations, true);
  }
}

export default MarkVisionPlugin;
