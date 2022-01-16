import * as fs from 'fs/promises';
import * as path from 'path';
import * as querystring from 'querystring';
import puppeteer from 'puppeteer';

// Function to scrape products from senheng webpage
const pScrape = async () => {
  const selectors = {
    $title: '.jss112 > a > p',
    $image: '.jss110',
    $price: '.desc-item__price > span'
  };

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.senheng.com.my/computers-laptops/pc-peripherals.html');
  await page.waitForSelector('div.jss107');

  const data = await page.evaluate((args) => {
    const {
      $title,
      $image,
      $price,
    } = args

    const titles: string[] = Array.from(document.querySelectorAll($title)).map(el => el.innerText);
    const images: string[] = Array.from(document.querySelectorAll($image)).map(el => el.attributes.src.value);
    const prices: string[] = Array.from(document.querySelectorAll($price)).map(el => el.innerText);

    const $data = prices.map((p, i) => {
      const currency: string = p.substring(0, 2).trim();
      const price: string = p.substring(2).trim();
      const title: string = titles[i];
      let image: string = images[i];

      // parse image
      if (image && image.includes('_next')) {
        image = image.split('image?url=')[1];
      }

      return {
        currency,
        price,
        title,
        image,
      };
    });

    return $data
  }, selectors);

  const products = data.map(({ image, ...others }) => {
    const $image = querystring.unescape(image);

    return {
      ...others,
      image: $image
    }
  });

  // clean up
  await page.close();
  await browser.close();

  return { products };
};

// Function to write products to json file
const writeToJson = async (content: any) => {
  const safeToWrite = JSON.stringify(content);
  const file = path.join(__dirname, 'products.json');

  try {
    await fs.writeFile(file, safeToWrite, { encoding: 'utf-8' });
  } catch (e) {
    return false;
  }

  return true;
};

(async () => {
  const data = await pScrape();
  const resp = await writeToJson(data);
  console.log('written to file: ', resp);
})();