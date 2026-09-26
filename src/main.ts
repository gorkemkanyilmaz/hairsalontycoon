import { App } from './App';
import { Character3DRenderer } from './render/Character3DRenderer';

function startApp() {
  const app = new App();
  (window as any).app = app;
  (window as any).Character3DRenderer = Character3DRenderer;
  app.init();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
