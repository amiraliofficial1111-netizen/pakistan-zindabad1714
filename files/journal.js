(function initJournal() {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function escapeText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    const parts = String(iso).split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !part)) return iso;
    return `${parts[2]} ${MONTHS[parts[1] - 1]} ${parts[0]}`;
  }

  function postHref(post) {
    if (post.body && post.body.trim()) return `post.html?slug=${encodeURIComponent(post.slug)}`;
    return post.href || `post.html?slug=${encodeURIComponent(post.slug)}`;
  }

  function looksLikeHtml(text) {
    return /<\/?[a-z][\s\S]*>/i.test(String(text || "").trim());
  }

  function sanitizeHtml(html) {
    const documentNode = new DOMParser().parseFromString(String(html || ""), "text/html");
    documentNode.querySelectorAll("script, iframe, object, embed, link, meta, form").forEach((node) => node.remove());
    documentNode.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";
        if (name.startsWith("on") || ((name === "href" || name === "src") && /^\s*javascript:/i.test(value))) {
          node.removeAttribute(attr.name);
        }
      });
    });
    return documentNode.body.innerHTML;
  }

  function renderBody(text) {
    const raw = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!raw) return "";
    if (looksLikeHtml(raw)) return sanitizeHtml(raw);
    return raw
      .split(/\n{2,}/)
      .map((block) => {
        const line = block.trim();
        if (line.startsWith("## ")) return `<h2>${escapeText(line.slice(3))}</h2>`;
        const html = escapeText(line).replace(/\n/g, "<br>");
        return `<p>${html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
          if (!/^(https?:\/\/|[a-z0-9./_-]+\.html(?:\?[^)\s]*)?)$/i.test(url)) return match;
          return `<a href="${url}">${label}</a>`;
        })}</p>`;
      })
      .join("");
  }

  function card(post) {
    const article = document.createElement("article");
    article.className = "journal-card";
    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4.5 19.5h4.2L19 9.2 14.8 5 4.5 15.3v4.2Z"/><path d="m13.2 6.6 4.2 4.2"/></svg>';
    const time = document.createElement("time");
    time.dateTime = post.date;
    time.textContent = formatDate(post.date);
    const title = document.createElement("h3");
    title.textContent = post.title;
    const summary = document.createElement("p");
    summary.textContent = post.excerpt;
    const link = document.createElement("a");
    link.className = "text-link";
    link.href = postHref(post);
    link.textContent = "Read more";
    article.append(icon, time, title, summary, link);
    return article;
  }

  async function loadFile(file) {
    const response = await fetch(`${file}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`${file} unavailable`);
    const data = await response.json();
    return (data.posts || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function loadJournal() {
    return loadFile("journal.json");
  }

  function loadBlogs() {
    return loadFile("blogs.json");
  }

  window.SiteJournal = {
    load: loadJournal,
    loadJournal,
    loadBlogs,
    formatDate,
    postHref,
    renderBody,
    escapeText,
    card,
  };

  const grid = document.querySelector("[data-journal-grid]");
  const latest = document.querySelector("[data-journal-latest]");
  if (!grid && !latest) return;

  loadJournal()
    .then((posts) => {
      if (grid) grid.replaceChildren(...posts.map(card));
      if (latest && posts[0]) {
        latest.hidden = false;
        latest.textContent = "Latest: ";
        const link = document.createElement("a");
        link.href = postHref(posts[0]);
        link.textContent = posts[0].title;
        latest.append(link);
      }
    })
    .catch(() => {});
})();
