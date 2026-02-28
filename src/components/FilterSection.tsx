import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

interface Props {
  title: string;
  children: ComponentChildren;
}

export function FilterSection({ title, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div class={`filter-section${open ? " filter-section--open" : ""}`}>
      <button
        class="filter-section-header"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span class="filter-section-title">{title}</span>
        <span class="filter-section-chevron" aria-hidden="true">
          ›
        </span>
      </button>
      <div class="filter-section-body">{children}</div>
    </div>
  );
}
