// server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
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


/* =====================================================
   OPENWEATHER
===================================================== */

async function getOpenWeather(airport) {

  const url =
    "https://api.openweathermap.org/data/2.5/weather" +
    `?lat=${airport.lat}` +
    `&lon=${airport.lon}` +
    `&appid=${process.env.OPENWEATHER_API_KEY}` +
    "&units=metric" +
    "&lang=fr";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `OpenWeather HTTP ${response.status}`
    );
  }

  return response.json();
}


/* =====================================================
   AVIATION WEATHER / METAR
===================================================== */

async function getMetar(icao) {

  const url =
    `https://aviationweather.gov/api/data/metar` +
    `?ids=${icao}` +
    `&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `AviationWeather HTTP ${response.status}`
    );
  }

  return response.json();
}


/* =====================================================
   AIRLABS SCHEDULES
===================================================== */

async function getAirLabsSchedules(airport) {

  const base =
    "https://airlabs.co/api/v9/schedules";

  const params =
    new URLSearchParams({
      dep_iata: airport.iata,
      api_key: process.env.AIRLABS_API_KEY
    });

  const departures =
    await fetch(`${base}?${params}`);

  if (!departures.ok) {
    throw new Error(
      `AirLabs departures HTTP ${departures.status}`
    );
  }

  const depData =
    await departures.json();


  const arrParams =
    new URLSearchParams({
      arr_iata: airport.iata,
      api_key: process.env.AIRLABS_API_KEY
    });

  const arrivals =
    await fetch(
      `${base}?${arrParams}`
    );

  if (!arrivals.ok) {
    throw new Error(
      `AirLabs arrivals HTTP ${arrivals.status}`
    );
  }

  const arrData =
    await arrivals.json();


  return {

    departures:
      (depData.response || [])
        .slice(0, 10),

    arrivals:
      (arrData.response || [])
        .slice(0, 10)

  };
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
        metar
      ] = await Promise.all([

        getOpenWeather(airport),

        getMetar(
          airport.icao
        )

      ]);


      res.json({

        airport: airport.icao,

        openWeather,

        metar:
          metar?.[0] || null,

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
   ENDPOINT VOLS
===================================================== */

app.get(
  "/api/flights/:airport",
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


      const schedules =
        await getAirLabsSchedules(
          airport
        );


      res.json({

        airport: airport.icao,

        arrivals:
          schedules.arrivals,

        departures:
          schedules.departures,

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
