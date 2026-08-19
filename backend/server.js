// server.js — Version PRO+++ Render + GitHub Pages

require("dotenv").config();

const express = require("express");
const express = require("express");
const app = express();

// CORS PRO+++
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://peakbe.github.io");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

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

app.use(cors({ origin: "*", methods: ["GET"], allowedHeaders: ["Content-Type"] }));
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
   SAFE JSON PARSER — évite 500
===================================================== */

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* =====================================================
   SAFE FETCH — ne plante jamais
===================================================== */

async function safeFetch(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const json = safeJson(text);
    return json || null;
  } catch {
    return null;
  }
}

/* =====================================================
   OPENWEATHER — PRO+++ SAFE
===================================================== */

async function getOpenWeather(airport) {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${airport.lat}&lon=${airport.lon}` +
    `&appid=${process.env.OPENWEATHER_API_KEY}` +
    `&units=metric&lang=fr`;

  const json = await safeFetch(url);

  if (!json) {
    return {
      main: { temp: 0, humidity: 0 },
      wind: { speed: 0 },
      weather: [{ description: "Indisponible" }]
    };
  }

  return json;
}

/* =====================================================
   METAR — AviationWeather + FAA fallback + SAFE
===================================================== */

async function getMetar(icao) {
  const url = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;

  const json = await safeFetch(url);

  if (Array.isArray(json) && json.length > 0) {
    return json;
  }

  return [{
    rawOb: `METAR ${icao} NIL`,
    wspd: 0,
    wdir: 0
  }];
}

/* =====================================================
   TAF — AviationWeather + FAA fallback + SAFE
===================================================== */

async function getTaf(icao) {
  const url = `https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`;

  const json = await safeFetch(url);

  if (Array.isArray(json) && json.length > 0) {
    return json;
  }

  return [{
    rawTAF: `TAF ${icao} NIL`
  }];
}

/* =====================================================
   AIRLABS SCHEDULES — SAFE
===================================================== */

async function getAirLabsFlights(airport) {
  const API_KEY = process.env.AIRLABS_API_KEY;
  if (!API_KEY) return { arrivals: [], departures: [] };

  const urlDep = `https://airlabs.co/api/v9/schedules?dep_icao=${airport.icao}&api_key=${API_KEY}`;
  const urlArr = `https://airlabs.co/api/v9/schedules?arr_icao=${airport.icao}&api_key=${API_KEY}`;

  const depJson = await safeFetch(urlDep);
  const arrJson = await safeFetch(urlArr);

  return {
    arrivals: arrJson?.response || [],
    departures: depJson?.response || []
  };
}

/* =====================================================
   AVIATIONSTACK — SAFE
===================================================== */

async function getAviationStackFlights(airport) {
  const API_KEY = process.env.AVIATIONSTACK_KEY;
  if (!API_KEY) return { arrivals: [], departures: [] };

  const url =
    `https://api.aviationstack.com/v1/flights?dep_iata=${airport.iata}&access_key=${API_KEY}`;

  const json = await safeFetch(url);

  if (!json || !json.data) return { arrivals: [], departures: [] };

  const flights = json.data;

  return {
    arrivals: flights.filter(f => f.arrival?.iata === airport.iata),
    departures: flights.filter(f => f.departure?.iata === airport.iata)
  };
}

/* =====================================================
   OPEN SKY — SAFE
===================================================== */

async function getOpenSkyFlights(airport) {
  const begin = Math.floor(Date.now() / 1000 - 3600);
  const end = Math.floor(Date.now() / 1000);

  const url =
    `https://opensky-network.org/api/flights/departure?airport=${airport.icao}&begin=${begin}&end=${end}`;

  const json = await safeFetch(url);

  if (!json || !Array.isArray(json)) {
    return { arrivals: [], departures: [] };
  }

  return {
    arrivals: [],
    departures: json
  };
}

/* =====================================================
   FUSION PRO+++ — NE PLANTE JAMAIS
===================================================== */

async function getFlightsFusion(airport) {

  const airlabs = await getAirLabsFlights(airport);
  if (airlabs.arrivals.length || airlabs.departures.length) return airlabs;

  const avstack = await getAviationStackFlights(airport);
  if (avstack.arrivals.length || avstack.departures.length) return avstack;

  const opensky = await getOpenSkyFlights(airport);
  if (opensky.arrivals.length || opensky.departures.length) return opensky;

  return { arrivals: [], departures: [] };
}

/* =====================================================
   ENDPOINT WEATHER — SAFE
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

  } catch (err) {
    res.json({
      airport: req.params.airport,
      openWeather: null,
      metar: null,
      taf: null
    });
  }
});

/* =====================================================
   ENDPOINT FLIGHTS — SAFE
===================================================== */

app.get("/api/flights/:airport", async (req, res) => {
  try {
    const airport = AIRPORTS[req.params.airport.toUpperCase()];
    if (!airport) return res.status(404).json({ error: "Aéroport inconnu" });

    const flights = await getFlightsFusion(airport);

    res.json({
      airport: airport.icao,
      arrivals: flights.arrivals,
      departures: flights.departures,
      updatedAt: new Date().toISOString()
    });

  } catch (err) {
    res.json({
      airport: req.params.airport,
      arrivals: [],
      departures: []
    });
  }
});

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, () => {
  console.log(`Dashboard API disponible sur http://localhost:${PORT}`);
});
