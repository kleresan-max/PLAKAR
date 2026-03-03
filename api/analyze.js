export default async function handler(req, res) {

  const API_KEY = process.env.FOOTBALL_API_KEY;
  const { homeId, awayId, home, away } = req.query;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key não configurada." });
  }

  try {

    async function pegarUltimosJogos(teamId) {
      const response = await fetch(
        `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`,
        { headers: { "X-Auth-Token": API_KEY } }
      );

      const data = await response.json();
      return data.matches || [];
    }

    function calcularMedia(jogos, teamId) {
      if (jogos.length === 0) return { marcados: 1, sofridos: 1 };

      let marcados = 0;
      let sofridos = 0;

      jogos.forEach(jogo => {
        if (jogo.homeTeam.id == teamId) {
          marcados += jogo.score.fullTime.home ?? 0;
          sofridos += jogo.score.fullTime.away ?? 0;
        } else {
          marcados += jogo.score.fullTime.away ?? 0;
          sofridos += jogo.score.fullTime.home ?? 0;
        }
      });

      return {
        marcados: marcados / jogos.length,
        sofridos: sofridos / jogos.length
      };
    }

    const jogosHome = await pegarUltimosJogos(homeId);
    const jogosAway = await pegarUltimosJogos(awayId);

    const homeStats = calcularMedia(jogosHome, homeId);
    const awayStats = calcularMedia(jogosAway, awayId);

    const lambdaHome = (homeStats.marcados + awayStats.sofridos) / 2;
    const lambdaAway = (awayStats.marcados + homeStats.sofridos) / 2;

    function fatorial(n){ return n<=1 ? 1 : n*fatorial(n-1); }
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
