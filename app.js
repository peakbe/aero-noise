// app.js — logique ND / météo / vols PRO+++

import { initMap, resetMapView, addAirportMarker, updateSono } from "./map.js";

// =====================================================
// 1) INITIALISATION
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initUI();
  loadAirport("EBLG"); // aéroport par défaut
});

// =====================================================
// 2) UI — Boutons, sélection aéroport
// =====================================================

function initUI() {

  // Bouton recentrer
  const btn = document.getElementById("btn-recenter");
  if (btn) {
    btn.addEventListener("click", () => resetMapView());
  }

  // Sélecteur d’aéroport
  const selector = document.getElementById("airport-select");
  if (selector) {
    selector.addEventListener("change", (e) => {
      loadAirport(e.target.value);
    });
  }
}

// Bouton REFRESH
document.getElementById("btn-refresh").addEventListener("click", () => {
  loadAirport(window.currentAirportKey);
});

let sonoEnabled = true;

// Bouton SONO ON/OFF
document.getElementById("btn-sono").addEventListener("click", () => {
  sonoEnabled = !sonoEnabled;

  if (!sonoEnabled) {
    if (window.map && window.sonoLayer) window.sonoLayer.clearLayers();
  } else {
    const rwy = document.getElementById("mcdu-rwy").textContent.replace("RWY ", "");
    updateSono(window.currentAirportKey, rwy);
  }
});

// =====================================================
// 3) Charger un aéroport
// =====================================================

async function loadAirport(key) {
  try {
    setCurrentAirport(key);
    resetMapView();
    addAirportMarker(key);

    await Promise.all([
      loadWeather(key),
      loadFlights(key)
    ]);

  } catch (err) {
    console.error("Erreur loadAirport:", err);
  }
}

// =====================================================
// ✔ Version correcte de setCurrentAirport (à garder)
// =====================================================

export function setCurrentAirport(key) {
  if (!window.airports[key]) return;

  window.currentAirportKey = key;
  resetMapView();

  const rwyBox = document.getElementById("mcdu-rwy");

  let rwy = "24";
  if (rwyBox && rwyBox.textContent.includes("RWY")) {
    rwy = rwyBox.textContent.replace("RWY ", "");
  }

  updateSono(key, rwy);
}

// =====================================================
// 4) Charger météo
// =====================================================

async function loadWeather(key) {
  try {
    const url = `https://aero-noise.onrender.com/api/weather/${key}`;
    const res = await fetch(url);
    const data = await res.json();

    updateWeatherUI(data);
    updateMCDU(data);

  } catch (err) {
    console.error("Erreur météo:", err);
  }
}

// =====================================================
// 5) Charger vols
// =====================================================

async function loadFlights(key) {
  try {
    const url = `https://aero-noise.onrender.com/api/flights/${key}`;
    const res = await fetch(url);
    const data = await res.json();

    updateFlightsUI(data);
    updateSidebarFids(data);

  } catch (err) {
    console.error("Erreur vols:", err);
  }
}

// =====================================================
// 6) UI METAR / TAF / WX
// =====================================================

function updateWeatherUI(data) {
  const metarBox = document.getElementById("metar-box");
  const tafBox = document.getElementById("taf-box");
  const weatherBox = document.getElementById("weather-box");

  if (data.metar) {
    metarBox.textContent = data.metar.rawOb || "METAR indisponible";
  } else {
    metarBox.textContent = "METAR indisponible";
  }

  if (data.taf) {
    tafBox.textContent = data.taf.rawTAF || "TAF indisponible";
  } else {
    tafBox.textContent = "TAF indisponible";
  }

  if (data.openWeather) {
    const w = data.openWeather;
    weatherBox.innerHTML = `
      Temp: ${w.main.temp}°C<br>
      Vent: ${w.wind.speed} m/s<br>
      Humidité: ${w.main.humidity}%<br>
      Ciel: ${w.weather[0].description}
    `;
  } else {
    weatherBox.textContent = "Météo indisponible";
  }
}

// =====================================================
// 7) UI FIDS
// =====================================================

