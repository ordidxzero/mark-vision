import { WidgetType } from "@codemirror/view";

class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement("hr");
    return hr;
  }
}

export default HorizontalRuleWidget;
