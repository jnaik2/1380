import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

async function scrapeBookData(isbn) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // 1. Go to search results page
  const searchURL = `https://www.barnesandnoble.com/s/${isbn}`;
  await page.goto(searchURL, { waitUntil: "domcontentloaded" });

  // 2. Click on the first book link
  const bookLinkSelector = 'a[href*="/w/"]';
  await page.waitForSelector(bookLinkSelector);
  const bookHref = await page.$eval(bookLinkSelector, (el) =>
    el.getAttribute("href")
  );

  const fullBookURL = `https://www.barnesandnoble.com${bookHref}`;
  await page.goto(fullBookURL, { waitUntil: "domcontentloaded" });

  const html = await page.content();
  const $ = cheerio.load(html);

  // 3. Get ISBN-13
  let isbn13 = "";
  $("th").each((i, el) => {
    if ($(el).text().trim() === "ISBN-13:") {
      isbn13 = $(el).next("td").text().trim();
    }
  });

  // 4. Get "You may also like" book URLs
  const similarBooks = [];
  $(".product-shelf-title.pt-xs.focus a").each((i, el) => {
    const href = $(el).attr("href");
    if (href) {
      similarBooks.push(`https://www.barnesandnoble.com${href}`);
    }
  });

  console.log("ISBN-13:", isbn13);
  console.log("Similar Books:", similarBooks);
  console.log("Book Page:", fullBookURL);

  await browser.close();
}

scrapeBookData("9781546171461");
