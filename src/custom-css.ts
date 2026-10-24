export const customCssSelector = ".popcase-dialog[data-popcase-root]";

export function wrapCustomCss(css: string): string {
  return `${customCssSelector} {\n${css}\n}`;
}
