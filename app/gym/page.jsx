'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const BodyModel = dynamic(() => import('react-body-highlighter'), { ssr: false });

// ── Design tokens ──────────────────────────────────────────────────────────────
const c = {
  base:    '#0a0a0f',
  surface: '#111118',
  elevated:'#1a1a24',
  border:  'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  primary: '#e8eaf0',
  muted:   '#9499a8',
  faint:   '#4a4f5e',
  accent:  '#4f8ef7',
  green:   '#3ecf8e',
  red:     '#f25c5c',
  amber:   '#f0a429',
  sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", monospace',
};

const MUSCLE_COLORS = ['rgba(79,142,247,0.15)', 'rgba(79,142,247,0.25)', 'rgba(79,142,247,0.40)'];

// ── Exercise list ──────────────────────────────────────────────────────────────
const EXERCISES = [
  'Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Fly',
  'Cable Fly', 'Push-Up', 'Chest Dip',
  'Pull-Up', 'Chin-Up', 'Lat Pulldown', 'Seated Cable Row', 'Barbell Row',
  'T-Bar Row', 'Single-Arm Row', 'Deadlift', 'Rack Pull',
  'Overhead Press', 'Arnold Press', 'Lateral Raise', 'Front Raise',
  'Rear Delt Fly', 'Face Pull', 'Barbell Shrug',
  'Bicep Curl', 'Hammer Curl', 'Preacher Curl', 'Incline Curl', 'Cable Curl',
  'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Dips',
  'Close-Grip Bench Press', 'Diamond Push-Up',
  'Squat', 'Front Squat', 'Hack Squat', 'Leg Press', 'Romanian Deadlift',
  'Leg Curl', 'Leg Extension', 'Bulgarian Split Squat', 'Lunges',
  'Calf Raises', 'Hip Thrust', 'Glute Bridge', 'Step-Up',
  'Plank', 'Cable Crunch', 'Hanging Leg Raise', 'Ab Rollout',
  'Russian Twist', 'Sit-Up', 'Bicycle Crunch',
];

// ── Exercise → muscle slug mapping ────────────────────────────────────────────
const EXERCISE_MUSCLES = {
  'Bench Press':              { p: ['chest'],                     s: ['triceps', 'front-deltoids'] },
  'Incline Bench Press':      { p: ['chest'],                     s: ['front-deltoids', 'triceps'] },
  'Decline Bench Press':      { p: ['chest'],                     s: ['triceps'] },
  'Dumbbell Fly':             { p: ['chest'],                     s: ['front-deltoids'] },
  'Cable Fly':                { p: ['chest'],                     s: ['front-deltoids'] },
  'Push-Up':                  { p: ['chest'],                     s: ['triceps', 'front-deltoids'] },
  'Chest Dip':                { p: ['chest', 'triceps'],          s: ['front-deltoids'] },
  'Pull-Up':                  { p: ['upper-back'],                s: ['biceps', 'trapezius'] },
  'Chin-Up':                  { p: ['upper-back', 'biceps'],      s: ['trapezius'] },
  'Lat Pulldown':             { p: ['upper-back'],                s: ['biceps'] },
  'Seated Cable Row':         { p: ['upper-back'],                s: ['biceps', 'trapezius'] },
  'Barbell Row':              { p: ['upper-back'],                s: ['biceps', 'lower-back'] },
  'T-Bar Row':                { p: ['upper-back'],                s: ['biceps', 'trapezius'] },
  'Single-Arm Row':           { p: ['upper-back'],                s: ['biceps'] },
  'Deadlift':                 { p: ['lower-back', 'hamstring'],   s: ['gluteal', 'trapezius', 'quadriceps'] },
  'Rack Pull':                { p: ['lower-back', 'trapezius'],   s: ['hamstring', 'gluteal'] },
  'Overhead Press':           { p: ['front-deltoids'],            s: ['triceps', 'trapezius'] },
  'Arnold Press':             { p: ['front-deltoids', 'back-deltoids'], s: ['triceps'] },
  'Lateral Raise':            { p: ['front-deltoids'],            s: [] },
  'Front Raise':              { p: ['front-deltoids'],            s: [] },
  'Rear Delt Fly':            { p: ['back-deltoids'],             s: ['upper-back'] },
  'Face Pull':                { p: ['back-deltoids'],             s: ['trapezius', 'upper-back'] },
  'Barbell Shrug':            { p: ['trapezius'],                 s: [] },
  'Bicep Curl':               { p: ['biceps'],                    s: ['forearm'] },
  'Hammer Curl':              { p: ['biceps'],                    s: ['forearm'] },
  'Preacher Curl':            { p: ['biceps'],                    s: [] },
  'Incline Curl':             { p: ['biceps'],                    s: [] },
  'Cable Curl':               { p: ['biceps'],                    s: ['forearm'] },
  'Tricep Pushdown':          { p: ['triceps'],                   s: ['forearm'] },
  'Skull Crusher':            { p: ['triceps'],                   s: [] },
  'Overhead Tricep Extension':{ p: ['triceps'],                   s: [] },
  'Dips':                     { p: ['triceps', 'chest'],          s: ['front-deltoids'] },
  'Close-Grip Bench Press':   { p: ['triceps'],                   s: ['chest', 'front-deltoids'] },
  'Diamond Push-Up':          { p: ['triceps'],                   s: ['chest'] },
  'Squat':                    { p: ['quadriceps', 'gluteal'],     s: ['hamstring', 'lower-back', 'calves'] },
  'Front Squat':              { p: ['quadriceps'],                s: ['gluteal', 'lower-back'] },
  'Hack Squat':               { p: ['quadriceps'],                s: ['gluteal', 'hamstring'] },
  'Leg Press':                { p: ['quadriceps'],                s: ['gluteal', 'hamstring'] },
  'Romanian Deadlift':        { p: ['hamstring', 'gluteal'],      s: ['lower-back'] },
  'Leg Curl':                 { p: ['hamstring'],                 s: ['calves'] },
  'Leg Extension':            { p: ['quadriceps'],                s: [] },
  'Bulgarian Split Squat':    { p: ['quadriceps', 'gluteal'],     s: ['hamstring'] },
  'Lunges':                   { p: ['quadriceps', 'gluteal'],     s: ['hamstring', 'calves'] },
  'Calf Raises':              { p: ['calves'],                    s: [] },
  'Hip Thrust':               { p: ['gluteal'],                   s: ['hamstring'] },
  'Glute Bridge':             { p: ['gluteal'],                   s: ['hamstring'] },
  'Step-Up':                  { p: ['quadriceps', 'gluteal'],     s: ['hamstring', 'calves'] },
  'Plank':                    { p: ['abs'],                       s: ['lower-back'] },
  'Cable Crunch':             { p: ['abs'],                       s: ['obliques'] },
  'Hanging Leg Raise':        { p: ['abs'],                       s: ['obliques'] },
  'Ab Rollout':               { p: ['abs'],                       s: ['lower-back'] },
  'Russian Twist':            { p: ['obliques'],                  s: ['abs'] },
  'Sit-Up':                   { p: ['abs'],                       s: [] },
  'Bicycle Crunch':           { p: ['abs', 'obliques'],           s: [] },
};

