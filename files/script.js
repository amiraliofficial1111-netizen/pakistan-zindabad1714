const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const scrollProgress = document.getElementById("scrollProgress");
const heroImage = document.querySelector(".hero-image");
const header = document.querySelector(".site-header");
const siteLoader = document.getElementById("siteLoader");
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (menuBtn && navLinks) {
  menuBtn.setAttribute("aria-controls", "navLinks");
  if (!menuBtn.hasAttribute("aria-expanded")) {
    menuBtn.setAttribute("aria-expanded", "false");
  }

  const setMenuState = (open) => {
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (window.matchMedia("(max-width: 680px)").matches) {
      document.body.classList.toggle("nav-open", open);
    } else {
      document.body.classList.remove("nav-open");
    }
  };

  menuBtn.addEventListener("click", () => {
    const open = !navLinks.classList.contains("open");
    setMenuState(open);
  });

  navLinks.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      setMenuState(false);
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 680) {
      setMenuState(false);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !navLinks || !navLinks.classList.contains("open")) {
    return;
  }
  navLinks.classList.remove("open");
  if (menuBtn) {
    menuBtn.setAttribute("aria-expanded", "false");
  }
  document.body.classList.remove("nav-open");
});

if (window.location.protocol === "file:" && window.location.hash && !document.getElementById("quizApp")) {
  const hashTarget = document.querySelector(window.location.hash);
  if (hashTarget) {
    hashTarget.scrollIntoView({ behavior: "auto", block: "start" });
  }
  if (history.replaceState) {
    history.replaceState(null, "", window.location.pathname);
  }
}

const hashLinks = document.querySelectorAll('a[href^="#"]');
const sectionLinks = document.querySelectorAll('.nav-links a[href^="#"]');

hashLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (!targetId || targetId === "#") {
      return;
    }

    const target = document.querySelector(targetId);
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

    const isFileProtocol = window.location.protocol === "file:";
    if (!isFileProtocol) {
      if (history.pushState) {
        history.pushState(null, "", targetId);
      } else {
        window.location.hash = targetId;
      }
    }

    if (navLinks) {
      navLinks.classList.remove("open");
    }
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
});

(function deferHomeScenes() {
  const home = document.querySelector(".page-home");
  if (!home) return;
  const scenes = [...home.querySelectorAll(".convictions-hub, .snapshot-scene, .pillars-scene, .journey-scene, .entry-scene, .editions-scene, .inside-scene, .audience-scene, .answers-scene, .quote-scene, .cta-scene")];
  if (!scenes.length || !("IntersectionObserver" in window)) {
    scenes.forEach((scene) => scene.classList.add("is-near"));
    return;
  }
  const watch = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const box = entry.boundingClientRect;
      if (!entry.isIntersecting || box.height < 40 || box.top > window.innerHeight + 180) return;
      entry.target.classList.add("is-near");
      watch.unobserve(entry.target);
    });
  }, { rootMargin: "160px 0px" });
  scenes.forEach((scene) => watch.observe(scene));
})();

const revealItems = document.querySelectorAll(".reveal");
if (revealItems.length > 0) {
  const activateMotionStaggers = (root) => {
    const reduce = prefersReducedMotion();
    root.querySelectorAll(".motion-stagger").forEach((st) => {
      st.querySelectorAll(":scope > *").forEach((child, i) => {
        child.style.setProperty("--i", reduce ? "0" : String(i));
      });
      if (reduce) {
        st.classList.add("motion-stagger--on");
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => st.classList.add("motion-stagger--on"));
        });
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          activateMotionStaggers(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -4% 0px" }
  );

  revealItems.forEach((item) => observer.observe(item));
}

const updateScrollProgress = () => {
  if (!scrollProgress) {
    return;
  }
  const doc = document.documentElement;
  const total = doc.scrollHeight - doc.clientHeight;
  const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
  scrollProgress.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;

  if (header) {
    header.classList.toggle("scrolled", window.scrollY > 12);
  }

};

updateScrollProgress();
window.addEventListener("scroll", updateScrollProgress, { passive: true });

const observedSections = document.querySelectorAll("main section[id]");
if (observedSections.length > 0 && sectionLinks.length > 0) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const activeId = `#${entry.target.id}`;
        sectionLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === activeId;
          link.classList.toggle("active", isActive);
        });
      });
    },
    { threshold: 0.55 }
  );

  observedSections.forEach((section) => navObserver.observe(section));
}

if (heroImage && !prefersReducedMotion()) {
  heroImage.addEventListener("mousemove", (event) => {
    const rect = heroImage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 6;
    const ry = (x - 0.5) * 8;
    heroImage.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    heroImage.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
  });

  heroImage.addEventListener("mouseleave", () => {
    heroImage.style.setProperty("--rx", "0deg");
    heroImage.style.setProperty("--ry", "0deg");
  });
}

const hideSiteLoader = () => {
  if (siteLoader) {
    siteLoader.classList.add("hidden");
  }
  document.documentElement.classList.add("site-ready");
};
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hideSiteLoader, { once: true });
} else {
  hideSiteLoader();
}

const newsletterForm = document.getElementById("newsletterForm");
const contactForm = document.getElementById("contactForm");
if (newsletterForm) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Thank you. Connect this form to your email provider or backend when you are ready.");
  });
}
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Thank you. Connect this form to your email provider or backend when you are ready.");
  });
}

