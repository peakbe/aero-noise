// server.js — Version PRO+++ Render + GitHub Pages

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

/* =====================================================
   CORS PRO+++ (GitHub Pages + Render)
===================================================== */

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

// CORS Express (complément)
app.use(cors({
  origin: "*",
  methods: ["GET"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =====================================================
   AÉROPORTS
===================================================== */

const AIRPORTS = {
  EBCI: { icao: "EBCI", iata: "CRL", lat: 50.4592, lon: 4.4538 },
  EBLG: { icao: "EBLG", iata: "LGG", lat: 50.6374, lon: 5.4432 }
};

/* =====================================================
   CACHE PRO+++
===================================================== */

const CACHE_TTL = {
  weather: 120000,
  metar: 60000,
  taf: 60000,
  airlabs: 60000
};

const cache = {
  weather: {},
  metar: {},
  taf: {},
  airlabs: {}
};

function getCache(type, key) {
  const entry = cache[type][key];
  if (!entry) return null;
  if (Date.now() - entry.ts < CACHE_TTL[type]) return entry.data;
  return null;
}

function setCache(type, key, data) {
  cache[type][key] = { ts: Date.now(), data };
}

/* =====================================================
   OPENWEATHER
===================================================== */

async function getOpenWeather(airport) {
  const cacheKey = airport.icao;
  const cached = getCache("weather", cacheKey);
  if (cached) return cached;

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${airport.lat}&lon=${airport.lon}` +
    `&appid=${process.env.OPENWEATHER_API_KEY}` +
    `&units=metric&lang=fr`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OpenWeather HTTP ${response.status}`);

  const data = await response.json();
  setCache("weather", cacheKey, data);
  return data;
}

/* =====================================================
   FAA ADDS
===================================================== */

const FAA_METAR_URL = "https://aviationweather.gov/adds/dataserver_current/httpparam";
const FAA_TAF_URL   = "https://aviationweather.gov/adds/dataserver_current/httpparam";

/* =====================================================
   FALLBACK METAR
===================================================== */

function generateFallbackMetar(icao) {
  return {
    icao,
    raw_text: `METAR ${icao} NIL`,
    station: icao,
    time: new Date().toISOString(),
    meta: { fallback: true }
  };
}

async function getFaaMetar(icao) {
  const url =
    `${FAA_METAR_URL}?dataSource=metars&requestType=retrieve&format=xml&stationString=${icao}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const text = await response.text();
    const match = text.match(/<raw_text>(.*?)<\/raw_text>/);

    if (!match || !match[1]) return null;

    return [{
      icao,
      raw_text: match[1],
      station: icao,
      time: new Date().toISOString(),
      meta: { fallback: "FAA" }
    }];

  } catch {
    return null;
  }
}

/* =====================================================
   METAR (AviationWeather + FAA fallback)
===================================================== */

async function getMetar(icao) {
  const cacheKey = icao;
  const cached = getCache("metar", cacheKey);
  if (cached) return cached;

  const url = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;

  let data;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      data = await getFaaMetar(icao) || [generateFallbackMetar(icao)];
    } else {
      const json = await response.json();
      data = Array.isArray(json) && json.length > 0
        ? json
        : await getFaaMetar(icao) || [generateFallbackMetar(icao)];
    }

  } catch {
    data = await getFaaMetar(icao) || [generateFallbackMetar(icao)];
  }

  setCache("metar", cacheKey, data);
  return data;
}

/* =====================================================
   FALLBACK TAF
===================================================== */

function generateFallbackTaf(icao) {
  return {
    icao,
    raw_text: `TAF ${icao} NIL`,
    time: new Date().toISOString(),
    meta: { fallback: true }
  };
}

async function getFaaTaf(icao) {
  const url =
    `${FAA_TAF_URL}?dataSource=tafs&requestType=retrieve&format=xml&stationString=${icao}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const text = await response.text();
    const match = text.match(/<raw_text>(.*?)<\/raw_text>/);

    if (!match || !match[1]) return null;

    return [{
      icao,
      raw_text: match[1],
      station: icao,
      time: new Date().toISOString(),
      meta: { fallback: "FAA" }
    }];

  } catch {
    return null;
  }
}

/* =====================================================
   TAF (AviationWeather + FAA fallback)
===================================================== */

async function getTaf(icao) {
  const cacheKey = icao;
  const cached = getCache("taf", cacheKey);
  if (cached) return cached;

  const url = `https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`;

  let data;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      data = await getFaaTaf(icao) || [generateFallbackTaf(icao)];
    } else {
      const json = await response.json();
      data = Array.isArray(json) && json.length > 0
        ? json
        : await getFaaTaf(icao) || [generateFallbackTaf(icao)];
    }

  } catch {
    data = await getFaaTaf(icao) || [generateFallbackTaf(icao)];
  }

  setCache("taf", cacheKey, data);
  return data;
}

/* =====================================================
   AIRLABS FLIGHTS — version PRO+++
===================================================== */

async function getAirLabsFlights(airport) {

  const API_KEY = process.env.AIRLABS_API_KEY;

  // AirLabs — vols départs
  const urlDep =
    `https://airlabs.co/api/v9/flights?dep_icao=${airport.icao}&api_key=${API_KEY}`;

  // AirLabs — vols arrivées
  const urlArr =
    `https://airlabs.co/api/v9/flights?arr_icao=${airport.icao}&api_key=${API_KEY}`;

  const depRes = await fetch(urlDep);
  const arrRes = await fetch(urlArr);

  const depJson = await depRes.json();
  const arrJson = await arrRes.json();

  const departures = depJson.response || [];
  const arrivals = arrJson.response || [];

  return {
    arrivals,
    departures
  };
}

/* =====================================================
   ENDPOINT WEATHER
===================================================== */

app.get("/api/weather/:airport", async (req, res) => {
  try {
    const airport = AIRPORTS[req.params.airport.toUpperCase()];
    if (!airport) return res.status(404).json({ error: "Aéroport inconnu" });

    const [openWeather, metar, taf] = await Promise.all([
      getOpenWeather(airport),
      getMetar(airport.icao),
      getTaf(airport.icao)
    ]);

    res.json({
      airport: airport.icao,
      openWeather,
      metar: metar?.[0] || null,
      taf: taf?.[0] || null,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =====================================================
   ENDPOINT FLIGHTS
===================================================== */

app.get("/api/flights/:airport", async (req, res) => {
  try {
    const airport = AIRPORTS[req.params.airport.toUpperCase()];
    if (!airport) return res.status(404).json({ error: "Aéroport inconnu" });

   const flights = await getAirLabsFlights(airport);

res.json({
  airport: airport.icao,
  arrivals: flights.arrivals,
  departures: flights.departures,
  updatedAt: new Date().toISOString()
});

  } catch {
    res.status(500).json({ error: "Erreur interne AirLabs" });
  }
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, () => {
  console.log(`Dashboard API disponible sur http://localhost:${PORT}`);
});
