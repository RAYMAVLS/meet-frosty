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
  Number(
    localStorage.getItem(STORAGE_KEYS.unlocked)
  ) || 0;

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
      `${CONFIG_PATH}?v=${Date.now()}`
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
      Math.min(
        unlocked,
        siteData.links.length
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
  resetPuzzleArea();
  renderLanguages();
  renderLinks();
  renderPuzzle();
}


/* -------------------------
   RESET PUZZLE VISUAL STATE
------------------------- */

function resetPuzzleArea() {
  if (!puzzleArea) {
    return;
  }

  puzzleArea
    .getAnimations()
    .forEach(animation => {
      animation.cancel();
    });

  puzzleArea.style.opacity = "1";
  puzzleArea.style.transform = "none";
}


/* -------------------------
   LANGUAGES
------------------------- */

function renderLanguages() {
  const languageButtons =
    document.querySelectorAll(
      ".language"
    );

  languageButtons.forEach(button => {
    const buttonLanguage =
      button.dataset.lang;

    button.classList.toggle(
      "active",
      buttonLanguage === language
    );

    button.setAttribute(
      "aria-pressed",
      buttonLanguage === language
        ? "true"
        : "false"
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

  if (shouldRender) {
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
  resetPuzzleArea();

  puzzleArea.innerHTML = "";

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

  const currentLink =
    siteData.links[unlocked];

  if (!currentLink) {
    console.error(
      "No link found for index:",
      unlocked
    );

    return;
  }

  const puzzleText =
    getLocalizedText(
      currentLink.riddle
    );

  const puzzle =
    document.createElement("div");

  puzzle.className =
    "puzzle";


  const puzzleNumber =
    document.createElement("div");

  puzzleNumber.className =
    "puzzle-number";

  puzzleNumber.textContent =
    String(unlocked + 1)
      .padStart(2, "0");


  const text =
    document.createElement("p");

  text.className =
    "puzzle-text";

  text.textContent =
    puzzleText;


  const form =
    document.createElement("form");

  form.className =
    "answer-form";


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
    event => {

      event.preventDefault();

      checkAnswer(
        input.value,
        currentLink
      );

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
      if (document.body.contains(input)) {
        input.focus();
      }
    },
    150
  );
}


/* -------------------------
   ANSWERS
------------------------- */

function checkAnswer(
  submittedAnswer,
  link
) {
  const submitted =
    normalizeAnswer(
      submittedAnswer
    );

  const answers =
    Array.isArray(link.answers)
      ? link.answers
      : [];

  const accepted =
    answers.some(answer => {

      return (
        normalizeAnswer(answer)
        === submitted
      );

    });

  if (!submitted) {
    return;
  }

  if (accepted) {

    unlocked += 1;

    unlocked =
      Math.min(
        unlocked,
        siteData.links.length
      );

    localStorage.setItem(
      STORAGE_KEYS.unlocked,
      String(unlocked)
    );

    showMessage(
      UI[language].correct
    );

    renderLinks();

    resetPuzzleArea();

    renderPuzzle();

    return;
  }

  showMessage(
    UI[language].incorrect
  );

  const input =
    document.querySelector(
      ".answer-input"
    );

  if (input) {

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
        duration: 300
      }
    );

    input.select();
  }
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

      anchor.style.animationDelay =
        `${index * 55}ms`;

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

        image.alt =
          "";

        image.loading =
          "lazy";

        image.addEventListener(
          "error",
          () => {
            image.remove();

            addFallbackSymbol(
              anchor
            );
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
   URL HELPERS
------------------------- */

function normalizeUrl(url) {
  const value =
    String(url || "").trim();

  if (!value) {
    return "#";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  ) {
    return value;
  }

  return `https://${value}`;
}


function normalizeMediaPath(path) {
  const value =
    String(path || "").trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `.${value}`;
  }

  return value;
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
   NORMALIZATION
------------------------- */

function normalizeAnswer(
  value
) {
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

    localStorage.removeItem(
      STORAGE_KEYS.unlocked
    );

    resetPuzzleArea();

    render();
  }
);


/* -------------------------
   START
------------------------- */

init();
