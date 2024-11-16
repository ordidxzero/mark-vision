import {
  WidgetType,
  EditorView,
  Decoration,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Range, RangeSet, StateField } from "@codemirror/state";
import { isSelectionBetween, isSelectionOverlapNode } from "../utils";

// DOM 요소를 만드는 역할
class TaskWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  eq(other: TaskWidget) {
    return other.checked == this.checked;
  }

  toDOM() {
    const wrap = document.createElement("label");
    wrap.setAttribute("aria-hidden", "false");
    wrap.className = "cm-task-checkbox";
    const box = wrap.appendChild(document.createElement("input"));
    box.type = "checkbox";
    box.checked = this.checked;
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

// 실제 Decoration을 적용하는 역할
function tasks(state: EditorState) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  syntaxTree(state).iterate({
    enter: (node) => {
      const line = state.doc.lineAt(node.from);
      if (
        node.type.is("TaskMarker") &&
        !isSelectionOverlapNode(cursor, node) &&
        !isSelectionBetween(cursor, line.from, node.to)
      ) {
        const isTrue =
          state.doc.sliceString(node.from, node.to).toLowerCase() == "[x]";
        const deco = Decoration.replace({
          widget: new TaskWidget(isTrue),
          side: 1,
        });
        decorations.push(deco.range(node.from - 2, node.to));
      }

      if (node.type.is("Task")) {
        decorations.push(
          Decoration.line({ class: "cm-task-item" }).range(line.from)
        );
      }
    },
  });
  return RangeSet.of(decorations, true);
}

// 이벤트 처리 및 transaction 디스패치
export function toggleTask(view: EditorView, pos: number) {
  const before = view.state.doc.sliceString(Math.max(0, pos - 3), pos);
  let change;
  if (before == "[ ]") change = { from: pos - 3, to: pos, insert: "[x]" };
  else if (before.endsWith("[x]"))
    change = { from: pos - 3, to: pos, insert: "[ ]" };
  else return false;
  view.dispatch({ changes: change });
  return true;
}

// transaction이 디스패치되면 아래 update 함수 호출
export function taskExtension() {
  return StateField.define<DecorationSet>({
    create(state) {
      return tasks(state);
    },

    update(_, transaction) {
      return tasks(transaction.state);
    },

    provide(field) {
      return EditorView.decorations.from(field);
    },
  });
}

const taskPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = tasks(view.state);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet)
        this.decorations = tasks(update.view.state);
    }
  },
  {
    decorations: (v) => v.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.decorations || Decoration.none;
      }),
    eventHandlers: {
      mousedown: (e, view) => {
        const target = e.target as HTMLElement;
        if (
          target.nodeName == "INPUT" &&
          target.parentElement!.classList.contains("cm-task-checkbox")
        )
          return toggleTask(view, view.posAtDOM(target));
      },
    },
  }
);

export default taskPlugin;
