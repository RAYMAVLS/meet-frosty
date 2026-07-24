"use strict";

const CONFIG_PATH = "./content/site.json";

const STORAGE_KEYS = {
  unlocked: "frosty_unlocked_links",
  language: "frosty_language"
};

const UI = {
  es: {
    answer: "respuesta",
    correct: "acceso concedido",
    incorrect: "acceso denegado",
    complete: "acceso completo"
  },

  en: {
    answer: "answer",
    correct: "access granted",
    incorrect: "access denied",
    complete: "full access"
  },

  fr: {
    answer: "réponse",
    correct: "accès autorisé",
    incorrect: "accès refusé",
    complete: "accès complet"
  },

  pt: {
    answer: "resposta",
    correct: "acesso concedido",
    incorrect: "acesso negado",
    complete: "acesso completo"
  },

  de: {
    answer: "antwort",
    correct: "zugriff gewährt",
    incorrect: "zugriff verweigert",
    complete: "vollständiger zugriff"
  }
};

let siteData = null;

let language =
  localStorage.getItem(STORAGE_KEYS.language) || "es";

let unlocked =
  Number(localStorage.getItem(STORAGE_KEYS.unlocked)) || 0;

let processingAnswer = false;

const puzzleArea =
  document.getElementById("puzzleArea");

const linksArea =
  document.getElementById("linksArea");

const resetButton =
  document.getElementById("resetButton");

const messageElement =
  document.getElementById("message");


/* -------------------------
   INITIALIZE
------------------------- */

async function init() {
  try {
    const response = await fetch(
      `${CONFIG_PATH}?v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not load ${CONFIG_PATH}`
      );
    }

    siteData = await response.json();

    if (
      !siteData ||
      !Array.isArray(siteData.links)
    ) {
      throw new Error(
        "Invalid site configuration."
      );
    }

    siteData.links =
      siteData.links.filter(
        link => link.enabled !== false
      );

    unlocked =
      Math.max(
        0,
        Math.min(
          unlocked,
          siteData.links.length
        )
      );

    setLanguage(language, false);

    render();
  }

  catch (error) {
    console.error(error);

    puzzleArea.innerHTML = `
      <div class="completed">
        ERROR
      </div>
    `;
  }
}


/* -------------------------
   RENDER
------------------------- */

function render() {
  renderLanguages();
  renderLinks();
  renderPuzzle();
}


/* -------------------------
   LANGUAGES
------------------------- */

function renderLanguages() {
  document
    .querySelectorAll(".language")
    .forEach(button => {

      const buttonLanguage =
        button.dataset.lang;

      const active =
        buttonLanguage === language;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        active ? "true" : "false"
      );

    });

  document.documentElement.lang =
    language;
}


function setLanguage(
  newLanguage,
  shouldRender = true
) {
  if (!UI[newLanguage]) {
    newLanguage = "es";
  }

  language = newLanguage;

  localStorage.setItem(
    STORAGE_KEYS.language,
    language
  );

  if (shouldRender && siteData) {
    render();
  }
}


document
  .querySelectorAll(".language")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        setLanguage(
          button.dataset.lang
        );

      }
    );

  });


/* -------------------------
   PUZZLES
------------------------- */

function renderPuzzle() {
  processingAnswer = false;

  puzzleArea.innerHTML = "";

  puzzleArea.style.opacity = "";
  puzzleArea.style.transform = "";

  if (
    unlocked >=
    siteData.links.length
  ) {

    const complete =
      document.createElement("div");

    complete.className =
      "completed";

    complete.textContent =
      UI[language].complete.toUpperCase();

    puzzleArea.appendChild(
      complete
    );

    return;
  }


  const currentIndex =
    unlocked;

  const currentLink =
    siteData.links[currentIndex];

  if (!currentLink) {
    return;
  }


  const puzzle =
    document.createElement("div");

  puzzle.className =
    "puzzle";


  const puzzleNumber =
    document.createElement("div");

  puzzleNumber.className =
    "puzzle-number";

  puzzleNumber.textContent =
    String(currentIndex + 1)
      .padStart(2, "0");


  const text =
    document.createElement("p");

  text.className =
    "puzzle-text";

  text.textContent =
    getLocalizedText(
      currentLink.riddle
    );


  const form =
    document.createElement("form");

  form.className =
    "answer-form";

  form.noValidate = true;


  const input =
    document.createElement("input");

  input.className =
    "answer-input";

  input.type =
    "text";

  input.autocomplete =
    "off";

  input.autocapitalize =
    "none";

  input.spellcheck =
    false;

  input.placeholder =
    UI[language].answer;

  input.setAttribute(
    "aria-label",
    UI[language].answer
  );


  const submit =
    document.createElement("button");

  submit.className =
    "submit-answer";

  submit.type =
    "submit";

  submit.textContent =
    "→";

  submit.setAttribute(
    "aria-label",
    "Submit"
  );


  form.append(
    input,
    submit
  );


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();
      event.stopPropagation();

      if (processingAnswer) {
        return;
      }

      processingAnswer = true;

      submit.disabled = true;
      input.disabled = true;

      const accepted =
        isCorrectAnswer(
          input.value,
          currentLink
        );


      if (!accepted) {

        processingAnswer = false;

        submit.disabled = false;
        input.disabled = false;

        showMessage(
          UI[language].incorrect
        );

        shakeInput(input);

        input.focus();
        input.select();

        return;
      }


      unlocked =
        currentIndex + 1;

      localStorage.setItem(
        STORAGE_KEYS.unlocked,
        String(unlocked)
      );

      showMessage(
        UI[language].correct
      );


      puzzle.remove();


      await nextFrame();
      await nextFrame();


      renderLinks();
      renderPuzzle();
    }
  );


  puzzle.append(
    puzzleNumber,
    text,
    form
  );


  puzzleArea.appendChild(
    puzzle
  );


  setTimeout(
    () => {

      if (
        document.body.contains(input)
      ) {
        input.focus();
      }

    },
    100
  );
}


