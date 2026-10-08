import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { importBooksFromDirectory } from './import_books_zip';

async function main() {
  const downloadUrl = "https://cold1.gofile.io/download/web/f83ecf12-acce-446d-b118-81f3a817bff6/Vitabu%20Vya%20Hub.7z";
  const token = "3BQPX28luk5dGPda2Tt2MlbeJtBZd1UF";
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
  const destArchive = "/tmp/Vitabu_Vya_Hub.7z";
  const extractDir = "/tmp/vitabu_extracted";

  console.log("[GOFILE DOWNLOAD] Starting full download of Vitabu Vya Hub.7z (1.27 GB)...");
  const startTime = Date.now();

  const curlCmd = `curl -L --retry 5 --retry-delay 2 -H "Cookie: accountToken=${token}" -H "User-Agent: ${userAgent}" "${downloadUrl}" -o "${destArchive}"`;
  execSync(curlCmd, { stdio: 'inherit', timeout: 600000 });

  const stat = fs.statSync(destArchive);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[GOFILE DOWNLOAD] Download complete! Size: ${(stat.size / (1024*1024)).toFixed(1)} MB in ${elapsed}s.`);

  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  console.log(`[7Z EXTRACT] Unpacking ${destArchive} -> ${extractDir}...`);
  execSync(`7z x -y "${destArchive}" -o"${extractDir}"`, { stdio: 'inherit' });

  console.log("[IMPORT] Importing unpacked curriculum books into Tanzania Curriculum library...");
  const targetBooksDir = path.resolve('./public/books');
  const result = importBooksFromDirectory(extractDir, targetBooksDir);

  console.log(`[SUCCESS] Imported ${result.imported} books from Vitabu Vya Hub archive!`);

  // Cleanup archive to preserve disk space
  try { fs.unlinkSync(destArchive); } catch {}
  try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch {}

  console.log("[DONE] All books from user's zipped folder are now active in Tanzania Curriculum library!");
}

main().catch(err => {
  console.error("[ERROR]", err);
  process.exit(1);
});
