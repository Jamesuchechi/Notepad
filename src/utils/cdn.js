export function loadKatex() {
  if (window.katex) return Promise.resolve(window.katex);
  return new Promise((resolve) => {
    if (document.getElementById('katex-css') === null) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }
    if (document.getElementById('katex-js') === null) {
      const script = document.createElement('script');
      script.id = 'katex-js';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
      script.onload = () => resolve(window.katex);
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.katex) {
          clearInterval(check);
          resolve(window.katex);
        }
      }, 50);
    }
  });
}

export function loadMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  return new Promise((resolve) => {
    if (document.getElementById('mermaid-js') === null) {
      const script = document.createElement('script');
      script.id = 'mermaid-js';
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.8.0/dist/mermaid.min.js';
      script.onload = () => {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        resolve(window.mermaid);
      };
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.mermaid) {
          clearInterval(check);
          resolve(window.mermaid);
        }
      }, 50);
    }
  });
}
