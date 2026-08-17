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
// =====================================================
// AEROPORTS — données complètes (runways + sonomètres)
// =====================================================

const AIRPORTS = {
  EBCI: {
    name: "Brussels South Charleroi",
    city: "Charleroi",
    lat: 50.4592,
    lon: 4.4538,

    runways: [
      { id: "24", heading: 240, label: "Piste 24" },
      { id: "06", heading: 60,  label: "Piste 06" }
    ],

    sonometers: [
      { id:"F118", address:"Rue Piconette 1, Sombreffe", lat:50.5052667, lon:4.6111806 },
      { id:"F109", address:"Chaussée de Charleroi 265, Sombreffe", lat:50.4903528, lon:4.5623889 },
      ...
    ],

    conditions: {
      "24": { green:[...], red:[] },
      "06": { green:[...], red:[...] }
    }
  },

  EBLG: {
    name: "Liège Airport",
    city: "Liège",
    lat: 50.6374,
    lon: 5.4432,

    runways: [
      { id: "22", heading: 220, label: "Piste 22" },
      { id: "04", heading: 40,  label: "Piste 04" }
    ],

    sonometers: [
      { id:"F017", address:"Rue de la Pommeraie, 4690 Wonck", lat:50.7648833, lon:5.6306056 },
      { id:"F001", address:"Rue Franquet 15, Houtain", lat:50.7380444, lon:5.6088333 },
      ...
    ],

    conditions: {
      "22": { green:[...], red:[] },
      "04": { green:[...], red:[...] }
    }
  }
};

// =====================================================
// SONOMETRES — ND Airbus PRO+++ avec labels
// =====================================================

let sonoLayer = L.layerGroup();

export function updateSono(airportKey, activeRunway) {
  if (!map) return;

  sonoLayer.clearLayers();

  const ap = AIRPORTS[airportKey];
  if (!ap) return;

  const sonos = ap.sonometers || [];
  const cond = ap.conditions?.[activeRunway] || { green: [], red: [] };

  sonos.forEach(s => {
    const isGreen = cond.green.includes(s.id);
    const isRed   = cond.red.includes(s.id);

    const color = isGreen ? "#32ff7e" : isRed ? "#ff0033" : "#00e5ff";

    // Cercle ND style Airbus
    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 7,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.5
    });

    // Label ND (ID sonomètre)
    const labelIcon = L.divIcon({
      className: "sono-label",
      html: `<span>${s.id}</span>`,
      iconSize: [40, 16],
      iconAnchor: [20, -10]
    });

    const label = L.marker([s.lat, s.lon], { icon: labelIcon, interactive: false });

    // Popup détaillé
    marker.bindPopup(`
      <b>${s.id}</b><br>
      ${s.address}<br>
      <b>${isGreen ? "GREEN" : isRed ? "RED" : "NEUTRAL"}</b><br>
      RWY ${activeRunway}
    `);

    sonoLayer.addLayer(marker);
    sonoLayer.addLayer(label);
  });

  sonoLayer.addTo(map);
}
