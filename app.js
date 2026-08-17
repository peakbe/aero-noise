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
    const url = `https://dashboard-backend.onrender.com/api/weather/${key}`;
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
    const url = `https://dashboard-backend.onrender.com/api/flights/${key}`;
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
  const tafBox   = document.getElementById("taf-box");
  const wxBox    = document.getElementById("weather-box");

  if (metarBox) {
    metarBox.textContent = data.metar?.raw_text || "METAR indisponible";
  }

  if (tafBox) {
    tafBox.textContent = data.taf?.raw_text || "TAF indisponible";
  }

  if (wxBox && data.openWeather) {
    wxBox.innerHTML = `
      <div>Temp: ${data.openWeather.temp}°C</div>
      <div>Vent: ${data.openWeather.wind} km/h</div>
      <div>Humidité: ${data.openWeather.humidity}%</div>
    `;
  }
}

// =====================================================
// 7) UI — Vols AirLabs
// =====================================================

function updateFlightsUI(data) {

  const arrBox = document.getElementById("arrivals-box");
  const depBox = document.getElementById("departures-box");

  if (arrBox) {
    arrBox.innerHTML = data.arrivals
      .map(f => `<div>${f.flight_iata} — ${f.dep_time} → ${f.arr_time}</div>`)
      .join("") || "Aucune arrivée";
  }

  if (depBox) {
    depBox.innerHTML = data.departures
      .map(f => `<div>${f.flight_iata} — ${f.dep_time}</div>`)
      .join("") || "Aucun départ";
  }
}
