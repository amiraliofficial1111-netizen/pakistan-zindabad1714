(function initPost() {
  const title = document.querySelector("[data-post-title]");
  if (!title || !window.SiteJournal) return;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || "";
  const body = document.querySelector("[data-post-body]");
  const excerpt = document.querySelector("[data-post-excerpt]");
  const meta = document.querySelector("[data-post-meta]");
  const crumb = document.querySelector("[data-post-crumb]");

  function missing() {
    title.textContent = "This post was not found";
    excerpt.textContent = "It may have been removed, or the address is missing the post name.";
    body.innerHTML = '<p><a href="blogs.html">Return to blogs</a></p>';
  }

  Promise.all([window.SiteJournal.loadBlogs(), window.SiteJournal.loadJournal()])
    .then(([blogs, journal]) => {
      const blogPost = blogs.find((item) => item.slug === slug);
      const journalPost = journal.find((item) => item.slug === slug);
      const post = blogPost || journalPost;
      if (!post) {
        missing();
        return;
      }
      if (post.href && !(post.body && post.body.trim())) {
        window.location.replace(post.href);
        return;
      }
      const home = blogPost ? "blogs.html" : "journal.html";
      const homeLabel = blogPost ? "Back to blogs" : "Back to the journal";
      document.title = `${post.title} | Mark H Steffen`;
      title.textContent = post.title;
      excerpt.textContent = post.excerpt;
      crumb.textContent = post.title;
      meta.textContent = `Mark H Steffen · ${window.SiteJournal.formatDate(post.date)}`;
      body.innerHTML = window.SiteJournal.renderBody(post.body || "");
      const back = document.createElement("p");
      back.innerHTML = `<a href="${home}">${homeLabel}</a>`;
      body.append(back);
    })
    .catch(missing);
})();
