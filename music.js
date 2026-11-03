window.SiteMusic = {
  options: [
    {
      id: "off",
      title: "No music",
      note: "The corner music button stays off.",
    },
    {
      id: "bright-pop",
      title: "Bright pop",
      note: "A full pop song. Free to use, no credit required.",
      src: "assets/audio/bright-pop.mp3",
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
  ],

  mount() {
    document.querySelectorAll("[data-site-music]").forEach((node) => node.remove());
  },
};
