export default async function handler(req, res) {

  const API_KEY = process.env.FOOTBALL_API_KEY;
  const { homeId, awayId, home, away } = req.query;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key não configurada." });
  }

  try {

    async function pegarJogos(teamId) {
      const response = await fetch(
        `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`,
        { headers: { "X-Auth-Token": API_KEY } }
      );

      const data = await response.json();
      return data.matches || [];
    }

    function calcularStats(jogos, teamId, isHomeTeam) {

      if (jogos.length === 0) {
        return { marcados: 1, sofridos: 1 };
      }

      let marcadosRecentes = 0;
      let sofridosRecentes = 0;
      let marcadosAntigos = 0;
      let sofridosAntigos = 0;

      jogos.forEach((jogo, index) => {

        let marcou = 0;
        let sofreu = 0;

        if (jogo.homeTeam.id == teamId) {
          marcou = jogo.score.fullTime.home ?? 0;
          sofreu = jogo.score.fullTime.away ?? 0;
        } else {
          marcou = jogo.score.fullTime.away ?? 0;
          sofreu = jogo.score.fullTime.home ?? 0;
        }

        if (index < 5) {
          marcadosRecentes += marcou;
          sofridosRecentes += sofreu;
        } else {
          marcadosAntigos += marcou;
          sofridosAntigos += sofreu;
        }

      });

      const mediaRecente = (marcadosRecentes / 5);
      const mediaAntiga = (marcadosAntigos / 5);

      const sofridoRecente = (sofridosRecentes / 5);
      const sofridoAntigo = (sofridosAntigos / 5);

      return {
        marcados: (mediaRecente * 0.6) + (mediaAntiga * 0.4),
        sofridos: (sofridoRecente * 0.6) + (sofridoAntigo * 0.4)
      };
    }

    const jogosHome = await pegarJogos(homeId);
    const jogosAway = await pegarJogos(awayId);

    const homeStats = calcularStats(jogosHome, homeId);
    const awayStats = calcularStats(jogosAway, awayId);

    let lambdaHome = (homeStats.marcados + awayStats.sofridos) / 2;
    let lambdaAway = (awayStats.marcados + homeStats.sofridos) / 2;

    // Fator mando
    lambdaHome *= 1.10;

    function fatorial(n){ return n<=1 ? 1 : n*fatorial(n-1); }
    function poisson(k,lambda){
      return (Math.exp(-lambda)*Math.pow(lambda,k))/fatorial(k);
    }

    let probCasa=0, probEmpate=0, probFora=0;
    let over25=0;
    let btts=0;

    for(let i=0;i<=5;i++){
      for(let j=0;j<=5;j++){
        const p=poisson(i,lambdaHome)*poisson(j,lambdaAway);

        if(i>j) probCasa+=p;
        if(i===j) probEmpate+=p;
        if(j>i) probFora+=p;

        if(i+j>2) over25+=p;
        if(i>0 && j>0) btts+=p;
      }
    }

    return res.status(200).json({
      home,
      away,
      probCasa,
      probEmpate,
      probFora,
      over25,
      btts
    });

  } catch (error) {
    return res.status(500).json({ error: "Erro ao analisar jogo." });
  }
}
