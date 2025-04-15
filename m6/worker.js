const { parentPort, workerData } = require("worker_threads");

// Receive data from the main thread
const { resultBatch, visitedUrlsArray } = workerData;

// Convert the array back to a Set for efficient lookups
const localVisitedUrls = new Set(visitedUrlsArray);
const newDataset = [];

// Process each URL in this batch
for (const value of resultBatch) {
  const key = Object.keys(value)[0];
  if (!value[key]) {
    // console.log(value);
    continue; // Skip if the key doesn't exist
  }
  const keyUrl = value[key][0].keyUrl;

  // Only add URLs we haven't seen before
  if (!localVisitedUrls.has(keyUrl)) {
    newDataset.push({ [key]: keyUrl });
  }
}

// Send the filtered results back to the main thread
parentPort.postMessage(newDataset);
