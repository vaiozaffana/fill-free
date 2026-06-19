/**
 * Test setup: jsdom's Blob/File do not implement async `text()` /
 * `arrayBuffer()` (they exist in real browsers). Polyfill them using jsdom's
 * own FileReader so the parser, which uses the standard File API, can be
 * unit-tested under jsdom.
 */

function readAs(blob: Blob, as: 'arrayBuffer' | 'text'): Promise<ArrayBuffer | string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer | string);
    reader.onerror = () => reject(reader.error);
    if (as === 'arrayBuffer') reader.readAsArrayBuffer(blob);
    else reader.readAsText(blob);
  });
}

if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return readAs(this, 'arrayBuffer') as Promise<ArrayBuffer>;
  };
}
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob): Promise<string> {
    return readAs(this, 'text') as Promise<string>;
  };
}