/* Procedural galaxy starfield: random spawn, drift, twinkle, lifecycle */
(function initGalaxyStarfield() {
  const canvas = document.getElementById("starfieldCanvas");
  if (!canvas || typeof canvas.getContext !== "function") {
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let rafId = 0;
  let lastTs = 0;
  let spawnAccumulator = 0;

  function pickColor() {
    const roll = Math.random();
    if (roll < 0.62) {
      return [232, 238, 255];
    }
    if (roll < 0.84) {
      return [228, 193, 156];
    }
    return [243, 230, 212];
  }

  function spawnStar(edgeBias) {
    let x;
    let y;
    if (edgeBias && Math.random() < 0.55) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        x = Math.random() * width;
        y = -8;
      } else if (edge === 1) {
        x = width + 8;
        y = Math.random() * height;
      } else if (edge === 2) {
        x = Math.random() * width;
        y = height + 8;
      } else {
        x = -8;
        y = Math.random() * height;
      }
    } else {
      x = Math.random() * width;
      y = Math.random() * height;
    }

    const rgb = pickColor();
    const r = 0.35 + Math.random() * 1.45;

    return {
      x,
      y,
      r,
      vx: (Math.random() - 0.5) * 0.11,
      vy: (Math.random() - 0.5) * 0.09 - 0.028,
      rgb,
      base: 0.1 + Math.random() * 0.52,
      twSpeed: 0.0018 + Math.random() * 0.0042,
      phase: Math.random() * Math.PI * 2,
      born: performance.now(),
      life: 14000 + Math.random() * 26000,
    };
  }

  function targetCount() {
    const area = width * height;
    const cap = width < 760 ? 56 : 96;
    return Math.max(28, Math.min(cap, Math.floor(area / 16000)));
  }

  function syncStars() {
    const n = targetCount();
    if (stars.length < n) {
      while (stars.length < n) {
        stars.push(spawnStar(false));
      }
    } else if (stars.length > n) {
      stars.length = n;
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1 : 1.25);
    width = window.innerWidth;
    height = window.innerHeight;
    if (width < 1 || height < 1) {
      return;
    }
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncStars();
  }

  function wrap(s) {
    if (s.x < -24) {
      s.x = width + 12;
    } else if (s.x > width + 24) {
      s.x = -12;
    }
    if (s.y < -24) {
      s.y = height + 12;
    } else if (s.y > height + 24) {
      s.y = -12;
    }
  }

  function drawStar(s, tw) {
    const a = Math.min(1, s.base * tw);
    const [cr, cg, cb] = s.rgb;
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  let lastDraw = 0;

  function tick(ts) {
    if (document.hidden) {
      return;
    }

    rafId = requestAnimationFrame(tick);
    if (ts - lastDraw < 32) {
      return;
    }

    const dt = Math.min(48, ts - lastDraw || 16);
    lastDraw = ts;
    lastTs = ts;

    const maxStars = targetCount() + 20;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    spawnAccumulator += dt;
    if (spawnAccumulator > 420 && stars.length < maxStars) {
      spawnAccumulator = 0;
      if (Math.random() < 0.38) {
        stars.push(spawnStar(true));
      }
    }

    if (stars.length > maxStars) {
      stars.length = maxStars;
    }

    const now = performance.now();

    for (let i = stars.length - 1; i >= 0; i -= 1) {
      const s = stars[i];
      if (now - s.born > s.life) {
        stars[i] = spawnStar(Math.random() < 0.4);
        continue;
      }

      s.phase += s.twSpeed * dt;
      const tw = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(s.phase));

      s.x += s.vx * dt * 0.045;
      s.y += s.vy * dt * 0.045;
      wrap(s);

      drawStar(s, tw);
    }

    ctx.restore();
  }

  function drawStaticField() {
    resize();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < Math.min(72, targetCount()); i += 1) {
      const s = spawnStar(false);
      s.base *= 0.75;
      drawStar(s, 0.75 + Math.random() * 0.22);
    }
    ctx.restore();
  }

  let resizeTimer;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    },
    { passive: true }
  );

  const beginField = () => {
    resize();
    if (reducedMotion()) {
      drawStaticField();
      return;
    }
    lastTs = performance.now();
    rafId = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!reducedMotion() && !rafId) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    });
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(beginField, { timeout: 700 });
  } else {
    window.setTimeout(beginField, 50);
  }
})();

(function upgradeSeo() {
  if (location.protocol !== "http:" && location.protocol !== "https:") {
    return;
  }

  const pageUrl = new URL(location.href);
  pageUrl.hash = "";

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = pageUrl.href;

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute("content", pageUrl.href);
  }

  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((node) => {
    const content = node.getAttribute("content");
    if (content && !/^[a-z]+:/i.test(content)) {
      node.setAttribute("content", new URL(content, pageUrl).href);
    }
  });

  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => {
    const href = node.getAttribute("href");
    if (href && !/^[a-z]+:/i.test(href)) {
      node.href = new URL(href, pageUrl).href;
    }
  });

  const absolutizeLd = (node) => {
    if (Array.isArray(node)) {
      node.forEach(absolutizeLd);
      return;
    }
    if (!node || typeof node !== "object") {
      return;
    }
    Object.keys(node).forEach((key) => {
      const value = node[key];
      if (
        (key === "item" || key === "url" || key === "@id" || key === "image" || key === "contentUrl") &&
        typeof value === "string" &&
        !/^[a-z]+:/i.test(value)
      ) {
        node[key] = new URL(value, pageUrl).href;
      } else {
        absolutizeLd(value);
      }
    });
  };

  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    try {
      const data = JSON.parse(node.textContent);
      absolutizeLd(data);
      node.textContent = JSON.stringify(data);
    } catch (error) {
      /* Leave invalid blocks untouched. */
    }
  });
})();

