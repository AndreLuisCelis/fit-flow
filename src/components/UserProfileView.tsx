import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import {
  EXPERIENCE_LEVELS,
  PROFILE_GOALS,
  TRAINING_EQUIPMENT,
  ExperienceLevel,
  ProfileGoal,
  TrainingEquipment,
  UserProfile,
  UserProfileErrors,
} from '../types/profile';
import { validateUserProfile } from '../services/userProfile';

interface UserProfileViewProps {
  mode: 'onboarding' | 'edit';
  profile?: UserProfile;
  language: 'pt' | 'en';
  onSave: (profile: UserProfile) => Promise<void>;
  onCancel?: () => void;
}

interface ProfileFormValues {
  name: string;
  weightKg: string;
  heightCm: string;
  goals: ProfileGoal[];
  experience: ExperienceLevel | '';
  equipment: TrainingEquipment[];
}

const goalOptions: { value: ProfileGoal; label: string; description: string }[] = [
  { value: 'weight_loss', label: 'Emagrecimento', description: 'Priorizar consistência e gasto energético.' },
  { value: 'muscle_gain', label: 'Ganho de massa muscular', description: 'Foco em hipertrofia e sobrecarga progressiva.' },
  { value: 'fitness', label: 'Condicionamento físico', description: 'Desenvolver força e capacidade geral.' },
  { value: 'health', label: 'Saúde e manutenção', description: 'Manter uma rotina equilibrada e sustentável.' },
];

const experienceOptions: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Iniciante', description: 'Estou começando ou retomando os treinos.' },
  { value: 'intermediate', label: 'Intermediário', description: 'Treino com regularidade e conheço os movimentos.' },
  { value: 'advanced', label: 'Avançado', description: 'Tenho experiência consistente com treinamento.' },
];

const equipmentOptions: { value: TrainingEquipment; label: string }[] = [
  { value: 'bodyweight', label: 'Peso corporal, sem equipamentos' },
  { value: 'pull_up_bar', label: 'Barra fixa' },
  { value: 'barbell', label: 'Barra e anilhas' },
  { value: 'dumbbell', label: 'Halteres' },
  { value: 'cable', label: 'Cabos e polias' },
  { value: 'machine', label: 'Máquinas' },
  { value: 'bands', label: 'Elásticos de resistência' },
];

const goalLabels: Record<ProfileGoal, string> = {
  weight_loss: 'Emagrecimento',
  muscle_gain: 'Ganho de massa muscular',
  fitness: 'Condicionamento físico',
  health: 'Saúde e manutenção',
};

const experienceLabels: Record<ExperienceLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const equipmentLabels = Object.fromEntries(
  equipmentOptions.map(option => [option.value, option.label]),
) as Record<TrainingEquipment, string>;

function createFormValues(profile?: UserProfile): ProfileFormValues {
  return {
    name: profile?.name ?? '',
    weightKg: profile?.weightKg?.toString() ?? '',
    heightCm: profile?.heightCm?.toString() ?? '',
    goals: profile?.goals ?? [],
    experience: profile?.experience ?? '',
    equipment: profile?.equipment ?? [],
  };
}

