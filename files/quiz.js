(function initReaderQuiz() {
  const root = document.getElementById("quizApp");
  if (!root) {
    return;
  }

  const intro = document.getElementById("quizIntro");
  const run = document.getElementById("quizRun");
  const result = document.getElementById("quizResult");
  const prompt = document.getElementById("quizPrompt");
  const options = document.getElementById("quizOptions");
  const progress = document.getElementById("quizProgress");
  const bar = document.getElementById("quizBar");
  const barFill = document.getElementById("quizBarFill");
  const back = document.getElementById("quizBack");
  const start = document.getElementById("quizStart");

  const questions = [
    {
      prompt: "What question brought you here?",
      options: [
        { label: "How faith and a public life can belong in one argument", scores: { foundations: 2, nation: 1, full: 1 }, lean: "foundations" },
        { label: "Who Jesus is in the longer human story", scores: { restoration: 3, full: 1 }, lean: "restoration" },
        { label: "What America is for", scores: { nation: 3, foundations: 1 }, lean: "nation" },
        { label: "I want the whole argument, from the first page", scores: { full: 3, foundations: 1 }, lean: "full" },
      ],
    },
    {
      prompt: "How do you like to enter a serious book?",
      options: [
        { label: "At the foundation, before the later claims", scores: { foundations: 2, full: 1 }, lean: "foundations" },
        { label: "Where the story turns", scores: { restoration: 2 }, lean: "restoration" },
        { label: "At the question I already have", scores: { nation: 1, restoration: 1 }, lean: "nation" },
        { label: "Straight through, with nothing skipped", scores: { full: 3 }, lean: "full" },
      ],
    },
    {
      prompt: "Where will you read?",
      options: [
        { label: "Alone, at my own pace", scores: { full: 1, foundations: 1 }, lean: "full" },
        { label: "With a church or study group", scores: { foundations: 1, full: 2 }, lean: "full" },
        { label: "In a class or seminar", scores: { full: 2, foundations: 1 }, lean: "full" },
        { label: "While preparing to teach or speak", scores: { restoration: 1, nation: 1, full: 1 }, lean: "full" },
      ],
    },
    {
      prompt: "How much time do you have for a first sitting?",
      options: [
        { label: "One chapter", scores: { foundations: 1, restoration: 1, nation: 1 }, lean: "foundations" },
        { label: "A short arc, about five chapters", scores: { foundations: 1, restoration: 1, nation: 1 }, lean: "foundations" },
        { label: "The full manuscript", scores: { full: 3 }, lean: "full" },
      ],
    },
    {
      prompt: "Which language feels most like yours?",
      options: [
        { label: "Scripture, covenant, and creation", scores: { foundations: 2, restoration: 1 }, lean: "foundations" },
        { label: "Christ, lineage, and return", scores: { restoration: 3 }, lean: "restoration" },
        { label: "Constitution and civic purpose", scores: { nation: 3 }, lean: "nation" },
        { label: "All three, held in one frame", scores: { full: 2, foundations: 1 }, lean: "full" },
      ],
    },
    {
      prompt: "What do you want in hand when you finish?",
      options: [
        { label: "A clearer account of purpose", scores: { foundations: 1, nation: 1, full: 1 }, lean: "full" },
        { label: "A way to talk about Christ and restoration", scores: { restoration: 3 }, lean: "restoration" },
        { label: "A frame for national responsibility", scores: { nation: 3 }, lean: "nation" },
        { label: "A map I can teach", scores: { full: 2, foundations: 1 }, lean: "full" },
      ],
    },
  ];

  const results = {
    foundations: {
      kicker: "The book you should read",
      title: "The Constitution of God",
      path: "Start with Foundations",
      why: "Your answers point to the opening movement. The manuscript does not begin with America. Chapters 1 through 5 establish the original constitution, the fall, and the early framework the later chapters depend on.",
      plan: [
        "Read chapter 1, The Original Constitution of God, and write the claim about God in one sentence.",
        "Continue through chapter 5, Adam and Eve’s Life After the Garden, before you open the civic chapters.",
        "Then use the essay on divine constitutional order to test whether you can say the opening argument in plain language.",
      ],
      links: [
        ["chapters.html", "Open the chapter list", true],
        ["article-divine-order.html", "Read the foundations essay", false],
        ["book.html", "Book overview", false],
      ],
    },
    restoration: {
      kicker: "The book you should read",
      title: "The Constitution of God",
      path: "Start with the Second Adam",
      why: "Your answers point to the hinge. Chapter 6, Jesus as the Second Adam, is where the table of contents turns from fall to restoration, lineage, and return. Begin there, then walk backward into the fall and forward through chapter 10.",
      plan: [
        "Read chapter 6 before you debate the titles that follow it.",
        "Stay with chapters 6 through 10: Christ, the lineage chain, and the claim that Jesus must return.",
        "When the middle arc is clear, go back to chapter 1 so the restoration has a constitution to restore.",
      ],
      links: [
        ["chapters.html", "Open the chapter list", true],
        ["article-second-adam.html", "Read the Second Adam essay", false],
        ["reviews.html", "Read the editorial reviews", false],
      ],
    },
    nation: {
      kicker: "The book you should read",
      title: "The Constitution of God",
      path: "Start with nation and purpose",
      why: "Your answers point to the last movement. Chapters 11 through 14 move from the makeup of creation to the American constitution, God’s desire, and the purpose of life. Enter there if that is your live question, and treat it as the sequel to an argument that began earlier.",
      plan: [
        "Start at chapter 11, The Makeup of Creation, not at a headline about the nation.",
        "Read chapter 12, The American Constitution, as an echo of a prior order, then chapters 13 and 14 on desire.",
        "Go back to chapters 1 through 3 before you teach the ending. The echo is only as clear as the voice it repeats.",
      ],
      links: [
        ["chapters.html", "Open the chapter list", true],
        ["article-america.html", "Read the America essay", false],
        ["contact.html", "Ask about a speaking date", false],
      ],
    },
    full: {
      kicker: "The book you should read",
      title: "The Constitution of God",
      path: "Read the full arc",
      why: "Your answers point to the whole volume. One manuscript, fourteen chapters, in order. The three paths on this site — foundations, restoration, and nation — are doors, not separate books. For you, the right door is chapter 1, and the right finish is chapter 14.",
      plan: [
        "Begin with chapter 1 and keep the author’s pace: one constitutional claim at a time.",
        "Mark the turns at chapter 6 and chapter 11 so a group, or a later you, can find the hinges.",
        "Use the group-reading essay if other people will walk the fourteen chapters with you.",
      ],
      links: [
        ["chapters.html", "Open the chapter list", true],
        ["article-reading-groups.html", "How a group can read it", false],
        ["contact.html#newsletter", "Release notes", false],
      ],
    },
  };

  let step = 0;
  const answers = [];

  function show(section) {
    intro.hidden = section !== intro;
    run.hidden = section !== run;
    result.hidden = section !== result;
  }

  function renderQuestion() {
    const question = questions[step];
    progress.textContent = "Question " + (step + 1) + " of " + questions.length;
    bar.setAttribute("aria-valuenow", String(step + 1));
    bar.setAttribute("aria-valuemax", String(questions.length));
    barFill.style.width = ((step + 1) / questions.length) * 100 + "%";
    prompt.textContent = question.prompt;
    options.replaceChildren();
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.addEventListener("click", () => choose(index));
      options.appendChild(button);
    });
    back.disabled = step === 0;
    show(run);
    prompt.focus();
  }

  function choose(index) {
    answers[step] = index;
    if (step < questions.length - 1) {
      step += 1;
      renderQuestion();
      return;
    }
    const scores = { foundations: 0, restoration: 0, nation: 0, full: 0 };
    const leans = [];
    answers.forEach((choice, questionIndex) => {
      const option = questions[questionIndex].options[choice];
      Object.keys(option.scores).forEach((key) => {
        scores[key] += option.scores[key];
      });
      if (questionIndex === 0 || questionIndex === 4 || questionIndex === 5) {
        leans.push(option.lean);
      }
    });
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top = ranked[0][1];
    const tied = ranked.filter((entry) => entry[1] === top).map((entry) => entry[0]);
    let winner = tied[0];
    leans.some((lean) => {
      if (tied.includes(lean)) {
        winner = lean;
        return true;
      }
      return false;
    });
    showResult(winner, true);
  }

  function showResult(key, updateHash) {
    const item = results[key];
    if (!item) {
      return;
    }
    result.replaceChildren();
    const kicker = document.createElement("p");
    kicker.className = "hub-kicker";
    kicker.textContent = item.kicker;
    const title = document.createElement("h2");
    title.id = "quizResultTitle";
    title.textContent = item.title;
    const path = document.createElement("p");
    path.className = "path-name";
    path.textContent = item.path;
    const why = document.createElement("p");
    why.textContent = item.why;
    const plan = document.createElement("ol");
    plan.className = "quiz-plan";
    item.plan.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      plan.appendChild(li);
    });
    const actions = document.createElement("div");
    actions.className = "quiz-actions";
    item.links.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link[0];
      anchor.className = link[2] ? "btn btn-primary" : "btn btn-secondary";
      anchor.textContent = link[1];
      actions.appendChild(anchor);
    });
    const again = document.createElement("button");
    again.type = "button";
    again.className = "quiz-back";
    again.textContent = "Take the quiz again";
    again.addEventListener("click", () => {
      step = 0;
      answers.length = 0;
      if (history.replaceState) {
        history.replaceState(null, "", location.pathname);
      }
      show(intro);
      start.focus();
    });
    result.append(kicker, title, path, why, plan, actions, again);
    show(result);
    if (updateHash && history.replaceState) {
      history.replaceState(null, "", "#" + key);
    }
    title.setAttribute("tabindex", "-1");
    title.focus();
  }

  start.addEventListener("click", () => {
    step = 0;
    answers.length = 0;
    renderQuestion();
  });

  back.addEventListener("click", () => {
    if (step === 0) {
      return;
    }
    step -= 1;
    renderQuestion();
  });

  const initial = location.hash.replace("#", "");
  if (results[initial]) {
    showResult(initial, false);
  }

  window.addEventListener("hashchange", () => {
    const key = location.hash.replace("#", "");
    if (results[key]) {
      showResult(key, false);
    }
  });
})();
