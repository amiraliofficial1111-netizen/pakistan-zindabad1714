(function applySiteContent() {
  const file = (window.location.pathname.split("/").pop() || "index.html") || "index.html";
  const pageFile = file.endsWith(".html") ? file : "index.html";
  const bust = "6";

  function escapeText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function setMeta(selector, value) {
    if (!value) return;
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  }

  function getPath(obj, path) {
    if (!obj || !path) return undefined;
    return String(path)
      .split(".")
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  function setTextContent(node, value) {
    if (node == null || value == null) return;
    const text = String(value);
    if (looksLikeHtml(text)) node.innerHTML = sanitizeHtml(text);
    else node.textContent = text;
  }

  function setLastTextNode(node, value) {
    if (!node || value == null) return;
    const text = String(value);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    let last = null;
    let current = walker.nextNode();
    while (current) {
      if (current.nodeValue && current.nodeValue.trim()) last = current;
      current = walker.nextNode();
    }
    if (last) last.nodeValue = text;
    else node.append(document.createTextNode(text));
  }

  function applyTheme(theme) {
    if (!theme || typeof theme !== "object") return;
    const root = document.documentElement;
    const map = {
      bg: "--bg",
      bg2: "--bg-2",
      surface: "--surface",
      ink: "--ink",
      muted: "--muted",
      faint: "--faint",
      line: "--line",
      gold: "--gold",
      goldDeep: "--gold-deep",
      parchment: "--parchment",
      inkDark: "--ink-dark",
    };
    Object.entries(map).forEach(([key, cssVar]) => {
      if (theme[key]) root.style.setProperty(cssVar, theme[key]);
    });
    if (theme.bg) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme.bg);
    }
  }

  function applyCmsBindings(site) {
    document.querySelectorAll("[data-cms]").forEach((node) => {
      const value = getPath(site, node.getAttribute("data-cms"));
      if (value == null) return;
      setTextContent(node, value);
    });

    document.querySelectorAll("[data-cms-text]").forEach((node) => {
      const value = getPath(site, node.getAttribute("data-cms-text"));
      if (value == null) return;
      setLastTextNode(node, value);
    });

    document.querySelectorAll("[data-cms-href]").forEach((node) => {
      const value = getPath(site, node.getAttribute("data-cms-href"));
      if (value == null || value === "") return;
      node.setAttribute("href", String(value));
    });

    document.querySelectorAll("[data-cms-src]").forEach((node) => {
      const value = getPath(site, node.getAttribute("data-cms-src"));
      if (value == null || value === "") return;
      node.setAttribute("src", String(value));
    });

    document.querySelectorAll("[data-cms-alt]").forEach((node) => {
      const value = getPath(site, node.getAttribute("data-cms-alt"));
      if (value == null) return;
      node.setAttribute("alt", String(value));
    });
  }

  function applyHeaderNav(site) {
    const nav = getPath(site, "global.header.nav");
    if (!Array.isArray(nav) || !nav.length) return;
    const navRoot = document.getElementById("navLinks");
    if (!navRoot) return;
    const cta = navRoot.querySelector(".nav-request");
    const current = pageFile;
    const links = nav
      .map((item) => {
        if (!item || !item.label || !item.href) return "";
        const active = item.href === current || (current === "index.html" && item.href === "index.html");
        return `<a href="${escapeText(item.href)}"${active ? ' class="active"' : ""}>${escapeText(item.label)}</a>`;
      })
      .join("");
    navRoot.innerHTML = links;
    if (cta) navRoot.append(cta);
    else {
      const label = getPath(site, "global.header.ctaLabel") || "Buy the book";
      const href = getPath(site, "global.header.ctaUrl") || getPath(site, "global.amazonUrl") || "#";
      const link = document.createElement("a");
      link.className = "nav-request";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("data-cms", "global.header.ctaLabel");
      link.setAttribute("data-cms-href", "global.header.ctaUrl");
      link.textContent = label;
      navRoot.append(link);
    }
  }

  function applyFooterMarks(site) {
    const marks = getPath(site, "global.footer.marks");
    if (!Array.isArray(marks) || !marks.length) return;
    document.querySelectorAll(".footer-marks").forEach((list) => {
      const items = list.querySelectorAll("li span");
      marks.forEach((mark, index) => {
        if (items[index]) items[index].textContent = mark;
      });
    });
  }

  function applyChapterSummaries(site) {
    const items = getPath(site, "chapters.items");
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      const card = document.getElementById(item.id || `chapter-${String(index + 1).padStart(2, "0")}`);
      if (!card) return;
      const summary = card.querySelector("details > p");
      if (summary && item.summary) summary.textContent = item.summary;
      const titleNode = card.querySelector("[data-cms^='chapters.items']");
      if (titleNode && item.title) titleNode.textContent = item.title;
      const num = card.querySelector("h3 span:first-child");
      if (num && item.number) num.textContent = item.number;
    });
  }

  function applyFaq(site) {
    const items = getPath(site, "home.faq.items");
    if (!Array.isArray(items) || !items.length) return;
    const list = document.querySelector("#home-faq .faq-list");
    if (!list) return;
    const existing = list.querySelectorAll(".faq-item");
    items.forEach((item, index) => {
      const node = existing[index];
      if (!node || !item) return;
      const q = node.querySelector("summary span:last-child");
      const a = node.querySelector("p");
      if (q && item.q) q.textContent = item.q;
      if (a && item.a) a.textContent = item.a;
    });
  }

  function applyTrustStrip(site) {
    const items = getPath(site, "home.trustStrip");
    if (!Array.isArray(items) || !items.length) return;
    const lists = document.querySelectorAll(".trust-strip ul");
    lists.forEach((list) => {
      const nodes = list.querySelectorAll("li");
      items.forEach((text, index) => {
        if (nodes[index]) nodes[index].textContent = text;
      });
    });
  }

  function applyHubBodies(site) {
    const cards = getPath(site, "home.hub.cards");
    if (!Array.isArray(cards)) return;
    document.querySelectorAll("#home-hub .hub-card").forEach((card, index) => {
      const data = cards[index];
      if (!data) return;
      const kicker = card.querySelector(".hub-kicker");
      const body = card.querySelector("h3 + p");
      const cta = card.querySelector(".btn");
      if (kicker && data.kicker) kicker.textContent = data.kicker;
      if (body && data.body) body.textContent = data.body;
      if (cta && data.cta) setLastTextNode(cta, data.cta);
      if (cta && data.href) cta.setAttribute("href", data.href);
    });
  }

  function applyPillarBodies(site) {
    const cards = getPath(site, "home.pillars.cards");
    if (!Array.isArray(cards)) return;
    document.querySelectorAll("#home-pillars .pillar-card").forEach((card, index) => {
      const data = cards[index];
      if (!data) return;
      const body = card.querySelector("h3 + p");
      const link = card.querySelector(".pillar-link");
      if (body && data.body) body.textContent = data.body;
      if (link && data.link) setLastTextNode(link, data.link);
      if (link && data.href) link.setAttribute("href", data.href);
    });
  }

  function applyTrailerMedia(site) {
    const screen = document.querySelector("[data-trailer]");
    const url = getPath(site, "home.trailer.videoUrl");
    if (screen && url) {
      screen.setAttribute("data-trailer-src", url);
      if (window.SiteTrailer) window.SiteTrailer.setSource(url);
    }
    const link = document.querySelector(".trailer-stage__link");
    const linkUrl = getPath(site, "home.trailer.linkUrl");
    const linkLabel = getPath(site, "home.trailer.linkLabel");
    if (link && linkUrl) link.setAttribute("href", linkUrl);
    if (link && linkLabel) link.textContent = linkLabel;
    const meta = document.querySelector(".trailer-stage__meta > p");
    const metaText = getPath(site, "home.trailer.meta");
    if (meta && metaText) meta.textContent = metaText;
  }

  function applyAuthorPage(site) {
    const bios = getPath(site, "author.bio");
    if (Array.isArray(bios)) {
      const paras = document.querySelectorAll("#author-bio-heading ~ p, .author-bio p, [aria-labelledby='author-bio-heading'] .book-why-copy p, section[aria-labelledby='author-bio-heading'] p");
      const targets = paras.length
        ? paras
        : document.querySelectorAll(".page-hero--author ~ .section .book-why-copy p");
      targets.forEach((node, index) => {
        if (bios[index]) node.textContent = bios[index];
      });
    }
  }

  function applyEditionPoints(site) {
    const points = getPath(site, "home.edition.points");
    if (!Array.isArray(points)) return;
    document.querySelectorAll(".edition-points li").forEach((node, index) => {
      if (!points[index]) return;
      const span = node.querySelector("span");
      const label = span ? span.textContent : "";
      node.textContent = "";
      if (span) {
        const mark = document.createElement("span");
        mark.textContent = label;
        node.append(mark, document.createTextNode(` ${points[index]}`));
      } else {
        node.textContent = points[index];
      }
    });
  }

  function applyAmazonLinks(site) {
    const url = getPath(site, "global.amazonUrl");
    if (!url) return;
    document.querySelectorAll('a[href*="a.co/"], a[href*="amazon."]').forEach((node) => {
      if (node.hasAttribute("data-cms-href")) return;
      node.setAttribute("href", url);
    });
  }

  function applyHeadingValue(heading, value) {
    if (!heading || value == null || value === "") return;
    if (looksLikeHtml(value)) {
      heading.innerHTML = sanitizeHtml(value);
      return;
    }
    if (heading.getAttribute("data-page-heading") === "home") {
      const parts = String(value).trim().split(/\s+of\s+/i);
      if (parts.length === 2) {
        heading.innerHTML = `${escapeText(parts[0])}<br><span>of ${escapeText(parts[1])}</span>`;
        return;
      }
    }
    heading.textContent = value;
  }

  function applyPageSeo(data) {
    const page = ((data && data.pages) || []).find((item) => item.file === pageFile);
    if (!page) return;

    if (page.title) document.title = page.title;

    const twitterTitle = page.title && page.title.includes("|")
      ? page.title.split("|")[0].trim()
      : page.title;

    const metaDescription = looksLikeHtml(page.description)
      ? sanitizeHtml(page.description).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : page.description;

    setMeta('meta[name="description"]', metaDescription);
    setMeta('meta[property="og:title"]', page.title);
    setMeta('meta[property="og:description"]', metaDescription);
    setMeta('meta[name="twitter:title"]', twitterTitle);
    setMeta('meta[name="twitter:description"]', metaDescription);

    applyHeadingValue(document.querySelector("[data-page-heading]"), page.heading);

    const lead = document.querySelector("[data-page-lead]");
    if (lead && page.lead) {
      if (looksLikeHtml(page.lead)) lead.innerHTML = sanitizeHtml(page.lead);
      else lead.textContent = page.lead;
    }
  }

  function applyHomeHeroCopy(site) {
    if (pageFile !== "index.html") return;
    const heading = getPath(site, "home.hero.heading");
    const lead = getPath(site, "home.hero.lead");
    const headingNode =
      document.querySelector("[data-page-heading]") || document.getElementById("home-hero-title");
    if (headingNode && heading) applyHeadingValue(headingNode, heading);
    const leadNode =
      document.querySelector("[data-page-lead]") || document.querySelector(".home-hero-lead");
    if (leadNode && lead) {
      if (looksLikeHtml(lead)) leadNode.innerHTML = sanitizeHtml(lead);
      else leadNode.textContent = lead;
    }
  }

  function applyChapterPaths(site) {
    const paths = getPath(site, "chapters.paths");
    if (!Array.isArray(paths)) return;
    document.querySelectorAll(".chapters-paths-grid .cred-card").forEach((card, index) => {
      const data = paths[index];
      if (!data) return;
      const title = card.querySelector("h3");
      const body = card.querySelector("p");
      if (title && data.title) {
        title.textContent = data.range ? `${data.title} (${data.range})` : data.title;
      }
      if (body && data.body) body.textContent = data.body;
    });
  }

  function applySummaryFacts(site) {
    const facts = getPath(site, "home.summary.facts");
    if (!Array.isArray(facts)) return;
    document.querySelectorAll("#home-summary .qa-facts > li").forEach((item, index) => {
      const data = facts[index];
      if (!data) return;
      const title = item.querySelector("strong");
      const copy = item.querySelector("span span, strong + *");
      if (title && data.title) {
        if (title.hasAttribute("data-cms")) title.textContent = data.title;
        else title.textContent = data.title;
      }
      // body is often text node after strong inside outer span
      const holder = item.querySelector("span:last-child") || item;
      if (data.body) {
        const strong = holder.querySelector("strong");
        Array.from(holder.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) node.nodeValue = data.body;
        });
        if (strong && !Array.from(holder.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim())) {
          strong.insertAdjacentText("afterend", data.body);
        }
      }
    });
  }

  function applyFooterChrome(site) {
    const copyright = getPath(site, "global.footer.copyright");
    document.querySelectorAll("[data-cms='global.footer.copyright']").forEach((node) => {
      if (copyright) node.textContent = copyright;
    });
    const ctaLabel = getPath(site, "global.footer.ctaLabel");
    const ctaUrl = getPath(site, "global.footer.ctaUrl");
    document.querySelectorAll(".footer-pro-buy, .footer-cta, a.footer-pro-cta, a.footer-write").forEach((node) => {
      if (ctaUrl) node.setAttribute("href", ctaUrl);
      if (ctaLabel) setLastTextNode(node, ctaLabel);
    });
  }

  function applySiteIdentity(site) {
    const siteName = getPath(site, "global.siteName");
    const authorName = getPath(site, "global.authorName");
    if (siteName) {
      document.querySelectorAll("a.brand").forEach((node) => {
        node.setAttribute("aria-label", `${siteName}, home`);
      });
    }
    if (authorName) {
      document.querySelectorAll("[data-cms='global.authorName']").forEach((node) => {
        node.textContent = authorName;
      });
    }
  }

  function applySite(site) {
    if (!site) return;
    window.SiteContent = site;
    applyTheme(site.theme);
    applyHeaderNav(site);
    applyCmsBindings(site);
    applyFooterMarks(site);
    applyFooterChrome(site);
    applySiteIdentity(site);
    applyTrustStrip(site);
    applyHubBodies(site);
    applyPillarBodies(site);
    applyTrailerMedia(site);
    applyEditionPoints(site);
    applyAuthorPage(site);
    applyChapterSummaries(site);
    applyChapterPaths(site);
    applyFaq(site);
    applySummaryFacts(site);
    applyHomeHeroCopy(site);
    applyAmazonLinks(site);
    if (window.SiteMusic) window.SiteMusic.mount(getPath(site, "music.choice"));
    document.dispatchEvent(new CustomEvent("sitecontent:ready", { detail: site }));
  }

  Promise.all([
    fetch(`site-content.json?v=${bust}`).then((response) => (response.ok ? response.json() : null)).catch(() => null),
    fetch(`pages.json?v=${bust}`).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  ]).then(([site, pages]) => {
    applyPageSeo(pages);
    applySite(site);
  });
})();