(function initReadingGuide() {
  if (!initReadingGuide.scheduled) {
    initReadingGuide.scheduled = true;
    const run = () => initReadingGuide();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 250);
    }
    return;
  }
  if (document.getElementById("readingGuide")) {
    return;
  }

  const chapters = [
    "The Original Constitution of God",
    "The Constitutional Concept of God for the New World",
    "God’s Original Constitution",
    "The Origin of Sin",
    "Adam and Eve’s Life After the Garden",
    "Jesus as the Second Adam",
    "The Appearance of the Third Adam and Eve",
    "The Lineage Chain",
    "The Birth of the Third Adam and the First Eve",
    "Jesus Must Return",
    "The Makeup of Creation",
    "The American Constitution",
    "God’s Desire",
    "The Purpose of Life and the Desire of America",
  ];

  const knowledge = [
    {
      title: "The book",
      keywords: ["what is this book", "what is the book", "constitution of god", "the manuscript", "what is it about", "central argument", "three pillars", "absolute faith", "absolute love", "absolute obedience"],
      paragraphs: [
        "The Constitution of God is Mark H Steffen’s fourteen-chapter manuscript. It holds one argument: divine constitutional order, the story of sin and restoration, and the purpose of life read alongside America’s founding ideals.",
        "The site names three commitments with the book: absolute faith, absolute love, and absolute obedience.",
      ],
      links: [
        ["book.html", "Book overview"],
        ["chapters.html", "All 14 chapters"],
      ],
      chips: ["Where should I start?", "What is chapter 6?", "Who is it for?"],
    },
    {
      title: "Where to start",
      keywords: ["where should i start", "where do i start", "which book", "what should i read", "which chapter", "recommend", "reader quiz", "not sure"],
      paragraphs: [
        "There is one book. The quiz chooses the door. Foundations are chapters 1–5, restoration is chapters 6–10, and nation and purpose are chapters 11–14. Readers who want the whole argument start at chapter 1.",
      ],
      links: [
        ["quiz.html", "Take the reader quiz"],
        ["chapters.html", "See the three paths"],
      ],
      chips: ["What is chapter 1?", "What is chapter 12?", "How do groups read it?"],
    },
    {
      title: "Readers",
      keywords: ["who is it for", "audience", "pastors", "teachers", "study group", "who should read"],
      paragraphs: [
        "The site is built for individual readers, teachers and pastors, study groups, and for media or institutions arranging a conversation. Each of those uses is described on the home page.",
      ],
      links: [
        ["index.html#home-audience", "Who it’s for"],
        ["article-reading-groups.html", "How a group can read it"],
      ],
      chips: ["Where should I start?", "How do I contact Mark?"],
    },
    {
      title: "America",
      keywords: ["america", "american constitution", "civic", "nation", "founding", "heaven and america"],
      paragraphs: [
        "Chapter 12 is titled The American Constitution. It sits in the last movement, chapters 11–14, with The Makeup of Creation, God’s Desire, and The Purpose of Life and the Desire of America.",
        "The site calls this a civic echo of a prior theological order, not a substitute for it. Chapters 1–3 are the voice that echo repeats.",
      ],
      links: [
        ["article-america.html", "Heaven, America, and one vocabulary"],
        ["quiz.html#nation", "Start at nation and purpose"],
      ],
      chips: ["What is chapter 14?", "What is divine order?"],
    },
    {
      title: "Second Adam",
      keywords: ["second adam", "jesus", "christ", "restoration", "lineage", "third adam", "must return"],
      paragraphs: [
        "Chapter 6, Jesus as the Second Adam, is the hinge. Chapters 7–10 keep the line going: a third pair, the lineage chain, a birth, and the claim that Jesus must return.",
        "On this site that block is the Restoration path.",
      ],
      links: [
        ["article-second-adam.html", "Why the book turns there"],
        ["quiz.html#restoration", "Start at chapter 6"],
      ],
      chips: ["What is chapter 8?", "Where should I start?"],
    },
    {
      title: "Foundations",
      keywords: ["divine order", "original constitution", "origin of sin", "adam and eve", "foundations", "the fall", "covenant"],
      paragraphs: [
        "Chapters 1–5 are the Foundations path: the original constitution of God, the constitutional concept for the new world, the origin of sin, and life after the garden.",
        "The later chapters about a nation assume this opening. The site’s essay on divine constitutional order walks through why.",
      ],
      links: [
        ["article-divine-order.html", "Read the foundations essay"],
        ["quiz.html#foundations", "Start at chapter 1"],
      ],
      chips: ["What is chapter 4?", "What is the book about?"],
    },
    {
      title: "Groups",
      keywords: ["group", "small group", "class", "syllabus", "fourteen weeks", "how do groups", "discussion", "teach"],
      paragraphs: [
        "Use the three paths already published: chapters 1–5, 6–10, and 11–14. A short course can give one meeting to each path. A full reading is one chapter a week.",
        "The group essay suggests four questions for every meeting: the claim about God, the claim about human beings, the claim about a people, and which commitment — faith, love, or obedience — the chapter weighs.",
      ],
      links: [
        ["article-reading-groups.html", "How to read with a group"],
        ["resources.html", "Study resources"],
      ],
      chips: ["Where should I start?", "What are the reviews?"],
    },
    {
      title: "Reviews",
      keywords: ["review", "reviews", "critic", "verdict", "editorial"],
      paragraphs: [
        "The reviews are editorial assessments published on this site. They read the chapter architecture and the author’s public framing. They are not reprints from an outside magazine, and they do not pretend to quote pages that are not public here.",
      ],
      links: [["reviews.html", "Read the reviews"]],
      chips: ["What is the book about?", "Where should I start?"],
    },
    {
      title: "Journal",
      keywords: ["journal", "blog", "article", "essay", "essays"],
      paragraphs: [
        "The journal is the desk essays. Open it for the full list, including any note published since the original four.",
      ],
      links: [["journal.html", "Open the journal"]],
      chips: ["What is chapter 6?", "How do groups read it?"],
    },
    {
      title: "Author",
      keywords: ["mark steffen", "mark h steffen", "the author", "who wrote", "biography", "about the author", "who is mark"],
      paragraphs: [
        "Mark H Steffen is the author of The Constitution of God. The public biography on this site describes the arc of the manuscript: divine constitutional order, moral freedom, restoration in Christ, and purpose in personal life and national destiny.",
        "Interviews and speaking requests go through the contact form.",
      ],
      links: [
        ["author.html", "Author profile"],
        ["contact.html", "Contact"],
      ],
      chips: ["How do I contact Mark?", "What is the book about?"],
    },
    {
      title: "Contact",
      keywords: ["contact", "email", "interview", "podcast", "speaking", "event", "media", "press", "newsletter", "subscribe"],
      paragraphs: [
        "Use the contact form for media, speaking, partnerships, and reader questions. Name the topic in the message. The same page has a newsletter signup for release news.",
      ],
      links: [
        ["contact.html", "Contact form"],
        ["contact.html#newsletter", "Newsletter"],
      ],
      chips: ["Who is Mark H Steffen?", "Where should I start?"],
    },
    {
      title: "Availability",
      keywords: ["buy", "purchase", "order", "amazon", "kindle", "price", "bookstore", "where can i get", "where to buy", "preorder"],
      paragraphs: [
        "The Constitution of God is available to purchase on Amazon. Signed sets and books for a study group can still be requested through the contact form.",
      ],
      links: [
        ["https://a.co/d/0iWIUDML", "Buy on Amazon"],
        ["contact.html", "Request a signed copy"],
      ],
      chips: ["What is the book about?", "Where should I start?"],
    },
    {
      title: "Resources",
      keywords: ["resource", "resources", "reference", "bibliography", "study aid", "recommended books"],
      paragraphs: [
        "The Resources page points to a reference list on Heaven and how we enter it, plus study materials meant to sit beside the fourteen chapters. It also describes a simple workflow: read one chapter, write the claims in plain language, then cross-check.",
      ],
      links: [["resources.html", "Resources"]],
      chips: ["How do groups read it?", "Where should I start?"],
    },
    {
      title: "Guide",
      keywords: ["who are you", "what are you", "are you ai", "are you mark", "reading guide", "chatbot", "are you a bot"],
      paragraphs: [
        "I’m the reading guide on this website. I answer from these public pages: the book, the chapters, the quiz, the reviews, and the journal. I am not Mark H Steffen, and I don’t describe manuscript pages that are not published here.",
      ],
      links: [["book.html", "Start with the book"]],
      chips: ["What is the book about?", "Where should I start?"],
    },
  ];

  const numberWords = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
  };

  const welcome = {
    paragraphs: [
      "Ask about the book, a chapter, or where to start. I answer from this site.",
    ],
    links: [],
    chips: ["What is the book about?", "Where should I start?", "What is chapter 12?", "How do groups read it?"],
  };

  const root = document.createElement("div");
  root.className = "reading-guide";
  root.id = "readingGuide";

  const panel = document.createElement("section");
  panel.className = "guide-panel";
  panel.id = "guidePanel";
  panel.hidden = true;
  panel.setAttribute("aria-labelledby", "guideTitle");

  const head = document.createElement("div");
  head.className = "guide-head";
  const headCopy = document.createElement("div");
  const title = document.createElement("h2");
  title.id = "guideTitle";
  title.textContent = "Reading guide";
  const subtitle = document.createElement("p");
  subtitle.textContent = "";
  headCopy.append(title, subtitle);
  const actions = document.createElement("div");
  actions.className = "guide-head-actions";
  const settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.className = "guide-settings";
  settingsBtn.setAttribute("aria-label", "Chat settings");
  settingsBtn.setAttribute("aria-expanded", "false");
  settingsBtn.setAttribute("aria-controls", "guideSettings");
  settingsBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5Z"/></svg>';
  const close = document.createElement("button");
  close.type = "button";
  close.className = "guide-close";
  close.setAttribute("aria-label", "Close the reading guide");
  close.textContent = "×";
  actions.append(settingsBtn, close);
  head.append(headCopy, actions);

  const log = document.createElement("div");
  log.className = "guide-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  log.setAttribute("aria-relevant", "additions");

  const chips = document.createElement("div");
  chips.className = "guide-chips";

  const form = document.createElement("form");
  form.className = "guide-form";
  form.id = "guideForm";
  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.setAttribute("for", "guideInput");
  label.textContent = "Ask about the book";
  const input = document.createElement("input");
  input.id = "guideInput";
  input.name = "q";
  input.type = "text";
  input.maxLength = 400;
  input.autocomplete = "off";
  input.placeholder = "Type your reply";
  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Send";
  form.append(label, input, send);

  const note = document.createElement("p");
  note.className = "guide-note";
  note.hidden = true;

  const settingsView = document.createElement("div");
  settingsView.className = "guide-settings-view";
  settingsView.id = "guideSettings";
  settingsView.hidden = true;
  const settingsKicker = document.createElement("p");
  settingsKicker.className = "guide-settings-kicker";
  settingsKicker.textContent = "Questions";
  const settingsHint = document.createElement("p");
  settingsHint.className = "guide-settings-hint";
  settingsHint.textContent = "These appear one at a time. Saved on this browser.";
  const settingsList = document.createElement("div");
  settingsList.className = "guide-settings-list";
  const addQuestion = document.createElement("button");
  addQuestion.type = "button";
  addQuestion.className = "guide-settings-add";
  addQuestion.textContent = "Add question";
  const settingsActions = document.createElement("div");
  settingsActions.className = "guide-settings-actions";
  const saveQuestionsBtn = document.createElement("button");
  saveQuestionsBtn.type = "button";
  saveQuestionsBtn.className = "guide-settings-save";
  saveQuestionsBtn.textContent = "Save";
  const resetQuestionsBtn = document.createElement("button");
  resetQuestionsBtn.type = "button";
  resetQuestionsBtn.className = "guide-settings-reset";
  resetQuestionsBtn.textContent = "Reset";
  settingsActions.append(saveQuestionsBtn, resetQuestionsBtn);
  const settingsStatus = document.createElement("p");
  settingsStatus.className = "guide-settings-status";
  settingsStatus.setAttribute("role", "status");
  settingsView.append(settingsKicker, settingsHint, settingsList, addQuestion, settingsActions, settingsStatus);

  panel.append(head, log, settingsView, chips, form, note);

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "guide-launcher";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "guidePanel");
  launcher.setAttribute("aria-label", "Ask about the book");
  launcher.innerHTML = "<span>Ask</span>";

  const dock = document.createElement("div");
  dock.className = "guide-dock";
  if (!location.pathname.endsWith("quiz.html")) {
    const quiz = document.createElement("a");
    quiz.className = "guide-quiz";
    quiz.href = "quiz.html";
    quiz.textContent = "Reader quiz";
    dock.appendChild(quiz);
  }
  root.appendChild(panel);
  document.body.appendChild(root);
  document.body.appendChild(launcher);
  const dockMount = document.querySelector("[data-guide-dock]");
  const footerBar = document.querySelector(".footer-pro-bottom-inner");
  if (dock.childElementCount) {
    if (dockMount) {
      dockMount.replaceWith(dock);
    } else if (footerBar) {
      const write = footerBar.querySelector(".footer-write");
      if (write) footerBar.insertBefore(dock, write);
      else footerBar.appendChild(dock);
    }
  } else if (dockMount) {
    dockMount.remove();
  }

  let turn = 0;
  let lastFocus = null;

  function normalize(value) {
    return value
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function addMessage(kind, answer) {
    const item = document.createElement("article");
    item.className = "guide-msg guide-msg--" + kind;
    if (kind === "user") {
      const paragraph = document.createElement("p");
      paragraph.textContent = answer;
      item.appendChild(paragraph);
    } else {
      answer.paragraphs.forEach((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        item.appendChild(paragraph);
      });
      if (answer.links.length) {
        const list = document.createElement("div");
        list.className = "guide-links";
        answer.links.forEach((link) => {
          const anchor = document.createElement("a");
          anchor.href = link[0];
          anchor.textContent = link[1];
          if (/^https?:/i.test(link[0])) {
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
          }
          list.appendChild(anchor);
        });
        item.appendChild(list);
      }
    }
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function renderChips(list) {
    chips.replaceChildren();
    list.forEach((text) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.addEventListener("click", () => ask(text));
      chips.appendChild(button);
    });
  }

  function chapterNumber(query) {
    const digit = query.match(/\b(?:chapter|ch)\s+0?(\d{1,2})\b/);
    if (digit) {
      return Number(digit[1]);
    }
    const word = query.match(/\bchapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\b/);
    if (word) {
      return numberWords[word[1]];
    }
    return 0;
  }

  const chapterSummaries = [
    "Explains how God established original principles to guide the creation of the spiritual and physical worlds. It explores the role of angels, free will, and God's intention to establish the Kingdom of Heaven on Earth.",
    "Discusses God's plan for human spiritual development and the selection of Adam and Eve to establish a heavenly world. It emphasizes spiritual perfection, free will, and humanity's responsibility to fulfill God's original purpose.",
    "Explores God's original commandment to Adam and Eve to be fruitful, multiply, and have dominion over creation. It explains how Lucifer's jealousy and influence disrupted God's plan, leading to humanity's separation from Him.",
    "Examines the spiritual and physical origins of sin through Lucifer's influence over Eve and Adam. The chapter describes how their disobedience introduced evil into human existence and prevented the establishment of God's intended heavenly kingdom.",
    "Describes Adam and Eve's struggles adjusting to physical life after leaving the Garden of Eden. It explores their children, particularly Cain and Abel, and how Satan's influence continued to affect subsequent generations.",
    "Explains Jesus' mission as the second Adam, sent to restore the original purpose that Adam and Eve failed to achieve. The chapter explores his lineage, relationship with John the Baptist, and how his crucifixion prevented the completion of that mission.",
    "Discusses God's continued efforts to establish the Kingdom of Heaven following Jesus' death. It explains the need for a third Adam and Eve to restore the original heavenly family and complete the mission left unfinished by Jesus.",
    "Explores the spiritual lineage connecting Adam and Eve to Jesus and the eventual appearance of the third Adam. It describes how the requirements for restoration developed over generations and why Korea became the chosen location for the next stage of God's plan.",
    "Explains the importance of establishing a spiritually pure man and woman who could fulfill God's original purpose. The chapter discusses Korea's selection, the restoration of the True Parents, and the distinction between paradise and the Kingdom of Heaven.",
    "Examines Jesus' promise to return and complete his unfinished mission on Earth. The author identifies Reverend Sun Myung Moon as the third Adam, describing his spiritual encounter with Jesus and his responsibility to continue the work of restoration.",
    "Explores the spiritual structure of creation, the roles of God, angels, and humanity, and Satan's attempts to establish an opposing kingdom. It also discusses the author's belief that America and its national leaders have a special responsibility in preparing the world for God's Kingdom.",
    "Draws parallels between God's original Constitution and the founding principles of the United States. It presents America's Declaration of Independence and Constitution as spiritually inspired foundations intended to support freedom and the establishment of God's Kingdom on Earth.",
    "Explains God's original vision of a harmonious universe where the spiritual and physical worlds exist in unity. It emphasizes absolute faith, love, and obedience as the guiding principles for humanity's spiritual growth and eternal relationship with God.",
    "Summarizes humanity's ultimate purpose as fulfilling God's Constitution through spiritual perfection, family, and responsible dominion over creation. It connects this mission to America's spiritual responsibility and the preparation needed to enter the Kingdom of Heaven.",
  ];

  function chapterAnswer(number) {
    const titleText = chapters[number - 1];
    const path = number <= 5 ? "Foundations, chapters 1–5" : number <= 10 ? "Restoration, chapters 6–10" : "Nation and Purpose, chapters 11–14";
    const essay = number <= 5 ? ["article-divine-order.html", "Foundations essay"] : number <= 10 ? ["article-second-adam.html", "Second Adam essay"] : ["article-america.html", "America essay"];
    return {
      paragraphs: [
        "Chapter " + String(number).padStart(2, "0") + " is “" + titleText + ".” " + chapterSummaries[number - 1],
        "It sits in " + path + ".",
      ],
      links: [
        ["chapters.html#chapter-" + String(number).padStart(2, "0"), "Open this chapter"],
        essay,
        ["quiz.html", "Find your starting chapter"],
      ],
      chips: ["Where should I start?", "What is the book about?"],
    };
  }

  function resolve(raw) {
    const query = normalize(raw);
    if (!query) {
      return welcome;
    }
    if (/^(hi|hello|hey|good morning|good evening)\b/.test(query) && query.length < 42) {
      return {
        paragraphs: ["Hello. Ask about the manuscript, a chapter number, the quiz, or how to reach the author."],
        links: [],
        chips: welcome.chips,
      };
    }
    if (/^thanks?\b|^thank you\b/.test(query)) {
      return {
        paragraphs: ["You’re welcome. The chapter list and the quiz are the fastest next steps."],
        links: [
          ["quiz.html", "Reader quiz"],
          ["chapters.html", "Chapters"],
        ],
        chips: welcome.chips,
      };
    }
    const chapter = chapterNumber(query);
    if (chapter >= 1 && chapter <= 14) {
      return chapterAnswer(chapter);
    }

    const ranked = knowledge
      .map((entry) => {
        let score = 0;
        entry.keywords.forEach((keyword) => {
          if (query.includes(keyword)) {
            score += keyword.split(" ").length + 1;
          }
        });
        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
      return {
        paragraphs: [
          "I can answer from this site: the book’s argument, any chapter by number, the quiz, the reviews, the journal, the author, and how to get in touch.",
        ],
        links: [
          ["book.html", "Book overview"],
          ["contact.html", "Contact"],
        ],
        chips: welcome.chips,
      };
    }

    const best = ranked[0].entry;
    const answer = {
      paragraphs: best.paragraphs.slice(),
      links: best.links.slice(),
      chips: best.chips.slice(),
    };
    if (ranked[1] && ranked[0].score - ranked[1].score <= 1) {
      answer.paragraphs.push("Also on this site: " + ranked[1].entry.title + ".");
      if (ranked[1].entry.links[0]) {
        answer.links.push(ranked[1].entry.links[0]);
      }
    }
    return answer;
  }

  const defaultQuestions = welcome.chips.slice();
  const questionStore = "reading-guide-questions";

  function readStoredQuestions() {
    try {
      const raw = window.localStorage.getItem(questionStore);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      const cleaned = parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
      return cleaned.length ? cleaned : null;
    } catch (error) {
      return null;
    }
  }

  let questions = readStoredQuestions() || defaultQuestions.slice();
  welcome.chips = questions.slice();
  let questionAt = 0;
  let started = false;
  let settingsOpen = false;

  function wait(ms) {
    return prefersReducedMotion() ? 0 : ms;
  }

  function showTyping() {
    const pending = document.createElement("p");
    pending.className = "guide-msg guide-msg--bot guide-msg--typing";
    pending.textContent = "···";
    log.appendChild(pending);
    log.scrollTop = log.scrollHeight;
    return pending;
  }

  function writeQuestion() {
    log.replaceChildren();
    if (questionAt >= questions.length) {
      return;
    }
    const text = questions[questionAt];
    const pending = showTyping();
    window.setTimeout(() => {
      if (!pending.isConnected) {
        return;
      }
      pending.remove();
      log.replaceChildren();
      addMessage("bot", { paragraphs: [text], links: [] });
      input.focus();
    }, wait(650));
  }

  function ask(text) {
    const cleaned = text.trim();
    if (!cleaned || questionAt >= questions.length) {
      return;
    }
    questionAt += 1;
    writeQuestion();
  }

  function questionField(value) {
    const row = document.createElement("div");
    row.className = "guide-settings-row";
    const field = document.createElement("input");
    field.type = "text";
    field.maxLength = 160;
    field.value = value;
    field.placeholder = "Question";
    field.setAttribute("aria-label", "Question");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "guide-settings-remove";
    remove.setAttribute("aria-label", "Remove question");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      if (settingsList.children.length <= 1) {
        field.value = "";
        field.focus();
        return;
      }
      row.remove();
    });
    row.append(field, remove);
    return row;
  }

  function renderQuestionFields(list) {
    settingsList.replaceChildren();
    (list.length ? list : [""]).forEach((text) => {
      settingsList.appendChild(questionField(text));
    });
  }

  function collectQuestions() {
    return Array.from(settingsList.querySelectorAll("input"))
      .map((field) => field.value.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  function applyQuestions(list) {
    questions = list.slice();
    welcome.chips = questions.slice();
    questionAt = 0;
    started = true;
    writeQuestion();
  }

  function setSettings(open) {
    settingsOpen = open;
    settingsView.hidden = !open;
    log.hidden = open;
    form.hidden = open;
    settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    settingsStatus.textContent = "";
    if (open) {
      renderQuestionFields(questions);
      const first = settingsList.querySelector("input");
      if (first) {
        first.focus();
      }
    } else {
      input.focus();
    }
  }

  function setOpen(open) {
    panel.hidden = !open;
    root.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      lastFocus = document.activeElement;
      if (!started) {
        started = true;
        writeQuestion();
      }
    } else {
      if (settingsOpen) {
        settingsOpen = false;
        settingsView.hidden = true;
        log.hidden = false;
        form.hidden = false;
        settingsBtn.setAttribute("aria-expanded", "false");
      }
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }
  }

  launcher.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  settingsBtn.addEventListener("click", () => setSettings(!settingsOpen));

  addQuestion.addEventListener("click", () => {
    if (settingsList.children.length >= 8) {
      settingsStatus.textContent = "Eight questions is the limit.";
      return;
    }
    const row = questionField("");
    settingsList.appendChild(row);
    row.querySelector("input").focus();
    settingsList.scrollTop = settingsList.scrollHeight;
  });

  saveQuestionsBtn.addEventListener("click", () => {
    const next = collectQuestions();
    if (!next.length) {
      settingsStatus.textContent = "Add at least one question.";
      return;
    }
    try {
      window.localStorage.setItem(questionStore, JSON.stringify(next));
    } catch (error) {
      settingsStatus.textContent = "Could not save on this browser.";
      return;
    }
    applyQuestions(next);
    setSettings(false);
  });

  resetQuestionsBtn.addEventListener("click", () => {
    try {
      window.localStorage.removeItem(questionStore);
    } catch (error) {
      /* keep the default list either way */
    }
    applyQuestions(defaultQuestions.slice());
    setSettings(false);
  });

  close.addEventListener("click", () => {
    setSettings(false);
    setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (panel.contains(event.target) || launcher.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      if (settingsOpen) {
        setSettings(false);
        return;
      }
      setOpen(false);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value;
    input.value = "";
    ask(text);
  });
})();

