// Fetches the paper city only once the page has loaded and gone idle, so the hero text, fonts and
// first paint never wait on it. Data-saver visitors and forced-colours mode keep the plain grid.
const city = document.querySelector('paper-city');

function saveData(): boolean {
  const connection: unknown = Reflect.get(navigator, 'connection');
  return (
    typeof connection === 'object' &&
    connection !== null &&
    Reflect.get(connection, 'saveData') === true
  );
}

if (city && !saveData() && !matchMedia('(forced-colors: active)').matches) {
  const load = (): void => void import('./paper-city.ts');
  const whenIdle = (): void => {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 200);
  };
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('load', whenIdle, { once: true });
}
