#!/usr/bin/env node

/*
Merge the current inverted index (assuming the right structure) with the global index file
Usage: cat input | ./merge.js global-index > output

The inverted indices have the different structures!

Each line of a local index is formatted as:
  - `<word/ngram> | <frequency> | <url>`

Each line of a global index is be formatted as:
  - `<word/ngram> | <url_1> <frequency_1> <url_2> <frequency_2> ... <url_n> <frequency_n>`
  - Where pairs of `url` and `frequency` are in descending order of frequency
  - Everything after `|` is space-separated

-------------------------------------------------------------------------------------
Example:

local index:
  word1 word2 | 8 | url1
  word3 | 1 | url9
EXISTING global index:
  word1 word2 | url4 2
  word3 | url3 2

merge into the NEW global index:
  word1 word2 | url1 8 url4 2
  word3 | url3 2 url9 1

Remember to error gracefully, particularly when reading the global index file.
*/

const fs = require('fs');
const readline = require('readline');
// The `compare` function can be used for sorting.
const compare = (a, b) => {
  if (a.freq > b.freq) {
    return -1;
  } else if (a.freq < b.freq) {
    return 1;
  } else {
    return 0;
  }
};
const rl = readline.createInterface({
  input: process.stdin,
});

// 1. Read the incoming local index data from standard input (stdin) line by line.
let localIndex = '';
rl.on('line', (line) => {
  localIndex += line + `\n`;
});

rl.on('close', () => {
  // 2. Read the global index name/location, using process.argv
  // and call printMerged as a callback
  const globalIndexName = process.argv[2];
  fs.readFile(globalIndexName, (err, data) => printMerged(err, data));
});

const printMerged = (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Split the data into an array of lines
  const localIndexLines = localIndex.split('\n');
  const globalIndexLines = data.toString().split('\n');

  localIndexLines.pop();
  globalIndexLines.pop();

  const local = {};
  const global = {};

  // 3. For each line in `localIndexLines`, parse them and add them to the `local` object where keys are terms and values contain `url` and `freq`.
  for (const line of localIndexLines) {
    const localStructure = line.trim().split(`|`);
    const term = localStructure[0].trim(); const freq = localStructure[1].trim(); const url = localStructure[2].trim();
    local[term] = {url, freq};
  }
  // 4. For each line in `globalIndexLines`, parse them and add them to the `global` object where keys are terms and values are arrays of `url` and `freq` objects.
  // Use the .trim() method to remove leading and trailing whitespace from a string.
  for (const line of globalIndexLines) {
    const globalStructure = line.trim().split(`|`);
    const term = globalStructure[0].trim(); const pairs = globalStructure[1].trim().split(` `);
    const urlfs = [];

    for (let index = 0; index < pairs.length; index += 2) {
      const url = pairs[index].trim(); const freq = pairs[index + 1].trim();
      urlfs.push({url, freq});
    }

    global[term] = urlfs; // Array of {url, freq} objects
  }
  // console.log(global)

  // 5. Merge the local index into the global index:
  // - For each term in the local index, if the term exists in the global index:
  //     - Append the local index entry to the array of entries in the global index.
  //     - Sort the array by `freq` in descending order.
  // - If the term does not exist in the global index:
  //     - Add it as a new entry with the local index's data.
  // console.log(local)
  // console.log(global)
  Object.entries(local).forEach((entry) => {
    const [term, data] = entry;
    if (term in global) {
      // console.log("HERE")
      // console.log(local[term], global[term])
      global[term].push(data);
      global[term].sort(compare);
      // console.log("AFTER")
      // console.log(local[term], global[term]);
    } else {
      global[term] = [data];
    }
  });

  // 6. Print the merged index to the console in the same format as the global index file:
  //    - Each line contains a term, followed by a pipe (`|`), followed by space-separated pairs of `url` and `freq`.

  Object.entries(global).forEach((entry) => {
    const [term, pairs] = entry;
    const data = pairs.map(({url, freq}) => `${url} ${freq}`).join(` `);
    console.log(`${term} | ${data}`);
  });
};
