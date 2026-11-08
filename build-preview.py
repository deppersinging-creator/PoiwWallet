"""Builds preview.html: index.html without the document wrapper, for hosts that add their own (Claude Artifact preview)."""
import re, pathlib
src = pathlib.Path(__file__).with_name("index.html").read_text(encoding="utf-8")
head = re.search(r"<head>(.*?)</head>", src, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", src, re.S).group(1)
head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", head)
pathlib.Path(__file__).with_name("preview.html").write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
print("preview.html written")
