(function initSiteAudio() {
  if (window.SiteAudio && window.SiteMusic) return;

  const STORAGE_KEY = "constitutionMusicV1";
  const options = [
    {
      id: "off",
      title: "No music",
      note: "The corner music player stays hidden.",
    },
    {
      id: "bright-pop",
      title: "Music",
      note: "The site music.",
      src: "assets/audio/site-music.mp3",
    },
    {
      id: "synth-pop",
      title: "Synth pop",
      note: "A full synth-pop song with bass and a beat.",
      src: "assets/audio/synth-pop.mp3",
    },
    {
      id: "late-night",
      title: "Late night",
      note: "A full late-night groove with synth and horn.",
      src: "assets/audio/late-night.mp3",
    },
    {
      id: "night-groove",
      title: "Night groove",
      note: "A full slow groove with synth and bass. Free to use, no credit required.",
      src: "assets/audio/night-groove.mp3",
    },
    {
      id: "big-bridge",
      title: "Big bridge",
      note: "A full song with a steady beat. Free to use, no credit required.",
      src: "assets/audio/big-bridge.mp3",
    },
  ];

  const engine = {
    audio: null,
    token: 0,
    current: null,
    musicTrack: null,
    musicPosition: 0,
    status: "idle",
    error: "",
    booted: false,
    userStarted: false,
    cornerEnabled: true,
    lastSave: 0,
    libraryRoot: null,
    widget: null,
    shuffle: false,
  };

  function isAdminPage() {
    return document.body.classList.contains("is-admin-locked") || !!document.querySelector(".page-admin");
  }

  function readSaved() {
    try {
      const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  function save() {
    const track = engine.musicTrack;
    if (!track) return;
    const active = engine.current && engine.current.id === track.id && engine.audio;
    const position = active && Number.isFinite(engine.audio.currentTime)
      ? engine.audio.currentTime
      : engine.musicPosition;
    const playing = !!(active && engine.status === "playing");
    engine.musicPosition = Number.isFinite(position) ? position : 0;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: track.id,
        position: engine.musicPosition,
        playing: playing,
      }));
    } catch (error) {
      /* Storage can be unavailable in private modes. Playback still works. */
    }
  }

  function optionById(id) {
    return options.find((option) => option.id === id && option.src) || null;
  }

  function toMusicTrack(option) {
    return {
      id: "music:" + option.id,
      src: option.src,
      title: option.title,
      channel: "music",
      loop: true,
    };
  }

  function absoluteSrc(src) {
    return new URL(src, document.baseURI).href;
  }

  function ensureAudio() {
    if (engine.audio) return engine.audio;
    const audio = document.createElement("audio");
    audio.setAttribute("data-site-audio", "");
    audio.preload = "none";
    audio.className = "site-audio";
    document.body.appendChild(audio);
    audio.addEventListener("playing", () => {
      engine.status = "playing";
      if (engine.current && engine.current.channel === "music") {
        engine.userStarted = true;
        engine.musicPosition = audio.currentTime || 0;
      }
      save();
      render();
    });
    audio.addEventListener("pause", () => {
      if (engine.status === "loading" || engine.status === "error") return;
      engine.status = engine.current ? "paused" : "idle";
      if (engine.current && engine.current.channel === "music") {
        engine.musicPosition = Number.isFinite(audio.currentTime) ? audio.currentTime : engine.musicPosition;
      }
      save();
      render();
    });
    audio.addEventListener("ended", () => {
      if (engine.shuffle && engine.current && engine.current.channel !== "music") {
        const rows = libraryRows();
        const index = currentLibraryIndex();
        const pool = rows.filter((_, item) => item !== index);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) {
          playLibraryRow(pick);
          return;
        }
      }
      engine.status = "paused";
      save();
      render();
    });
    audio.addEventListener("waiting", () => {
      if (audio.paused || engine.status === "error") return;
      engine.status = "loading";
      render();
    });
    audio.addEventListener("timeupdate", () => {
      if (engine.current && engine.current.channel === "music" && Number.isFinite(audio.currentTime)) {
        engine.musicPosition = audio.currentTime;
        if (Date.now() - engine.lastSave > 1000) {
          engine.lastSave = Date.now();
          save();
        }
      }
      renderProgress();
    });
    audio.addEventListener("error", () => {
      if (!audio.getAttribute("src")) return;
      engine.status = "error";
      engine.error = "This audio file could not be loaded.";
      save();
      render();
    });
    engine.audio = audio;
    return audio;
  }

  function waitForMetadata(audio, token) {
    if (audio.readyState >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const done = () => {
        audio.removeEventListener("loadedmetadata", onReady);
        audio.removeEventListener("error", onError);
        resolve();
      };
      const onReady = () => done();
      const onError = () => {
        audio.removeEventListener("loadedmetadata", onReady);
        audio.removeEventListener("error", onError);
        reject(new Error("metadata"));
      };
      audio.addEventListener("loadedmetadata", onReady);
      audio.addEventListener("error", onError);
      window.setTimeout(() => {
        if (token !== engine.token) done();
      }, 8000);
    });
  }

  async function start(track, seek) {
    const audio = ensureAudio();
    const token = ++engine.token;
    const failedSame = engine.status === "error" && engine.current && engine.current.id === track.id;
    const src = absoluteSrc(track.src);
    const sameSrc = audio.getAttribute("data-src") === src && !failedSame;
    if (engine.current && engine.current.channel === "music" && track.channel !== "music") {
      engine.musicPosition = Number.isFinite(audio.currentTime) ? audio.currentTime : engine.musicPosition;
      save();
    }
    engine.current = track;
    engine.status = "loading";
    engine.error = "";
    render();
    audio.loop = !!track.loop;
    audio.volume = track.channel === "music" ? 0.45 : 1;
    try {
      if (!sameSrc) {
        audio.src = src;
        audio.setAttribute("data-src", src);
        audio.load();
        await waitForMetadata(audio, token);
      }
      if (token !== engine.token) return;
      if (Number.isFinite(seek) && Number.isFinite(audio.duration)) {
        const max = Math.max(0, audio.duration - 0.35);
        audio.currentTime = Math.min(Math.max(0, seek), max);
      }
      const pending = audio.play();
      if (pending && typeof pending.then === "function") await pending;
      if (token !== engine.token) return;
      engine.status = audio.paused ? "paused" : "playing";
      if (track.channel === "music") engine.userStarted = engine.status === "playing" || engine.userStarted;
      save();
      render();
    } catch (error) {
      if (token !== engine.token) return;
      const name = error && error.name;
      if (name === "NotAllowedError" || name === "AbortError") {
        engine.status = "paused";
        engine.error = "";
        render();
        return;
      }
      engine.status = "error";
      engine.error = "This audio file could not be played.";
      render();
    }
  }

  function play(track) {
    if (!track || !track.src) return Promise.resolve();
    const audio = ensureAudio();
    const same = engine.current && engine.current.id === track.id && audio.getAttribute("data-src") === absoluteSrc(track.src);
    if (same && engine.status === "playing") return Promise.resolve();
    const seek = track.channel === "music" && same ? undefined : (track.channel === "music" ? engine.musicPosition : undefined);
    const resumeAt = same && engine.status !== "error" ? undefined : seek;
    return start(track, same && engine.status !== "error" ? undefined : resumeAt);
  }

  function pause() {
    engine.token += 1;
    const audio = engine.audio;
    if (audio) {
      if (engine.current && engine.current.channel === "music" && Number.isFinite(audio.currentTime)) {
        engine.musicPosition = audio.currentTime;
      }
      audio.pause();
    }
    if (engine.status !== "error") engine.status = engine.current ? "paused" : "idle";
    save();
    render();
  }

  function musicIsCurrent() {
    return !!(engine.current && engine.musicTrack && engine.current.id === engine.musicTrack.id);
  }

  function renderProgress() {
    const audio = engine.audio;
    const duration = audio && Number.isFinite(audio.duration) ? audio.duration : 0;
    const time = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const ratio = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;
    const active = engine.status === "playing" || engine.status === "loading" || engine.status === "paused";
    if (engine.widget) {
      const bar = engine.widget.querySelector("[data-music-progress]");
      const meter = engine.widget.querySelector("[data-music-bar]");
      const show = musicIsCurrent() && active;
      if (bar) bar.style.transform = "scaleX(" + (show ? ratio : 0) + ")";
      if (meter) meter.setAttribute("aria-valuenow", String(Math.round((show ? ratio : 0) * 100)));
      const clock = engine.widget.querySelector("[data-music-time]");
      if (clock) clock.textContent = show ? formatTime(time) + (duration ? " / " + formatTime(duration) : "") : "0:00";
    }
    if (engine.libraryRoot) {
      const libraryTrack = engine.current && engine.current.channel !== "music";
      const show = libraryTrack && active;
      const shownRatio = show ? ratio : 0;
      const bar = engine.libraryRoot.querySelector("[data-audio-progress]");
      const meter = engine.libraryRoot.querySelector("[data-audio-bar]");
      if (bar) bar.style.transform = "scaleX(" + shownRatio + ")";
      if (meter) {
        meter.style.setProperty("--progress", String(shownRatio));
        meter.setAttribute("aria-valuenow", String(Math.round(shownRatio * 100)));
        meter.setAttribute("aria-valuetext", show ? formatTime(time) + (duration ? " of " + formatTime(duration) : "") : "0:00");
        meter.classList.toggle("is-idle", !show);
      }
      const clock = engine.libraryRoot.querySelector("[data-audio-time]");
      if (clock) clock.textContent = show ? formatTime(time) + (duration ? " / " + formatTime(duration) : "") : "0:00";
      const elapsed = engine.libraryRoot.querySelector("[data-audio-elapsed]");
      const total = engine.libraryRoot.querySelector("[data-audio-duration]");
      if (elapsed) elapsed.textContent = show ? formatTime(time) : "0:00";
      if (total) {
        const known = total.getAttribute("data-length");
        if (show && duration) total.textContent = formatTime(duration);
        else if (known) total.textContent = known;
        else total.textContent = "0:00";
      }
      const previous = engine.libraryRoot.querySelector("[data-audio-prev]");
      if (previous && libraryTrack) {
        const index = currentLibraryIndex();
        previous.disabled = index <= 0 && time <= 3;
      }
    }
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remain = total % 60;
    return minutes + ":" + String(remain).padStart(2, "0");
  }

  function renderWidget() {
    const widget = engine.widget;
    if (!widget) return;
    const playing = musicIsCurrent() && engine.status === "playing";
    const loading = musicIsCurrent() && engine.status === "loading";
    const failed = musicIsCurrent() && engine.status === "error";
    widget.classList.toggle("is-playing", playing);
    widget.classList.toggle("is-loading", loading);
    widget.classList.toggle("is-error", failed);
    widget.dataset.state = failed ? "error" : loading ? "loading" : playing ? "playing" : "paused";
    const status = widget.querySelector("[data-music-status]");
    const title = widget.querySelector("[data-music-title]");
    const playButton = widget.querySelector("[data-music-play]");
    const pauseButton = widget.querySelector("[data-music-pause]");
    const error = widget.querySelector("[data-music-error]");
    if (status) status.textContent = failed ? "Unavailable" : loading ? "Loading" : playing ? "Playing" : "Paused";
    if (title) title.textContent = engine.musicTrack ? engine.musicTrack.title : "Music";
    if (playButton) {
      const compact = window.matchMedia("(max-width: 700px)").matches;
      const active = playing || loading;
      playButton.disabled = compact ? false : active;
      const playLabel = playButton.querySelector("span");
      const playName = failed ? "Retry" : compact && active ? "Pause" : "Play";
      if (playLabel) playLabel.textContent = playName;
      playButton.setAttribute("aria-label", failed ? "Try music again" : playName === "Pause" ? "Pause Music" : "Play Music");
      playButton.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    if (pauseButton) {
      pauseButton.disabled = !playing && !loading;
      pauseButton.setAttribute("aria-pressed", !playing && !loading && engine.status === "paused" ? "true" : "false");
    }
    if (error) {
      error.hidden = !failed;
      error.textContent = failed ? (engine.error || "This audio file could not be played.") : "";
    }
    renderProgress();
  }

  function renderLibrary() {
    const root = engine.libraryRoot;
    if (!root) return;
    const now = root.querySelector("[data-audio-now]");
    root.querySelectorAll("[data-audio-id]").forEach((row) => {
      const on = engine.current && engine.current.channel !== "music" && row.getAttribute("data-audio-id") === engine.current.id;
      const playing = on && engine.status === "playing";
      const loading = on && engine.status === "loading";
      const failed = on && engine.status === "error";
      row.classList.toggle("is-active", !!on);
      row.classList.toggle("is-playing", playing);
      row.classList.toggle("is-loading", loading);
      row.classList.toggle("is-error", failed);
      const playButton = row.querySelector("[data-audio-play]");
      if (playButton) {
        const title = row.getAttribute("data-audio-title") || "sample";
        const active = playing || loading;
        playButton.disabled = false;
        if (!playButton.querySelector("svg")) {
          playButton.textContent = failed ? "Retry" : active ? "Pause" : "Play";
        }
        playButton.setAttribute("aria-label", (failed ? "Retry " : active ? "Pause " : "Play ") + title);
        playButton.setAttribute("aria-pressed", playing ? "true" : "false");
      }
    });
    const libraryTrack = engine.current && engine.current.channel !== "music";
    const panel = root.querySelector("[data-audio-panel]");
    const rows = libraryRows(root);
    const index = currentLibraryIndex(root);
    if (panel) {
      const active = libraryTrack && (engine.status === "playing" || engine.status === "loading");
      const failed = libraryTrack && engine.status === "error";
      panel.classList.toggle("is-playing", libraryTrack && engine.status === "playing");
      panel.classList.toggle("is-loading", active && engine.status === "loading");
      panel.classList.toggle("is-error", failed);
      const kicker = panel.querySelector("[data-audio-kicker]");
      const meta = panel.querySelector("[data-audio-meta]");
      const toggle = panel.querySelector("[data-audio-toggle]");
      const prev = panel.querySelector("[data-audio-prev]");
      const next = panel.querySelector("[data-audio-next]");
      if (kicker) {
        kicker.textContent = !libraryTrack || engine.status === "idle" ? "Ready" : engine.status === "loading" ? "Loading" : engine.status === "playing" ? "Now playing" : engine.status === "error" ? "Unavailable" : "Paused";
      }
      if (meta) {
        const row = index >= 0 ? rows[index] : null;
        const label = row && row.querySelector(".audio-row__kicker");
        meta.textContent = label ? label.textContent : "";
      }
      if (toggle) {
        toggle.setAttribute("aria-label", failed ? "Try again" : active ? "Pause" : "Play");
        toggle.setAttribute("aria-pressed", libraryTrack && engine.status === "playing" ? "true" : "false");
      }
      if (prev) prev.disabled = index <= 0 && !(engine.audio && engine.audio.currentTime > 3);
      if (next) next.disabled = engine.shuffle ? rows.length < 2 : index >= 0 && index >= rows.length - 1;
      const shuffle = panel.querySelector("[data-audio-shuffle]");
      if (shuffle) shuffle.setAttribute("aria-pressed", engine.shuffle ? "true" : "false");
    }
    if (now) {
      const named = panel && libraryTrack && engine.status !== "idle";
      if (root.hasAttribute("data-audio-status")) {
        if (!libraryTrack || engine.status === "idle") now.textContent = root.getAttribute("data-audio-idle") || "Press play to begin";
        else if (engine.status === "loading") now.textContent = "Loading";
        else if (engine.status === "playing") now.textContent = "Playing";
        else if (engine.status === "error") now.textContent = "Unavailable";
        else now.textContent = "Paused";
      } else if (!libraryTrack || engine.status === "idle") {
        now.textContent = root.getAttribute("data-audio-idle") || "Choose a chapter.";
      } else if (named && engine.status === "error") {
        now.textContent = engine.error || "This track could not be played.";
      } else if (named) {
        now.textContent = engine.current.title;
      } else if (engine.status === "loading") {
        now.textContent = "Loading " + engine.current.title + "…";
      } else if (engine.status === "playing") {
        now.textContent = "Now playing: " + engine.current.title;
      } else if (engine.status === "error") {
        now.textContent = engine.error || "This track could not be played.";
      } else {
        now.textContent = "Paused: " + engine.current.title;
      }
    }
    renderProgress();
  }

  function libraryRows(root) {
    return Array.from((root || engine.libraryRoot).querySelectorAll("[data-audio-id]"));
  }

  function currentLibraryIndex(root) {
    if (!engine.current || engine.current.channel === "music") return -1;
    return libraryRows(root).findIndex((row) => row.getAttribute("data-audio-id") === engine.current.id);
  }

  function trackFromRow(row) {
    return {
      id: row.getAttribute("data-audio-id"),
      src: row.getAttribute("data-audio-src"),
      title: row.getAttribute("data-audio-title") || "Sample",
      channel: row.getAttribute("data-audio-channel") || "sample",
      loop: false,
    };
  }

  function playLibraryRow(row) {
    if (!row || !row.getAttribute("data-audio-src")) return;
    play(trackFromRow(row));
  }

  function stepLibrary(step) {
    const rows = libraryRows();
    if (!rows.length) return;
    const index = currentLibraryIndex();
    if (step > 0 && engine.shuffle && rows.length > 1) {
      let pick = Math.floor(Math.random() * rows.length);
      if (pick === index) pick = (pick + 1) % rows.length;
      playLibraryRow(rows[pick]);
      return;
    }
    if (step < 0 && index >= 0 && engine.audio && engine.current && engine.current.channel !== "music" && engine.audio.currentTime > 3) {
      engine.audio.currentTime = 0;
      renderProgress();
      return;
    }
    if (index < 0) {
      if (step > 0) playLibraryRow(rows[0]);
      return;
    }
    const next = index + step;
    if (next < 0 || next >= rows.length) return;
    playLibraryRow(rows[next]);
  }

  function toggleLibrary() {
    const rows = libraryRows();
    const index = currentLibraryIndex();
    if (index >= 0 && (engine.status === "playing" || engine.status === "loading")) {
      pause();
      return;
    }
    if (index >= 0) {
      play(trackFromRow(rows[index]));
      return;
    }
    if (rows[0]) playLibraryRow(rows[0]);
  }

  function bindPanel(root) {
    const panel = root.querySelector("[data-audio-panel]");
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = "1";
    const prev = panel.querySelector("[data-audio-prev]");
    const next = panel.querySelector("[data-audio-next]");
    const toggle = panel.querySelector("[data-audio-toggle]");
    const shuffle = panel.querySelector("[data-audio-shuffle]");
    const playlist = panel.querySelector("[data-audio-playlist]");
    const seek = panel.querySelector("[data-audio-bar]");
    if (prev) prev.addEventListener("click", () => stepLibrary(-1));
    if (next) next.addEventListener("click", () => stepLibrary(1));
    if (toggle) toggle.addEventListener("click", toggleLibrary);
    if (shuffle) shuffle.addEventListener("click", () => {
      engine.shuffle = !engine.shuffle;
      shuffle.setAttribute("aria-pressed", engine.shuffle ? "true" : "false");
    });
    if (playlist) playlist.addEventListener("click", () => {
      const rows = libraryRows(root);
      const index = currentLibraryIndex(root);
      const target = index >= 0 ? rows[index] : root.querySelector(".audio-book-bars");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    if (!seek) return;
    const seekTo = (clientX) => {
      const audio = engine.audio;
      if (!audio || !engine.current || engine.current.channel === "music") return;
      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const rect = seek.getBoundingClientRect();
      const ratio = rect.width ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
      audio.currentTime = ratio * Math.max(0, duration - 0.05);
      renderProgress();
    };
    seek.addEventListener("pointerdown", (event) => {
      if (!engine.current || engine.current.channel === "music") return;
      seek.setPointerCapture(event.pointerId);
      seekTo(event.clientX);
    });
    seek.addEventListener("pointermove", (event) => {
      if (!seek.hasPointerCapture(event.pointerId)) return;
      seekTo(event.clientX);
    });
    seek.addEventListener("keydown", (event) => {
      const audio = engine.audio;
      if (!audio || !engine.current || engine.current.channel === "music") return;
      const duration = audio.duration;
      if (!Number.isFinite(duration)) return;
      const jump = event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0;
      if (!jump) return;
      event.preventDefault();
      audio.currentTime = Math.min(Math.max(0, duration - 0.05), Math.max(0, audio.currentTime + jump));
      renderProgress();
    });
  }

  function render() {
    renderWidget();
    renderLibrary();
  }

  function ensureWidget() {
    if (engine.widget) return engine.widget;
    const widget = document.createElement("div");
    widget.className = "site-music";
    widget.setAttribute("data-site-music", "");
    widget.setAttribute("role", "region");
    widget.setAttribute("aria-label", "Background music");
    widget.innerHTML = [
      '<div class="site-music__top">',
      '<span class="site-music__mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 17.5a2.5 2.5 0 1 1-2-2.45V6.8l10-2.2v8.4"/><path d="M17 13.1a2.5 2.5 0 1 1-2-2.45"/></svg></span>',
      '<span class="site-music__label">',
      '<span class="site-music__kicker" data-music-status>Paused</span>',
      '<span class="site-music__title" data-music-title>Music</span>',
      "</span>",
      '<span class="site-music__time" data-music-time>0:00</span>',
      "</div>",
      '<div class="site-music__bar" data-music-bar role="progressbar" aria-label="Music progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-music-progress></span></div>',
      '<div class="site-music__actions">',
      '<button type="button" data-music-play aria-label="Play Music"><svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.2v11.6L18.5 12 8 6.2Z"/></svg><svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3.2v12H8zM12.8 6H16v12h-3.2z"/></svg><span>Play</span></button>',
      '<button type="button" data-music-pause aria-label="Pause Music" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3.2v12H8zM12.8 6H16v12h-3.2z"/></svg><span>Pause</span></button>',
      "</div>",
      '<p class="site-music__error" data-music-error hidden></p>',
    ].join("");
    widget.querySelector("[data-music-play]").addEventListener("click", () => {
      if (!engine.musicTrack) return;
      const compact = window.matchMedia("(max-width: 700px)").matches;
      if (compact && musicIsCurrent() && (engine.status === "playing" || engine.status === "loading")) {
        pause();
        return;
      }
      engine.userStarted = true;
      const track = engine.musicTrack;
      const audio = ensureAudio();
      const same = engine.current && engine.current.id === track.id && audio.getAttribute("data-src") === absoluteSrc(track.src) && engine.status !== "error";
      start(track, same ? undefined : engine.musicPosition);
    });
    widget.querySelector("[data-music-pause]").addEventListener("click", () => {
      if (musicIsCurrent()) pause();
    });
    document.body.appendChild(widget);
    document.body.classList.add("has-site-music");
    if (!engine.compactWatch) {
      engine.compactWatch = true;
      const compactQuery = window.matchMedia("(max-width: 700px)");
      const onCompactChange = () => render();
      if (compactQuery.addEventListener) compactQuery.addEventListener("change", onCompactChange);
      else if (compactQuery.addListener) compactQuery.addListener(onCompactChange);
    }
    engine.widget = widget;
    return widget;
  }

  function removeWidget() {
    if (engine.widget) {
      engine.widget.remove();
      engine.widget = null;
    }
    document.body.classList.remove("has-site-music");
  }

  function resolveMusicTrack(choice) {
    if (choice && choice !== "off") {
      const chosen = optionById(choice);
      if (chosen) return toMusicTrack(chosen);
    }
    const saved = readSaved();
    if (saved) {
      const remembered = optionById(saved.id) || options.find((option) => option.src && ("music:" + option.id) === saved.id);
      if (remembered) return toMusicTrack(remembered);
    }
    const fallback = options.find((option) => option.src);
    return fallback ? toMusicTrack(fallback) : null;
  }

  function restorePlayback() {
    const saved = readSaved();
    if (!saved || !engine.musicTrack) return;
    const sameTrack = saved.id === engine.musicTrack.id || saved.id === engine.musicTrack.id.replace(/^music:/, "");
    if (!sameTrack) return;
    engine.musicPosition = Number.isFinite(saved.position) ? saved.position : 0;
    if (saved.playing) {
      engine.userStarted = true;
      start(engine.musicTrack, engine.musicPosition);
    }
  }

  function foldLists(root) {
    root.querySelectorAll("[data-audio-fold]").forEach((list) => {
      if (list.querySelector(":scope > .audio-fold")) return;
      const rawLimit = list.getAttribute("data-audio-fold");
      const limit = rawLimit === null || rawLimit === "" ? 4 : Number(rawLimit);
      const rows = Array.from(list.querySelectorAll(":scope > .audio-row"));
      if (!Number.isFinite(limit) || rows.length <= limit) return;
      const extra = rows.slice(limit);
      const count = extra.length;
      const moreLabel = list.getAttribute("data-audio-fold-label") || "More";
      const hover = list.hasAttribute("data-audio-fold-hover");
      const fold = document.createElement("li");
      fold.className = hover ? "audio-fold audio-fold--hover" : "audio-fold";
      const nested = document.createElement("ol");
      nested.className = "audio-group__list";
      extra.forEach((row) => nested.appendChild(row));
      const closedLabel = moreLabel + " (" + count + ")";
      const marker = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.2 12 15.2 18 9.2"/></svg>';
      if (hover) {
        const panel = document.createElement("div");
        panel.className = "audio-fold__panel";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "audio-fold__toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = marker;
        toggle.querySelector("span").textContent = closedLabel;
        const showThree = () => {
          const rows = [...nested.querySelectorAll(":scope > .audio-row")].slice(0, 3);
          if (!rows.length) return;
          const gap = parseFloat(getComputedStyle(nested).rowGap) || 0;
          const pad = parseFloat(getComputedStyle(nested).paddingTop) + parseFloat(getComputedStyle(nested).paddingBottom);
          const height = rows.reduce((sum, row) => sum + row.offsetHeight, 0) + gap * (rows.length - 1) + pad;
          nested.style.maxHeight = Math.ceil(height) + "px";
        };
        toggle.addEventListener("click", () => {
          const open = fold.classList.toggle("is-open");
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) requestAnimationFrame(showThree);
        });
        panel.append(toggle, nested);
        fold.append(panel);
      } else {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.innerHTML = marker;
        const label = summary.querySelector("span");
        const setLabel = () => {
          label.textContent = details.open ? "Show less" : closedLabel;
        };
        details.addEventListener("toggle", setLabel);
        details.append(summary, nested);
        fold.append(details);
        setLabel();
      }
      list.append(fold);
    });
  }

  function bindLibrary(root) {
    if (!root || engine.libraryRoot === root) return;
    engine.libraryRoot = root;
    foldLists(root);
    bindPanel(root);
    root.querySelectorAll("[data-audio-id]").forEach((row) => {
      const title = row.getAttribute("data-audio-title") || "sample";
      const playButton = row.querySelector("[data-audio-play]");
      if (playButton) playButton.setAttribute("aria-label", "Play " + title);
    });
    const lengthEl = root.querySelector("[data-audio-length]");
    const totalEl = root.querySelector("[data-audio-duration]");
    const srcRow = root.querySelector("[data-audio-src]");
    if (lengthEl && srcRow && !lengthEl.dataset.bound) {
      lengthEl.dataset.bound = "1";
      const probe = document.createElement("audio");
      probe.preload = "metadata";
      probe.src = srcRow.getAttribute("data-audio-src");
      probe.addEventListener("loadedmetadata", () => {
        if (!Number.isFinite(probe.duration) || probe.duration <= 0) return;
        const label = formatTime(probe.duration);
        lengthEl.textContent = label;
        if (totalEl) {
          totalEl.setAttribute("data-length", label);
          const idle = !engine.current || engine.current.channel === "music" || engine.status === "idle";
          if (idle) totalEl.textContent = label;
        }
      });
    }
    root.addEventListener("click", (event) => {
      const row = event.target.closest("[data-audio-id]");
      if (!row || !root.contains(row)) return;
      if (event.target.closest("[data-audio-pause]")) {
        if (engine.current && engine.current.id === row.getAttribute("data-audio-id")) pause();
        return;
      }
      if (engine.current && engine.current.id === row.getAttribute("data-audio-id") && (engine.status === "playing" || engine.status === "loading")) {
        pause();
        return;
      }
      const src = row.getAttribute("data-audio-src");
      const title = row.getAttribute("data-audio-title") || "Sample";
      if (!src) return;
      play({
        id: row.getAttribute("data-audio-id"),
        src: src,
        title: title,
        channel: row.getAttribute("data-audio-channel") || "sample",
        loop: false,
      });
    });
    renderLibrary();
  }

  function mount(choice) {
    if (isAdminPage()) return;
    ensureAudio();
    bindLibrary(document.querySelector("[data-audio-library]"));
    if (choice === "off") {
      engine.cornerEnabled = false;
      if (musicIsCurrent()) pause();
      removeWidget();
      return;
    }
    engine.cornerEnabled = true;
    const track = resolveMusicTrack(choice);
    if (!engine.booted) {
      engine.booted = true;
      engine.musicTrack = track;
      const saved = readSaved();
      if (saved && Number.isFinite(saved.position)) engine.musicPosition = saved.position;
      ensureWidget();
      restorePlayback();
      render();
      openRequestedAudiobook();
      return;
    }
    if (!engine.userStarted && track) engine.musicTrack = track;
    ensureWidget();
    render();
  }

  function openRequestedAudiobook() {
    const id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (!id.startsWith("narration:")) return;
    const row = document.querySelector('[data-audio-library] [data-audio-id="' + CSS.escape(id) + '"]');
    if (!row) return;
    const fold = row.closest(".audio-fold");
    const toggle = fold && fold.querySelector(".audio-fold__toggle");
    if (toggle && toggle.getAttribute("aria-expanded") !== "true") toggle.click();
    const src = row.getAttribute("data-audio-src");
    if (!src) return;
    play({
      id: id,
      src: src,
      title: row.getAttribute("data-audio-title") || "Chapter",
      channel: "narration",
      loop: false,
    });
    const panel = document.querySelector("[data-audio-panel]");
    if (panel) panel.scrollIntoView({ block: "center" });
    history.replaceState(null, "", location.pathname + location.search);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("[data-audiobook]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const id = button.getAttribute("data-audiobook");
    if (!id) return;
    const here = document.querySelector('[data-audio-library] [data-audio-id="' + CSS.escape(id) + '"]');
    if (here) {
      const playButton = here.querySelector("[data-audio-play]");
      if (playButton) playButton.click();
      const panel = document.querySelector("[data-audio-panel]");
      if (panel) panel.scrollIntoView({ block: "center" });
      return;
    }
    location.href = "music.html#" + id;
  }, true);

  document.addEventListener("pointerdown", (event) => {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || link.target === "_blank") return;
    save();
  }, true);
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    const saved = readSaved();
    if (saved && saved.playing && engine.audio && engine.audio.paused && musicIsCurrent()) {
      engine.audio.play().catch(() => {
        engine.status = "paused";
        render();
      });
    }
  });

  window.SiteAudio = {
    play: play,
    pause: pause,
    start: start,
  };
  window.SiteMusic = {
    options: options,
    mount: mount,
  };

  mount(null);
})();
