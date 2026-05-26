document$.subscribe(function () {
  if (typeof mermaid === 'undefined') {
    return;
  }

  if (!window.__mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose'
    });
    window.__mermaidInitialized = true;
  }

  mermaid.run({
    querySelector: '.mermaid:not([data-processed])'
  });
});
