const context = {
  drawImage: () => undefined,
  fillRect: () => undefined,
  getImageData: () => ({ data: new Uint8ClampedArray([10, 20, 30, 128]) }),
  putImageData: () => undefined
};

HTMLCanvasElement.prototype.getContext = () => context as never;
