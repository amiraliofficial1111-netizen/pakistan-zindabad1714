#!/usr/bin/env python3
"""Local site server. Static pages, plus an authenticated desk for the journal and site files."""

import gzip
import io
import json
import os
import re
import secrets
from datetime import datetime, timezone
from email.utils import format_datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
BLOGS = os.path.join(ROOT, "blogs.json")
JOURNAL = os.path.join(ROOT, "journal.json")
PAGES = os.path.join(ROOT, "pages.json")
SITE_CONTENT = os.path.join(ROOT, "site-content.json")
CREDENTIALS = os.path.join(ROOT, "credentials.json")
RSS = os.path.join(ROOT, "rss.xml")
SITE = "https://constitution-of-god.vercel.app/"
DEFAULT_EMAIL = os.environ.get("ADMIN_EMAIL", "mark@constitution-of-god.com").strip().lower()
DEFAULT_PASSWORD = os.environ.get("ADMIN_PASSWORD", "mark-desk")
TOKENS = set()
MAX_BODY = 200_000
MAX_FILE = 1_600_000
GZIP_CACHE = {}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PAGE_ID_RE = re.compile(r"^[a-z]+$")
FILE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
EDITABLE_EXT = {".html", ".css", ".js", ".json", ".xml", ".txt", ".svg"}
BLOCKED_FILES = {"serve.py", "credentials.json"}
GROUP_ORDER = ("pages", "articles", "scripts", "data", "other")


def load_credentials():
    try:
        with open(CREDENTIALS, encoding="utf-8") as handle:
            data = json.load(handle)
        email = str(data.get("email", DEFAULT_EMAIL)).strip().lower()
        password = str(data.get("password", DEFAULT_PASSWORD))
        if not email or not password:
            raise ValueError("credentials.json is incomplete")
        return {"email": email, "password": password}
    except (OSError, ValueError, json.JSONDecodeError, TypeError):
        return {"email": DEFAULT_EMAIL, "password": DEFAULT_PASSWORD}


def save_credentials(email, password):
    payload = {"email": email, "password": password}
    temporary = CREDENTIALS + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, CREDENTIALS)


def credentials_match(email, password):
    saved = load_credentials()
    email = str(email or "")
    password = str(password or "")
    saved_email = saved["email"]
    saved_password = saved["password"]
    email_ok = secrets.compare_digest(email, saved_email) if len(email) == len(saved_email) else False
    password_ok = secrets.compare_digest(password, saved_password) if len(password) == len(saved_password) else False
    return email_ok and password_ok


def issue_token():
    token = secrets.token_urlsafe(32)
    TOKENS.add(token)
    return token


def load_posts():
    with open(BLOGS, encoding="utf-8") as handle:
        data = json.load(handle)
    posts = data.get("posts")
    if not isinstance(posts, list):
        raise ValueError("blogs.json is missing posts")
    return posts


def save_posts(posts):
    payload = {"posts": posts}
    temporary = BLOGS + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, BLOGS)


def load_journal_posts():
    with open(JOURNAL, encoding="utf-8") as handle:
        data = json.load(handle)
    posts = data.get("posts")
    if not isinstance(posts, list):
        raise ValueError("journal.json is missing posts")
    return posts


def save_journal_posts(posts):
    payload = {"posts": posts}
    temporary = JOURNAL + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, JOURNAL)
    write_rss(posts)


def load_pages():
    with open(PAGES, encoding="utf-8") as handle:
        data = json.load(handle)
    pages = data.get("pages")
    if not isinstance(pages, list):
        raise ValueError("pages.json is missing pages")
    return pages


def save_pages(pages):
    payload = {"pages": pages}
    temporary = PAGES + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, PAGES)



def load_site_content():
    with open(SITE_CONTENT, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("site-content.json is invalid")
    return data


def save_site_content(data):
    if not isinstance(data, dict):
        raise ValueError("Site content must be an object.")
    temporary = SITE_CONTENT + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, SITE_CONTENT)


