#!/usr/bin/env node

/*
Calculates a global index using a temporal global term frequency count
*/
const fs = require('fs');
const globalTFIndex = process.argv[2];
let documentCount = 0;
const documentsToWords = new Map();
const wordsToDocumentsTFs = new Map();

fs.readFile(globalTFIndex, (err, data) => calculateIDF(err, data));


const calculateIDF = (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  const globalIndexLines = data.toString().split('\n');
  globalIndexLines.pop();

  for (const line of globalIndexLines) {
    const globalStructure = line.trim().split(`|`);
    const word = globalStructure[0].trim();
    const pairs = globalStructure[1].trim().split(` `);

    for (let index = 0; index < pairs.length; index += 2) {
      const document = pairs[index].trim(); const tf = pairs[index + 1].trim();
      if (!documentsToWords.has(document)) {
        const set = new Set();
        set.add(word);
        documentCount += 1;
        documentsToWords.set(document, set);
      } else {
        documentsToWords.get(document).add(word);
      }

      if (!wordsToDocumentsTFs.has(word)) {
        const set = [{'document': document, 'tf': tf}];
        wordsToDocumentsTFs.set(word, set);
      } else {
        wordsToDocumentsTFs.get(word).push({'document': document, 'tf': tf});
      }
    }
  }

  wordsToDocumentsTFs.forEach((value, key) => {
    const idf = Math.log10(documentCount / value.length);
    let format = `${key} |`;
    for (const index in value) {
      const pair = value[index];
      format += ` ${pair.document} ${idf * pair.tf}`;
    }
    console.log(format);
  });
};
