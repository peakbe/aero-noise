// map.js — carte ND / radar PRO+++

// ⚙️ Initialisation carte
let map;

// Aéroports pour centrage carte (version simple)
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

// ✈️ Ajout marker METAR/TAF
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
      { id:"F101", address:"Rue Bruhaute 46, Jumet", lat:50.4478806, lon:4.4158389 },
      { id:"F102", address:"Rue du Vigneron 5, Jumet", lat:50.4460361, lon:4.4229333 },
      { id:"F103", address:"Rue Docteur Pircard 61, Jumet", lat:50.4523861, lon:4.4157444 },
      { id:"F104", address:"Rue du Chiffon Rouge 12, Roux", lat:50.4423389, lon:4.3925556 },
      { id:"F105", address:"Rue Sous le Bois 59, Roux", lat:50.4470056, lon:4.4005167 },
      { id:"F106", address:"Rue Beaurin et Jonet 17, Wangenies", lat:50.4798639, lon:4.5195722 },
      { id:"F107", address:"Rue Maximilien Wattelar 155, Jumet", lat:50.4439611, lon:4.4111611 },
      { id:"F108", address:"Avenue Brunard 83, Fleurus", lat:50.4866583, lon:4.5462806 },
      { id:"F109", address:"Chaussée de Charleroi 265, Sombreffe", lat:50.4903528, lon:4.5623889 },
      { id:"F110", address:"Rue Émile Vandervelde 396, Forchies", lat:50.4235694, lon:4.3273806 },
      { id:"F111", address:"Rue de la Baille 42, Courcelles", lat:50.4385222, lon:4.352075 },
      { id:"F112", address:"Rue des Liserons 44, Goutroux", lat:50.4246528, lon:4.3577083 },
      { id:"F114", address:"Rue des Ruelles / Rue de la source, Anderlues", lat:50.4098306, lon:4.2771667 },
      { id:"F116", address:"Rue de l'Enseignement 144, Fontaine-l'Evêque", lat:50.4106333, lon:4.3150528 },
      { id:"F117", address:"Rue du Terril 1, Forchies", lat:50.4315, lon:4.3149194 },
      { id:"F118", address:"Rue Piconette 1, Sombreffe", lat:50.5052667, lon:4.6111806 },
      { id:"F119", address:"Rue René Delhaize 39, Ransart", lat:50.4632139, lon:4.4790917 }
    ],

    conditions: {
      "24": {
        green: ["F101","F102","F103","F104","F105","F106","F107","F108","F109","F110","F111","F112","F114","F116","F117","F118","F119"],
        red: []
      },
      "06": {
        green: ["F101","F102","F103","F104","F105","F106","F107","F108","F109","F110","F111","F112","F119"],
        red: ["F114","F116","F117","F118"]
      }
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
      { id:"F001", address:"Rue Franquet 15, Houtain", lat:50.7380444, lon:5.6088333 },
      { id:"F002", address:"Rue Noiset 23, St Georges", lat:50.5884139, lon:5.3705222 },
      { id:"F003", address:"Rue Fond Méan 7, St Georges", lat:50.6011667, lon:5.3814 },
      { id:"F004", address:"Vinâve des Stréats 32, Verlaine", lat:50.6054139, lon:5.3214056 },
      { id:"F005", address:"Rue Caquin 4, Haneffe", lat:50.6393306, lon:5.3235194 },
      { id:"F006", address:"Rue Bolly Chapon 11, Seraing", lat:50.6095944, lon:5.2714028 },
      { id:"F007", address:"Rue Yernawe 13, St Georges", lat:50.5907556, lon:5.345225 },
      { id:"F008", address:"Rue Warfusée 5, St Georges", lat:50.5948778, lon:5.35895 },
      { id:"F009", address:"Bibliothèque Communale, Place Verte, 4470 Stockay", lat:50.5808306, lon:5.3554167 },
      { id:"F010", address:"Rue Haute Voie 23, Verlaine", lat:50.5993917, lon:5.3134917 },
      { id:"F011", address:"Rue Albert 1er 18, St Georges", lat:50.6011417, lon:5.3558944 },
      { id:"F012", address:"Rue Barbe d'Or 13, 4317 Aineffe", lat:50.6219167, lon:5.2547472 },
      { id:"F013", address:"Rue Bois Léon 31, Verlaine", lat:50.5869139, lon:5.3086778 },
      { id:"F014", address:"Rue Léon Labye 12, Juprelle", lat:50.7188944, lon:5.5731639 },
      { id:"F015", address:"Rue du Brouck 5, Juprelle", lat:50.6888389, lon:5.5262167 },
      { id:"F016", address:"Rue de Chapon-Seraing 14, Verlaine", lat:50.6196167, lon:5.2953444 },
      { id:"F017", address:"Rue de la Pommeraie, 4690 Wonck", lat:50.7648833, lon:5.6306056 }
    ],

    conditions: {
      "22": {
        green: ["F001","F002","F003","F004","F005","F006","F007","F008","F009","F010","F011","F012","F013","F014","F015","F016","F017"],
        red: []
      },
      "04": {
        green: ["F001","F002","F003","F007","F008","F009","F011","F013","F014","F015"],
        red: ["F004","F005","F006","F010","F012","F016","F017"]
      }
    }
  }

};

window.AIRPORTS = AIRPORTS;

// =====================================================
// SONOMETRES — ND Airbus PRO+++ avec labels
// =====================================================

let sonoLayer = L.layerGroup();
window.sonoLayer = sonoLayer;

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

    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 7,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.5
    });

    const labelIcon = L.divIcon({
      className: "sono-label",
      html: `<span>${s.id}</span>`,
      iconSize: [40, 16],
      iconAnchor: [20, -10]
    });

    const label = L.marker([s.lat, s.lon], { icon: labelIcon, interactive: false });

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
