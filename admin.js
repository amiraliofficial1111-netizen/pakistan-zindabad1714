(function initAdmin() {
  const loader = document.getElementById("siteLoader");
  if (loader) loader.classList.add("hidden");

  const gate = document.querySelector("[data-admin-gate]");
  const app = document.querySelector("[data-admin-app]");
  const loginForm = document.querySelector("[data-admin-login]");
  const loginError = document.querySelector("[data-login-error]");
  const logout = document.querySelector("[data-logout]");
  const menuButtons = Array.from(document.querySelectorAll("[data-menu]"));
  const accountForm = document.querySelector("[data-account-form]");
  const accountStatus = document.querySelector("[data-account-status]");

  const navList = document.querySelector("[data-nav-list]");
  const navDialog = document.querySelector("[data-nav-dialog]");
  const pageForm = document.querySelector("[data-page-form]");
  const pageFormTitle = document.querySelector("[data-page-form-title]");
  const pagePreview = document.querySelector("[data-page-preview]");
  const pageStatus = document.querySelector("[data-page-status]");
  const blogsIndex = document.querySelector("[data-blogs-index]");
  const blogsEditor = document.querySelector("[data-blogs-editor]");
  const blogsReader = document.querySelector("[data-blogs-reader]");
  const readerTitle = document.querySelector("[data-blog-read-title]");
  const readerLead = document.querySelector("[data-blog-read-lead]");
  const readerMeta = document.querySelector("[data-blog-read-meta]");
  const readerBody = document.querySelector("[data-blog-read-body]");
  const addBlog = document.querySelector("[data-add-blog]");
  const backBlogs = document.querySelector("[data-back-blogs]");
  const postForm = document.querySelector("[data-post-form]");
  const list = document.querySelector("[data-admin-list]");
  const status = document.querySelector("[data-admin-status]");
  const indexStatus = document.querySelector("[data-blogs-index-status]");
  const formTitle = document.querySelector("[data-form-title]");
  const cancel = document.querySelector("[data-cancel-edit]");
  const deskTitle = document.getElementById("desk-title");

  const cmsSavebar = document.querySelector("[data-cms-savebar]");
  const cmsStatus = document.querySelector("[data-cms-status]");
  const cmsSave = document.querySelector("[data-cms-save]");
  const cmsPreview = document.querySelector("[data-cms-preview]");

  const tokenKey = "desk-token";
  const blogsApi = "/api/blogs";
  const cmsMenus = new Set([
    "theme",
    "chrome",
    "home",
    "music",
    "books",
    "chapters",
    "author",
    "contact",
    "bookpage",
    "resources",
    "quiz",
    "reviews",
  ]);

  const previewMap = {
    overview: "index.html",
    theme: "index.html",
    chrome: "index.html",
    home: "index.html",
    music: "index.html",
    books: "books.html",
    chapters: "chapters.html",
    author: "author.html",
    contact: "contact.html",
    bookpage: "book.html",
    resources: "resources.html",
    quiz: "quiz.html",
    reviews: "reviews.html",
  };

  let pages = [];
  let site = null;
  let activePageId = "";
  let activeMenu = "blogs";
  let editing = "";
  let selectedBook = 0;
  let selectedChapter = 0;
  let selectedFaq = 0;
  let selectedHub = 0;

  function token() {
    return sessionStorage.getItem(tokenKey) || "";
  }

  async function api(path, options) {
    const headers = { "Content-Type": "application/json", ...(options && options.headers) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    let response;
    try {
      response = await fetch(path, { ...options, headers });
    } catch (error) {
      throw new Error("The desk can only save while this site is running on the local server.");
    }
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "/api/login") {
      sessionStorage.removeItem(tokenKey);
      showGate();
      throw new Error(data.error || "Open the desk again.");
    }
    if (!response.ok) throw new Error(data.error || "The desk could not complete that request.");
    return data;
  }

  function showGate() {
    document.body.classList.add("is-admin-locked");
    gate.hidden = false;
    app.hidden = true;
    if (deskTitle) deskTitle.textContent = "Website manager";
  }

  function showApp() {
    document.body.classList.remove("is-admin-locked");
    gate.hidden = true;
    app.hidden = false;
    if (deskTitle) deskTitle.textContent = "Website manager";
    return setMenu("blogs");
  }

  function getPath(obj, path) {
    return String(path || "")
      .split(".")
      .filter(Boolean)
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  function setPath(obj, path, value) {
    const parts = String(path || "").split(".").filter(Boolean);
    if (!parts.length) return obj;
    let cursor = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      const next = parts[i + 1];
      if (cursor[key] == null || typeof cursor[key] !== "object") {
        cursor[key] = /^\d+$/.test(next) ? [] : {};
      }
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
    return obj;
  }

  function field(path, label, type, help) {
    return { path, label, type: type || "text", help: help || "" };
  }

  function group(title, help, fields) {
    return { title, help: help || "", fields };
  }

  const schemas = {
    theme: {
      title: "Colors & theme",
      help: "These colors shape the whole website. Stick close to the gold-on-navy look unless you mean to rebrand.",
      groups: [
        group("Brand colors", "", [
          field("theme.bg", "Page background", "color"),
          field("theme.bg2", "Secondary background", "color"),
          field("theme.ink", "Main text", "color"),
          field("theme.muted", "Secondary text", "color"),
          field("theme.faint", "Quiet labels", "color"),
          field("theme.gold", "Gold accent", "color"),
          field("theme.goldDeep", "Deep gold", "color"),
          field("theme.parchment", "Parchment accent", "color"),
          field("theme.inkDark", "Text on gold buttons", "color"),
          field("theme.line", "Border color", "text", "Can be rgba(...)"),
          field("theme.surface", "Panel surface", "text", "Can be rgba(...)"),
        ]),
      ],
    },
    chrome: {
      title: "Header & footer",
      help: "Site-wide brand, navigation labels, Amazon button, and footer copy.",
      groups: [
        group("Site identity", "", [
          field("global.siteName", "Site name", "text"),
          field("global.authorName", "Author name", "text"),
          field("global.amazonUrl", "Amazon book URL", "url"),
        ]),
        group("Header", "", [
          field("global.header.brand", "Brand text in header", "text"),
          field("global.header.ctaLabel", "Header button label", "text"),
          field("global.header.ctaUrl", "Header button link", "url"),
        ]),
        group("Navigation labels", "Change the words visitors see in the menu.", [
          field("global.header.nav.0.label", "Link 1 label", "text"),
          field("global.header.nav.0.href", "Link 1 page", "text"),
          field("global.header.nav.1.label", "Link 2 label", "text"),
          field("global.header.nav.1.href", "Link 2 page", "text"),
          field("global.header.nav.2.label", "Link 3 label", "text"),
          field("global.header.nav.2.href", "Link 3 page", "text"),
          field("global.header.nav.3.label", "Link 4 label", "text"),
          field("global.header.nav.3.href", "Link 4 page", "text"),
          field("global.header.nav.4.label", "Link 5 label", "text"),
          field("global.header.nav.4.href", "Link 5 page", "text"),
          field("global.header.nav.5.label", "Link 6 label", "text"),
          field("global.header.nav.5.href", "Link 6 page", "text"),
          field("global.header.nav.6.label", "Link 7 label", "text"),
          field("global.header.nav.6.href", "Link 7 page", "text"),
          field("global.header.nav.7.label", "Link 8 label", "text"),
          field("global.header.nav.7.href", "Link 8 page", "text"),
          field("global.header.nav.8.label", "Link 9 label", "text"),
          field("global.header.nav.8.href", "Link 9 page", "text"),
        ]),
        group("Footer", "", [
          field("global.footer.title", "Footer title", "text"),
          field("global.footer.tagline", "Footer tagline", "text"),
          field("global.footer.description", "Footer description", "textarea"),
          field("global.footer.marks.0", "Mark 1", "text"),
          field("global.footer.marks.1", "Mark 2", "text"),
          field("global.footer.marks.2", "Mark 3", "text"),
          field("global.footer.ctaLabel", "Footer button label", "text"),
          field("global.footer.ctaUrl", "Footer button link", "url"),
          field("global.footer.copyright", "Copyright line", "text"),
        ]),
      ],
    },
    home: {
      title: "Home page",
      help: "Every major home section, starting with the hero.",
      groups: [
        group("Hero", "The first screen visitors see.", [
          field("home.hero.kicker", "Kicker", "text"),
          field("home.hero.author", "Author line", "text"),
          field("home.hero.heading", "Main heading", "text", "Also editable under SEO Settings for rich formatting."),
          field("home.hero.lead", "Lead paragraph", "textarea"),
          field("home.hero.primaryCta.label", "Primary button label", "text"),
          field("home.hero.primaryCta.href", "Primary button link", "url"),
          field("home.hero.secondaryCta.label", "Second button label", "text"),
          field("home.hero.secondaryCta.href", "Second button link", "text"),
          field("home.hero.tertiaryCta.label", "Third button label", "text"),
          field("home.hero.tertiaryCta.href", "Third button link", "text"),
          field("home.hero.stats.0.num", "Stat 1 number", "text"),
          field("home.hero.stats.0.label", "Stat 1 label", "text"),
          field("home.hero.stats.1.num", "Stat 2 number", "text"),
          field("home.hero.stats.1.label", "Stat 2 label", "text"),
          field("home.hero.stats.2.num", "Stat 3 number", "text"),
          field("home.hero.stats.2.label", "Stat 3 label", "text"),
          field("home.hero.signoff", "Sign-off quote", "text"),
          field("home.hero.image", "Hero image path", "text"),
          field("home.hero.imageAlt", "Hero image description", "text"),
        ]),
        group("Trust strip", "The scrolling line under the hero.", [
          field("home.trustStrip.0", "Item 1", "text"),
          field("home.trustStrip.1", "Item 2", "text"),
          field("home.trustStrip.2", "Item 3", "text"),
          field("home.trustStrip.3", "Item 4", "text"),
          field("home.trustStrip.4", "Item 5", "text"),
          field("home.trustStrip.5", "Item 6", "text"),
        ]),
        group("Trailer", "", [
          field("home.trailer.kicker", "Kicker", "text"),
          field("home.trailer.heading", "Heading", "text"),
          field("home.trailer.intro", "Intro", "textarea"),
          field("home.trailer.videoUrl", "Video embed URL", "url"),
          field("home.trailer.meta", "Video caption", "text"),
          field("home.trailer.linkLabel", "Fullscreen link label", "text"),
          field("home.trailer.linkUrl", "Fullscreen link URL", "url"),
        ]),
        group("Edition band", "", [
          field("home.edition.kicker", "Kicker", "text"),
          field("home.edition.heading", "Heading", "text"),
          field("home.edition.body", "Body", "textarea"),
          field("home.edition.points.0", "Point 1", "text"),
          field("home.edition.points.1", "Point 2", "text"),
          field("home.edition.points.2", "Point 3", "text"),
          field("home.edition.primaryCta.label", "Primary button", "text"),
          field("home.edition.primaryCta.href", "Primary button link", "url"),
          field("home.edition.secondaryCta.label", "Secondary button", "text"),
          field("home.edition.secondaryCta.href", "Secondary button link", "text"),
        ]),
        group("Principles", "", [
          field("home.principles.0", "Principle 1", "text"),
          field("home.principles.1", "Principle 2", "text"),
          field("home.principles.2", "Principle 3", "text"),
        ]),
        group("Hub section", "", [
          field("home.hub.heading", "Heading", "text"),
          field("home.hub.intro", "Intro", "textarea"),
          field("home.hub.cards.0.kicker", "Card 1 kicker", "text"),
          field("home.hub.cards.0.title", "Card 1 title", "text"),
          field("home.hub.cards.0.body", "Card 1 body", "textarea"),
          field("home.hub.cards.0.cta", "Card 1 button", "text"),
          field("home.hub.cards.0.href", "Card 1 link", "text"),
          field("home.hub.cards.1.kicker", "Card 2 kicker", "text"),
          field("home.hub.cards.1.title", "Card 2 title", "text"),
          field("home.hub.cards.1.body", "Card 2 body", "textarea"),
          field("home.hub.cards.1.cta", "Card 2 button", "text"),
          field("home.hub.cards.1.href", "Card 2 link", "text"),
          field("home.hub.cards.2.kicker", "Card 3 kicker", "text"),
          field("home.hub.cards.2.title", "Card 3 title", "text"),
          field("home.hub.cards.2.body", "Card 3 body", "textarea"),
          field("home.hub.cards.2.cta", "Card 3 button", "text"),
          field("home.hub.cards.2.href", "Card 3 link", "text"),
        ]),
        group("Snapshot", "", [
          field("home.snapshot.heading", "Heading", "text"),
          field("home.snapshot.kicker", "Kicker", "text"),
          field("home.snapshot.quoteBadge", "Quote badge", "text"),
          field("home.snapshot.quote", "Quote", "textarea"),
          field("home.snapshot.quoteBy", "Quote attribution", "text"),
        ]),
        group("Pillars", "", [
          field("home.pillars.heading", "Heading", "text"),
          field("home.pillars.intro", "Intro", "textarea"),
          field("home.pillars.cards.0.title", "Pillar 1 title", "text"),
          field("home.pillars.cards.0.body", "Pillar 1 body", "textarea"),
          field("home.pillars.cards.0.link", "Pillar 1 link label", "text"),
          field("home.pillars.cards.0.href", "Pillar 1 link", "text"),
          field("home.pillars.cards.1.title", "Pillar 2 title", "text"),
          field("home.pillars.cards.1.body", "Pillar 2 body", "textarea"),
          field("home.pillars.cards.1.link", "Pillar 2 link label", "text"),
          field("home.pillars.cards.1.href", "Pillar 2 link", "text"),
          field("home.pillars.cards.2.title", "Pillar 3 title", "text"),
          field("home.pillars.cards.2.body", "Pillar 3 body", "textarea"),
          field("home.pillars.cards.2.link", "Pillar 3 link label", "text"),
          field("home.pillars.cards.2.href", "Pillar 3 link", "text"),
        ]),
        group("Author quote band", "", [
          field("home.quote.text", "Quote", "text"),
          field("home.quote.cite", "Citation", "text"),
        ]),
        group("Journey", "", [
          field("home.journey.heading", "Heading", "text"),
          field("home.journey.intro", "Intro", "textarea"),
          field("home.journey.cards.0.kicker", "Card 1 kicker", "text"),
          field("home.journey.cards.0.title", "Card 1 title", "text"),
          field("home.journey.cards.0.body", "Card 1 body", "textarea"),
          field("home.journey.cards.0.link", "Card 1 link label", "text"),
          field("home.journey.cards.0.href", "Card 1 link", "text"),
          field("home.journey.cards.1.kicker", "Card 2 kicker", "text"),
          field("home.journey.cards.1.title", "Card 2 title", "text"),
          field("home.journey.cards.1.body", "Card 2 body", "textarea"),
          field("home.journey.cards.1.link", "Card 2 link label", "text"),
          field("home.journey.cards.1.href", "Card 2 link", "text"),
        ]),
        group("Featured chapters", "", [
          field("home.featuredChapters.heading", "Heading", "text"),
          field("home.featuredChapters.intro", "Intro", "textarea"),
          field("home.featuredChapters.quizLink", "Quiz link label", "text"),
          field("home.featuredChapters.allLink", "All chapters link label", "text"),
        ]),
        group("Resources band", "", [
          field("home.resources.heading", "Heading", "text"),
          field("home.resources.intro", "Intro", "textarea"),
          field("home.resources.cards.0.kicker", "Card 1 kicker", "text"),
          field("home.resources.cards.0.title", "Card 1 title", "text"),
          field("home.resources.cards.0.body", "Card 1 body", "textarea"),
          field("home.resources.cards.0.link", "Card 1 link label", "text"),
          field("home.resources.cards.0.href", "Card 1 link", "text"),
          field("home.resources.cards.0.image", "Card 1 image", "text"),
          field("home.resources.cards.1.kicker", "Card 2 kicker", "text"),
          field("home.resources.cards.1.title", "Card 2 title", "text"),
          field("home.resources.cards.1.body", "Card 2 body", "textarea"),
          field("home.resources.cards.1.link", "Card 2 link label", "text"),
          field("home.resources.cards.1.href", "Card 2 link", "text"),
          field("home.resources.cards.1.image", "Card 2 image", "text"),
        ]),
        group("Audience", "", [
          field("home.audience.heading", "Heading", "text"),
          field("home.audience.intro", "Intro", "textarea"),
        ]),
        group("Summary bar", "", [
          field("home.summary.heading", "Heading", "text"),
          field("home.summary.intro", "Intro", "textarea"),
          field("home.summary.facts.0.title", "Fact 1 title", "text"),
          field("home.summary.facts.0.body", "Fact 1 body", "text"),
          field("home.summary.facts.1.title", "Fact 2 title", "text"),
          field("home.summary.facts.1.body", "Fact 2 body", "text"),
          field("home.summary.facts.2.title", "Fact 3 title", "text"),
          field("home.summary.facts.2.body", "Fact 3 body", "text"),
        ]),
        group("FAQ", "Pick a question below, then edit it.", [
          field("home.faq.heading", "Heading", "text"),
          field("home.faq.intro", "Intro", "textarea"),
        ]),
        group("Final call to action", "", [
          field("home.cta.heading", "Heading", "text"),
          field("home.cta.body", "Body", "textarea"),
          field("home.cta.buttons.0.label", "Button 1 label", "text"),
          field("home.cta.buttons.0.href", "Button 1 link", "url"),
          field("home.cta.buttons.1.label", "Button 2 label", "text"),
          field("home.cta.buttons.1.href", "Button 2 link", "text"),
          field("home.cta.buttons.2.label", "Button 3 label", "text"),
          field("home.cta.buttons.2.href", "Button 3 link", "text"),
        ]),
      ],
    },
    author: {
      title: "Author page",
      help: "Biography, spotlight, and speaking themes.",
      groups: [
        group("Photo", "", [
          field("author.photo", "Photo path", "text"),
          field("author.photoAlt", "Photo description", "text"),
        ]),
        group("Biography paragraphs", "", [
          field("author.bio.0", "Paragraph 1", "textarea"),
          field("author.bio.1", "Paragraph 2", "textarea"),
          field("author.bio.2", "Paragraph 3", "textarea"),
        ]),
        group("Book spotlight", "", [
          field("author.spotlight.eyebrow", "Eyebrow", "text"),
          field("author.spotlight.title", "Title", "text"),
          field("author.spotlight.lead", "Lead", "textarea"),
          field("author.spotlight.bullets.0", "Bullet 1", "text"),
          field("author.spotlight.bullets.1", "Bullet 2", "text"),
          field("author.spotlight.bullets.2", "Bullet 3", "text"),
          field("author.spotlight.primaryCta.label", "Primary button", "text"),
          field("author.spotlight.primaryCta.href", "Primary button link", "url"),
          field("author.spotlight.secondaryCta.label", "Secondary button", "text"),
          field("author.spotlight.secondaryCta.href", "Secondary button link", "text"),
        ]),
        group("CTA note & themes", "", [
          field("author.ctaNote", "Gold band note", "textarea"),
          field("author.themes.0.title", "Theme 1 title", "text"),
          field("author.themes.0.body", "Theme 1 body", "textarea"),
          field("author.themes.1.title", "Theme 2 title", "text"),
          field("author.themes.1.body", "Theme 2 body", "textarea"),
          field("author.themes.2.title", "Theme 3 title", "text"),
          field("author.themes.2.body", "Theme 3 body", "textarea"),
        ]),
      ],
    },
    contact: {
      title: "Contact page",
      help: "Form headings, help list, and newsletter copy.",
      groups: [
        group("Contact form", "", [
          field("contact.formHeading", "Form heading", "text"),
          field("contact.formLead", "Form lead", "textarea"),
          field("contact.submitLabel", "Submit button", "text"),
        ]),
        group("Help aside", "", [
          field("contact.helpHeading", "Help heading", "text"),
          field("contact.helpItems.0", "Help item 1", "text"),
          field("contact.helpItems.1", "Help item 2", "text"),
          field("contact.helpItems.2", "Help item 3", "text"),
          field("contact.helpHint", "Help hint", "textarea"),
        ]),
        group("Newsletter", "", [
          field("contact.newsletterHeading", "Newsletter heading", "text"),
          field("contact.newsletterBody", "Newsletter body", "textarea"),
          field("contact.subscribeLabel", "Subscribe button", "text"),
        ]),
      ],
    },
    bookpage: {
      title: "Book overview",
      help: "The dedicated page for The Constitution of God.",
      groups: [
        group("Hero", "", [
          field("bookPage.heading", "Heading", "text"),
          field("bookPage.lead", "Lead", "textarea"),
        ]),
        group("Edition & why", "", [
          field("bookPage.editionHeading", "Edition heading", "text"),
          field("bookPage.editionPoints.0", "Point 1", "text"),
          field("bookPage.editionPoints.1", "Point 2", "text"),
          field("bookPage.editionPoints.2", "Point 3", "text"),
          field("bookPage.whyHeading", "Why heading", "text"),
          field("bookPage.whyBody.0", "Why paragraph 1", "textarea"),
          field("bookPage.whyBody.1", "Why paragraph 2", "textarea"),
        ]),
      ],
    },
    resources: {
      title: "Resources page",
      help: "Hero and section headings for study aids.",
      groups: [
        group("Page copy", "", [
          field("resources.heading", "Heading", "text"),
          field("resources.lead", "Lead", "textarea"),
          field("resources.pressHeading", "Press section heading", "text"),
          field("resources.pressIntro", "Press intro", "textarea"),
          field("resources.overviewHeading", "Reference heading", "text"),
          field("resources.principlesHeading", "Principles heading", "text"),
          field("resources.workflowHeading", "Workflow heading", "text"),
        ]),
      ],
    },
    quiz: {
      title: "Reader quiz",
      help: "Hero and intro copy for the quiz page. Question logic stays in the quiz script.",
      groups: [
        group("Quiz intro", "", [
          field("quiz.heading", "Page heading", "text"),
          field("quiz.lead", "Page lead", "textarea"),
          field("quiz.introKicker", "Intro kicker", "text"),
          field("quiz.introHeading", "Intro heading", "text"),
          field("quiz.introBody", "Intro body", "textarea"),
          field("quiz.startLabel", "Start button", "text"),
          field("quiz.skipLabel", "Skip button", "text"),
        ]),
      ],
    },
    reviews: {
      title: "Reviews",
      help: "Titles and kickers for the three editorial reviews.",
      groups: [
        group("Review cards", "", [
          field("reviews.cards.0.kicker", "Review 1 kicker", "text"),
          field("reviews.cards.0.title", "Review 1 title", "text"),
          field("reviews.cards.1.kicker", "Review 2 kicker", "text"),
          field("reviews.cards.1.title", "Review 2 title", "text"),
          field("reviews.cards.2.kicker", "Review 3 kicker", "text"),
          field("reviews.cards.2.title", "Review 3 title", "text"),
        ]),
      ],
    },
  };

  function setCmsStatus(message) {
    if (cmsStatus) cmsStatus.textContent = message || "";
  }

  async function loadSite() {
    const data = await api("/api/site");
    site = data.site || null;
    return site;
  }

  async function saveSite() {
    if (!site) throw new Error("Site content is not loaded yet.");
    setCmsStatus("Saving…");
    const data = await api("/api/site", { method: "PUT", body: JSON.stringify(site) });
    site = data.site || site;
    setCmsStatus("Saved. Open the live page to confirm.");
    return site;
  }

  function makeInput(spec) {
    const wrap = document.createElement("label");
    wrap.className = "admin-field";
    const title = document.createElement("span");
    title.className = "admin-field__label";
    title.textContent = spec.label;
    wrap.append(title);
    if (spec.help) {
      const help = document.createElement("span");
      help.className = "admin-field__help";
      help.textContent = spec.help;
      wrap.append(help);
    }

    let input;
    const value = getPath(site, spec.path);
    if (spec.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
      input.value = value == null ? "" : String(value);
    } else if (spec.type === "color") {
      input = document.createElement("input");
      input.type = "color";
      const raw = String(value || "#07091a");
      input.value = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "#07091a";
      const text = document.createElement("input");
      text.type = "text";
      text.className = "admin-field__color-text";
      text.value = String(value || "");
      text.addEventListener("input", () => {
        setPath(site, spec.path, text.value);
        if (/^#[0-9a-fA-F]{6}$/.test(text.value)) input.value = text.value;
      });
      input.addEventListener("input", () => {
        text.value = input.value;
        setPath(site, spec.path, input.value);
      });
      wrap.append(input, text);
      return wrap;
    } else {
      input = document.createElement("input");
      input.type = spec.type === "url" ? "url" : "text";
      input.value = value == null ? "" : String(value);
    }
    input.addEventListener("input", () => setPath(site, spec.path, input.value));
    wrap.append(input);
    return wrap;
  }

  function renderSchema(root, key) {
    const schema = schemas[key];
    root.replaceChildren();
    if (!schema || !site) {
      root.textContent = "Could not load this section.";
      return;
    }
    const head = document.createElement("div");
    head.className = "admin-desk__head";
    head.innerHTML = `<div><p class="admin-desk__eyebrow">Customize</p><h2></h2></div>`;
    head.querySelector("h2").textContent = schema.title;
    root.append(head);
    if (schema.help) {
      const lead = document.createElement("p");
      lead.className = "admin-cms__lead";
      lead.textContent = schema.help;
      root.append(lead);
    }
    schema.groups.forEach((block) => {
      const section = document.createElement("section");
      section.className = "admin-cms__group";
      const h = document.createElement("h3");
      h.textContent = block.title;
      section.append(h);
      if (block.help) {
        const p = document.createElement("p");
        p.className = "admin-field__help";
        p.textContent = block.help;
        section.append(p);
      }
      const grid = document.createElement("div");
      grid.className = "admin-cms__fields";
      block.fields.forEach((spec) => grid.append(makeInput(spec)));
      section.append(grid);
      root.append(section);
    });

    if (key === "home") renderFaqPicker(root);
  }

  function renderFaqPicker(root) {
    const items = getPath(site, "home.faq.items") || [];
    const section = document.createElement("section");
    section.className = "admin-cms__group";
    section.innerHTML = "<h3>FAQ questions</h3>";
    const picker = document.createElement("div");
    picker.className = "admin-picker";
    items.forEach((item, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-picker__btn" + (index === selectedFaq ? " is-active" : "");
      btn.textContent = `${String(index + 1).padStart(2, "0")}. ${(item && item.q) || "Question"}`;
      btn.addEventListener("click", () => {
        selectedFaq = index;
        renderCmsPanel("home");
      });
      picker.append(btn);
    });
    section.append(picker);
    const fields = document.createElement("div");
    fields.className = "admin-cms__fields";
    fields.append(
      makeInput(field(`home.faq.items.${selectedFaq}.q`, "Question", "text")),
      makeInput(field(`home.faq.items.${selectedFaq}.a`, "Answer", "textarea"))
    );
    section.append(fields);
    root.append(section);
  }

  function renderBooks(root) {
    root.replaceChildren();
    const head = document.createElement("div");
    head.className = "admin-desk__head";
    head.innerHTML = `<div><p class="admin-desk__eyebrow">Catalog</p><h2>Books catalog</h2></div>`;
    const tools = document.createElement("div");
    tools.className = "admin-desk__tools";
    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-primary";
    add.textContent = "Add book";
    add.addEventListener("click", () => {
      if (!Array.isArray(site.books)) site.books = [];
      site.books.push({
        id: `book-${Date.now()}`,
        title: "New book",
        subtitle: "",
        edition: "Author edition",
        year: "2026",
        author: getPath(site, "global.authorName") || "Mark H Steffen",
        status: "Forthcoming",
        summary: "",
        href: "contact.html",
        cta: "Request a copy",
        cover: "assets/constitution-standing.webp?v=4",
        featured: false,
      });
      selectedBook = site.books.length - 1;
      renderCmsPanel("books");
    });
    tools.append(add);
    head.append(tools);
    root.append(head);

    const lead = document.createElement("p");
    lead.className = "admin-cms__lead";
    lead.textContent = "Each book appears on the Books page. Cover paths should point to files in the assets folder.";
    root.append(lead);

    const books = Array.isArray(site.books) ? site.books : [];
    if (!books.length) {
      root.append(document.createTextNode("No books yet."));
      return;
    }
    if (selectedBook >= books.length) selectedBook = 0;

    const picker = document.createElement("div");
    picker.className = "admin-picker";
    books.forEach((book, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-picker__btn" + (index === selectedBook ? " is-active" : "");
      btn.textContent = book.title || `Book ${index + 1}`;
      btn.addEventListener("click", () => {
        selectedBook = index;
        renderCmsPanel("books");
      });
      picker.append(btn);
    });
    root.append(picker);

    const i = selectedBook;
    const fields = document.createElement("div");
    fields.className = "admin-cms__fields";
    [
      field(`books.${i}.id`, "ID (unique, no spaces)", "text"),
      field(`books.${i}.title`, "Title", "text"),
      field(`books.${i}.subtitle`, "Subtitle", "text"),
      field(`books.${i}.edition`, "Edition", "text"),
      field(`books.${i}.year`, "Year", "text"),
      field(`books.${i}.author`, "Author", "text"),
      field(`books.${i}.status`, "Status", "text", "In print or Forthcoming"),
      field(`books.${i}.summary`, "Summary", "textarea"),
      field(`books.${i}.href`, "Detail page link", "text"),
      field(`books.${i}.cta`, "Detail button label", "text"),
      field(`books.${i}.buy`, "Buy URL (optional)", "url"),
      field(`books.${i}.buyLabel`, "Buy button label", "text"),
      field(`books.${i}.cover`, "Cover image path", "text"),
    ].forEach((spec) => fields.append(makeInput(spec)));

    const featuredWrap = document.createElement("label");
    featuredWrap.className = "admin-field admin-field--check";
    const featured = document.createElement("input");
    featured.type = "checkbox";
    featured.checked = Boolean(books[i].featured);
    featured.addEventListener("change", () => {
      site.books.forEach((book, index) => {
        book.featured = index === i ? featured.checked : false;
      });
    });
    featuredWrap.append(featured, document.createTextNode(" Featured book (opens first)"));
    fields.append(featuredWrap);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-action admin-action--danger";
    remove.textContent = "Delete this book";
    remove.addEventListener("click", () => {
      if (!window.confirm(`Delete “${books[i].title}”?`)) return;
      site.books.splice(i, 1);
      selectedBook = 0;
      renderCmsPanel("books");
    });
    root.append(fields, remove);
  }

  function renderChapters(root) {
    root.replaceChildren();
    const head = document.createElement("div");
    head.className = "admin-desk__head";
    head.innerHTML = `<div><p class="admin-desk__eyebrow">Manuscript</p><h2>Chapters</h2></div>`;
    root.append(head);
    const lead = document.createElement("p");
    lead.className = "admin-cms__lead";
    lead.textContent = "Edit titles and summaries for all fourteen chapters, plus the reading-path section.";
    root.append(lead);

    const paths = document.createElement("section");
    paths.className = "admin-cms__group";
    paths.innerHTML = "<h3>Reading paths</h3>";
    const pathFields = document.createElement("div");
    pathFields.className = "admin-cms__fields";
    [
      field("chapters.pathsHeading", "Paths heading", "text"),
      field("chapters.pathsIntro", "Paths intro", "textarea"),
      field("chapters.paths.0.title", "Path 1 title", "text"),
      field("chapters.paths.0.range", "Path 1 range", "text"),
      field("chapters.paths.0.body", "Path 1 body", "textarea"),
      field("chapters.paths.1.title", "Path 2 title", "text"),
      field("chapters.paths.1.range", "Path 2 range", "text"),
      field("chapters.paths.1.body", "Path 2 body", "textarea"),
      field("chapters.paths.2.title", "Path 3 title", "text"),
      field("chapters.paths.2.range", "Path 3 range", "text"),
      field("chapters.paths.2.body", "Path 3 body", "textarea"),
    ].forEach((spec) => pathFields.append(makeInput(spec)));
    paths.append(pathFields);
    root.append(paths);

    const items = getPath(site, "chapters.items") || [];
    if (selectedChapter >= items.length) selectedChapter = 0;
    const picker = document.createElement("div");
    picker.className = "admin-picker";
    items.forEach((item, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-picker__btn" + (index === selectedChapter ? " is-active" : "");
      btn.textContent = `${item.number || index + 1}. ${item.title || "Chapter"}`;
      btn.addEventListener("click", () => {
        selectedChapter = index;
        renderCmsPanel("chapters");
      });
      picker.append(btn);
    });
    root.append(picker);

    const i = selectedChapter;
    const fields = document.createElement("div");
    fields.className = "admin-cms__fields";
    [
      field(`chapters.items.${i}.number`, "Number", "text"),
      field(`chapters.items.${i}.title`, "Title", "text"),
      field(`chapters.items.${i}.summary`, "Summary", "textarea"),
    ].forEach((spec) => fields.append(makeInput(spec)));
    root.append(fields);
  }

  function renderCmsPanel(key) {
    const root = document.querySelector(`[data-cms-root="${key}"]`);
    if (!root || !site) return;
    if (key === "books") return renderBooks(root);
    if (key === "chapters") return renderChapters(root);
    if (key === "music") return renderMusic(root);
    return renderSchema(root, key);
  }

  function renderMusic(root) {
    if (!site.music || typeof site.music !== "object") site.music = { choice: "off" };
    const options = (window.SiteMusic && window.SiteMusic.options) || [];
    const current = site.music.choice || "off";
    root.replaceChildren();

    const head = document.createElement("div");
    head.className = "admin-desk__head";
    head.innerHTML = '<div><p class="admin-desk__eyebrow">Customize</p><h2>Site music</h2></div>';
    root.append(head);

    const lead = document.createElement("p");
    lead.className = "admin-cms__lead";
    lead.textContent = current === "off"
      ? "The corner player is hidden. Homepage narration and music samples stay available."
      : "Visitors start this song with Play Music. It does not start by itself, and it keeps its place between pages.";
    root.append(lead);

    const list = document.createElement("div");
    list.className = "music-choices";
    const preview = document.createElement("audio");
    preview.preload = "none";

    const paintPlaying = (src) => {
      list.querySelectorAll(".music-choice__play").forEach((button) => {
        const playing = src && button.dataset.src === src && !preview.paused;
        button.classList.toggle("is-playing", playing);
        button.textContent = playing ? "Pause sample" : "Play sample";
      });
    };

    preview.addEventListener("play", () => paintPlaying(preview.getAttribute("src")));
    preview.addEventListener("pause", () => paintPlaying(""));
    preview.addEventListener("ended", () => paintPlaying(""));

    options.forEach((option) => {
      const card = document.createElement("label");
      card.className = "music-choice" + (option.id === current ? " is-active" : "");

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "music-choice";
      radio.value = option.id;
      radio.checked = option.id === current;
      radio.addEventListener("change", () => {
        site.music.choice = option.id;
        list.querySelectorAll(".music-choice").forEach((node) => {
          node.classList.toggle("is-active", node.contains(radio) && radio.checked);
        });
      });

      const copy = document.createElement("span");
      copy.className = "music-choice__copy";
      const title = document.createElement("span");
      title.className = "music-choice__title";
      title.textContent = option.title;
      const note = document.createElement("span");
      note.className = "music-choice__note";
      note.textContent = option.note || "";
      copy.append(title, note);
      card.append(radio, copy);

      if (option.src) {
        const play = document.createElement("button");
        play.type = "button";
        play.className = "music-choice__play";
        play.dataset.src = option.src;
        play.textContent = "Play sample";
        play.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (preview.getAttribute("src") === option.src && !preview.paused) {
            preview.pause();
            return;
          }
          preview.src = option.src;
          preview.play().catch(() => paintPlaying(""));
        });
        card.append(play);
      }
      list.append(card);
    });

    root.append(list, preview);
  }

  function setMenu(name) {
    activeMenu = name;
    if (name !== "seo") closeNavDialog();
    menuButtons.forEach((button) => {
      const active = button.dataset.menu === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-panel") !== name;
      if (name !== "music") {
        panel.querySelectorAll("audio").forEach((node) => node.pause());
      }
    });

    const showSave = cmsMenus.has(name);
    if (cmsSavebar) cmsSavebar.hidden = !showSave;
    if (cmsPreview) cmsPreview.href = previewMap[name] || "index.html";

    if (name === "overview") {
      setCmsStatus("");
      return Promise.resolve();
    }
    if (name === "blogs") {
      showBlogsIndex();
      return refreshBlogs();
    }
    if (name === "account") {
      if (accountStatus) accountStatus.textContent = "";
      return Promise.resolve();
    }
    if (name === "seo") {
      return refreshPages().then(() => {
        const first = pages[0];
        if (first) return openSeoPage(first.id);
      }).then(() => openNavDialog());
    }
    if (cmsMenus.has(name)) {
      const ensure = site ? Promise.resolve(site) : loadSite();
      return ensure
        .then(() => {
          renderCmsPanel(name);
          setCmsStatus("");
        })
        .catch((error) => setCmsStatus(error.message));
    }
    return Promise.resolve();
  }

  function showBlogsIndex(message) {
    if (!blogsIndex || !blogsEditor) return;
    blogsIndex.hidden = false;
    blogsEditor.hidden = true;
    if (blogsReader) blogsReader.hidden = true;
    resetPostForm();
    setPostStatus("");
    if (indexStatus) indexStatus.textContent = message || "";
  }

  function showBlogsEditor(mode, html) {
    blogsIndex.hidden = true;
    blogsEditor.hidden = false;
    if (blogsReader) blogsReader.hidden = true;
    if (indexStatus) indexStatus.textContent = "";
    if (mode === "new") {
      resetPostForm();
      formTitle.textContent = "Add New Blog";
      setPostStatus("");
    }
    return ensureEditor().then(() => {
      setBodyHtml(html || "");
    });
  }

  function activePage() {
    return pages.find((page) => page.id === activePageId) || null;
  }

  function setPageStatus(message) {
    if (pageStatus) pageStatus.textContent = message;
  }

  function setPostStatus(message) {
    if (status) status.textContent = message;
  }

  const editorUiVersion = "v9";
  let activeRich = null;

  function getEditor(id) {
    return window.tinymce ? window.tinymce.get(id || "post-body") : null;
  }

  function editorHost(id) {
    return document.getElementById(id);
  }

  function getEditorHtml(id) {
    const editor = getEditor(id);
    if (editor) return editor.getContent();
    const node = editorHost(id);
    if (!node) return "";
    if (node.tagName === "TEXTAREA" || node.tagName === "INPUT") return node.value || "";
    return node.innerHTML || "";
  }

  function setEditorHtml(id, html) {
    const editor = getEditor(id);
    if (editor) {
      editor.setContent(html || "");
      return;
    }
    const node = editorHost(id);
    if (!node) return;
    if (node.tagName === "TEXTAREA" || node.tagName === "INPUT") node.value = html || "";
    else node.innerHTML = html || "";
  }

  function getBodyHtml() {
    return getEditorHtml("post-body");
  }

  function setBodyHtml(html) {
    setEditorHtml("post-body", html);
  }

  function getHeadingHtml() {
    return getEditorHtml("page-heading");
  }

  function setHeadingHtml(html) {
    setEditorHtml("page-heading", html);
  }

  function getLeadHtml() {
    return getEditorHtml("page-lead");
  }

  function setLeadHtml(html) {
    setEditorHtml("page-lead", html);
  }

  function getDescriptionHtml() {
    return getEditorHtml("page-description");
  }

  function setDescriptionHtml(html) {
    setEditorHtml("page-description", html);
  }

  function plainFromHtml(html) {
    const node = document.createElement("div");
    node.innerHTML = html || "";
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function ensureEditor() {
    if (!window.tinymce) {
      return Promise.reject(new Error("The writing desk failed to load. Refresh and try again."));
    }
    const existing = getEditor("post-body");
    if (existing) {
      if (existing.getParam("desk_word_ui") === editorUiVersion) return Promise.resolve(existing);
      existing.remove();
    }
    return window.tinymce
      .init({
        selector: "#post-body",
        license_key: "gpl",
        base_url: "https://cdn.jsdelivr.net/npm/tinymce@7.6.1",
        suffix: ".min",
        height: 480,
        menubar: false,
        statusbar: true,
        desk_word_ui: editorUiVersion,
        plugins: "advlist autolink image link lists media table wordcount",
        toolbar:
          "undo redo | fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table",
        font_family_formats:
          "Calibri=calibri,candara,segoe,segoe ui,optima,arial,sans-serif; Cambria=cambria,georgia,serif; Georgia=georgia,palatino,serif; Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Courier New=courier new,courier,monospace; Verdana=verdana,geneva,sans-serif; Comic Sans MS=comic sans ms,sans-serif; Trebuchet MS=trebuchet ms,geneva,sans-serif",
        font_size_formats: "8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 36pt 48pt 72pt",
        toolbar_mode: "sliding",
        toolbar_sticky: true,
        branding: false,
        promotion: false,
        skin: "oxide-dark",
        content_css: "dark",
        content_style:
          "body { font-family: Outfit, Calibri, Arial, sans-serif; font-size: 15px; line-height: 1.65; color: #f6f1e7; background: transparent; margin: 0.85rem 1rem; } p { margin: 0 0 0.75em; } a { color: #e4c19c; }",
        contextmenu: "link image table",
        relative_urls: false,
        convert_urls: false,
      })
      .then((editors) => editors[0]);
  }

  function setFormatTarget(label) {
    const target = document.querySelector("[data-format-target]");
    if (target) target.textContent = label ? `Editing: ${label}` : "Select a text card";
  }

  function markActiveCard(card) {
    document.querySelectorAll("[data-format-card]").forEach((node) => {
      node.classList.toggle("is-active", node === card);
    });
  }

  function focusRich(node) {
    if (!node) return;
    activeRich = node;
    const card = node.closest("[data-format-card]");
    markActiveCard(card);
    setFormatTarget(card ? card.getAttribute("data-format-card") : "");
    node.focus();
  }

  function runFormat(command, value) {
    if (!activeRich) {
      setPageStatus("Click a text card first, then use the tools.");
      return;
    }
    focusRich(activeRich);
    document.execCommand("styleWithCSS", false, true);
    if (command === "createLink") {
      const url = window.prompt("Link URL", "https://");
      if (!url) return;
      document.execCommand("createLink", false, url);
      return;
    }
    if (command === "insertImage") {
      const url = window.prompt("Image URL", "https://");
      if (!url) return;
      document.execCommand("insertImage", false, url);
      return;
    }
    document.execCommand(command, false, value || null);
  }

  function wrapSelectionStyle(styleName, styleValue) {
    if (!activeRich) {
      setPageStatus("Click a text card first, then use the tools.");
      return;
    }
    focusRich(activeRich);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      document.execCommand("styleWithCSS", false, true);
      if (styleName === "fontFamily") document.execCommand("fontName", false, styleValue);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!activeRich.contains(range.commonAncestorContainer)) return;
    const span = document.createElement("span");
    span.style[styleName] = styleValue;
    try {
      range.surroundContents(span);
    } catch (error) {
      document.execCommand("styleWithCSS", false, true);
      if (styleName === "fontFamily") document.execCommand("fontName", false, styleValue);
      if (styleName === "fontSize") document.execCommand("fontSize", false, "3");
    }
  }

  function clearLegacySeoEditors() {
    ["page-heading", "page-lead", "page-description"].forEach((id) => {
      const editor = getEditor(id);
      if (editor) editor.remove();
    });
  }

  function mountSizeMenu(select) {
    const wrap = document.createElement("div");
    wrap.className = "size-menu";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "format-desk__select format-desk__select--size size-menu__button";
    button.setAttribute("aria-haspopup", "listbox");
    button.textContent = select.selectedOptions[0] ? select.selectedOptions[0].textContent : "16";
    const list = document.createElement("div");
    list.className = "size-menu__list";
    list.hidden = true;
    list.setAttribute("role", "listbox");
    Array.from(select.options).forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "size-menu__item";
      item.textContent = option.textContent;
      item.setAttribute("role", "option");
      item.addEventListener("click", () => {
        select.value = option.value;
        button.textContent = option.textContent;
        list.querySelectorAll(".size-menu__item").forEach((node) => {
          node.classList.toggle("is-active", node === item);
        });
        select.dispatchEvent(new Event("change"));
        list.hidden = true;
        button.setAttribute("aria-expanded", "false");
      });
      list.append(item);
    });
    const active = list.querySelectorAll(".size-menu__item")[select.selectedIndex];
    if (active) active.classList.add("is-active");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = list.hidden;
      button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (!willOpen) {
        list.hidden = true;
        return;
      }
      if (list.parentElement !== document.body) document.body.append(list);
      list.hidden = false;
      list.style.visibility = "hidden";
      list.style.top = "0px";
      list.style.left = "0px";
      const rect = button.getBoundingClientRect();
      const fallback = list.children.length * 36 + 16;
      const measured = list.getBoundingClientRect().height;
      const height = measured >= fallback * 0.6 ? measured : fallback;
      const place = (boxHeight) => {
        const below = window.innerHeight - rect.bottom;
        let top = below >= boxHeight + 10 ? rect.bottom + 6 : rect.top - boxHeight - 6;
        if (top < 8) top = 8;
        if (top + boxHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - boxHeight - 8);
        list.style.top = `${Math.round(top)}px`;
        list.style.left = `${Math.round(rect.left)}px`;
        list.style.minWidth = `${Math.round(Math.max(rect.width, 72))}px`;
      };
      place(height);
      list.style.visibility = "visible";
      window.requestAnimationFrame(() => {
        if (list.hidden) return;
        place(list.getBoundingClientRect().height || height);
      });
    });
    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target) && !list.contains(event.target)) {
        list.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    });
    select.classList.add("size-menu__native");
    select.insertAdjacentElement("afterend", wrap);
    wrap.append(button, list);
  }

  function initFormatDesk() {
    clearLegacySeoEditors();
    const desk = document.querySelector("[data-format-desk]");
    if (!desk || desk.dataset.ready === "1") return;
    desk.dataset.ready = "1";

    desk.querySelectorAll(".seo-rich").forEach((node) => {
      node.addEventListener("focus", () => focusRich(node));
      node.addEventListener("mousedown", () => focusRich(node));
    });

    desk.querySelectorAll("[data-format-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".seo-rich")) return;
        const rich = card.querySelector(".seo-rich");
        focusRich(rich);
      });
    });

    desk.querySelectorAll("[data-cmd]").forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => runFormat(button.getAttribute("data-cmd")));
    });

    const fontSelect = desk.querySelector("[data-font]");
    if (fontSelect) {
      fontSelect.addEventListener("change", () => {
        wrapSelectionStyle("fontFamily", fontSelect.value);
      });
    }

    const sizeSelect = desk.querySelector("[data-size]");
    if (sizeSelect) {
      sizeSelect.addEventListener("change", () => {
        wrapSelectionStyle("fontSize", sizeSelect.value);
      });
      mountSizeMenu(sizeSelect);
    }

    desk.querySelectorAll("[data-color]").forEach((input) => {
      input.addEventListener("input", () => {
        const command = input.getAttribute("data-color");
        if (command === "hiliteColor") {
          runFormat("hiliteColor", input.value);
          return;
        }
        if (command === "backColor") {
          runFormat("backColor", input.value);
          return;
        }
        runFormat(command, input.value);
      });
    });
  }

  function resetPostForm() {
    editing = "";
    if (!postForm) return;
    postForm.reset();
    postForm.elements.date.value = new Date().toISOString().slice(0, 10);
    if (formTitle) formTitle.textContent = "Add New Blog";
    setBodyHtml("");
  }

  function actionButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function placeNavDialog() {
    if (!navDialog) return;
    const seo = document.querySelector("[data-menu='seo']");
    const opener = document.querySelector("[data-nav-open]");
    const shown = (node) => {
      if (!node) return false;
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.bottom > 8 && box.top < window.innerHeight - 8;
    };
    const anchor = shown(seo) ? seo : (shown(opener) ? opener : (seo || opener));
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = navDialog.offsetWidth || 216;
    const height = navDialog.offsetHeight || 320;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 8) {
      const above = rect.top - height - 8;
      top = above >= 8 ? above : Math.max(8, window.innerHeight - height - 8);
    }
    if (top < 8) top = 8;
    navDialog.style.top = `${Math.round(top)}px`;
    navDialog.style.left = `${Math.round(left)}px`;
  }

  function openNavDialog() {
    if (!navDialog) return;
    if (navDialog.parentElement !== document.body) document.body.append(navDialog);
    if (!navDialog.open) navDialog.show();
    placeNavDialog();
  }

  function closeNavDialog() {
    if (navDialog && navDialog.open) navDialog.close();
  }

  function renderNav() {
    if (!navList) return;
    navList.replaceChildren();
    pages.forEach((page) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-nav-item" + (page.id === activePageId ? " is-active" : "");
      button.textContent = page.label;
      button.addEventListener("click", () => {
        openSeoPage(page.id);
        closeNavDialog();
      });
      item.append(button);
      navList.append(item);
    });
  }

  function fillPageForm(page) {
    if (!pageForm) return;
    pageFormTitle.textContent = page.label;
    pagePreview.href = page.file;
    pageForm.elements.title.value = page.title || "";
    setHeadingHtml(page.heading || "");
    setLeadHtml(page.lead || "");
    setDescriptionHtml(page.description || "");
    setPageStatus("");
  }

  function renderPosts(posts) {
    if (!list) return;
    list.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement("li");
      empty.className = "admin-list__empty";
      empty.textContent = "No published blogs yet.";
      list.append(empty);
      return;
    }
    posts.forEach((post) => {
      const item = document.createElement("li");
      item.className = "admin-row";
      const copy = document.createElement("div");
      copy.className = "admin-row__copy";
      const title = document.createElement("strong");
      title.textContent = post.title;
      copy.append(title);
      const date = document.createElement("time");
      date.className = "admin-row__date";
      date.dateTime = post.date;
      date.textContent = window.SiteJournal.formatDate(post.date);
      const actions = document.createElement("div");
      actions.className = "admin-row__actions";
      actions.append(
        actionButton("Edit", "admin-action", () => startEdit(post)),
        actionButton("View", "admin-action", () => showBlogReader(post)),
        actionButton("Delete", "admin-action admin-action--danger", () => removePost(post))
      );
      item.append(copy, date, actions);
      list.append(item);
    });
  }

  async function refreshPages() {
    const data = await api("/api/pages");
    pages = data.pages || [];
    renderNav();
    return pages;
  }

  async function refreshBlogs() {
    const posts = await window.SiteJournal.loadBlogs();
    renderPosts(posts);
    return posts;
  }

  async function openSeoPage(pageId) {
    const page = pages.find((item) => item.id === pageId);
    if (!page) return;
    activePageId = pageId;
    renderNav();
    initFormatDesk();
    fillPageForm(page);
    activeRich = null;
    markActiveCard(null);
    setFormatTarget("");
  }

  function keepReaderInside(root) {
    root.querySelectorAll("a").forEach((link) => {
      link.removeAttribute("href");
      link.removeAttribute("target");
    });
  }

  async function showBlogReader(post) {
    if (!blogsReader) return;
    blogsIndex.hidden = true;
    blogsEditor.hidden = true;
    blogsReader.hidden = false;
    if (readerTitle) readerTitle.textContent = post.title || "";
    if (readerLead) readerLead.textContent = post.excerpt || "";
    if (readerMeta) readerMeta.textContent = `Mark H Steffen · ${window.SiteJournal.formatDate(post.date)}`;
    if (readerBody) readerBody.textContent = "Loading…";
    blogsReader.scrollIntoView({ block: "start" });
    try {
      let html = "";
      if (post.body && String(post.body).trim()) {
        html = window.SiteJournal.renderBody(post.body);
      } else if (post.href) {
        const response = await fetch(post.href);
        if (!response.ok) throw new Error("Could not open this blog.");
        const doc = new DOMParser().parseFromString(await response.text(), "text/html");
        const title = doc.querySelector("#article-title");
        const lead = doc.querySelector(".page-lead");
        const meta = doc.querySelector(".article-meta");
        const layout = doc.querySelector(".article-layout");
        if (title && readerTitle) readerTitle.textContent = title.textContent.trim();
        if (lead && readerLead) readerLead.textContent = lead.textContent.trim();
        if (meta && readerMeta) readerMeta.textContent = meta.textContent.replace(/\s+/g, " ").trim();
        html = layout ? window.SiteJournal.renderBody(layout.innerHTML) : "<p>This blog has no article text yet.</p>";
      } else {
        html = "<p>This blog has no article text yet.</p>";
      }
      if (readerBody) {
        readerBody.innerHTML = html;
        keepReaderInside(readerBody);
      }
    } catch (error) {
      if (readerBody) readerBody.textContent = error.message;
    }
  }

  function startEdit(post) {
    editing = post.slug;
    formTitle.textContent = "Edit blog";
    postForm.elements.title.value = post.title;
    postForm.elements.date.value = post.date;
    postForm.elements.excerpt.value = post.excerpt;
    setPostStatus("Loading the article…");
    showBlogsEditor("edit", "")
      .then(() => loadArticleBody(post))
      .then((html) => {
        setBodyHtml(html);
        setPostStatus(html ? "" : "This blog has no article text yet.");
      })
      .catch((error) => setPostStatus(error.message));
  }

  async function loadArticleBody(post) {
    if (post.body && String(post.body).trim()) return post.body;
    if (!post.href) return "";
    const response = await fetch(post.href, { cache: "reload" });
    if (!response.ok) throw new Error("Could not open this blog.");
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const layout = doc.querySelector(".article-layout");
    if (!layout) return "";
    layout.querySelectorAll(".article-end").forEach((node) => node.remove());
    return layout.innerHTML.trim();
  }

  async function removePost(post) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    await api(`${blogsApi}/${encodeURIComponent(post.slug)}`, { method: "DELETE" });
    if (editing === post.slug) showBlogsIndex();
    await refreshBlogs();
  }

  function wirePasswordToggle(button, input) {
    if (!button || !input) return;
    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", show ? "true" : "false");
    });
  }

  wirePasswordToggle(document.querySelector("[data-toggle-password]"), document.getElementById("desk-password"));
  wirePasswordToggle(document.querySelector("[data-toggle-current-password]"), document.getElementById("change-current-password"));
  wirePasswordToggle(document.querySelector("[data-toggle-new-password]"), document.getElementById("change-new-password"));
  wirePasswordToggle(document.querySelector("[data-toggle-account-password]"), document.getElementById("account-password"));

  const changeForm = document.querySelector("[data-change-login]");
  const changeError = document.querySelector("[data-change-error]");
  const showChange = document.querySelector("[data-show-change]");
  const showSignin = document.querySelector("[data-show-signin]");

  const showLoginMode = (changing) => {
    if (loginForm) loginForm.hidden = changing;
    if (changeForm) changeForm.hidden = !changing;
    if (loginError) {
      loginError.hidden = true;
      loginError.classList.remove("is-shown");
    }
    if (changeError) {
      changeError.hidden = true;
      changeError.classList.remove("is-shown");
    }
  };

  if (showChange) showChange.addEventListener("click", () => showLoginMode(true));
  if (showSignin) showSignin.addEventListener("click", () => showLoginMode(false));

  if (changeForm) {
    changeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (changeError) {
        changeError.hidden = true;
        changeError.classList.remove("is-shown");
      }
      const submit = changeForm.querySelector(".admin-login__submit");
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Saving…";
      }
      try {
        const data = await api("/api/login/change", {
          method: "POST",
          body: JSON.stringify({
            currentEmail: changeForm.elements.currentEmail.value.trim(),
            currentPassword: changeForm.elements.currentPassword.value,
            email: changeForm.elements.email.value.trim(),
            password: changeForm.elements.password.value,
          }),
        });
        changeForm.reset();
        sessionStorage.setItem(tokenKey, data.token);
        showLoginMode(false);
        await showApp();
      } catch (error) {
        if (changeError) {
          changeError.hidden = false;
          changeError.textContent = error.message;
          changeError.classList.remove("is-shown");
          void changeError.offsetWidth;
          changeError.classList.add("is-shown");
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Save login";
        }
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginError.hidden = true;
      loginError.classList.remove("is-shown");
      const submit = loginForm.querySelector(".admin-login__submit");
      const submitLabel = submit ? submit.textContent : "";
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Signing in…";
      }
      try {
        const data = await api("/api/login", {
          method: "POST",
          body: JSON.stringify({
            email: loginForm.elements.email.value.trim(),
            password: loginForm.elements.password.value,
          }),
        });
        sessionStorage.setItem(tokenKey, data.token);
        await showApp();
      } catch (error) {
        loginError.hidden = false;
        loginError.textContent = error.message;
        loginError.classList.remove("is-shown");
        void loginError.offsetWidth;
        loginError.classList.add("is-shown");
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = submitLabel || "Sign in";
        }
      }
    });
  }

  if (accountForm) {
    accountForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (accountStatus) accountStatus.textContent = "Saving…";
      try {
        await api("/api/credentials", {
          method: "POST",
          body: JSON.stringify({
            email: accountForm.elements.email.value.trim(),
            password: accountForm.elements.password.value,
          }),
        });
        accountForm.reset();
        if (accountStatus) accountStatus.textContent = "Login email and password updated.";
      } catch (error) {
        if (accountStatus) accountStatus.textContent = error.message;
      }
    });
  }

  if (logout) {
    logout.addEventListener("click", () => {
      sessionStorage.removeItem(tokenKey);
      showGate();
    });
  }

  const navOpen = document.querySelector("[data-nav-open]");
  const navClose = document.querySelector("[data-nav-close]");
  if (navOpen) navOpen.addEventListener("click", openNavDialog);
  if (navClose) navClose.addEventListener("click", closeNavDialog);
  if (navDialog) {
    navDialog.addEventListener("click", (event) => {
      if (event.target === navDialog) closeNavDialog();
    });
  }
  document.addEventListener("click", (event) => {
    if (!navDialog || !navDialog.open) return;
    if (navDialog.contains(event.target)) return;
    if (event.target.closest("[data-menu='seo'], [data-nav-open]")) return;
    closeNavDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavDialog();
  });
  window.addEventListener("resize", () => {
    if (navDialog && navDialog.open) placeNavDialog();
  });
  window.addEventListener("scroll", () => {
    if (navDialog && navDialog.open) placeNavDialog();
  }, true);

  menuButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMenu(button.dataset.menu).catch((error) => {
        if (activeMenu === "blogs") setPostStatus(error.message);
        else if (activeMenu === "account" && accountStatus) accountStatus.textContent = error.message;
        else if (cmsMenus.has(activeMenu)) setCmsStatus(error.message);
        else setPageStatus(error.message);
      });
    });
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      setMenu(button.getAttribute("data-jump")).catch((error) => setCmsStatus(error.message));
    });
  });

  if (cmsSave) {
    cmsSave.addEventListener("click", () => {
      saveSite().catch((error) => setCmsStatus(error.message));
    });
  }

  if (pageForm) {
    pageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const page = activePage();
      if (!page) return;
      const headingHtml = getHeadingHtml();
      const leadHtml = getLeadHtml();
      const descriptionHtml = getDescriptionHtml();
      if (!plainFromHtml(headingHtml)) {
        setPageStatus("Give the page a heading before saving.");
        return;
      }
      if (!plainFromHtml(leadHtml)) {
        setPageStatus("Give the page lead text before saving.");
        return;
      }
      setPageStatus("Saving…");
      try {
        const data = await api(`/api/pages/${encodeURIComponent(page.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            title: pageForm.elements.title.value,
            heading: headingHtml,
            lead: leadHtml,
            description: descriptionHtml,
          }),
        });
        const index = pages.findIndex((item) => item.id === page.id);
        if (index >= 0) pages[index] = data.page;
        fillPageForm(data.page);
        setPageStatus("SEO saved for this page.");
      } catch (error) {
        setPageStatus(error.message);
      }
    });
  }

  if (addBlog) {
    addBlog.addEventListener("click", () => {
      showBlogsEditor("new").catch((error) => setPostStatus(error.message));
    });
  }
  if (backBlogs) backBlogs.addEventListener("click", () => showBlogsIndex());
  const backReader = document.querySelector("[data-back-reader]");
  if (backReader) backReader.addEventListener("click", () => showBlogsIndex());
  if (cancel) cancel.addEventListener("click", () => showBlogsIndex());

  if (postForm) {
    postForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const bodyHtml = getBodyHtml();
      if (!plainFromHtml(bodyHtml)) {
        setPostStatus("Write the blog body before publishing.");
        return;
      }
      const payload = {
        title: postForm.elements.title.value,
        date: postForm.elements.date.value,
        excerpt: postForm.elements.excerpt.value,
        body: bodyHtml,
      };
      setPostStatus("Saving…");
      const wasEditing = Boolean(editing);
      try {
        if (editing) {
          await api(`${blogsApi}/${encodeURIComponent(editing)}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await api(blogsApi, { method: "POST", body: JSON.stringify(payload) });
        }
        await refreshBlogs();
        showBlogsIndex(wasEditing ? "Updated on the blogs page." : "Published on the blogs page.");
      } catch (error) {
        setPostStatus(error.message);
      }
    });
  }

  if (token()) {
    showApp().catch(() => showGate());
  }
})();
