import config from "./config.json" with { type: "json" };
import { JSDOM } from "jsdom";
import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { htmlToDiscordFormat } from "./helper/htmlToDiscordFormat";
import { channelDB, newsEventsDB } from "./schema/aiubNews.js";
import { downloadImage } from "./helper/downloadImage";


const news_db = await newsEventsDB();

const response = await fetch(`https://www.aiub.edu/category/news-events?pageNo=1&pageSize=2018`);
// const response = await fetch(`https://www.aiub.edu/category/news-events`);
const text = await response.text();
const dom = new JSDOM(text);
const document = dom.window.document;
const news = document.querySelectorAll("article.lqd-lp");
console.log(`Found ${news.length} news articles.`);
let full_desc = "";
let count = 0;
const news_array = Array.from(news);
for (let i = 0; i < news_array.length; i++) {
    const n = news_array[i];
    const title = n.querySelector('.lqd-lp-title a')?.textContent?.trim() || "";
    const short_desc = n.querySelector('.lqd-lp-excerpt p')?.textContent?.trim() || "";
    const link_info = n.querySelector('.lqd-lp-title a')?.getAttribute('href') || "";
    const published_date = n.querySelector('.lqd-lp-date')?.textContent?.trim() || "";

    const news_events_link = `${config.url}${link_info}`;
    // console.log(news_events_link);
    // console.log(`Title: ${title} \nShort Description: ${short_desc}\nLink: ${news_events_link}\nPublished Date: ${published_date}`);

    const notice_response = await fetch(news_events_link);
    const notice_text = await notice_response.text();
    const notice_dom = new JSDOM(notice_text);
    const notice_doc = notice_dom.window.document;
    const existing_news_event = await news_db.get('SELECT title FROM aiub WHERE title = ?', [title]);

    // console.log(notice_doc);
    const isContentDiv = notice_doc.querySelector('.content-description');
    // console.log(isContentDiv);
    if (isContentDiv) {
        const txtDescHTML = isContentDiv.innerHTML;
        const { content: textDescContent, imageUrls } = htmlToDiscordFormat(txtDescHTML);

        if (textDescContent.length > 100) {
                            full_desc = textDescContent;
                    }
        const desc = full_desc || short_desc;
        console.log(`Title: ${title}`);
        // console.log(`Title: ${title} \nDescription: ${desc}\nLink: ${news_events_link}\nPublished Date: ${published_date} \nImage URLs: ${imageUrls.join(', ')}\n --------------------`);
        await news_db.run(`
                    INSERT INTO aiub (title, desc, link_info, img_urls, published_date) 
                    VALUES (?, ?, ?, ?, ?)
                `, [title, desc, link_info, imageUrls.join(','), published_date]);

        count++;
    }
    if (count % 100 === 0 && count > 0) {
            console.log(`Processed ${count} articles. Sleeping for 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        }
        
        // Small delay between each request to be nice to the server
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    // console.log(`Done.....`)
    // await news_db.close();
//     console.log(`Done processing ${count} articles.`);
// await news_db.close();