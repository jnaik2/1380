const {extractIMDbInfo} = require('../c/getURLs');


// just for sanity checking the getURLS works as intended
const url = 'https://www.allmovie.com/movie/the-angry-birds-movie-am1272';
extractIMDbInfo(url, (err, data) => {
  if (err) {
    console.error('Error in getting url: ', err);
  } else {
    console.log(data);

    // getting actual movie url and rating
    if (data.length > 0) {
      const sampleKey = Object.keys(data[0])[0];
      const sampleValue = data[0][sampleKey];
      console.log(`Original url is: ${sampleValue.source_url} and movie rating is ${sampleValue.source_rating}`);
    }
  }
});
