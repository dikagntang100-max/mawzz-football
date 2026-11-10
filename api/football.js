export default async function handler(req, res) {
  const { action } = req.query;
  const KEY = process.env.API_FOOTBALL_KEY;
  const BASE = "https://v3.football.api-sports.io";

  if (!KEY) {
    return res.status(500).json({ error: "API_FOOTBALL_KEY belum diatur di Vercel." });
  }

  async function api(endpoint, params = {}) {
    const url = new URL(BASE + endpoint);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v);
      }
    });

    const response = await fetch(url, {
      headers: { "x-apisports-key": KEY }
    });

    const data = await response.json();

    if (!response.ok || data.errors && Object.keys(data.errors).length) {
      throw new Error(JSON.stringify(data.errors || data.message || "API error"));
    }

    return data.response || [];
  }

  try {
    if (action === "teams") {
      const response = await api("/teams", {
        league: req.query.league,
        season: req.query.season
      });
      return res.status(200).json({ response });
    }

    if (action === "squad") {
      const response = await api("/players/squads", {
        team: req.query.team
      });
      return res.status(200).json({ response });
    }

    if (action === "clublineup") {
      const team = req.query.team;
      const league = req.query.league;
      const season = req.query.season;

      if (!team || !league || !season) {
        return res.status(400).json({
          error: "Team, league, dan season wajib diisi."
        });
      }

      // Cari hingga 10 pertandingan terakhir klub.
      const fixtures = await api("/fixtures", {
        team,
        league,
        season,
        last: 10
      });

      if (!fixtures.length) {
        return res.status(404).json({
          error: "Belum ditemukan pertandingan klub."
        });
      }

      // Cari lineup asli yang tersedia.
      for (const fixture of fixtures) {
        const lineups = await api("/fixtures/lineups", {
          fixture: fixture.fixture.id,
          team
        });

        const lineup = lineups.find(
          item => String(item.team.id) === String(team)
        );

        if (lineup && lineup.startXI?.length) {
          return res.status(200).json({
            fixture: fixture.fixture,
            team: lineup.team,
            formation: lineup.formation,
            coach: lineup.coach,
            startXI: lineup.startXI,
            substitutes: lineup.substitutes || [],
            source: "API Football - Official fixture lineup"
          });
        }
      }

      return res.status(404).json({
        error: "Lineup asli belum tersedia untuk 10 pertandingan terakhir klub."
      });
    }

    return res.status(400).json({
      error: "Action tidak dikenal."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Gagal mengambil data API.",
      details: error.message
    });
  }
}
