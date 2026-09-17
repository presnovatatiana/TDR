const nav = document.querySelector(".top-nav");
const menuToggle = document.querySelector(".menu-toggle");
const navList = document.querySelector(".nav-list");
const DESKTOP_NAV_QUERY = "(min-width: 901px)";

function setNavState() {
  if (nav) {
    nav.classList.toggle("scrolled", window.scrollY > 28);
  }
}

setNavState();
window.addEventListener("scroll", setNavState, { passive: true });

function closeMobileNavigation() {
  if (!navList) return;

  navList.classList.remove("open");
  document.body.classList.remove("menu-open");

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
  }
}

if (menuToggle && navList) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navList.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });
}

if (navList) {
  navList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.matches("a"))
      return;

    closeMobileNavigation();
  });
}

/* Tauchspots: Karte + Accordion */
const spotLayout = document.querySelector(".spot-layout");
const spotPanel = document.querySelector(".spot-panel");
const spotPanelToggle = document.querySelector(".spot-panel-toggle");

const markers = document.querySelectorAll(".marker[data-spot]");
const accordionItems = document.querySelectorAll(
  ".spot-accordion-item[data-spot]",
);
const accordionButtons = document.querySelectorAll(".spot-toggle[data-spot]");
const mapStage = document.querySelector(".map-stage");
const mapInner = document.querySelector("#mapInner");

const MAP_NATIVE_WIDTH = Number(mapInner?.dataset.mapWidth) || 829.58;
const MAP_NATIVE_HEIGHT = Number(mapInner?.dataset.mapHeight) || 441.55;
const MIN_MAP_SCALE = 1;
const MAX_MAP_SCALE = 3.4;
const DEFAULT_SPOT_ID = "turtle";

const spotMapData = Array.from(markers).reduce((data, marker) => {
  const id = marker.dataset.spot;
  if (!id) return data;

  data[id] = {
    x: Number(marker.dataset.mapX),
    y: Number(marker.dataset.mapY),
    zoom: id === "manta" ? 1.95 : 1.85,
  };

  return data;
}, {});

let activeSpotId = spotLayout
  ? spotLayout.dataset.activeSpot || DEFAULT_SPOT_ID
  : DEFAULT_SPOT_ID;
