interface Props {
  onClose: () => void;
}

export function InfoModal({ onClose }: Props) {
  return (
    <div
      class="modal-backdrop"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2 class="modal-title">About Medal Map</h2>
          <button
            class="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <section class="modal-section">
            <h3>How it Works</h3>
            <p>Medal Map shows where Winter Olympic medalists were born.</p>
            <p>
              Results are sourced from{" "}
              <a href="https://wikipedia.org/" target="_blank" rel="noreferrer">
                Wikipedia
              </a>
              , birth places from{" "}
              <a href="https://wikidata.org/" target="_blank" rel="noreferrer">
                Wikidata
              </a>
              .
            </p>
          </section>

          <section class="modal-section">
            <h3>Found an error?</h3>
            <p>
              Medal Map is built on{" "}
              <a href="https://wikidata.org/" target="_blank" rel="noreferrer">
                Wikidata
              </a>
              , which means you can improve the data for this site and everyone
              else at the same time. Find the athlete's Wikidata entry and add
              or correct{" "}
              <a
                href="https://www.wikidata.org/wiki/Property:P19"
                target="_blank"
                rel="noreferrer"
              >
                place of birth (P19)
              </a>
              . Make sure to follow the{" "}
              <a
                href="https://www.wikidata.org/wiki/Wikidata:List_of_policies_and_guidelines"
                target="_blank"
                rel="noreferrer"
              >
                Wikidata guidelines
              </a>
              .
            </p>
          </section>

          <section class="modal-section">
            <h3>Get in Touch</h3>
            <p>
              If you want to contribute, take the project further, or simply say
              hello, feel free to send me an{" "}
              <a href="mailto:vegardegeland@gmail.com">e-mail</a>.
            </p>
            <p>
              If you are curious about my other projects, they are all available
              on{" "}
              <a
                href="https://pebblepatch.dev/"
                target="_blank"
                rel="noreferrer"
              >
                pebblepatch.dev
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