def clean_site_content(fields):
    if not isinstance(fields, dict):
        raise ValueError("Send the full site content object.")
    # Keep payload bounded but allow rich site data
    encoded = json.dumps(fields).encode("utf-8")
    if len(encoded) > 2_500_000:
        raise ValueError("Site content is too large for this desk.")
    theme = fields.get("theme")
    if theme is not None and not isinstance(theme, dict):
        raise ValueError("Theme settings must be an object.")
    global_block = fields.get("global")
    if global_block is not None and not isinstance(global_block, dict):
        raise ValueError("Global settings must be an object.")
    return fields

def plain_text(value):
    text = re.sub(r"<[^>]+>", " ", str(value or ""))
    return re.sub(r"\s+", " ", text).strip()


def plain_text_len(value):
    return len(plain_text(value))


def clean_page(fields, existing):
    title = str(fields.get("title", "")).strip()
    heading = str(fields.get("heading", "")).strip()
    lead = str(fields.get("lead", "")).strip()
    description = str(fields.get("description", "")).strip()
    if not title or len(title) > 180:
        raise ValueError("Give the page a browser title of 180 characters or fewer.")
    if not heading or plain_text_len(heading) < 1:
        raise ValueError("Give the page a heading.")
    if plain_text_len(heading) > 180 or len(heading) > 20_000:
        raise ValueError("Keep the heading to 180 characters of text.")
    if not lead or plain_text_len(lead) < 1:
        raise ValueError("Give the page a short lead.")
    if plain_text_len(lead) > 800 or len(lead) > 40_000:
        raise ValueError("Keep the lead to 800 characters of text.")
    if plain_text_len(description) > 400 or len(description) > 20_000:
        raise ValueError("Keep the description to 400 characters of text.")
    updated = dict(existing)
    updated.update(
        {
            "title": title,
            "heading": heading,
            "lead": lead,
            "description": description,
        }
    )
    return updated


def html_attr_escape(value):
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def replace_meta_content(html, kind, name, value):
    attr = "property" if kind == "property" else "name"
    pattern = re.compile(
        rf'(<meta\s+{attr}="{re.escape(name)}"\s+content=")[^"]*(")',
        re.I,
    )
    if not pattern.search(html):
        pattern = re.compile(
            rf'(<meta\s+content=")[^"]*("\s+{attr}="{re.escape(name)}")',
            re.I,
        )
    return pattern.sub(rf"\g<1>{html_attr_escape(value)}\g<2>", html, count=1)


def apply_page_seo(page):
    """Write title + SEO meta tags into the live HTML file for crawlers."""
    path = os.path.join(ROOT, page["file"])
    if not os.path.isfile(path):
        raise ValueError("That page file is missing.")
    with open(path, encoding="utf-8") as handle:
        html = handle.read()

    title = page.get("title", "")
    description = plain_text(page.get("description", ""))
    twitter_title = title.split("|", 1)[0].strip() if "|" in title else title

    html = re.sub(
        r"(<title>)(.*?)(</title>)",
        rf"\1{html_attr_escape(title)}\3",
        html,
        count=1,
        flags=re.I | re.S,
    )
    if description:
        html = replace_meta_content(html, "name", "description", description)
        html = replace_meta_content(html, "property", "og:description", description)
        html = replace_meta_content(html, "name", "twitter:description", description)
    if title:
        html = replace_meta_content(html, "property", "og:title", title)
        html = replace_meta_content(html, "name", "twitter:title", twitter_title)

    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(html)
    os.replace(temporary, path)


