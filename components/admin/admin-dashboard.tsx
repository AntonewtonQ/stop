"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleDot,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import type { AdminDashboardStats } from "@/lib/admin/types";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "./admin-dashboard.module.css";

const ADMIN_PASSWORD_KEY = "jogastop:admin-password";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-AO").format(value);
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("pt-AO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    lobby: "Lobby",
    "letter-selection": "Escolha da letra",
    round: "Rodada",
    results: "Resultados",
    finished: "Concluída",
  };

  return labels[status] ?? status;
}

async function fetchStats(password: string) {
  const response = await fetch("/api/admin/summary", {
    headers: { authorization: `Bearer ${password}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Não conseguimos abrir o painel.");
  }

  return (await response.json()) as AdminDashboardStats;
}

export function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metricCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: "Salas activas",
        value: stats.usage.activeRooms,
        detail: `${stats.activeRooms.length} listadas agora`,
        icon: Activity,
      },
      {
        label: "Jogadores online",
        value: stats.usage.onlinePlayers,
        detail: `${stats.usage.totalPlayers} jogadores no histórico actual`,
        icon: Users,
      },
      {
        label: "Partidas concluídas",
        value: stats.usage.finishedRooms,
        detail: `${stats.usage.weeklyFinishedRooms} nos últimos 7 dias`,
        icon: Trophy,
      },
      {
        label: "Votações pendentes",
        value: stats.usage.pendingVotes,
        detail: `${stats.usage.votesCast} votos registados`,
        icon: BarChart3,
      },
    ];
  }, [stats]);

  const load = useCallback(async (nextPassword: string) => {
    if (!nextPassword.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchStats(nextPassword.trim());
      setStats(result);
      setPassword(nextPassword.trim());
      window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, nextPassword.trim());
    } catch (loadError) {
      setStats(null);
      setError(loadError instanceof Error ? loadError.message : "Erro interno.");
      window.sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(password);
  }

  useEffect(() => {
    const saved = window.sessionStorage.getItem(ADMIN_PASSWORD_KEY);
    if (!saved) return;

    const timeout = window.setTimeout(() => {
      setPassword(saved);
      void load(saved);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Voltar ao jogastop">
          <Logo />
        </Link>
        <div className={styles.headerActions}>
          <Button asChild variant="outline">
            <Link href="/ranking">Ranking público</Link>
          </Button>
          {stats && (
            <Button onClick={() => void load(password)} disabled={loading}>
            <RefreshCw aria-hidden="true" />
            Actualizar
          </Button>
          )}
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <ShieldCheck aria-hidden="true" />
            Admin interno
          </span>
          <h1>Estado vivo do jogastop.</h1>
          <p>
            Vê salas activas, jogadores online, partidas concluídas, uso geral,
            ranking semanal e erros recentes sem entrar no banco manualmente.
          </p>
        </div>

        {!stats && (
          <form className={styles.loginCard} onSubmit={submit}>
            <label htmlFor="admin-password">Palavra-passe do painel</label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Escreve a palavra-passe"
              autoComplete="current-password"
            />
            {error && <p className={styles.formError}>{error}</p>}
            <Button type="submit" disabled={loading || password.trim().length === 0}>
              {loading ? "A validar..." : "Entrar no painel"}
            </Button>
          </form>
        )}
      </section>

      {stats && (
        <>
          <section className={styles.metaBar}>
            <span>Base de dados: {stats.database}</span>
            <span>Gerado em {formatDate(stats.generatedAt)}</span>
            <span>Janela semanal desde {formatDate(stats.since)}</span>
          </section>

          <section className={styles.metrics}>
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <article className={styles.metricCard} key={metric.label}>
                  <Icon aria-hidden="true" />
                  <span>{metric.label}</span>
                  <strong>{formatNumber(metric.value)}</strong>
                  <p>{metric.detail}</p>
                </article>
              );
            })}
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Tempo real</span>
                  <h2>Salas activas</h2>
                </div>
                <strong>{stats.usage.activeRooms}</strong>
              </div>
              {stats.activeRooms.length > 0 ? (
                <div className={styles.roomList}>
                  {stats.activeRooms.map((room) => (
                    <div className={styles.roomRow} key={room.code}>
                      <div>
                        <strong>{room.code}</strong>
                        <span>{statusLabel(room.status)}</span>
                      </div>
                      <p>
                        {room.onlinePlayers}/{room.players} online · rodada{" "}
                        {room.currentRound ?? 0}/{room.roundsToPlay}
                      </p>
                      <small>
                        {room.hostName ?? "Sem anfitrião"} · {formatDate(room.updatedAt)}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Sem salas activas neste momento.</p>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Histórico recente</span>
                  <h2>Partidas concluídas</h2>
                </div>
                <Trophy aria-hidden="true" />
              </div>
              {stats.recentFinishedRooms.length > 0 ? (
                <div className={styles.roomList}>
                  {stats.recentFinishedRooms.map((room) => (
                    <div className={styles.roomRow} key={room.code}>
                      <div>
                        <strong>{room.code}</strong>
                        <span>{statusLabel(room.status)}</span>
                      </div>
                      <p>
                        {room.players} jogador(es) · {room.roundsToPlay} rodada(s)
                      </p>
                      <small>
                        {room.hostName ?? "Sem anfitrião"} · {formatDate(room.updatedAt)}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Sem partidas concluídas ainda.</p>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Últimos 7 dias</span>
                  <h2>Ranking semanal</h2>
                </div>
                <Trophy aria-hidden="true" />
              </div>
              {stats.weeklyRanking.length > 0 ? (
                <ol className={styles.rankingList}>
                  {stats.weeklyRanking.slice(0, 8).map((player, index) => (
                    <li key={`${player.name}-${index}`}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{player.name}</strong>
                        <small>
                          {player.wins} vitória(s) · {player.gamesCompleted} partida(s)
                        </small>
                      </div>
                      <b>{player.points}</b>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.empty}>Ainda não há partidas concluídas.</p>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Uso geral</span>
                  <h2>Actividade</h2>
                </div>
                <CircleDot aria-hidden="true" />
              </div>
              <div className={styles.usageGrid}>
                <span>Salas totais</span>
                <strong>{formatNumber(stats.usage.totalRooms)}</strong>
                <span>Nomes únicos</span>
                <strong>{formatNumber(stats.usage.uniquePlayerNames)}</strong>
                <span>Rodadas jogadas</span>
                <strong>{formatNumber(stats.usage.roundsPlayed)}</strong>
                <span>Respostas enviadas</span>
                <strong>{formatNumber(stats.usage.answersSubmitted)}</strong>
                <span>Respostas duvidosas</span>
                <strong>{formatNumber(stats.usage.doubtfulAnswers)}</strong>
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Servidor</span>
                  <h2>Erros recentes</h2>
                </div>
                <AlertTriangle aria-hidden="true" />
              </div>
              {stats.recentErrors.length > 0 ? (
                <div className={styles.errorList}>
                  {stats.recentErrors.map((item) => (
                    <div className={styles.errorItem} key={item.id}>
                      <strong>{item.scope}</strong>
                      <span>{item.message}</span>
                      <small>
                        {item.name} · {formatDate(item.occurredAt)}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Sem erros recentes registados.</p>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