/* -------------------------
   CHECK ANSWER
------------------------- */

function isCorrectAnswer(
  submittedAnswer,
  link
) {
  const submitted =
    normalizeAnswer(
      submittedAnswer
    );

  if (!submitted) {
    return false;
  }

  const answers =
    Array.isArray(link.answers)
      ? link.answers
      : [];

  return answers.some(
    answer =>
      normalizeAnswer(answer)
      === submitted
  );
}


/* -------------------------
   NEXT FRAME
------------------------- */

function nextFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}


/* -------------------------
   WRONG ANSWER ANIMATION
------------------------- */

function shakeInput(input) {
  input.animate(
    [
      {
        transform:
          "translateX(0)"
      },

      {
        transform:
          "translateX(-5px)"
      },

      {
        transform:
          "translateX(5px)"
      },

      {
        transform:
          "translateX(-3px)"
      },

      {
        transform:
          "translateX(0)"
      }
    ],
    {
      duration: 280
    }
  );
}


/* -------------------------
   LINKS
------------------------- */

function renderLinks() {
  linksArea.innerHTML = "";

  const visibleLinks =
    siteData.links.slice(
      0,
      unlocked
    );


  visibleLinks.forEach(
    (link, index) => {

      const anchor =
        document.createElement("a");

      anchor.className =
        "secret-link";

      anchor.href =
        normalizeUrl(
          link.url
        );

      anchor.target =
        "_blank";

      anchor.rel =
        "noopener noreferrer";

      anchor.setAttribute(
        "aria-label",
        `Link ${index + 1}`
      );


      if (link.icon) {

        const image =
          document.createElement("img");

        image.src =
          normalizeMediaPath(
            link.icon
          );

        image.alt = "";

        image.loading =
          "lazy";


        image.addEventListener(
          "error",
          () => {

            image.remove();

            addFallbackSymbol(
              anchor
            );

          },
          {
            once: true
          }
        );


        anchor.appendChild(
          image
        );

      }

      else {

        addFallbackSymbol(
          anchor
        );

      }


      linksArea.appendChild(
        anchor
      );

    }
  );
}


function addFallbackSymbol(
  anchor
) {
  if (
    anchor.querySelector(
      ".link-symbol"
    )
  ) {
    return;
  }

  const symbol =
    document.createElement("span");

  symbol.className =
    "link-symbol";

  symbol.textContent =
    "✦";

  anchor.appendChild(
    symbol
  );
}


/* -------------------------
   URL
------------------------- */

function normalizeUrl(url) {
  const value =
    String(url || "").trim();

  if (!value) {
    return "#";
  }

  if (
    /^(https?:\/\/|mailto:|tel:)/i
      .test(value)
  ) {
    return value;
  }

  return `https://${value}`;
}


/* -------------------------
   MEDIA PATH
------------------------- */

function normalizeMediaPath(path) {
  const value =
    String(path || "").trim();

  if (!value) {
    return "";
  }

  if (
    /^https?:\/\//i.test(value)
  ) {
    return value;
  }

  /*
   * GitHub Pages project sites:
   * username.github.io/repository/
   *
   * Pages CMS may save images as:
   * /media/image.png
   *
   * A leading slash would otherwise point
   * to username.github.io/media/image.png.
   */

  if (value.startsWith("/")) {

    const repositoryBase =
      getRepositoryBase();

    return (
      repositoryBase +
      value.substring(1)
    );
  }

  return value;
}


function getRepositoryBase() {
  const path =
    window.location.pathname;

  const parts =
    path
      .split("/")
      .filter(Boolean);

  /*
   * Custom domain / username.github.io root
   */

  if (parts.length === 0) {
    return "/";
  }

  /*
   * If index.html is directly visible
   */

  if (
    parts[parts.length - 1]
      .includes(".")
  ) {
    parts.pop();
  }

  /*
   * GitHub project page:
   * /repository/
   */

  if (
    window.location.hostname
      .endsWith("github.io") &&
    parts.length > 0
  ) {
    return `/${parts[0]}/`;
  }

  return "/";
}


/* -------------------------
   LOCALIZATION
------------------------- */

function getLocalizedText(
  translations
) {
  if (!translations) {
    return "";
  }

  return (
    translations[language] ||
    translations.es ||
    translations.en ||
    ""
  );
}


/* -------------------------
   ANSWER NORMALIZATION
------------------------- */

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[.,!?¿¡'"`´:;]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}


/* -------------------------
   MESSAGE
------------------------- */

let messageTimeout = null;

function showMessage(text) {
  clearTimeout(
    messageTimeout
  );

  messageElement.textContent =
    text;

  messageElement.classList.add(
    "show"
  );

  messageTimeout =
    setTimeout(
      () => {

        messageElement
          .classList
          .remove("show");

      },
      1700
    );
}


/* -------------------------
   RESET
------------------------- */

resetButton.addEventListener(
  "click",
  () => {

    const shouldReset =
      window.confirm(
        "↺ ?"
      );

    if (!shouldReset) {
      return;
    }

    unlocked = 0;

    processingAnswer = false;

    localStorage.removeItem(
      STORAGE_KEYS.unlocked
    );

    render();
  }
);


/* -------------------------
   START
------------------------- */

init();
