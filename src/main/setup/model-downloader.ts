import fs from 'fs';
import https from 'https';
import path from 'path';
import { app } from 'electron';

export function downloadFile(
  url: string,
  destPath: string,
  onProgress: (progress: { percent: number; downloaded?: number; total?: number }) => void,
): Promise<{ success: boolean; path: string; name: string }> {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(destPath)) {
    const stats = fs.statSync(destPath);
    onProgress({ percent: 100, downloaded: stats.size, total: stats.size });
    return Promise.resolve({ success: true, path: destPath, name: path.basename(destPath) });
  }

  return new Promise((resolve, reject) => {
    const tmpPath = destPath + '.download';
    const file = fs.createWriteStream(tmpPath);
    let downloaded = 0;
    let total = 0;

    function makeRequest(requestUrl: string, redirectCount = 0): void {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      https.get(requestUrl, { headers: { 'User-Agent': 'VaultMind/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          return makeRequest(res.headers.location as string, redirectCount + 1);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }

        total = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0) {
            onProgress({
              percent: Math.round((downloaded / total) * 100),
              downloaded,
              total,
            });
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmpPath, destPath);
            resolve({ success: true, path: destPath, name: path.basename(destPath) });
          });
        });
      }).on('error', (err) => {
        fs.unlink(tmpPath, () => {});
        reject(err);
      });
    }

    makeRequest(url);
  });
}
