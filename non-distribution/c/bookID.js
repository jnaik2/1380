// Function to query Gutendex API using a search string and return the id of the first result.
// It also logs the title of the book and the name of the first author.
function getID(userEntry) {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(userEntry)}`;

  return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.results && data.results.length > 0) {
          const book = data.results[0];
          const bookId = book.id;
          const bookTitle = book.title;
          const authorName = (book.authors && book.authors.length > 0) ? book.authors[0].name : 'Unknown';

          console.log(`Book Title: ${bookTitle}`);
          console.log(`Author: ${authorName}`);

          return bookId;
        } else {
          throw new Error('No book found for the given query.');
        }
      })
      .catch((error) => {
        console.error('Error fetching book data: ', error);
        throw error;
      });
}

// Testing the function with an example search query
getID('Pride and Prejudice')
    .then((id) => {
      console.log('The Gutenberg ID is:', id);
    })
    .catch((error) => {
      console.error('Failed to get book data:', error.message);
    });
