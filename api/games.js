export default async function handler(req, res) {

  const API_KEY = process.env.FOOTBALL_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key não configurada." });
  }

  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + 3);

  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = future.toISOString().split("T")[0];

  try {

    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { "X-Auth-Token": API_KEY } }
    );

    const data = await response.json();

    const jogos = data.matches.map(match => ({
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      homeId: match.homeTeam.id,
      awayId: match.awayTeam.id,
      homeCrest: match.homeTeam.crest,
      awayCrest: match.awayTeam.crest,
      competition: match.competition.name,
      country: match.competition.area?.name || "",
      status: match.status
    }));

    return res.status(200).json(jogos);

  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar jogos." });
  }
}
