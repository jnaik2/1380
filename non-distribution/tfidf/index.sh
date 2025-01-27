#!/bin/bash

# index.sh runs the core indexing pipeline.

cat "$1" |
  c/process.sh |
  c/stem.js |
  c/combine.sh |
  c/tfidf/invert.js "$2" |
  c/merge.js d/tfidf/global-tf-index.txt |
  sort -o d/tfidf/global-tf-index.txt

c/tfidf/idf.js d/tfidf/global-tf-index.txt > d/tfidf/global-index.txt
