const context = {
  drawImage: () => undefined,
  fillRect: () => undefined,
  getImageData: () => ({ data: new Uint8ClampedArray([10, 20, 30, 128]) }),
  putImageData: () => undefined
};

HTMLCanvasElement.prototype.getContext = () => context as never;

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  });
}
