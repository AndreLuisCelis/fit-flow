// src/server/workoutService.ts
import { GoogleGenAI } from "@google/genai";

// src/data/presetRoutines.ts
var EXERCISE_GUIDE = {
  bench_press: {
    description: "Barbell Hold: Keep shoulder blades retracted, grip slightly wider than shoulder width, and press vertically while driving feet firmly into the floor.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha as esc\xE1pulas retra\xEDdas, segure a barra ligeiramente al\xE9m da largura dos ombros e empurre verticalmente, firmando os p\xE9s no ch\xE3o."
  },
  incline_db_press: {
    description: "Dumbbell Hold: Set the bench to 30\xB0, lower the weights with a deep stretch at the bottom and press while leading with your elbows up to the shoulder plane.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste o banco a 30\xB0, des\xE7a os halteres com alongamento profundo na base e empurre conduzindo os cotovelos alinhados ao plano dos ombros."
  },
  cable_fly: {
    description: "Cable Hold: Keep a slight bend in your elbows, bring the handles together at chest height and squeeze your pecs for 1 second at peak contraction.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha leve flex\xE3o nos cotovelos, aproxime os pegadores na altura do peitoral e aperte por 1 segundo na contra\xE7\xE3o m\xE1xima."
  },
  overhead_press: {
    description: "Barbell Hold: Lock your glutes and core, keep the bar close to your body and press vertically in a tight bar path without flaring the elbows outward.",
    descriptionPt: "Execu\xE7\xE3o: Contraia gl\xFAteos e abd\xF4men, mantenha a barra pr\xF3xima ao corpo e empurre verticalmente em trajet\xF3ria firme, sem abrir excessivamente os cotovelos."
  },
  lateral_raise: {
    description: "Dumbbell Hold: Keep a slight lean in your torso and lead with your elbows up to the shoulder plane, raising the weights only to shoulder height.",
    descriptionPt: "Execu\xE7\xE3o: Incline levemente o tronco \xE0 frente e eleve os halteres conduzindo pelos cotovelos at\xE9 a altura dos ombros."
  },
  tricep_pushdown: {
    description: "Rope Pushdown: Flare rope outward at full extension for lateral head peak and keep elbows pinned to torso.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha os cotovelos colados ao tronco e afaste as pontas da corda na extens\xE3o total para contrair a cabe\xE7a lateral do tr\xEDceps."
  },
  barbell_deadlift: {
    description: "Conventional Deadlift: Pull slack out of the bar, brace abdomen, and explode through hips keeping bar against shins.",
    descriptionPt: "Execu\xE7\xE3o: Retire a folga da barra, trave o abd\xF4men e suba empurrando o ch\xE3o com o quadril, mantendo a barra rente \xE0s canelas."
  },
  lat_pulldown: {
    description: "Lat Pulldown: Depress scapula first, pull bar down towards upper clavicle and squeeze lats.",
    descriptionPt: "Execu\xE7\xE3o: Deprima as esc\xE1pulas antes de puxar, traga a barra em dire\xE7\xE3o \xE0 parte superior do peito e aperte as dorsais."
  },
  barbell_row: {
    description: "Bent-Over Row: Torso locked at 45 degrees, pull bar towards lower ribcage while driving elbows back.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o tronco firme a 45 graus e puxe a barra em dire\xE7\xE3o \xE0s costelas inferiores direcionando os cotovelos para tr\xE1s."
  },
  barbell_curl: {
    description: "Barbell Curl: Keep elbows pinned to sides, curl bar in smooth arc with zero back momentum.",
    descriptionPt: "Execu\xE7\xE3o: Firme os cotovelos ao lado das costelas e suba a barra em arco cont\xEDnuo sem balan\xE7ar o tronco."
  },
  barbell_squat: {
    description: "Back Squat: Hit parallel depth or lower with knees tracking over toes, bracing core throughout.",
    descriptionPt: "Execu\xE7\xE3o: Agache at\xE9 as coxas ficarem paralelas ao ch\xE3o com joelhos alinhados aos p\xE9s, mantendo o abd\xF4men pressurizado."
  },
  romanian_deadlift: {
    description: "RDL: Push hips backward with soft knee bend, lowering bar along thighs until massive hamstring stretch.",
    descriptionPt: "Execu\xE7\xE3o: Empurre o quadril para tr\xE1s com joelhos semi-flexionados, descendo a barra rente \xE0s pernas at\xE9 sentir forte tens\xE3o nos posteriores."
  },
  leg_press: {
    description: "Leg Press: Full range of motion without letting lower back round or lift off the seat pad.",
    descriptionPt: "Execu\xE7\xE3o: Des\xE7a o carrinho com amplitude completa garantindo que a lombar permane\xE7a 100% apoiada no encosto."
  },
  standing_calf: {
    description: "Calf Raise: Pause 2 seconds at the bottom stretch and hold 1 second at full plantar flexion peak.",
    descriptionPt: "Execu\xE7\xE3o: Alongue completamente a panturrilha na base com pausa de 2 segundos e contraia no topo por 1 segundo."
  },
  hanging_leg_raise: {
    description: "Hanging Leg Raise: Curl pelvis upwards at the apex and avoid swinging body momentum.",
    descriptionPt: "Execu\xE7\xE3o: Eleve as pernas realizando retrovers\xE3o p\xE9lvica no ponto alto, controlando a descida sem balan\xE7ar."
  },
  push_up: {
    description: "Push-Up: Maintain rigid plank core, lower chest to floor with elbows at 45 degree angle.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o corpo em prancha alinhada e des\xE7a o peito pr\xF3ximo ao ch\xE3o com os cotovelos a 45 graus."
  },
  bodyweight_squat: {
    description: "Air Squat: Chest tall, push knees outward over toes, and sink below parallel.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o peito aberto, projete os joelhos para fora na linha dos p\xE9s e agache at\xE9 a paralela."
  },
  reverse_lunge: {
    description: "Reverse Lunge: Step back smoothly, keeping front knee stacked directly over ankle.",
    descriptionPt: "Execu\xE7\xE3o: D\xEA o passo para tr\xE1s de forma controlada, mantendo o joelho da frente alinhado sobre o tornozelo."
  },
  glute_bridge: {
    description: "Glute Bridge: Drive through heels, keep ribs down, and squeeze glutes hard at the top.",
    descriptionPt: "Execu\xE7\xE3o: Empurre o ch\xE3o com os calcanhares, contraia os gl\xFAteos no topo sem hiperestender a lombar."
  },
  prone_snow_angels: {
    description: "Prone Angels: Lie face down, keep chest lightly raised, and glide arms in a wide controlled arc.",
    descriptionPt: "Execu\xE7\xE3o: Deitado de bru\xE7os, eleve levemente o peito e mova os bra\xE7os em arco amplo e controlado ativando as costas."
  },
  band_row: {
    description: "Band Row: Anchor band securely, pull elbows back along ribs and squeeze shoulder blades.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico \xE0 frente e puxe os cotovelos em dire\xE7\xE3o \xE0s costelas unindo as esc\xE1pulas."
  },
  band_chest_press: {
    description: "Band Press: Anchor band behind torso, press forward in a straight line without arching back.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico atr\xE1s do corpo e empurre \xE0 frente em linha reta sem curvar a coluna."
  },
  band_squat: {
    description: "Band Squat: Step on band loop, maintain tension at top and keep knees tracking over toes.",
    descriptionPt: "Execu\xE7\xE3o: Pise sobre o el\xE1stico segurando as pontas nos ombros e agache mantendo a tens\xE3o firme durante todo o movimento."
  }
};
var EXERCISE_DATABASE = {
  bench_press: {
    id: "bench_press",
    name: "Barbell Bench Press",
    namePt: "Supino Reto com Barra",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 8,
    defaultWeight: 80,
    restSeconds: 90,
    notes: "Keep shoulder blades retracted and drive feet firmly through the floor.",
    notesPt: "Mantenha as esc\xE1pulas retra\xEDdas e firme os p\xE9s no ch\xE3o.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.bench_press
  },
  incline_db_press: {
    id: "incline_db_press",
    name: "Incline Dumbbell Press",
    namePt: "Supino Inclinado com Halteres",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 32,
    restSeconds: 75,
    notes: "30 degree bench angle, deep stretch at bottom position.",
    notesPt: "Deixe o banco a 30 graus e alongue bem o peitoral na parte baixa do movimento.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.incline_db_press
  },
  cable_fly: {
    id: "cable_fly",
    name: "Cable Chest Flyes",
    namePt: "Crucifixo no Crossover",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 17.5,
    restSeconds: 60,
    notes: "Squeeze pecs for 1s at peak contraction.",
    notesPt: "Contraia o peitoral por 1 segundo no ponto de maior contra\xE7\xE3o.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.cable_fly
  },
  overhead_press: {
    id: "overhead_press",
    name: "Standing Barbell OHP",
    namePt: "Desenvolvimento Militar com Barra",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps", "core"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 6,
    defaultWeight: 50,
    restSeconds: 90,
    notes: "Lock glutes and core, press vertically in tight bar path.",
    notesPt: "Contraia os gl\xFAteos e o abd\xF4men; empurre a barra para cima em uma trajet\xF3ria firme.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.overhead_press
  },
  lateral_raise: {
    id: "lateral_raise",
    name: "Dumbbell Lateral Raise",
    namePt: "Eleva\xE7\xE3o Lateral com Halteres",
    primaryMuscle: "shoulders",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 4,
    defaultReps: 15,
    defaultWeight: 12,
    restSeconds: 60,
    notes: "Slight torso lean, lead with elbows up to shoulder plane.",
    notesPt: "Incline levemente o tronco e conduza o movimento com os cotovelos at\xE9 a altura dos ombros.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.lateral_raise
  },
  tricep_pushdown: {
    id: "tricep_pushdown",
    name: "Triceps Rope Pushdown",
    namePt: "Tr\xEDceps Corda no Cross",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 25,
    restSeconds: 60,
    notes: "Flare rope outward at full extension for lateral head peak.",
    notesPt: "Afaste as pontas da corda ao estender os bra\xE7os para contrair a parte lateral do tr\xEDceps.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.tricep_pushdown
  },
  barbell_deadlift: {
    id: "barbell_deadlift",
    name: "Conventional Barbell Deadlift",
    namePt: "Levantamento Terra Convencional",
    primaryMuscle: "back",
    secondaryMuscles: ["hamstrings", "glutes", "core"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 5,
    defaultWeight: 140,
    restSeconds: 120,
    notes: "Pull slack out of bar, brace abdomen, explode through hips.",
    notesPt: "Retire a folga da barra, firme o abd\xF4men e estenda o quadril com for\xE7a.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.barbell_deadlift
  },
  lat_pulldown: {
    id: "lat_pulldown",
    name: "Lat Pulldown Wide Grip",
    namePt: "Puxada Aberta na Polia",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
    category: "cable",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 65,
    restSeconds: 75,
    notes: "Depress scapula first, pull bar to upper clavicle.",
    notesPt: "Abaixe as esc\xE1pulas primeiro e puxe a barra em dire\xE7\xE3o \xE0 parte superior do peito.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.lat_pulldown
  },
  barbell_row: {
    id: "barbell_row",
    name: "Bent-Over Barbell Row",
    namePt: "Remada Curvada com Barra",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "shoulders"],
    category: "barbell",
    defaultSets: 3,
    defaultReps: 8,
    defaultWeight: 75,
    restSeconds: 90,
    notes: "Torso locked at 45 degrees, pull to lower ribcage.",
    notesPt: "Mantenha o tronco est\xE1vel a 45 graus e puxe a barra em dire\xE7\xE3o \xE0s costelas inferiores.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.barbell_row
  },
  barbell_curl: {
    id: "barbell_curl",
    name: "EZ-Bar Bicep Curl",
    namePt: "Rosca Direta na Barra W",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "barbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 35,
    restSeconds: 60,
    notes: "Elbows pinned to sides, zero back momentum.",
    notesPt: "Mantenha os cotovelos junto ao tronco e evite impulsionar o movimento com as costas.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.barbell_curl
  },
  barbell_squat: {
    id: "barbell_squat",
    name: "Barbell Back Squat",
    namePt: "Agachamento Livre com Barra",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "calves", "core"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 6,
    defaultWeight: 110,
    restSeconds: 120,
    notes: "Hit parallel depth with knees tracking toes.",
    notesPt: "Des\xE7a at\xE9 as coxas ficarem paralelas ao ch\xE3o, mantendo os joelhos alinhados com os p\xE9s.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.barbell_squat
  },
  romanian_deadlift: {
    id: "romanian_deadlift",
    name: "Romanian Deadlift (RDL)",
    namePt: "Stiff / RDL com Barra",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    category: "barbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 90,
    restSeconds: 90,
    notes: "Hips push backward, soft knee bend, huge hamstring tension.",
    notesPt: "Leve o quadril para tr\xE1s, mantenha os joelhos levemente flexionados e alongue os posteriores da coxa.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.romanian_deadlift
  },
  leg_press: {
    id: "leg_press",
    name: "Leg Press 45\xB0",
    namePt: "Leg Press 45 Graus",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 220,
    restSeconds: 90,
    notes: "Full range without lower back lifting off pad.",
    notesPt: "Use toda a amplitude sem tirar a lombar do encosto.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.leg_press
  },
  standing_calf: {
    id: "standing_calf",
    name: "Standing Calf Raise",
    namePt: "G\xEAmeos em P\xE9 na M\xE1quina",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 4,
    defaultReps: 15,
    defaultWeight: 70,
    restSeconds: 60,
    notes: "Pause 2s at bottom stretch and 1s at peak contraction.",
    notesPt: "Pause por 2 segundos na parte baixa e por 1 segundo no ponto de contra\xE7\xE3o m\xE1xima.",
    tempo: "2-2-1-1",
    guide: EXERCISE_GUIDE.standing_calf
  },
  hanging_leg_raise: {
    id: "hanging_leg_raise",
    name: "Hanging Leg Raise",
    namePt: "Eleva\xE7\xE3o de Pernas Suspenso",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "bodyweight",
    equipmentRequired: ["pull_up_bar"],
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Posterior pelvic tilt at apex, avoid swinging.",
    notesPt: "Fa\xE7a uma retrovers\xE3o p\xE9lvica no ponto alto e evite balan\xE7ar o corpo.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.hanging_leg_raise
  },
  push_up: {
    id: "push_up",
    name: "Push-Up",
    namePt: "Flex\xE3o de Bra\xE7o",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep a straight line from head to heels and lower with control.",
    notesPt: "Mantenha o corpo alinhado da cabe\xE7a aos calcanhares e des\xE7a com controle.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.push_up
  },
  bodyweight_squat: {
    id: "bodyweight_squat",
    name: "Bodyweight Squat",
    namePt: "Agachamento Livre",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep the whole foot grounded and track knees over toes.",
    notesPt: "Mantenha o p\xE9 inteiro apoiado no ch\xE3o e alinhe os joelhos com os dedos dos p\xE9s.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.bodyweight_squat
  },
  reverse_lunge: {
    id: "reverse_lunge",
    name: "Reverse Lunge",
    namePt: "Avan\xE7o Reverso",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Step back with control and keep the front knee stable.",
    notesPt: "D\xEA um passo para tr\xE1s com controle e mantenha o joelho da frente est\xE1vel.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.reverse_lunge
  },
  glute_bridge: {
    id: "glute_bridge",
    name: "Glute Bridge",
    namePt: "Eleva\xE7\xE3o P\xE9lvica no Solo",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep ribs down and pause briefly at the top.",
    notesPt: "Mantenha as costelas abaixadas e fa\xE7a uma breve pausa no ponto alto.",
    tempo: "2-1-1-1",
    guide: EXERCISE_GUIDE.glute_bridge
  },
  prone_snow_angels: {
    id: "prone_snow_angels",
    name: "Prone Snow Angels",
    namePt: "Anjos na Neve em Prono",
    primaryMuscle: "back",
    secondaryMuscles: ["shoulders"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Keep the chest lightly raised and move arms slowly.",
    notesPt: "Eleve levemente o peito e mova os bra\xE7os devagar.",
    tempo: "2-0-2-0",
    guide: EXERCISE_GUIDE.prone_snow_angels
  },
  band_row: {
    id: "band_row",
    name: "Resistance Band Row",
    namePt: "Remada com El\xE1stico",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "shoulders"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Anchor the band securely and pull elbows toward the ribs.",
    notesPt: "Prenda o el\xE1stico com seguran\xE7a e puxe os cotovelos em dire\xE7\xE3o \xE0s costelas.",
    tempo: "2-1-1-1",
    guide: EXERCISE_GUIDE.band_row
  },
  band_chest_press: {
    id: "band_chest_press",
    name: "Resistance Band Chest Press",
    namePt: "Supino com El\xE1stico",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Secure the anchor behind you and press without arching the back.",
    notesPt: "Prenda o el\xE1stico atr\xE1s de voc\xEA e empurre sem arquear as costas.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.band_chest_press
  },
  band_squat: {
    id: "band_squat",
    name: "Resistance Band Squat",
    namePt: "Agachamento com El\xE1stico",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Maintain band tension and keep knees tracking over toes.",
    notesPt: "Mantenha o el\xE1stico tensionado e alinhe os joelhos com os dedos dos p\xE9s.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.band_squat
  }
};
var createSets = (count, weight, reps) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${Date.now()}-${i + 1}`,
    setNumber: i + 1,
    weight,
    reps,
    previousBest: {
      weight: Math.round(weight * 0.95),
      reps
    },
    rpe: i === count - 1 ? 9 : 8,
    isCompleted: false,
    isWarmup: i === 0 && count > 3
  }));
};
var PRESET_ROUTINES = [
  {
    id: "push_hypertrophy_alpha",
    title: "Push Alpha: Hypertrophy & Delts",
    titlePt: "Push Alfa: Hipertrofia & Delt\xF3ides",
    category: "Push",
    targetDurationMinutes: 55,
    difficulty: "Advanced",
    targetMuscles: ["chest", "shoulders", "triceps"],
    xpReward: 350,
    exercises: [
      {
        exerciseId: "bench_press",
        targetRestSeconds: 90,
        sets: createSets(4, 85, 8)
      },
      {
        exerciseId: "incline_db_press",
        targetRestSeconds: 75,
        sets: createSets(3, 34, 10)
      },
      {
        exerciseId: "overhead_press",
        targetRestSeconds: 90,
        sets: createSets(3, 52.5, 8)
      },
      {
        exerciseId: "lateral_raise",
        targetRestSeconds: 60,
        sets: createSets(4, 14, 12)
      },
      {
        exerciseId: "tricep_pushdown",
        targetRestSeconds: 60,
        sets: createSets(3, 27.5, 12)
      }
    ]
  },
  {
    id: "pull_posterior_titan",
    title: "Pull Titan: Lats & Posterior Chain",
    titlePt: "Pull Tit\xE3: Dorsais & Cadeia Posterior",
    category: "Pull",
    targetDurationMinutes: 60,
    difficulty: "Hardcore",
    targetMuscles: ["back", "biceps", "hamstrings"],
    xpReward: 420,
    exercises: [
      {
        exerciseId: "barbell_deadlift",
        targetRestSeconds: 120,
        sets: createSets(4, 150, 5)
      },
      {
        exerciseId: "lat_pulldown",
        targetRestSeconds: 75,
        sets: createSets(4, 70, 10)
      },
      {
        exerciseId: "barbell_row",
        targetRestSeconds: 90,
        sets: createSets(3, 80, 8)
      },
      {
        exerciseId: "barbell_curl",
        targetRestSeconds: 60,
        sets: createSets(3, 37.5, 10)
      }
    ]
  },
  {
    id: "leg_hyper_drive",
    title: "Leg Hyper-Drive: Quads & Glute Force",
    titlePt: "Leg Hiper-Drive: Quadr\xEDceps & Gl\xFAteos",
    category: "Legs",
    targetDurationMinutes: 50,
    difficulty: "Advanced",
    targetMuscles: ["quads", "hamstrings", "calves", "glutes"],
    xpReward: 400,
    exercises: [
      {
        exerciseId: "barbell_squat",
        targetRestSeconds: 120,
        sets: createSets(4, 115, 6)
      },
      {
        exerciseId: "romanian_deadlift",
        targetRestSeconds: 90,
        sets: createSets(3, 95, 10)
      },
      {
        exerciseId: "leg_press",
        targetRestSeconds: 90,
        sets: createSets(3, 240, 10)
      },
      {
        exerciseId: "standing_calf",
        targetRestSeconds: 60,
        sets: createSets(4, 80, 15)
      },
      {
        exerciseId: "hanging_leg_raise",
        targetRestSeconds: 60,
        sets: createSets(3, 0, 15)
      }
    ]
  },
  {
    id: "upper_athletic_speed",
    title: "Upper Velocity: Power & Volume",
    titlePt: "Superior Veloz: Pot\xEAncia & Volume",
    category: "Upper",
    targetDurationMinutes: 45,
    difficulty: "Intermediate",
    targetMuscles: ["chest", "back", "shoulders", "arms"],
    xpReward: 320,
    exercises: [
      {
        exerciseId: "bench_press",
        targetRestSeconds: 75,
        sets: createSets(3, 80, 10)
      },
      {
        exerciseId: "barbell_row",
        targetRestSeconds: 75,
        sets: createSets(3, 70, 10)
      },
      {
        exerciseId: "lateral_raise",
        targetRestSeconds: 60,
        sets: createSets(3, 12, 15)
      },
      {
        exerciseId: "cable_fly",
        targetRestSeconds: 60,
        sets: createSets(3, 15, 12)
      }
    ]
  }
];
var INITIAL_USER_STATS = {
  level: 14,
  currentXP: 6450,
  xpForNextLevel: 8e3,
  streakDays: 8,
  streakFrozenToday: false,
  lastWorkoutDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
  totalWorkoutsCompleted: 42,
  totalLifetimeVolumeKg: 78450,
  streakHistory: [true, true, true, false, true, true, true]
};

// src/types/profile.ts
var PROFILE_GOALS = ["weight_loss", "muscle_gain", "fitness", "health"];
var EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];
var TRAINING_EQUIPMENT = ["bodyweight", "pull_up_bar", "barbell", "dumbbell", "cable", "machine", "bands"];

// src/utils/workoutPersonalization.ts
var equipmentForCategory = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  cable: "cable",
  machine: "machine",
  bodyweight: "bodyweight",
  bands: "bands"
};
var difficultyRank = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
  Hardcore: 3
};
var goalPrompt = {
  weight_loss: "emagrecimento e condicionamento f\xEDsico",
  muscle_gain: "ganho de massa muscular e hipertrofia",
  fitness: "condicionamento f\xEDsico geral",
  health: "manuten\xE7\xE3o da sa\xFAde e do condicionamento"
};
function describeGoals(goals) {
  return goals.map((goal) => goalPrompt[goal]).join(", ");
}
var experiencePrompt = {
  beginner: "iniciante",
  intermediate: "intermedi\xE1rio",
  advanced: "avan\xE7ado"
};
var muscleGroups = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "calves",
  "core",
  "glutes"
];
var routineCategories = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Cardio & Core"];
var routineDifficulties = ["Beginner", "Intermediate", "Advanced", "Hardcore"];
var maximumTargetMuscles = 6;
var maximumExercises = 10;
var exerciseCategories = ["barbell", "dumbbell", "cable", "machine", "bodyweight", "bands"];
var requestFatigueLevels = ["fresh", "normal", "fatigued"];
var requestGoals = ["hypertrophy", "strength", "endurance", "deload"];
var allowedRoutineFields = ["title", "category", "targetDurationMinutes", "difficulty", "targetMuscles", "xpReward", "coachingNotes", "exercises"];
var allowedExerciseFields = ["name", "primaryMuscle", "category", "equipmentRequired", "defaultWeight", "defaultReps", "setsCount", "targetRestSeconds", "tempo", "notes", "notesPt"];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOnlyFields(value, allowedFields) {
  return Object.keys(value).every((field) => allowedFields.includes(field));
}
function isEquipmentList(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && TRAINING_EQUIPMENT.includes(item));
}
function validateWorkoutRequest(value) {
  if (!isRecord(value)) return null;
  const { focus, durationMinutes } = value;
  if (typeof focus !== "string" || focus.trim().length === 0 || focus.length > 100 || typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 240) return null;
  if (!isEquipmentList(value.equipment)) return null;
  const profileEquipment = value.profileEquipment === void 0 ? value.equipment : value.profileEquipment;
  if (!isEquipmentList(profileEquipment)) return null;
  const equipment = [...new Set(value.equipment)];
  const availableProfileEquipment = [...new Set(profileEquipment)];
  if (!equipment.every((item) => availableProfileEquipment.includes(item))) return null;
  let profileGoals = value.profileGoals;
  if (profileGoals === void 0 && value.profileGoal !== void 0) {
    profileGoals = Array.isArray(value.profileGoal) ? value.profileGoal : [value.profileGoal];
  }
  if (profileGoals === void 0) profileGoals = ["muscle_gain"];
  if (!Array.isArray(profileGoals) || profileGoals.length === 0 || !profileGoals.every((goal) => typeof goal === "string" && PROFILE_GOALS.includes(goal))) return null;
  const experienceLevel = value.experienceLevel === void 0 ? "intermediate" : value.experienceLevel;
  if (!EXPERIENCE_LEVELS.includes(experienceLevel)) return null;
  const language = value.language === void 0 ? "pt" : value.language;
  if (language !== "pt" && language !== "en") return null;
  const fatigueInput = value.fatigueLevel === void 0 ? "normal" : value.fatigueLevel;
  if (typeof fatigueInput !== "string") return null;
  const fatigueLevel = fatigueInput.toLowerCase();
  if (!requestFatigueLevels.includes(fatigueLevel)) return null;
  const targetGoal = value.targetGoal === void 0 ? "hypertrophy" : value.targetGoal;
  if (!requestGoals.includes(targetGoal)) return null;
  const frequentExercises = value.frequentExercises === void 0 ? [] : value.frequentExercises;
  if (!Array.isArray(frequentExercises) || frequentExercises.length > 8 || !frequentExercises.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 100)) return null;
  return {
    focus: focus.trim(),
    durationMinutes,
    language,
    equipment,
    profileEquipment: availableProfileEquipment,
    profileGoals: [...new Set(profileGoals)],
    experienceLevel,
    fatigueLevel,
    targetGoal,
    frequentExercises: frequentExercises.map((item) => item.trim())
  };
}
function validateGeneratedWorkout(value, availableEquipment) {
  if (!isRecord(value) || !hasOnlyFields(value, allowedRoutineFields) || !isEquipmentList(availableEquipment)) return null;
  const candidate = value;
  if (typeof candidate.title !== "string" || candidate.title.trim().length === 0 || candidate.title.length > 100 || !routineCategories.includes(candidate.category) || !routineDifficulties.includes(candidate.difficulty) || !Array.isArray(candidate.targetMuscles) || candidate.targetMuscles.length === 0 || candidate.targetMuscles.length > maximumTargetMuscles || !candidate.targetMuscles.every((muscle) => muscleGroups.includes(muscle)) || new Set(candidate.targetMuscles).size !== candidate.targetMuscles.length || !Array.isArray(candidate.exercises) || candidate.exercises.length === 0 || candidate.exercises.length > maximumExercises || candidate.coachingNotes !== void 0 && (typeof candidate.coachingNotes !== "string" || candidate.coachingNotes.length > 500)) return null;
  const exercises = [];
  for (const rawExercise of candidate.exercises) {
    if (!isRecord(rawExercise) || !hasOnlyFields(rawExercise, allowedExerciseFields)) return null;
    const exercise = rawExercise;
    const category = exercise.category;
    const primaryMuscle = exercise.primaryMuscle;
    const equipmentRequired = exercise.equipmentRequired === void 0 ? [] : exercise.equipmentRequired;
    const optionalTextFields = ["tempo", "notes", "notesPt"];
    if (!exerciseCategories.includes(category) || !Array.isArray(equipmentRequired) || !equipmentRequired.every((item) => typeof item === "string" && TRAINING_EQUIPMENT.includes(item)) || !isEquipmentAvailable(category, availableEquipment, equipmentRequired) || !muscleGroups.includes(primaryMuscle) || typeof exercise.name !== "string" || exercise.name.trim().length === 0 || exercise.name.length > 100 || typeof exercise.defaultWeight !== "number" || !Number.isFinite(exercise.defaultWeight) || exercise.defaultWeight < 0 || exercise.defaultWeight > 500 || typeof exercise.defaultReps !== "number" || !Number.isInteger(exercise.defaultReps) || exercise.defaultReps < 1 || exercise.defaultReps > 30 || typeof exercise.setsCount !== "number" || !Number.isInteger(exercise.setsCount) || exercise.setsCount < 1 || exercise.setsCount > 12 || typeof exercise.targetRestSeconds !== "number" || !Number.isInteger(exercise.targetRestSeconds) || exercise.targetRestSeconds < 0 || exercise.targetRestSeconds > 600) return null;
    if (optionalTextFields.some(
      (field) => exercise[field] !== void 0 && (typeof exercise[field] !== "string" || exercise[field].length > (field === "tempo" ? 30 : 300))
    )) return null;
    exercises.push({
      name: exercise.name.trim(),
      primaryMuscle,
      category,
      defaultWeight: exercise.defaultWeight,
      defaultReps: exercise.defaultReps,
      setsCount: exercise.setsCount,
      targetRestSeconds: exercise.targetRestSeconds,
      ...equipmentRequired.length ? { equipmentRequired } : {},
      ...typeof exercise.tempo === "string" ? { tempo: exercise.tempo } : {},
      ...typeof exercise.notes === "string" ? { notes: exercise.notes } : {},
      ...typeof exercise.notesPt === "string" ? { notesPt: exercise.notesPt } : {}
    });
  }
  const actualTargetMuscles = new Set(exercises.map((exercise) => exercise.primaryMuscle));
  const declaredTargetMuscles = new Set(candidate.targetMuscles);
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.setsCount, 0);
  if (typeof candidate.targetDurationMinutes !== "number" || !Number.isInteger(candidate.targetDurationMinutes) || candidate.targetDurationMinutes < 10 || candidate.targetDurationMinutes > 240 || typeof candidate.xpReward !== "number" || !Number.isInteger(candidate.xpReward) || candidate.xpReward < 0 || candidate.xpReward > 5e3 || totalSets > getWorkoutSetBudget(candidate.targetDurationMinutes) || actualTargetMuscles.size !== declaredTargetMuscles.size || [...actualTargetMuscles].some((muscle) => !declaredTargetMuscles.has(muscle))) return null;
  return {
    title: candidate.title.trim(),
    category: candidate.category,
    targetDurationMinutes: candidate.targetDurationMinutes,
    difficulty: candidate.difficulty,
    targetMuscles: candidate.targetMuscles,
    xpReward: candidate.xpReward,
    ...typeof candidate.coachingNotes === "string" ? { coachingNotes: candidate.coachingNotes } : {},
    exercises
  };
}
function getWorkoutSetBudget(durationMinutes) {
  return Math.floor(durationMinutes * 2 / 3);
}
function adaptGeneratedWorkout(routine, experience) {
  if (!EXPERIENCE_LEVELS.includes(experience)) {
    throw new Error("Invalid experience level");
  }
  const maximumDifficulty = experience === "beginner" ? "Beginner" : experience === "intermediate" ? "Intermediate" : "Hardcore";
  const maximumRank = difficultyRank[maximumDifficulty];
  const difficulty = difficultyRank[routine.difficulty] > maximumRank ? maximumDifficulty : routine.difficulty;
  const maximumSetsPerExercise = experience === "beginner" ? 3 : experience === "intermediate" ? 5 : 8;
  let remainingSets = getWorkoutSetBudget(routine.targetDurationMinutes);
  return {
    ...routine,
    difficulty,
    exercises: routine.exercises.map((exercise) => {
      const setsCount = Math.min(exercise.setsCount, maximumSetsPerExercise, remainingSets);
      remainingSets -= setsCount;
      return { ...exercise, setsCount };
    })
  };
}
function validateAndAdaptGeneratedWorkout(value, availableEquipment, experience) {
  const validated = validateGeneratedWorkout(value, availableEquipment);
  if (!validated) return null;
  const adapted = adaptGeneratedWorkout(validated, experience);
  return validateGeneratedWorkout(adapted, availableEquipment);
}
function isEquipmentAvailable(category, availableEquipment, equipmentRequired = []) {
  const additionalEquipmentAvailable = equipmentRequired.every((required) => availableEquipment.includes(required));
  const categoryEquipmentAvailable = availableEquipment.includes(equipmentForCategory[category]) || category === "bodyweight" && equipmentRequired.length > 0 && additionalEquipmentAvailable;
  return categoryEquipmentAvailable && additionalEquipmentAvailable;
}

// src/server/workoutService.ts
var initialApiKey = process.env.GEMINI_API_KEY || "";
var geminiClient = {
  current: initialApiKey ? new GoogleGenAI({ apiKey: initialApiKey }) : null
};
var GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) || 25e3;
var GEMINI_MAX_CONCURRENT = Number(process.env.GEMINI_MAX_CONCURRENT) || 4;
var GEMINI_RATE_LIMIT_MAX = Number(process.env.GEMINI_RATE_LIMIT_MAX) || 20;
var GEMINI_RATE_LIMIT_WINDOW_MS = Number(process.env.GEMINI_RATE_LIMIT_WINDOW_MS) || 6e4;
var geminiTimeoutMs = GEMINI_TIMEOUT_MS;
var geminiConcurrentRequests = 0;
var rateLimitMap = /* @__PURE__ */ new Map();
function getRateLimitKey(req) {
  const xRealIp = req.headers?.["x-real-ip"];
  if (typeof xRealIp === "string" && xRealIp.trim()) {
    return xRealIp.trim();
  }
  if (req.ip) {
    return req.ip;
  }
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  return req.socket?.remoteAddress || "unknown";
}
function rateLimiter(req, res, next) {
  const now = Date.now();
  const key = getRateLimitKey(req);
  const entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + GEMINI_RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }
  if (entry.count >= GEMINI_RATE_LIMIT_MAX) {
    res.status(429).json({ success: false, message: "Muitas requisi\xE7\xF5es. Tente novamente mais tarde." });
    return;
  }
  entry.count += 1;
  next();
}
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now >= entry.resetTime) rateLimitMap.delete(key);
    }
  }, GEMINI_RATE_LIMIT_WINDOW_MS);
  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}
async function handleGenerateWorkout(req, res) {
  const workoutRequest = validateWorkoutRequest(req.body);
  if (!workoutRequest) {
    return res.status(400).json({ success: false, message: "Par\xE2metros inv\xE1lidos para gerar a rotina." });
  }
  const {
    focus,
    durationMinutes,
    fatigueLevel,
    language,
    frequentExercises,
    targetGoal,
    equipment: allowedEquipment,
    profileGoals,
    experienceLevel
  } = workoutRequest;
  try {
    if (!geminiClient.current && process.env.GEMINI_API_KEY) {
      geminiClient.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    if (!geminiClient.current) {
      const routine = generateProfileFallback(focus, durationMinutes, language, allowedEquipment, experienceLevel, profileGoals);
      const validatedFallback = routine ? validateAndAdaptGeneratedWorkout(routine, allowedEquipment, experienceLevel) : null;
      if (!validatedFallback) {
        return res.status(422).json({ success: false, message: "N\xE3o h\xE1 exerc\xEDcios cadastrados para os equipamentos selecionados." });
      }
      return res.status(200).json({
        success: true,
        isFallback: true,
        message: "No API key provided, generated via local kinetic engine",
        routine: validatedFallback
      });
    }
    if (geminiConcurrentRequests >= GEMINI_MAX_CONCURRENT) {
      return res.status(503).json({
        success: false,
        message: "Servi\xE7o temporariamente sobrecarregado por excesso de requisi\xE7\xF5es simult\xE2neas. Tente novamente em instantes."
      });
    }
    geminiConcurrentRequests++;
    const abortController = new AbortController();
    let isTimeout = false;
    let timeoutId = null;
    try {
      const langName = language === "en" ? "English" : "Portuguese (Portugu\xEAs do Brasil)";
      const freqExercisesText = Array.isArray(frequentExercises) && frequentExercises.length > 0 ? frequentExercises.join(", ") : "No exercise history available";
      const prompt = `
You are the elite conditioning coach behind FitFlow PWA.
Create an athletic workout routine with progressive overload metrics in ${langName}.

User Parameters & Historical Telemetry:
- Muscle Focus: ${focus}
- Session Duration: ${durationMinutes} minutes
- Available Equipment: ${allowedEquipment.join(", ")}
- Main Goals: ${describeGoals(profileGoals)}
- Experience Level: ${experiencePrompt[experienceLevel]}
- Athlete Fatigue Level: ${fatigueLevel}
- Specific Training Goal: ${targetGoal}
- Athlete's Most Frequent Exercises from IndexedDB History: ${freqExercisesText}
- Request Variation Seed: ${Date.now()}-${Math.random().toString(36).slice(2)}

Coaching Directives:
1. Prioritize and intelligently incorporate the athlete's most frequent exercises (or progressive overload variations of them) that strictly match the available equipment.
2. Only select exercises that can be performed using the specified available equipment.
  For bodyweight movements that require apparatus (for example, hanging leg raises), declare that apparatus in equipmentRequired.
3. Include specific tempo (e.g. 3-0-1-0), realistic default starting weights in kg, target rep ranges, and rest intervals.
5. Use the request variation seed to ensure this routine is not identical to previous generations; vary exercise order, rep ranges, loads and rest periods while staying within equipment constraints.

Respond ONLY with valid JSON (no markdown formatting, no code block backticks) adhering strictly to this schema:
{
  "title": "string (Creative athletic title)",
  "category": "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body",
  "targetDurationMinutes": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Hardcore",
  "targetMuscles": ["chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "calves" | "core" | "glutes"],
  "xpReward": integer from 0 to 5000 (e.g. 380),
  "coachingNotes": "string (1-2 motivational tactical sentences tailored to their frequent exercises)",
  "exercises": [
    {
      "name": "string (Exercise name)",
      "primaryMuscle": "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "calves" | "core" | "glutes",
      "category": "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "bands",
      "equipmentRequired": ["pull_up_bar"] (optional; list additional required equipment),
      "defaultWeight": number (in kg, realistic default like 60, 80, 20),
      "defaultReps": number (e.g. 8, 10, 12),
      "setsCount": number (e.g. 3 or 4),
      "targetRestSeconds": number (e.g. 60, 75, 90),
      "tempo": "string (e.g. 3-0-1-0)",
      "notes": "string (form cue)"
    }
  ]
}
Constraints: targetDurationMinutes is an integer from 10 to 240. Include 1\u20136 unique target muscles, exactly matching the primaryMuscle values used by the exercises. Include 1\u201310 exercises. defaultWeight must be from 0 to 500 kg; defaultReps an integer from 1 to 30; setsCount an integer from 1 to 12; targetRestSeconds an integer from 0 to 600. Total sets must not exceed two thirds of targetDurationMinutes (rounded down). Use only declared fields; do not add fields.
`;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          isTimeout = true;
          try {
            abortController.abort();
          } catch {
          }
          reject(new Error("GEMINI_TIMEOUT"));
        }, geminiTimeoutMs);
      });
      const response = await Promise.race([
        geminiClient.current.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.9,
            topP: 0.95,
            abortSignal: abortController.signal
          }
        }),
        timeoutPromise
      ]);
      const text = response.text || "";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanJson);
      const personalizedRoutine = validateAndAdaptGeneratedWorkout(parsedData, allowedEquipment, experienceLevel);
      if (!personalizedRoutine) {
        throw new Error("Gemini returned an invalid or equipment-incompatible workout");
      }
      return res.status(200).json({
        success: true,
        routine: personalizedRoutine
      });
    } catch (error) {
      if (isTimeout || error instanceof Error && (error.name === "AbortError" || error.message === "GEMINI_TIMEOUT")) {
        return res.status(504).json({
          success: false,
          message: "Tempo limite esgotado ao gerar treino com o modelo de IA. Tente novamente."
        });
      }
      console.error("Error generating workout with Gemini:", error);
      const fallback = generateProfileFallback(
        focus,
        durationMinutes,
        language,
        allowedEquipment,
        experienceLevel,
        profileGoals
      );
      const validatedFallback = fallback ? validateAndAdaptGeneratedWorkout(fallback, allowedEquipment, experienceLevel) : null;
      if (!validatedFallback) {
        return res.status(422).json({ success: false, message: "N\xE3o h\xE1 exerc\xEDcios cadastrados para os equipamentos selecionados." });
      }
      return res.status(200).json({
        success: true,
        isFallback: true,
        routine: validatedFallback
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      geminiConcurrentRequests = Math.max(0, geminiConcurrentRequests - 1);
    }
  } catch (error) {
    console.error("Unexpected error in handleGenerateWorkout:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar a requisi\xE7\xE3o."
    });
  }
}
function generateProfileFallback(focus, duration, language, equipment, experience, goals) {
  const isPt = language !== "en";
  const fallback = generateFallbackRoutine(focus, duration, language);
  const focusText = focus.toLowerCase();
  const prefersFullBody = focusText.includes("full") || goals.some((goal) => goal === "weight_loss" || goal === "fitness" || goal === "health");
  const focusLower = focus.toLowerCase();
  const focusMuscleMap = {
    push: ["chest", "shoulders", "triceps"],
    pull: ["back", "biceps", "hamstrings"],
    legs: ["quads", "glutes", "hamstrings", "calves"],
    upper: ["chest", "back", "shoulders", "biceps", "triceps"],
    lower: ["quads", "glutes", "hamstrings", "calves"]
  };
  let targetFocusMuscles = [];
  Object.keys(focusMuscleMap).forEach((key) => {
    if (focusLower.includes(key)) targetFocusMuscles = focusMuscleMap[key];
  });
  if (targetFocusMuscles.length === 0) {
    targetFocusMuscles = ["chest", "back", "shoulders", "quads"];
  }
  let exercises = [];
  if (!prefersFullBody) {
    const compatible = Object.values(EXERCISE_DATABASE).filter((exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired) && targetFocusMuscles.includes(exercise.primaryMuscle)).sort((left, right) => left.id.localeCompare(right.id));
    const count = Math.min(compatible.length, 5);
    exercises = compatible.slice(0, count).map((exercise) => ({
      name: isPt ? exercise.namePt : exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      category: exercise.category,
      ...exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {},
      // Fallback sem avaliação individual: não prescreve carga. O usuário ajusta pela técnica e pelo esforço percebido (RPE).
      defaultWeight: 0,
      defaultReps: exercise.defaultReps,
      setsCount: experience === "beginner" ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || "",
      notes: exercise.notes || "",
      ...exercise.notesPt ? { notesPt: exercise.notesPt } : {}
    }));
  }
  if (exercises.length === 0) {
    exercises = [];
  }
  const needsExerciseCatalogFallback = exercises.length === 0;
  if (prefersFullBody || needsExerciseCatalogFallback) {
    const compatible = Object.values(EXERCISE_DATABASE).filter((exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired)).sort((left, right) => left.id.localeCompare(right.id)).slice(0, 5);
    exercises = compatible.map((exercise) => ({
      name: isPt ? exercise.namePt : exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      category: exercise.category,
      ...exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {},
      // Fallback sem avaliação individual: não prescreve carga. O usuário ajusta pela técnica e pelo esforço percebido (RPE).
      defaultWeight: 0,
      defaultReps: exercise.defaultReps,
      setsCount: experience === "beginner" ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || "",
      notes: exercise.notes || "",
      ...exercise.notesPt ? { notesPt: exercise.notesPt } : {}
    }));
  } else if (experience === "beginner") {
    exercises = exercises.map((exercise) => ({ ...exercise, setsCount: Math.min(3, exercise.setsCount) }));
  }
  if (exercises.length === 0) return null;
  let remainingSets = getWorkoutSetBudget(duration);
  exercises = exercises.flatMap((exercise) => {
    const setsCount = Math.min(exercise.setsCount, remainingSets);
    if (setsCount < 1) return [];
    remainingSets -= setsCount;
    return [{ ...exercise, setsCount }];
  });
  if (exercises.length === 0) return null;
  const targetMuscles = [...new Set(exercises.map((exercise) => exercise.primaryMuscle))];
  const candidate = {
    ...fallback,
    title: prefersFullBody || needsExerciseCatalogFallback ? isPt ? "FitFlow Corpo Todo Adaptado" : "FitFlow Adapted Full Body" : fallback.title,
    category: prefersFullBody || needsExerciseCatalogFallback ? "Full Body" : fallback.category,
    difficulty: experience === "beginner" ? "Beginner" : experience === "intermediate" ? "Intermediate" : "Advanced",
    targetDurationMinutes: duration,
    targetMuscles,
    exercises,
    coachingNotes: isPt ? `Rotina adaptada para seus objetivos de ${describeGoals(goals)} e n\xEDvel ${experiencePrompt[experience]}. Carga n\xE3o prescrita: comece sem peso ou com carga leve, ajuste pela execu\xE7\xE3o t\xE9cnica e pelo esfor\xE7o percebido (RPE). Reduza a carga ou interrompa o exerc\xEDcio se houver dor, tontura, falta de ar ou sintomas anormais.` : `Routine adapted for your goals (${describeGoals(goals)}) and ${experiencePrompt[experience]} experience level. No load prescribed: start with no weight or a light load, adjust by technique and perceived exertion (RPE). Reduce the load or stop the exercise if you feel pain, dizziness, shortness of breath, or abnormal symptoms.`
  };
  return validateGeneratedWorkout(candidate, equipment);
}
function generateFallbackRoutine(focus, duration, language) {
  const isPt = language !== "en";
  const focusStr = focus.toLowerCase();
  if (focusStr.includes("pull") || focusStr.includes("costas") || focusStr.includes("back")) {
    return {
      title: isPt ? "Pull Din\xE2mico: Dorsais & B\xEDceps" : "Dynamic Pull: Lats & Posterior Power",
      category: "Pull",
      targetDurationMinutes: duration,
      difficulty: "Advanced",
      targetMuscles: ["back", "biceps", "hamstrings"],
      xpReward: 380,
      coachingNotes: isPt ? "Foque em puxar com os cotovelos e sustentar 1s no pico de contra\xE7\xE3o." : "Drive with your elbows and pause for 1s at peak contraction.",
      exercises: [
        {
          name: isPt ? "Levantamento Terra Convencional" : "Conventional Deadlift",
          primaryMuscle: "back",
          category: "barbell",
          defaultWeight: 0,
          defaultReps: 5,
          setsCount: 4,
          targetRestSeconds: 90,
          tempo: "2-1-1-0",
          notes: isPt ? "Trave o abd\xF4men e exploda na subida." : "Brace core and explode through hips."
        },
        {
          name: isPt ? "Puxada Alta na Polia" : "Lat Pulldown",
          primaryMuscle: "back",
          category: "cable",
          defaultWeight: 0,
          defaultReps: 10,
          setsCount: 4,
          targetRestSeconds: 75,
          tempo: "2-0-1-1",
          notes: isPt ? "Puxe a barra at\xE9 a clav\xEDcula." : "Pull bar to clavicle."
        },
        {
          name: isPt ? "Remada Curvada com Barra" : "Bent-Over Barbell Row",
          primaryMuscle: "back",
          category: "barbell",
          defaultWeight: 0,
          defaultReps: 8,
          setsCount: 3,
          targetRestSeconds: 75,
          tempo: "2-0-1-0",
          notes: isPt ? "Tronco fixo em 45 graus." : "Lock torso at 45 degrees."
        },
        {
          name: isPt ? "Rosca Direta com Barra W" : "EZ-Bar Bicep Curl",
          primaryMuscle: "biceps",
          category: "barbell",
          defaultWeight: 0,
          defaultReps: 10,
          setsCount: 3,
          targetRestSeconds: 60,
          tempo: "2-0-1-1",
          notes: isPt ? "Cotovelos firmes ao lado do tronco." : "Keep elbows pinned to sides."
        }
      ]
    };
  }
  return {
    title: isPt ? "Push Alfa: Peitorais & Tr\xEDceps" : "Alpha Push: Chest & Deltoid Force",
    category: "Push",
    targetDurationMinutes: duration,
    difficulty: "Advanced",
    targetMuscles: ["chest", "shoulders", "triceps"],
    xpReward: 380,
    coachingNotes: isPt ? "Controle a fase exc\xEAntrica da descida para gerar o m\xE1ximo de est\xEDmulo hipertr\xF3fico." : "Control the eccentric descent to maximize mechanical hypertrophy tension.",
    exercises: [
      {
        name: isPt ? "Supino Reto com Barra" : "Barbell Bench Press",
        primaryMuscle: "chest",
        category: "barbell",
        defaultWeight: 0,
        defaultReps: 8,
        setsCount: 4,
        targetRestSeconds: 90,
        tempo: "3-0-1-0",
        notes: isPt ? "Esc\xE1pulas aduzidas e p\xE9s cravados no ch\xE3o." : "Retract scapula and drive feet into ground."
      },
      {
        name: isPt ? "Supino Inclinado com Halteres" : "Incline Dumbbell Press",
        primaryMuscle: "chest",
        category: "dumbbell",
        defaultWeight: 0,
        defaultReps: 10,
        setsCount: 3,
        targetRestSeconds: 75,
        tempo: "2-1-1-0",
        notes: isPt ? "Banco a 30 graus, alongamento completo na base." : "30-degree incline, deep stretch at bottom."
      },
      {
        name: isPt ? "Desenvolvimento com Halteres" : "Dumbbell Shoulder Press",
        primaryMuscle: "shoulders",
        category: "dumbbell",
        defaultWeight: 0,
        defaultReps: 10,
        setsCount: 3,
        targetRestSeconds: 75,
        tempo: "2-0-1-0",
        notes: isPt ? "Trave o core ao empurrar verticalmente." : "Lock core while pressing overhead."
      },
      {
        name: isPt ? "Tr\xEDceps Corda no Cross" : "Cable Triceps Pushdown",
        primaryMuscle: "triceps",
        category: "cable",
        defaultWeight: 0,
        defaultReps: 12,
        setsCount: 3,
        targetRestSeconds: 60,
        tempo: "2-0-1-1",
        notes: isPt ? "Abra a corda no final da extens\xE3o." : "Flare rope at full extension."
      }
    ]
  };
}

// src/server/apiHandler.ts
var config = {
  maxDuration: 30
};
function generateWorkoutHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method && req.method !== "POST") {
    const errorBody = JSON.stringify({
      success: false,
      message: "M\xE9todo n\xE3o permitido. Utilize POST."
    });
    if (typeof res.status === "function" && typeof res.json === "function") {
      res.status(405).json({
        success: false,
        message: "M\xE9todo n\xE3o permitido. Utilize POST."
      });
      return;
    }
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(errorBody);
    return;
  }
  const sendJson = (status, data) => {
    if (typeof res.status === "function" && typeof res.json === "function") {
      res.status(status).json(data);
      return;
    }
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };
  const executeHandler = () => {
    if (typeof res.status !== "function") {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
    }
    if (typeof res.json !== "function") {
      res.json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
        return res;
      };
    }
    rateLimiter(req, res, () => {
      void handleGenerateWorkout(req, res);
    });
  };
  if (req.body !== void 0 && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        sendJson(400, { success: false, message: "Corpo JSON inv\xE1lido." });
        return;
      }
    }
    executeHandler();
    return;
  }
  let bodyStr = "";
  let exceeded = false;
  req.on("data", (chunk) => {
    if (exceeded) return;
    bodyStr += chunk.toString();
    if (bodyStr.length > 10240) {
      exceeded = true;
      sendJson(413, { success: false, message: "Corpo da requisi\xE7\xE3o excede o limite permitido." });
    }
  });
  req.on("end", () => {
    if (exceeded) return;
    if (!bodyStr.trim()) {
      req.body = {};
      executeHandler();
      return;
    }
    try {
      req.body = JSON.parse(bodyStr);
      executeHandler();
    } catch {
      sendJson(400, { success: false, message: "Corpo JSON inv\xE1lido." });
    }
  });
  req.on("error", () => {
    if (!exceeded) {
      sendJson(400, { success: false, message: "Erro ao processar corpo da requisi\xE7\xE3o." });
    }
  });
}
export {
  config,
  generateWorkoutHandler as default
};
