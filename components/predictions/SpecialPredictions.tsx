'use client';

import { useMemo, useState, useTransition } from 'react';

import { saveSpecialPredictions } from '@/app/prediction-set/[id]/actions';
import type { Player, RecordId, Team } from '@/types/domain';

interface Props {
  predictionSetId: RecordId;
  teams: Team[];
  players: Player[];
  initialWinnerTeamId?: RecordId | null;
  initialTopScorerPlayerId?: RecordId | null;
  readOnly?: boolean;
}

type Msg = { kind: 'success' | 'error'; text: string } | null;

const SELECT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export function SpecialPredictions({
  predictionSetId,
  teams,
  players,
  initialWinnerTeamId,
  initialTopScorerPlayerId,
  readOnly = false,
}: Props) {
  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p] as const)),
    [players],
  );
  // teamId → its players (sorted), and the nation list = teams that have ≥1.
  const playersByTeam = useMemo(() => {
    const m = new Map<RecordId, Player[]>();
    for (const p of players) {
      if (!p.teamId) continue;
      const arr = m.get(p.teamId) ?? [];
      arr.push(p);
      m.set(p.teamId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [players]);
  const nations = useMemo(
    () => teams.filter((t) => playersByTeam.has(t.id)),
    [teams, playersByTeam],
  );

  const initialNationId = initialTopScorerPlayerId
    ? (playersById.get(initialTopScorerPlayerId)?.teamId ?? '')
    : '';

  const [winnerTeamId, setWinnerTeamId] = useState<string>(initialWinnerTeamId ?? '');
  const [nationId, setNationId] = useState<string>(initialNationId);
  const [playerId, setPlayerId] = useState<string>(initialTopScorerPlayerId ?? '');

  // Saved baseline (to compute dirty + reflect successful writes).
  const [savedWinner, setSavedWinner] = useState<string>(initialWinnerTeamId ?? '');
  const [savedPlayer, setSavedPlayer] = useState<string>(initialTopScorerPlayerId ?? '');

  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  const nationPlayers = nationId ? (playersByTeam.get(nationId) ?? []) : [];
  const dirty = winnerTeamId !== savedWinner || playerId !== savedPlayer;

  function onNationChange(id: string) {
    setNationId(id);
    setPlayerId(''); // player no longer valid under a new nation
    setMsg(null);
  }

  function onSave() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveSpecialPredictions({
        predictionSetId,
        predictedWinnerTeamId: winnerTeamId || null,
        predictedTopScorerPlayerId: playerId || null,
      });
      if (!res.ok) {
        setMsg({ kind: 'error', text: res.error });
        return;
      }
      setSavedWinner(winnerTeamId);
      setSavedPlayer(playerId);
      setMsg({ kind: 'success', text: 'Pronostici speciali salvati.' });
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <span aria-hidden>🌟</span> Pronostici speciali
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Campione del Mondo e capocannoniere del torneo.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* World Cup Winner */}
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Campione del Mondo
          </span>
          <select
            className={`mt-1 ${SELECT_CLASS}`}
            value={winnerTeamId}
            disabled={readOnly}
            onChange={(e) => {
              setWinnerTeamId(e.target.value);
              setMsg(null);
            }}
          >
            <option value="">— scegli una nazionale —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        {/* Top Scorer — two-step: nation → player */}
        <div className="grid gap-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Capocannoniere · nazionale
            </span>
            <select
              className={`mt-1 ${SELECT_CLASS}`}
              value={nationId}
              disabled={readOnly}
              onChange={(e) => onNationChange(e.target.value)}
            >
              <option value="">— scegli una nazionale —</option>
              {nations.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Capocannoniere · giocatore
            </span>
            <select
              className={`mt-1 ${SELECT_CLASS}`}
              value={playerId}
              disabled={readOnly || !nationId}
              onChange={(e) => {
                setPlayerId(e.target.value);
                setMsg(null);
              }}
            >
              <option value="">
                {nationId ? '— scegli un giocatore —' : 'scegli prima la nazionale'}
              </option>
              {nationPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center justify-end gap-3">
          {msg && (
            <span
              className={`text-xs ${msg.kind === 'success' ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {msg.text}
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || !dirty}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {isPending ? 'Salvataggio…' : 'Salva speciali'}
          </button>
        </div>
      )}
    </section>
  );
}
