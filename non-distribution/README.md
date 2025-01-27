# M0: Setup & Centralized Computing

> Add your contact information below and in `package.json`.

* name: `Jaideep Naik`

* email: `jaideep_naik@brown.edu`

* cslogin: `jnaik2`


## Summary

> Summarize your implementation, including the most challenging aspects; remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete M0 (`hours`), the total number of JavaScript lines you added, including tests (`jsloc`), the total number of shell lines you added, including for deployment and testing (`sloc`).


My implementation consists of `9` components addressing T1--8. To be specific, I'm referring to components for query.js, invert.js, combine.js, getURLs.js, getText.js, stem.js, process.js, merge.js, and idf.js

The most challenging aspect was incorporating tf-idf because it required modifying the pipeline. To compute the inverse document frequency, I needed to have access to all the documents, and which words they contained individually. The challenge was that invert.js only has the ability to compute tf, not the idf, so I needed some way to aggregate the document-word relationships. I accomplished this by adding an extra processing step after merge, which now merges a local into a global term frequency document, and converted the global term frequency document to a global tf-idf document. Implementing tf-idf required modifying multiple stages in the pipeline and carefully creating a test corpus.


## Correctness & Performance Characterization


> Describe how you characterized the correctness and performance of your implementation.


To characterize correctness, we developed `12` tests that test the following cases: 
 1. t/ts/s_test_tfidf.sh: This verifies the entire pipeline using tf-idf on a custom corpus that I hand calculated the frequencies and manually created via github pages
 2. t/ts/s_test_stem.sh: This more extensively tests stem.js on less common stems
 3. t/ts/s_test_query3.sh: This tests an edge case where a query that contains just a stopword returns the entire corpus
 4. t/ts/s_test_query2.sh This tests that a multi-world query returns all matches in the corpus,
 even if the bigram has a different order (e.g. a search for A B should still match B A)
 5. t/ts/s_test_query.sh: This tests that a query containing a stopword does not return
 matches for said stop word, but only the valid words
 6. t/ts/s_test_process.sh: This more extensively tests process.js on a custom corpus
 7. t/ts/s_test_merge.sh: This more extensively tests merge.js on a custom corpus
 8. t/ts/s_test_invert.sh: This more extensively tests invert.js on a custom corpus
 9. t/ts/s_test_getURLs.sh: This more extensively tests getURLs.js on a custom corpus
 10. t/ts/s_test_getText.sh: This more extensively tests getText.js on a custom corpus
 11. t/ts/s_test_end_to_end.sh: This tests the entire pipeline including crawling, indexing,
 and querying a distinct corpus
 12. t/ts/s_test_combine.sh: This more extensively tests combine.js on a custom corpus


*Performance*: The throughput of various subsystems is described in the `"throughput"` portion of package.json. The characteristics of my development machines are summarized in the `"dev"` portion of package.json.


## Wild Guess

> How many lines of code do you think it will take to build the fully distributed, scalable version of your search engine? Add that number to the `"dloc"` portion of package.json, and justify your answer below.

Since this non-distributed version took me around 300 lines of JavaScript, including testing & the 2380 level components, I'd estimate the final version, including all testing & 2380 components, would be 3000 lines of code. Assuming the milestone are roughly equal in difficulty, M1 - M5 should be ~1500 LoC and M6, which is 3 weeks long, might be ~1000 lines of code. Additionally, the distributed version is probably much harder
than a nondistributed version, so I'll add a buffer of 500 lines of code to account for this difficulty to get a total of 3000 as a prediction.