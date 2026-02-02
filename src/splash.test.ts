import { afterEach, describe, expect, it, vi } from 'vitest';

let requestExpandedModeMock: ReturnType<typeof vi.fn>;

vi.mock('@devvit/web/client', () => {
  requestExpandedModeMock = vi.fn();

  return {
    // used by the "YEET!" button
    requestExpandedMode: requestExpandedModeMock,
  };
});

afterEach(() => {
  requestExpandedModeMock?.mockReset();
});

describe('Splash', () => {
  it('clicking the "YEET!" button calls requestExpandedMode(...)', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    // `src/splash.tsx` renders immediately on import (createRoot(...).render(...))
    await import('./splash');

    // Let React commit the initial render.
    await new Promise((r) => setTimeout(r, 0));

    const yeetButton = Array.from(document.querySelectorAll('button')).find(
      (b) => /yeet/i.test(b.textContent ?? '')
    );
    expect(yeetButton).toBeTruthy();

    yeetButton!.click();

    expect(requestExpandedModeMock).toHaveBeenCalledTimes(1);
  });
});
