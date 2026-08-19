'use strict';

const { copyFileSync, mkdirSync } = require('node:fs');
const { basename, join } = require('node:path');

const iconFiles = [
  'genius-referrals.svg',
  'genius-referrals-dark.png',
];

const destination = join(__dirname, '..', 'dist', 'icons');
mkdirSync(destination, { recursive: true });

for (const iconFile of iconFiles) {
  copyFileSync(
    join(__dirname, '..', 'icons', iconFile),
    join(destination, basename(iconFile)),
  );
}
