export default async function handler(req, res) {

  const API_KEY = process.env.FOOTBALL_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key não configurada." });
  }

  const { home, away } = req.query;

  if (!home || !away) {
    return res.status(400).json({ error: "Times não informados." });
  }

  try {

    // Buscar últimos jogos dos dois times
    const response = await fetch(
      `https://api.football-data.org/v4/matches?status=FINISHED&limit=50`,
      {
        headers: {
          "X-Auth-Token": API_KEY
        }
      }
    );

    const data = await response.json();

    const matches = data.matches;

    function calcularMedia(time) {
      const jogos = matches.filter(m =>
        m.homeTeam.name === time || m.awayTeam.name === time
      ).slice(0,10);

      let golsMarcados = 0;
      let golsSofridos = 0;

      jogos.forEach(jogo => {
        if (jogo.homeTeam.name === time) {
          golsMarcados += jogo.score.fullTime.home;
          golsSofridos += jogo.score.fullTime.away;
        } else {
          golsMarcados += jogo.score.fullTime.away;
          golsSofridos += jogo.score.fullTime.home;
        }
      });

      return {
        mediaMarcados: golsMarcados / jogos.length || 1,
        mediaSofridos: golsSofridos / jogos.length || 1
      };
    }

    const homeStats = calcularMedia(home);
    const awayStats = calcularMedia(away);

    const lambdaHome = (homeStats.mediaMarcados + awayStats.mediaSofridos) / 2;
    const lambdaAway = (awayStats.mediaMarcados + homeStats.mediaSofridos) / 2;

    function fatorial(n){
      if(n===0) return 1;
      return n*fatorial(n-1);
    }

    function poisson(k,lambda){
      return (Math.exp(-lambda)*Math.pow(lambda,k))/fatorial(k);
    }

    let probCasa=0, probEmpate=0, probFora=0;

    for(let i=0;i<=5;i++){
      for(let j=0;j<=5;j++){
        const p=poisson(i,lambdaHome)*poisson(j,lambdaAway);
        if(i>j) probCasa+=p;
        if(i===j) probEmpate+=p;
        if(j>i) probFora+=p;
      }
    }

    return res.status(200).json({
      home,
      away,
      probCasa,
      probEmpate,
      probFora
    });

  } catch (error) {
    return res.status(500).json({ error: "Erro ao analisar jogo." });
  }
}
