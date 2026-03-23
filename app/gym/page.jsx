'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const BodyModel = dynamic(() => import('react-body-highlighter'), { ssr: false });

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

// Per-muscle recovery time constants (τ days)
const MUSCLE_TAU_PWA = {
  'calves': 1.5, 'neck': 1.5,
  'biceps': 2.0, 'triceps': 2.0, 'forearm': 2.0,
  'front-deltoids': 2.5, 'back-deltoids': 2.5, 'trapezius': 2.5,
  'abs': 2.5, 'adductor': 2.5, 'abductors': 2.5,
  'chest': 3.0,
  'upper-back': 4.0, 'hamstring': 4.0, 'gluteal': 4.0,
  'quadriceps': 4.5, 'lower-back': 4.5,
};

// 100-step continuous gradient: green (ready) → amber → red (needs rest)
function generateGradient(steps) {
  function lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  return Array.from({ length: steps }, (_, i) => {
    const tt = i / (steps - 1);
    const [r, g, b] = tt <= 0.5
      ? lerpColor([62, 207, 142], [240, 164, 41], tt * 2)
      : lerpColor([240, 164, 41], [139, 32, 48], (tt - 0.5) * 2);
    return `rgba(${r},${g},${b},0.85)`;
  });
}
const GRADIENT_COLORS_PWA = generateGradient(100);

const EXERCISE_CATEGORIES = {
  'Chest': [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
    'Dumbbell Fly', 'Cable Fly', 'Low Cable Fly', 'High Cable Fly',
    'Push-Up', 'Chest Dip', 'Chest Press Machine', 'Pec Deck',
    'Landmine Press', 'Svend Press',
  ],
  'Back': [
    'Pull-Up', 'Chin-Up', 'Lat Pulldown', 'Reverse Grip Lat Pulldown',
    'Seated Cable Row', 'Barbell Row', 'Pendlay Row', 'Meadows Row',
    'Seal Row', 'Chest-Supported Row', 'T-Bar Row', 'Single-Arm Row',
    'Straight-Arm Pulldown', 'Deadlift', 'Rack Pull',
  ],
  'Shoulders': [
    'Overhead Press', 'Arnold Press', 'Lateral Raise', 'Cable Lateral Raise',
    'Machine Lateral Raise', 'Front Raise', 'Cable Front Raise',
    'Rear Delt Fly', 'Face Pull', 'Upright Row', 'Barbell Shrug',
    'Machine Shoulder Press', 'Bradford Press',
  ],
  'Biceps': [
    'Bicep Curl', 'Hammer Curl', 'Preacher Curl', 'Incline Curl',
    'Cable Curl', 'EZ Bar Curl', 'Concentration Curl', 'Spider Curl',
    'Zottman Curl', 'Reverse Curl',
  ],
  'Triceps': [
    'Tricep Pushdown', 'Rope Pushdown', 'Reverse Grip Pushdown',
    'Single-Arm Pushdown', 'Skull Crusher', 'JM Press',
    'Overhead Tricep Extension', 'Dips', 'Close-Grip Bench Press',
    'Diamond Push-Up',
  ],
  'Legs': [
    'Squat', 'Front Squat', 'Hack Squat', 'Goblet Squat', 'Zercher Squat',
    'Sumo Squat', 'Leg Press', 'Romanian Deadlift', 'Stiff-Leg Deadlift',
    'Sumo Deadlift', 'Leg Curl', 'Seated Leg Curl', 'Leg Extension',
    'Bulgarian Split Squat', 'Split Squat', 'Lunges', 'Sissy Squat',
    'Nordic Curl', 'Calf Raises', 'Seated Calf Raise', 'Hip Thrust',
    'Glute Bridge', 'Step-Up', 'Leg Adductor', 'Leg Abductor',
    'Reverse Hyper', 'GHD Sit-Up',
  ],
  'Core': [
    'Plank', 'Copenhagen Plank', 'Hollow Hold', 'L-Sit', 'Dragon Flag',
    'Cable Crunch', 'Hanging Leg Raise', 'Toes to Bar', 'Ab Rollout',
    'Russian Twist', 'Sit-Up', 'Bicycle Crunch', 'Dead Bug', 'Bird Dog',
    'V-Up', 'Pallof Press', 'Woodchop',
  ],
  'Olympic / Compound': [
    'Power Clean', 'Clean and Jerk', 'Snatch', 'Push Press', 'Thruster',
    'Good Morning', 'Deficit Deadlift', 'Farmers Walk', 'Suitcase Carry',
    'Turkish Get-Up', 'Kettlebell Swing',
  ],
  'Cardio': [
    'Box Jump', 'Burpee', 'Mountain Climber', 'Battle Rope',
  ],
};

const EXERCISES = Object.values(EXERCISE_CATEGORIES).flat();

const BW_DEFAULTS = new Set([
  'Pull-Up', 'Chin-Up', 'Dips', 'Chest Dip', 'Push-Up', 'Diamond Push-Up',
  'Plank', 'Hanging Leg Raise', 'Toes to Bar', 'Ab Rollout', 'L-Sit',
  'Dragon Flag', 'Copenhagen Plank', 'Dead Bug', 'Bird Dog', 'Hollow Hold',
  'V-Up', 'Sit-Up', 'Bicycle Crunch', 'Russian Twist',
  'Burpee', 'Box Jump', 'Mountain Climber', 'Nordic Curl', 'GHD Sit-Up',
  'Reverse Hyper', 'Lunges', 'Step-Up',
]);

