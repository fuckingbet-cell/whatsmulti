const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#00a884';
ctx.beginPath();
ctx.roundRect(0, 0, 256, 256, 48);
ctx.fill();

// Text
ctx.fillStyle = 'white';
ctx.font = 'bold 110px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('WA', 128, 170);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('icon.png', buffer);
console.log('icon.png created successfully');
