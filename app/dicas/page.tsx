import type { Metadata } from "next";
import Link from "next/link";

import { ContentShell } from "@/components/content/content-shell";
import styles from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Dicas para ganhar no Stop: estratégias que funcionam",
  description:
    "Como ganhar no jogo Stop: estratégias para pensar mais rápido, fugir às respostas repetidas, escolher letras como comandante e quando gritar STOP.",
  alternates: { canonical: "/dicas" },
};

export default function TipsPage() {
  return (
    <ContentShell
      eyebrow="Estratégia"
      title="Dicas para ganhar no Stop"
      lead="Saber muitas palavras ajuda, mas quem ganha no Stop costuma ter outra vantagem: sabe onde perde tempo e porque perde pontos. Estas são as estratégias que mais fazem diferença."
      breadcrumbs={[{ href: "/dicas", label: "Dicas" }]}
    >
      <h2>1. Preenche primeiro as categorias fáceis</h2>
      <p>
        Não sigas a ordem do ecrã. Com a letra L, «Luanda» e «Leão» saem em
        dois segundos; «Profissão com L» pode bloquear-te. Escreve logo o que
        sai sem pensar e deixa as categorias difíceis para o fim. Assim,
        mesmo que alguém grite STOP cedo, já garantiste a maioria dos pontos.
      </p>

      <h2>2. Foge ao óbvio quando tens tempo</h2>
      <p>
        Uma resposta repetida vale apenas 5 pontos; uma resposta diferente
        vale 10. Se tens tempo de sobra, troca a resposta que todos vão dar
        por uma menos previsível.
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Letra e categoria</th>
            <th>Toda a gente escreve</th>
            <th>Tenta antes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A · País</td>
            <td>Angola</td>
            <td>Argélia, Áustria</td>
          </tr>
          <tr>
            <td>C · Animal</td>
            <td>Cão</td>
            <td>Camelo, Crocodilo</td>
          </tr>
          <tr>
            <td>M · Comida</td>
            <td>Muamba</td>
            <td>Mufete, Mamão</td>
          </tr>
          <tr>
            <td>P · Cidade</td>
            <td>Paris</td>
            <td>Porto Amboim, Pretória</td>
          </tr>
        </tbody>
      </table>
      <p>
        O truque é equilibrar: quando o relógio aperta, uma resposta repetida
        vale mais do que nenhuma.
      </p>

      <h2>3. Joga com o que é de casa</h2>
      <p>
        Respostas angolanas são uma arma secreta, sobretudo quando jogas com
        amigos de outros países. Comidas como Funge, Calulu, Mufete,
        Ginguba ou Gindungo, cidades como Saurimo, Menongue, Ondjiva ou
        N&apos;dalatando e animais como a Palanca-negra ou o Mabeco raramente se
        repetem e dão-te 10 ou até 20 pontos.
      </p>

      <h2>4. Treina as letras difíceis</h2>
      <p>
        Toda a gente se safa com A, C, M ou P. As partidas decidem-se nas
        letras difíceis: H, O, V, D e F. Nessas letras, uma resposta válida
        tem boas hipóteses de ser a única e valer 20 pontos. Vale a pena
        decorar duas ou três respostas por categoria para cada uma. As nossas{" "}
        <Link href="/palavras">listas de palavras por letra</Link> foram feitas
        para isso.
      </p>
      <div className={styles.callout}>
        <p>
          <strong>Exemplo:</strong> em País só existe Omã com O, e com D há
          apenas Dinamarca, Djibuti e Dominica. Saber isto de cor poupa
          segundos preciosos.
        </p>
      </div>

      <h2>5. Usa o abecedário mental</h2>
      <p>
        Quando bloqueias, percorre a segunda letra: para Animal com B, pensa
        «Ba… Babuíno, Baleia», «Be… Besouro», «Bo… Borboleta», «Bu… Búfalo,
        Burro». Dar ao cérebro um ponto de partida é muito mais rápido do que
        esperar que a palavra apareça sozinha.
      </p>

      <h2>6. Sabe quando gritar STOP</h2>
      <p>
        Gritar STOP cedo é poderoso: os outros jogadores ficam com categorias
        em branco, que valem 0, e tu tens mais hipóteses de ter respostas
        únicas. Mas atenção: antes de carregar no botão, confirma que todas
        as tuas respostas começam pela letra certa. Uma resposta inválida
        vale 0, e pode ir a votos.
      </p>
      <ul>
        <li>
          <strong>Grita logo</strong> se as tuas respostas são sólidas e a
          letra é difícil: os outros provavelmente ainda estão presos.
        </li>
        <li>
          <strong>Espera uns segundos</strong> se a letra é fácil e tens
          várias respostas óbvias: troca uma ou duas por algo mais original
          antes de parar a rodada.
        </li>
      </ul>

      <h2>7. Escolhe bem a letra quando és comandante</h2>
      <p>
        No jogastop, cada jogador comanda uma rodada e escolhe a letra. Se
        estás à frente na classificação, uma letra fácil reduz o risco. Se
        estás atrás, uma letra difícil, que conheças bem, aumenta a
        diferença entre quem sabe e quem não sabe. Mais um motivo para
        estudares as letras difíceis.
      </p>

      <h2>8. Vota com justiça</h2>
      <p>
        Nas votações de respostas duvidosas, aprova o que é razoável mesmo
        que seja de um adversário. Um grupo que vota com justiça joga mais
        vezes, e quem rejeita tudo acaba com as suas próprias respostas
        rejeitadas na rodada seguinte.
      </p>

      <h2>9. Personaliza as categorias</h2>
      <p>
        Se o teu grupo domina um tema, aproveita. Categorias como Clube de
        futebol, Artista angolano, Marca ou Fruta tornam o jogo novo outra
        vez. O anfitrião pode escolher até 10 categorias no lobby, prontas ou
        escritas à mão.
      </p>

      <p>
        Ainda tens dúvidas sobre a pontuação? Revê as{" "}
        <Link href="/regras">regras completas do Stop</Link>.
      </p>
    </ContentShell>
  );
}