// ── Utilities ──────────────────────────────────────────────────────────────────
function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function totalVol(exercises) {
  return exercises.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) => s + (set.reps || 0) * (set.weightKg || 0), 0), 0);
}
function loadLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

// Build react-body-highlighter data from active exercises
function getMuscleDatum(exercises) {
  const primary = new Set();
  const secondary = new Set();
  for (const ex of exercises) {
    const info = EXERCISE_MUSCLES[ex.name];
    if (!info) continue;
    info.p.forEach(m => primary.add(m));
    info.s.forEach(m => { if (!primary.has(m)) secondary.add(m); });
  }
  const data = [];
  if (primary.size)   data.push({ name: 'primary',   muscles: [...primary],   frequency: 3 });
  if (secondary.size) data.push({ name: 'secondary', muscles: [...secondary], frequency: 1 });
  return data;
}

// Build intensity-graded muscle data for export card (1–4 sets → frequency 1–4)
function getMuscleDatumForExport(exercises) {
  const muscleSets = {};
  for (const ex of exercises) {
    const info = EXERCISE_MUSCLES[ex.name];
    if (!info) continue;
    const validSets = ex.sets.filter(s => s.reps > 0).length;
    if (validSets === 0) continue;
    info.p.forEach(m => { muscleSets[m] = (muscleSets[m] || 0) + validSets; });
    info.s.forEach(m => { muscleSets[m] = (muscleSets[m] || 0) + Math.ceil(validSets / 2); });
  }
  const byIntensity = {};
  for (const [muscle, count] of Object.entries(muscleSets)) {
    const i = Math.min(4, Math.max(1, count));
    if (!byIntensity[i]) byIntensity[i] = [];
    byIntensity[i].push(muscle);
  }
  return Object.entries(byIntensity).map(([intensity, muscles]) => ({
    name: `i${intensity}`, muscles, frequency: Number(intensity),
  }));
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const DumbbellIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="10" width="4" height="4" rx="1"/>
    <rect x="18" y="10" width="4" height="4" rx="1"/>
    <line x1="6" y1="12" x2="18" y2="12"/>
    <rect x="0" y="9" width="2" height="6" rx="1"/>
    <rect x="22" y="9" width="2" height="6" rx="1"/>
  </svg>
);

const ClockIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15 15"/>
  </svg>
);

const SlidersIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <line x1="8" y1="3" x2="8" y2="9"/>
    <line x1="16" y1="15" x2="16" y2="21"/>
  </svg>
);

const PlusIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CopyIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XSmallIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── SetRow ─────────────────────────────────────────────────────────────────────
function SetRow({ set, index, onUpdate, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
      <span style={{ fontFamily: c.mono, color: c.faint, fontSize: 11, width: 18, textAlign: 'center', flexShrink: 0 }}>
        {index + 1}
      </span>
      <input
        type="number" inputMode="numeric" placeholder="Reps"
        value={set.reps || ''}
        onChange={e => onUpdate({ ...set, reps: parseInt(e.target.value) || 0 })}
        style={{
          flex: 1, background: c.elevated, border: `1px solid ${c.border}`, borderRadius: 8,
          padding: '9px 8px', color: c.primary, fontSize: 15, textAlign: 'center',
          outline: 'none', minWidth: 0, fontFamily: c.mono,
        }}
      />
      <span style={{ fontFamily: c.mono, color: c.faint, fontSize: 13, flexShrink: 0 }}>×</span>
      <input
        type="number" inputMode="decimal" step="0.5" placeholder="kg"
        value={set.weightKg || ''}
        onChange={e => onUpdate({ ...set, weightKg: parseFloat(e.target.value) || 0 })}
        style={{
          flex: 1, background: c.elevated, border: `1px solid ${c.border}`, borderRadius: 8,
          padding: '9px 8px', color: c.primary, fontSize: 15, textAlign: 'center',
          outline: 'none', minWidth: 0, fontFamily: c.mono,
        }}
      />
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: c.faint,
        padding: '4px 6px', fontSize: 16, lineHeight: 1, flexShrink: 0, opacity: 0.7,
      }}>×</button>
    </div>
  );
}