let isDraggingMap = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartTransform = { x: 0, y: 0, scale: 1 };
let mapTransform = { x: 0, y: 0, scale: 1 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMapBounds(scale = mapTransform.scale) {
  if (!mapStage) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const rect = mapStage.getBoundingClientRect();
  const minX = Math.min(0, rect.width - rect.width * scale);
  const minY = Math.min(0, rect.height - rect.height * scale);

  return {
    minX,
    maxX: 0,
    minY,
    maxY: 0,
  };
}

function applyMapTransform(animate = true) {
  if (!mapInner) return;

  mapInner.classList.toggle("is-dragging", !animate);
  mapInner.style.transform = `translate3d(${mapTransform.x}px, ${mapTransform.y}px, 0) scale(${mapTransform.scale})`;
}

function setMapTransform(x, y, scale = mapTransform.scale, animate = true) {
  const safeScale = clamp(scale, MIN_MAP_SCALE, MAX_MAP_SCALE);
  const bounds = getMapBounds(safeScale);

  mapTransform = {
    x: clamp(x, bounds.minX, bounds.maxX),
    y: clamp(y, bounds.minY, bounds.maxY),
    scale: safeScale,
  };

  applyMapTransform(animate);
}

function resetMapToStart(animate = true) {
  setMapTransform(0, 0, 1, animate);
}

function isDesktopMap() {
  return window.matchMedia(DESKTOP_NAV_QUERY).matches;
}

function isPanelCollapsed() {
  return Boolean(spotPanel && spotPanel.classList.contains("is-collapsed"));
}

function getSpotStagePosition(spot, rect) {
  return {
    x: (rect.width * spot.x) / MAP_NATIVE_WIDTH,
    y: (rect.height * spot.y) / MAP_NATIVE_HEIGHT,
  };
}

function focusMapOnSpot(id, zoomOverride) {
  if (!mapStage || !spotMapData[id]) return;

  const rect = mapStage.getBoundingClientRect();
  const spot = spotMapData[id];
  const scale = clamp(
    zoomOverride || spot.zoom || 1.85,
    MIN_MAP_SCALE,
    MAX_MAP_SCALE,
  );
  const position = getSpotStagePosition(spot, rect);

  const focusX =
    rect.width * (isDesktopMap() && !isPanelCollapsed() ? 0.36 : 0.5);
  const focusY = rect.height * (isDesktopMap() ? 0.52 : 0.46);

  const targetX = focusX - position.x * scale;
  const targetY = focusY - position.y * scale;

  setMapTransform(targetX, targetY, scale, true);
}

function syncAccordion(id, shouldOpen = true) {
  accordionItems.forEach((item) => {
    const isCurrent = item.dataset.spot === id;
    const isOpen = isCurrent && shouldOpen;
    const button = item.querySelector(".spot-toggle");

    item.classList.toggle("is-open", isOpen);

    if (button) {
      button.setAttribute("aria-expanded", String(isOpen));
    }
  });
}

function syncMarkers(id) {
  markers.forEach((marker) => {
    marker.classList.toggle("active", marker.dataset.spot === id);
  });
}

function setPanelCollapsed(collapsed, shouldFocus = true) {
  if (!spotPanel || !spotPanelToggle || !spotLayout) return;

  spotPanel.classList.toggle("is-collapsed", collapsed);
  spotLayout.classList.toggle("panel-collapsed", collapsed);
  spotPanelToggle.setAttribute("aria-expanded", String(!collapsed));
  spotPanelToggle.setAttribute(
    "aria-label",
    collapsed
      ? "Tauchspot-Menü ausklappen"
      : "Tauchspot-Menü nach oben einklappen",
  );

  if (shouldFocus) {
    window.setTimeout(() => {
      if (collapsed) {
        resetMapToStart(true);
        return;
      }

      focusMapOnSpot(activeSpotId);
    }, 280);
  }
}

function activateSpot(id, shouldOpen = true) {
  if (!spotMapData[id]) return;

  activeSpotId = id;

  if (spotLayout) {
    spotLayout.dataset.activeSpot = id;
  }

  if (!shouldOpen) {
    syncMarkers("");
    syncAccordion("", false);
    resetMapToStart(true);
    return;
  }

  setPanelCollapsed(false, false);
  syncMarkers(id);
  syncAccordion(id, true);
  focusMapOnSpot(id);
}

if (mapStage && mapInner) {
  mapStage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(".marker"))
      return;

    isDraggingMap = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartTransform = { ...mapTransform };

    mapStage.setPointerCapture(event.pointerId);
    applyMapTransform(false);
  });

  mapStage.addEventListener("pointermove", (event) => {
    if (!isDraggingMap) return;

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;

    setMapTransform(
      dragStartTransform.x + dx,
      dragStartTransform.y + dy,
      dragStartTransform.scale,
      false,
    );
  });

  function stopMapDragging(event) {
    if (!isDraggingMap) return;

    isDraggingMap = false;

    if (event && typeof event.pointerId !== "undefined") {
      try {
        mapStage.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture may already be released by the browser.
      }
    }

    applyMapTransform(true);
  }

  mapStage.addEventListener("pointerup", stopMapDragging);
  mapStage.addEventListener("pointercancel", stopMapDragging);
  mapStage.addEventListener("pointerleave", stopMapDragging);

  mapStage.addEventListener(
    "wheel",
    (event) => {
      if (!event.altKey) return;

      event.preventDefault();

      const rect = mapStage.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const zoomFactor = event.deltaY < 0 ? 1.14 : 0.88;
      const nextScale = clamp(
        mapTransform.scale * zoomFactor,
        MIN_MAP_SCALE,
        MAX_MAP_SCALE,
      );

      const mapPointX = (cursorX - mapTransform.x) / mapTransform.scale;
      const mapPointY = (cursorY - mapTransform.y) / mapTransform.scale;

      const targetX = cursorX - mapPointX * nextScale;
      const targetY = cursorY - mapPointY * nextScale;

      setMapTransform(targetX, targetY, nextScale, false);
    },
    { passive: false },
  );
}

markers.forEach((marker) => {
  marker.addEventListener("click", () => {
    const id = marker.dataset.spot || "";
    activateSpot(id, true);
  });
});

accordionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.spot || "";
    const item = button.closest(".spot-accordion-item");
    const willOpen = item ? !item.classList.contains("is-open") : true;

    activateSpot(id, willOpen);
  });
});

if (spotPanelToggle) {
  spotPanelToggle.addEventListener("click", () => {
    const willOpen = isPanelCollapsed();

    if (willOpen) {
      activeSpotId = DEFAULT_SPOT_ID;

      if (spotLayout) {
        spotLayout.dataset.activeSpot = activeSpotId;
      }

      syncMarkers(activeSpotId);
      syncAccordion(activeSpotId, true);
      setPanelCollapsed(false, false);
      window.setTimeout(() => focusMapOnSpot(activeSpotId), 280);
      return;
    }

    syncMarkers("");
    syncAccordion("", false);
    setPanelCollapsed(true, true);
  });
}

window.addEventListener("resize", () => {
  if (window.matchMedia(DESKTOP_NAV_QUERY).matches) {
    closeMobileNavigation();
  }

  window.requestAnimationFrame(() => {
    if (isPanelCollapsed()) {
      resetMapToStart(false);
      return;
    }

    focusMapOnSpot(activeSpotId);
  });
});

if (mapInner && Object.keys(spotMapData).length > 0) {
  window.requestAnimationFrame(() => {
    activeSpotId = DEFAULT_SPOT_ID;

    if (spotLayout) {
      spotLayout.dataset.activeSpot = activeSpotId;
    }

    syncMarkers("");
    syncAccordion("", false);
    setPanelCollapsed(true, false);
    resetMapToStart(false);
  });
}

/* Kurskarten */
document.querySelectorAll(".course-card").forEach((card) => {
  const button = card.querySelector(".read-more");
  if (!button) return;

  button.addEventListener("click", () => {
    const isExpanded = card.classList.toggle("expanded");
    button.setAttribute("aria-expanded", String(isExpanded));
  });
});

