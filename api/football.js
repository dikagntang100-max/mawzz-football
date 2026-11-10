export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    return res.status(500).json({
      error: "API_FOOTBALL_KEY belum dipasang di Vercel"
    });
  }

  const { action, league, season = "2026", team } = req.query;

  const leagueIds = ["39", "140", "135", "78", "61", "88", "2", "274"];

  let endpoint;

  if (action === "teams") {
    if (!leagueIds.includes(String(league))) {
      return res.status(400).json({ error: "Liga tidak valid" });
    }

    endpoint = `teams?league=${league}&season=${season}`;
  } else if (action === "squad") {
    if (!/^\d+$/.test(String(team || ""))) {
      return res.status(400).json({ error: "ID klub tidak valid" });
    }

    endpoint = `players/squads?team=${team}`;
  } else {
    return res.status(400).json({ error: "Action tidak valid" });
  }

  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/${endpoint}`,
      {
        headers: {
          "x-apisports-key": key
        }
      }
    );

    const data = await response.json();

    if (!response.ok || data.errors && Object.keys(data.errors).length) {
      return res.status(response.status || 502).json({
        error: "Gagal mengambil data sepak bola",
        details: data.errors
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Kesalahan koneksi API"
    });
  }
}
