import axios from "axios";
import { createWriteStream, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function downloadImage(urls: string[] | string): Promise<Buffer[] | Buffer> {
    const dir = join(__dirname, '../download');
    let buffers: Buffer[] = [];

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
            buffers.push(await new Promise<Buffer>((resolve, reject) => {
                writer.on('finish', () => resolve(Buffer.from(img_path)));
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
        return new Promise<Buffer>((resolve, reject) => {
            writer.on('finish', () => resolve(Buffer.from(img_path)));
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

    return buffers;
}