// ── ExerciseCard ───────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, onUpdateSets, onRemove }) {
  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onUpdateSets([...exercise.sets, { reps: last?.reps || 0, weightKg: last?.weightKg || 0 }]);
  };
  const vol = exercise.sets.reduce((s, set) => s + (set.reps || 0) * (set.weightKg || 0), 0);

  return (
    <div style={{ background: c.elevated, borderRadius: 10, padding: 16, marginBottom: 10, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, color: c.primary, fontSize: 14, fontFamily: c.sans }}>{exercise.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {vol > 0 && (
            <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(vol)} kg
            </span>
          )}
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.faint, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      </div>
      {exercise.sets.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 2, paddingLeft: 26 }}>
          <span style={{ flex: 1, textAlign: 'center', fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reps</span>
          <span style={{ width: 14 }} />
          <span style={{ flex: 1, textAlign: 'center', fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Weight</span>
          <span style={{ width: 30 }} />
        </div>
      )}
      {exercise.sets.map((set, si) => (
        <SetRow
          key={si} set={set} index={si}
          onUpdate={newSet => { const s = [...exercise.sets]; s[si] = newSet; onUpdateSets(s); }}
          onRemove={() => onUpdateSets(exercise.sets.filter((_, i) => i !== si))}
        />
      ))}
      <button onClick={addSet} style={{
        width: '100%', marginTop: 8, padding: '8px 0',
        background: 'none', border: 'none',
        color: c.accent, fontFamily: c.sans, fontSize: 12, cursor: 'pointer',
        textAlign: 'left', paddingLeft: 26,
      }}>
        + Add Set
      </button>
    </div>
  );
}

