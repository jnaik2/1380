const { extractIMDbInfo } = require("../c/getURLs");

// just for sanity checking the getURLS works as intended
const url =
  "https://www.barnesandnoble.com/w/sunrise-on-the-reaping-suzanne-collins/1145703863?ean=9781546171461";

extractIMDbInfo(url, (err, data) => {
  if (err) {
    console.error("Error in getting url: ", err);
  } else {
    console.log(data);

    // getting actual movie url and rating
    const k = Object.keys(data)[0];
    const obj = JSON.parse(k);
    console.log(
      `Original url is: ${obj.url} and movie rating is ${obj.rating}`
    );
  }
});
