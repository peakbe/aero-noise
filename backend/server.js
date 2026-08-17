// server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // obligatoire en CJS

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;

const AIRPORTS = {
  EBCI: {
    icao: "EBCI",
    iata: "CRL",
    lat: 50.4592,
    lon: 4.4538
  },

  EBLG: {
    icao: "EBLG",
    iata: "LGG",
    lat: 50.6374,
    lon: 5.4432
  }
};

// =====================================================
// CACHE PRO+++
// =====================================================

const CACHE_TTL = {
  weather: 120000,
  metar: 60000,
  airlabs: 60000,
  taf: 60000     // 60 sec
};

const cache = {
  weather: {},
  metar: {},
  airlabs: {},
  taf: {}        // { EBLG: { ts: 123456, data: {...} } }
};

function getCache(type, key) {
  const entry = cache[type][key];
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.ts < CACHE_TTL[type]) {
    return entry.data;
  }
  return null;
}

function setCache(type, key, data) {
  cache[type][key] = {
    ts: Date.now(),
    data
  };
}

/* =====================================================
   OPENWEATHER
===================================================== */

async function getOpenWeather(airport) {

  const cacheKey = airport.icao;
  const cached = getCache("weather", cacheKey);
  if (cached) return cached;

  const url =
    "https://api.openweathermap.org/data/2.5/weather" +
    `?lat=${airport.lat}` +
    `&lon=${airport.lon}` +
    `&appid=${process.env.OPENWEATHER_API_KEY}` +
    "&units=metric" +
    "&lang=fr";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenWeather HTTP ${response.status}`);
  }

  const data = await response.json();
  setCache("weather", cacheKey, data);

  return data;
}

// =====================================================
// FAA ADDS ENDPOINTS
// =====================================================

const FAA_METAR_URL = "https://aviationweather.gov/adds/dataserver_current/httpparam";
const FAA_TAF_URL   = "https://aviationweather.gov/adds/dataserver_current/httpparam";

// =====================================================
// FALLBACK METAR PRO+++
// =====================================================

function generateFallbackMetar(icao) {
  return {
    icao: icao,
    raw_text: `METAR ${icao} NIL`,
    station: icao,
    time: new Date().toISOString(),
    meta: {
      fallback: true,
      reason: "AviationWeather unavailable"
    }
  };
}

async function getFaaMetar(icao) {

  const url =
    `${FAA_METAR_URL}?` +
    `dataSource=metars&requestType=retrieve&format=xml&stationString=${icao}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`FAA METAR HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();

    // FAA renvoie du XML → on extrait le METAR brut
    const match = text.match(/<raw_text>(.*?)<\/raw_text>/);

    if (!match) {
      console.warn(`FAA METAR vide pour ${icao}`);
      return null;
    }

    return [{
      icao,
      raw_text: match[1],
      meta: { fallback: "FAA" }
    }];

  } catch (err) {
    console.error("Erreur FAA METAR:", err);
    return null;
  }
}

/* =====================================================
   AVIATION WEATHER / METAR
===================================================== */

async function getMetar(icao) {

  const cacheKey = icao;
  const cached = getCache("metar", cacheKey);
  if (cached) return cached;

  const url =
    `https://aviationweather.gov/api/data/metar` +
    `?ids=${icao}` +
    `&format=json`;

  let data;

  try {

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`AviationWeather METAR HTTP ${response.status}`);
      data = await getFaaMetar(icao) || [generateFallbackMetar(icao)];
    } else {

      const json = await response.json();

      if (!Array.isArray(json) || json.length === 0) {
        console.warn(`METAR vide AviationWeather → fallback FAA`);
        data = await getFaaMetar(icao) || [generateFallbackMetar(icao)];
      } else {
        data = json;
      }
    }

  } catch (err) {

    console.error("Erreur METAR:", err);
    data = await getFaaMetar(icao) || [generateFallbackMetar(icao)];

  }

  setCache("metar", cacheKey, data);
  return data;
}

/* =====================================================
   AVIATION WEATHER / FAA METAR
===================================================== */
async function getFaaMetar(icao) {

  const url =
    `${FAA_METAR_URL}?dataSource=metars&requestType=retrieve&format=xml&stationString=${icao}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`FAA METAR HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();

    const match = text.match(/<raw_text>(.*?)<\/raw_text>/);

    if (!match || !match[1]) {
      console.warn(`FAA METAR vide pour ${icao}`);
      return null;
    }

    return [{
      icao,
      raw_text: match[1],
      station: icao,
      time: new Date().toISOString(),
      meta: { fallback: "FAA" }
    }];

  } catch (err) {
    console.error("Erreur FAA METAR:", err);
    return null;
  }
}

// =====================================================
// FALLBACK TAF PRO+++
// =====================================================

function generateFallbackTaf(icao) {
  return {
    icao: icao,
    raw_text: `TAF ${icao} NIL`,
    time: new Date().toISOString(),
    meta: {
      fallback: true,
      reason: "TAF source unavailable"
    }
  };
}