(function initButtonPress() {
  const selector = [
    "a.btn",
    "button.btn",
    ".header-cta",
    ".entry-link",
    ".inside-link",
    ".qa-btn",
    ".cta-btn",
    ".contact-form button",
    ".newsletter-form button",
    ".guide-form button",
    ".quiz-options button",
    ".quiz-back",
    ".guide-chips button",
    ".guide-launcher",
    ".nav-links a.nav-quiz",
    ".footer-write",
    ".pillar-link",
  ].join(",");

  const timers = new WeakMap();

  const hold = (el) => {
    const prev = timers.get(el);
    if (prev) {
      window.clearTimeout(prev);
    }
    timers.set(
      el,
      window.setTimeout(() => {
        el.classList.remove("is-pressing");
      }, 700)
    );
  };

  document.addEventListener("pointerdown", (event) => {
    const el = event.target.closest(selector);
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--press-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--press-y", `${event.clientY - rect.top}px`);
    const prev = timers.get(el);
    if (prev) {
      window.clearTimeout(prev);
    }
    el.classList.add("is-pressing");
  });

  document.addEventListener("pointerup", (event) => {
    const el = event.target.closest(selector);
    if (!el || !el.classList.contains("is-pressing")) {
      return;
    }
    hold(el);
  });

  document.addEventListener("pointercancel", (event) => {
    const el = event.target.closest(selector);
    if (!el) {
      return;
    }
    hold(el);
  });

  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const el = event.target.closest(selector);
      if (!el || el.tagName !== "A" || prefersReducedMotion()) {
        return;
      }
      if (el.target && el.target !== "_self") {
        return;
      }
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      event.preventDefault();
      el.classList.add("is-pressing");
      const prev = timers.get(el);
      if (prev) {
        window.clearTimeout(prev);
      }
      window.setTimeout(() => {
        window.location.href = el.href;
      }, 720);
    },
    true
  );
})();

