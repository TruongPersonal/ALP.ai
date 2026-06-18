const globalRecord = globalThis as unknown as Record<string, unknown>;

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalRecord.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === 'undefined') {
  globalRecord.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === 'undefined') {
  globalRecord.Path2D = class Path2D {};
}
