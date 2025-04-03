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
import { isSelectionBetween, isSelectionOverlapNode } from "../utils/cursor";

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

const taskTheme = EditorView.baseTheme({
  ".cm-task-checkbox input[type='checkbox']": {
    position: "relative",
    top: "2px",
    width: "13.5px",
    height: "13.5px",
    transformOrigin: "center",
    transform: "scale(1.1)",
    border: "1px solid #939393",
    cursor: "pointer",
    outline: "none",
    appearance: "none",
    borderRadius: "50%",
    transition: "100ms",
  },
  ".cm-task-checkbox input[type='checkbox']:not(:checked):hover": {
    borderColor: "#d3d3d3",
  },

  ".cm-task-checkbox input[type='checkbox']:checked": {
    backgroundPosition: "center",
    backgroundSize: "75%",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#008cff",
    borderColor: "#008cff",
    backgroundImage:
      'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNoZWNrIj48cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiLz48L3N2Zz4=")',
  },
});

const task = () => [taskPlugin, taskTheme];

export default task;
