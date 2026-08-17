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
