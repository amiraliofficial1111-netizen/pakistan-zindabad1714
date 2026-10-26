/* Add a published book by copying an object into BOOKS.
   Put the cover file in assets/, then set cover to that path.
   status: "In print" or "Forthcoming"
   href: a detail page, or "contact.html" when the book has no page yet.
   buy: a retailer URL. When set, the shelf shows a purchase button.
   featured: true opens that book first. Leave it on one volume.
   Order in this list is the order on the shelf.

   {
     id: "short-unique-id",
     title: "New Title",
     subtitle: "Optional line under the title",
     edition: "First edition",
     year: "2027",
     author: "Mark H Steffen",
     status: "Forthcoming",
     summary: "One or two sentences a reader can use.",
     href: "contact.html",
     cta: "Request a copy",
     cover: "assets/new-book-standing.webp",
     featured: false
   }
*/
const BOOKS = [
  {
    id: "constitution-of-god",
    title: "The Constitution of God",
    subtitle: "The Purpose of Life",
    edition: "Revised edition",
    year: "2026",
    author: "Mark H Steffen",
    status: "In print",
    summary:
      "Heaven, America, and the purpose of life, held in one constitutional and theological argument across fourteen chapters.",
    href: "book.html",
    cta: "Inside the book",
    buy: "https://a.co/d/0iWIUDML",
    buyLabel: "Buy on Amazon",
    cover: "assets/constitution-standing.webp?v=3",
    featured: true
  },
  {
    id: "guidebook-living-dying",
    title: "A Guidebook for Living and Dying",
    subtitle: "A companion volume",
    edition: "Author edition",
    year: "2026",
    author: "Mark H Steffen",
    status: "In print",
    summary:
      "A companion on how to live and how to meet death, written to be read with The Constitution of God.",
    href: "contact.html",
    cta: "Request a copy",
    cover: "assets/guidebook-standing.webp?v=3",
    featured: false
  }
];

(function initBookCatalog() {
  const mounts = document.querySelectorAll("[data-books-mount]");
  if (!mounts.length) {
    return;
  }

  const books = BOOKS.filter((book) => {
    if (!book || !book.id || !book.title || !book.cover) {
      console.warn("Skipped a book entry. id, title, and cover are required.", book);
      return false;
    }
    return true;
  });

  const lead = catalogLead(books);
  document.querySelectorAll("[data-books-lead]").forEach((node) => {
    node.textContent = lead;
  });

  mounts.forEach((mount) => {
    renderCatalog(mount, books);
    if (mount.hasAttribute("data-books-schema")) {
      writeBookSchema(books);
    }
  });
})();

function catalogLead(books) {
  if (!books.length) {
    return "The next volume will be listed here when it is published.";
  }
  const soon = books.filter((book) => book.status === "Forthcoming").length;
  const live = books.length - soon;
  const volume = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
  if (soon && live) {
    return `${volume(live, "volume")} in print and ${volume(soon, "title")} still forthcoming.`;
  }
  if (soon) {
    return `${volume(soon, "title")} forthcoming. Each one joins this shelf when it is published.`;
  }
  return `${volume(live, "volume")} in print. Newly published work is added to this shelf.`;
}

function renderCatalog(mount, books) {
  mount.replaceChildren();
  if (!books.length) {
    const empty = document.createElement("p");
    empty.className = "books-empty";
    empty.textContent = "The next volume will be listed here when it is published.";
    mount.append(empty);
    return;
  }

  const initial = books.find((book) => book.featured) || books[0];
  let selectedId = initial.id;
  let filter = "all";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const statuses = [...new Set(books.map((book) => book.status || "In print"))];

  const stage = document.createElement("div");
  stage.className = "books-stage";
  stage.id = mount.id ? `${mount.id}-stage` : "books-stage";

  const shelf = document.createElement("div");
  shelf.className = "books-shelf-wrap";

  mount.append(stage);
  if (statuses.length > 1) {
    mount.append(buildFilters(statuses, (next) => {
      filter = next;
      const visible = visibleBooks();
      if (!visible.some((book) => book.id === selectedId) && visible[0]) {
        selectedId = visible[0].id;
      }
      paint();
    }));
  }
  if (books.length > 1) {
    mount.append(shelf);
  }

  function visibleBooks() {
    if (filter === "all") {
      return books;
    }
    return books.filter((book) => (book.status || "In print") === filter);
  }

  function paint() {
    const selected = books.find((book) => book.id === selectedId) || books[0];
    stage.classList.remove("is-in");
    stage.replaceChildren(buildStage(selected));
    if (!reduceMotion) {
      requestAnimationFrame(() => stage.classList.add("is-in"));
    }
    shelf.replaceChildren(buildShelf(visibleBooks(), selected.id, (id) => {
      selectedId = id;
      paint();
    }));
  }

  paint();
}

