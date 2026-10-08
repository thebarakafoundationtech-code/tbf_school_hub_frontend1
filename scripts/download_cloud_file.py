import sys, os, re, urllib.request, http.cookiejar

def download_file(url: str, destination: str):
    print(f"[CLOUD DOWNLOADER] Fetching: {url} -> {destination}")
    
    # Handle Google Drive
    gdrive_match = re.search(r'drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([-\w]{25,})', url)
    if not gdrive_match and 'drive.google.com' in url:
        m2 = re.search(r'[?&]id=([-\w]{25,})', url)
        if m2:
            gdrive_match = m2

    if gdrive_match:
        file_id = gdrive_match.group(1)
        print(f"[GOOGLE DRIVE] Detected File ID: {file_id}")
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')]

        base_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        resp = opener.open(base_url)
        content_type = resp.headers.get('Content-Type', '')

        # If HTML, Google is showing "virus scan warning / cannot scan files > 100MB"
        if 'text/html' in content_type:
            html = resp.read().decode('utf-8', errors='ignore')
            confirm_match = re.search(r'confirm=([0-9A-Za-z_-]+)', html) or re.search(r'name="confirm"\s+value="([0-9A-Za-z_-]+)"', html)
            confirm_code = confirm_match.group(1) if confirm_match else "t"
            print(f"[GOOGLE DRIVE] Bypassing large-file prompt with confirm={confirm_code}")
            download_url = f"https://drive.google.com/uc?export=download&confirm={confirm_code}&id={file_id}"
            resp2 = opener.open(download_url)
            with open(destination, 'wb') as out_f:
                while True:
                    chunk = resp2.read(8 * 1024 * 1024)
                    if not chunk:
                        break
                    out_f.write(chunk)
        else:
            with open(destination, 'wb') as out_f:
                while True:
                    chunk = resp.read(8 * 1024 * 1024)
                    if not chunk:
                        break
                    out_f.write(chunk)
    else:
    else:
        # Standard direct download (e.g. Dropbox, GoFile direct download link, Mediafire, S3, direct server link)
        if 'dropbox.com' in url and 'dl=0' in url:
            url = url.replace('dl=0', 'dl=1')

        print(f"[DIRECT DOWNLOAD] Streaming file from: {url}")
        # Try curl first for maximum speed and rock-solid resumable connections
        ret = os.system(f'curl -L -f --retry 5 --retry-delay 2 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -o "{destination}" "{url}"')
        if ret != 0 or not os.path.exists(destination) or os.path.getsize(destination) == 0:
            print("[CURL FAILED] Falling back to Python urllib streaming...")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
            with urllib.request.urlopen(req, timeout=120) as resp, open(destination, 'wb') as out_f:
                while True:
                    chunk = resp.read(8 * 1024 * 1024)
                    if not chunk:
                        break
                    out_f.write(chunk)

    size = os.path.getsize(destination)
    print(f"[CLOUD DOWNLOADER] Completed download: {size} bytes written to {destination}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 download_cloud_file.py <URL> <DESTINATION>")
        sys.exit(1)
    download_file(sys.argv[1], sys.argv[2])