/* Buchungsformular: Kursauswahl, Termine, Validierung, Versand */
const courses = {
  schnuppertauchen: {
    title: "Schnuppertauchen",
    subline: "",
    image: "assets/03.jpg",
    alt: "Schnuppertauchen Kursbild",
    description:
      "Noch nicht ganz sicher, ob Tauchen das Richtige für dich ist? Dann ist unser Schnuppertauchgang eine gute Wahl. Ein erfahrener Guide gibt dir einen Crashkurs, nimmt dich mit unter Wasser und zeigt dir, worauf es beim Tauchen ankommt.",
    facts:
      "Preis: 150 Euro<br />Dauer: 3 Stunden, 13.00 bis 16.00 Uhr<br />Termine: Jeden Montag",
    dates: [
      {
        value: "Montag, 08.06.2026, 13.00 bis 16.00 Uhr",
        label: "Montag, 08.06.2026, 13.00 bis 16.00 Uhr",
      },
      {
        value: "Montag, 15.06.2026, 13.00 bis 16.00 Uhr",
        label: "Montag, 15.06.2026, 13.00 bis 16.00 Uhr",
      },
      {
        value: "Montag, 22.06.2026, 13.00 bis 16.00 Uhr",
        label: "Montag, 22.06.2026, 13.00 bis 16.00 Uhr",
      },
      {
        value: "Montag, 29.06.2026, 13.00 bis 16.00 Uhr",
        label: "Montag, 29.06.2026, 13.00 bis 16.00 Uhr",
      },
      {
        value: "Montag, 06.07.2026, 13.00 bis 16.00 Uhr",
        label: "Montag, 06.07.2026, 13.00 bis 16.00 Uhr",
      },
    ],
  },

  "open-water-diver": {
    title: "Open Water Diver",
    subline: "",
    image: "assets/25.jpg",
    alt: "Open Water Diver Kursbild",
    description:
      "Werde bei uns Open Water Diver! Die weltweit anerkannte Grundausbildung im Gerätetauchen ist der perfekte Einstieg in diesen Sport. Innerhalb von vier Tagen bringen wir dir alles bei, was du können musst, um eigenständig tauchen zu können.",
    facts:
      "Preis: 500 Euro<br />Dauer: 2 Tage, jeweils 7.00 bis 15.30 Uhr<br />Termine: Immer dienstags bis freitags",
    dates: [
      {
        value:
          "Dienstag, 09.06.2026 bis Mittwoch, 10.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Dienstag, 09.06.2026 bis Mittwoch, 10.06.2026",
      },
      {
        value:
          "Donnerstag, 11.06.2026 bis Freitag, 12.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Donnerstag, 11.06.2026 bis Freitag, 12.06.2026",
      },
      {
        value:
          "Dienstag, 16.06.2026 bis Mittwoch, 17.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Dienstag, 16.06.2026 bis Mittwoch, 17.06.2026",
      },
      {
        value:
          "Donnerstag, 18.06.2026 bis Freitag, 19.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Donnerstag, 18.06.2026 bis Freitag, 19.06.2026",
      },
      {
        value:
          "Dienstag, 23.06.2026 bis Mittwoch, 24.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Dienstag, 23.06.2026 bis Mittwoch, 24.06.2026",
      },
    ],
  },

  "advanced-open-water-diver": {
    title: "Advanced Open Water Diver",
    subline: "",
    image: "assets/23.jpg",
    alt: "Advanced Open Water Diver Kursbild",
    description:
      "Erweitere Deine Fähigkeiten im Advanced Open Water Diver! Gemeinsam absolvieren wir fünf Abenteuertauchgänge, inklusive Tieftauchen sowie Unterwassernavigation. Nach diesem Kurs darfst du bis zu 30 Meter tief tauchen.",
    facts:
      "Preis: 400 Euro<br />Dauer: 2 Tage, jeweils 7.00 bis 15.30 Uhr<br />Termine: Immer mittwochs bis samstags",
    dates: [
      {
        value:
          "Mittwoch, 10.06.2026 bis Donnerstag, 11.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 10.06.2026 bis Donnerstag, 11.06.2026",
      },
      {
        value:
          "Freitag, 12.06.2026 bis Samstag, 13.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Freitag, 12.06.2026 bis Samstag, 13.06.2026",
      },
      {
        value:
          "Mittwoch, 17.06.2026 bis Donnerstag, 18.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 17.06.2026 bis Donnerstag, 18.06.2026",
      },
      {
        value:
          "Freitag, 19.06.2026 bis Samstag, 20.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Freitag, 19.06.2026 bis Samstag, 20.06.2026",
      },
      {
        value:
          "Mittwoch, 24.06.2026 bis Donnerstag, 25.06.2026, jeweils 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 24.06.2026 bis Donnerstag, 25.06.2026",
      },
    ],
  },

  "rescue-diver": {
    title: "Rescue Diver",
    subline: "",
    image: "assets/28.jpg",
    alt: "Rescue Diver Kursbild",
    description:
      "Wie vermeide ich Gefahrensituationen, wie reagiere ich in brenzligen Situationen unter Wasser und was tue ich bei einem Tauchunfall? Im Rescue Diver wirst du Rettungstaucher und lernst, für die Sicherheit und das Wohlbefinden deiner Tauchbuddies zu sorgen – von wichtigen Handgriffen unter Wasser bis zur Ersten Hilfe an der Oberfläche.",
    facts:
      "Preis: 400 Euro<br />Dauer: 1 Tag, 7.00 bis 15.30 Uhr<br />Termine: Jeden Mittwoch",
    dates: [
      {
        value: "Mittwoch, 10.06.2026, 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 10.06.2026, 7.00 bis 15.30 Uhr",
      },
      {
        value: "Mittwoch, 17.06.2026, 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 17.06.2026, 7.00 bis 15.30 Uhr",
      },
      {
        value: "Mittwoch, 24.06.2026, 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 24.06.2026, 7.00 bis 15.30 Uhr",
      },
      {
        value: "Mittwoch, 01.07.2026, 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 01.07.2026, 7.00 bis 15.30 Uhr",
      },
      {
        value: "Mittwoch, 08.07.2026, 7.00 bis 15.30 Uhr",
        label: "Mittwoch, 08.07.2026, 7.00 bis 15.30 Uhr",
      },
    ],
  },

  reactivate: {
    title: "ReActivate",
    subline: "Das Auffrischungsprogramm für Taucher",
    image: "assets/32.jpg",
    alt: "ReActivate Tauchkurs",
    description:
      "Dein letzter Tauchgang ist schon Jahre her? Dann steige am besten mit unserem ReActivate-Programm wieder in den Sport ein. Gemeinsam frischen wir deine Kenntnisse auf, damit du erneut eigenständig tauchen kannst.",
    facts:
      "Preis: 150 Euro<br />Dauer: ½ Tag, 13.00 bis 16.00 Uhr<br />Termine nach Anfrage",
    dates: [{ value: "Termin nach Anfrage", label: "Termin nach Anfrage" }],
  },
};

