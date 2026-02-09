import { useState, useEffect, useCallback, useRef } from "react";
import { topics } from "./data/topics";

// ============ TYPES ============
type Screen = "menu" | "rules" | "setup" | "game";
type GamePhase = "roles" | "topic" | "debate" | "dice" | "verdict" | "scores" | "endgame";
type Criterion = "Lógica" | "Rapidez" | "Sátira";

interface Player {
  name: string;
  score: number;
}

// ============ HELPERS ============
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CRITERIA: Criterion[] = ["Lógica", "Rapidez", "Sátira"];

const criterionInfo: Record<Criterion, { emoji: string; desc: string }> = {
  Lógica: { emoji: "🧠", desc: "Gana el argumento mejor estructurado y más convincente." },
  Rapidez: { emoji: "⚡", desc: "Gana quien fue más ágil, directo y contundente." },
  Sátira: { emoji: "🤡", desc: "Gana el argumento más gracioso, irónico o absurdo." },
};

// ============ MAIN APP ============
export function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [players, setPlayers] = useState<Player[]>([]);
  const [victoryPoints, setVictoryPoints] = useState(5);
  const [roundIndex, setRoundIndex] = useState(0);
  const [usedTopics, setUsedTopics] = useState<Set<number>>(new Set());
  const [customTopics, setCustomTopics] = useState<string[]>([]);

  // Game round state
  const [phase, setPhase] = useState<GamePhase>("roles");
  const [godIndex, setGodIndex] = useState(0);
  const [hitlerTeam, setHitlerTeam] = useState<number[]>([]);
  const [gandhiTeam, setGandhiTeam] = useState<number[]>([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [criterion, setCriterion] = useState<Criterion>("Lógica");
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [winner, setWinner] = useState<"hitler" | "gandhi" | null>(null);

  const allTopics = [...topics, ...customTopics];

  // Timer logic
  useEffect(() => {
    if (!timerActive || timer <= 0) {
      if (timer <= 0) setTimerActive(false);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timer]);

  const startNewGame = useCallback(
    (p: Player[], vp: number) => {
      const resetPlayers = p.map((pl) => ({ ...pl, score: 0 }));
      setPlayers(resetPlayers);
      setVictoryPoints(vp);
      setRoundIndex(0);
      setUsedTopics(new Set());
      setScreen("game");
      assignRoles(resetPlayers, 0);
    },
    []
  );

  const assignRoles = (currentPlayers: Player[], godIdx: number) => {
    const numPlayers = currentPlayers.length;
    const god = godIdx % numPlayers;
    setGodIndex(god);

    const others = Array.from({ length: numPlayers }, (_, i) => i).filter(
      (i) => i !== god
    );
    const shuffled = shuffle(others);
    const half = Math.ceil(shuffled.length / 2);
    setHitlerTeam(shuffled.slice(0, half));
    setGandhiTeam(shuffled.slice(half));
    setPhase("roles");
    setWinner(null);
    setTimer(60);
    setTimerActive(false);
  };

  const drawTopic = () => {
    let available = allTopics
      .map((_, i) => i)
      .filter((i) => !usedTopics.has(i));
    if (available.length === 0) {
      setUsedTopics(new Set());
      available = allTopics.map((_, i) => i);
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    setUsedTopics((prev) => new Set(prev).add(idx));
    setCurrentTopic(allTopics[idx]);
    setPhase("topic");
  };

  const startDebate = () => {
    setTimer(60);
    setTimerActive(true);
    setPhase("debate");
  };

  const rollDice = () => {
    setDiceRolling(true);
    setTimerActive(false);
    let count = 0;
    const interval = setInterval(() => {
      setCriterion(CRITERIA[Math.floor(Math.random() * 3)]);
      count++;
      if (count > 15) {
        clearInterval(interval);
        const final = CRITERIA[Math.floor(Math.random() * 3)];
        setCriterion(final);
        setDiceRolling(false);
        setPhase("dice");
      }
    }, 100);
  };

  const declareWinner = (team: "hitler" | "gandhi") => {
    setWinner(team);
    const winnerIndices = team === "hitler" ? hitlerTeam : gandhiTeam;
    setPlayers((prev) =>
      prev.map((p, i) =>
        winnerIndices.includes(i) ? { ...p, score: p.score + 1 } : p
      )
    );
    setPhase("verdict");
  };

  const checkEndOrNext = () => {
    const maxScore = Math.max(...players.map((p) => p.score));
    if (maxScore >= victoryPoints) {
      setPhase("endgame");
    } else {
      setPhase("scores");
    }
  };

  const nextRound = () => {
    const next = roundIndex + 1;
    setRoundIndex(next);
    assignRoles(players, next);
  };

  const goToMenu = () => {
    setScreen("menu");
    setPlayers([]);
    setRoundIndex(0);
    setUsedTopics(new Set());
  };

  // ============ RENDERS ============
  if (screen === "menu") return <MenuScreen onPlay={() => setScreen("setup")} onRules={() => setScreen("rules")} />;
  if (screen === "rules") return <RulesScreen onBack={() => setScreen("menu")} />;
  if (screen === "setup")
    return (
      <SetupScreen
        onStart={startNewGame}
        onBack={() => setScreen("menu")}
        customTopics={customTopics}
        setCustomTopics={setCustomTopics}
      />
    );

  // GAME SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚖️</span>
          <span className="font-bold text-sm sm:text-base">Ronda {roundIndex + 1}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen("rules")}
            className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            📖 Reglas
          </button>
          <button
            onClick={goToMenu}
            className="text-xs bg-red-900/60 hover:bg-red-800/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            ✕ Salir
          </button>
        </div>
      </header>

      {/* Scoreboard mini */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-800/50 bg-gray-900/50">
        {players.map((p, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              i === godIndex
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                : hitlerTeam.includes(i)
                ? "bg-red-500/15 text-red-300 border border-red-500/20"
                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
            }`}
          >
            <span>{i === godIndex ? "👑" : hitlerTeam.includes(i) ? "😈" : "🕊️"}</span>
            <span>{p.name}</span>
            <span className="bg-gray-800 px-1.5 py-0.5 rounded-full text-[10px]">{p.score}/{victoryPoints}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {phase === "roles" && (
            <PhaseCard
              title="⚖️ Asignación de Roles"
              subtitle={`Ronda ${roundIndex + 1}`}
            >
              <div className="space-y-4">
                <RoleBlock
                  emoji="👑"
                  label="DIOS — Juez Supremo"
                  names={[players[godIndex].name]}
                  color="yellow"
                />
                <RoleBlock
                  emoji="😈"
                  label="EQUIPO HITLER — Atacantes"
                  names={hitlerTeam.map((i) => players[i].name)}
                  color="red"
                />
                <RoleBlock
                  emoji="🕊️"
                  label="EQUIPO GANDHI — Defensores"
                  names={gandhiTeam.map((i) => players[i].name)}
                  color="emerald"
                />
              </div>
              <BigButton onClick={drawTopic}>Revelar Tema 🃏</BigButton>
            </PhaseCard>
          )}

          {phase === "topic" && (
            <PhaseCard title="🃏 El Tema" subtitle="Defiendan su postura">
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center">
                <p className="text-xl sm:text-2xl font-bold text-amber-100 leading-relaxed">
                  "{currentTopic}"
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-red-400 font-semibold">😈 Hitler</p>
                  <p className="text-red-300/70 text-xs mt-1">Atacan / Se oponen</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-emerald-400 font-semibold">🕊️ Gandhi</p>
                  <p className="text-emerald-300/70 text-xs mt-1">Defienden / A favor</p>
                </div>
              </div>
              <BigButton onClick={startDebate}>¡Iniciar Debate! ⏱️</BigButton>
              <button onClick={drawTopic} className="w-full text-sm text-gray-400 hover:text-gray-200 mt-1 transition-colors">
                🔄 Cambiar tema
              </button>
            </PhaseCard>
          )}

          {phase === "debate" && (
            <PhaseCard title="🔥 ¡DEBATE EN CURSO!" subtitle={currentTopic}>
              <div className="flex flex-col items-center gap-6">
                <div
                  className={`text-7xl sm:text-8xl font-black tabular-nums ${
                    timer <= 10 ? "text-red-400 animate-pulse" : timer <= 30 ? "text-amber-400" : "text-white"
                  }`}
                >
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                </div>
                <div className="flex gap-3">
                  {timerActive ? (
                    <button
                      onClick={() => setTimerActive(false)}
                      className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      ⏸ Pausar
                    </button>
                  ) : timer > 0 ? (
                    <button
                      onClick={() => setTimerActive(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      ▶ Reanudar
                    </button>
                  ) : null}
                  <button
                    onClick={() => setTimer(60)}
                    className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    🔄 Reiniciar
                  </button>
                </div>
              </div>
              <BigButton onClick={rollDice}>🎲 Lanzar Dado del Criterio</BigButton>
            </PhaseCard>
          )}

          {phase === "dice" && (
            <PhaseCard title="🎲 Criterio de Juicio" subtitle={`${players[godIndex].name} juzgará por...`}>
              <div
                className={`text-center p-8 rounded-2xl border ${
                  diceRolling
                    ? "bg-gray-800 border-gray-700 animate-pulse"
                    : "bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/30"
                }`}
              >
                <div className="text-6xl mb-3">{criterionInfo[criterion].emoji}</div>
                <h3 className="text-3xl font-black text-white">{criterion}</h3>
                {!diceRolling && (
                  <p className="text-gray-300 mt-3 text-sm">{criterionInfo[criterion].desc}</p>
                )}
              </div>
              {!diceRolling && (
                <div className="space-y-3">
                  <p className="text-center text-gray-400 text-sm">
                    👑 <strong>{players[godIndex].name}</strong>, elige al ganador:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => declareWinner("hitler")}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02]"
                    >
                      😈 Hitler Gana
                    </button>
                    <button
                      onClick={() => declareWinner("gandhi")}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-4 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02]"
                    >
                      🕊️ Gandhi Gana
                    </button>
                  </div>
                </div>
              )}
            </PhaseCard>
          )}

          {phase === "verdict" && (
            <PhaseCard
              title={winner === "hitler" ? "😈 ¡HITLER GANA!" : "🕊️ ¡GANDHI GANA!"}
              subtitle="La sentencia ha sido dictada"
            >
              <div
                className={`text-center p-6 rounded-2xl border ${
                  winner === "hitler"
                    ? "bg-red-500/15 border-red-500/30"
                    : "bg-emerald-500/15 border-emerald-500/30"
                }`}
              >
                <div className="text-5xl mb-2">{winner === "hitler" ? "😈" : "🕊️"}</div>
                <p className="text-lg font-semibold text-white mb-2">
                  ¡{winner === "hitler"
                    ? hitlerTeam.map((i) => players[i].name).join(", ")
                    : gandhiTeam.map((i) => players[i].name).join(", ")}{" "}
                  ganan esta ronda!
                </p>
                <p className="text-gray-400 text-sm">
                  Criterio: {criterionInfo[criterion].emoji} {criterion}
                </p>
                <p className="text-gray-500 text-xs mt-2">+1 punto para cada miembro del equipo ganador</p>
              </div>
              <BigButton onClick={checkEndOrNext}>Continuar ➡️</BigButton>
            </PhaseCard>
          )}

          {phase === "scores" && (
            <PhaseCard title="📊 Puntuaciones" subtitle="¿Quién lidera?">
              <div className="space-y-2">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, rank) => (
                    <div
                      key={p.name}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                        rank === 0
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-gray-800/50 border-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{rank === 0 ? "👑" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "⬜"}</span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-gray-700 rounded-full w-24 sm:w-32 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${(p.score / victoryPoints) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-amber-300 min-w-[3rem] text-right">
                          {p.score}/{victoryPoints}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              <BigButton onClick={nextRound}>Siguiente Ronda 🔄</BigButton>
            </PhaseCard>
          )}

          {phase === "endgame" && (
            <PhaseCard title="🏆 ¡FIN DEL JUEGO!" subtitle="¡Tenemos un campeón!">
              <div className="text-center space-y-4">
                <div className="text-7xl">🏆</div>
                {(() => {
                  const maxScore = Math.max(...players.map((p) => p.score));
                  const winners = players.filter((p) => p.score === maxScore);
                  return (
                    <>
                      <h3 className="text-3xl font-black text-amber-300">
                        {winners.map((w) => w.name).join(" & ")}
                      </h3>
                      <p className="text-gray-400">
                        {winners.length > 1 ? "¡Empate épico!" : "¡Maestro del debate!"} — {maxScore} victorias
                      </p>
                    </>
                  );
                })()}
                <div className="space-y-1 mt-6">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((p, i) => (
                      <div key={p.name} className="flex justify-between px-4 py-2 bg-gray-800/40 rounded-lg text-sm">
                        <span>
                          {i + 1}. {p.name}
                        </span>
                        <span className="text-amber-400 font-bold">{p.score} pts</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startNewGame(players, victoryPoints)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-3 rounded-xl font-bold transition-all"
                >
                  🔄 Revancha
                </button>
                <button
                  onClick={goToMenu}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl font-bold transition-colors"
                >
                  🏠 Menú
                </button>
              </div>
            </PhaseCard>
          )}
        </div>
      </main>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function PhaseCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl p-5 sm:p-8 space-y-5 shadow-2xl shadow-black/40 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm mt-1 line-clamp-2">"{subtitle}"</p>}
      </div>
      {children}
    </div>
  );
}

function RoleBlock({
  emoji,
  label,
  names,
  color,
}: {
  emoji: string;
  label: string;
  names: string[];
  color: "yellow" | "red" | "emerald";
}) {
  const styles = {
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    red: "bg-red-500/10 border-red-500/30 text-red-300",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  };
  return (
    <div className={`border rounded-xl p-4 ${styles[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <span className="font-bold text-sm uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-semibold text-lg">{names.join(", ")}</p>
    </div>
  );
}

function BigButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-gray-950 font-black text-lg py-4 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-amber-500/25"
    >
      {children}
    </button>
  );
}

// ============ MENU SCREEN ============
function MenuScreen({ onPlay, onRules }: { onPlay: () => void; onRules: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center space-y-8 animate-fadeIn">
        <div className="space-y-4">
          <div className="text-7xl sm:text-8xl">⚖️</div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Dios, Hitler y Gandhi
            <br />
            <span className="text-amber-400">entran en un Bar...</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            El party game de debate extremo donde defiendes lo indefendible.
            3-8 jugadores · +16 años
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={onPlay}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-gray-950 font-black text-xl py-5 rounded-2xl transition-all transform hover:scale-[1.02] shadow-xl shadow-amber-500/30"
          >
            🎮 JUGAR
          </button>
          <button
            onClick={onRules}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-lg py-4 rounded-2xl transition-colors border border-gray-700"
          >
            📖 Cómo se juega
          </button>
        </div>
        <div className="flex justify-center gap-6 text-2xl">
          <span title="Dios">👑</span>
          <span title="Hitler">😈</span>
          <span title="Gandhi">🕊️</span>
          <span title="Dado">🎲</span>
          <span title="Mazo">🃏</span>
        </div>
      </div>
    </div>
  );
}

// ============ RULES SCREEN ============
function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h2 className="font-bold text-lg">📖 Reglas del Juego</h2>
          <button onClick={onBack} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
            ← Volver
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
          <h3 className="text-2xl font-black text-amber-400">⚖️ ¿Qué es este juego?</h3>
          <p className="text-gray-300 leading-relaxed">
            <strong>"Dios, Hitler y Gandhi entran en un Bar..."</strong> es un party game de debate extremo donde el azar te obliga a defender
            posturas que podrían ir contra tus valores personales. No importa lo que pienses realmente: tendrás que argumentar con lógica,
            rapidez o humor según lo que dicte el dado. El objetivo es <strong>despolarizar opiniones mediante la sátira</strong> y pasar un
            rato divertido con amigos.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-gray-800 px-3 py-1 rounded-full">3-8 jugadores</span>
            <span className="bg-gray-800 px-3 py-1 rounded-full">+16 años</span>
            <span className="bg-gray-800 px-3 py-1 rounded-full">30-60 min</span>
            <span className="bg-gray-800 px-3 py-1 rounded-full">Debate & humor</span>
          </div>
        </section>

        {/* Roles */}
        <section className="space-y-4">
          <h3 className="text-xl font-black text-white">👥 Los Tres Roles</h3>
          <div className="grid gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <h4 className="font-bold text-yellow-300 text-lg">👑 DIOS — El Juez Supremo</h4>
              <p className="text-gray-300 text-sm mt-1">
                Es el juez imparcial (o no tan imparcial) de la ronda. Lanza el dado para determinar el criterio de juicio, escucha ambos
                argumentos y dicta sentencia golpeando el mallete (virtual). Su palabra es LEY.
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h4 className="font-bold text-red-300 text-lg">😈 EQUIPO HITLER — Los Atacantes</h4>
              <p className="text-gray-300 text-sm mt-1">
                Deben <strong>atacar, oponerse y destruir</strong> la postura del tema presentado. No importa si en la vida real están de
                acuerdo: su rol es ser los opositores más feroces posibles.
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <h4 className="font-bold text-emerald-300 text-lg">🕊️ EQUIPO GANDHI — Los Defensores</h4>
              <p className="text-gray-300 text-sm mt-1">
                Deben <strong>defender, justificar y apoyar</strong> la postura del tema, por ridícula o controversial que sea. Son los
                defensores de lo indefendible.
              </p>
            </div>
          </div>
        </section>

        {/* Flow */}
        <section className="space-y-4">
          <h3 className="text-xl font-black text-white">🔄 Flujo de una Ronda</h3>
          {[
            {
              step: "1",
              title: "Asignación de Roles",
              desc: "Un jugador se convierte en DIOS (rota cada ronda). Los demás se dividen aleatoriamente en equipo Hitler y equipo Gandhi.",
            },
            {
              step: "2",
              title: "Revelación del Tema",
              desc: 'Se saca una carta con un tema polémico, absurdo o controversial (ej: "Los perros deberían tener derecho al voto"). Gandhi defiende, Hitler ataca.',
            },
            {
              step: "3",
              title: "¡El Debate! (60 segundos)",
              desc: "Los equipos tienen 1 minuto para preparar y exponer sus argumentos. ¡Todo vale! Humor, datos inventados, drama, gritos... según el criterio que toque.",
            },
            {
              step: "4",
              title: "El Dado del Criterio",
              desc: "DIOS lanza el dado que define CÓMO juzgará: por LÓGICA (mejor argumento), RAPIDEZ (más ágil) o SÁTIRA (más gracioso/absurdo).",
            },
            {
              step: "5",
              title: "La Sentencia",
              desc: "DIOS golpea el mallete y declara al equipo ganador. Los miembros del equipo ganador reciben 1 punto cada uno.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-black text-lg">
                {item.step}
              </div>
              <div>
                <h4 className="font-bold text-white">{item.title}</h4>
                <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Criteria */}
        <section className="space-y-4">
          <h3 className="text-xl font-black text-white">🎲 Los Tres Criterios del Dado</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {CRITERIA.map((c) => (
              <div key={c} className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">{criterionInfo[c].emoji}</div>
                <h4 className="font-bold text-purple-300 text-lg">{c}</h4>
                <p className="text-gray-400 text-sm mt-1">{criterionInfo[c].desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Victory */}
        <section className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 space-y-3">
          <h3 className="text-xl font-black text-amber-400">🏆 ¿Cómo se gana?</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex gap-2"><span>•</span><span>El juego termina cuando un jugador alcanza el número de puntos objetivo (configurable).</span></li>
            <li className="flex gap-2"><span>•</span><span>Los puntos se ganan por equipo: cada miembro del equipo ganador suma 1 punto.</span></li>
            <li className="flex gap-2"><span>•</span><span>Los roles rotan cada ronda, así que todos serán Dios, Hitler y Gandhi.</span></li>
            <li className="flex gap-2"><span>•</span><span>La estrategia está en adaptar tu discurso al criterio del dado. Si sale Sátira, ¡sé payaso! Si sale Lógica, ¡sé Aristóteles!</span></li>
          </ul>
        </section>

        {/* Tips */}
        <section className="space-y-4">
          <h3 className="text-xl font-black text-white">💡 Consejos y Tips</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { tip: "No te tomes nada en serio. Es sátira.", icon: "😂" },
              { tip: "Si eres Dios, disfruta el poder. Haz drama al dar el veredicto.", icon: "👑" },
              { tip: "Los mejores argumentos mezclan absurdo con una pizca de verdad.", icon: "🎭" },
              { tip: "Interrumpir al otro equipo es parte del show (con moderación).", icon: "🗣️" },
              { tip: "Añade temas propios del grupo para hacerlo más personal.", icon: "✏️" },
              { tip: "Si sale Rapidez, el primero en hablar tiene ventaja.", icon: "⚡" },
            ].map((t, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 flex gap-3 items-start">
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm text-gray-300">{t.tip}</span>
              </div>
            ))}
          </div>
        </section>

        <button onClick={onBack} className="w-full bg-gray-800 hover:bg-gray-700 py-4 rounded-xl font-bold transition-colors">
          ← Volver al Menú
        </button>
      </main>
    </div>
  );
}

// ============ SETUP SCREEN ============
function SetupScreen({
  onStart,
  onBack,
  customTopics,
  setCustomTopics,
}: {
  onStart: (players: Player[], vp: number) => void;
  onBack: () => void;
  customTopics: string[];
  setCustomTopics: (t: string[]) => void;
}) {
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [vp, setVp] = useState(5);
  const [newTopic, setNewTopic] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addPlayer = () => {
    if (names.length < 8) setNames([...names, ""]);
  };
  const removePlayer = (i: number) => {
    if (names.length > 3) setNames(names.filter((_, idx) => idx !== i));
  };
  const updateName = (i: number, v: string) => {
    const copy = [...names];
    copy[i] = v;
    setNames(copy);
  };

  const canStart = names.filter((n) => n.trim()).length >= 3;

  const handleStart = () => {
    const validPlayers = names
      .filter((n) => n.trim())
      .map((n) => ({ name: n.trim(), score: 0 }));
    if (validPlayers.length >= 3) onStart(validPlayers, vp);
  };

  const addCustomTopic = () => {
    if (newTopic.trim()) {
      setCustomTopics([...customTopics, newTopic.trim()]);
      setNewTopic("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">🎮 Configurar Partida</h2>
          <button onClick={onBack} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
            ← Volver
          </button>
        </div>

        {/* Players */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">👥 Jugadores ({names.length})</h3>
            {names.length < 8 && (
              <button onClick={addPlayer} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded-lg text-sm transition-colors">
                + Añadir
              </button>
            )}
          </div>
          <div className="space-y-2">
            {names.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Jugador ${i + 1}`}
                  maxLength={20}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                {names.length > 3 && (
                  <button
                    onClick={() => removePlayer(i)}
                    className="bg-red-900/40 hover:bg-red-800/50 text-red-400 px-3 rounded-xl transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Mínimo 3 jugadores, máximo 8.</p>
        </div>

        {/* Victory Points */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-lg">🏆 Puntos para ganar</h3>
          <div className="flex items-center gap-4">
            {[3, 5, 7, 10].map((v) => (
              <button
                key={v}
                onClick={() => setVp(v)}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                  vp === v
                    ? "bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Topics */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold text-lg">✏️ Temas personalizados ({customTopics.length})</h3>
            <span className="text-gray-500">{showCustom ? "▲" : "▼"}</span>
          </button>
          {showCustom && (
            <>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTopic()}
                  placeholder="Escribe un tema polémico..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  onClick={addCustomTopic}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-4 rounded-xl transition-colors"
                >
                  +
                </button>
              </div>
              {customTopics.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {customTopics.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-300 line-clamp-1">{t}</span>
                      <button
                        onClick={() => setCustomTopics(customTopics.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-300 ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-gray-500 text-xs">
                Hay {topics.length} temas base + {customTopics.length} personalizados = {topics.length + customTopics.length} total.
              </p>
            </>
          )}
        </div>

        {/* Start */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full py-5 rounded-2xl font-black text-xl transition-all transform ${
            canStart
              ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-gray-950 hover:scale-[1.01] shadow-xl shadow-amber-500/30"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          }`}
        >
          {canStart ? "⚖️ ¡COMENZAR!" : "Faltan jugadores..."}
        </button>
      </div>
    </div>
  );
}