function toProfileCandidate(values: ProfileFormValues) {
  return {
    name: values.name,
    weightKg: values.weightKg.trim() === '' ? undefined : Number(values.weightKg),
    heightCm: values.heightCm.trim() === '' ? undefined : Number(values.heightCm),
    goals: values.goals,
    experience: values.experience,
    equipment: values.equipment,
  };
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  mode,
  profile,
  language,
  onSave,
  onCancel,
}) => {
  const [values, setValues] = useState<ProfileFormValues>(() => createFormValues(profile));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<UserProfileErrors>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isEnglish = language === 'en';
  const steps = isEnglish ? ['About you', 'Your goal', 'Equipment', 'Review'] : ['Seus dados', 'Seu objetivo', 'Equipamentos', 'Revisão'];
  const title = mode === 'onboarding'
    ? (isEnglish ? 'Build your training profile' : 'Vamos configurar seu perfil')
    : (isEnglish ? 'Your training profile' : 'Seu perfil de treino');

  const setField = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setSaveError('');
  };

  const toggleEquipment = (equipment: TrainingEquipment) => {
    const selected = values.equipment.includes(equipment)
      ? values.equipment.filter(item => item !== equipment)
      : [...values.equipment, equipment];
    setField('equipment', selected);
  };

  const toggleGoal = (goal: ProfileGoal) => {
    const selected = values.goals.includes(goal)
      ? values.goals.filter(item => item !== goal)
      : [...values.goals, goal];
    setField('goals', selected);
  };

  const validateStep = () => {
    const result = validateUserProfile(toProfileCandidate(values));
    const fieldsByStep: (keyof UserProfileErrors)[][] = [
      ['name', 'weightKg', 'heightCm'],
      ['goals', 'experience'],
      ['equipment'],
      [],
    ];
    const fields = fieldsByStep[step];
    const stepErrors: UserProfileErrors = {};
    if (!result.valid) {
      fields.forEach(field => {
        if (result.errors[field]) stepErrors[field] = result.errors[field];
      });
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep(current => Math.min(current + 1, steps.length - 1));
  };

  const handleSave = async () => {
    const result = validateUserProfile(toProfileCandidate(values));
    if (!result.valid) {
      setErrors(result.errors);
      if (result.errors.name || result.errors.weightKg || result.errors.heightCm) setStep(0);
      else if (result.errors.goals || result.errors.experience) setStep(1);
      else setStep(2);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      await onSave(result.profile);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const fieldError = (field: keyof UserProfileErrors) => errors[field] && (
    <p id={`${field}-error`} className="mt-1 text-xs text-rose-300" role="alert">{errors[field]}</p>
  );

  return (
    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CCFF00] text-[#0A0F1D]">
          <UserRound className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[11px] font-mono-numbers font-bold uppercase tracking-wider text-[#38BDF8]">
            {mode === 'onboarding' ? (isEnglish ? 'FIRST ACCESS' : 'PRIMEIRO ACESSO') : (isEnglish ? 'PERSONAL SETTINGS' : 'DADOS PESSOAIS')}
          </p>
          <h1 className="text-2xl font-bold font-display text-white">{title}</h1>
        </div>
      </div>

      <ol className="mb-7 grid grid-cols-4 gap-2" aria-label={isEnglish ? 'Profile steps' : 'Etapas do perfil'}>
        {steps.map((stepLabel, index) => (
          <li key={stepLabel} className={`border-t-2 pt-2 text-[10px] sm:text-xs font-mono-numbers uppercase ${index <= step ? 'border-[#CCFF00] text-white' : 'border-slate-700 text-slate-500'}`}>
            <span className="mr-1">0{index + 1}</span><span className="hidden sm:inline">{stepLabel}</span>
          </li>
        ))}
      </ol>

      <div className="min-h-90 rounded-2xl border border-slate-800 bg-[#0F172A] p-4 sm:p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">{isEnglish ? 'About you' : 'Como podemos chamar você?'}</h2>
              <p className="mt-1 text-sm text-slate-400">{isEnglish ? 'Measurements are optional and stay on this device.' : 'As medidas são opcionais e ficam salvas somente neste dispositivo.'}</p>
            </div>
            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold text-slate-200">{isEnglish ? 'Name' : 'Nome'} <span className="text-rose-300">*</span></label>
              <input id="profile-name" autoComplete="name" value={values.name} onChange={event => setField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} className="w-full rounded-lg border border-slate-700 bg-[#0A0F1D] px-3 py-3 text-white outline-none focus:border-[#CCFF00]" maxLength={60} />
              {fieldError('name')}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-weight" className="mb-1.5 block text-sm font-semibold text-slate-200">{isEnglish ? 'Weight in kg (optional)' : 'Peso em kg (opcional)'}</label>
                <input id="profile-weight" type="number" min="25" max="350" step="0.1" inputMode="decimal" value={values.weightKg} onChange={event => setField('weightKg', event.target.value)} aria-invalid={Boolean(errors.weightKg)} aria-describedby={errors.weightKg ? 'weightKg-error' : undefined} className="w-full rounded-lg border border-slate-700 bg-[#0A0F1D] px-3 py-3 text-white outline-none focus:border-[#CCFF00]" placeholder="Ex.: 70" />
                {fieldError('weightKg')}
              </div>
              <div>
                <label htmlFor="profile-height" className="mb-1.5 block text-sm font-semibold text-slate-200">{isEnglish ? 'Height in cm (optional)' : 'Altura em cm (opcional)'}</label>
                <input id="profile-height" type="number" min="100" max="250" step="1" inputMode="numeric" value={values.heightCm} onChange={event => setField('heightCm', event.target.value)} aria-invalid={Boolean(errors.heightCm)} aria-describedby={errors.heightCm ? 'heightCm-error' : undefined} className="w-full rounded-lg border border-slate-700 bg-[#0A0F1D] px-3 py-3 text-white outline-none focus:border-[#CCFF00]" placeholder="Ex.: 170" />
                {fieldError('heightCm')}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">{isEnglish ? 'What are your training goals?' : 'Qual é o seu objetivo?'}</h2>
              <p className="mt-1 text-sm text-slate-400">{isEnglish ? 'Select one or more goals to personalize your routines.' : 'Escolha um ou mais objetivos para personalizar suas rotinas.'}</p>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-200">{isEnglish ? 'Training goals' : 'Objetivos'} <span className="text-rose-300">*</span></legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {goalOptions.map(option => (
                  <button key={option.value} type="button" aria-pressed={values.goals.includes(option.value)} onClick={() => toggleGoal(option.value)} className={`rounded-lg border p-3 text-left transition-colors ${values.goals.includes(option.value) ? 'border-[#CCFF00] bg-[#CCFF00]/10' : 'border-slate-700 bg-[#0A0F1D] hover:border-slate-500'}`}>
                    <span className="block text-sm font-semibold text-white">{isEnglish ? ({ weight_loss: 'Weight loss', muscle_gain: 'Muscle gain', fitness: 'Physical conditioning', health: 'Health and maintenance' } as const)[option.value] : option.label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{isEnglish ? '' : option.description}</span>
                  </button>
                ))}
              </div>
              {fieldError('goals')}
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-200">{isEnglish ? 'Experience' : 'Nível de experiência'} <span className="text-rose-300">*</span></legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {experienceOptions.map(option => (
                  <button key={option.value} type="button" aria-pressed={values.experience === option.value} onClick={() => setField('experience', option.value)} className={`rounded-lg border p-3 text-left transition-colors ${values.experience === option.value ? 'border-[#38BDF8] bg-[#38BDF8]/10' : 'border-slate-700 bg-[#0A0F1D] hover:border-slate-500'}`}>
                    <span className="block text-sm font-semibold text-white">{isEnglish ? ({ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const)[option.value] : option.label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{isEnglish ? '' : option.description}</span>
                  </button>
                ))}
              </div>
              {fieldError('experience')}
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-white">{isEnglish ? 'What equipment can you use?' : 'Quais equipamentos você tem disponíveis?'}</h2>
            <p className="mt-1 mb-5 text-sm text-slate-400">{isEnglish ? 'Select all that apply. Bodyweight training means no equipment is required.' : 'Selecione todas as opções disponíveis. Peso corporal significa que você não precisa de equipamentos.'}</p>
            <fieldset className="space-y-2">
              <legend className="sr-only">{isEnglish ? 'Available equipment' : 'Equipamentos disponíveis'}</legend>
              {equipmentOptions.map(option => (
                <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${values.equipment.includes(option.value) ? 'border-[#CCFF00] bg-[#CCFF00]/10' : 'border-slate-700 bg-[#0A0F1D] hover:border-slate-500'}`}>
                  <input type="checkbox" checked={values.equipment.includes(option.value)} onChange={() => toggleEquipment(option.value)} className="h-4 w-4 accent-[#CCFF00]" />
                  <span className="text-sm font-medium text-white">{isEnglish ? ({ bodyweight: 'Bodyweight, no equipment', pull_up_bar: 'Pull-up bar', barbell: 'Barbell and plates', dumbbell: 'Dumbbells', cable: 'Cables and pulleys', machine: 'Machines', bands: 'Resistance bands' } as const)[option.value] : option.label}</span>
                </label>
              ))}
            </fieldset>
            {fieldError('equipment')}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-white">{isEnglish ? 'Review your profile' : 'Revise suas informações'}</h2>
            <p className="mt-1 mb-5 text-sm text-slate-400">{isEnglish ? 'Go back to change any section before saving.' : 'Volte a qualquer etapa para alterar os dados antes de salvar.'}</p>
            <dl className="divide-y divide-slate-800">
              <ReviewRow label={isEnglish ? 'Name' : 'Nome'} value={values.name || '—'} onEdit={() => setStep(0)} />
              <ReviewRow label={isEnglish ? 'Weight' : 'Peso'} value={values.weightKg ? `${values.weightKg} kg` : (isEnglish ? 'Not provided' : 'Não informado')} onEdit={() => setStep(0)} />
              <ReviewRow label={isEnglish ? 'Height' : 'Altura'} value={values.heightCm ? `${values.heightCm} cm` : (isEnglish ? 'Not provided' : 'Não informado')} onEdit={() => setStep(0)} />
              <ReviewRow label={isEnglish ? 'Goals' : 'Objetivos'} value={values.goals.map(goal => isEnglish ? ({ weight_loss: 'Weight loss', muscle_gain: 'Muscle gain', fitness: 'Physical conditioning', health: 'Health and maintenance' } as const)[goal] : goalLabels[goal]).join(', ') || '—'} onEdit={() => setStep(1)} />
              <ReviewRow label={isEnglish ? 'Experience' : 'Experiência'} value={values.experience ? (isEnglish ? ({ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const)[values.experience] : experienceLabels[values.experience]) : '—'} onEdit={() => setStep(1)} />
              <ReviewRow label={isEnglish ? 'Equipment' : 'Equipamentos'} value={values.equipment.map(item => isEnglish ? ({ bodyweight: 'Bodyweight', pull_up_bar: 'Pull-up bar', barbell: 'Barbell', dumbbell: 'Dumbbells', cable: 'Cables', machine: 'Machines', bands: 'Resistance bands' } as const)[item] : equipmentLabels[item]).join(', ') || '—'} onEdit={() => setStep(2)} />
            </dl>
          </div>
        )}
      </div>

      {saveError && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200" role="alert">{saveError}</p>}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <div>
          {step > 0 ? (
            <button type="button" onClick={() => { setErrors({}); setStep(current => current - 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4" />{isEnglish ? 'Back' : 'Voltar'}
            </button>
          ) : mode === 'edit' && onCancel ? (
            <button type="button" onClick={onCancel} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800">{isEnglish ? 'Cancel' : 'Cancelar'}</button>
          ) : null}
        </div>
        {step < 3 ? (
          <button type="button" onClick={handleNext} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#CCFF00] px-5 text-sm font-bold text-[#0A0F1D] hover:brightness-110">
            {isEnglish ? 'Continue' : 'Continuar'}<ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#CCFF00] px-5 text-sm font-bold text-[#0A0F1D] hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            <Check className="h-4 w-4" />{isSaving ? (isEnglish ? 'Saving...' : 'Salvando...') : (isEnglish ? 'Save profile' : 'Salvar perfil')}
          </button>
        )}
      </div>
    </section>
  );
};

interface ReviewRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

const ReviewRow: React.FC<ReviewRowProps> = ({ label, value, onEdit }) => (
  <div className="flex items-start justify-between gap-3 py-3">
    <div className="min-w-0">
      <dt className="text-xs font-mono-numbers uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 wrap-break-word text-sm text-white">{value}</dd>
    </div>
    <button type="button" onClick={onEdit} className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-[#38BDF8] hover:bg-slate-800">Editar</button>
  </div>
);