const UNI_DEFAULTS = new Set([
  'Single-Arm Row', 'Meadows Row',
  'Lateral Raise', 'Cable Lateral Raise', 'Machine Lateral Raise',
  'Front Raise', 'Cable Front Raise', 'Rear Delt Fly',
  'Bicep Curl', 'Hammer Curl', 'Preacher Curl', 'Incline Curl', 'Cable Curl',
  'EZ Bar Curl', 'Concentration Curl', 'Spider Curl', 'Zottman Curl', 'Reverse Curl',
  'Single-Arm Pushdown',
  'Bulgarian Split Squat', 'Split Squat', 'Lunges', 'Step-Up', 'Sissy Squat',
  'Suitcase Carry', 'Turkish Get-Up',
]);

function defaultWeightMode(name) { return BW_DEFAULTS.has(name) ? 'bw' : 'weighted'; }
function defaultUnilateral(name) { return UNI_DEFAULTS.has(name); }

const EXERCISE_MUSCLES = {
  'Bench Press':                { p: ['chest'],                               s: ['triceps', 'front-deltoids'] },
  'Incline Bench Press':        { p: ['chest'],                               s: ['front-deltoids', 'triceps'] },
  'Decline Bench Press':        { p: ['chest'],                               s: ['triceps'] },
  'Dumbbell Fly':               { p: ['chest'],                               s: ['front-deltoids'] },
  'Cable Fly':                  { p: ['chest'],                               s: ['front-deltoids'] },
  'Low Cable Fly':              { p: ['chest'],                               s: ['front-deltoids'] },
  'High Cable Fly':             { p: ['chest'],                               s: ['front-deltoids'] },
  'Push-Up':                    { p: ['chest'],                               s: ['triceps', 'front-deltoids'] },
  'Chest Dip':                  { p: ['chest', 'triceps'],                    s: ['front-deltoids'] },
  'Chest Press Machine':        { p: ['chest'],                               s: ['triceps', 'front-deltoids'] },
  'Pec Deck':                   { p: ['chest'],                               s: ['front-deltoids'] },
  'Landmine Press':             { p: ['chest', 'front-deltoids'],             s: ['triceps'] },
  'Svend Press':                { p: ['chest'],                               s: [] },
  'Pull-Up':                    { p: ['upper-back'],                          s: ['biceps', 'trapezius'] },
  'Chin-Up':                    { p: ['upper-back', 'biceps'],                s: ['trapezius'] },
  'Lat Pulldown':               { p: ['upper-back'],                          s: ['biceps'] },
  'Reverse Grip Lat Pulldown':  { p: ['upper-back', 'biceps'],                s: [] },
  'Seated Cable Row':           { p: ['upper-back'],                          s: ['biceps', 'trapezius'] },
  'Barbell Row':                { p: ['upper-back'],                          s: ['biceps', 'lower-back'] },
  'Pendlay Row':                { p: ['upper-back'],                          s: ['biceps', 'lower-back'] },
  'Meadows Row':                { p: ['upper-back'],                          s: ['biceps'] },
  'Seal Row':                   { p: ['upper-back'],                          s: ['biceps'] },
  'Chest-Supported Row':        { p: ['upper-back'],                          s: ['biceps'] },
  'T-Bar Row':                  { p: ['upper-back'],                          s: ['biceps', 'trapezius'] },
  'Single-Arm Row':             { p: ['upper-back'],                          s: ['biceps'] },
  'Straight-Arm Pulldown':      { p: ['upper-back'],                          s: [] },
  'Deadlift':                   { p: ['lower-back', 'hamstring'],             s: ['gluteal', 'trapezius', 'quadriceps'] },
  'Rack Pull':                  { p: ['lower-back', 'trapezius'],             s: ['hamstring', 'gluteal'] },
  'Overhead Press':             { p: ['front-deltoids'],                      s: ['triceps', 'trapezius'] },
  'Arnold Press':               { p: ['front-deltoids', 'back-deltoids'],     s: ['triceps'] },
  'Lateral Raise':              { p: ['front-deltoids'],                      s: [] },
  'Cable Lateral Raise':        { p: ['front-deltoids'],                      s: [] },
  'Machine Lateral Raise':      { p: ['front-deltoids'],                      s: [] },
  'Front Raise':                { p: ['front-deltoids'],                      s: [] },
  'Cable Front Raise':          { p: ['front-deltoids'],                      s: [] },
  'Rear Delt Fly':              { p: ['back-deltoids'],                       s: ['upper-back'] },
  'Face Pull':                  { p: ['back-deltoids'],                       s: ['trapezius', 'upper-back'] },
  'Upright Row':                { p: ['trapezius', 'front-deltoids'],         s: ['biceps'] },
  'Barbell Shrug':              { p: ['trapezius'],                           s: [] },
  'Machine Shoulder Press':     { p: ['front-deltoids'],                      s: ['triceps'] },
  'Bradford Press':             { p: ['front-deltoids', 'back-deltoids'],     s: ['trapezius'] },
  'Bicep Curl':                 { p: ['biceps'],                              s: ['forearm'] },
  'Hammer Curl':                { p: ['biceps'],                              s: ['forearm'] },
  'Preacher Curl':              { p: ['biceps'],                              s: [] },
  'Incline Curl':               { p: ['biceps'],                              s: [] },
  'Cable Curl':                 { p: ['biceps'],                              s: ['forearm'] },
  'EZ Bar Curl':                { p: ['biceps'],                              s: ['forearm'] },
  'Concentration Curl':         { p: ['biceps'],                              s: [] },
  'Spider Curl':                { p: ['biceps'],                              s: [] },
  'Zottman Curl':               { p: ['biceps'],                              s: ['forearm'] },
  'Reverse Curl':               { p: ['forearm', 'biceps'],                   s: [] },
  'Tricep Pushdown':            { p: ['triceps'],                             s: ['forearm'] },
  'Rope Pushdown':              { p: ['triceps'],                             s: ['forearm'] },
  'Reverse Grip Pushdown':      { p: ['triceps'],                             s: [] },
  'Single-Arm Pushdown':        { p: ['triceps'],                             s: [] },
  'Skull Crusher':              { p: ['triceps'],                             s: [] },
  'JM Press':                   { p: ['triceps'],                             s: ['chest'] },
  'Overhead Tricep Extension':  { p: ['triceps'],                             s: [] },
  'Dips':                       { p: ['triceps', 'chest'],                    s: ['front-deltoids'] },
  'Close-Grip Bench Press':     { p: ['triceps'],                             s: ['chest', 'front-deltoids'] },
  'Diamond Push-Up':            { p: ['triceps'],                             s: ['chest'] },
  'Squat':                      { p: ['quadriceps', 'gluteal'],               s: ['hamstring', 'lower-back', 'calves'] },
  'Front Squat':                { p: ['quadriceps'],                          s: ['gluteal', 'lower-back'] },
  'Hack Squat':                 { p: ['quadriceps'],                          s: ['gluteal', 'hamstring'] },
  'Goblet Squat':               { p: ['quadriceps', 'gluteal'],               s: ['lower-back'] },
  'Zercher Squat':              { p: ['quadriceps', 'gluteal'],               s: ['lower-back', 'biceps'] },
  'Sumo Squat':                 { p: ['quadriceps', 'gluteal'],               s: ['hamstring'] },
  'Leg Press':                  { p: ['quadriceps'],                          s: ['gluteal', 'hamstring'] },
  'Romanian Deadlift':          { p: ['hamstring', 'gluteal'],                s: ['lower-back'] },
  'Stiff-Leg Deadlift':         { p: ['hamstring', 'lower-back'],             s: ['gluteal'] },
  'Sumo Deadlift':              { p: ['quadriceps', 'gluteal'],               s: ['hamstring', 'lower-back'] },
  'Leg Curl':                   { p: ['hamstring'],                           s: ['calves'] },
  'Seated Leg Curl':            { p: ['hamstring'],                           s: [] },
  'Leg Extension':              { p: ['quadriceps'],                          s: [] },
  'Bulgarian Split Squat':      { p: ['quadriceps', 'gluteal'],               s: ['hamstring'] },
  'Split Squat':                { p: ['quadriceps', 'gluteal'],               s: ['hamstring'] },
  'Lunges':                     { p: ['quadriceps', 'gluteal'],               s: ['hamstring', 'calves'] },
  'Sissy Squat':                { p: ['quadriceps'],                          s: [] },
  'Nordic Curl':                { p: ['hamstring'],                           s: ['calves'] },
  'Calf Raises':                { p: ['calves'],                              s: [] },
  'Seated Calf Raise':          { p: ['calves'],                              s: [] },
  'Hip Thrust':                 { p: ['gluteal'],                             s: ['hamstring'] },
  'Glute Bridge':               { p: ['gluteal'],                             s: ['hamstring'] },
  'Step-Up':                    { p: ['quadriceps', 'gluteal'],               s: ['hamstring', 'calves'] },
  'Leg Adductor':               { p: ['hamstring'],                           s: ['gluteal'] },
  'Leg Abductor':               { p: ['gluteal'],                             s: [] },
  'Reverse Hyper':              { p: ['gluteal', 'hamstring'],                s: ['lower-back'] },
  'GHD Sit-Up':                 { p: ['abs', 'quadriceps'],                   s: [] },
  'Plank':                      { p: ['abs'],                                 s: ['lower-back'] },
  'Copenhagen Plank':           { p: ['abs'],                                 s: ['hamstring'] },
  'Hollow Hold':                { p: ['abs'],                                 s: [] },
  'L-Sit':                      { p: ['abs'],                                 s: ['quadriceps'] },
  'Dragon Flag':                { p: ['abs'],                                 s: ['lower-back'] },
  'Cable Crunch':               { p: ['abs'],                                 s: ['obliques'] },
  'Hanging Leg Raise':          { p: ['abs'],                                 s: ['obliques'] },
  'Toes to Bar':                { p: ['abs'],                                 s: ['obliques'] },
  'Ab Rollout':                 { p: ['abs'],                                 s: ['lower-back'] },
  'Russian Twist':              { p: ['obliques'],                            s: ['abs'] },
  'Sit-Up':                     { p: ['abs'],                                 s: [] },
  'Bicycle Crunch':             { p: ['abs', 'obliques'],                     s: [] },
  'Dead Bug':                   { p: ['abs'],                                 s: ['lower-back'] },
  'Bird Dog':                   { p: ['abs', 'lower-back'],                   s: ['gluteal'] },
  'V-Up':                       { p: ['abs'],                                 s: [] },
  'Pallof Press':               { p: ['abs', 'obliques'],                     s: [] },
  'Woodchop':                   { p: ['obliques'],                            s: ['abs', 'front-deltoids'] },
  'Power Clean':                { p: ['trapezius', 'quadriceps'],             s: ['hamstring', 'gluteal', 'lower-back'] },
  'Clean and Jerk':             { p: ['trapezius', 'quadriceps', 'front-deltoids'], s: ['triceps', 'lower-back'] },
  'Snatch':                     { p: ['trapezius', 'quadriceps'],             s: ['hamstring', 'lower-back', 'front-deltoids'] },
  'Push Press':                 { p: ['front-deltoids', 'quadriceps'],        s: ['triceps'] },
  'Thruster':                   { p: ['front-deltoids', 'quadriceps'],        s: ['triceps', 'gluteal'] },
  'Good Morning':               { p: ['hamstring', 'lower-back'],             s: ['gluteal'] },
  'Deficit Deadlift':           { p: ['lower-back', 'hamstring'],             s: ['gluteal', 'trapezius'] },
  'Farmers Walk':               { p: ['trapezius', 'forearm'],                s: ['quadriceps', 'calves'] },
  'Suitcase Carry':             { p: ['obliques', 'trapezius'],               s: ['forearm'] },
  'Turkish Get-Up':             { p: ['front-deltoids', 'abs'],               s: ['gluteal', 'trapezius'] },
  'Kettlebell Swing':           { p: ['hamstring', 'gluteal'],                s: ['lower-back'] },
  'Box Jump':                   { p: ['quadriceps', 'calves'],                s: ['gluteal', 'hamstring'] },
  'Burpee':                     { p: ['chest', 'quadriceps'],                 s: ['triceps', 'abs'] },
  'Mountain Climber':           { p: ['abs'],                                 s: ['quadriceps', 'front-deltoids'] },
  'Battle Rope':                { p: ['front-deltoids'],                      s: ['biceps', 'trapezius', 'abs'] },
};

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
function fmtVol(lbs) {
  if (lbs <= 0) return null;
  return lbs >= 1000 ? `${(lbs / 1000).toFixed(1)}k lbs` : `${Math.round(lbs)} lbs`;
}
// backward compat: old entries stored weightKg
function getSetWeight(set) {
  if (set.weightLbs !== undefined) return set.weightLbs;
  if (set.weightKg !== undefined) return +(set.weightKg * 2.20462).toFixed(1);
  return 0;
}
function totalVol(exercises) {
  return exercises.reduce((sum, ex) => {
    if (ex.weightMode === 'bw') return sum;
    return sum + ex.sets.reduce((s, set) => s + (set.reps || 0) * getSetWeight(set), 0);
  }, 0);
}
function loadLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOffset(Math.max(0, window.innerHeight - vv.height));
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return offset;
}

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