const bookingForm = document.querySelector("#booking-form");
const courseSelect = document.querySelector("#course");
const dateSelect = document.querySelector("#booking-date");
const submitButton = bookingForm
  ? bookingForm.querySelector('button[type="submit"]')
  : null;
const bookingImage = document.querySelector("#booking-course-image");
const bookingTitle = document.querySelector("#booking-course-title");
const bookingSubline = document.querySelector("#booking-course-subline");
const bookingDescription = document.querySelector(
  "#booking-course-description",
);
const bookingFacts = document.querySelector("#booking-course-facts");

function fillDateOptions(courseId) {
  if (!dateSelect) return;

  const course = courses[courseId];
  dateSelect.innerHTML = '<option value="">Bitte Termin auswählen</option>';

  if (!course) return;

  course.dates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date.value;
    option.textContent = date.label;
    dateSelect.append(option);
  });
}

function updateCoursePreview(courseId) {
  const course = courses[courseId];
  if (!course) return;

  if (bookingImage) {
    bookingImage.src = course.image;
    bookingImage.alt = course.alt;
  }

  if (bookingTitle) bookingTitle.textContent = course.title;
  if (bookingSubline) bookingSubline.textContent = course.subline;
  if (bookingDescription) bookingDescription.textContent = course.description;
  if (bookingFacts) bookingFacts.innerHTML = course.facts;
}

function setCourse(courseId) {
  if (!courses[courseId] || !courseSelect) return;

  courseSelect.value = courseId;
  fillDateOptions(courseId);
  updateCoursePreview(courseId);
  validateBookingForm(false);
}

function setFieldError(field) {
  const label = field.closest("label");
  const error = label ? label.querySelector(".field-error") : null;

  if (!error) return;

  let message = "";

  if (field.validity.valueMissing) {
    message = "Dieses Feld muss ausgefüllt werden.";
  } else if (field.validity.typeMismatch && field.type === "email") {
    message = "Bitte eine gültige E-Mail-Adresse eintragen.";
  } else if (field.validity.patternMismatch) {
    message = "Bitte nur Buchstaben, Leerzeichen und Bindestriche verwenden.";
  } else if (field.validity.tooShort) {
    message = `Bitte mindestens ${field.minLength} Zeichen eintragen.`;
  }

  error.textContent = message;
}

function validateBookingForm(showErrors = true) {
  if (!bookingForm || !submitButton) return true;

  const fields = Array.from(
    bookingForm.querySelectorAll("input, select, textarea"),
  ).filter((field) => field.type !== "hidden" && field.name !== "_honey");
  const isValid = bookingForm.checkValidity();

  submitButton.disabled = !isValid;

  if (showErrors) {
    fields.forEach(setFieldError);
  }

  return isValid;
}

if (courseSelect) {
  courseSelect.addEventListener("change", () => {
    setCourse(courseSelect.value);
  });
}

if (bookingForm) {
  bookingForm.addEventListener("input", () => validateBookingForm(false));
  bookingForm.addEventListener("change", () => validateBookingForm(false));

  bookingForm.addEventListener("submit", (event) => {
    if (!validateBookingForm(true)) {
      event.preventDefault();
      const firstInvalidField = bookingForm.querySelector(":invalid");

      if (firstInvalidField) {
        firstInvalidField.focus();
      }
    }
  });

  setCourse(courseSelect ? courseSelect.value : "open-water-diver");
}

document.querySelectorAll(".book-course-link[data-course]").forEach((link) => {
  link.addEventListener("click", () => {
    setCourse(link.dataset.course || "open-water-diver");
  });
});
