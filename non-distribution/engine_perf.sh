#!/bin/bash
# This is the main entry point of the search engine.
cat /dev/null > d/visited.txt
cat /dev/null > d/global-index.txt
cat ./t/d/perf.txt > d/urls.txt

cd "$(dirname "$0")" || exit 1

total_crawl_time=0
total_index_time=0
total_query_time=0

url_count=0

while read -r url; do
  if [[ "$url" == "stop" ]]; then
    break
  fi

  echo "[engine] crawling $url" >/dev/stderr
  start_crawl=$(date +%s%3N) # Start time in milliseconds
  ./crawl.sh "$url" >d/content.txt
  end_crawl=$(date +%s%3N)   # End time in milliseconds
  crawl_time=$((end_crawl - start_crawl))

  total_crawl_time=$((total_crawl_time + crawl_time))

  echo "[engine] indexing $url" >/dev/stderr
  start_index=$(date +%s%3N) 
  ./index.sh d/content.txt "$url"
  end_index=$(date +%s%3N) 
  index_time=$((end_index - start_index))

  echo "[engine] querying $url" >/dev/stderr
  start_query=$(date +%s%3N) 
  ./query.js "filter" > /dev/null
  end_query=$(date +%s%3N) 
  query_time=$((end_query - start_query))

  total_index_time=$((total_index_time + index_time))
  total_query_time=$((total_query_time + query_time))

  url_count=$((url_count + 1))

visited_count=$(wc -l < d/visited.txt)
urls_count=$(wc -l < d/urls.txt)
if [[ "$visited_count" -ge "$urls_count" ]]; then
    break
  fi

done < d/urls.txt
echo "Final Average Crawl Time: $((total_crawl_time / url_count))ms" > performance.log
echo "Final Average Index Time: $((total_index_time / url_count))ms" >> performance.log
echo "Final Average Query Time: $((total_query_time / url_count))ms" >> performance.log


