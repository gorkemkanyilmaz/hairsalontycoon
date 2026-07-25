import { App } from './App';

function startApp() {
  const app = new App();
  app.init();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