// ── ExercisePicker ─────────────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose, existing }) {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const filtered = EXERCISES.filter(e =>
    e.toLowerCase().includes(search.toLowerCase()) && !existing.includes(e)
  );
  const isCustom = search.trim() && !EXERCISES.some(e => e.toLowerCase() === search.trim().toLowerCase());

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '80dvh', background: c.surface,
        borderRadius: '16px 16px 0 0', border: `1px solid ${c.border}`,
        borderBottom: 'none', padding: 16, display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', fontFamily: c.sans,
      }}>
        <div style={{ width: 32, height: 3, background: c.border, borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, color: c.primary, fontSize: 15 }}>Add Exercise</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <input
          ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Search or enter custom…"
          style={{
            background: c.elevated,
            border: `1px solid ${focused ? c.accent : c.border}`,
            borderRadius: 10, padding: '11px 14px', color: c.primary,
            fontSize: 15, outline: 'none', marginBottom: 10,
            boxSizing: 'border-box', width: '100%', fontFamily: c.sans,
            transition: 'border-color 0.15s',
          }}
        />
        {isCustom && (
          <button onClick={() => onSelect(search.trim())} style={{
            width: '100%', padding: '12px 14px', background: c.elevated,
            border: `1px solid rgba(79,142,247,0.3)`, borderRadius: 10,
            color: c.accent, fontSize: 14, cursor: 'pointer', textAlign: 'left',
            marginBottom: 6, fontFamily: c.sans,
          }}>
            + Add "{search.trim()}" as custom exercise
          </button>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(ex => (
            <button key={ex} onClick={() => onSelect(ex)} style={{
              width: '100%', padding: '13px 14px', background: 'none', border: 'none',
              borderBottom: `1px solid ${c.border}`, color: c.primary,
              fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: c.sans,
            }}>{ex}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MuscleCard ─────────────────────────────────────────────────────────────────
function MuscleCard({ exercises }) {
  const muscleData = getMuscleDatum(exercises);
  const empty = muscleData.length === 0;
  const emptyData = [{ name: 'none', muscles: [], frequency: 1 }];

  return (
    <div style={{
      background: c.surface, borderRadius: 12, padding: '14px 16px',
      marginBottom: 10, border: `1px solid ${c.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
          Muscles Worked
        </span>
        {!empty && (
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontFamily: c.mono, fontSize: 10, color: 'rgba(79,142,247,0.9)', letterSpacing: '0.05em' }}>● Primary</span>
            <span style={{ fontFamily: c.mono, fontSize: 10, color: 'rgba(79,142,247,0.45)', letterSpacing: '0.05em' }}>● Secondary</span>
          </div>
        )}
      </div>
      <div className="muscle-wrap" style={{ display: 'flex', gap: 4, opacity: empty ? 0.3 : 1, transition: 'opacity 0.3s' }}>
        <div style={{ flex: 1 }}>
          <BodyModel data={empty ? emptyData : muscleData} type="anterior" colors={MUSCLE_COLORS} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <BodyModel data={empty ? emptyData : muscleData} type="posterior" colors={MUSCLE_COLORS} style={{ width: '100%' }} />
        </div>
      </div>
      {empty && (
        <p style={{ margin: '6px 0 0', fontFamily: c.sans, fontSize: 12, color: c.faint, textAlign: 'center' }}>
          Add exercises to see muscle map
        </p>
      )}
    </div>
  );
}

// ── WorkoutTab ─────────────────────────────────────────────────────────────────
function WorkoutTab({ exercises, setExercises, workoutName, setWorkoutName, onFinish, uploadStatus, startTimeRef, isPaused, onTogglePause, totalPausedMsRef }) {
  const [showPicker, setShowPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [nameFocused, setNameFocused] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current - totalPausedMsRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, startTimeRef, totalPausedMsRef]);

  const hasContent = exercises.some(ex => ex.sets.some(s => s.reps > 0));
  const vol = totalVol(exercises);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px', fontFamily: c.sans }}>
      {/* Timer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{
          fontFamily: c.mono, fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          color: isPaused ? c.muted : c.accent,
          transition: 'color 0.2s', flex: 1,
        }}>
          {fmtTime(elapsed)}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {vol > 0 && (
            <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(vol)} kg
            </span>
          )}
          <button onClick={onTogglePause} style={{
            padding: '7px 12px', borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.elevated,
            color: c.primary, fontFamily: c.sans,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {isPaused && (
        <div style={{
          background: `rgba(240,164,41,0.08)`, border: `1px solid rgba(240,164,41,0.2)`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          fontFamily: c.mono, fontSize: 12, color: c.amber, letterSpacing: '0.03em',
        }}>
          Timer paused
        </div>
      )}

      {/* Workout name */}
      <input
        value={workoutName} onChange={e => setWorkoutName(e.target.value)}
        onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)}
        placeholder="Workout name (e.g. Push Day)"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: c.elevated,
          border: `1px solid ${nameFocused ? c.accent : c.border}`,
          borderRadius: 10, padding: '13px 14px',
          color: c.primary, fontSize: 15, outline: 'none',
          marginBottom: 14, fontFamily: c.sans, fontWeight: 500,
          transition: 'border-color 0.15s',
        }}
      />

      {/* Muscle visualizer */}
      <MuscleCard exercises={exercises} />

      {/* Exercise cards */}
      {exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.name + i}
          exercise={ex}
          onUpdateSets={sets => { const next = [...exercises]; next[i] = { ...ex, sets }; setExercises(next); }}
          onRemove={() => setExercises(exercises.filter((_, idx) => idx !== i))}
        />
      ))}

      <button onClick={() => setShowPicker(true)} style={{
        width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'rgba(79,142,247,0.12)',
        border: `1px solid rgba(79,142,247,0.35)`,
        borderRadius: 10, color: c.accent,
        fontFamily: c.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer',
        marginBottom: 8, transition: 'background 0.15s',
      }}>
        <PlusIcon size={15} />
        Add Exercise
      </button>

      {showPicker && (
        <ExercisePicker
          existing={exercises.map(e => e.name)}
          onSelect={name => {
            setExercises([...exercises, { name, sets: [{ reps: 0, weightKg: 0 }] }]);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Finish button */}
      {hasContent && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          background: `linear-gradient(to top, ${c.base} 60%, transparent)`,
          maxWidth: 480, margin: '0 auto',
        }}>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={uploadStatus === 'uploading'}
            style={{
              width: '100%', padding: '15px 0',
              background: uploadStatus === 'done' ? c.green : c.green,
              border: 'none', borderRadius: 10,
              color: '#0a0a0f', fontFamily: c.sans, fontSize: 15, fontWeight: 700,
              cursor: uploadStatus === 'uploading' ? 'wait' : 'pointer',
              opacity: uploadStatus === 'uploading' ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            {uploadStatus === 'uploading' ? 'Saving…' : uploadStatus === 'done' ? 'Saved' : 'Finish Workout'}
          </button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16,
          background: 'rgba(242,92,92,0.1)', border: `1px solid rgba(242,92,92,0.3)`,
          borderRadius: 10, padding: '10px 14px',
          fontFamily: c.sans, fontSize: 13, color: c.red,
        }}>
          Upload failed — workout saved locally. Retry from History.
        </div>
      )}

      {/* Finish confirmation overlay */}
      {showConfirm && (() => {
        const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.reps > 0).length, 0);
        const vol = totalVol(exercises);
        const exList = exercises.filter(ex => ex.sets.some(s => s.reps > 0));
        return (
          <div
            onClick={() => setShowConfirm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              padding: '0 0 env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 480,
                background: c.elevated,
                border: `1px solid ${c.borderHover}`,
                borderRadius: '18px 18px 0 0',
                padding: '28px 20px calc(20px + env(safe-area-inset-bottom, 16px))',
              }}
            >
              {/* Handle bar */}
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: c.faint, margin: '-12px auto 20px',
              }} />

              <div style={{ fontFamily: c.sans, fontSize: 18, fontWeight: 700, color: c.primary, marginBottom: 4 }}>
                {workoutName || 'Untitled Workout'}
              </div>
              <div style={{ fontFamily: c.mono, fontSize: 12, color: c.muted, letterSpacing: '0.04em', marginBottom: 20 }}>
                {fmtTime(elapsed)} · {exList.length} exercise{exList.length !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''}{vol > 0 ? ` · ${Math.round(vol)} kg` : ''}
              </div>

              {exList.length > 0 && (
                <div style={{
                  background: c.surface, borderRadius: 10,
                  border: `1px solid ${c.border}`,
                  marginBottom: 20, overflow: 'hidden',
                }}>
                  {exList.map((ex, i) => {
                    const doneSets = ex.sets.filter(s => s.reps > 0).length;
                    return (
                      <div key={ex.name} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px',
                        borderBottom: i < exList.length - 1 ? `1px solid ${c.border}` : 'none',
                      }}>
                        <span style={{ fontFamily: c.sans, fontSize: 14, color: c.primary }}>{ex.name}</span>
                        <span style={{ fontFamily: c.mono, fontSize: 12, color: c.muted }}>{doneSets} set{doneSets !== 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1, padding: '14px 0',
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: 10,
                    color: c.muted, fontFamily: c.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowConfirm(false); onFinish(); }}
                  style={{
                    flex: 2, padding: '14px 0',
                    background: c.green,
                    border: 'none', borderRadius: 10,
                    color: '#0a0a0f', fontFamily: c.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Finish Workout
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── ExportCard (1280×720 — 16:9, rendered off-screen for html2canvas) ──────────
const EXPORT_MUSCLE_COLORS = [
  'rgba(79,142,247,0.25)',
  'rgba(79,142,247,0.45)',
  'rgba(79,142,247,0.65)',
  'rgba(79,142,247,0.90)',
];

function ExportCard({ entry }) {
  if (!entry) return null;
  const d = new Date(entry.performedAt);
  const dateLabel = [
    d.toLocaleDateString('en-US', { weekday: 'long' }),
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    d.getFullYear(),
  ].join(' · ').toUpperCase();

  const exercises = entry.exercises || [];
  const vol = totalVol(exercises);
  const muscleData = getMuscleDatumForExport(exercises);
  const emptyData = [{ name: 'none', muscles: [], frequency: 1 }];
  const visEx = exercises.slice(0, 8);
  const extraCount = Math.max(0, exercises.length - 8);
  const durationStr = entry.durationS ? fmtTime(entry.durationS) : null;
  const statsStr = [
    durationStr,
    vol > 0 ? `${Math.round(vol)}kg` : null,
    `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');

  const SANS = '"Geist", -apple-system, sans-serif';
  const MONO = '"Geist Mono", ui-monospace, monospace';

  return (
    <div style={{
      width: 1080, height: 1920, background: '#0a0a0f',
      padding: 64, display: 'flex', flexDirection: 'column',
      fontFamily: SANS, color: '#e8eaf0', boxSizing: 'border-box',
    }}>
      <style suppressHydrationWarning>{`
        .ecmw svg path { fill: #1a1a24 !important; stroke: rgba(255,255,255,0.06) !important; stroke-width: 1px !important; }
        .ecmw svg path[style*="rgba(79"] { fill: unset !important; stroke: rgba(79,142,247,0.7) !important; }
        .ecmw svg path[style*="rgba(79,142,247,0.25"] { fill: rgba(79,142,247,0.25) !important; }
        .ecmw svg path[style*="rgba(79,142,247,0.45"] { fill: rgba(79,142,247,0.45) !important; }
        .ecmw svg path[style*="rgba(79,142,247,0.65"] { fill: rgba(79,142,247,0.65) !important; }
        .ecmw svg path[style*="rgba(79,142,247,0.90"] { fill: rgba(79,142,247,0.90) !important; stroke: #4f8ef7 !important; }
        .ecmw svg { width: 100%; height: 100%; }
      `}</style>

      {/* TOP — date / name / stats */}
      <div style={{ flexShrink: 0 }}>
        <p style={{ fontFamily: MONO, fontSize: 13, color: '#4a4f5e', letterSpacing: '0.12em', margin: 0 }}>
          {dateLabel}
        </p>
        <h1 style={{ fontFamily: SANS, fontSize: 38, fontWeight: 700, color: '#e8eaf0', margin: '10px 0 0', lineHeight: 1.2 }}>
          {entry.name}
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 15, color: '#9499a8', margin: '8px 0 0' }}>
          {statsStr}
        </p>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginTop: 24 }} />
      </div>

      {/* BODY — muscle maps */}
      <div className="ecmw" style={{ flexShrink: 0, height: 960, display: 'flex', gap: 24, paddingTop: 24, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, height: '100%' }}>
          <BodyModel data={muscleData.length ? muscleData : emptyData} type="anterior" colors={EXPORT_MUSCLE_COLORS} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ flex: 1, height: '100%' }}>
          <BodyModel data={muscleData.length ? muscleData : emptyData} type="posterior" colors={EXPORT_MUSCLE_COLORS} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* EXERCISE LIST — 2-column grid, no weights */}
      <div style={{ flex: 1, minHeight: 0, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 48, rowGap: 4 }}>
          {visEx.map((ex, i) => {
            const setCount = ex.sets.filter(s => s.reps > 0).length;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 66 }}>
                <span style={{ fontFamily: SANS, fontSize: 27, color: '#e8eaf0' }}>{ex.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 24, color: '#9499a8' }}>
                  {setCount} set{setCount !== 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div style={{ height: 66, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 24, color: '#4a4f5e', fontStyle: 'italic' }}>
                + {extraCount} more
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER — centered */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: SANS, fontSize: 26, color: '#4a4f5e', letterSpacing: '0.04em' }}>exported by sarvagya ai</span>
      </div>
    </div>
  );
}