// Build composite fatigue heatmap from full workout history
function getHistoricalFatigueData(history) {
  const now = new Date();
  const muscleStats = {};
  for (const entry of history) {
    const performedAt = new Date(entry.performedAt);
    const daysSince = Math.floor((now - performedAt) / (1000 * 60 * 60 * 24));
    if (daysSince > 28) continue;
    for (const ex of (entry.exercises || [])) {
      const info = EXERCISE_MUSCLES[ex.name];
      if (!info) continue;
      const allMuscles = [
        ...info.p.map(m => ({ slug: m, factor: 1.0 })),
        ...info.s.map(m => ({ slug: m, factor: 0.5 })),
      ];
      for (const { slug, factor } of allMuscles) {
        if (!muscleStats[slug]) {
          muscleStats[slug] = { lastTrained: null, daysSince: Infinity, volume7dLbs: 0, volume28dLbs: 0, sets7d: 0, lastExercise: '' };
        }
        const stat = muscleStats[slug];
        if (!stat.lastTrained || performedAt > new Date(stat.lastTrained)) {
          stat.lastTrained = entry.performedAt;
          stat.daysSince = daysSince;
          stat.lastExercise = ex.name;
        }
        for (const s of ex.sets.filter(s => s.reps > 0)) {
          const vol = s.reps * getSetWeight(s) * factor;
          stat.volume28dLbs += vol;
          if (daysSince <= 7) {
            stat.volume7dLbs += vol;
            stat.sets7d += factor;
          }
        }
      }
    }
  }
  const result = [];
  for (const [slug, stat] of Object.entries(muscleStats)) {
    if (stat.daysSince === Infinity) continue;
    const tau = MUSCLE_TAU_PWA[slug] ?? 3.0;
    const recencyScore = Math.exp(-stat.daysSince / tau);
    const weeklyBaseline = stat.volume28dLbs / 4;
    const volumeScore = weeklyBaseline > 0
      ? Math.min(1, stat.volume7dLbs / weeklyBaseline)
      : (stat.volume7dLbs > 0 ? 0.5 : 0);
    const score = recencyScore * 0.65 + volumeScore * 0.35;
    const freq = Math.max(1, Math.min(100, Math.round(score * 99) + 1));
    result.push({ name: stat.lastExercise, muscles: [slug], frequency: freq });
  }
  return result;
}

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

const DumbbellIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/>
    <line x1="6" y1="12" x2="18" y2="12"/><rect x="0" y="9" width="2" height="6" rx="1"/><rect x="22" y="9" width="2" height="6" rx="1"/>
  </svg>
);
const ClockIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
  </svg>
);
const SlidersIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
    <line x1="8" y1="3" x2="8" y2="9"/><line x1="16" y1="15" x2="16" y2="21"/>
  </svg>
);
const PlusIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const CopyIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const XSmallIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── SetRow ─────────────────────────────────────────────────────────────────────
function SetRow({ set, index, onUpdate, onRemove, weightMode }) {
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
      {weightMode === 'bw' ? (
        <span style={{ flex: 1.5, textAlign: 'center', fontFamily: c.mono, fontSize: 11, color: c.faint }}>bodyweight</span>
      ) : (
        <>
          <span style={{ fontFamily: c.mono, color: c.faint, fontSize: 13, flexShrink: 0 }}>×</span>
          <input
            type="number" inputMode="decimal" step="2.5"
            placeholder={weightMode === 'bw+' ? '+lbs' : 'lbs'}
            value={set.weightLbs || ''}
            onChange={e => onUpdate({ ...set, weightLbs: parseFloat(e.target.value) || 0 })}
            style={{
              flex: 1, background: c.elevated, border: `1px solid ${c.border}`, borderRadius: 8,
              padding: '9px 8px', color: c.primary, fontSize: 15, textAlign: 'center',
              outline: 'none', minWidth: 0, fontFamily: c.mono,
            }}
          />
        </>
      )}
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: c.faint,
        padding: '4px 6px', fontSize: 16, lineHeight: 1, flexShrink: 0, opacity: 0.7,
      }}>×</button>
    </div>
  );
}

