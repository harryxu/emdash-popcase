const pending = new WeakMap<HTMLElement, () => void>();

/** Preserve focus restoration without relying on browser pointer-focus heuristics. */
export function focusElement(element: HTMLElement, keyboard: boolean) {
  pending.get(element)?.();
  if (!keyboard) {
    element.setAttribute("data-popcase-pointer-focus", "");
    const clear = () => {
      element.removeAttribute("data-popcase-pointer-focus");
      element.removeEventListener("blur", clear);
      element.removeEventListener("keydown", clear);
      pending.delete(element);
    };
    pending.set(element, clear);
    element.addEventListener("blur", clear, { once: true });
    element.addEventListener("keydown", clear, { once: true });
  }
  element.focus({ preventScroll: true });
}