def xml_escape(value):
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def write_rss(posts=None):
    if posts is None:
        posts = load_journal_posts()
    ordered = sorted(posts, key=lambda post: post.get("date", ""), reverse=True)
    newest = ordered[0]["date"] if ordered else "2026-10-06"
    built = datetime.strptime(newest, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    items = []
    for post in ordered:
        published = datetime.strptime(post["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        href = post.get("href") or f"post.html?slug={post['slug']}"
        link = SITE + href
        items.append(
            "    <item>\n"
            f"      <title>{xml_escape(post['title'])}</title>\n"
            f"      <link>{xml_escape(link)}</link>\n"
            f"      <guid>{xml_escape(link)}</guid>\n"
            f"      <pubDate>{format_datetime(published)}</pubDate>\n"
            f"      <description>{xml_escape(post['excerpt'])}</description>\n"
            "    </item>"
        )
    document = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0">\n'
        "  <channel>\n"
        "    <title>The Constitution of God — Journal</title>\n"
        f"    <link>{SITE}journal.html</link>\n"
        "    <description>Essays from Mark H Steffen on The Constitution of God.</description>\n"
        "    <language>en-us</language>\n"
        f"    <lastBuildDate>{format_datetime(built)}</lastBuildDate>\n"
        + "\n".join(items)
        + "\n  </channel>\n</rss>\n"
    )
    temporary = RSS + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        handle.write(document)
    os.replace(temporary, RSS)


def slugify(title):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:72] or "note"


def unique_slug(title, posts):
    base = slugify(title)
    taken = {post["slug"] for post in posts}
    slug = base
    number = 2
    while slug in taken:
        slug = f"{base}-{number}"
        number += 1
    return slug


def clean_post(fields, existing=None):
    title = str(fields.get("title", "")).strip()
    excerpt = str(fields.get("excerpt", "")).strip()
    date = str(fields.get("date", "")).strip()
    body = str(fields.get("body", "")).replace("\r\n", "\n").strip()
    plain = re.sub(r"<[^>]+>", " ", body)
    plain = re.sub(r"\s+", " ", plain).strip()
    if not title or len(title) > 180:
        raise ValueError("Give the note a title of 180 characters or fewer.")
    if not excerpt or len(excerpt) > 500:
        raise ValueError("Give the note a short summary of 500 characters or fewer.")
    if not DATE_RE.match(date):
        raise ValueError("Use a real date.")
    datetime.strptime(date, "%Y-%m-%d")
    if len(body) > 100000:
        raise ValueError("The essay is too long for this desk.")
    href = existing.get("href", "") if existing else ""
    if not plain and not href:
        raise ValueError("Write the essay before publishing.")
    return {"title": title, "excerpt": excerpt, "date": date, "body": body, "href": href}


def file_group(name):
    lower = name.lower()
    if lower.startswith("article-") or lower in {"post.html"}:
        return "articles"
    if lower.endswith((".js", ".css")):
        return "scripts"
    if lower.endswith((".json", ".xml", ".txt", ".svg")):
        return "data"
    if lower.endswith(".html"):
        return "pages"
    return "other"


def resolve_site_file(name):
    name = unquote(str(name or "")).strip().replace("\\", "/")
    if "/" in name or name in {".", ".."} or not FILE_RE.match(name):
        raise ValueError("That file is outside the desk.")
    if name in BLOCKED_FILES:
        raise ValueError("That file is locked on this desk.")
    extension = os.path.splitext(name)[1].lower()
    if extension not in EDITABLE_EXT:
        raise ValueError("That file type cannot be edited here.")
    path = os.path.join(ROOT, name)
    if os.path.dirname(os.path.abspath(path)) != ROOT:
        raise ValueError("That file is outside the desk.")
    if not os.path.isfile(path):
        raise ValueError("That file is not on the site.")
    return name, path


def list_site_files():
    files = []
    for name in sorted(os.listdir(ROOT)):
        if name in BLOCKED_FILES or not FILE_RE.match(name):
            continue
        extension = os.path.splitext(name)[1].lower()
        if extension not in EDITABLE_EXT:
            continue
        path = os.path.join(ROOT, name)
        if not os.path.isfile(path):
            continue
        files.append(
            {
                "path": name,
                "bytes": os.path.getsize(path),
                "group": file_group(name),
            }
        )
    files.sort(key=lambda item: (GROUP_ORDER.index(item["group"]), item["path"]))
    return files


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        path = urlparse(self.path).path
        query = urlparse(self.path).query
        private = path in ("/blogs.json", "/journal.json", "/api/blogs", "/admin.html", "/backend") or path.startswith("/api/")
        if private:
            self.send_header("Cache-Control", "no-store")
        elif path in ("/pages.json", "/site-content.json"):
            self.send_header("Cache-Control", "private, max-age=120")
        elif "v=" in query:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.endswith((".webp", ".svg", ".png", ".jpg", ".jpeg", ".mp3", ".woff2")):
            self.send_header("Cache-Control", "public, max-age=604800")
        elif path.endswith((".html", ".xml")) or path in ("/", ""):
            self.send_header("Cache-Control", "no-cache")
        if path in ("/admin.html", "/backend"):
            self.send_header("X-Robots-Tag", "noindex, nofollow")
        super().end_headers()

    def is_private_path(self, url_path):
        parts = [part for part in unquote(url_path).split("/") if part not in ("", ".")]
        if any(part.startswith(".") for part in parts):
            return True
        return bool(parts) and parts[0] in {"serve.py", "netlify.toml"}

    def send_head(self):
        parsed = urlparse(self.path)
        if self.is_private_path(parsed.path):
            self.send_error(404)
            return None
        target = self.translate_path(parsed.path)
        if os.path.isdir(target):
            index = os.path.join(target, "index.html")
            target = index if os.path.isfile(index) else target
        ext = os.path.splitext(target)[1].lower()
        compressible = ext in {".html", ".css", ".js", ".json", ".svg", ".xml", ".txt"}
        accepts_gzip = "gzip" in self.headers.get("Accept-Encoding", "").lower()
        if compressible and accepts_gzip and os.path.isfile(target):
            try:
                stat = os.stat(target)
            except OSError:
                return super().send_head()
            etag = f'W/"{stat.st_mtime_ns:x}-{stat.st_size:x}-gz"'
            if self.headers.get("If-None-Match") == etag:
                self.send_response(304)
                self.send_header("ETag", etag)
                self.end_headers()
                return None
            key = (stat.st_mtime_ns, stat.st_size)
            cached = GZIP_CACHE.get(target)
            payload = cached[1] if cached and cached[0] == key else None
            if payload is None:
                try:
                    with open(target, "rb") as handle:
                        raw = handle.read()
                except OSError:
                    return super().send_head()
                payload = gzip.compress(raw, compresslevel=6)
                if len(payload) >= len(raw):
                    return super().send_head()
                if len(GZIP_CACHE) > 80:
                    GZIP_CACHE.pop(next(iter(GZIP_CACHE)))
                GZIP_CACHE[target] = (key, payload)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(target))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("ETag", etag)
            self.send_header("Vary", "Accept-Encoding")
            self.end_headers()
            return io.BytesIO(payload)
        return super().send_head()

    def do_GET(self):
        path = urlparse(self.path).path
        if self.is_private_path(path):
            self.send_error(404)
            return
        if path in ("/backend", "/backend/"):
            self.path = "/admin.html"
            return super().do_GET()
        if path == "/api/blogs":
            try:
                self.respond(200, {"posts": load_posts()})
            except (OSError, ValueError) as error:
                self.respond(500, {"error": str(error)})
            return
        if path == "/api/journal":
            try:
                self.respond(200, {"posts": load_journal_posts()})
            except (OSError, ValueError) as error:
                self.respond(500, {"error": str(error)})
            return
        if path in ("/credentials.json", "/api/credentials"):
            self.send_error(404)
            return
        if path == "/api/site":
            try:
                self.respond(200, {"site": load_site_content()})
            except (OSError, ValueError) as error:
                self.respond(500, {"error": str(error)})
            return
        if path == "/api/pages":
            if not self.authorized():
                return
            try:
                self.respond(200, {"pages": load_pages()})
            except (OSError, ValueError) as error:
                self.respond(500, {"error": str(error)})
            return
        page_id = self.page_id_from_path()
        if page_id is not None:
            if not self.authorized():
                return
            self.read_page(page_id)
            return
        if path == "/api/site/files":
            if not self.authorized():
                return
            try:
                self.respond(200, {"files": list_site_files()})
            except OSError as error:
                self.respond(500, {"error": str(error)})
            return
        site_name = self.site_file_from_path()
        if site_name is not None:
            if not self.authorized():
                return
            self.read_site_file(site_name)
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/login":
            self.login()
            return
        if path == "/api/login/change":
            self.change_login()
            return
        if path == "/api/credentials":
            if not self.authorized():
                return
            self.update_credentials()
            return
        if path == "/api/blogs":
            if not self.authorized():
                return
            self.create_collection_post("blogs")
            return
        if path == "/api/journal":
            if not self.authorized():
                return
            self.create_collection_post("journal")
            return
        self.send_error(404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path == "/api/site":
            if not self.authorized():
                return
            self.update_site_content()
            return
        page_id = self.page_id_from_path()
        if page_id is not None:
            if not self.authorized():
                return
            self.update_page(page_id)
            return
        site_name = self.site_file_from_path()
        if site_name is not None:
            if not self.authorized():
                return
            self.write_site_file(site_name)
            return
        collection, slug = self.collection_slug_from_path()
        if slug is None:
            self.send_error(404)
            return
        if not self.authorized():
            return
        self.update_collection_post(collection, slug)

    def do_DELETE(self):
        collection, slug = self.collection_slug_from_path()
        if slug is None:
            self.send_error(404)
            return
        if not self.authorized():
            return
        self.delete_collection_post(collection, slug)

    def collection_slug_from_path(self):
        path = unquote(urlparse(self.path).path)
        for collection, prefix in (("blogs", "/api/blogs/"), ("journal", "/api/journal/")):
            if path.startswith(prefix):
                slug = path[len(prefix):]
                if SLUG_RE.match(slug):
                    return collection, slug
                return collection, None
        return None, None

    def page_id_from_path(self):
        path = unquote(urlparse(self.path).path)
        prefix = "/api/pages/"
        if not path.startswith(prefix):
            return None
        page_id = path[len(prefix):]
        if not PAGE_ID_RE.match(page_id):
            return None
        return page_id

    def site_file_from_path(self):
        path = unquote(urlparse(self.path).path)
        prefix = "/api/site/file/"
        if not path.startswith(prefix):
            return None
        return path[len(prefix):]

    def authorized(self):
        header = self.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        if token and token in TOKENS:
            return True
        self.respond(401, {"error": "Open the desk again."})
        return False

    def login(self):
        try:
            fields = self.read_json()
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        email = str(fields.get("email", "")).strip().lower()
        password = str(fields.get("password", ""))
        if not credentials_match(email, password):
            self.respond(401, {"error": "That email or password does not open the desk."})
            return
        self.respond(200, {"token": issue_token()})

    def change_login(self):
        try:
            fields = self.read_json()
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        current_email = str(fields.get("currentEmail", "")).strip().lower()
        current_password = str(fields.get("currentPassword", ""))
        email = str(fields.get("email", "")).strip().lower()
        password = str(fields.get("password", ""))
        if not credentials_match(current_email, current_password):
            self.respond(401, {"error": "The current email or password is not correct."})
            return
        if not EMAIL_RE.match(email):
            self.respond(400, {"error": "Enter a valid email address."})
            return
        if len(password) < 6:
            self.respond(400, {"error": "Password must be at least 6 characters."})
            return
        if len(password) > 120:
            self.respond(400, {"error": "Password is too long."})
            return
        try:
            save_credentials(email, password)
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"ok": True, "token": issue_token()})

    def update_credentials(self):
        try:
            fields = self.read_json()
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        email = str(fields.get("email", "")).strip().lower()
        password = str(fields.get("password", ""))
        if not EMAIL_RE.match(email):
            self.respond(400, {"error": "Enter a valid email address."})
            return
        if len(password) < 6:
            self.respond(400, {"error": "Password must be at least 6 characters."})
            return
        if len(password) > 120:
            self.respond(400, {"error": "Password is too long."})
            return
        try:
            save_credentials(email, password)
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"ok": True})

    def read_site_file(self, name):
        try:
            resolved, path = resolve_site_file(name)
            with open(path, encoding="utf-8") as handle:
                content = handle.read()
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(
            200,
            {
                "path": resolved,
                "content": content,
                "bytes": len(content.encode("utf-8")),
                "group": file_group(resolved),
            },
        )

    def write_site_file(self, name):
        try:
            resolved, path = resolve_site_file(name)
            fields = self.read_json(MAX_FILE)
            content = fields.get("content")
            if not isinstance(content, str):
                raise ValueError("Send the full file as text.")
            content = content.replace("\r\n", "\n")
            encoded = content.encode("utf-8")
            if len(encoded) > MAX_FILE:
                raise ValueError("That file is too large for this desk.")
            temporary = path + ".tmp"
            with open(temporary, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(content)
            os.replace(temporary, path)
            if resolved == "journal.json":
                write_rss()
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"path": resolved, "bytes": len(encoded), "ok": True})

    def collection_loaders(self, collection):
        if collection == "blogs":
            return load_posts, save_posts
        if collection == "journal":
            return load_journal_posts, save_journal_posts
        raise ValueError("Unknown collection.")

    def create_collection_post(self, collection):
        try:
            load, save = self.collection_loaders(collection)
            fields = clean_post(self.read_json())
            posts = load()
            post = {
                "slug": unique_slug(fields["title"], posts),
                "title": fields["title"],
                "date": fields["date"],
                "excerpt": fields["excerpt"],
                "href": "",
                "body": fields["body"],
            }
            posts.append(post)
            save(posts)
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(201, {"post": post})

    def update_collection_post(self, collection, slug):
        try:
            load, save = self.collection_loaders(collection)
            posts = load()
            index = next((i for i, post in enumerate(posts) if post["slug"] == slug), None)
            if index is None:
                self.respond(404, {"error": "That post is no longer published."})
                return
            fields = clean_post(self.read_json(), posts[index])
            posts[index].update(
                {
                    "title": fields["title"],
                    "date": fields["date"],
                    "excerpt": fields["excerpt"],
                    "body": fields["body"],
                }
            )
            save(posts)
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"post": posts[index]})

    def delete_collection_post(self, collection, slug):
        try:
            load, save = self.collection_loaders(collection)
            posts = load()
            kept = [post for post in posts if post["slug"] != slug]
            if len(kept) == len(posts):
                self.respond(404, {"error": "That post is no longer published."})
                return
            save(kept)
        except (OSError, ValueError) as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"ok": True})


    def update_site_content(self):
        try:
            fields = clean_site_content(self.read_json(MAX_FILE))
            save_site_content(fields)
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"site": fields, "ok": True})

    def read_page(self, page_id):
        try:
            pages = load_pages()
            page = next((item for item in pages if item.get("id") == page_id), None)
            if page is None:
                self.respond(404, {"error": "That page is not on the desk."})
                return
        except (OSError, ValueError) as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"page": page})

    def update_page(self, page_id):
        try:
            pages = load_pages()
            index = next((i for i, item in enumerate(pages) if item.get("id") == page_id), None)
            if index is None:
                self.respond(404, {"error": "That page is not on the desk."})
                return
            pages[index] = clean_page(self.read_json(), pages[index])
            save_pages(pages)
            apply_page_seo(pages[index])
        except ValueError as error:
            self.respond(400, {"error": str(error)})
            return
        except OSError as error:
            self.respond(500, {"error": str(error)})
            return
        self.respond(200, {"page": pages[index]})

    def read_json(self, max_body=MAX_BODY):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > max_body:
            raise ValueError("The desk could not read that entry.")
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("The desk could not read that entry.")
        if not isinstance(data, dict):
            raise ValueError("The desk could not read that entry.")
        return data

    def respond(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def main():
    port = int(os.environ.get("PORT", "8782"))
    server = ThreadingHTTPServer(("127.0.0.1", port), SiteHandler)
    print(f"Site: http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
