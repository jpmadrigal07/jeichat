/** Cap so a pasted wall of empty lines can't blow up a message's height. */
export const MAX_PRESERVED_BLANK_LINES = 5;

type UnistNode = {
  type: string;
  position?: { start: { line: number }; end: { line: number } };
};

type RootNode = UnistNode & {
  children: UnistNode[];
};

/**
 * Markdown folds any run of blank lines between blocks into a single
 * paragraph break, so "a\n\n\nb" renders the same as "a\n\nb". Chat should show
 * what was typed: re-insert one empty line (`<br>`) per blank source line
 * between top-level blocks, using the blocks' source positions.
 */
export function remarkPreserveBlankLines() {
  return (tree: RootNode) => {
    const children: UnistNode[] = [];

    tree.children.forEach((node, index) => {
      const previous = tree.children[index - 1];
      if (previous?.position && node.position) {
        const blankLines = Math.min(
          node.position.start.line - previous.position.end.line - 1,
          MAX_PRESERVED_BLANK_LINES,
        );
        for (let i = 0; i < blankLines; i += 1) {
          children.push({ type: 'break' });
        }
      }
      children.push(node);
    });

    tree.children = children;
  };
}
