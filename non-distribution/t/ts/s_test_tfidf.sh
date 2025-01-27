#!/bin/bash

T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/..$R_FOLDER/.." || exit 1

DIFF=${DIFF:-diff}
DIFF_PERCENT=${DIFF_PERCENT:-5}

cat /dev/null > d/visited.txt
cat /dev/null > d/tfidf/global-index.txt
cat /dev/null > d/tfidf/global-tf-index.txt

cat "$T_FOLDER"/d/tfidf.txt > d/urls.txt

./tfidf/engine.sh


if DIFF_PERCENT=$DIFF_PERCENT t/gi-diff.js <(sort d/tfidf/global-index.txt) <(sort "$T_FOLDER"/d/tfidf2.txt) >&2;
then
    echo "$0 success: global-index is identical"
    exit 0
else
    echo "$0 failure: global-index is not identical"
    exit 1
fi