(function initChapterDrops() {
  const drops = document.querySelectorAll(".chapter-drop");
  if (!drops.length) return;

  const openFromHash = () => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const card = document.getElementById(id);
    const drop = card && card.querySelector(".chapter-drop");
    if (drop) drop.open = true;
  };

  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();

(function initCoverStage() {
  const root = document.querySelector("[data-cover-stage]");
  if (!root) {
    return;
  }
  const figures = [...root.querySelectorAll(".cover-stage__visual figure")];
  const stories = [...root.querySelectorAll(".cover-stage__stories article")];
  const now = root.querySelector("[data-cover-now]");
  const total = root.querySelector("[data-cover-total]");
  const pauseBtn = root.querySelector("[data-cover-pause]");
  const count = figures.length;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = 5200;
  let index = 0;
  let timer = 0;
  let paused = reduce;
  let live = false;

  if (total) {
    total.textContent = "/ " + String(count).padStart(2, "0");
  }

  const loadFigure = (figure) => {
    const img = figure && figure.querySelector("img[data-src]");
    if (!img) return;
    img.src = img.getAttribute("data-src");
    img.removeAttribute("data-src");
  };

  const show = (next) => {
    index = (next + count) % count;
    if (live) {
      loadFigure(figures[index]);
      loadFigure(figures[(index + 1) % count]);
    }
    figures.forEach((figure, i) => {
      const on = i === index;
      figure.classList.toggle("is-on", on);
      figure.toggleAttribute("aria-hidden", !on);
    });
    stories.forEach((story, i) => {
      const on = i === index;
      story.classList.toggle("is-on", on);
      story.toggleAttribute("aria-hidden", !on);
      if (on) story.removeAttribute("inert");
      else story.setAttribute("inert", "");
    });
    if (now) {
      now.textContent = String(index + 1).padStart(2, "0");
    }
    const meter = root.querySelector(".cover-stage__meter span");
    if (meter) {
      meter.style.animation = "none";
      void meter.offsetWidth;
      meter.style.animation = "";
    }
  };

  const queue = () => {
    window.clearTimeout(timer);
    if (paused || document.hidden) {
      return;
    }
    timer = window.setTimeout(() => {
      show(index + 1);
      queue();
    }, wait);
  };

  const setPaused = (value) => {
    paused = value;
    root.classList.toggle("is-paused", paused);
    root.classList.toggle("is-running", !paused);
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
      pauseBtn.setAttribute("aria-label", paused ? "Play" : "Pause");
      pauseBtn.classList.toggle("is-play", paused);
    }
    if (paused) {
      window.clearTimeout(timer);
    } else {
      queue();
    }
  };

  root.querySelector("[data-cover-prev]")?.addEventListener("click", () => {
    live = true;
    show(index - 1);
    queue();
  });
  root.querySelector("[data-cover-next]")?.addEventListener("click", () => {
    live = true;
    show(index + 1);
    queue();
  });
  pauseBtn?.addEventListener("click", () => setPaused(!paused));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearTimeout(timer);
    } else if (!paused && live) {
      queue();
    }
  });

  show(0);
  if ("IntersectionObserver" in window) {
    const watch = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => {
        const box = entry.boundingClientRect;
        return entry.isIntersecting && box.height > 40 && box.top < window.innerHeight + 180;
      });
      if (!visible) return;
      watch.disconnect();
      live = true;
      loadFigure(figures[index]);
      loadFigure(figures[(index + 1) % count]);
      setPaused(paused);
    }, { rootMargin: "160px" });
    watch.observe(root);
  } else {
    setPaused(paused);
  }
})();