// ── HistoryTab ─────────────────────────────────────────────────────────────────
function HistoryTab({ history, setHistory }) {
  const [expanded, setExpanded] = useState(new Set());
  const [retrying, setRetrying] = useState(null);
  const [copyStates, setCopyStates] = useState({});  // id → 'idle'|'loading'|'success'|'error'
  const [exportEntry, setExportEntry] = useState(null);
  const exportDivRef = useRef(null);

  // Capture export div whenever exportEntry is set
  useEffect(() => {
    if (!exportEntry) return;
    const run = async () => {
      try {
        await document.fonts.ready;
        // Wait for BodyModel SVG to render
        let attempts = 0;
        while (attempts < 12) {
          await new Promise(r => setTimeout(r, 100));
          const paths = exportDivRef.current?.querySelectorAll('.ecmw svg path');
          if (paths && paths.length > 0) break;
          attempts++;
        }
        // Stamp active muscle strokes directly on SVG paths
        if (exportDivRef.current) {
          exportDivRef.current.querySelectorAll('.ecmw svg path').forEach(path => {
            const f = path.style.fill;
            if (f && f.includes('79,142,247')) {
              path.style.stroke = f.includes('0.90') ? '#4f8ef7' : 'rgba(79,142,247,0.6)';
              path.style.strokeWidth = '1px';
            }
          });
        }
        const h2c = (await import('html2canvas')).default;
        const canvas = await h2c(exportDivRef.current, {
          scale: 2, useCORS: true, backgroundColor: '#0a0a0f', logging: false,
        });
        let copied = false;
        try {
          const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('no blob')), 'image/png'));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          copied = true;
        } catch {
          // Fallback: download
          const a = document.createElement('a');
          const slug = exportEntry.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          a.href = canvas.toDataURL('image/png');
          a.download = `sarvagya-${slug}-${exportEntry.performedAt.slice(0, 10)}.png`;
          a.click();
          copied = true;
        }
        if (copied) {
          setCopyStates(p => ({ ...p, [exportEntry.id]: 'success' }));
          setTimeout(() => setCopyStates(p => ({ ...p, [exportEntry.id]: 'idle' })), 2000);
        }
      } catch (err) {
        console.error('Export failed:', err);
        setCopyStates(p => ({ ...p, [exportEntry.id]: 'error' }));
        setTimeout(() => setCopyStates(p => ({ ...p, [exportEntry.id]: 'idle' })), 1500);
      } finally {
        setExportEntry(null);
      }
    };
    run();
  }, [exportEntry]);

  const handleCopy = (entry) => {
    if (!(entry.exercises?.length)) return;
    setCopyStates(p => ({ ...p, [entry.id]: 'loading' }));
    setExportEntry(entry);
  };

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const retryUpload = async (entry) => {
    const settings = loadLocal('gymSettings', {});
    if (!settings.url || !settings.secret) return;
    setRetrying(entry.id);
    try {
      const r = await fetch(`${settings.url}/api/gym/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.secret}` },
        body: JSON.stringify({ name: entry.name, performedAt: entry.performedAt, notes: '', sets: entry.sets }),
      });
      if (r.ok) {
        const next = history.map(h => h.id === entry.id ? { ...h, uploaded: true } : h);
        setHistory(next);
        localStorage.setItem('gymHistory', JSON.stringify(next));
      }
    } catch {}
    setRetrying(null);
  };

  if (history.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: c.mono, color: c.faint, fontSize: 13 }}>
        No workouts logged yet
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Hidden export canvas — fixed off-screen, never visible */}
      <div ref={exportDivRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1, pointerEvents: 'none' }}>
        {exportEntry && <ExportCard entry={exportEntry} />}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, fontFamily: c.sans }}>
        {[...history].reverse().map(entry => {
          const vol = totalVol(entry.exercises || []);
          const exCount = (entry.exercises || []).length;
          const durationS = entry.durationS || 0;
          const isExp = expanded.has(entry.id);
          const cs = copyStates[entry.id] || 'idle';
          const hasExercises = exCount > 0;

          const CopyIconEl = cs === 'success' ? CheckIcon : cs === 'error' ? XSmallIcon : CopyIcon;
          const copyColor = cs === 'success' ? c.green : cs === 'error' ? c.red : cs === 'loading' ? c.muted : c.faint;

          return (
            <div key={entry.id} style={{
              position: 'relative',
              background: c.surface, borderRadius: 12, marginBottom: 10,
              border: `1px solid ${c.border}`, overflow: 'hidden',
            }}>
              {/* Copy icon — absolute top-right */}
              {hasExercises && (
                <button
                  onClick={e => { e.stopPropagation(); handleCopy(entry); }}
                  disabled={cs === 'loading'}
                  style={{
                    position: 'absolute', top: 14, right: 14,
                    background: 'transparent', border: 'none',
                    cursor: cs === 'loading' ? 'wait' : 'pointer',
                    color: copyColor, padding: 4, lineHeight: 0,
                    transition: 'color 0.15s', zIndex: 1,
                  }}
                >
                  <CopyIconEl size={14} />
                </button>
              )}

              <div onClick={() => toggle(entry.id)} style={{ padding: '14px 16px', paddingRight: hasExercises ? 44 : 16, cursor: 'pointer' }}>
                <p style={{ fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 5px' }}>
                  {fmtDate(entry.performedAt)}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, color: c.primary, fontSize: 15 }}>{entry.name}</span>
                  <span style={{ fontFamily: c.mono, fontSize: 10, letterSpacing: '0.05em', color: entry.uploaded ? c.green : c.amber, flexShrink: 0, marginLeft: 8 }}>
                    {entry.uploaded ? 'synced' : 'pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 6 }}>
                  {durationS > 0 && (
                    <>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>{fmtTime(durationS)}</span>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.faint, margin: '0 6px' }}>·</span>
                    </>
                  )}
                  <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>
                    {exCount} exercise{exCount !== 1 ? 's' : ''}
                  </span>
                  {vol > 0 && (
                    <>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.faint, margin: '0 6px' }}>·</span>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted, fontVariantNumeric: 'tabular-nums' }}>{Math.round(vol)} kg</span>
                    </>
                  )}
                </div>
              </div>

              {isExp && (
                <div style={{ borderTop: `1px solid ${c.border}`, padding: '12px 16px' }}>
                  {(entry.exercises || []).map((ex, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <p style={{ fontFamily: c.sans, fontSize: 13, fontWeight: 600, color: c.muted, margin: '0 0 4px' }}>{ex.name}</p>
                      {ex.sets.map((s, si) => (
                        <p key={si} style={{ fontFamily: c.mono, fontSize: 12, color: c.faint, margin: '2px 0 2px 10px' }}>
                          {si + 1}. {s.reps} reps × {s.weightKg} kg
                        </p>
                      ))}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {!entry.uploaded && (
                      <button onClick={() => retryUpload(entry)} disabled={retrying === entry.id} style={{
                        flex: 1, padding: '10px 0', background: c.elevated,
                        border: `1px solid rgba(79,142,247,0.3)`, borderRadius: 8,
                        color: c.accent, fontFamily: c.sans, fontSize: 13, cursor: 'pointer',
                      }}>
                        {retrying === entry.id ? 'Uploading…' : 'Upload'}
                      </button>
                    )}
                    <button onClick={() => {
                      const next = history.filter(h => h.id !== entry.id);
                      setHistory(next);
                      localStorage.setItem('gymHistory', JSON.stringify(next));
                    }} style={{
                      flex: 1, padding: '10px 0', background: c.elevated,
                      border: `1px solid rgba(242,92,92,0.2)`, borderRadius: 8,
                      color: c.red, fontFamily: c.sans, fontSize: 13, cursor: 'pointer',
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SettingsTab ────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState(null);
  const [urlFocused, setUrlFocused] = useState(false);
  const [secretFocused, setSecretFocused] = useState(false);

  useEffect(() => {
    const saved = loadLocal('gymSettings', {});
    setUrl(saved.url || '');
    setSecret(saved.secret || '');
  }, []);

  const save = () => {
    localStorage.setItem('gymSettings', JSON.stringify({ url: url.trim(), secret: secret.trim() }));
    setStatus('saved');
    setTimeout(() => setStatus(null), 2000);
  };

  const test = async () => {
    setStatus('testing');
    try {
      const r = await fetch(`${url.trim()}/api/gym/read?since=0`, {
        headers: { Authorization: `Bearer ${secret.trim()}` },
      });
      setStatus(r.ok ? 'ok' : 'error');
    } catch { setStatus('error'); }
    setTimeout(() => setStatus(null), 3000);
  };

  const fieldStyle = (focused) => ({
    width: '100%', boxSizing: 'border-box', background: c.elevated,
    border: `1px solid ${focused ? c.accent : c.border}`, borderRadius: 10,
    padding: '12px 14px', color: c.primary, fontSize: 15, outline: 'none',
    marginBottom: 14, fontFamily: c.sans, transition: 'border-color 0.15s',
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, fontFamily: c.sans }}>
      <div style={{ background: c.surface, borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${c.border}` }}>
        <p style={{ fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 18px' }}>
          Bridge Configuration
        </p>
        <label style={{ display: 'block', fontFamily: c.sans, fontSize: 12, color: c.muted, marginBottom: 6 }}>Vercel URL</label>
        <input
          value={url} onChange={e => setUrl(e.target.value)}
          onFocus={() => setUrlFocused(true)} onBlur={() => setUrlFocused(false)}
          placeholder="https://your-bridge.vercel.app"
          style={fieldStyle(urlFocused)}
        />
        <label style={{ display: 'block', fontFamily: c.sans, fontSize: 12, color: c.muted, marginBottom: 6 }}>Secret Token</label>
        <input
          type="password" value={secret} onChange={e => setSecret(e.target.value)}
          onFocus={() => setSecretFocused(true)} onBlur={() => setSecretFocused(false)}
          placeholder="your-secret"
          style={fieldStyle(secretFocused)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} style={{
            flex: 1, padding: '12px 0',
            background: status === 'saved' ? c.green : c.accent,
            border: 'none', borderRadius: 10,
            color: '#0a0a0f', fontFamily: c.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}>
            {status === 'saved' ? 'Saved' : 'Save'}
          </button>
          <button onClick={test} style={{
            flex: 1, padding: '12px 0', background: c.elevated,
            border: `1px solid ${status === 'ok' ? c.green : status === 'error' ? c.red : c.border}`,
            borderRadius: 10,
            color: status === 'ok' ? c.green : status === 'error' ? c.red : c.muted,
            fontFamily: c.sans, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {status === 'testing' ? 'Testing…' : status === 'ok' ? 'Connected' : status === 'error' ? 'Failed' : 'Test'}
          </button>
        </div>
      </div>
      <p style={{ fontFamily: c.sans, fontSize: 13, color: c.faint, lineHeight: 1.6, margin: 0 }}>
        Workouts upload to{' '}
        <span style={{ fontFamily: c.mono, fontSize: 12, color: c.muted }}>/api/gym/upload</span>
        {' '}and sync to your desktop every 30 minutes.
      </p>
    </div>
  );
}

// ── NavBar ─────────────────────────────────────────────────────────────────────
function NavBar({ tab, setTab, pendingCount }) {
  const items = [
    { id: 'workout',  label: 'Workout',  Icon: DumbbellIcon },
    { id: 'history',  label: pendingCount > 0 ? `History (${pendingCount})` : 'History', Icon: ClockIcon },
    { id: 'settings', label: 'Settings', Icon: SlidersIcon },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
      padding: '10px 14px',
      background: c.surface, borderBottom: `1px solid ${c.border}`, flexShrink: 0,
    }}>
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px',
            background: active ? 'rgba(79,142,247,0.12)' : 'transparent',
            border: `1px solid ${active ? 'rgba(79,142,247,0.28)' : 'transparent'}`,
            borderRadius: 8, cursor: 'pointer',
            color: active ? c.accent : c.muted,
            fontFamily: c.sans, fontSize: 12, fontWeight: active ? 600 : 400,
            transition: 'all 0.15s',
          }}>
            <Icon size={14} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function GymPWA() {
  const [tab, setTab] = useState('workout');
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [history, setHistory] = useState(() => loadLocal('gymHistory', []));
  const [isPaused, setIsPaused] = useState(false);

  const startTimeRef     = useRef(Date.now());
  const pausedAtRef      = useRef(null);
  const totalPausedMsRef = useRef(0);

  // Reset timer when first exercise is added
  const prevExLen = useRef(0);
  useEffect(() => {
    if (prevExLen.current === 0 && exercises.length > 0) {
      startTimeRef.current = Date.now();
      totalPausedMsRef.current = 0;
      pausedAtRef.current = null;
      setIsPaused(false);
    }
    prevExLen.current = exercises.length;
  }, [exercises.length]);

  const handleTogglePause = () => {
    if (isPaused) {
      if (pausedAtRef.current !== null) {
        totalPausedMsRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      setIsPaused(false);
    } else {
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  };

  const pendingCount = history.filter(h => !h.uploaded).length;

  const handleFinish = async () => {
    const hasContent = exercises.some(ex => ex.sets.some(s => s.reps > 0));
    if (!hasContent) return;

    if (isPaused) handleTogglePause();

    const name = workoutName.trim() || 'Workout';
    const performedAt = new Date().toISOString();

    const flatSets = [];
    let setNum = 1;
    exercises.forEach(ex => {
      ex.sets.filter(s => s.reps > 0).forEach(s => {
        flatSets.push({ exerciseName: ex.name, setNumber: setNum++, reps: s.reps, weightKg: s.weightKg });
      });
    });

    const entry = { id: Date.now().toString(), name, performedAt, exercises, sets: flatSets, uploaded: false };
    const settings = loadLocal('gymSettings', {});

    if (settings.url && settings.secret) {
      setUploadStatus('uploading');
      try {
        const r = await fetch(`${settings.url}/api/gym/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.secret}` },
          body: JSON.stringify({ name, performedAt, sets: flatSets }),
        });
        entry.uploaded = r.ok;
        setUploadStatus(r.ok ? 'done' : 'error');
      } catch { setUploadStatus('error'); }
    }

    const next = [...history, entry];
    setHistory(next);
    localStorage.setItem('gymHistory', JSON.stringify(next));

    if (entry.uploaded) {
      setTimeout(() => {
        setWorkoutName('');
        setExercises([]);
        setUploadStatus(null);
        totalPausedMsRef.current = 0;
        setTab('history');
      }, 1200);
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${c.base}; color: ${c.primary}; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        button:active { opacity: 0.75; }
        .muscle-wrap svg path { fill: #161622; stroke: rgba(255,255,255,0.06); stroke-width: 0.5; }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100dvh',
        background: c.base, color: c.primary, fontFamily: c.sans,
        maxWidth: 480, margin: '0 auto',
      }}>
        <NavBar tab={tab} setTab={setTab} pendingCount={pendingCount} />

        {/* Tabs — kept mounted to preserve timer state */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ display: tab === 'workout'  ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <WorkoutTab
              exercises={exercises} setExercises={setExercises}
              workoutName={workoutName} setWorkoutName={setWorkoutName}
              onFinish={handleFinish} uploadStatus={uploadStatus}
              startTimeRef={startTimeRef} isPaused={isPaused}
              onTogglePause={handleTogglePause} totalPausedMsRef={totalPausedMsRef}
            />
          </div>
          <div style={{ display: tab === 'history'  ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <HistoryTab history={history} setHistory={setHistory} />
          </div>
          <div style={{ display: tab === 'settings' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <SettingsTab />
          </div>
        </div>
      </div>
    </>
  );
}
