const fs = require('fs');
const { JSDOM } = require('jsdom');

const svg = fs.readFileSync('assets/icon.svg', 'utf8');
const dom = new JSDOM(`<!DOCTYPE html><html><body>${svg}</body></html>`);
const document = dom.window.document;
const svgElement = document.querySelector('svg');
const canvas = dom.window.document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');
const img = new dom.window.Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0, 256, 256);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('assets/icon.png', buffer);
  console.log('icon.png created');
};
img.src = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');