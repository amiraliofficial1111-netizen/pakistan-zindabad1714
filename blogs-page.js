(function initBlogPages() {
  const grid = document.querySelector("[data-blog-pages]");
  const pager = document.querySelector("[data-blog-pager]");
  if (!grid || !window.SiteJournal) return;

  const perPage = 6;
  const pageCount = 5;
  let cards = [];
  let pages = pageCount;
  let emptyNote = null;

  const pageFromLocation = () => {
    const value = Number(new URLSearchParams(window.location.search).get("page"));
    if (!Number.isInteger(value) || value < 1) return 1;
    return Math.min(value, pages);
  };

  const hrefFor = (page) => (page <= 1 ? "blogs.html" : "blogs.html?page=" + page);

  const control = (label, page, disabled) => {
    if (disabled) {
      return '<span class="blog-pager__control" aria-disabled="true">' + label + "</span>";
    }
    return '<a class="blog-pager__control" href="' + hrefFor(page) + '">' + label + "</a>";
  };

  const render = (page) => {
    const start = (page - 1) * perPage;
    cards.forEach((card, index) => {
      card.hidden = index < start || index >= start + perPage;
    });

    const visible = cards.filter((card) => !card.hidden).length;
    if (!emptyNote) {
      emptyNote = document.createElement("p");
      emptyNote.className = "page-lead";
      emptyNote.dataset.blogEmpty = "";
      emptyNote.textContent = "No blogs on this page yet.";
      grid.after(emptyNote);
    }
    emptyNote.hidden = visible > 0;

    if (!pager) return;

    const numbers = [];
    for (let index = 1; index <= pages; index += 1) {
      const current = index === page ? ' aria-current="page"' : "";
      numbers.push(
        '<a class="blog-pager__page" href="' + hrefFor(index) + '"' + current + ">" + index + "</a>"
      );
    }

    pager.hidden = false;
    pager.innerHTML =
      control("Previous", page - 1, page === 1) +
      numbers.join("") +
      control("Next", page + 1, page === pages);
  };

  const show = (page, updateHistory) => {
    const next = Math.min(pages, Math.max(1, page));
    render(next);
    if (!updateHistory) return;
    const url = hrefFor(next);
    if (window.location.pathname.endsWith("blogs.html") || window.location.pathname.endsWith("/")) {
      history.pushState({ blogPage: next }, "", url);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    grid.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  if (pager) {
    pager.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link || !pager.contains(link)) return;
      event.preventDefault();
      const value = Number(new URL(link.href, window.location.href).searchParams.get("page"));
      show(value || 1, true);
    });
  }

  window.addEventListener("popstate", () => {
    show(pageFromLocation(), false);
  });

  window.SiteJournal.loadBlogs()
    .then((posts) => {
      grid.replaceChildren(...posts.map(window.SiteJournal.card));
      cards = [...grid.querySelectorAll(":scope > .journal-card")];
      pages = Math.max(pageCount, Math.ceil(cards.length / perPage));
      show(pageFromLocation(), false);
    })
    .catch(() => {
      grid.innerHTML = "<p class=\"page-lead\">Blogs are unavailable right now.</p>";
    });
})();
