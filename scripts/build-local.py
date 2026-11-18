#!/usr/bin/env python3
"""Bundle PYlearn into one HTML file that opens without a local server."""

import base64
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
HTML_OUT = ROOT / "local" / "PYlearn.html"
ZIP_OUT = ROOT / "downloads" / "PYlearn-Local.zip"
INSTRUCTIONS = """PYlearn — локальная версия

Открой PYlearn.html в браузере, как BONKAi.html.
Сервер, Терминал, установка Python и Node.js не нужны.
Внутри файла — 40 задач, теория, подсказки, чёрный интерфейс,
озвученное приветствие и музыка для работы.

Для запуска и проверки Python нужен интернет: среда Python
загружается в браузер с cdn.jsdelivr.net. Твой код выполняется
на компьютере, на сервер проверки он не отправляется.
Теорию, условия задач, подсказки и музыку можно открывать без интернета.

Если файл открылся в редакторе: «Открыть с помощью» → браузер.
Для сохранения прогресса пользуйся одним браузером и не перемещай файл.
Можно сохранить прогресс через «Мой прогресс» → «Экспорт».
Прогресс с онлайн-версии переносится через экспорт и импорт.
"""


def data_url(path, mime):
    return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def plain_module(name):
    source = (DIST / name).read_text(encoding="utf-8")
    source = re.sub(r"(?m)^import \{[^\n]+\} from ['\"][^'\"]+['\"];\n", "", source)
    return re.sub(r"(?m)^export (?=(?:const|function)\b)", "", source)


class ResourceCheck(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for name in ("src", "srcset", "poster"):
            if attrs.get(name) and not attrs[name].startswith("data:"):
                raise ValueError("Unbundled resource: " + tag + "[" + name + "]")
        if tag == "link" and attrs.get("href") and not attrs["href"].startswith("data:"):
            raise ValueError("Unbundled linked resource")


def make_bundle():
    html = (DIST / "index.html").read_text(encoding="utf-8")
    for name in ("styles.css", "themes.css"):
        css = (DIST / name).read_text(encoding="utf-8")
        # System fonts keep the file independent of Google Fonts.
        css = re.sub(r"@import\s+url\([^;]+;\s*", "", css)
        if re.search(r"</style|@import|url\(", css, re.I):
            raise ValueError("Stylesheet needs additional resource bundling: " + name)
        html = html.replace('<link rel="stylesheet" href="' + name + '">', "<style>\n" + css + "\n</style>")
    html = html.replace('href="favicon.svg"', 'href="' + data_url(DIST / "favicon.svg", "image/svg+xml") + '"')
    for name in ("welcome.mp3", "focus.mp3"):
        html = html.replace('src="audio/' + name + '"', 'src="' + data_url(DIST / "audio" / name, "audio/mpeg") + '"')

    worker_source = json.dumps((DIST / "python-worker.js").read_text(encoding="utf-8"), ensure_ascii=False).replace("<", "\\u003c")
    bundle = "const LOCAL_PYTHON_WORKER_URL=URL.createObjectURL(new Blob([" + worker_source + "],{type:'text/javascript'}));\n"
    bundle += "\n".join(plain_module(name) for name in ("data.js", "progress.js", "app.js"))
    worker_constructor = "new Worker(new URL('./python-worker.js',import.meta.url))"
    if bundle.count(worker_constructor) != 1:
        raise ValueError("Expected one Python worker constructor")
    bundle = bundle.replace(worker_constructor, "new Worker(LOCAL_PYTHON_WORKER_URL)")
    for name, script in (("app.js", bundle), ("preferences.js", plain_module("preferences.js")), ("music.js", plain_module("music.js"))):
        if re.search(r"</script", script, re.I):
            raise ValueError("Script cannot be safely embedded: " + name)
        tag = '<script type="module" src="' + name + '"></script>'
        if html.count(tag) != 1:
            raise ValueError("Expected one script tag: " + name)
        html = html.replace(tag, '<script type="module">\n' + script + "\n</script>")
    html = html.replace("<title>PYlearn — Python шаг за шагом</title>", "<title>PYlearn — локальная версия</title>")
    ResourceCheck().feed(html)
    return html


def main():
    html = make_bundle()
    HTML_OUT.parent.mkdir(parents=True, exist_ok=True)
    ZIP_OUT.parent.mkdir(parents=True, exist_ok=True)
    HTML_OUT.write_text(html, encoding="utf-8")
    with ZipFile(ZIP_OUT, "w", ZIP_DEFLATED) as archive:
        archive.writestr("PYlearn/PYlearn.html", html.encode("utf-8"))
        archive.writestr("PYlearn/КАК ОТКРЫТЬ.txt", INSTRUCTIONS.encode("utf-8"))
    with ZipFile(ZIP_OUT) as archive:
        if archive.testzip() is not None:
            raise ValueError("Archive verification failed")
    print(json.dumps({"html": str(HTML_OUT), "zip": str(ZIP_OUT), "bytes": HTML_OUT.stat().st_size}, ensure_ascii=False))


if __name__ == "__main__":
    main()
