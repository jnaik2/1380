#!/bin/bash
# This is a student test

T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/..$R_FOLDER/.." || exit 1

DIFF=${DIFF:-diff}
DIFF_PERCENT=${DIFF_PERCENT:-0}

cat /dev/null > d/global-index.txt

files=("$T_FOLDER"/d/merge{1..3}.txt)

printf "orange | d.com 1\n stuff | d.com 4\n" > t/d/merge4.txt

for file in "${files[@]}"
do
    cat "$file" | c/merge.js t/d/merge4.txt > d/temp-global-index.txt
    mv d/temp-global-index.txt t/d/merge4.txt
done


if DIFF_PERCENT=$DIFF_PERCENT t/gi-diff.js <(sort t/d/merge4.txt) <(sort "$T_FOLDER"/d/merge5.txt) >&2;
then
    cat /dev/null > t/d/merge4.txt
    echo "$0 success: global indexes are identical"
    exit 0
else
    cat /dev/null > t/d/merge4.txt
    echo "$0 failure: global indexes are not identical"
    exit 1
fi