function updateFlightsUI(data) {
  const arrBox = document.getElementById("arrivals-box");
  const depBox = document.getElementById("departures-box");

  arrBox.innerHTML = (data.arrivals || [])
    .map(f => `
      <div>
        <span>${f.flight_iata || f.flight_icao || "—"}</span>
        <span>${f.dep_iata || "??"} → ${f.arr_iata || "??"}</span>
        <span>${f.arr_time || ""}</span>
      </div>
    `)
    .join("") || "Aucune arrivée";

  depBox.innerHTML = (data.departures || [])
    .map(f => `
      <div>
        <span>${f.flight_iata || f.flight_icao || "—"}</span>
        <span>${f.dep_iata || "??"} → ${f.arr_iata || "??"}</span>
        <span>${f.dep_time || ""}</span>
      </div>
    `)
    .join("") || "Aucun départ";
}

// =====================================================
// MCDU — WIND / RWY / TAF / ROSE ND
// =====================================================

function updateMCDU(data) {
  const windBox = document.getElementById("mcdu-wind");
  const rwyBox = document.getElementById("mcdu-rwy");
  const trendBox = document.getElementById("mcdu-trend");

  const wdir = data.metar?.wdir;
  const wspd = data.metar?.wspd;

  windBox.textContent = wdir
    ? `WIND ${wdir}° / ${wspd}KT`
    : "WIND ---";

  let rwy = "---";
  if (wdir !== undefined) {
    rwy = computeRunwayFromWind(wdir, window.currentAirportKey);
    rwyBox.textContent = `RWY ${rwy}`;
  } else {
    rwyBox.textContent = "RWY ---";
  }

  const taf = data.taf?.rawTAF || "";
  trendBox.textContent = extractTrends(taf);

  drawWindRose(wdir);

  updateSono(window.currentAirportKey, rwy);
}
// Ajout des tendances météo à venir (TAF)
function extractTrends(rawTAF) {
  if (!rawTAF) return "NO TREND";

  const blocks = rawTAF.match(/(BECMG|TEMPO|PROB\d+|FM\d+|TL\d+|AT\d+)[^A-Z]*/g);
  if (!blocks) return "NO TREND";

  return blocks.join(" | ");
}
// =====================================================
// RWY FROM WIND
// =====================================================

function computeRunwayFromWind(wdir, airportKey) {
  const ap = window.AIRPORTS?.[airportKey];
  if (!ap || !ap.runways) return "---";

  let bestRunway = "---";
  let bestDiff = 999;

  ap.runways.forEach(r => {
    const diff = Math.abs(wdir - r.heading);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestRunway = r.id;
    }
  });

  return bestRunway;
}

// =====================================================
// ROSE ND AIRBUS
// =====================================================

function drawWindRose(wdir) {
  const canvas = document.getElementById("mcdu-rose");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 220, 220);

  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(110, 110, 90, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(110, 20);
  ctx.lineTo(110, 200);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, 110);
  ctx.lineTo(200, 110);
  ctx.stroke();

  if (wdir !== undefined) {
    const rad = (wdir - 90) * Math.PI / 180;
    const x = 110 + Math.cos(rad) * 70;
    const y = 110 + Math.sin(rad) * 70;

    ctx.strokeStyle = "#32ff7e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 110);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // vols confirmés (Arrivées + Départs) side-bar
  function updateSidebarFids(data) {
  const arrEl = document.getElementById("mcdu-fids-arr");
  const depEl = document.getElementById("mcdu-fids-dep");

  const arrivals = (data.arrivals || []).slice(0, 10);
  const departures = (data.departures || []).slice(0, 10);

  arrEl.innerHTML = arrivals.map(f => {
    const status = (f.status || "").toLowerCase();
    let cls = "mcdu-fids-row";

    if (status.includes("delay")) cls += " mcdu-fids-delay";
    if (status.includes("cancel")) cls += " mcdu-fids-cancel";

    return `
      <div class="${cls}">
        <span>${f.flight_iata || f.flight_icao || "—"}</span>
        <span>${f.dep_iata || "??"} → ${f.arr_iata || "??"}</span>
        <span>${f.arr_time || ""}</span>
      </div>
    `;
  }).join("");

  depEl.innerHTML = departures.map(f => {
    const status = (f.status || "").toLowerCase();
    let cls = "mcdu-fids-row";

    if (status.includes("delay")) cls += " mcdu-fids-delay";
    if (status.includes("cancel")) cls += " mcdu-fids-cancel";

    return `
      <div class="${cls}">
        <span>${f.flight_iata || f.flight_icao || "—"}</span>
        <span>${f.dep_iata || "??"} → ${f.arr_iata || "??"}</span>
        <span>${f.dep_time || ""}</span>
      </div>
    `;
  }).join("");
}

}
