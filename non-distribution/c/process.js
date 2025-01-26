#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
});

const processedWords = [];

rl.on('line', (line) => {
  const filtered = line.replace(/[^a-zA-Z]/g, ' ').toLowerCase();
  const words = filtered.split(` `);
  processedWords.push(...words);
});

rl.on('close', () => {
  fs.readFile('d/stopwords.txt', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }


    const stopwords = data.toString().split(`\n`);
    const stopwordMap = {};
    stopwords.pop();
    stopwords.forEach((stopword) => {
      stopwordMap[stopword] = true;
    });
    for (let index = 0; index < processedWords.length; index++) {
      if (!(processedWords[index] in stopwordMap)) {
        console.log(processedWords[index]);
      }
    }
  });
});
