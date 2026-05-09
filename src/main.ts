import './styles.css';
import { bootstrapGame } from './app/bootstrap';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

bootstrapGame(root).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `
    <main class="boot-error">
      <section>
        <h1>Eclipse Vector failed to boot</h1>
        <p>${message}</p>
      </section>
    </main>
  `;
  console.error(error);
});