(function initTrailer() {
  const screen = document.querySelector("[data-trailer]");
  if (!screen || screen.dataset.trailerReady === "true") return;
  screen.dataset.trailerReady = "true";
  const video = screen.querySelector(".trailer-stage__video");
  const frame = screen.querySelector(".trailer-stage__embed");
  const plate = screen.querySelector("[data-trailer-plate]");
  const status = screen.querySelector("[data-trailer-status]");
  const start = screen.querySelector("[data-trailer-start]");
  const retry = screen.querySelector("[data-trailer-retry]");
  if (!video || !plate || !start) return;

  let source = null;
  let loadToken = 0;

  const resolveSource = (url) => {
    const value = String(url || "").trim();
    if (!value) return null;
    const file = value.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    const query = value.match(/[?&]id=([^&#]+)/i);
    const driveHost = /drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com/i.test(value);
    const id = file ? file[1] : (driveHost && query ? query[1] : "");
    if (id) {
      return {
        kind: "embed",
        src: "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/preview",
      };
    }
    if (/\.(mp4|webm|ogg)(?:[?#]|$)/i.test(value) || value.includes("drive.usercontent.google.com")) {
      return { kind: "video", src: value };
    }
    return { kind: "embed", src: value };
  };

  const setStatus = (message, mode) => {
    if (status) status.textContent = message;
    plate.hidden = false;
    plate.dataset.mode = mode || "ready";
    if (retry) retry.hidden = mode !== "error";
    start.hidden = mode === "loading";
    video.inert = true;
  };

  const showPlaying = () => {
    plate.hidden = true;
    plate.dataset.mode = "playing";
    video.inert = false;
  };

  const pauseMusic = () => {
    if (window.SiteAudio) window.SiteAudio.pause();
  };

  const playCurrent = async () => {
    const token = ++loadToken;
    if (!source) {
      setStatus("The trailer file is missing.", "error");
      return;
    }
    setStatus("Loading trailer…", "loading");
    pauseMusic();
    if (source.kind === "embed") {
      video.pause();
      video.hidden = true;
      video.removeAttribute("src");
      video.load();
      if (!frame) {
        setStatus("The trailer could not be opened.", "error");
        return;
      }
      frame.hidden = false;
      const onLoad = () => {
        frame.removeEventListener("load", onLoad);
        if (token !== loadToken) return;
        showPlaying();
      };
      frame.addEventListener("load", onLoad);
      frame.src = source.src;
      window.setTimeout(() => {
        if (token !== loadToken || plate.hidden) return;
        setStatus("The trailer is taking longer than expected. Try again, or open the original file.", "error");
      }, 12000);
      return;
    }
    if (frame) {
      frame.hidden = true;
      frame.removeAttribute("src");
    }
    video.hidden = false;
    video.referrerPolicy = "no-referrer";
    if (video.getAttribute("src") !== source.src) {
      video.src = source.src;
      video.load();
    }
    try {
      const pending = video.play();
      if (pending && typeof pending.then === "function") await pending;
      if (token !== loadToken) return;
      showPlaying();
    } catch (error) {
      if (token !== loadToken) return;
      const name = error && error.name;
      if (name === "NotAllowedError" || name === "AbortError") {
        setStatus("Press Play trailer to start the video.", "ready");
        return;
      }
      setStatus("The trailer could not be played. Try again, or open the original file.", "error");
    }
  };

  video.addEventListener("playing", () => {
    if (source && source.kind === "video") showPlaying();
  });
  video.addEventListener("waiting", () => {
    if (video.currentTime > 0 || plate.hidden) return;
    setStatus("Loading trailer…", "loading");
  });
  video.addEventListener("error", () => {
    if (!video.getAttribute("src")) return;
    setStatus("The trailer could not be played. Try again, or open the original file.", "error");
  });
  video.addEventListener("ended", () => {
    video.currentTime = 0;
    setStatus("Play the trailer again.", "ready");
    start.hidden = false;
    start.textContent = "Play trailer";
  });
  video.addEventListener("play", pauseMusic);
  start.addEventListener("click", playCurrent);
  if (retry) retry.addEventListener("click", () => {
    video.removeAttribute("src");
    video.load();
    playCurrent();
  });

  window.SiteTrailer = {
    setSource(url) {
      const next = resolveSource(url);
      const unchanged = source && next && source.kind === next.kind && source.src === next.src;
      source = next;
      if (unchanged) return;
      loadToken += 1;
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (frame) {
        frame.hidden = true;
        frame.removeAttribute("src");
      }
      video.hidden = !source || source.kind === "embed";
      if (!source) {
        setStatus("The trailer file is missing.", "error");
        return;
      }
      setStatus("Mark Steffen Video Trailer", "ready");
      start.hidden = false;
      start.textContent = "Play trailer";
    },
  };

  window.SiteTrailer.setSource(screen.getAttribute("data-trailer-src"));
})();
