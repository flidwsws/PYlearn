#!/usr/bin/env python3
"""Start the local PYlearn site and open it in the default browser."""

import argparse
import errno
import hashlib
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import urllib.error
import urllib.request
import webbrowser


SITE_DIR = Path(__file__).resolve().parent.parent / "dist"
SITE_ID = hashlib.sha256(str(SITE_DIR).encode()).hexdigest()[:16]
LOCAL_HEADER = "X-PYlearn-Local"


class SiteHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header(LOCAL_HEADER, SITE_ID)
        super().end_headers()

    def log_message(self, format, *args):
        pass


def already_running(url):
    request = urllib.request.Request(url, method="HEAD")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(request, timeout=0.5) as response:
            return response.headers.get(LOCAL_HEADER) == SITE_ID
    except (OSError, urllib.error.URLError):
        return False


def main():
    parser = argparse.ArgumentParser(description="Открыть локальный PYlearn")
    parser.add_argument("--no-browser", action="store_true", help="Не открывать браузер")
    parser.add_argument("--port", type=int, default=4173, help="Начальный порт (по умолчанию 4173)")
    args = parser.parse_args()
    if not 1 <= args.port <= 65526:
        parser.error("Порт должен быть от 1 до 65526")
    if not (SITE_DIR / "index.html").is_file():
        parser.error("Не найдены файлы сайта в папке dist")

    handler = partial(SiteHandler, directory=str(SITE_DIR))
    for port in range(args.port, args.port + 10):
        url = "http://127.0.0.1:{}/".format(port)
        if already_running(url):
            print("PYlearn уже запущен: " + url, flush=True)
            if not args.no_browser:
                webbrowser.open(url)
            return
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
            break
        except OSError as error:
            if error.errno != errno.EADDRINUSE:
                raise
    else:
        parser.error("Не удалось найти свободный порт. Закрой старое окно запуска и попробуй ещё раз.")

    print("PYlearn открыт: " + url, flush=True)
    print("Это окно можно свернуть. Чтобы выключить сайт, закрой его или нажми Ctrl+C.", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPYlearn выключен.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
