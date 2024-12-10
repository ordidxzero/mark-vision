import { BlockContext, Line, MarkdownConfig } from "@lezer/markdown";

function isAlert(cx: BlockContext, line: Line) {
  if (cx.parentType().name === "Alert") return 0;

  const content = line.text;
  const marker = content.slice(line.pos, line.pos + 2);
  if (marker !== "> ") return -1;

  let match = content.slice(line.pos + 2).match(/^\[!(\w+)\]/);
  if (match === null) return -1;

  return match[1].length;
}

export const Alert: MarkdownConfig = {
  defineNodes: [
    {
      name: "Alert",
      block: true,
      composite(cx, line, _) {
        return line.text.startsWith(">") && cx.parentType().name === "Alert";
      },
    },
    {
      name: "AlertInfo",
    },
    {
      name: "AlertMark",
    },
  ],
  parseBlock: [
    {
      name: "Alert",
      before: "Blockquote",
      parse(cx, line) {
        const size = isAlert(cx, line);
        if (size < 0) return false;

        if (cx.parentType().name !== "Alert")
          cx.startComposite("Alert", cx.lineStart);

        const markers = [];

        if (size !== 0) {
          markers.push(
            cx.elt("AlertInfo", cx.lineStart + 2, cx.lineStart + 2 + size + 3)
          );
        }

        markers.push(cx.elt("AlertMark", cx.lineStart, cx.lineStart + 1));

        markers.forEach((marker) => cx.addElement(marker));
        return cx.nextLine();
      },
    },
  ],
};