function buildFilters(statuses, onChange) {
  const bar = document.createElement("div");
  bar.className = "books-filters";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Filter the shelf");
  const options = ["all", ...statuses];
  options.forEach((status, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "books-filter";
    button.textContent = status === "all" ? "All" : status;
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    button.addEventListener("click", () => {
      bar.querySelectorAll(".books-filter").forEach((item) => {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      onChange(status);
    });
    bar.append(button);
  });
  return bar;
}

function buildStage(book) {
  const artLink = document.createElement("a");
  artLink.className = "books-stage__art";
  artLink.href = book.href || "contact.html";
  const image = document.createElement("img");
  image.src = book.cover;
  image.alt = `${book.title}, cover`;
  image.width = book.coverWidth || 408;
  image.height = book.coverHeight || 503;
  image.decoding = "async";
  artLink.append(image);

  const copy = document.createElement("div");
  copy.className = "books-stage__copy";

  const kicker = document.createElement("p");
  kicker.className = "books-kicker";
  kicker.textContent = [book.edition, book.year].filter(Boolean).join(" · ");
  copy.append(kicker);

  const title = document.createElement("h3");
  title.textContent = book.title;
  copy.append(title);

  if (book.subtitle) {
    const subtitle = document.createElement("p");
    subtitle.className = "books-stage__sub";
    subtitle.textContent = book.subtitle;
    copy.append(subtitle);
  }

  if (book.summary) {
    const summary = document.createElement("p");
    summary.className = "books-stage__summary";
    summary.textContent = book.summary;
    copy.append(summary);
  }

  copy.append(buildMeta(book));

  const actions = document.createElement("div");
  actions.className = "books-stage__actions";
  if (book.buy) {
    actions.append(actionLink(book.buy, book.buyLabel || "Buy the book", "btn btn-primary"));
  }
  const detailClass = book.buy ? "btn btn-secondary" : "btn btn-primary";
  actions.append(actionLink(book.href || "contact.html", book.cta || "Request a copy", detailClass));
  if (!book.buy && (book.href || "contact.html") !== "contact.html") {
    actions.append(actionLink("contact.html", "Request a copy", "btn btn-secondary"));
  }
  copy.append(actions);

  const fragment = document.createDocumentFragment();
  fragment.append(artLink, copy);
  return fragment;
}

function buildShelf(books, selectedId, onSelect) {
  const list = document.createElement("ul");
  list.className = "books-shelf";
  list.setAttribute("aria-label", "Published books");
  books.forEach((book) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-card";
    if (book.id === selectedId) {
      button.classList.add("is-selected");
    }
    button.setAttribute("aria-pressed", book.id === selectedId ? "true" : "false");
    button.addEventListener("click", () => onSelect(book.id));

    const image = document.createElement("img");
    image.src = book.cover;
    image.alt = "";
    image.width = book.coverWidth || 408;
    image.height = book.coverHeight || 503;
    image.decoding = "async";
    image.loading = "lazy";

    const title = document.createElement("strong");
    title.textContent = book.title;

    const meta = document.createElement("span");
    meta.textContent = [book.status || "In print", book.year].filter(Boolean).join(" · ");

    button.append(image, title, meta);
    item.append(button);
    list.append(item);
  });
  return list;
}

function buildMeta(book) {
  const list = document.createElement("ul");
  list.className = "books-meta";
  [book.author, book.status || "In print"].filter(Boolean).forEach((label) => {
    const item = document.createElement("li");
    if (label === "Forthcoming") {
      item.className = "is-soon";
    }
    item.textContent = label;
    list.append(item);
  });
  return list;
}

function actionLink(href, label, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;
  link.textContent = label;
  if (/^https?:/i.test(href)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return link;
}

function writeBookSchema(books) {
  const existing = document.getElementById("books-schema");
  if (existing) {
    existing.remove();
  }
  const script = document.createElement("script");
  script.id = "books-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": books.map((book) => ({
      "@type": "Book",
      name: book.title,
      author: { "@type": "Person", name: book.author || "Mark H Steffen" },
      bookEdition: book.edition || undefined,
      datePublished: book.year || undefined,
      image: book.cover,
      description: book.summary || undefined,
      url: book.buy || undefined,
      offers: book.buy
        ? { "@type": "Offer", url: book.buy, availability: "https://schema.org/InStock" }
        : undefined,
      inLanguage: "en-US"
    }))
  });
  document.head.append(script);
}