// ── ExerciseCard ───────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, onUpdateSets, onUpdateMeta, onRemove }) {
  const weightMode = exercise.weightMode ?? 'weighted';
  const isUnilateral = exercise.isUnilateral ?? false;
  const MODES = ['weighted', 'bw', 'bw+'];
  const modeLabels = { weighted: 'W', bw: 'BW', 'bw+': 'BW+' };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onUpdateSets([...exercise.sets, { reps: last?.reps || 0, weightLbs: last?.weightLbs || 0 }]);
  };

  const vol = weightMode === 'bw' ? 0
    : exercise.sets.reduce((s, set) => s + (set.reps || 0) * getSetWeight(set), 0);

  return (
    <div style={{ background: c.elevated, borderRadius: 10, padding: 16, marginBottom: 10, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, color: c.primary, fontSize: 14, fontFamily: c.sans, flex: 1, marginRight: 6, lineHeight: 1.3 }}>
          {exercise.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {vol > 0 && (
            <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>
              {fmtVol(vol)}
            </span>
          )}
          {/* Unilateral toggle */}
          <button
            onClick={() => onUpdateMeta({ isUnilateral: !isUnilateral })}
            title={isUnilateral ? 'Single arm/leg — tap for bilateral' : 'Both arms/legs — tap for single'}
            style={{
              padding: '3px 7px', borderRadius: 6,
              background: isUnilateral ? 'rgba(79,142,247,0.12)' : 'transparent',
              border: `1px solid ${isUnilateral ? 'rgba(79,142,247,0.35)' : c.border}`,
              color: isUnilateral ? c.accent : c.faint,
              fontFamily: c.mono, fontSize: 10, cursor: 'pointer', lineHeight: 1,
              transition: 'all 0.15s',
            }}
          >
            {isUnilateral ? '1×' : '2×'}
          </button>
          {/* Weight mode cycle: W → BW → BW+ */}
          <button
            onClick={() => onUpdateMeta({ weightMode: MODES[(MODES.indexOf(weightMode) + 1) % MODES.length] })}
            title="Tap to cycle: Weighted → Bodyweight → BW+"
            style={{
              padding: '3px 7px', borderRadius: 6,
              background: weightMode !== 'weighted' ? 'rgba(62,207,142,0.10)' : 'transparent',
              border: `1px solid ${weightMode !== 'weighted' ? 'rgba(62,207,142,0.30)' : c.border}`,
              color: weightMode !== 'weighted' ? c.green : c.faint,
              fontFamily: c.mono, fontSize: 10, cursor: 'pointer', lineHeight: 1,
              transition: 'all 0.15s',
            }}
          >
            {modeLabels[weightMode]}
          </button>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.faint, fontSize: 18, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
        </div>
      </div>

      {exercise.sets.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 2, paddingLeft: 26 }}>
          <span style={{ flex: 1, textAlign: 'center', fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reps</span>
          {weightMode !== 'bw' && (
            <>
              <span style={{ width: 14 }} />
              <span style={{ flex: 1, textAlign: 'center', fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {weightMode === 'bw+' ? '+ lbs' : isUnilateral ? 'lbs / side' : 'lbs'}
              </span>
            </>
          )}
          <span style={{ width: 30 }} />
        </div>
      )}

      {exercise.sets.map((set, si) => (
        <SetRow
          key={si} set={set} index={si} weightMode={weightMode}
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
  const kbOffset = useKeyboardOffset();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const q = search.trim().toLowerCase();
  const filtered = q ? EXERCISES.filter(e => e.toLowerCase().includes(q) && !existing.includes(e)) : null;
  const isCustom = q && !EXERCISES.some(e => e.toLowerCase() === q);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', left: 0, right: 0,
        bottom: kbOffset,
        maxHeight: `min(85dvh, calc(100dvh - ${kbOffset}px - 20px))`,
        background: c.surface,
        borderRadius: '16px 16px 0 0',
        border: `1px solid ${c.border}`,
        borderBottom: 'none',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', fontFamily: c.sans,
        zIndex: 101,
        transition: 'bottom 0.12s ease-out',
      }}>
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <div style={{ width: 32, height: 3, background: c.border, borderRadius: 2, margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, color: c.primary, fontSize: 15 }}>Add Exercise</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <input
            ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Search exercises…"
            style={{
              background: c.elevated,
              border: `1px solid ${focused ? c.accent : c.border}`,
              borderRadius: 10, padding: '11px 14px', color: c.primary,
              fontSize: 15, outline: 'none', marginBottom: 8,
              boxSizing: 'border-box', width: '100%', fontFamily: c.sans,
              transition: 'border-color 0.15s',
            }}
          />
          {isCustom && (
            <button onClick={() => onSelect(search.trim())} style={{
              width: '100%', padding: '11px 14px', background: c.elevated,
              border: `1px solid rgba(79,142,247,0.3)`, borderRadius: 10,
              color: c.accent, fontSize: 14, cursor: 'pointer', textAlign: 'left',
              marginBottom: 6, fontFamily: c.sans,
            }}>
              + Add &quot;{search.trim()}&quot; as custom
            </button>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          {filtered ? (
            filtered.length === 0 ? (
              <p style={{ fontFamily: c.mono, fontSize: 13, color: c.faint, padding: '20px 0', textAlign: 'center' }}>No matches</p>
            ) : filtered.map(ex => (
              <button key={ex} onClick={() => onSelect(ex)} style={{
                width: '100%', padding: '12px 14px', background: 'none', border: 'none',
                borderBottom: `1px solid ${c.border}`, color: c.primary,
                fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: c.sans,
              }}>{ex}</button>
            ))
          ) : (
            Object.entries(EXERCISE_CATEGORIES).map(([cat, exs]) => {
              const avail = exs.filter(e => !existing.includes(e));
              if (!avail.length) return null;
              return (
                <div key={cat}>
                  <p style={{ fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '14px 0 4px', paddingLeft: 2 }}>{cat}</p>
                  {avail.map(ex => (
                    <button key={ex} onClick={() => onSelect(ex)} style={{
                      width: '100%', padding: '12px 14px', background: 'none', border: 'none',
                      borderBottom: `1px solid ${c.border}`, color: c.primary,
                      fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: c.sans,
                    }}>{ex}</button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ── MuscleCard ─────────────────────────────────────────────────────────────────
function MuscleCard({ exercises, history }) {
  const isHistoryMode = !!history;
  const muscleData = isHistoryMode ? getHistoricalFatigueData(history) : getMuscleDatum(exercises);
  const colors = isHistoryMode ? GRADIENT_COLORS_PWA : MUSCLE_COLORS;
  const empty = muscleData.length === 0;
  const emptyData = [{ name: 'none', muscles: [], frequency: 1 }];
  return (
    <div style={{ background: c.surface, borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: c.mono, fontSize: 10, color: c.faint, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
          {isHistoryMode ? 'Recovery Heatmap' : 'Muscles Worked'}
        </span>
        {!empty && !isHistoryMode && (
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontFamily: c.mono, fontSize: 10, color: 'rgba(79,142,247,0.9)', letterSpacing: '0.05em' }}>● Primary</span>
            <span style={{ fontFamily: c.mono, fontSize: 10, color: 'rgba(79,142,247,0.45)', letterSpacing: '0.05em' }}>● Secondary</span>
          </div>
        )}
        {!empty && isHistoryMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
            <div style={{ height: 7, flex: 1, borderRadius: 4, background: 'linear-gradient(to right, #3ecf8e, #f0a429, #8b2030)' }} />
            <span style={{ fontFamily: c.mono, fontSize: 9, color: c.faint, whiteSpace: 'nowrap' }}>ready → rest</span>
          </div>
        )}
      </div>
      <div className="muscle-wrap" style={{ display: 'flex', gap: 4, opacity: empty ? 0.3 : 1, transition: 'opacity 0.3s' }}>
        <div style={{ flex: 1 }}>
          <BodyModel data={empty ? emptyData : muscleData} type="anterior" colors={colors} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <BodyModel data={empty ? emptyData : muscleData} type="posterior" colors={colors} style={{ width: '100%' }} />
        </div>
      </div>
      {empty && (
        <p style={{ margin: '6px 0 0', fontFamily: c.sans, fontSize: 12, color: c.faint, textAlign: 'center' }}>
          {isHistoryMode ? 'No workout history yet' : 'Add exercises to see muscle map'}
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
      if (!isPaused) setElapsed(Math.floor((Date.now() - startTimeRef.current - totalPausedMsRef.current) / 1000));
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
          color: isPaused ? c.muted : c.accent, transition: 'color 0.2s', flex: 1,
        }}>
          {fmtTime(elapsed)}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {vol > 0 && (
            <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>{fmtVol(vol)}</span>
          )}
          <button onClick={onTogglePause} style={{
            padding: '7px 12px', borderRadius: 8, border: `1px solid ${c.border}`,
            background: c.elevated, color: c.primary, fontFamily: c.sans,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {isPaused && (
        <div style={{
          background: 'rgba(240,164,41,0.08)', border: '1px solid rgba(240,164,41,0.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          fontFamily: c.mono, fontSize: 12, color: c.amber, letterSpacing: '0.03em',
        }}>
          Timer paused
        </div>
      )}

      <input
        value={workoutName} onChange={e => setWorkoutName(e.target.value)}
        onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)}
        placeholder="Workout name (e.g. Push Day)"
        style={{
          width: '100%', boxSizing: 'border-box', background: c.elevated,
          border: `1px solid ${nameFocused ? c.accent : c.border}`,
          borderRadius: 10, padding: '13px 14px',
          color: c.primary, fontSize: 15, outline: 'none',
          marginBottom: 14, fontFamily: c.sans, fontWeight: 500,
          transition: 'border-color 0.15s',
        }}
      />

      <MuscleCard exercises={exercises} />

      {exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.name + i}
          exercise={ex}
          onUpdateSets={sets => { const next = [...exercises]; next[i] = { ...ex, sets }; setExercises(next); }}
          onUpdateMeta={meta => { const next = [...exercises]; next[i] = { ...ex, ...meta }; setExercises(next); }}
          onRemove={() => setExercises(exercises.filter((_, idx) => idx !== i))}
        />
      ))}

      <button onClick={() => setShowPicker(true)} style={{
        width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.35)',
        borderRadius: 10, color: c.accent, fontFamily: c.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer',
        marginBottom: 8,
      }}>
        <PlusIcon size={15} /> Add Exercise
      </button>

      {showPicker && (
        <ExercisePicker
          existing={exercises.map(e => e.name)}
          onSelect={name => {
            setExercises([...exercises, {
              name,
              sets: [{ reps: 0, weightLbs: 0 }],
              weightMode: defaultWeightMode(name),
              isUnilateral: defaultUnilateral(name),
            }]);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

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
              background: c.green, border: 'none', borderRadius: 10,
              color: '#0a0a0f', fontFamily: c.sans, fontSize: 15, fontWeight: 700,
              cursor: uploadStatus === 'uploading' ? 'wait' : 'pointer',
              opacity: uploadStatus === 'uploading' ? 0.6 : 1,
            }}
          >
            {uploadStatus === 'uploading' ? 'Saving…' : uploadStatus === 'done' ? 'Saved' : 'Finish Workout'}
          </button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16,
          background: 'rgba(242,92,92,0.1)', border: '1px solid rgba(242,92,92,0.3)',
          borderRadius: 10, padding: '10px 14px',
          fontFamily: c.sans, fontSize: 13, color: c.red,
        }}>
          Upload failed — workout saved locally. Retry from History.
        </div>
      )}

      {showConfirm && (() => {
        const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.reps > 0).length, 0);
        const volVal = totalVol(exercises);
        const exList = exercises.filter(ex => ex.sets.some(s => s.reps > 0));
        return (
          <div
            onClick={() => setShowConfirm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              padding: '0 0 env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 480,
                background: c.elevated, border: `1px solid ${c.borderHover}`,
                borderRadius: '18px 18px 0 0',
                padding: '28px 20px calc(20px + env(safe-area-inset-bottom, 16px))',
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: c.faint, margin: '-12px auto 20px' }} />
              <div style={{ fontFamily: c.sans, fontSize: 18, fontWeight: 700, color: c.primary, marginBottom: 4 }}>
                {workoutName || 'Untitled Workout'}
              </div>
              <div style={{ fontFamily: c.mono, fontSize: 12, color: c.muted, letterSpacing: '0.04em', marginBottom: 20 }}>
                {fmtTime(elapsed)} · {exList.length} exercise{exList.length !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''}{fmtVol(volVal) ? ` · ${fmtVol(volVal)}` : ''}
              </div>

              {exList.length > 0 && (
                <div style={{ background: c.surface, borderRadius: 10, border: `1px solid ${c.border}`, marginBottom: 20, overflow: 'hidden' }}>
                  {exList.map((ex, i) => {
                    const doneSets = ex.sets.filter(s => s.reps > 0).length;
                    const maxW = ex.weightMode !== 'bw' && doneSets > 0
                      ? Math.max(...ex.sets.filter(s => s.reps > 0).map(s => getSetWeight(s)))
                      : 0;
                    return (
                      <div key={ex.name} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px',
                        borderBottom: i < exList.length - 1 ? `1px solid ${c.border}` : 'none',
                      }}>
                        <span style={{ fontFamily: c.sans, fontSize: 14, color: c.primary }}>{ex.name}</span>
                        <span style={{ fontFamily: c.mono, fontSize: 12, color: c.muted }}>
                          {doneSets} set{doneSets !== 1 ? 's' : ''}{maxW > 0 ? ` · ${maxW} lbs` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1, padding: '14px 0', background: c.surface,
                    border: `1px solid ${c.border}`, borderRadius: 10,
                    color: c.muted, fontFamily: c.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowConfirm(false); onFinish(); }}
                  style={{
                    flex: 2, padding: '14px 0', background: c.green,
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

// ── ExportCard ─────────────────────────────────────────────────────────────────
const EXPORT_MUSCLE_COLORS = [
  'rgba(79,142,247,0.25)', 'rgba(79,142,247,0.45)',
  'rgba(79,142,247,0.65)', 'rgba(79,142,247,0.90)',
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
    fmtVol(vol),
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
      <div style={{ flexShrink: 0 }}>
        <p style={{ fontFamily: MONO, fontSize: 13, color: '#4a4f5e', letterSpacing: '0.12em', margin: 0 }}>{dateLabel}</p>
        <h1 style={{ fontFamily: SANS, fontSize: 38, fontWeight: 700, color: '#e8eaf0', margin: '10px 0 0', lineHeight: 1.2 }}>{entry.name}</h1>
        <p style={{ fontFamily: MONO, fontSize: 15, color: '#9499a8', margin: '8px 0 0' }}>{statsStr}</p>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginTop: 24 }} />
      </div>
      <div className="ecmw" style={{ flexShrink: 0, height: 960, display: 'flex', gap: 24, paddingTop: 24, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, height: '100%' }}>
          <BodyModel data={muscleData.length ? muscleData : emptyData} type="anterior" colors={EXPORT_MUSCLE_COLORS} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ flex: 1, height: '100%' }}>
          <BodyModel data={muscleData.length ? muscleData : emptyData} type="posterior" colors={EXPORT_MUSCLE_COLORS} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 48, rowGap: 4 }}>
          {visEx.map((ex, i) => {
            const setCount = ex.sets.filter(s => s.reps > 0).length;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 66 }}>
                <span style={{ fontFamily: SANS, fontSize: 27, color: '#e8eaf0' }}>{ex.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 24, color: '#9499a8' }}>{setCount} set{setCount !== 1 ? 's' : ''}</span>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div style={{ height: 66, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 24, color: '#4a4f5e', fontStyle: 'italic' }}>+ {extraCount} more</span>
            </div>
          )}
        </div>
      </div>
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
  const [copyStates, setCopyStates] = useState({});
  const [exportEntry, setExportEntry] = useState(null);
  const exportDivRef = useRef(null);

  useEffect(() => {
    if (!exportEntry) return;
    const run = async () => {
      try {
        await document.fonts.ready;
        let attempts = 0;
        while (attempts < 12) {
          await new Promise(r => setTimeout(r, 100));
          const paths = exportDivRef.current?.querySelectorAll('.ecmw svg path');
          if (paths && paths.length > 0) break;
          attempts++;
        }
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
      <div ref={exportDivRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1, pointerEvents: 'none' }}>
        {exportEntry && <ExportCard entry={exportEntry} />}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, fontFamily: c.sans }}>
        <MuscleCard history={history} exercises={[]} />
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
              position: 'relative', background: c.surface, borderRadius: 12,
              marginBottom: 10, border: `1px solid ${c.border}`, overflow: 'hidden',
            }}>
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
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
                  {durationS > 0 && (
                    <>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>{fmtTime(durationS)}</span>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.faint, margin: '0 6px' }}>·</span>
                    </>
                  )}
                  <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>{exCount} exercise{exCount !== 1 ? 's' : ''}</span>
                  {vol > 0 && (
                    <>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.faint, margin: '0 6px' }}>·</span>
                      <span style={{ fontFamily: c.mono, fontSize: 11, color: c.muted }}>{fmtVol(vol)}</span>
                    </>
                  )}
                </div>
              </div>

              {isExp && (
                <div style={{ borderTop: `1px solid ${c.border}`, padding: '12px 16px' }}>
                  {(entry.exercises || []).map((ex, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <p style={{ fontFamily: c.sans, fontSize: 13, fontWeight: 600, color: c.muted, margin: '0 0 4px' }}>
                        {ex.name}
                        {ex.isUnilateral && <span style={{ fontFamily: c.mono, fontSize: 10, color: c.faint, marginLeft: 6 }}>· per side</span>}
                        {ex.weightMode && ex.weightMode !== 'weighted' && (
                          <span style={{ fontFamily: c.mono, fontSize: 10, color: c.green, marginLeft: 6 }}>· {ex.weightMode.toUpperCase()}</span>
                        )}
                      </p>
                      {ex.sets.map((s, si) => {
                        const w = getSetWeight(s);
                        return (
                          <p key={si} style={{ fontFamily: c.mono, fontSize: 12, color: c.faint, margin: '2px 0 2px 10px' }}>
                            {si + 1}. {s.reps} reps{ex.weightMode !== 'bw' && w > 0 ? ` × ${w} lbs${ex.weightMode === 'bw+' ? ' (BW+)' : ''}` : ex.weightMode === 'bw' ? ' bodyweight' : ''}
                          </p>
                        );
                      })}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {!entry.uploaded && (
                      <button onClick={() => retryUpload(entry)} disabled={retrying === entry.id} style={{
                        flex: 1, padding: '10px 0', background: c.elevated,
                        border: '1px solid rgba(79,142,247,0.3)', borderRadius: 8,
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
                      border: '1px solid rgba(242,92,92,0.2)', borderRadius: 8,
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
            fontFamily: c.sans, fontSize: 14, cursor: 'pointer',
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
    const durationS = Math.floor((Date.now() - startTimeRef.current - totalPausedMsRef.current) / 1000);

    // flat sets for backend — always in kg
    const flatSets = [];
    let setNum = 1;
    exercises.forEach(ex => {
      ex.sets.filter(s => s.reps > 0).forEach(s => {
        const lbs = getSetWeight(s);
        flatSets.push({
          exerciseName: ex.name,
          setNumber: setNum++,
          reps: s.reps,
          weightKg: +(lbs / 2.20462).toFixed(2),
        });
      });
    });

    const entry = { id: Date.now().toString(), name, performedAt, durationS, exercises, sets: flatSets, uploaded: false };
    const settings = loadLocal('gymSettings', {});

    if (settings.url && settings.secret) {
      setUploadStatus('uploading');
      try {
        const r = await fetch(`${settings.url}/api/gym/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.secret}` },
          body: JSON.stringify({ name, performedAt, durationS, sets: flatSets }),
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
