#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
});

const url = process.argv[2];
const map = {};

rl.on('line', (line) => {
  const sanitizedLine = line.replaceAll('\t', ' ').trim();
  if (Object.hasOwn(map, sanitizedLine)) {
    map[sanitizedLine] += 1;
  } else {
    map[sanitizedLine] = 1;
  }
});
rl.on('close', () => {
  Object.keys(map).forEach((key) => {
    console.log(`${key} | ${map[key]} | ${url}`);
  });
});
