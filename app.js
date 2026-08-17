// app.js — logique ND / météo / vols PRO+++

import { initMap, resetMapView, setCurrentAirport, addAirportMarker } from "./map.js";

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

  // Sélecteur d’aéroport (si présent dans ton HTML)
  const selector = document.getElementById("airport-select");
  if (selector) {
    selector.addEventListener("change", (e) => {
      loadAirport(e.target.value);
    });
  }
}

// =====================================================
// 3) Charger un aéroport (METAR, TAF, météo, vols)
// =====================================================

async function loadAirport(key) {
  try {
    setCurrentAirport(key);     // met à jour la carte
    resetMapView();             // recentre automatiquement
    addAirportMarker(key);      // ajoute marker

    await Promise.all([
      loadWeather(key),
      loadFlights(key)
    ]);

  } catch (err) {
    console.error("Erreur loadAirport:", err);
  }
}

// =====================================================
// 4) Charger météo (METAR + TAF + OpenWeather)
// =====================================================

async function loadWeather(key) {
  try {
    const url = `https://aero-noise.onrender.com/api/weather/${key}`;
    const res = await fetch(url);
    const data = await res.json();

    updateWeatherUI(data);

  } catch (err) {
    console.error("Erreur météo:", err);
  }
}

// =====================================================
// 5) Charger vols AirLabs
// =====================================================

async function loadFlights(key) {
  try {
    const url = `https://aero-noise.onrender.com/api/flights/${key}`;
    const res = await fetch(url);
    const data = await res.json();

    updateFlightsUI(data);

  } catch (err) {
    console.error("Erreur vols:", err);
  }
}

// =====================================================
// 6) UI — METAR / TAF / météo
// =====================================================

function updateWeatherUI(data) {
  const metarBox = document.getElementById("metar-box");
  const tafBox = document.getElementById("taf-box");
  const weatherBox = document.getElementById("weather-box");

  // METAR
  if (data.metar) {
    metarBox.textContent = data.metar.rawOb || "METAR indisponible";
  } else {
    metarBox.textContent = "METAR indisponible";
  }

  // TAF
  if (data.taf) {
    tafBox.textContent = data.taf.rawTAF || "TAF indisponible";
  } else {
    tafBox.textContent = "TAF indisponible";
  }

  // OpenWeather
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
// 7) UI — Vols AirLabs
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
// MCDU — Rose des vents + RWY + tendances
// =====================================================

function updateMCDU(data) {
  const windBox = document.getElementById("mcdu-wind");
  const rwyBox = document.getElementById("mcdu-rwy");
  const trendBox = document.getElementById("mcdu-trend");

  // --- METAR WIND ---
  const wdir = data.metar?.wdir;
  const wspd = data.metar?.wspd;

  windBox.textContent = wdir
    ? `WIND ${wdir}° / ${wspd}KT`
    : "WIND ---";

  // --- RWY RECOMMANDÉE ---
  if (wdir !== undefined) {
    const rwy = computeRunwayFromWind(wdir);
    rwyBox.textContent = `RWY ${rwy}`;
  } else {
    rwyBox.textContent = "RWY ---";
  }

  // --- TENDANCES TAF ---
  const taf = data.taf?.rawTAF || "";
  const trends = taf.match(/(BECMG|TEMPO|PROB\d+)/g);
  trendBox.textContent = trends ? trends.join(" ") : "NO TREND";

  // --- ROSE DES VENTS ---
  drawWindRose(wdir);
}

// =====================================================
// Calcul RWY en fonction du vent
// =====================================================

function computeRunwayFromWind(wdir) {
  const rwy = Math.round(wdir / 10);
  return rwy.toString().padStart(2, "0");
}

// =====================================================
// Dessin rose des vents ND Airbus
// =====================================================

function drawWindRose(wdir) {
  const canvas = document.getElementById("mcdu-rose");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 220, 220);

  // Cercle ND
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(110, 110, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Axe Nord
  ctx.beginPath();
  ctx.moveTo(110, 20);
  ctx.lineTo(110, 200);
  ctx.stroke();

  // Axe Est-Ouest
  ctx.beginPath();
  ctx.moveTo(20, 110);
  ctx.lineTo(200, 110);
  ctx.stroke();

  // Vent
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
}
