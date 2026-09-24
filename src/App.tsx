import { useEffect, useMemo, useRef, useState } from 'react';
import { encodeAbiParameters, formatUnits, parseUnits } from 'viem';
import { PRESETS, createAnimationGuard, getPresetProfile, resolveRound, summarizeMoment, type CrateReveal, type PresetId, type RoundResult } from './engine/counterweight';
import { decodeCounterweightState } from './engine/onChainResult';
import { workshopAudio } from './audio/WorkshopAudio';
import { findRecoverableSession } from './bridge/sessionRecovery';
import { computeMaxWager, connectGameToHost, observeGameContentSize, type GuestApiV1, type HostApiV1, type HostSnapshotV1 } from '@chain/casino-sdk/guest';

const labels: Record<PresetId, { name: string; hint: string }> = {
  steady: { name: 'Steady', hint: 'balanced reach' },
  offset: { name: 'Offset', hint: 'late recovery' },
  wild: { name: 'Wild', hint: 'long arm swings' },
};

const closedCrates: CrateReveal[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  kind: ['gold', 'iron', 'gems', 'relic'][index % 4] as CrateReveal['kind'],
  weight: 0,
  revealed: false,
}));

function useSpringNumber(target: number) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const velocityRef = useRef(0);
  const frame = useRef<number>();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      valueRef.current = target;
      velocityRef.current = 0;
      setValue(target);
      return;
    }
    cancelAnimationFrame(frame.current ?? 0);
    const step = () => {
      const displacement = target - valueRef.current;
      velocityRef.current = (velocityRef.current + displacement * 0.16) * 0.74;
      valueRef.current += velocityRef.current;
      setValue(valueRef.current);
      if (Math.abs(displacement) < 0.01 && Math.abs(velocityRef.current) < 0.01) {
        valueRef.current = target;
        velocityRef.current = 0;
        setValue(target);
        frame.current = undefined;
        return;
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current ?? 0);
  }, [target]);
  return value;
}

function formatMultiplier(multiplier: number | null) {
  if (multiplier === null) return '—';
  return multiplier === 0 ? 'FALLEN' : `${multiplier.toFixed(2)}×`;
}

