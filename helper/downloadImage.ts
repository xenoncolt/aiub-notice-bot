import axios from "axios";
import { createWriteStream, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function downloadImage(url: string): Promise<string> {
    const dir = join(__dirname, '../download');

    mkdirSync(dir, { recursive: true });

    const img_path = join(dir, 'temp.jpg');
    const writer = createWriteStream(img_path);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(img_path));
        writer.on('error', reject);
    });
}
