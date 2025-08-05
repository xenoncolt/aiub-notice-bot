import axios from "axios";
import { createWriteStream, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function downloadImage(urls: string[] | string): Promise<string[] | string> {
    const dir = join(__dirname, '../download');
    let paths: string[] = [];

    mkdirSync(dir, { recursive: true });

    if (urls instanceof Array) {
        for (const [index, url] of urls.entries()) {
            const img_path = join(dir, `temp-${index}.jpg`);
            const writer = createWriteStream(img_path);
            const res = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });
            res.data.pipe(writer);
            paths.push(await new Promise<string>((resolve, reject) => {
                writer.on('finish', () => resolve(img_path));
                writer.on('error', reject);
            }));
        }
    } else {
        const img_path = join(dir, 'temp.jpg');
        const writer = createWriteStream(img_path);
        const res = await axios({
            url: urls,
            method: 'GET',
            responseType: 'stream'
        });
        res.data.pipe(writer);
        return new Promise<string>((resolve, reject) => {
            writer.on('finish', () => resolve(img_path));
            writer.on('error', reject);
        });
    }

    //const img_path = join(dir, 'temp.jpg');
    // const writer = createWriteStream(img_path);

    // const response = await axios({
    //     url,
    //     method: 'GET',
    //     responseType: 'stream'
    // });

    // response.data.pipe(writer);

    return paths;
}