export function App() {
  const [preset, setPreset] = useState<PresetId>('steady');
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [crates, setCrates] = useState(closedCrates);
  const [round, setRound] = useState<RoundResult | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [message, setMessage] = useState('Place your load, then reveal its hidden weight.');
  const [hostApi, setHostApi] = useState<HostApiV1 | null>(null);
  const [snapshot, setSnapshot] = useState<HostSnapshotV1 | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const roundRef = useRef<RoundResult | null>(null);
  const animationGuard = useRef(createAnimationGuard());
  const activeSessionKey = useRef<string | null>(null);

  const shownMoment = useMemo(() => {
    if (!round) return 0;
    const positions = PRESETS[preset];
    return crates.reduce((total, crate, index) => total + (crate.revealed ? crate.weight * positions[index] : 0), 0);
  }, [crates, preset, round]);
  const targetTilt = Math.max(-9, Math.min(9, shownMoment / 24));
  const smoothTilt = useSpringNumber(targetTilt);
  const status = summarizeMoment(shownMoment);
  const profile = getPresetProfile(preset);

  const activateAudio = () => {
    workshopAudio.setMuted(false);
    workshopAudio.startAmbience();
    setSoundOn(true);
  };

  const toggleAudio = () => {
    if (soundOn) {
      workshopAudio.setMuted(true);
      setSoundOn(false);
      return;
    }
    activateAudio();
    workshopAudio.select();
  };

  useEffect(() => {
    animationGuard.current.start();
    return () => animationGuard.current.cancel();
  }, []);

  useEffect(() => {
    let mounted = true;
    let connection: ReturnType<typeof connectGameToHost> | null = null;
    if (window === window.parent) return;
    const methods: GuestApiV1 = { async setState(nextSnapshot) { if (mounted && nextSnapshot) { setSnapshot(nextSnapshot); setIsStandalone(false); } } };
    try {
      connection = connectGameToHost(methods);
      void connection.promise.then(api => { if (mounted) { setHostApi(api); setIsStandalone(false); } }).catch(() => { if (mounted) setIsStandalone(true); });
    } catch { setIsStandalone(true); }
    return () => { mounted = false; connection?.destroy(); };
  }, []);

  useEffect(() => {
    const observer = observeGameContentSize(hostApi);
    return () => observer.disconnect();
  }, [hostApi]);

  useEffect(() => {
    if (!snapshot || activeSessionKey.current) return;
    const recovered = findRecoverableSession(snapshot.sessions.items, snapshot.integration.gameAddress);
    if (recovered) {
      activeSessionKey.current = recovered.sessionKey;
      setIsRevealing(true);
      setMessage(`Recovering session ${recovered.sessionId}; waiting for VRF settlement…`);
    }
  }, [snapshot]);

  const choosePreset = (next: PresetId) => {
    if (isRevealing) return;
    activateAudio();
    workshopAudio.select();
    setPreset(next);
    setRound(null);
    setCrates(closedCrates);
    setRevealedCount(0);
    setMessage(`${labels[next].name} layout selected — ${labels[next].hint}.`);
  };

  const resetRound = () => {
    if (isRevealing) return;
    setRound(null);
    setCrates(closedCrates);
    setRevealedCount(0);
    setMessage('A fresh six-crate load is ready.');
  };

  const adjustBet = (direction: 1 | -1) => {
    if (isRevealing) return;
    const nextBet = direction > 0 ? Math.min(visibleBalance, bet + 5) : Math.max(1, bet - 5);
    if (nextBet === bet) return;
    activateAudio();
    workshopAudio.wager(direction);
    setBet(nextBet);
  };

  const playRound = async (nextRound: RoundResult, sessionId?: string, roundPreset = preset) => {
    roundRef.current = nextRound;
    setRound(nextRound);
    setCrates(closedCrates);
    setRevealedCount(0);
    setIsRevealing(true);
    setMessage('The first latch releases…');

    for (let index = 0; index < nextRound.crates.length; index += 1) {
      if (animationGuard.current.cancelled()) return;
      await new Promise(resolve => window.setTimeout(resolve, index === 0 ? 260 : 800));
      setCrates(current => current.map((crate, crateIndex) => (
        crateIndex === index ? nextRound.crates[crateIndex] : crate
      )));
      setRevealedCount(index + 1);
      workshopAudio.unlock();
      const partialMoment = nextRound.crates.slice(0, index + 1)
        .reduce((total, crate, crateIndex) => total + crate.weight * PRESETS[roundPreset][crateIndex], 0);
      workshopAudio.creak(partialMoment);
      setMessage(index === 5 ? 'The final weight settles the scale.' : `Crate ${index + 1} shifts the balance…`);
    }

    await new Promise(resolve => window.setTimeout(resolve, 650));
    if (animationGuard.current.cancelled() || roundRef.current !== nextRound) return;
    if (isStandalone) {
      const winnings = bet * nextRound.payoutMultiplier;
      if (winnings > 0) setBalance(value => value + winnings);
    } else if (hostApi && sessionId) {
      await hostApi.revealOutcome({ sessionId });
    }
    workshopAudio.settle(nextRound.payoutMultiplier > 0);
    setMessage(nextRound.payoutMultiplier > 0
      ? `Balanced. The vault pays ${nextRound.payoutMultiplier.toFixed(2)}×.`
      : 'The beam leaves the safe range. This load falls.');
    setIsRevealing(false);
  };

  const wagerLimit = useMemo(() => {
    if (isStandalone || !snapshot) return null;
    return computeMaxWager(snapshot, { maxMultiplierX: 13.36 });
  }, [isStandalone, snapshot]);
  const maxWagerBaseUnits = wagerLimit?.kind === 'limit' ? wagerLimit.maxWager : null;

  useEffect(() => {
    if (!snapshot || !activeSessionKey.current) return;
    const session = snapshot.sessions.items.find(item => item.sessionKey === activeSessionKey.current);
    if (!session?.isSettled || !session.raw.gameState) return;
    activeSessionKey.current = null;
    const result = decodeCounterweightState(session.raw.gameState, snapshot.token.decimals ?? 18);
    if (!result) {
      setSettlementError(`Session ${session.sessionId} settled, but its result could not be verified.`);
      setIsRevealing(false);
      return;
    }
    setSettlementError(null);
    setPreset(result.preset);
    void playRound(result, session.sessionId, result.preset);
  }, [snapshot]);

  const revealLoad = async () => {
    if (isRevealing) return;
    activateAudio();
    if (round) { resetRound(); return; }
    if (isStandalone) {
      if (bet > balance) return;
      const randomWord = crypto.getRandomValues(new Uint32Array(1))[0];
      setBalance(value => value - bet);
      await playRound(resolveRound(preset, randomWord));
      return;
    }
    if (!snapshot || !hostApi || !maxWagerBaseUnits) {
      setSettlementError('Vault wager limits are still loading.');
      return;
    }
    const decimals = snapshot.token.decimals ?? 18;
    const wagerBaseUnits = parseUnits(String(bet), decimals);
    if (wagerBaseUnits > maxWagerBaseUnits) {
      setSettlementError('This wager exceeds the current vault risk limit.');
      return;
    }
    try {
      setIsRevealing(true);
      setSettlementError(null);
      setMessage('Sealing the load and requesting VRF randomness…');
      const presetIndex = (Object.keys(PRESETS) as PresetId[]).indexOf(preset);
      const opened = await hostApi.openSession({ wager: wagerBaseUnits.toString(), gameData: encodeAbiParameters([{ type: 'uint8' }], [presetIndex]) });
      activeSessionKey.current = opened.sessionKey;
    } catch {
      setMessage('The vault did not open a session. Try again.');
      setIsRevealing(false);
    }
  };

  const visibleBalance = isStandalone ? balance : Number(formatUnits(BigInt(snapshot?.balances.smartVaultBalance ?? '0'), snapshot?.token.decimals ?? 18));

  return (
    <div className="game-shell">
      <div className="grain" />
      <header className="topbar">
        <div className="brand"><span>COUNTERWEIGHT</span><small>TREASURE FINDS ITS BALANCE</small></div>
        <div className="top-meta"><span className="demo-dot" /> {isStandalone ? 'STANDALONE DEMO' : 'CHAIN SDK CONNECTED'} <span className="rtp-chip">96.00% RTP</span><button className="sound-toggle" type="button" aria-pressed={soundOn} onClick={toggleAudio}>{soundOn ? 'SOUND ON' : 'SOUND OFF'}</button><span className="balance-text">{isStandalone ? 'PLAY MONEY' : (snapshot?.token.symbol ?? 'VAULT')} <strong>{visibleBalance.toLocaleString()}</strong></span></div>
      </header>

      <main className="game-grid">
        <section className="stage" aria-label="Counterweight balance game">
          <div className="workshop-copy">CRATE {Math.min(revealedCount + 1, 6)} OF 6 <span /> Will the final load balance?</div>
          <div className={`tilt-gauge ${status}`} aria-label={`Balance status: ${status}`}>
            <span>LEFT HEAVY</span>
            <div className="gauge-dial" aria-hidden="true">
              <img className="gauge-face-raster" src="/assets/generated/balance-gauge-face.png" alt="" />
              <img className="gauge-needle-raster" src="/assets/generated/balance-gauge-needle.png" alt="" style={{ transform: `translateX(-50%) rotate(${smoothTilt * 4.4}deg)` }} />
            </div>
            <span>RIGHT HEAVY</span>
            <b>SAFE ZONE</b>
          </div>
          <div className="scale-room">
            <div className="beam-wrap" style={{ transform: `rotate(${smoothTilt}deg)` }}>
              <img className="beam-raster" src="/assets/generated/brass-scale-beam-6-slots.png" alt="" aria-hidden="true" />
              {crates.map((crate, index) => <Crate key={crate.id} crate={crate} index={index} />)}
            </div>
            <div className="fulcrum">
              <img className="fulcrum-base-raster" src="/assets/generated/brass-scale-base.png" alt="" aria-hidden="true" />
            </div>
          </div>
          <div className="stage-note" aria-live="polite"><span className={`status-pill ${status}`}>{status === 'balanced' ? 'IN SAFE ZONE' : status.toUpperCase()}</span> {message}</div>
        </section>

        <aside className="control-panel">
          <h2>YOUR LOAD</h2>
          <p>Choose where six sealed crates sit on the beam.</p>
          <div className="preset-list">
            {(Object.keys(PRESETS) as PresetId[]).map(id => (
              <button key={id} className={preset === id ? 'preset active' : 'preset'} aria-pressed={preset === id} disabled={isRevealing} onClick={() => choosePreset(id)}>
                <span className={`layout-icon ${id}`}><i /><i /><i /><em /></span>
                <strong>{labels[id].name}</strong><small>{labels[id].hint}</small>
              </button>
            ))}
          </div>
          <div className="divider" />
          <section className="payout-preview" aria-label={`${labels[preset].name} payout profile`}>
            <div className="payout-heading"><span>{labels[preset].name.toUpperCase()} PAYTABLE</span><b>96.00% RTP</b></div>
            <div><span>SAFE CENTRE <small>{((profile.safeOdds / 256) * 100).toFixed(2)}%</small></span><strong>{profile.safeMultiplier.toFixed(2)}×</strong></div>
            <div><span>RECOVERY <small>{((profile.recoveryOdds / 256) * 100).toFixed(2)}%</small></span><strong>{profile.recoveryMultiplier.toFixed(2)}×</strong></div>
            <div><span>FALLS <small>{((profile.fallOdds / 256) * 100).toFixed(2)}%</small></span><strong>0.00×</strong></div>
          </section>
          <div className="divider compact" />
          <details className="how-to"><summary>HOW TO PLAY</summary><p>Pick a layout, set a stake, then reveal six sealed crates. Finish near the center to collect its listed payout. Each layout has the same 96.00% theoretical return with a different risk profile.</p></details>
          <div className="divider compact" />
          <div className="bet-row"><span>BET</span><div><button onClick={() => adjustBet(-1)} disabled={isRevealing}>−</button><strong>{bet}</strong><button onClick={() => adjustBet(1)} disabled={isRevealing}>+</button></div></div>
          <div className="outcome"><span>LAST PAYOUT</span><strong>{formatMultiplier(round && !isRevealing ? round.payoutMultiplier : null)}</strong><small>{round && !isRevealing ? `${Math.abs(round.finalMoment)} moment` : 'unrevealed'}</small></div>
          {settlementError && <div className="settlement-error" role="alert">{settlementError}</div>}
          <button className="reveal-button" onClick={() => void revealLoad()} disabled={isRevealing || (isStandalone && bet > balance)}>{isRevealing ? (activeSessionKey.current ? 'WAITING FOR VRF' : `REVEALING ${revealedCount}/6`) : round ? 'NEW LOAD' : 'REVEAL NEXT'}</button>
          <div className="engine-note">{isStandalone ? 'ONE RANDOM WORD DETERMINES ALL SIX WEIGHTS.' : 'THE CHAIN SDK VRF RESULT DETERMINES EVERY WEIGHT.'} THE ANIMATION REPLAYS THAT FIXED RESULT.</div>
        </aside>
      </main>

      <footer className="timeline"><div className="steps">{Array.from({ length: 6 }, (_, index) => <span key={index} className={index < revealedCount ? 'lit' : ''}>{index + 1}</span>)}</div><p>Place six crates. Reveal their weight. Finish in the safe zone.</p><span>STANDALONE PLAY-MONEY DEMO</span></footer>
    </div>
  );
}

function Crate({ crate, index }: { crate: CrateReveal; index: number }) {
  const positions = ['10%', '24%', '38%', '62%', '76%', '90%'];
  return <div className={`crate-slot crate-${index + 1}`} style={{ left: positions[index] }}>
    <div className={`crate ${crate.revealed ? `opened ${crate.kind}` : ''}`}>
      <img className="crate-raster" src="/assets/generated/treasure-crate-closed.png" alt="" aria-hidden="true" />
      <img className="crate-open-raster" src="/assets/generated/treasure-crate-open-gold.png" alt="" aria-hidden="true" />
      {crate.revealed && <div className="treasure">{crate.kind === 'gems' ? '◆ ◆ ◆' : crate.kind === 'iron' ? '▰ ▰' : crate.kind === 'relic' ? '✦' : '● ● ●'}</div>}
    </div>
  </div>;
}
