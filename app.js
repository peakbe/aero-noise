// map.js — carte ND / radar PRO+++

// ⚙️ Initialisation carte
let map;
window.airports = {
  EBCI: { icao: "EBCI", lat: 50.4592, lon: 4.4538 },
  EBLG: { icao: "EBLG", lat: 50.6374, lon: 5.4432 }
};
window.currentAirportKey = "EBLG"; // valeur par défaut

export function initMap() {
  if (map) return;

  const defaultCenter = [50.5, 4.7];
  const defaultZoom = 8;

  map = L.map("map", {
    zoomControl: true,
    minZoom: 5,
    maxZoom: 17
  }).setView(defaultCenter, defaultZoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19
  }).addTo(map);

  window.map = map;
}

// 🧭 Recentrer sur l’aéroport actif
export function resetMapView() {
  if (!map) return;

  const key = window.currentAirportKey;
  const ap = window.airports?.[key];

  if (ap) {
    map.setView([ap.lat, ap.lon], 13);
  } else {
    map.setView([50.5, 4.7], 8);
  }
}

// 📍 Mettre à jour l’aéroport actif (depuis app.js)
export function setCurrentAirport(key) {
  if (!window.airports[key]) return;
  window.currentAirportKey = key;
  resetMapView();
}

// ✈️ Exemple d’ajout de marker METAR/TAF
export function addAirportMarker(key) {
  const ap = window.airports[key];
  if (!ap || !map) return;

  L.marker([ap.lat, ap.lon])
    .addTo(map)
    .bindPopup(`${ap.icao}`);
}