async function getFaaTaf(icao) {

  const url =
    `${FAA_TAF_URL}?` +
    `dataSource=tafs&requestType=retrieve&format=xml&stationString=${icao}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`FAA TAF HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();

    const match = text.match(/<raw_text>(.*?)<\/raw_text>/);

    if (!match) {
      console.warn(`FAA TAF vide pour ${icao}`);
      return null;
    }

    return [{
      icao,
      raw_text: match[1],
      meta: { fallback: "FAA" }
    }];

  } catch (err) {
    console.error("Erreur FAA TAF:", err);
    return null;
  }
}

/* =====================================================
   AVIATION WEATHER / TAF
===================================================== */
async function getTaf(icao) {

  const cacheKey = icao;
  const cached = getCache("taf", cacheKey);
  if (cached) return cached;

  const url =
    `https://aviationweather.gov/api/data/taf` +
    `?ids=${icao}` +
    `&format=json`;

  let data;

  try {

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`AviationWeather TAF HTTP ${response.status}`);
      data = await getFaaTaf(icao) || [generateFallbackTaf(icao)];
    } else {

      const json = await response.json();

      if (!Array.isArray(json) || json.length === 0) {
        console.warn(`TAF vide AviationWeather → fallback FAA`);
        data = await getFaaTaf(icao) || [generateFallbackTaf(icao)];
      } else {
        data = json;
      }
    }

  } catch (err) {

    console.error("Erreur TAF:", err);
    data = await getFaaTaf(icao) || [generateFallbackTaf(icao)];

  }

  setCache("taf", cacheKey, data);
  return data;
}

/* =====================================================
   AVIATION WEATHER / FAA TAF
===================================================== */
async function getFaaTaf(icao) {

  const url =
    `${FAA_TAF_URL}?dataSource=tafs&requestType=retrieve&format=xml&stationString=${icao}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`FAA TAF HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();

    const match = text.match(/<raw_text>(.*?)<\/raw_text>/);

    if (!match || !match[1]) {
      console.warn(`FAA TAF vide pour ${icao}`);
      return null;
    }

    return [{
      icao,
      raw_text: match[1],
      station: icao,
      time: new Date().toISOString(),
      meta: { fallback: "FAA" }
    }];

  } catch (err) {
    console.error("Erreur FAA TAF:", err);
    return null;
  }
}

/* =====================================================
   AIRLABS SCHEDULES
===================================================== */

async function getAirLabsSchedules(airport) {

  const cacheKey = airport.iata;
  const cached = getCache("airlabs", cacheKey);
  if (cached) return cached;

  const base = "https://airlabs.co/api/v9/schedules";

  const params = new URLSearchParams({
    dep_iata: airport.iata,
    api_key: process.env.AIRLABS_API_KEY
  });

  const departures = await fetch(`${base}?${params}`);

  if (!departures.ok) {
    throw new Error(`AirLabs departures HTTP ${departures.status}`);
  }

  const depData = await departures.json();

  const arrParams = new URLSearchParams({
    arr_iata: airport.iata,
    api_key: process.env.AIRLABS_API_KEY
  });

  const arrivals = await fetch(`${base}?${arrParams}`);

  if (!arrivals.ok) {
    throw new Error(`AirLabs arrivals HTTP ${arrivals.status}`);
  }

  const arrData = await arrivals.json();

  const result = {
    departures: Array.isArray(depData.response) ? depData.response.slice(0, 10) : [],
    arrivals: Array.isArray(arrData.response) ? arrData.response.slice(0, 10) : []
  };

  setCache("airlabs", cacheKey, result);

  return result;
}

/* =====================================================
   ENDPOINT WEATHER
===================================================== */

app.get(
  "/api/weather/:airport",
  async (req, res) => {

    try {

      const airport =
        AIRPORTS[
          req.params.airport.toUpperCase()
        ];

      if (!airport) {
        return res
          .status(404)
          .json({
            error: "Aéroport inconnu"
          });
      }

     const [
  openWeather,
  metar,
  taf
] = await Promise.all([
  getOpenWeather(airport),
  getMetar(airport.icao),
  getTaf(airport.icao)
]);

      res.json({
        airport: airport.icao,
        openWeather,
        metar:
          metar?.[0] || null,
        taf: taf?.[0] || null,
        updatedAt:
          new Date().toISOString()
      });

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({
          error: error.message
        });

    }

  }
);

/* =====================================================
   ENDPOINT VOLS PRO+++
===================================================== */

app.get("/api/flights/:airport", async (req, res) => {
  try {

    const airport = AIRPORTS[req.params.airport.toUpperCase()];

    if (!airport) {
      return res.status(404).json({
        error: "Aéroport inconnu"
      });
    }

    const schedules = await getAirLabsSchedules(airport);

    // Sécurisation PRO+++
    const arrivals = Array.isArray(schedules?.arrivals)
      ? schedules.arrivals
      : [];

    const departures = Array.isArray(schedules?.departures)
      ? schedules.departures
      : [];

    res.json({
      airport: airport.icao,
      arrivals,
      departures,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {

    console.error("Erreur endpoint flights:", error);

    res.status(500).json({
      error: "Erreur interne AirLabs"
    });

  }
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      status: "ok",
      time: new Date().toISOString()
    });

  }
);


app.listen(
  PORT,
  () => {

    console.log(
      `Dashboard API disponible sur http://localhost:${PORT}`
    );

  }
);
