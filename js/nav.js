/* Physics Playground - Shared Navigation */
(function () {
  var topics = [
    { id: "newtons-laws", title: "Newton's Laws", color: "#58a6ff" },
    { id: "energy", title: "Conservation of Energy", color: "#f0883e" },
    { id: "entropy", title: "Entropy", color: "#bc8cff" },
    { id: "gravity", title: "Gravity & Orbits", color: "#3fb950" },
    { id: "momentum", title: "Momentum & Collisions", color: "#f85149" },
    { id: "waves", title: "Waves & Resonance", color: "#39d353" },
  ];

  var path = window.location.pathname;
  var inTopics = path.indexOf("/topics/") !== -1;
  var prefix = inTopics ? "../" : "";
  var topicPrefix = inTopics ? "" : "topics/";

  // Detect active topic from current filename
  var currentFile = path.split("/").pop().replace(".html", "");

  // Build nav links
  var links = topics
    .map(function (t) {
      var isActive = currentFile === t.id;
      var href = topicPrefix + t.id + ".html";
      var cls = "nav-link" + (isActive ? " active" : "");
      var style = isActive ? ' style="color:' + t.color + ";border-color:" + t.color + '"' : "";
      return '<a class="' + cls + '" href="' + href + '"' + style + ">" + t.title + "</a>";
    })
    .join("");

  var nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.innerHTML =
    '<div class="nav-inner">' +
    '<a class="nav-brand" href="' +
    prefix +
    'index.html">Physics Playground</a>' +
    '<div class="nav-links">' +
    links +
    "</div>" +
    '<button class="nav-toggle" aria-label="Menu">&#9776;</button>' +
    "</div>";

  document.body.insertBefore(nav, document.body.firstChild);

  // Mobile toggle
  var toggle = nav.querySelector(".nav-toggle");
  var linksWrap = nav.querySelector(".nav-links");
  toggle.addEventListener("click", function () {
    linksWrap.classList.toggle("open");
  });

  // Inject nav styles
  var style = document.createElement("style");
  style.textContent =
    ".site-nav{position:sticky;top:0;z-index:100;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);}" +
    ".nav-inner{max-width:1200px;margin:0 auto;padding:var(--space-sm) var(--space-lg);display:flex;align-items:center;gap:var(--space-lg);}" +
    ".nav-brand{font-family:var(--font-mono);font-weight:700;font-size:1rem;color:var(--text-primary);text-decoration:none;white-space:nowrap;}" +
    ".nav-brand:hover{color:var(--accent,#58a6ff);}" +
    ".nav-links{display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center;}" +
    ".nav-link{font-size:0.8rem;color:var(--text-secondary);text-decoration:none;padding:var(--space-xs) var(--space-sm);border-radius:var(--radius-sm);border:1px solid transparent;transition:color .15s,border-color .15s;white-space:nowrap;}" +
    ".nav-link:hover{color:var(--text-primary);border-color:var(--border-color);}" +
    ".nav-link.active{font-weight:600;}" +
    ".nav-toggle{display:none;background:none;border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-size:1.2rem;padding:var(--space-xs) var(--space-sm);cursor:pointer;margin-left:auto;}" +
    "@media(max-width:768px){" +
    ".nav-links{display:none;flex-direction:column;width:100%;}" +
    ".nav-links.open{display:flex;}" +
    ".nav-inner{flex-wrap:wrap;}" +
    ".nav-toggle{display:block;}" +
    ".nav-link{width:100%;padding:var(--space-sm);}" +
    "}";
  document.head.appendChild(style);
})();
