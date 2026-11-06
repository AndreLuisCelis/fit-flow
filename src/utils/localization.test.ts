import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMuscleLabel,
  getCategoryLabel,
  getExerciseNotes,
  getTempoLabel,
} from './localization';

test('getMuscleLabel: traduz grupos musculares canônicos para português', () => {
  assert.equal(getMuscleLabel('chest', 'pt'), 'Peitoral');
  assert.equal(getMuscleLabel('back', 'pt'), 'Costas');
  assert.equal(getMuscleLabel('shoulders', 'pt'), 'Ombros');
  assert.equal(getMuscleLabel('biceps', 'pt'), 'Bíceps');
  assert.equal(getMuscleLabel('triceps', 'pt'), 'Tríceps');
  assert.equal(getMuscleLabel('quads', 'pt'), 'Quadríceps');
  assert.equal(getMuscleLabel('hamstrings', 'pt'), 'Posteriores da coxa');
  assert.equal(getMuscleLabel('calves', 'pt'), 'Panturrilhas');
  assert.equal(getMuscleLabel('core', 'pt'), 'Abdômen e core');
  assert.equal(getMuscleLabel('glutes', 'pt'), 'Glúteos');
  assert.equal(getMuscleLabel('arms', 'pt'), 'Braços');
});

test('getMuscleLabel: trata maiúsculas, espaços e sinônimos anatômicos', () => {
  assert.equal(getMuscleLabel('Chest', 'pt'), 'Peitoral');
  assert.equal(getMuscleLabel('SHOULDERS', 'pt'), 'Ombros');
  assert.equal(getMuscleLabel('lats', 'pt'), 'Dorsais');
  assert.equal(getMuscleLabel('traps', 'pt'), 'Trapézio');
  assert.equal(getMuscleLabel('abs', 'pt'), 'Abdômen');
  assert.equal(getMuscleLabel('forearms', 'pt'), 'Antebraços');
  assert.equal(getMuscleLabel('deltoids', 'pt'), 'Deltoides');
  assert.equal(getMuscleLabel('upper_back', 'pt'), 'Costas Superior');
  assert.equal(getMuscleLabel('lower_back', 'pt'), 'Lombar');
  assert.equal(getMuscleLabel('quadriceps', 'pt'), 'Quadríceps');
  assert.equal(getMuscleLabel('gluteus', 'pt'), 'Glúteos');
  assert.equal(getMuscleLabel('legs', 'pt'), 'Pernas');
});

test('getMuscleLabel: preserva string original quando idioma for en', () => {
  assert.equal(getMuscleLabel('chest', 'en'), 'chest');
  assert.equal(getMuscleLabel('shoulders', 'en'), 'shoulders');
});

test('getCategoryLabel: traduz categorias e equipamentos para português', () => {
  assert.equal(getCategoryLabel('barbell', 'pt'), 'Barra');
  assert.equal(getCategoryLabel('dumbbell', 'pt'), 'Halteres');
  assert.equal(getCategoryLabel('cable', 'pt'), 'Polia / Cabo');
  assert.equal(getCategoryLabel('machine', 'pt'), 'Máquina');
  assert.equal(getCategoryLabel('bodyweight', 'pt'), 'Peso Corporal');
  assert.equal(getCategoryLabel('bands', 'pt'), 'Elásticos');
  assert.equal(getCategoryLabel('barbell', 'en'), 'barbell');
});

test('getExerciseNotes: prioriza notesPt e traduz cues conhecidos em inglês como fallback', () => {
  const exWithPt = {
    notes: 'Keep shoulder blades retracted and drive feet firmly through the floor.',
    notesPt: 'Mantenha as escápulas retraídas e firme os pés no chão.',
  };
  assert.equal(getExerciseNotes(exWithPt, 'pt'), 'Mantenha as escápulas retraídas e firme os pés no chão.');

  const exWithoutPt = {
    notes: 'Keep shoulder blades retracted and drive feet firmly through the floor.',
  };
  assert.equal(getExerciseNotes(exWithoutPt, 'pt'), 'Mantenha as escápulas retraídas e firme os pés no chão.');

  assert.equal(getExerciseNotes(exWithPt, 'en'), 'Keep shoulder blades retracted and drive feet firmly through the floor.');
});

test('getTempoLabel: traduz descrições de cadência e preserva tempos numéricos', () => {
  assert.equal(getTempoLabel('3-0-1-0', 'pt'), '3-0-1-0');
  assert.equal(getTempoLabel('controlled', 'pt'), 'Controlado');
  assert.equal(getTempoLabel('explosive', 'pt'), 'Explosivo');
  assert.equal(getTempoLabel('controlled', 'en'), 'controlled');
});
