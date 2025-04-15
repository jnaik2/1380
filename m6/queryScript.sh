#!/bin/bash

# Check for required argument
if [ -z "$1" ]; then
  echo "Usage: $0 <query-term>"
  exit 1
fi

QUERY="$1"

# Run the m6 file in the background
rm -rf store/*  
./m6.js &

# Get the start time
start_time=$(date +%s)

# Run for 8 hours (28800 seconds)
duration=28800
interval=300  # 5 minutes

# Loop until 2 hours have passed
while [ $(($(date +%s) - start_time)) -lt $duration ]; do
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    node ./m6Query.js "$QUERY" >> queryPerformance.txt 2>&1
    echo "[$timestamp] Received query for \"$QUERY\"" >> queryPerformance.txt
    echo "--------------------------------------------------" >> queryPerformance.txt
    sleep $interval
done

# Terminate all node processes
timestamp=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$timestamp] 8 hours passed. Terminating all node processes." >> queryPerformance.txt
pkill node
