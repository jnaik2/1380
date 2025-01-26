#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
});

const oneGrams = []; const twoGrams = []; const threeGrams = [];

rl.on('line', (line) => {
  oneGrams.push(line);
  twoGrams.push(line);
  threeGrams.push(line);
});

rl.on('close', () => {
  for (let index = 1; index < oneGrams.length; index++) {
    twoGrams[index - 1] += `\t${oneGrams[index]}`;
    threeGrams[index - 1] += `\t${oneGrams[index]}`;
  }

  for (let index = 2; index < oneGrams.length; index++) {
    threeGrams[index - 2] += `\t${oneGrams[index]}`;
  }
  oneGrams.sort();
  twoGrams.sort();
  threeGrams.sort();

  threeGrams.forEach((word, index) => {
    if (threeGrams[index] !== oneGrams[index] && threeGrams[index] != twoGrams[index]) {
      console.log(word);
    }
  });
  twoGrams.forEach((word, index) => {
    if (twoGrams[index] !== oneGrams[index]) {
      console.log(word);
    }
  });
  oneGrams.forEach((word) => console.log(word));
});
