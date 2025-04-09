// hash from movie title to tconst ID

const apiKey = '9890b4a1';

function getTconst(title) {
  const url = `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`;
  return fetch(url)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data.Response === 'True') {
          return data.imdbID;
        } else {
          throw new Error(data.Error);
        }
      })
      .catch((error) => {
        console.error('Error fetching movie data: ', error);
        throw error;
      });
}

// testing code
getTconst('Guardians of the Galaxy Vol. 69')
    .then((tconst) => {
      console.log('The IMDb ID is: ', tconst);
    })
    .catch((error) => {
      console.error('Failed to get IMDb ID: ', error.message);
    });

