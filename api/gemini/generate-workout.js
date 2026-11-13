// src/server/workoutService.ts
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// src/data/exerciseGuides.ts
var EXERCISE_GUIDE = {
  // === CHEST (11) ===
  bench_press: {
    description: "Barbell Hold: Keep shoulder blades retracted, grip slightly wider than shoulder width, and press vertically while driving feet firmly into the floor.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha as esc\xE1pulas retra\xEDdas, segure a barra ligeiramente al\xE9m da largura dos ombros e empurre verticalmente, firmando os p\xE9s no ch\xE3o.",
    commonMistakes: "Flaring elbows to 90 degrees, bouncing the bar off the chest, or lifting glutes off the bench.",
    commonMistakesPt: "Abrir os cotovelos a 90 graus, quicar a barra no peito ou tirar o quadril do banco."
  },
  incline_db_press: {
    description: "Dumbbell Hold: Set the bench to 30\xB0, lower the weights with a deep stretch at the bottom and press while leading with your elbows up to the shoulder plane.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste o banco a 30\xB0, des\xE7a os halteres com alongamento profundo na base e empurre conduzindo os cotovelos alinhados ao plano dos ombros.",
    commonMistakes: "Setting bench angle too steep (>45\xB0) shifting load to anterior delts, or clanking dumbbells together at the top.",
    commonMistakesPt: "Inclinar o banco em excesso (>45\xB0) transferindo carga para os ombros, ou bater os halteres no topo."
  },
  cable_fly: {
    description: "Cable Hold: Keep a slight bend in your elbows, bring the handles together at chest height and squeeze your pecs for 1 second at peak contraction.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha leve flex\xE3o nos cotovelos, aproxime os pegadores na altura do peitoral e aperte por 1 segundo na contra\xE7\xE3o m\xE1xima.",
    commonMistakes: "Turning the fly into a press by bending elbows excessively, or swinging torso forward.",
    commonMistakesPt: "Transformar o crucifixo em supino flexionando demais os cotovelos, ou balan\xE7ar o tronco \xE0 frente."
  },
  push_up: {
    description: "Push-Up: Maintain rigid plank core, lower chest to floor with elbows at 45 degree angle.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o corpo em prancha alinhada e des\xE7a o peito pr\xF3ximo ao ch\xE3o com os cotovelos a 45 graus.",
    commonMistakes: "Letting hips sag toward the floor, flaring elbows wide, or cutting range of motion short.",
    commonMistakesPt: "Deixar o quadril cair, abrir excessivamente os cotovelos ou fazer repeti\xE7\xF5es curtas sem descer o peito."
  },
  band_chest_press: {
    description: "Band Press: Anchor band behind torso, press forward in a straight line without arching back.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico atr\xE1s do corpo e empurre \xE0 frente em linha reta sem curvar a coluna.",
    commonMistakes: "Losing core tension and arching lower back, or letting band snap back quickly during the eccentric.",
    commonMistakesPt: "Perder a firmeza do abd\xF4men arqueando a lombar, ou deixar o el\xE1stico voltar sem controle."
  },
  incline_barbell_press: {
    description: "Incline Barbell Press: Set bench at 30\u201335\xB0, retract shoulder blades, lower bar to upper chest below clavicles, and press smoothly upward.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste o banco entre 30\xB0 e 35\xB0, retraia as esc\xE1pulas, des\xE7a a barra at\xE9 a parte superior do peitoral e empurre de forma controlada.",
    commonMistakes: "Touching the bar too low on the sternum or losing upper-back tightness.",
    commonMistakesPt: "Descer a barra muito abaixo do peitoral superior ou perder a retra\xE7\xE3o escapular."
  },
  db_bench_press: {
    description: "Flat Dumbbell Press: Start with dumbbells stacked over shoulders, lower to chest level with elbows angled ~45\xB0, and press back up evenly.",
    descriptionPt: "Execu\xE7\xE3o: Comece com os halteres alinhados aos ombros, des\xE7a at\xE9 a linha do peitoral com cotovelos a ~45\xB0 e empurre simultaneamente.",
    commonMistakes: "Dropping dumbbells rapidly at the bottom or pressing unevenly between left and right arms.",
    commonMistakesPt: "Descer os halteres sem controle na base ou empurrar de forma assim\xE9trica entre os lados."
  },
  db_fly: {
    description: "Flat Dumbbell Fly: Maintain a soft fixed bend in elbows, open arms in a wide arc until a controlled chest stretch, then bring weights back over sternum.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha leve flex\xE3o fixa nos cotovelos, abra os bra\xE7os em arco at\xE9 alongar o peitoral e retorne os halteres acima do esterno.",
    commonMistakes: "Overstretching shoulders below bench line with heavy load or bending elbows into a press.",
    commonMistakesPt: "Descer os bra\xE7os al\xE9m da linha do ombro com carga alta ou dobrar os cotovelos transformando em supino."
  },
  chest_press_machine: {
    description: "Seated Chest Press Machine: Adjust seat height so handles align with mid-chest, brace shoulder blades against pad, and press to near lockout.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste o banco para que as manoplas fiquem na linha m\xE9dia do peitoral, apoie as esc\xE1pulas e empurre sem travar os cotovelos.",
    commonMistakes: "Protracting shoulders forward off the backrest at the end of the press.",
    commonMistakesPt: "Descolar os ombros e esc\xE1pulas do encosto ao final da extens\xE3o."
  },
  pec_deck_fly: {
    description: "Pec Deck Machine: Set seat so elbows remain slightly below shoulder height, bring pads or handles smoothly together, and control the eccentric.",
    descriptionPt: "Execu\xE7\xE3o: Regule o assento com os cotovelos levemente abaixo dos ombros, aproxime os bra\xE7os da m\xE1quina e controle a abertura.",
    commonMistakes: "Shrugging shoulders upward or slamming weight plates between repetitions.",
    commonMistakesPt: "Elevar os ombros em dire\xE7\xE3o \xE0s orelhas ou bater as placas de peso a cada repeti\xE7\xE3o."
  },
  decline_push_up: {
    description: "Decline Push-Up: Elevate feet on a stable bench, brace glutes and core, lower upper chest toward floor, and press back smoothly.",
    descriptionPt: "Execu\xE7\xE3o: Apoie os p\xE9s em um banco est\xE1vel, contraia abd\xF4men e gl\xFAteos, des\xE7a o peitoral superior em dire\xE7\xE3o ao ch\xE3o e empurre.",
    commonMistakes: "Dropping the head forward or letting the lower back hyperextend.",
    commonMistakesPt: "Projetar a cabe\xE7a para baixo antes do tronco ou deixar a lombar ceder."
  },
  // === BACK (12) ===
  barbell_deadlift: {
    description: "Conventional Deadlift: Pull slack out of the bar, brace abdomen, and explode through hips keeping bar against shins.",
    descriptionPt: "Execu\xE7\xE3o: Retire a folga da barra, trave o abd\xF4men e suba empurrando o ch\xE3o com o quadril, mantendo a barra rente \xE0s canelas.",
    commonMistakes: "Rounding the lumbar spine, jerking the bar off the floor, or letting the bar drift away from the legs.",
    commonMistakesPt: "Arredondar a lombar, dar tranco para tirar a barra do ch\xE3o ou afastar a barra das pernas."
  },
  lat_pulldown: {
    description: "Lat Pulldown: Depress scapula first, pull bar down towards upper clavicle and squeeze lats.",
    descriptionPt: "Execu\xE7\xE3o: Deprima as esc\xE1pulas antes de puxar, traga a barra em dire\xE7\xE3o \xE0 parte superior do peito e aperte as dorsais.",
    commonMistakes: "Leaning back excessively to turn it into a row, or pulling the bar behind the neck.",
    commonMistakesPt: "Inclinar demais o tronco para tr\xE1s usando impulso ou puxar a barra atr\xE1s da nuca."
  },
  barbell_row: {
    description: "Bent-Over Row: Torso locked at 45 degrees, pull bar towards lower ribcage while driving elbows back.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o tronco firme a 45 graus e puxe a barra em dire\xE7\xE3o \xE0s costelas inferiores direcionando os cotovelos para tr\xE1s.",
    commonMistakes: "Raising the torso upright on every rep or curling with biceps instead of retracting scapulae.",
    commonMistakesPt: "Levantar o tronco a cada repeti\xE7\xE3o para usar impulso ou puxar apenas com os bra\xE7os."
  },
  prone_snow_angels: {
    description: "Prone Angels: Lie face down, keep chest lightly raised, and glide arms in a wide controlled arc.",
    descriptionPt: "Execu\xE7\xE3o: Deitado de bru\xE7os, eleve levemente o peito e mova os bra\xE7os em arco amplo e controlado ativando as costas.",
    commonMistakes: "Hyperextending the neck by looking straight up or rushing the arc.",
    commonMistakesPt: "For\xE7ar a cervical olhando muito para cima ou acelerar o movimento sem controle escapular."
  },
  band_row: {
    description: "Band Row: Anchor band securely, pull elbows back along ribs and squeeze shoulder blades.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico \xE0 frente e puxe os cotovelos em dire\xE7\xE3o \xE0s costelas unindo as esc\xE1pulas.",
    commonMistakes: "Shrugging traps toward ears or leaning backward with momentum.",
    commonMistakesPt: "Encolher os ombros em dire\xE7\xE3o \xE0s orelhas ou jogar o tronco para tr\xE1s."
  },
  pull_up: {
    description: "Pull-Up: Grip bar wider than shoulder width palms facing away, depress shoulders, and pull chest toward bar until chin clears.",
    descriptionPt: "Execu\xE7\xE3o: Segure a barra em pegada pronada al\xE9m da largura dos ombros, encaixe as esc\xE1pulas e puxe at\xE9 o queixo passar da barra.",
    commonMistakes: "Kipping with legs, rounding shoulders forward at top, or doing half-reps without full arm extension.",
    commonMistakesPt: "Dar impulso com as pernas, projetar os ombros para frente no topo ou n\xE3o estender os bra\xE7os na descida."
  },
  chin_up: {
    description: "Chin-Up: Grip bar shoulder-width palms facing you, brace core, and pull elbows down toward ribs until chin clears bar.",
    descriptionPt: "Execu\xE7\xE3o: Segure a barra em pegada supinada na largura dos ombros, estabilize o core e puxe at\xE9 o queixo ultrapassar a barra.",
    commonMistakes: "Swinging legs forward or stopping short of full scapular stretch at the bottom.",
    commonMistakesPt: "Balan\xE7ar as pernas \xE0 frente ou interromper a descida antes de estender os bra\xE7os."
  },
  one_arm_db_row: {
    description: "Single-Arm Dumbbell Row: Brace opposite hand and knee on bench with flat back, pull dumbbell toward hip while keeping torso square.",
    descriptionPt: "Execu\xE7\xE3o: Apoie m\xE3o e joelho opostos no banco com a coluna neutra e puxe o halter em dire\xE7\xE3o ao quadril mantendo o tronco alinhado.",
    commonMistakes: "Rotating torso excessively to heave weight or pulling straight up to the chest instead of toward the hip.",
    commonMistakesPt: "Girar o tronco para roubar a subida ou puxar em linha reta para o ombro em vez do quadril."
  },
  seated_cable_row: {
    description: "Seated Cable Row: Sit tall with slight knee bend, pull handle to lower abdomen while squeezing shoulder blades together.",
    descriptionPt: "Execu\xE7\xE3o: Sente-se com a coluna ereta e joelhos semiflexionados, puxe o pegador at\xE9 o abd\xF4men inferior unindo as esc\xE1pulas.",
    commonMistakes: "Flexing lower back forward on extension or leaning too far back at lockout.",
    commonMistakesPt: "Curvar a lombar na volta ou inclinar demais o tronco para tr\xE1s no final da puxada."
  },
  straight_arm_pulldown: {
    description: "Straight-Arm Pulldown: Hinge slightly at hips with elbows softly locked, sweep bar or rope from overhead down to thighs using lats.",
    descriptionPt: "Execu\xE7\xE3o: Incline levemente o quadril com cotovelos quase estendidos e leve a barra da altura acima da cabe\xE7a at\xE9 as coxas contraindo o dorsal.",
    commonMistakes: "Bending elbows into a tricep pushdown or swinging upper body.",
    commonMistakesPt: "Flexionar os cotovelos transformando em tr\xEDceps ou balan\xE7ar o tronco."
  },
  chest_supported_row_machine: {
    description: "Machine Chest-Supported Row: Press chest firmly against pad, pull handles back driving elbows behind torso, pause briefly at squeeze.",
    descriptionPt: "Execu\xE7\xE3o: Apoie firmemente o peito no encosto da m\xE1quina, puxe as alavancas levando os cotovelos atr\xE1s da linha do tronco e controle o retorno.",
    commonMistakes: "Lifting chest off the pad to gain momentum or shrugging upper traps.",
    commonMistakesPt: "Descolar o peito do apoio para gerar impulso ou tensionar excessivamente o trap\xE9zio superior."
  },
  band_lat_pulldown: {
    description: "Band Lat Pulldown: Anchor band overhead, kneel or sit tall, and pull handles down to upper chest keeping elbows tucked slightly forward.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico acima da cabe\xE7a, ajoelhe-se ou sente com coluna firme e puxe at\xE9 a linha superior do peito.",
    commonMistakes: "Flaring elbows behind torso or allowing band to pull shoulders upward awkwardly.",
    commonMistakesPt: "Jogar os cotovelos muito para tr\xE1s ou perder o alinhamento dos ombros na volta."
  },
  // === SHOULDERS (10) ===
  overhead_press: {
    description: "Barbell Hold: Lock your glutes and core, keep the bar close to your body and press vertically in a tight bar path without flaring the elbows outward.",
    descriptionPt: "Execu\xE7\xE3o: Contraia gl\xFAteos e abd\xF4men, mantenha a barra pr\xF3xima ao corpo e empurre verticalmente em trajet\xF3ria firme, sem abrir excessivamente os cotovelos.",
    commonMistakes: "Hyperextending the lower back, pushing the bar forward away from face, or bending knees for momentum.",
    commonMistakesPt: "Hiperestender a lombar, empurrar a barra para frente longe do rosto ou dar impulso com os joelhos."
  },
  lateral_raise: {
    description: "Dumbbell Hold: Keep a slight lean in your torso and lead with your elbows up to the shoulder plane, raising the weights only to shoulder height.",
    descriptionPt: "Execu\xE7\xE3o: Incline levemente o tronco \xE0 frente e eleve os halteres conduzindo pelos cotovelos at\xE9 a altura dos ombros.",
    commonMistakes: "Swinging hips for momentum, lifting weights above shoulder height, or shrugging traps.",
    commonMistakesPt: "Balan\xE7ar o tronco para subir a carga, passar muito da linha dos ombros ou encolher o trap\xE9zio."
  },
  seated_db_shoulder_press: {
    description: "Seated Dumbbell Press: Keep back supported against upright bench, start dumbbells at ear level with elbows slightly forward, and press overhead.",
    descriptionPt: "Execu\xE7\xE3o: Apoie as costas no banco vertical, posicione os halteres na altura das orelhas com cotovelos levemente \xE0 frente e empurre acima da cabe\xE7a.",
    commonMistakes: "Flaring elbows completely flat to the sides or arching the lower back off the pad.",
    commonMistakesPt: "Abrir os cotovelos totalmente na linha lateral ou desencostar a lombar do banco."
  },
  front_db_raise: {
    description: "Dumbbell Front Raise: Stand tall with braced core, raise dumbbells smoothly in front of torso to shoulder height with soft elbows.",
    descriptionPt: "Execu\xE7\xE3o: Em p\xE9 com o core firme, eleve os halteres \xE0 frente do corpo at\xE9 a altura dos ombros mantendo leve flex\xE3o nos cotovelos.",
    commonMistakes: "Leaning backward to swing heavy dumbbells upward.",
    commonMistakesPt: "Jogar o tronco para tr\xE1s usando balan\xE7o para subir o peso."
  },
  rear_delt_db_fly: {
    description: "Bent-Over Rear Delt Fly: Hinge torso near parallel with neutral spine, raise dumbbells out to sides squeezing posterior delts.",
    descriptionPt: "Execu\xE7\xE3o: Incline o tronco \xE0 frente com coluna neutra e abra os bra\xE7os lateralmente contraindo a por\xE7\xE3o posterior dos ombros.",
    commonMistakes: "Rounding the back or pinching shoulder blades solely with traps instead of sweeping arms wide.",
    commonMistakesPt: "Arredondar a coluna ou puxar apenas com o trap\xE9zio sem afastar os bra\xE7os."
  },
  cable_lateral_raise: {
    description: "Single-Arm Cable Lateral Raise: Set pulley at wrist height, stand sideways, and sweep arm smoothly to shoulder height with constant cable tension.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste a polia na altura do punho, posicione-se lateralmente e eleve o bra\xE7o at\xE9 a altura do ombro sob tens\xE3o cont\xEDnua.",
    commonMistakes: "Using torso tilt to yank the cable off the bottom or shrugging the shoulder.",
    commonMistakesPt: "Inclinar o tronco para puxar o cabo no in\xEDcio ou elevar o ombro."
  },
  cable_face_pull: {
    description: "Cable Face Pull: Set rope at upper-chest or face height, pull ends toward temples while externally rotating shoulders and separating hands.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste a corda na altura do rosto, puxe em dire\xE7\xE3o \xE0s t\xEAmporas afastando as m\xE3os e fazendo rota\xE7\xE3o externa dos ombros.",
    commonMistakes: "Pulling elbows below hands instead of keeping wrists and elbows aligned, or leaning back excessively.",
    commonMistakesPt: "Deixar os cotovelos ca\xEDrem abaixo das m\xE3os ou inclinar demais o tronco para tr\xE1s."
  },
  shoulder_press_machine: {
    description: "Machine Shoulder Press: Adjust seat so handles start near chin/shoulder height, keep head and back against pad, and press vertically.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste o assento para as manoplas iniciarem na altura dos ombros, mantenha costas apoiadas e empurre verticalmente.",
    commonMistakes: "Locking elbows forcefully at the top or dropping weights onto the stack.",
    commonMistakesPt: "Travar os cotovelos com impacto no topo ou soltar o peso bruscamente."
  },
  pike_push_up: {
    description: "Pike Push-Up: Form an inverted V with hips high, lower top of head forward between hands, and press back up strongly through shoulders.",
    descriptionPt: "Execu\xE7\xE3o: Forme um V invertido elevando o quadril, des\xE7a o topo da cabe\xE7a \xE0 frente da linha das m\xE3os e empurre com os ombros.",
    commonMistakes: "Turning the movement into a regular push-up by dropping hips, or flaring elbows wide.",
    commonMistakesPt: "Abaixar o quadril transformando em flex\xE3o comum ou abrir demais os cotovelos."
  },
  band_pull_apart: {
    description: "Band Pull-Apart: Hold band at shoulder height with straight arms, pull band apart until it touches chest while squeezing rear delts.",
    descriptionPt: "Execu\xE7\xE3o: Segure o el\xE1stico \xE0 frente na altura dos ombros com bra\xE7os estendidos e abra at\xE9 encostar no peitoral ativando os posteriores de ombro.",
    commonMistakes: "Bending elbows during the pull or arching the lower back as arms open.",
    commonMistakesPt: "Dobrar os cotovelos durante a abertura ou hiperestender a lombar."
  },
  // === BICEPS (8) ===
  barbell_curl: {
    description: "Barbell Curl: Keep elbows pinned to sides, curl bar in smooth arc with zero back momentum.",
    descriptionPt: "Execu\xE7\xE3o: Firme os cotovelos ao lado das costelas e suba a barra em arco cont\xEDnuo sem balan\xE7ar o tronco.",
    commonMistakes: "Swinging the lower back to initiate the curl or letting elbows drift far forward.",
    commonMistakesPt: "Balan\xE7ar a lombar para iniciar a subida ou projetar os cotovelos excessivamente para frente."
  },
  db_bicep_curl: {
    description: "Alternating Dumbbell Curl: Keep elbows tucked at sides, curl one dumbbell while supinating wrist smoothly, lower fully before alternating.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha os cotovelos pr\xF3ximos \xE0s costelas, eleve um halter girando a palma para cima e controle toda a descida.",
    commonMistakes: "Dropping dumbbells quickly on the eccentric or rocking torso side to side.",
    commonMistakesPt: "Soltar o halter na descida sem controle ou balan\xE7ar o tronco lateralmente."
  },
  hammer_curl: {
    description: "Dumbbell Hammer Curl: Hold dumbbells with neutral palms facing torso, curl without twisting wrists, keeping upper arms still.",
    descriptionPt: "Execu\xE7\xE3o: Segure os halteres em pegada neutra (palmas voltadas para o corpo) e flexione os cotovelos sem girar os punhos.",
    commonMistakes: "Shrugging shoulders up or swinging elbows back and forth.",
    commonMistakesPt: "Elevar os ombros ou balan\xE7ar os cotovelos durante a execu\xE7\xE3o."
  },
  incline_db_curl: {
    description: "Incline Dumbbell Curl: Sit on 45\xB0 incline bench letting arms hang vertically behind torso, curl dumbbells without moving elbows forward.",
    descriptionPt: "Execu\xE7\xE3o: Sentado no banco a 45\xB0 com os bra\xE7os pendentes atr\xE1s da linha do tronco, flexione os cotovelos mantendo-os apontados para baixo.",
    commonMistakes: "Swinging elbows forward to shorten the lever arm or lifting shoulders off the bench.",
    commonMistakesPt: "Projetar os cotovelos para frente durante a subida ou desencostar os ombros do banco."
  },
  concentration_curl: {
    description: "Concentration Curl: Sit with back of upper arm braced against inner thigh, curl dumbbell slowly toward shoulder and squeeze at peak.",
    descriptionPt: "Execu\xE7\xE3o: Sentado, apoie a parte posterior do bra\xE7o na face interna da coxa e flexione o cotovelo de forma concentrada.",
    commonMistakes: "Using leg movement or torso lean to help lift the dumbbell.",
    commonMistakesPt: "Impulsionar com a perna ou inclinar o tronco para ajudar a subir o peso."
  },
  cable_bicep_curl: {
    description: "Cable Bicep Curl: Stand upright holding straight or EZ attachment from low pulley, curl smoothly keeping elbows stationary.",
    descriptionPt: "Execu\xE7\xE3o: Em p\xE9 com pegada na polia baixa, flexione os cotovelos mantendo os bra\xE7os est\xE1veis junto ao corpo sob tens\xE3o constante.",
    commonMistakes: "Stepping too close to the pulley or leaning back at the top.",
    commonMistakesPt: "Ficar pr\xF3ximo demais da polia perdendo tens\xE3o ou jogar o tronco para tr\xE1s."
  },
  preacher_curl_machine: {
    description: "Preacher Curl Machine: Align elbows with machine pivot axis and rest triceps flat on pad, curl handles smoothly without lifting elbows.",
    descriptionPt: "Execu\xE7\xE3o: Alinhe os cotovelos ao eixo da m\xE1quina com os tr\xEDceps bem apoiados no suporte e flexione sem levantar os bra\xE7os.",
    commonMistakes: "Hyperextending elbows violently at the bottom or lifting chest/armpits off pad.",
    commonMistakesPt: "Estender os cotovelos com tranco no final da descida ou tirar as axilas do apoio."
  },
  band_bicep_curl: {
    description: "Band Bicep Curl: Step firmly on band center, keep elbows pinned to sides, and curl handles upward controlling the return.",
    descriptionPt: "Execu\xE7\xE3o: Pise firme no centro do el\xE1stico, fixe os cotovelos junto ao tronco e flexione os bra\xE7os controlando a descida.",
    commonMistakes: "Unstable footing causing uneven tension or letting elbows flare outward.",
    commonMistakesPt: "Desequil\xEDbrio na pisada gerando tens\xE3o desigual ou abrir os cotovelos."
  },
  // === TRICEPS (8) ===
  tricep_pushdown: {
    description: "Rope Pushdown: Flare rope outward at full extension for lateral head peak and keep elbows pinned to torso.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha os cotovelos colados ao tronco e afaste as pontas da corda na extens\xE3o total para contrair a cabe\xE7a lateral do tr\xEDceps.",
    commonMistakes: "Letting elbows flare forward/backward or pressing body weight onto the cable.",
    commonMistakesPt: "Deixar os cotovelos avan\xE7arem para frente/tr\xE1s ou jogar o peso do corpo sobre a corda."
  },
  overhead_cable_tricep_ext: {
    description: "Overhead Cable Extension: Face away from pulley with rope overhead, keep elbows pointed forward and extend arms cleanly above head.",
    descriptionPt: "Execu\xE7\xE3o: De costas para a polia com a corda acima da cabe\xE7a, mantenha os cotovelos apontados para frente e estenda os antebra\xE7os.",
    commonMistakes: "Flaring elbows wide outward or arching the lumbar spine excessively.",
    commonMistakesPt: "Abrir excessivamente os cotovelos para os lados ou arquear a lombar."
  },
  skull_crusher: {
    description: "Lying Barbell Triceps Extension: Lie flat with upper arms slightly angled back, bend elbows to lower bar behind forehead, then extend.",
    descriptionPt: "Execu\xE7\xE3o: Deitado no banco com bra\xE7os levemente inclinados atr\xE1s, flexione os cotovelos levando a barra acima da testa e estenda.",
    commonMistakes: "Flaring elbows out to the sides or swinging upper arms forward/backward like a pullover.",
    commonMistakesPt: "Abrir os cotovelos para fora ou balan\xE7ar os ombros como um pullover."
  },
  close_grip_bench_press: {
    description: "Close-Grip Bench Press: Grip barbell roughly shoulder-width, keep elbows tucked close to ribs on descent, and press smoothly upward.",
    descriptionPt: "Execu\xE7\xE3o: Segure a barra na largura dos ombros, des\xE7a mantendo os cotovelos pr\xF3ximos \xE0s costelas e empurre com foco no tr\xEDceps.",
    commonMistakes: "Gripping hands too narrow (<15 cm) straining wrists, or flaring elbows wide.",
    commonMistakesPt: "Pegada fechada em excesso sobrecarregando os punhos ou abrir os cotovelos."
  },
  db_overhead_tricep_ext: {
    description: "Overhead Dumbbell Extension: Hold one dumbbell vertically overhead with both hands, lower slowly behind head, and extend without moving elbows wide.",
    descriptionPt: "Execu\xE7\xE3o: Segure um halter acima da cabe\xE7a com as duas m\xE3os, des\xE7a controladamente atr\xE1s da nuca e estenda os cotovelos.",
    commonMistakes: "Hyperextending lower back while seated/standing or flaring elbows wide.",
    commonMistakesPt: "Hiperestender a lombar durante a descida ou afastar os cotovelos lateralmente."
  },
  db_tricep_kickback: {
    description: "Dumbbell Triceps Kickback: Hinge torso forward with upper arm parallel to floor, extend forearm back to full contraction and lower with control.",
    descriptionPt: "Execu\xE7\xE3o: Incline o tronco \xE0 frente mantendo o bra\xE7o paralelo ao ch\xE3o e estenda o antebra\xE7o para tr\xE1s contraindo o tr\xEDceps.",
    commonMistakes: "Dropping the upper arm downward or swinging the dumbbell with momentum.",
    commonMistakesPt: "Abaixar o cotovelo durante a extens\xE3o ou usar impulso de balan\xE7o."
  },
  diamond_push_up: {
    description: "Diamond Push-Up: Place hands close under chest forming a triangle with thumbs and index fingers, keep core tight, and lower chest toward hands.",
    descriptionPt: "Execu\xE7\xE3o: Posicione as m\xE3os pr\xF3ximas sob o peitoral formando um diamante, mantenha o corpo firme e des\xE7a o peito em dire\xE7\xE3o \xE0s m\xE3os.",
    commonMistakes: "Letting hips sag or flaring elbows excessively outward straining shoulders.",
    commonMistakesPt: "Deixar o quadril cair ou abrir os cotovelos demais sobrecarregando os ombros."
  },
  band_tricep_pushdown: {
    description: "Band Triceps Pushdown: Anchor band overhead, pin elbows to sides, and extend arms downward to lockout with controlled return.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico acima da cabe\xE7a, firme os cotovelos junto ao corpo e estenda os bra\xE7os para baixo.",
    commonMistakes: "Moving shoulders forward or losing elbow anchor against the ribs.",
    commonMistakesPt: "Projetar os ombros para frente ou desencostar os cotovelos das costelas."
  },
  // === QUADS (10) ===
  barbell_squat: {
    description: "Back Squat: Hit parallel depth or lower with knees tracking over toes, bracing core throughout.",
    descriptionPt: "Execu\xE7\xE3o: Agache at\xE9 as coxas ficarem paralelas ao ch\xE3o com joelhos alinhados aos p\xE9s, mantendo o abd\xF4men pressurizado.",
    commonMistakes: "Knees caving inward (valgus), heels lifting off the floor, or rounding the lower back at depth.",
    commonMistakesPt: "Joelhos fechando para dentro (valgo), calcanhares saindo do ch\xE3o ou arredondamento da lombar na base."
  },
  leg_press: {
    description: "Leg Press: Full range of motion without letting lower back round or lift off the seat pad.",
    descriptionPt: "Execu\xE7\xE3o: Des\xE7a o carrinho com amplitude completa garantindo que a lombar permane\xE7a 100% apoiada no encosto.",
    commonMistakes: "Locking knees completely straight at the top or curling pelvis off the seat.",
    commonMistakesPt: "Travar os joelhos totalmente no topo ou tirar o quadril/lombar do assento na descida."
  },
  bodyweight_squat: {
    description: "Air Squat: Chest tall, push knees outward over toes, and sink below parallel.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o peito aberto, projete os joelhos para fora na linha dos p\xE9s e agache at\xE9 a paralela.",
    commonMistakes: "Letting knees collapse inward or leaning chest onto thighs.",
    commonMistakesPt: "Deixar os joelhos ca\xEDrem para dentro ou inclinar demais o tronco \xE0 frente."
  },
  reverse_lunge: {
    description: "Reverse Lunge: Step back smoothly, keeping front knee stacked directly over ankle.",
    descriptionPt: "Execu\xE7\xE3o: D\xEA o passo para tr\xE1s de forma controlada, mantendo o joelho da frente alinhado sobre o tornozelo.",
    commonMistakes: "Stepping on a tightrope causing balance loss, or slamming the rear knee onto the floor.",
    commonMistakesPt: "Alinhar os p\xE9s em linha reta perdendo o equil\xEDbrio ou bater o joelho de tr\xE1s no ch\xE3o."
  },
  band_squat: {
    description: "Band Squat: Step on band loop, maintain tension at top and keep knees tracking over toes.",
    descriptionPt: "Execu\xE7\xE3o: Pise sobre o el\xE1stico segurando as pontas nos ombros e agache mantendo a tens\xE3o firme durante todo o movimento.",
    commonMistakes: "Allowing the band tension to pull the upper spine into flexion.",
    commonMistakesPt: "Deixar a tra\xE7\xE3o do el\xE1stico curvar a coluna para frente."
  },
  front_barbell_squat: {
    description: "Front Squat: Rest barbell across front delts with elbows high, keep torso upright, and squat deep pushing through midfoot.",
    descriptionPt: "Execu\xE7\xE3o: Apoie a barra nos delt\xF3ides anteriores com cotovelos elevados, mantenha o tronco vertical e agache com controle.",
    commonMistakes: "Dropping elbows on descent causing the bar to roll forward, or heels lifting.",
    commonMistakesPt: "Abaixar os cotovelos na descida fazendo a barra escorregar para frente, ou tirar os calcanhares do ch\xE3o."
  },
  goblet_squat: {
    description: "Goblet Squat: Hold dumbbell vertically against upper chest, sit hips between heels keeping elbows inside knees, and drive up tall.",
    descriptionPt: "Execu\xE7\xE3o: Segure o halter na vertical junto ao peito, agache encaixando o quadril entre os p\xE9s com tronco erguido e suba firme.",
    commonMistakes: "Holding the weight away from the chest or rounding the upper back.",
    commonMistakesPt: "Afastar o halter do peito cansando os bra\xE7os ou curvar a coluna dorsal."
  },
  bulgarian_split_squat: {
    description: "Bulgarian Split Squat: Place rear instep on bench behind you, lower front thigh parallel to floor keeping front shin stable, and drive through front heel.",
    descriptionPt: "Execu\xE7\xE3o: Apoie o peito do p\xE9 traseiro no banco atr\xE1s, des\xE7a at\xE9 a coxa da frente ficar paralela ao solo e empurre pelo calcanhar dianteiro.",
    commonMistakes: "Standing too close to the bench pushing front knee awkwardly, or pushing mostly with the back leg.",
    commonMistakesPt: "Ficar pr\xF3ximo demais do banco ou fazer for\xE7a excessiva com a perna de tr\xE1s."
  },
  leg_extension: {
    description: "Leg Extension Machine: Align knee joint with machine pivot, keep hips glued to seat, extend legs smoothly and pause briefly at peak.",
    descriptionPt: "Execu\xE7\xE3o: Alinhe os joelhos ao eixo da m\xE1quina, mantenha o quadril firme no banco, estenda as pernas e controle a descida.",
    commonMistakes: "Swinging shins rapidly with momentum or lifting glutes off the seat.",
    commonMistakesPt: "Chutar a carga com impulso ou levantar o quadril do banco no topo."
  },
  hack_squat_machine: {
    description: "Hack Squat Machine: Press back and hips firmly against sled pad, place feet shoulder-width, lower under control and press without locking knees.",
    descriptionPt: "Execu\xE7\xE3o: Apoie costas e quadril totalmente no carrinho, posicione os p\xE9s na plataforma, des\xE7a com controle e empurre sem travar os joelhos.",
    commonMistakes: "Heels lifting off the footplate or hyperextending knees at lockout.",
    commonMistakesPt: "Descolar os calcanhares da plataforma ou travar os joelhos no topo."
  },
  // === HAMSTRINGS (7) ===
  romanian_deadlift: {
    description: "RDL: Push hips backward with soft knee bend, lowering bar along thighs until massive hamstring stretch.",
    descriptionPt: "Execu\xE7\xE3o: Empurre o quadril para tr\xE1s com joelhos semi-flexionados, descendo a barra rente \xE0s pernas at\xE9 sentir forte tens\xE3o nos posteriores.",
    commonMistakes: "Bending knees into a squat, rounding lower back, or letting the bar drift forward.",
    commonMistakesPt: "Flexionar demais os joelhos virando agachamento, arredondar a lombar ou afastar a barra das coxas."
  },
  db_romanian_deadlift: {
    description: "Dumbbell RDL: Keep dumbbells close to thighs, hinge hips back with flat spine until deep hamstring stretch, then drive hips forward.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha os halteres rente \xE0s coxas, projete o quadril para tr\xE1s com coluna neutra at\xE9 alongar os posteriores e retorne estendendo o quadril.",
    commonMistakes: "Rounding shoulders forward or descending below hamstring flexibility causing lumbar flexion.",
    commonMistakesPt: "Curvar os ombros \xE0 frente ou descer al\xE9m da flexibilidade dobrando a lombar."
  },
  seated_leg_curl: {
    description: "Seated Leg Curl: Lock lap pad snugly over thighs, align knees with pivot, curl heels smoothly underneath seat and control return.",
    descriptionPt: "Execu\xE7\xE3o: Trave o apoio firme sobre as coxas, alinhe os joelhos ao eixo da m\xE1quina e flexione levando os calcanhares sob o banco.",
    commonMistakes: "Lifting hips forward or letting the weight stack crash between reps.",
    commonMistakesPt: "Desencostar o quadril do encosto ou soltar o peso rapidamente na volta."
  },
  lying_leg_curl: {
    description: "Lying Leg Curl: Keep hips pressed flat into bench throughout, curl pad smoothly toward glutes, and lower slowly.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha o quadril pressionado contra o banco durante toda a execu\xE7\xE3o, flexione os joelhos em dire\xE7\xE3o aos gl\xFAteos e controle a descida.",
    commonMistakes: "Lifting hips upward off the bench to compensate for heavy load.",
    commonMistakesPt: "Elevar o quadril do banco para ajudar na flex\xE3o com carga excessiva."
  },
  good_morning: {
    description: "Barbell Good Morning: Rest bar across upper back, brace core hard, hinge hips backward with soft knees until torso nears 45\xB0, and return.",
    descriptionPt: "Execu\xE7\xE3o: Apoie a barra nos trap\xE9zios, trave o abd\xF4men, projete o quadril para tr\xE1s mantendo joelhos semiflexionados e retorne estendendo o quadril.",
    commonMistakes: "Using excessive weight that causes spinal rounding or turning it into a knee-dominant squat.",
    commonMistakesPt: "Exagerar na carga curvando a coluna ou dobrar demais os joelhos."
  },
  single_leg_rdl_bw: {
    description: "Single-Leg Bodyweight RDL: Balance on one softly bent leg, hinge hips backward extending opposite leg behind in a straight line with torso.",
    descriptionPt: "Execu\xE7\xE3o: Equilibre-se em uma perna com joelho levemente flexionado e projete o quadril para tr\xE1s estendendo a perna livre alinhada ao tronco.",
    commonMistakes: "Opening hips sideways instead of keeping pelvis square to the floor.",
    commonMistakesPt: "Girar o quadril para o lado em vez de manter a pelve alinhada ao ch\xE3o."
  },
  band_leg_curl: {
    description: "Band Leg Curl: Anchor band low, lie face down with band looped around ankles, keep hips flat, and curl heels toward glutes.",
    descriptionPt: "Execu\xE7\xE3o: Prenda o el\xE1stico em ponto baixo, deite de bru\xE7os com o el\xE1stico nos tornozelos e flexione as pernas trazendo os calcanhares ao gl\xFAteo.",
    commonMistakes: "Arching the lower back or rushing the eccentric phase.",
    commonMistakesPt: "Hiperestender a lombar ou deixar o el\xE1stico puxar as pernas sem controle."
  },
  // === GLUTES (7) ===
  glute_bridge: {
    description: "Glute Bridge: Drive through heels, keep ribs down, and squeeze glutes hard at the top.",
    descriptionPt: "Execu\xE7\xE3o: Empurre o ch\xE3o com os calcanhares, contraia os gl\xFAteos no topo sem hiperestender a lombar.",
    commonMistakes: "Pushing through toes or flaring ribs and arching the lower back at lockout.",
    commonMistakesPt: "Empurrar com a ponta dos p\xE9s ou arquear excessivamente a lombar no ponto alto."
  },
  barbell_hip_thrust: {
    description: "Barbell Hip Thrust: Rest upper back against bench edge, place padded bar across hip crease, drive through heels until shins are vertical at top.",
    descriptionPt: "Execu\xE7\xE3o: Apoie a regi\xE3o inferior das esc\xE1pulas no banco, barra protegida na dobra do quadril e empurre pelos calcanhares at\xE9 o tronco alinhar paralelo ao ch\xE3o.",
    commonMistakes: "Hyperextending lower back at top instead of posterior pelvic tilt, or placing feet too close/far.",
    commonMistakesPt: "Arquear a lombar no topo ou posicionar os p\xE9s muito perto ou longe do tronco."
  },
  db_sumo_squat: {
    description: "Dumbbell Sumo Squat: Take a wide stance with toes angled out ~35\xB0, hold dumbbell vertically between legs, push knees outward and sit upright.",
    descriptionPt: "Execu\xE7\xE3o: Afaste bem os p\xE9s apontando pontas para fora (~35\xB0), segure o halter ao centro e agache mantendo os joelhos alinhados aos p\xE9s.",
    commonMistakes: "Allowing knees to cave inward or leaning torso excessively forward.",
    commonMistakesPt: "Deixar os joelhos fecharem para dentro ou inclinar demais o tronco \xE0 frente."
  },
  cable_glute_kickback: {
    description: "Cable Glute Kickback: Attach ankle strap to low pulley, keep torso lightly braced on frame, and kick leg backward squeezing glute without arching spine.",
    descriptionPt: "Execu\xE7\xE3o: Prenda a tornozeleira na polia baixa, estabilize o tronco e estenda a perna para tr\xE1s contraindo o gl\xFAteo sem mexer a lombar.",
    commonMistakes: "Hyperextending the lower back at the end of every kick to gain extra range.",
    commonMistakesPt: "Arquear a lombar a cada chute para aumentar artificialmente a amplitude."
  },
  hip_abduction_machine: {
    description: "Seated Hip Abduction Machine: Sit upright with back supported, drive knees outward against pads smoothly, pause 1 second at peak, control return.",
    descriptionPt: "Execu\xE7\xE3o: Sente-se com a coluna apoiada, afaste os joelhos contra os apoios de forma controlada, sustente 1 segundo aberto e retorne devagar.",
    commonMistakes: "Slamming weights together on return or bouncing torso forward/backward.",
    commonMistakesPt: "Bater os pesos no retorno ou balan\xE7ar o tronco para gerar impulso."
  },
  single_leg_glute_bridge: {
    description: "Single-Leg Glute Bridge: Keep one leg bent with foot planted and opposite knee tucked or extended, drive hips up evenly without twisting pelvis.",
    descriptionPt: "Execu\xE7\xE3o: Com um p\xE9 firme no ch\xE3o e a outra perna elevada, empurre o quadril para cima mantendo a pelve nivelada sem girar.",
    commonMistakes: "Letting the unsupported side of the pelvis drop downward.",
    commonMistakesPt: "Deixar um lado do quadril cair durante a subida."
  },
  band_hip_thrust: {
    description: "Band Glute Bridge: Place resistance band across hips anchored under hands or feet, keep knees pressing gently outward, and bridge smoothly.",
    descriptionPt: "Execu\xE7\xE3o: Posicione o el\xE1stico sobre o quadril preso pelas m\xE3os ou p\xE9s e execute a eleva\xE7\xE3o p\xE9lvica contraindo forte os gl\xFAteos no topo.",
    commonMistakes: "Letting knees collapse inward or arching lumbar spine.",
    commonMistakesPt: "Deixar os joelhos fecharem ou for\xE7ar a lombar no topo."
  },
  cable_pull_through: {
    description: "Cable Pull-Through: Stand facing away from low pulley with rope between legs, hinge hips backward letting hands glide back, then snap hips forward with glutes.",
    descriptionPt: "Execu\xE7\xE3o: De costas para a polia baixa com a corda entre as pernas, empurre o quadril para tr\xE1s mantendo a coluna neutra e estenda contraindo os gl\xFAteos.",
    commonMistakes: "Pulling the rope upward with arms/shoulders instead of driving solely with hip extension.",
    commonMistakesPt: "Puxar a corda com os bra\xE7os em vez de estender o quadril."
  },
  // === CALVES (5) ===
  standing_calf: {
    description: "Calf Raise: Pause 2 seconds at the bottom stretch and hold 1 second at full plantar flexion peak.",
    descriptionPt: "Execu\xE7\xE3o: Alongue completamente a panturrilha na base com pausa de 2 segundos e contraia no topo por 1 segundo.",
    commonMistakes: "Bouncing rapidly off the bottom tendon stretch without pauses or bending knees.",
    commonMistakesPt: "Usar efeito mola quicando na base sem pausa ou dobrar os joelhos."
  },
  seated_calf_raise: {
    description: "Seated Calf Raise: Place balls of feet on block with pad over lower thighs, lower heels into deep stretch, and press vertically to peak contraction.",
    descriptionPt: "Execu\xE7\xE3o: Apoie a ponta dos p\xE9s no degrau com suporte acima dos joelhos, alongue os calcanhares ao m\xE1ximo e suba contraindo o s\xF3leo.",
    commonMistakes: "Shortening range of motion or bouncing quickly through reps.",
    commonMistakesPt: "Fazer amplitude curta ou acelerar as repeti\xE7\xF5es quicando na base."
  },
  single_leg_bw_calf_raise: {
    description: "Single-Leg Calf Raise: Stand on step edge on one foot holding support lightly, lower heel fully, then rise onto ball of foot smoothly.",
    descriptionPt: "Execu\xE7\xE3o: Apoie a ponta de um p\xE9 na borda de um degrau com apoio leve para equil\xEDbrio, des\xE7a bem o calcanhar e suba ao m\xE1ximo.",
    commonMistakes: "Leaning body weight onto the support rail or rushing without bottom stretch.",
    commonMistakesPt: "Descarregar o peso no apoio das m\xE3os ou n\xE3o alongar na descida."
  },
  db_standing_calf_raise: {
    description: "Dumbbell Standing Calf Raise: Hold dumbbells at sides, stand with forefeet elevated on block, pause in stretch and push straight up.",
    descriptionPt: "Execu\xE7\xE3o: Segure halteres ao lado do corpo com a ponta dos p\xE9s em um degrau, pause no alongamento baixo e eleve os calcanhares.",
    commonMistakes: "Rolling ankles outward toward pinky toes or bouncing at bottom.",
    commonMistakesPt: "Tombar os tornozelos para fora ou quicar na parte baixa."
  },
  leg_press_calf_raise: {
    description: "Leg Press Calf Press: Place balls of feet on lower edge of sled with nearly straight (unlocked) knees, flex ankles back and press through big toe ball.",
    descriptionPt: "Execu\xE7\xE3o: Apoie a ponta dos p\xE9s na borda inferior da plataforma com joelhos quase estendidos (sem travar) e execute flex\xE3o plantar completa.",
    commonMistakes: "Locking knees completely straight or letting feet slip off the bottom edge.",
    commonMistakesPt: "Hiperestender os joelhos travados ou posicionar os p\xE9s sem seguran\xE7a na borda."
  },
  // === CORE (11) ===
  hanging_leg_raise: {
    description: "Hanging Leg Raise: Curl pelvis upwards at the apex and avoid swinging body momentum.",
    descriptionPt: "Execu\xE7\xE3o: Eleve as pernas realizando retrovers\xE3o p\xE9lvica no ponto alto, controlando a descida sem balan\xE7ar.",
    commonMistakes: "Swinging legs forward with momentum or stopping at 90\xB0 using only hip flexors.",
    commonMistakesPt: "Balan\xE7ar o corpo para ganhar embalo ou subir apenas at\xE9 90\xB0 sem enrolar a pelve."
  },
  plank: {
    description: "Forearm Plank: Align elbows under shoulders, squeeze glutes and brace abs so body forms a straight rigid line from head to heels.",
    descriptionPt: "Execu\xE7\xE3o: Alinhe os cotovelos sob os ombros, contraia gl\xFAteos e abd\xF4men mantendo o corpo reto da cabe\xE7a aos calcanhares.",
    commonMistakes: "Letting lower back sag or hiking hips high into the air.",
    commonMistakesPt: "Deixar a lombar afundar ou subir demais o quadril."
  },
  side_plank: {
    description: "Side Plank: Stack elbow under shoulder and feet together or staggered, lift hips off floor until torso forms a straight lateral line.",
    descriptionPt: "Execu\xE7\xE3o: Apoie o cotovelo sob o ombro com os p\xE9s alinhados e eleve o quadril mantendo o corpo reto lateralmente.",
    commonMistakes: "Letting top hip rotate forward or bottom hip sag toward the mat.",
    commonMistakesPt: "Girar o tronco para frente ou deixar o quadril cair em dire\xE7\xE3o ao solo."
  },
  dead_bug: {
    description: "Dead Bug: Lie on back pressing lower back flat into floor, extend opposite arm and leg slowly above floor without losing lumbar contact.",
    descriptionPt: "Execu\xE7\xE3o: Deitado de costas com a lombar pressionada contra o ch\xE3o, estenda bra\xE7o e perna opostos lentamente sem arquear a lombar.",
    commonMistakes: "Allowing the lower back to arch off the floor as the leg lowers.",
    commonMistakesPt: "Desencostar a lombar do solo quando a perna desce."
  },
  bicycle_crunch: {
    description: "Bicycle Crunch: Keep lower back pressed down, rotate ribcage slowly to bring elbow toward opposite knee while extending other leg smoothly.",
    descriptionPt: "Execu\xE7\xE3o: Mantenha a lombar firme no ch\xE3o, gire o tronco aproximando o cotovelo do joelho oposto enquanto estende a outra perna sem pressa.",
    commonMistakes: "Pulling on the neck with hands or pedaling legs wildly without torso rotation.",
    commonMistakesPt: "Puxar o pesco\xE7o com as m\xE3os ou movimentar s\xF3 as pernas rapidamente sem girar o tronco."
  },
  hollow_body_hold: {
    description: "Hollow Body Hold: Press lumbar spine firmly into floor, raise shoulder blades and extended legs slightly off mat maintaining a tight banana curve.",
    descriptionPt: "Execu\xE7\xE3o: Cole a lombar no ch\xE3o, tire esc\xE1pulas e pernas estendidas levemente do solo sustentando tens\xE3o cont\xEDnua no abd\xF4men.",
    commonMistakes: "Lower back lifting off the floor due to legs being held too low.",
    commonMistakesPt: "Arqueamento da lombar descolando do solo por abaixar demais as pernas."
  },
  cable_woodchopper: {
    description: "Cable Woodchopper: Stand sideways to pulley with arms extended, rotate torso cleanly through hips and core diagonally across body.",
    descriptionPt: "Execu\xE7\xE3o: Posicione-se lateralmente \xE0 polia com bra\xE7os estendidos e gire o tronco em diagonal usando a rota\xE7\xE3o do core, sem dobrar os cotovelos.",
    commonMistakes: "Pulling solely with arms instead of rotating the ribcage and bracing hips.",
    commonMistakesPt: "Puxar o cabo usando apenas a for\xE7a dos bra\xE7os sem rota\xE7\xE3o controlada do tronco."
  },
  cable_crunch: {
    description: "Kneeling Cable Crunch: Kneel holding rope beside temples, keep hips stationary over knees, and curl ribcage downward toward pelvis.",
    descriptionPt: "Execu\xE7\xE3o: Ajoelhado segurando a corda ao lado da cabe\xE7a, mantenha o quadril fixo sobre os joelhos e flexione a coluna levando as costelas em dire\xE7\xE3o \xE0 pelve.",
    commonMistakes: "Sitting hips back onto heels like a hip hinge instead of flexing the spine.",
    commonMistakesPt: "Sentar o quadril para tr\xE1s usando o peso do corpo em vez de flexionar o abd\xF4men."
  },
  db_russian_twist: {
    description: "Dumbbell Russian Twist: Sit with torso reclined ~45\xB0 and braced core, rotate shoulders side to side moving dumbbell with control.",
    descriptionPt: "Execu\xE7\xE3o: Sentado com o tronco inclinado a ~45\xB0 e core contra\xEDdo, gire os ombros de um lado para o outro levando o halter com controle.",
    commonMistakes: "Moving only the hands side to side without rotating the shoulders, or rounding the lower back.",
    commonMistakesPt: "Mover apenas os bra\xE7os sem girar o tronco ou arredondar a lombar."
  },
  ab_crunch_machine: {
    description: "Ab Crunch Machine: Adjust seat so torso aligns with pad, exhale while flexing spine forward smoothly, and control the eccentric return.",
    descriptionPt: "Execu\xE7\xE3o: Ajuste o banco alinhando o tronco ao apoio, expire flexionando o abd\xF4men para frente de forma controlada e retorne sem soltar o peso.",
    commonMistakes: "Pulling with arms or flexing hips aggressively instead of crunching the ribcage.",
    commonMistakesPt: "Puxar a carga com os bra\xE7os ou dobrar apenas o quadril."
  },
  band_pallof_press: {
    description: "Band Pallof Press: Stand sideways to anchored band holding handle at sternum, press arms straight forward resisting torso rotation, pause, and return.",
    descriptionPt: "Execu\xE7\xE3o: Em p\xE9 lateralmente ao el\xE1stico preso, segure na frente do esterno e estenda os bra\xE7os \xE0 frente resistindo \xE0 rota\xE7\xE3o do tronco.",
    commonMistakes: "Letting shoulders or hips twist toward the anchor or shrugging traps.",
    commonMistakesPt: "Deixar o tronco girar em dire\xE7\xE3o ao ponto de fixa\xE7\xE3o ou elevar os ombros."
  }
};

// src/data/exerciseCatalog.ts
var EXERCISE_MEDIA_CDN_BASE = "https://cdn.fitflow.celisapp.com/exercises/v1";
var EXERCISE_MEDIA_VERSION = "1.0.0";
function createPlannedExerciseMedia(id, alt, altPt, overrides = {}) {
  return {
    imageUrl: `${EXERCISE_MEDIA_CDN_BASE}/${id}.webp`,
    alt,
    altPt,
    mediaType: "webp",
    assetId: `exercise_${id}`,
    version: EXERCISE_MEDIA_VERSION,
    status: "planned",
    source: "pending-batch",
    ...overrides
  };
}
var EXERCISE_DATABASE = {
  // === CHEST (11) ===
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
    guide: EXERCISE_GUIDE.bench_press,
    media: createPlannedExerciseMedia(
      "bench_press",
      "Barbell bench press starting and pressing position on flat bench",
      "Posi\xE7\xE3o inicial e execu\xE7\xE3o do supino reto com barra no banco plano"
    )
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
    guide: EXERCISE_GUIDE.incline_db_press,
    media: createPlannedExerciseMedia(
      "incline_db_press",
      "Incline dumbbell press performed on a 30 degree bench",
      "Supino inclinado com halteres executado em banco a 30 graus"
    )
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
    guide: EXERCISE_GUIDE.cable_fly,
    media: createPlannedExerciseMedia(
      "cable_fly",
      "Standing cable chest fly with handles brought together at chest height",
      "Crucifixo no crossover em p\xE9 aproximando os pegadores na altura do peitoral"
    )
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
    guide: EXERCISE_GUIDE.push_up,
    media: createPlannedExerciseMedia(
      "push_up",
      "Bodyweight push-up maintaining straight plank alignment",
      "Flex\xE3o de bra\xE7o no solo mantendo o corpo alinhado em prancha"
    )
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
    guide: EXERCISE_GUIDE.band_chest_press,
    media: createPlannedExerciseMedia(
      "band_chest_press",
      "Standing resistance band chest press anchored behind torso",
      "Supino com el\xE1stico em p\xE9 com ancoragem atr\xE1s do tronco"
    )
  },
  incline_barbell_press: {
    id: "incline_barbell_press",
    name: "Incline Barbell Bench Press",
    namePt: "Supino Inclinado com Barra",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 8,
    defaultWeight: 65,
    restSeconds: 90,
    notes: "Lower bar to upper chest with elbows at ~45 degrees.",
    notesPt: "Des\xE7a a barra at\xE9 o peitoral superior mantendo os cotovelos a ~45 graus.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.incline_barbell_press,
    media: createPlannedExerciseMedia(
      "incline_barbell_press",
      "Incline barbell bench press on a 30 to 35 degree bench",
      "Supino inclinado com barra em banco ajustado entre 30 e 35 graus"
    )
  },
  db_bench_press: {
    id: "db_bench_press",
    name: "Flat Dumbbell Bench Press",
    namePt: "Supino Reto com Halteres",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    category: "dumbbell",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 30,
    restSeconds: 75,
    notes: "Control the descent to chest height and press smoothly.",
    notesPt: "Controle a descida at\xE9 a linha do peito e empurre de forma est\xE1vel.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.db_bench_press,
    media: createPlannedExerciseMedia(
      "db_bench_press",
      "Flat dumbbell bench press holding dumbbells over chest",
      "Supino reto com halteres executado no banco plano"
    )
  },
  db_fly: {
    id: "db_fly",
    name: "Dumbbell Chest Fly",
    namePt: "Crucifixo Reto com Halteres",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 14,
    restSeconds: 60,
    notes: "Maintain a fixed soft bend in the elbows through the entire arc.",
    notesPt: "Mantenha uma leve flex\xE3o fixa nos cotovelos durante todo o arco.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.db_fly,
    media: createPlannedExerciseMedia(
      "db_fly",
      "Flat dumbbell fly opening arms wide with soft elbow bend",
      "Crucifixo reto com halteres abrindo os bra\xE7os em arco controlado"
    )
  },
  chest_press_machine: {
    id: "chest_press_machine",
    name: "Seated Chest Press Machine",
    namePt: "Supino Sentado na M\xE1quina",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 60,
    restSeconds: 75,
    notes: "Keep shoulder blades anchored against the backrest.",
    notesPt: "Mantenha as esc\xE1pulas firmemente apoiadas no encosto.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.chest_press_machine,
    media: createPlannedExerciseMedia(
      "chest_press_machine",
      "Seated chest press machine pressing handles forward at mid-chest level",
      "Supino sentado na m\xE1quina empurrando as manoplas na altura do peitoral"
    )
  },
  pec_deck_fly: {
    id: "pec_deck_fly",
    name: "Pec Deck Machine Fly",
    namePt: "Voador Peitoral (Peck Deck)",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 45,
    restSeconds: 60,
    notes: "Keep shoulders depressed and pause briefly at peak contraction.",
    notesPt: "Mantenha os ombros abaixados e pause brevemente na contra\xE7\xE3o m\xE1xima.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.pec_deck_fly,
    media: createPlannedExerciseMedia(
      "pec_deck_fly",
      "Pec deck fly machine bringing arms smoothly toward center",
      "Voador peitoral na m\xE1quina aproximando os bra\xE7os \xE0 frente do peito"
    )
  },
  decline_push_up: {
    id: "decline_push_up",
    name: "Decline Push-Up",
    namePt: "Flex\xE3o Declinada",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep feet elevated on a stable bench and brace the core.",
    notesPt: "Apoie os p\xE9s em um banco est\xE1vel e mantenha o abd\xF4men contra\xEDdo.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.decline_push_up,
    media: createPlannedExerciseMedia(
      "decline_push_up",
      "Decline push-up with feet elevated on a bench and plank torso",
      "Flex\xE3o declinada com p\xE9s elevados sobre banco e tronco alinhado"
    )
  },
  // === BACK (12) ===
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
    guide: EXERCISE_GUIDE.barbell_deadlift,
    media: createPlannedExerciseMedia(
      "barbell_deadlift",
      "Conventional barbell deadlift setup and hip hinge lockout",
      "Levantamento terra convencional com barra rente \xE0s canelas"
    )
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
    guide: EXERCISE_GUIDE.lat_pulldown,
    media: createPlannedExerciseMedia(
      "lat_pulldown",
      "Wide grip lat pulldown pulling cable bar to upper chest",
      "Puxada aberta na polia trazendo a barra em dire\xE7\xE3o ao peitoral superior"
    )
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
    guide: EXERCISE_GUIDE.barbell_row,
    media: createPlannedExerciseMedia(
      "barbell_row",
      "Bent-over barbell row with torso hinged at 45 degrees",
      "Remada curvada com barra com tronco inclinado a 45 graus"
    )
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
    guide: EXERCISE_GUIDE.prone_snow_angels,
    media: createPlannedExerciseMedia(
      "prone_snow_angels",
      "Prone snow angels lying face down sweeping arms in a wide arc",
      "Anjos na neve em prono movendo os bra\xE7os em arco amplo e controlado"
    )
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
    guide: EXERCISE_GUIDE.band_row,
    media: createPlannedExerciseMedia(
      "band_row",
      "Seated or standing resistance band row pulling elbows back along ribs",
      "Remada com el\xE1stico puxando os cotovelos junto \xE0s costelas"
    )
  },
  pull_up: {
    id: "pull_up",
    name: "Pull-Up",
    namePt: "Barra Fixa Pronada",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "shoulders", "core"],
    category: "bodyweight",
    equipmentRequired: ["pull_up_bar"],
    defaultSets: 3,
    defaultReps: 8,
    defaultWeight: 0,
    restSeconds: 90,
    notes: "Start from a dead hang, depress shoulder blades, and pull chin over bar.",
    notesPt: "Inicie com bra\xE7os estendidos, encaixe as esc\xE1pulas e puxe at\xE9 passar o queixo da barra.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.pull_up,
    media: createPlannedExerciseMedia(
      "pull_up",
      "Overhand grip pull-up on overhead bar",
      "Barra fixa em pegada pronada puxando o peito em dire\xE7\xE3o \xE0 barra"
    )
  },
  chin_up: {
    id: "chin_up",
    name: "Chin-Up",
    namePt: "Barra Fixa Supinada",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "core"],
    category: "bodyweight",
    equipmentRequired: ["pull_up_bar"],
    defaultSets: 3,
    defaultReps: 8,
    defaultWeight: 0,
    restSeconds: 90,
    notes: "Use shoulder-width underhand grip and control full descent.",
    notesPt: "Use pegada supinada na largura dos ombros e controle toda a descida.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.chin_up,
    media: createPlannedExerciseMedia(
      "chin_up",
      "Underhand grip chin-up pulling torso vertically toward bar",
      "Barra fixa supinada com palmas voltadas para o rosto"
    )
  },
  one_arm_db_row: {
    id: "one_arm_db_row",
    name: "Single-Arm Dumbbell Row",
    namePt: "Remada Unilateral com Halter (Serrote)",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "shoulders"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 26,
    restSeconds: 60,
    notes: "Brace hand on bench with flat back and pull dumbbell toward hip.",
    notesPt: "Apoie m\xE3o e joelho no banco com coluna neutra e puxe o halter em dire\xE7\xE3o ao quadril.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.one_arm_db_row,
    media: createPlannedExerciseMedia(
      "one_arm_db_row",
      "Single-arm dumbbell row braced on flat bench pulling weight to hip",
      "Remada unilateral com halter apoiado no banco puxando em dire\xE7\xE3o ao quadril"
    )
  },
  seated_cable_row: {
    id: "seated_cable_row",
    name: "Seated Cable Row",
    namePt: "Remada Baixa na Polia",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "shoulders"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 55,
    restSeconds: 75,
    notes: "Keep torso tall and squeeze shoulder blades together without leaning back.",
    notesPt: "Mantenha o tronco ereto e una as esc\xE1pulas sem balan\xE7ar para tr\xE1s.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.seated_cable_row,
    media: createPlannedExerciseMedia(
      "seated_cable_row",
      "Seated cable row pulling close-grip handle toward lower abdomen",
      "Remada baixa sentada na polia trazendo o pegador ao abd\xF4men"
    )
  },
  straight_arm_pulldown: {
    id: "straight_arm_pulldown",
    name: "Straight-Arm Cable Pulldown",
    namePt: "Pulldown com Bra\xE7os Estendidos na Polia",
    primaryMuscle: "back",
    secondaryMuscles: ["triceps", "core"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 25,
    restSeconds: 60,
    notes: "Keep elbows softly fixed and sweep bar to upper thighs.",
    notesPt: "Mantenha os cotovelos quase estendidos e leve a barra at\xE9 a parte superior das coxas.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.straight_arm_pulldown,
    media: createPlannedExerciseMedia(
      "straight_arm_pulldown",
      "Standing straight-arm cable pulldown engaging latissimus dorsi",
      "Pulldown na polia alta com bra\xE7os estendidos ativando as dorsais"
    )
  },
  chest_supported_row_machine: {
    id: "chest_supported_row_machine",
    name: "Machine Chest-Supported Row",
    namePt: "Remada Articulada na M\xE1quina",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "shoulders"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 55,
    restSeconds: 75,
    notes: "Keep chest pressed firmly against pad throughout the pull.",
    notesPt: "Mantenha o peito pressionado contra o apoio durante toda a puxada.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.chest_supported_row_machine,
    media: createPlannedExerciseMedia(
      "chest_supported_row_machine",
      "Chest-supported row machine pulling handles backward cleanly",
      "Remada articulada com apoio de peito na m\xE1quina"
    )
  },
  band_lat_pulldown: {
    id: "band_lat_pulldown",
    name: "Resistance Band Lat Pulldown",
    namePt: "Puxada Alta com El\xE1stico",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Anchor band high and drive elbows downward along torso.",
    notesPt: "Prenda o el\xE1stico acima da cabe\xE7a e puxe os cotovelos para baixo junto ao tronco.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.band_lat_pulldown,
    media: createPlannedExerciseMedia(
      "band_lat_pulldown",
      "Kneeling resistance band lat pulldown anchored overhead",
      "Puxada alta ajoelhada com el\xE1stico ancorado acima da cabe\xE7a"
    )
  },
  // === SHOULDERS (10) ===
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
    guide: EXERCISE_GUIDE.overhead_press,
    media: createPlannedExerciseMedia(
      "overhead_press",
      "Standing barbell overhead press pressing barbell vertically",
      "Desenvolvimento militar em p\xE9 empurrando a barra verticalmente"
    )
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
    guide: EXERCISE_GUIDE.lateral_raise,
    media: createPlannedExerciseMedia(
      "lateral_raise",
      "Standing dumbbell lateral raise raising arms to shoulder height",
      "Eleva\xE7\xE3o lateral com halteres elevando os bra\xE7os at\xE9 a altura dos ombros"
    )
  },
  seated_db_shoulder_press: {
    id: "seated_db_shoulder_press",
    name: "Seated Dumbbell Shoulder Press",
    namePt: "Desenvolvimento com Halteres Sentado",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 22,
    restSeconds: 75,
    notes: "Keep lower back supported on upright bench and press smoothly overhead.",
    notesPt: "Mantenha a lombar apoiada no banco vertical e empurre os halteres acima da cabe\xE7a.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.seated_db_shoulder_press,
    media: createPlannedExerciseMedia(
      "seated_db_shoulder_press",
      "Seated dumbbell overhead press with back supported on vertical bench",
      "Desenvolvimento sentado com halteres e costas apoiadas no banco vertical"
    )
  },
  front_db_raise: {
    id: "front_db_raise",
    name: "Dumbbell Front Raise",
    namePt: "Eleva\xE7\xE3o Frontal com Halteres",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["chest"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 10,
    restSeconds: 60,
    notes: "Raise dumbbells cleanly to shoulder height without torso swing.",
    notesPt: "Eleve os halteres at\xE9 a altura dos ombros sem balan\xE7ar o tronco.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.front_db_raise,
    media: createPlannedExerciseMedia(
      "front_db_raise",
      "Standing dumbbell front raise lifting weights to shoulder plane",
      "Eleva\xE7\xE3o frontal com halteres em p\xE9 at\xE9 a altura dos ombros"
    )
  },
  rear_delt_db_fly: {
    id: "rear_delt_db_fly",
    name: "Bent-Over Rear Delt Fly",
    namePt: "Crucifixo Inverso com Halteres",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 10,
    restSeconds: 60,
    notes: "Hinge torso forward with neutral spine and sweep arms wide.",
    notesPt: "Incline o tronco \xE0 frente com coluna neutra e abra os bra\xE7os lateralmente.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.rear_delt_db_fly,
    media: createPlannedExerciseMedia(
      "rear_delt_db_fly",
      "Bent-over dumbbell reverse fly targeting posterior deltoids",
      "Crucifixo inverso inclinado com halteres para delt\xF3ides posteriores"
    )
  },
  cable_lateral_raise: {
    id: "cable_lateral_raise",
    name: "Single-Arm Cable Lateral Raise",
    namePt: "Eleva\xE7\xE3o Lateral Unilateral na Polia",
    primaryMuscle: "shoulders",
    secondaryMuscles: [],
    category: "cable",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 7.5,
    restSeconds: 60,
    notes: "Maintain constant tension from bottom to shoulder height.",
    notesPt: "Mantenha tens\xE3o constante desde a base at\xE9 a altura do ombro.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.cable_lateral_raise,
    media: createPlannedExerciseMedia(
      "cable_lateral_raise",
      "Single-arm cable lateral raise from low pulley to shoulder level",
      "Eleva\xE7\xE3o lateral unilateral na polia baixa at\xE9 a linha do ombro"
    )
  },
  cable_face_pull: {
    id: "cable_face_pull",
    name: "Cable Face Pull",
    namePt: "Face Pull na Polia com Corda",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 20,
    restSeconds: 60,
    notes: "Pull rope ends toward temples while externally rotating shoulders.",
    notesPt: "Puxe a corda em dire\xE7\xE3o \xE0s t\xEAmporas realizando rota\xE7\xE3o externa dos ombros.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.cable_face_pull,
    media: createPlannedExerciseMedia(
      "cable_face_pull",
      "Standing cable rope face pull with external shoulder rotation",
      "Face pull na polia com corda e rota\xE7\xE3o externa dos ombros"
    )
  },
  shoulder_press_machine: {
    id: "shoulder_press_machine",
    name: "Shoulder Press Machine",
    namePt: "Desenvolvimento na M\xE1quina",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 45,
    restSeconds: 75,
    notes: "Keep back flat against pad and press without locking elbows.",
    notesPt: "Mantenha as costas apoiadas e empurre sem travar os cotovelos.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.shoulder_press_machine,
    media: createPlannedExerciseMedia(
      "shoulder_press_machine",
      "Seated shoulder press machine pressing handles overhead",
      "Desenvolvimento sentado na m\xE1quina empurrando acima da cabe\xE7a"
    )
  },
  pike_push_up: {
    id: "pike_push_up",
    name: "Pike Push-Up",
    namePt: "Flex\xE3o Pike para Ombros",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep hips high in inverted V and lower crown of head forward.",
    notesPt: "Mantenha o quadril elevado em V invertido e des\xE7a o topo da cabe\xE7a \xE0 frente.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.pike_push_up,
    media: createPlannedExerciseMedia(
      "pike_push_up",
      "Bodyweight pike push-up in inverted V posture targeting deltoids",
      "Flex\xE3o pike em V invertido com foco nos ombros"
    )
  },
  band_pull_apart: {
    id: "band_pull_apart",
    name: "Resistance Band Pull-Apart",
    namePt: "Crucifixo Inverso com El\xE1stico",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Keep arms straight at shoulder height and squeeze rear delts.",
    notesPt: "Mantenha os bra\xE7os estendidos na altura dos ombros e contraia os posteriores.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.band_pull_apart,
    media: createPlannedExerciseMedia(
      "band_pull_apart",
      "Standing resistance band pull-apart at chest height",
      "Abertura horizontal com el\xE1stico em p\xE9 para posteriores de ombro"
    )
  },
  // === BICEPS (8) ===
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
    guide: EXERCISE_GUIDE.barbell_curl,
    media: createPlannedExerciseMedia(
      "barbell_curl",
      "Standing EZ-bar bicep curl with elbows fixed at torso sides",
      "Rosca direta na barra W em p\xE9 com cotovelos alinhados ao tronco"
    )
  },
  db_bicep_curl: {
    id: "db_bicep_curl",
    name: "Alternating Dumbbell Curl",
    namePt: "Rosca Alternada com Halteres",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 14,
    restSeconds: 60,
    notes: "Supinate wrists smoothly as you curl and control full descent.",
    notesPt: "Gire a palma para cima na subida e controle toda a descida.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.db_bicep_curl,
    media: createPlannedExerciseMedia(
      "db_bicep_curl",
      "Standing alternating dumbbell bicep curl with controlled supination",
      "Rosca alternada com halteres em p\xE9 com supina\xE7\xE3o controlada"
    )
  },
  hammer_curl: {
    id: "hammer_curl",
    name: "Dumbbell Hammer Curl",
    namePt: "Rosca Martelo com Halteres",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 16,
    restSeconds: 60,
    notes: "Maintain neutral palms facing torso throughout the set.",
    notesPt: "Mantenha pegada neutra com palmas voltadas para o corpo durante toda a s\xE9rie.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.hammer_curl,
    media: createPlannedExerciseMedia(
      "hammer_curl",
      "Standing dumbbell hammer curl with neutral wrist grip",
      "Rosca martelo com halteres em pegada neutra"
    )
  },
  incline_db_curl: {
    id: "incline_db_curl",
    name: "Incline Dumbbell Curl",
    namePt: "Rosca Inclinada com Halteres",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 12,
    restSeconds: 60,
    notes: "Let upper arms hang vertically behind torso for long-head stretch.",
    notesPt: "Deixe os bra\xE7os pendentes atr\xE1s da linha do tronco para alongar o b\xEDceps.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.incline_db_curl,
    media: createPlannedExerciseMedia(
      "incline_db_curl",
      "Seated incline bench dumbbell bicep curl with arms hanging vertically",
      "Rosca inclinada com halteres no banco a 45 graus"
    )
  },
  concentration_curl: {
    id: "concentration_curl",
    name: "Dumbbell Concentration Curl",
    namePt: "Rosca Concentrada com Halter",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 12,
    restSeconds: 45,
    notes: "Brace upper arm against inner thigh and isolate the elbow flex.",
    notesPt: "Apoie a parte posterior do bra\xE7o na coxa interna e isole a flex\xE3o do cotovelo.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.concentration_curl,
    media: createPlannedExerciseMedia(
      "concentration_curl",
      "Seated single-arm concentration curl braced against inner thigh",
      "Rosca concentrada sentada com bra\xE7o apoiado na parte interna da coxa"
    )
  },
  cable_bicep_curl: {
    id: "cable_bicep_curl",
    name: "Cable Straight-Bar Curl",
    namePt: "Rosca Direta na Polia Baixa",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 25,
    restSeconds: 60,
    notes: "Keep elbows pinned at sides under constant low-pulley tension.",
    notesPt: "Mantenha os cotovelos firmes ao lado do corpo sob tens\xE3o cont\xEDnua da polia.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.cable_bicep_curl,
    media: createPlannedExerciseMedia(
      "cable_bicep_curl",
      "Standing cable bicep curl on low pulley keeping torso upright",
      "Rosca direta em p\xE9 na polia baixa mantendo o tronco est\xE1vel"
    )
  },
  preacher_curl_machine: {
    id: "preacher_curl_machine",
    name: "Preacher Curl Machine",
    namePt: "Rosca Scott na M\xE1quina",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 35,
    restSeconds: 60,
    notes: "Rest upper arms flush on pad and avoid snapping elbows at bottom.",
    notesPt: "Apoie bem os tr\xEDceps no banco Scott e evite estender os cotovelos com tranco.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.preacher_curl_machine,
    media: createPlannedExerciseMedia(
      "preacher_curl_machine",
      "Seated preacher curl machine isolating biceps with triceps on pad",
      "Rosca Scott na m\xE1quina com tr\xEDceps apoiados no suporte inclinado"
    )
  },
  band_bicep_curl: {
    id: "band_bicep_curl",
    name: "Resistance Band Bicep Curl",
    namePt: "Rosca Direta com El\xE1stico",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    category: "bands",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Stand squarely on band and control the lowering phase.",
    notesPt: "Pise firme no centro do el\xE1stico e controle a descida sem soltar a tens\xE3o.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.band_bicep_curl,
    media: createPlannedExerciseMedia(
      "band_bicep_curl",
      "Standing resistance band bicep curl anchored beneath both feet",
      "Rosca direta em p\xE9 com el\xE1stico ancorado sob os p\xE9s"
    )
  },
  // === TRICEPS (8) ===
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
    guide: EXERCISE_GUIDE.tricep_pushdown,
    media: createPlannedExerciseMedia(
      "tricep_pushdown",
      "Cable triceps rope pushdown with elbows pinned to torso",
      "Tr\xEDceps corda na polia mantendo os cotovelos firmes junto ao tronco"
    )
  },
  overhead_cable_tricep_ext: {
    id: "overhead_cable_tricep_ext",
    name: "Overhead Cable Triceps Extension",
    namePt: "Tr\xEDceps Franc\xEAs na Polia com Corda",
    primaryMuscle: "triceps",
    secondaryMuscles: ["core"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 22.5,
    restSeconds: 60,
    notes: "Keep upper arms angled overhead and extend forearms cleanly forward.",
    notesPt: "Mantenha os bra\xE7os alinhados acima da cabe\xE7a e estenda os antebra\xE7os \xE0 frente.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.overhead_cable_tricep_ext,
    media: createPlannedExerciseMedia(
      "overhead_cable_tricep_ext",
      "Overhead cable rope triceps extension facing away from pulley",
      "Tr\xEDceps franc\xEAs na polia com corda estendendo os bra\xE7os acima da cabe\xE7a"
    )
  },
  skull_crusher: {
    id: "skull_crusher",
    name: "Lying Barbell Skull Crusher",
    namePt: "Tr\xEDceps Testa com Barra",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "barbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 30,
    restSeconds: 75,
    notes: "Lower bar smoothly behind forehead keeping upper arms steady.",
    notesPt: "Des\xE7a a barra de forma controlada na linha da testa/acima mantendo os bra\xE7os est\xE1veis.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.skull_crusher,
    media: createPlannedExerciseMedia(
      "skull_crusher",
      "Lying barbell triceps extension bending elbows cleanly on flat bench",
      "Tr\xEDceps testa deitado no banco plano com barra"
    )
  },
  close_grip_bench_press: {
    id: "close_grip_bench_press",
    name: "Close-Grip Barbell Bench Press",
    namePt: "Supino Fechado com Barra",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "shoulders"],
    category: "barbell",
    defaultSets: 3,
    defaultReps: 8,
    defaultWeight: 65,
    restSeconds: 90,
    notes: "Grip shoulder-width and tuck elbows close to torso during descent.",
    notesPt: "Segure a barra na largura dos ombros e mantenha os cotovelos pr\xF3ximos ao tronco.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.close_grip_bench_press,
    media: createPlannedExerciseMedia(
      "close_grip_bench_press",
      "Close-grip barbell bench press with elbows tucked close to ribs",
      "Supino fechado com barra e cotovelos junto \xE0s costelas"
    )
  },
  db_overhead_tricep_ext: {
    id: "db_overhead_tricep_ext",
    name: "Overhead Dumbbell Triceps Extension",
    namePt: "Tr\xEDceps Franc\xEAs com Halter",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 20,
    restSeconds: 60,
    notes: "Keep elbows pointing forward and lower dumbbell behind neck with control.",
    notesPt: "Mantenha os cotovelos apontados para frente e des\xE7a o halter atr\xE1s da cabe\xE7a.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.db_overhead_tricep_ext,
    media: createPlannedExerciseMedia(
      "db_overhead_tricep_ext",
      "Overhead dumbbell triceps extension holding single dumbbell with both hands",
      "Tr\xEDceps franc\xEAs com halter segurado com as duas m\xE3os acima da cabe\xE7a"
    )
  },
  db_tricep_kickback: {
    id: "db_tricep_kickback",
    name: "Dumbbell Triceps Kickback",
    namePt: "Tr\xEDceps Coice com Halter",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 10,
    restSeconds: 45,
    notes: "Keep upper arm parallel to torso and extend forearm fully back.",
    notesPt: "Mantenha o bra\xE7o paralelo ao tronco e estenda o antebra\xE7o totalmente para tr\xE1s.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.db_tricep_kickback,
    media: createPlannedExerciseMedia(
      "db_tricep_kickback",
      "Hinged dumbbell triceps kickback extending forearm parallel to floor",
      "Tr\xEDceps coice com halter mantendo o bra\xE7o paralelo ao solo"
    )
  },
  diamond_push_up: {
    id: "diamond_push_up",
    name: "Diamond Push-Up",
    namePt: "Flex\xE3o Diamante",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "shoulders", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Form a close triangle under sternum and press cleanly through triceps.",
    notesPt: "Forme um tri\xE2ngulo com as m\xE3os sob o esterno e empurre ativando o tr\xEDceps.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.diamond_push_up,
    media: createPlannedExerciseMedia(
      "diamond_push_up",
      "Bodyweight diamond push-up with hands close under chest",
      "Flex\xE3o diamante com m\xE3os pr\xF3ximas sob o centro do peitoral"
    )
  },
  band_tricep_pushdown: {
    id: "band_tricep_pushdown",
    name: "Resistance Band Triceps Pushdown",
    namePt: "Tr\xEDceps Pulley com El\xE1stico",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "bands",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Anchor band overhead, lock elbows against ribs, and extend downward.",
    notesPt: "Prenda o el\xE1stico acima, fixe os cotovelos nas costelas e estenda para baixo.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.band_tricep_pushdown,
    media: createPlannedExerciseMedia(
      "band_tricep_pushdown",
      "Standing resistance band triceps pushdown anchored overhead",
      "Tr\xEDceps pulley com el\xE1stico ancorado acima da cabe\xE7a"
    )
  },
  // === QUADS (10) ===
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
    guide: EXERCISE_GUIDE.barbell_squat,
    media: createPlannedExerciseMedia(
      "barbell_squat",
      "Barbell back squat reaching parallel thigh depth",
      "Agachamento livre com barra atingindo profundidade paralela"
    )
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
    guide: EXERCISE_GUIDE.leg_press,
    media: createPlannedExerciseMedia(
      "leg_press",
      "45 degree leg press machine with lower back supported against pad",
      "Leg press 45 graus mantendo a lombar totalmente apoiada no encosto"
    )
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
    guide: EXERCISE_GUIDE.bodyweight_squat,
    media: createPlannedExerciseMedia(
      "bodyweight_squat",
      "Bodyweight air squat with feet flat and chest upright",
      "Agachamento livre com p\xE9s firmes no solo e tronco erguido"
    )
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
    guide: EXERCISE_GUIDE.reverse_lunge,
    media: createPlannedExerciseMedia(
      "reverse_lunge",
      "Bodyweight reverse lunge stepping back with front knee aligned over ankle",
      "Avan\xE7o reverso com passo controlado mantendo o joelho da frente est\xE1vel"
    )
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
    guide: EXERCISE_GUIDE.band_squat,
    media: createPlannedExerciseMedia(
      "band_squat",
      "Resistance band squat standing inside band loop with tension at shoulders",
      "Agachamento com el\xE1stico pisando sobre a faixa com tens\xE3o nos ombros"
    )
  },
  front_barbell_squat: {
    id: "front_barbell_squat",
    name: "Barbell Front Squat",
    namePt: "Agachamento Frontal com Barra",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "core"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 6,
    defaultWeight: 80,
    restSeconds: 120,
    notes: "Keep elbows high and torso upright throughout the squat.",
    notesPt: "Mantenha os cotovelos elevados e o tronco o mais vertical poss\xEDvel.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.front_barbell_squat,
    media: createPlannedExerciseMedia(
      "front_barbell_squat",
      "Barbell front squat racked across anterior deltoids with high elbows",
      "Agachamento frontal com barra apoiada nos ombros e cotovelos altos"
    )
  },
  goblet_squat: {
    id: "goblet_squat",
    name: "Dumbbell Goblet Squat",
    namePt: "Agachamento Goblet com Halter",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "core"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 24,
    restSeconds: 75,
    notes: "Hold dumbbell vertically against chest and keep elbows inside knees at depth.",
    notesPt: "Segure o halter junto ao peito mantendo os cotovelos por dentro dos joelhos na descida.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.goblet_squat,
    media: createPlannedExerciseMedia(
      "goblet_squat",
      "Dumbbell goblet squat holding weight vertically at chest height",
      "Agachamento goblet com halter vertical segurado junto ao peitoral"
    )
  },
  bulgarian_split_squat: {
    id: "bulgarian_split_squat",
    name: "Dumbbell Bulgarian Split Squat",
    namePt: "Agachamento B\xFAlgaro com Halteres",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 18,
    restSeconds: 75,
    notes: "Keep rear foot resting lightly on bench and drive through front midfoot.",
    notesPt: "Apoie apenas o peito do p\xE9 atr\xE1s e empurre o ch\xE3o com o p\xE9 da frente.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.bulgarian_split_squat,
    media: createPlannedExerciseMedia(
      "bulgarian_split_squat",
      "Dumbbell Bulgarian split squat with rear foot elevated on bench",
      "Agachamento b\xFAlgaro com halteres e p\xE9 traseiro apoiado no banco"
    )
  },
  leg_extension: {
    id: "leg_extension",
    name: "Leg Extension Machine",
    namePt: "Cadeira Extensora",
    primaryMuscle: "quads",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 55,
    restSeconds: 60,
    notes: "Control both upward squeeze and slow lowering without swinging.",
    notesPt: "Controle a extens\xE3o no topo e des\xE7a devagar sem usar impulso.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.leg_extension,
    media: createPlannedExerciseMedia(
      "leg_extension",
      "Seated leg extension machine extending knees cleanly",
      "Cadeira extensora com joelhos alinhados ao eixo da m\xE1quina"
    )
  },
  hack_squat_machine: {
    id: "hack_squat_machine",
    name: "Hack Squat Machine",
    namePt: "Agachamento Hack na M\xE1quina",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 120,
    restSeconds: 90,
    notes: "Keep heels flat on platform and hips pressed against sled pad.",
    notesPt: "Mantenha os calcanhares firmes na plataforma e a lombar apoiada no carrinho.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.hack_squat_machine,
    media: createPlannedExerciseMedia(
      "hack_squat_machine",
      "Hack squat machine lowering sled under control with back supported",
      "Agachamento hack na m\xE1quina mantendo costas e quadril apoiados"
    )
  },
  // === HAMSTRINGS (7) ===
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
    guide: EXERCISE_GUIDE.romanian_deadlift,
    media: createPlannedExerciseMedia(
      "romanian_deadlift",
      "Barbell Romanian deadlift hinging hips with soft knee bend",
      "Stiff RDL com barra mantendo joelhos semiflexionados e quadril para tr\xE1s"
    )
  },
  db_romanian_deadlift: {
    id: "db_romanian_deadlift",
    name: "Dumbbell Romanian Deadlift",
    namePt: "Stiff / RDL com Halteres",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 26,
    restSeconds: 75,
    notes: "Keep dumbbells close to legs and hinge hips back with flat spine.",
    notesPt: "Mantenha os halteres rente \xE0s pernas e leve o quadril para tr\xE1s com coluna neutra.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.db_romanian_deadlift,
    media: createPlannedExerciseMedia(
      "db_romanian_deadlift",
      "Dumbbell Romanian deadlift keeping weights close along thighs",
      "Stiff com halteres deslizando pr\xF3ximo \xE0s coxas com coluna neutra"
    )
  },
  seated_leg_curl: {
    id: "seated_leg_curl",
    name: "Seated Leg Curl Machine",
    namePt: "Cadeira Flexora",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["calves"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 50,
    restSeconds: 60,
    notes: "Lock thigh pad snugly and flex heels completely under seat.",
    notesPt: "Trave bem o apoio sobre as coxas e flexione os joelhos por completo.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.seated_leg_curl,
    media: createPlannedExerciseMedia(
      "seated_leg_curl",
      "Seated leg curl machine flexing hamstrings smoothly",
      "Cadeira flexora executando flex\xE3o completa dos joelhos"
    )
  },
  lying_leg_curl: {
    id: "lying_leg_curl",
    name: "Lying Leg Curl Machine",
    namePt: "Mesa Flexora",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["calves"],
    category: "machine",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 45,
    restSeconds: 60,
    notes: "Keep hips pressed flat against bench while curling heels to glutes.",
    notesPt: "Mantenha o quadril colado no banco ao flexionar os calcanhares em dire\xE7\xE3o aos gl\xFAteos.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.lying_leg_curl,
    media: createPlannedExerciseMedia(
      "lying_leg_curl",
      "Prone lying leg curl machine keeping hips pressed flat on pad",
      "Mesa flexora deitada mantendo o quadril firme no apoio"
    )
  },
  good_morning: {
    id: "good_morning",
    name: "Barbell Good Morning",
    namePt: "Bom Dia com Barra (Good Morning)",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    category: "barbell",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 50,
    restSeconds: 90,
    notes: "Brace core and push hips back cleanly without rounding lumbar spine.",
    notesPt: "Trave o abd\xF4men e leve o quadril para tr\xE1s mantendo a coluna neutra.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.good_morning,
    media: createPlannedExerciseMedia(
      "good_morning",
      "Standing barbell good morning hip hinge with soft knees",
      "Bom dia com barra em p\xE9 executando flex\xE3o controlada de quadril"
    )
  },
  single_leg_rdl_bw: {
    id: "single_leg_rdl_bw",
    name: "Single-Leg Bodyweight RDL",
    namePt: "Stiff Unilateral com Peso Corporal",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep pelvis square to the floor as rear leg extends behind you.",
    notesPt: "Mantenha o quadril nivelado voltado ao solo enquanto estende a perna livre atr\xE1s.",
    tempo: "3-0-1-0",
    guide: EXERCISE_GUIDE.single_leg_rdl_bw,
    media: createPlannedExerciseMedia(
      "single_leg_rdl_bw",
      "Single-leg bodyweight Romanian deadlift maintaining square hips",
      "Stiff unilateral sem carga mantendo a pelve alinhada"
    )
  },
  band_leg_curl: {
    id: "band_leg_curl",
    name: "Resistance Band Leg Curl",
    namePt: "Flexora com El\xE1stico",
    primaryMuscle: "hamstrings",
    secondaryMuscles: [],
    category: "bands",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Keep hips flat on mat and control return against band tension.",
    notesPt: "Mantenha o quadril encostado no solo e controle a extens\xE3o da perna.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.band_leg_curl,
    media: createPlannedExerciseMedia(
      "band_leg_curl",
      "Prone resistance band hamstring curl anchored low behind ankles",
      "Flexora deitada com el\xE1stico preso em ponto baixo nos tornozelos"
    )
  },
  // === GLUTES (8) ===
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
    guide: EXERCISE_GUIDE.glute_bridge,
    media: createPlannedExerciseMedia(
      "glute_bridge",
      "Floor glute bridge driving hips up through heels",
      "Eleva\xE7\xE3o p\xE9lvica no solo estendendo o quadril pelos calcanhares"
    )
  },
  barbell_hip_thrust: {
    id: "barbell_hip_thrust",
    name: "Barbell Hip Thrust",
    namePt: "Eleva\xE7\xE3o P\xE9lvica com Barra (Hip Thrust)",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings", "quads"],
    category: "barbell",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 100,
    restSeconds: 90,
    notes: "Tuck chin slightly, keep shins vertical at top, and squeeze glutes.",
    notesPt: "Mantenha as canelas verticais no topo e contraia os gl\xFAteos sem hiperestender a lombar.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.barbell_hip_thrust,
    media: createPlannedExerciseMedia(
      "barbell_hip_thrust",
      "Barbell hip thrust with upper back resting on flat bench",
      "Eleva\xE7\xE3o p\xE9lvica com barra e esc\xE1pulas apoiadas no banco"
    )
  },
  db_sumo_squat: {
    id: "db_sumo_squat",
    name: "Dumbbell Sumo Squat",
    namePt: "Agachamento Sum\xF4 com Halter",
    primaryMuscle: "glutes",
    secondaryMuscles: ["quads", "hamstrings"],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 28,
    restSeconds: 75,
    notes: "Wide stance with toes out ~35\xB0 and knees tracking over toes.",
    notesPt: "Base afastada com pontas dos p\xE9s para fora (~35\xB0) e joelhos acompanhando os p\xE9s.",
    tempo: "3-1-1-0",
    guide: EXERCISE_GUIDE.db_sumo_squat,
    media: createPlannedExerciseMedia(
      "db_sumo_squat",
      "Wide-stance dumbbell sumo squat holding single dumbbell vertically",
      "Agachamento sum\xF4 com halter em base ampla segurando o peso ao centro"
    )
  },
  cable_glute_kickback: {
    id: "cable_glute_kickback",
    name: "Cable Glute Kickback",
    namePt: "Coice para Gl\xFAteos na Polia",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 15,
    restSeconds: 60,
    notes: "Keep torso still and extend hip strictly backward without lumbar arch.",
    notesPt: "Mantenha o tronco est\xE1vel e estenda o quadril para tr\xE1s sem arquear a lombar.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.cable_glute_kickback,
    media: createPlannedExerciseMedia(
      "cable_glute_kickback",
      "Standing cable glute kickback using ankle cuff on low pulley",
      "Coice para gl\xFAteos na polia baixa com tornozeleira"
    )
  },
  hip_abduction_machine: {
    id: "hip_abduction_machine",
    name: "Seated Hip Abduction Machine",
    namePt: "Cadeira Abdutora",
    primaryMuscle: "glutes",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 55,
    restSeconds: 60,
    notes: "Drive knees outward smoothly and pause 1 second at full abduction.",
    notesPt: "Afaste os joelhos de forma controlada e pause 1 segundo na abertura m\xE1xima.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.hip_abduction_machine,
    media: createPlannedExerciseMedia(
      "hip_abduction_machine",
      "Seated hip abduction machine pressing knees outward against pads",
      "Cadeira abdutora empurrando os joelhos para fora sob controle"
    )
  },
  single_leg_glute_bridge: {
    id: "single_leg_glute_bridge",
    name: "Single-Leg Glute Bridge",
    namePt: "Eleva\xE7\xE3o P\xE9lvica Unilateral no Solo",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings", "core"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Keep hips level without rotating pelvis as you drive through heel.",
    notesPt: "Mantenha a pelve nivelada sem girar o quadril ao empurrar pelo calcanhar.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.single_leg_glute_bridge,
    media: createPlannedExerciseMedia(
      "single_leg_glute_bridge",
      "Single-leg floor glute bridge with one leg extended",
      "Eleva\xE7\xE3o p\xE9lvica unilateral no solo mantendo a pelve estabilizada"
    )
  },
  band_hip_thrust: {
    id: "band_hip_thrust",
    name: "Resistance Band Glute Bridge",
    namePt: "Eleva\xE7\xE3o P\xE9lvica com El\xE1stico",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Press knees gently outward against band tension during ascent.",
    notesPt: "Empurre os joelhos levemente para fora contra a resist\xEAncia do el\xE1stico na subida.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.band_hip_thrust,
    media: createPlannedExerciseMedia(
      "band_hip_thrust",
      "Floor glute bridge against resistance band placed across hips",
      "Eleva\xE7\xE3o p\xE9lvica no solo com resist\xEAncia de el\xE1stico sobre o quadril"
    )
  },
  cable_pull_through: {
    id: "cable_pull_through",
    name: "Cable Pull-Through",
    namePt: "Extens\xE3o de Quadril na Polia (Pull-Through)",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings", "back"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 30,
    restSeconds: 60,
    notes: "Hinge hips back keeping arms straight and finish with glute squeeze.",
    notesPt: "Leve o quadril para tr\xE1s com bra\xE7os estendidos e finalize contraindo os gl\xFAteos.",
    tempo: "2-1-1-0",
    guide: EXERCISE_GUIDE.cable_pull_through,
    media: createPlannedExerciseMedia(
      "cable_pull_through",
      "Standing cable rope pull-through hip hinge facing away from low pulley",
      "Pull-through com corda na polia baixa executando extens\xE3o de quadril"
    )
  },
  // === CALVES (5) ===
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
    guide: EXERCISE_GUIDE.standing_calf,
    media: createPlannedExerciseMedia(
      "standing_calf",
      "Standing calf raise on machine showing full ankle plantar flexion",
      "G\xEAmeos em p\xE9 na m\xE1quina executando flex\xE3o plantar completa"
    )
  },
  seated_calf_raise: {
    id: "seated_calf_raise",
    name: "Seated Calf Raise Machine",
    namePt: "Panturrilha Sentado na M\xE1quina",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 4,
    defaultReps: 15,
    defaultWeight: 40,
    restSeconds: 60,
    notes: "Full stretch at bottom and pause 1 second at top.",
    notesPt: "Alongue totalmente na descida e sustente 1 segundo no ponto alto.",
    tempo: "2-2-1-1",
    guide: EXERCISE_GUIDE.seated_calf_raise,
    media: createPlannedExerciseMedia(
      "seated_calf_raise",
      "Seated calf raise machine targeting soleus through full ankle range",
      "Panturrilha sentado na m\xE1quina com amplitude completa do tornozelo"
    )
  },
  single_leg_bw_calf_raise: {
    id: "single_leg_bw_calf_raise",
    name: "Single-Leg Bodyweight Calf Raise",
    namePt: "Panturrilha Unilateral no Degrau",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Pause at bottom stretch on step edge without bouncing.",
    notesPt: "Pause no alongamento na borda do degrau sem quicar.",
    tempo: "2-2-1-1",
    guide: EXERCISE_GUIDE.single_leg_bw_calf_raise,
    media: createPlannedExerciseMedia(
      "single_leg_bw_calf_raise",
      "Single-leg bodyweight calf raise performed on step edge",
      "Eleva\xE7\xE3o unilateral de panturrilha sem carga na borda de degrau"
    )
  },
  db_standing_calf_raise: {
    id: "db_standing_calf_raise",
    name: "Dumbbell Standing Calf Raise",
    namePt: "Panturrilha em P\xE9 com Halteres",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 18,
    restSeconds: 60,
    notes: "Keep ankles straight and rise evenly through the balls of feet.",
    notesPt: "Mantenha os tornozelos alinhados e suba pressionando a base dos dedos.",
    tempo: "2-1-1-1",
    guide: EXERCISE_GUIDE.db_standing_calf_raise,
    media: createPlannedExerciseMedia(
      "db_standing_calf_raise",
      "Standing calf raise holding dumbbells at sides on elevated block",
      "Panturrilha em p\xE9 com halteres segurados ao lado do corpo sobre degrau"
    )
  },
  leg_press_calf_raise: {
    id: "leg_press_calf_raise",
    name: "Leg Press Calf Press",
    namePt: "Panturrilha no Leg Press",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 120,
    restSeconds: 60,
    notes: "Keep knees softly unlocked and flex ankles cleanly.",
    notesPt: "Mantenha os joelhos levemente destravados e fa\xE7a a flex\xE3o plantar completa.",
    tempo: "2-1-1-1",
    guide: EXERCISE_GUIDE.leg_press_calf_raise,
    media: createPlannedExerciseMedia(
      "leg_press_calf_raise",
      "Calf press performed on bottom edge of 45 degree leg press sled",
      "Panturrilha no leg press 45 graus com p\xE9s na borda inferior da plataforma"
    )
  },
  // === CORE (11) ===
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
    guide: EXERCISE_GUIDE.hanging_leg_raise,
    media: createPlannedExerciseMedia(
      "hanging_leg_raise",
      "Hanging leg raise from pull-up bar with controlled pelvic curl",
      "Eleva\xE7\xE3o de pernas suspenso na barra fixa com retrovers\xE3o p\xE9lvica"
    )
  },
  plank: {
    id: "plank",
    name: "Forearm Plank",
    namePt: "Prancha Isom\xE9trica no Antebra\xE7o",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders", "glutes"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 1,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Hold 30\u201360s bracing abs and glutes with straight spine.",
    notesPt: "Sustente 30\u201360s contraindo abd\xF4men e gl\xFAteos com coluna alinhada.",
    tempo: "Isometric 45s",
    guide: EXERCISE_GUIDE.plank,
    media: createPlannedExerciseMedia(
      "plank",
      "Forearm plank maintaining neutral straight line from head to heels",
      "Prancha isom\xE9trica no antebra\xE7o mantendo corpo reto e est\xE1vel"
    )
  },
  side_plank: {
    id: "side_plank",
    name: "Side Plank",
    namePt: "Prancha Lateral",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders", "glutes"],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 1,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Hold 30\u201345s per side stacking elbow cleanly under shoulder.",
    notesPt: "Sustente 30\u201345s por lado com o cotovelo alinhado exatamente sob o ombro.",
    tempo: "Isometric 30s",
    guide: EXERCISE_GUIDE.side_plank,
    media: createPlannedExerciseMedia(
      "side_plank",
      "Side forearm plank holding straight lateral alignment",
      "Prancha lateral apoiada no antebra\xE7o sustentando o quadril elevado"
    )
  },
  dead_bug: {
    id: "dead_bug",
    name: "Dead Bug",
    namePt: "Inseto Morto (Dead Bug)",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Keep lower back pressed continuously against the floor.",
    notesPt: "Mantenha a lombar pressionada contra o solo durante todo o movimento.",
    tempo: "2-1-2-0",
    guide: EXERCISE_GUIDE.dead_bug,
    media: createPlannedExerciseMedia(
      "dead_bug",
      "Supine dead bug extending opposite arm and leg with flat lower back",
      "Dead bug em dec\xFAbito dorsal estendendo bra\xE7o e perna opostos"
    )
  },
  bicycle_crunch: {
    id: "bicycle_crunch",
    name: "Bicycle Crunch",
    namePt: "Abdominal Bicicleta",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 20,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Rotate shoulders deliberately toward opposite knee without pulling neck.",
    notesPt: "Gire os ombros em dire\xE7\xE3o ao joelho oposto sem puxar o pesco\xE7o.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.bicycle_crunch,
    media: createPlannedExerciseMedia(
      "bicycle_crunch",
      "Supine bicycle crunch rotating torso toward opposite knee",
      "Abdominal bicicleta alternando rota\xE7\xE3o controlada de tronco"
    )
  },
  hollow_body_hold: {
    id: "hollow_body_hold",
    name: "Hollow Body Hold",
    namePt: "Canoinha Isom\xE9trica (Hollow Hold)",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "bodyweight",
    defaultSets: 3,
    defaultReps: 1,
    defaultWeight: 0,
    restSeconds: 60,
    notes: "Hold 20\u201340s pressing lower back firmly into the mat.",
    notesPt: "Sustente 20\u201340s mantendo a lombar firmemente pressionada contra o ch\xE3o.",
    tempo: "Isometric 30s",
    guide: EXERCISE_GUIDE.hollow_body_hold,
    media: createPlannedExerciseMedia(
      "hollow_body_hold",
      "Hollow body isometric hold with lower back anchored to floor",
      "Canoinha isom\xE9trica mantendo a lombar pressionada no solo"
    )
  },
  cable_woodchopper: {
    id: "cable_woodchopper",
    name: "Cable Woodchopper",
    namePt: "Rota\xE7\xE3o de Tronco na Polia (Woodchopper)",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders"],
    category: "cable",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 17.5,
    restSeconds: 60,
    notes: "Rotate through ribcage and core while keeping arms extended.",
    notesPt: "Gire o tronco pela musculatura do core mantendo os bra\xE7os estendidos.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.cable_woodchopper,
    media: createPlannedExerciseMedia(
      "cable_woodchopper",
      "Standing diagonal cable woodchopper rotating torso cleanly",
      "Rota\xE7\xE3o diagonal na polia (woodchopper) ativando obl\xEDquos e core"
    )
  },
  cable_crunch: {
    id: "cable_crunch",
    name: "Kneeling Cable Crunch",
    namePt: "Abdominal Supra na Polia",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "cable",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 35,
    restSeconds: 60,
    notes: "Keep hips stationary and curl spine toward pelvis.",
    notesPt: "Mantenha o quadril fixo e flexione a coluna levando as costelas \xE0 pelve.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.cable_crunch,
    media: createPlannedExerciseMedia(
      "cable_crunch",
      "Kneeling cable rope crunch flexing thoracic and lumbar spine",
      "Abdominal ajoelhado na polia alta com corda flexionando a coluna"
    )
  },
  db_russian_twist: {
    id: "db_russian_twist",
    name: "Dumbbell Russian Twist",
    namePt: "Tor\xE7\xE3o Russa com Halter",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "dumbbell",
    defaultSets: 3,
    defaultReps: 16,
    defaultWeight: 10,
    restSeconds: 45,
    notes: "Rotate torso side to side deliberately with chest proud.",
    notesPt: "Gire o tronco lado a lado com controle mantendo o peito aberto.",
    tempo: "2-0-1-0",
    guide: EXERCISE_GUIDE.db_russian_twist,
    media: createPlannedExerciseMedia(
      "db_russian_twist",
      "Seated dumbbell Russian twist rotating shoulders side to side",
      "Tor\xE7\xE3o russa sentada com halter girando os ombros lateralmente"
    )
  },
  ab_crunch_machine: {
    id: "ab_crunch_machine",
    name: "Abdominal Crunch Machine",
    namePt: "Abdominal na M\xE1quina",
    primaryMuscle: "core",
    secondaryMuscles: [],
    category: "machine",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 40,
    restSeconds: 60,
    notes: "Exhale during crunch and control return without jerking.",
    notesPt: "Expire durante a flex\xE3o do tronco e controle o retorno sem trancos.",
    tempo: "2-0-1-1",
    guide: EXERCISE_GUIDE.ab_crunch_machine,
    media: createPlannedExerciseMedia(
      "ab_crunch_machine",
      "Seated abdominal crunch machine flexing ribcage cleanly",
      "Abdominal sentado na m\xE1quina flexionando o tronco sob controle"
    )
  },
  band_pallof_press: {
    id: "band_pallof_press",
    name: "Band Pallof Press",
    namePt: "Pallof Press Anti-Rota\xE7\xE3o com El\xE1stico",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders"],
    category: "bands",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    restSeconds: 45,
    notes: "Press hands straight out from chest resisting lateral rotation.",
    notesPt: "Empurre as m\xE3os \xE0 frente do peito resistindo ao giro lateral do el\xE1stico.",
    tempo: "2-1-2-0",
    guide: EXERCISE_GUIDE.band_pallof_press,
    media: createPlannedExerciseMedia(
      "band_pallof_press",
      "Standing anti-rotation resistance band Pallof press",
      "Pallof press em p\xE9 resistindo \xE0 rota\xE7\xE3o com el\xE1stico lateral"
    )
  }
};

// src/data/presetRoutines.ts
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
var exerciseMediaTypes = ["webp", "avif", "image", "svg", "gif", "lottie", "mp4", "webm"];
var exerciseMediaStatuses = ["planned", "published", "missing", "invalid"];
var requestFatigueLevels = ["fresh", "normal", "fatigued"];
var requestGoals = ["hypertrophy", "strength", "endurance", "deload"];
var allowedRoutineFields = ["title", "category", "targetDurationMinutes", "difficulty", "targetMuscles", "xpReward", "coachingNotes", "exercises"];
var allowedExerciseFields = [
  "exerciseId",
  "name",
  "namePt",
  "primaryMuscle",
  "secondaryMuscles",
  "category",
  "equipmentRequired",
  "defaultWeight",
  "defaultReps",
  "setsCount",
  "targetRestSeconds",
  "tempo",
  "notes",
  "notesPt",
  "media"
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOnlyFields(value, allowedFields) {
  return Object.keys(value).every((field) => allowedFields.includes(field));
}
function isEquipmentList(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && TRAINING_EQUIPMENT.includes(item));
}
function isValidExternalMediaUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
function isValidExerciseMedia(media) {
  if (!isRecord(media)) return false;
  if (!isValidExternalMediaUrl(media.imageUrl)) return false;
  if (typeof media.alt !== "string" || media.alt.trim().length === 0 || media.alt.length > 300) return false;
  if (media.altPt !== void 0 && (typeof media.altPt !== "string" || media.altPt.trim().length === 0 || media.altPt.length > 300)) return false;
  if (media.animationUrl !== void 0 && !isValidExternalMediaUrl(media.animationUrl)) return false;
  if (media.videoUrl !== void 0 && !isValidExternalMediaUrl(media.videoUrl)) return false;
  if (typeof media.mediaType !== "string" || !exerciseMediaTypes.includes(media.mediaType)) return false;
  if (typeof media.assetId !== "string" || media.assetId.trim().length === 0 || media.assetId.length > 120) return false;
  if (typeof media.version !== "string" || media.version.trim().length === 0 || media.version.length > 40) return false;
  if (media.status !== void 0 && (typeof media.status !== "string" || !exerciseMediaStatuses.includes(media.status))) {
    return false;
  }
  if (media.verifiedAt !== void 0 && (typeof media.verifiedAt !== "string" || media.verifiedAt.trim().length === 0 || Number.isNaN(Date.parse(media.verifiedAt)))) {
    return false;
  }
  if (media.source !== void 0 && (typeof media.source !== "string" || media.source.trim().length === 0 || media.source.length > 120)) {
    return false;
  }
  return true;
}
function hasExerciseMediaMetadata(exercise) {
  return Boolean(exercise && isValidExerciseMedia(exercise.media));
}
function hasVerifiedExerciseMedia(exercise) {
  if (!exercise || !isValidExerciseMedia(exercise.media)) return false;
  return exercise.media.status === "published" && typeof exercise.media.verifiedAt === "string" && !Number.isNaN(Date.parse(exercise.media.verifiedAt));
}
function hasValidExerciseMedia(exercise) {
  return hasVerifiedExerciseMedia(exercise);
}
function getExerciseEligibilityStatus(exercise, availableEquipment) {
  if (!exercise) {
    return {
      registered: false,
      hasMediaMetadata: false,
      hasPublishedVerifiedMedia: false,
      equipmentCompatible: false,
      eligibleForAi: false,
      reason: "not_registered"
    };
  }
  const hasMediaMetadata = hasExerciseMediaMetadata(exercise);
  const hasPublishedVerifiedMedia = hasVerifiedExerciseMedia(exercise);
  const equipmentCompatible = availableEquipment ? isEquipmentList(availableEquipment) && isEquipmentAvailable(exercise.category, availableEquipment, exercise.equipmentRequired) : true;
  if (!hasMediaMetadata) {
    return {
      registered: true,
      hasMediaMetadata: false,
      hasPublishedVerifiedMedia: false,
      equipmentCompatible,
      eligibleForAi: false,
      reason: "missing_media_metadata"
    };
  }
  if (!hasPublishedVerifiedMedia) {
    return {
      registered: true,
      hasMediaMetadata: true,
      hasPublishedVerifiedMedia: false,
      equipmentCompatible,
      eligibleForAi: false,
      reason: "media_not_published_or_verified"
    };
  }
  if (!equipmentCompatible) {
    return {
      registered: true,
      hasMediaMetadata: true,
      hasPublishedVerifiedMedia: true,
      equipmentCompatible: false,
      eligibleForAi: false,
      reason: "incompatible_equipment"
    };
  }
  return {
    registered: true,
    hasMediaMetadata: true,
    hasPublishedVerifiedMedia: true,
    equipmentCompatible: true,
    eligibleForAi: true,
    reason: "eligible"
  };
}
function getEligibleCatalogExercises(availableEquipment, catalog = EXERCISE_DATABASE) {
  if (!isEquipmentList(availableEquipment)) return [];
  return Object.values(catalog).filter((exercise) => getExerciseEligibilityStatus(exercise, availableEquipment).eligibleForAi).sort((left, right) => left.id.localeCompare(right.id));
}
function getCompatibleCatalogExercises(availableEquipment, catalog = EXERCISE_DATABASE) {
  if (!isEquipmentList(availableEquipment)) return [];
  return Object.values(catalog).filter((exercise) => isEquipmentAvailable(exercise.category, availableEquipment, exercise.equipmentRequired)).sort((left, right) => left.id.localeCompare(right.id));
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
function validateGeneratedWorkout(value, availableEquipment, options = {}) {
  const catalog = options.catalog ?? EXERCISE_DATABASE;
  const language = options.language ?? "pt";
  const allowUnpublishedMedia = options.allowUnpublishedMedia === true;
  if (!isRecord(value) || !hasOnlyFields(value, allowedRoutineFields) || !isEquipmentList(availableEquipment)) return null;
  const candidate = value;
  if (typeof candidate.title !== "string" || candidate.title.trim().length === 0 || candidate.title.length > 100 || !routineCategories.includes(candidate.category) || !routineDifficulties.includes(candidate.difficulty) || !Array.isArray(candidate.targetMuscles) || candidate.targetMuscles.length === 0 || candidate.targetMuscles.length > maximumTargetMuscles || !candidate.targetMuscles.every((muscle) => muscleGroups.includes(muscle)) || new Set(candidate.targetMuscles).size !== candidate.targetMuscles.length || !Array.isArray(candidate.exercises) || candidate.exercises.length === 0 || candidate.exercises.length > maximumExercises || candidate.coachingNotes !== void 0 && (typeof candidate.coachingNotes !== "string" || candidate.coachingNotes.length > 500)) return null;
  const seenExerciseIds = /* @__PURE__ */ new Set();
  const exercises = [];
  for (const rawExercise of candidate.exercises) {
    if (!isRecord(rawExercise) || !hasOnlyFields(rawExercise, allowedExerciseFields)) return null;
    const exercise = rawExercise;
    if (typeof exercise.exerciseId !== "string" || exercise.exerciseId.trim().length === 0 || exercise.exerciseId.length > 100) {
      return null;
    }
    const exerciseId = exercise.exerciseId.trim();
    if (seenExerciseIds.has(exerciseId)) {
      return null;
    }
    seenExerciseIds.add(exerciseId);
    const catalogExercise = catalog[exerciseId];
    if (!catalogExercise) {
      return null;
    }
    if (!allowUnpublishedMedia && !hasValidExerciseMedia(catalogExercise)) {
      return null;
    }
    if (!isEquipmentAvailable(catalogExercise.category, availableEquipment, catalogExercise.equipmentRequired)) {
      return null;
    }
    if (exercise.category !== void 0 && !exerciseCategories.includes(exercise.category)) {
      return null;
    }
    if (exercise.primaryMuscle !== void 0 && !muscleGroups.includes(exercise.primaryMuscle)) {
      return null;
    }
    if (exercise.secondaryMuscles !== void 0 && (!Array.isArray(exercise.secondaryMuscles) || !exercise.secondaryMuscles.every((m) => typeof m === "string" && muscleGroups.includes(m)))) {
      return null;
    }
    if (exercise.equipmentRequired !== void 0 && (!Array.isArray(exercise.equipmentRequired) || !exercise.equipmentRequired.every((item) => typeof item === "string" && TRAINING_EQUIPMENT.includes(item)))) {
      return null;
    }
    if (exercise.name !== void 0 && (typeof exercise.name !== "string" || exercise.name.trim().length === 0 || exercise.name.length > 100)) {
      return null;
    }
    if (exercise.namePt !== void 0 && (typeof exercise.namePt !== "string" || exercise.namePt.trim().length === 0 || exercise.namePt.length > 100)) {
      return null;
    }
    if (exercise.media !== void 0 && !isValidExerciseMedia(exercise.media)) {
      return null;
    }
    const optionalTextFields = ["tempo", "notes", "notesPt"];
    if (typeof exercise.defaultWeight !== "number" || !Number.isFinite(exercise.defaultWeight) || exercise.defaultWeight < 0 || exercise.defaultWeight > 500 || typeof exercise.defaultReps !== "number" || !Number.isInteger(exercise.defaultReps) || exercise.defaultReps < 1 || exercise.defaultReps > 30 || typeof exercise.setsCount !== "number" || !Number.isInteger(exercise.setsCount) || exercise.setsCount < 1 || exercise.setsCount > 12 || typeof exercise.targetRestSeconds !== "number" || !Number.isInteger(exercise.targetRestSeconds) || exercise.targetRestSeconds < 0 || exercise.targetRestSeconds > 600) return null;
    if (optionalTextFields.some(
      (field) => exercise[field] !== void 0 && (typeof exercise[field] !== "string" || exercise[field].length > (field === "tempo" ? 30 : 300))
    )) return null;
    const authoritativeName = language === "pt" ? catalogExercise.namePt || catalogExercise.name : catalogExercise.name;
    const resolvedNotes = typeof exercise.notes === "string" && exercise.notes.trim().length > 0 ? exercise.notes.trim() : language === "pt" ? catalogExercise.notesPt || catalogExercise.notes : catalogExercise.notes;
    const resolvedNotesPt = typeof exercise.notesPt === "string" && exercise.notesPt.trim().length > 0 ? exercise.notesPt.trim() : catalogExercise.notesPt;
    const resolvedTempo = typeof exercise.tempo === "string" && exercise.tempo.trim().length > 0 ? exercise.tempo.trim() : catalogExercise.tempo;
    exercises.push({
      exerciseId: catalogExercise.id,
      name: authoritativeName,
      ...catalogExercise.namePt ? { namePt: catalogExercise.namePt } : {},
      primaryMuscle: catalogExercise.primaryMuscle,
      ...catalogExercise.secondaryMuscles?.length ? { secondaryMuscles: [...catalogExercise.secondaryMuscles] } : {},
      category: catalogExercise.category,
      defaultWeight: exercise.defaultWeight,
      defaultReps: exercise.defaultReps,
      setsCount: exercise.setsCount,
      targetRestSeconds: exercise.targetRestSeconds,
      ...catalogExercise.equipmentRequired?.length ? { equipmentRequired: [...catalogExercise.equipmentRequired] } : {},
      ...resolvedTempo ? { tempo: resolvedTempo } : {},
      ...resolvedNotes ? { notes: resolvedNotes } : {},
      ...resolvedNotesPt ? { notesPt: resolvedNotesPt } : {},
      ...catalogExercise.media ? { media: { ...catalogExercise.media } } : {}
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
function validateAndAdaptGeneratedWorkout(value, availableEquipment, experience, options = {}) {
  const validated = validateGeneratedWorkout(value, availableEquipment, options);
  if (!validated) return null;
  const adapted = adaptGeneratedWorkout(validated, experience);
  return validateGeneratedWorkout(adapted, availableEquipment, options);
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
var exerciseCatalog = {
  current: EXERCISE_DATABASE
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
    const activeCatalog = exerciseCatalog.current;
    const compatibleExercises = getCompatibleCatalogExercises(allowedEquipment, activeCatalog);
    if (compatibleExercises.length === 0) {
      return res.status(422).json({
        success: false,
        message: "N\xE3o h\xE1 exerc\xEDcios cadastrados para os equipamentos selecionados."
      });
    }
    const eligibleExercises = getEligibleCatalogExercises(allowedEquipment, activeCatalog);
    if (!geminiClient.current && process.env.GEMINI_API_KEY) {
      geminiClient.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    if (!geminiClient.current || eligibleExercises.length === 0) {
      const routine = generateProfileFallback(
        focus,
        durationMinutes,
        language,
        allowedEquipment,
        experienceLevel,
        profileGoals,
        activeCatalog
      );
      const validatedFallback = routine ? validateAndAdaptGeneratedWorkout(routine, allowedEquipment, experienceLevel, {
        language,
        catalog: activeCatalog,
        allowUnpublishedMedia: true
      }) : null;
      if (!validatedFallback) {
        return res.status(422).json({ success: false, message: "N\xE3o h\xE1 exerc\xEDcios cadastrados para os equipamentos selecionados." });
      }
      return res.status(200).json({
        success: true,
        isFallback: true,
        message: !geminiClient.current ? "No API key provided, generated via local kinetic engine" : "No exercises with verified published media available for AI selection; generated via local kinetic engine",
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
      const catalogPromptLines = eligibleExercises.map((exercise) => {
        const reqPart = exercise.equipmentRequired?.length ? ` | required: ${exercise.equipmentRequired.join(",")}` : "";
        return `- ${exercise.id} | ${exercise.name} (${exercise.namePt}) | muscle: ${exercise.primaryMuscle} | category: ${exercise.category}${reqPart} | defaultSets: ${exercise.defaultSets} | defaultReps: ${exercise.defaultReps} | rest: ${exercise.restSeconds}s`;
      }).join("\n");
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

Eligible Catalog Exercises (you MUST select ONLY from these exact exerciseId values; NEVER invent free-form exercise names or IDs):
${catalogPromptLines}

Coaching Directives:
1. Select ONLY exercises whose exact exerciseId appears in "Eligible Catalog Exercises" above. Do NOT invent new exercises, do NOT repeat the same exerciseId twice in a routine, and do NOT select exercises outside the eligible list.
2. Prioritize and intelligently incorporate the athlete's most frequent exercises (or compatible progressions from the eligible catalog) matching their focus and goals.
3. Prescribe realistic defaultWeight in kg (0 for bodyweight/bands), defaultReps, setsCount, targetRestSeconds, and optional tempo/notes tailored to the athlete's experience and fatigue level.
4. Use the request variation seed to vary exercise selection, order, rep ranges, loads, and rest periods while strictly respecting the catalog and duration constraints.

Respond ONLY with valid JSON (no markdown formatting, no code block backticks) adhering strictly to this schema:
{
  "title": "string (Creative athletic title)",
  "category": "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body" | "Cardio & Core",
  "targetDurationMinutes": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Hardcore",
  "targetMuscles": ["chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "calves" | "core" | "glutes"],
  "xpReward": integer from 0 to 5000 (e.g. 380),
  "coachingNotes": "string (1 concise motivational tactical sentence)",
  "exercises": [
    {
      "exerciseId": "string (EXACT exerciseId from Eligible Catalog Exercises above, unique within this array)",
      "defaultWeight": number (in kg, from 0 to 500),
      "defaultReps": integer (from 1 to 30),
      "setsCount": integer (from 1 to 12),
      "targetRestSeconds": integer (from 0 to 600),
      "tempo": "string (optional, e.g. 3-0-1-0)",
      "notes": "string (optional concise form cue)"
    }
  ]
}
Constraints: targetDurationMinutes is an integer from 10 to 240. Include 1\u20136 unique targetMuscles, matching the exact primaryMuscle values of the selected catalog exercises. Include 1\u20135 unique eligible exercises (never duplicate an exerciseId; if fewer than 4 eligible exercises exist, use up to the available count). Keep coachingNotes to 1 concise sentence. defaultWeight must be from 0 to 500 kg; defaultReps an integer from 1 to 30; setsCount an integer from 1 to 12; targetRestSeconds an integer from 0 to 600. Total sets must not exceed two thirds of targetDurationMinutes (rounded down). Use only declared fields; do not add fields.
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
      const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
      const modelConfig = {
        responseMimeType: "application/json",
        abortSignal: abortController.signal
      };
      if (modelName.includes("3.") || modelName.includes("gemini-4")) {
        modelConfig.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW
        };
      }
      const response = await Promise.race([
        geminiClient.current.models.generateContent({
          model: modelName,
          contents: prompt,
          config: modelConfig
        }),
        timeoutPromise
      ]);
      const text = response.text || "";
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanJson);
      const personalizedRoutine = validateAndAdaptGeneratedWorkout(parsedData, allowedEquipment, experienceLevel, {
        language,
        catalog: activeCatalog
      });
      if (!personalizedRoutine) {
        throw new Error("Gemini returned an invalid, non-catalog, unverified-media, or equipment-incompatible workout");
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
        profileGoals,
        activeCatalog
      );
      const validatedFallback = fallback ? validateAndAdaptGeneratedWorkout(fallback, allowedEquipment, experienceLevel, {
        language,
        catalog: activeCatalog,
        allowUnpublishedMedia: true
      }) : null;
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
function generateProfileFallback(focus, duration, language, equipment, experience, goals, catalog = exerciseCatalog.current) {
  const isPt = language !== "en";
  const fallback = generateFallbackRoutine(focus, duration, language, catalog);
  const focusText = focus.toLowerCase();
  const prefersFullBody = focusText.includes("full") || goals.some((goal) => goal === "weight_loss" || goal === "fitness" || goal === "health");
  const focusLower = focus.toLowerCase();
  const focusMuscleMap = {
    push: ["chest", "shoulders", "triceps"],
    pull: ["back", "biceps", "hamstrings"],
    legs: ["quads", "glutes", "hamstrings", "calves"],
    upper: ["chest", "back", "shoulders", "biceps", "triceps"],
    lower: ["quads", "glutes", "hamstrings", "calves"],
    core: ["core"]
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
    const compatible = Object.values(catalog).filter(
      (exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired) && targetFocusMuscles.includes(exercise.primaryMuscle)
    ).sort((left, right) => left.id.localeCompare(right.id));
    const count = Math.min(compatible.length, 5);
    exercises = compatible.slice(0, count).map((exercise) => ({
      exerciseId: exercise.id,
      name: isPt ? exercise.namePt : exercise.name,
      ...exercise.namePt ? { namePt: exercise.namePt } : {},
      primaryMuscle: exercise.primaryMuscle,
      ...exercise.secondaryMuscles?.length ? { secondaryMuscles: exercise.secondaryMuscles } : {},
      category: exercise.category,
      ...exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {},
      // Fallback sem avaliação individual: não prescreve carga. O usuário ajusta pela técnica e pelo esforço percebido (RPE).
      defaultWeight: 0,
      defaultReps: exercise.defaultReps,
      setsCount: experience === "beginner" ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || "",
      notes: exercise.notes || "",
      ...exercise.notesPt ? { notesPt: exercise.notesPt } : {},
      ...exercise.media ? { media: exercise.media } : {}
    }));
  }
  if (exercises.length === 0) {
    exercises = [];
  }
  const needsExerciseCatalogFallback = exercises.length === 0;
  if (prefersFullBody || needsExerciseCatalogFallback) {
    const compatible = Object.values(catalog).filter(
      (exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired)
    ).sort((left, right) => left.id.localeCompare(right.id)).slice(0, 5);
    exercises = compatible.map((exercise) => ({
      exerciseId: exercise.id,
      name: isPt ? exercise.namePt : exercise.name,
      ...exercise.namePt ? { namePt: exercise.namePt } : {},
      primaryMuscle: exercise.primaryMuscle,
      ...exercise.secondaryMuscles?.length ? { secondaryMuscles: exercise.secondaryMuscles } : {},
      category: exercise.category,
      ...exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {},
      // Fallback sem avaliação individual: não prescreve carga. O usuário ajusta pela técnica e pelo esforço percebido (RPE).
      defaultWeight: 0,
      defaultReps: exercise.defaultReps,
      setsCount: experience === "beginner" ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || "",
      notes: exercise.notes || "",
      ...exercise.notesPt ? { notesPt: exercise.notesPt } : {},
      ...exercise.media ? { media: exercise.media } : {}
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
  return validateGeneratedWorkout(candidate, equipment, {
    language,
    catalog,
    allowUnpublishedMedia: true
  });
}
function buildFallbackExerciseEntry(exerciseId, isPt, catalog = exerciseCatalog.current) {
  const ex = catalog[exerciseId];
  if (!ex) return null;
  return {
    exerciseId: ex.id,
    name: isPt ? ex.namePt : ex.name,
    ...ex.namePt ? { namePt: ex.namePt } : {},
    primaryMuscle: ex.primaryMuscle,
    ...ex.secondaryMuscles?.length ? { secondaryMuscles: ex.secondaryMuscles } : {},
    category: ex.category,
    ...ex.equipmentRequired ? { equipmentRequired: ex.equipmentRequired } : {},
    defaultWeight: 0,
    defaultReps: ex.defaultReps,
    setsCount: ex.defaultSets,
    targetRestSeconds: ex.restSeconds,
    ...ex.tempo ? { tempo: ex.tempo } : {},
    ...ex.notes ? { notes: ex.notes } : {},
    ...ex.notesPt ? { notesPt: ex.notesPt } : {},
    ...ex.media ? { media: ex.media } : {}
  };
}
function generateFallbackRoutine(focus, duration, language, catalog = exerciseCatalog.current) {
  const isPt = language !== "en";
  const focusStr = focus.toLowerCase();
  if (focusStr.includes("pull") || focusStr.includes("costas") || focusStr.includes("back")) {
    const entries2 = ["barbell_deadlift", "lat_pulldown", "barbell_row", "barbell_curl"].map((id) => buildFallbackExerciseEntry(id, isPt, catalog)).filter((entry) => entry !== null);
    return {
      title: isPt ? "Pull Din\xE2mico: Dorsais & B\xEDceps" : "Dynamic Pull: Lats & Posterior Power",
      category: "Pull",
      targetDurationMinutes: duration,
      difficulty: "Advanced",
      targetMuscles: ["back", "biceps"],
      xpReward: 380,
      coachingNotes: isPt ? "Foque em puxar com os cotovelos e sustentar 1s no pico de contra\xE7\xE3o." : "Drive with your elbows and pause for 1s at peak contraction.",
      exercises: entries2
    };
  }
  const entries = ["bench_press", "incline_db_press", "lateral_raise", "tricep_pushdown"].map((id) => buildFallbackExerciseEntry(id, isPt, catalog)).filter((entry) => entry !== null);
  return {
    title: isPt ? "Push Alfa: Peitorais & Tr\xEDceps" : "Alpha Push: Chest & Deltoid Force",
    category: "Push",
    targetDurationMinutes: duration,
    difficulty: "Advanced",
    targetMuscles: ["chest", "shoulders", "triceps"],
    xpReward: 380,
    coachingNotes: isPt ? "Controle a fase exc\xEAntrica da descida para gerar o m\xE1ximo de est\xEDmulo hipertr\xF3fico." : "Control the eccentric descent to maximize mechanical hypertrophy tension.",
    exercises: entries
  };
}

// src/server/apiHandler.ts
var config = {
  maxDuration: 30
};
var MAX_PAYLOAD_BYTES = 10240;
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
  const rawContentLength = req.headers?.["content-length"];
  if (rawContentLength) {
    const contentLength = Number(Array.isArray(rawContentLength) ? rawContentLength[0] : rawContentLength);
    if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
      sendJson(413, { success: false, message: "Corpo da requisi\xE7\xE3o excede o limite permitido." });
      return;
    }
  }
  if (req.body !== void 0 && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.byteLength > MAX_PAYLOAD_BYTES) {
        sendJson(413, { success: false, message: "Corpo da requisi\xE7\xE3o excede o limite permitido." });
        return;
      }
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch {
        sendJson(400, { success: false, message: "Corpo JSON inv\xE1lido." });
        return;
      }
      executeHandler();
      return;
    }
    if (typeof req.body === "string") {
      if (Buffer.byteLength(req.body, "utf8") > MAX_PAYLOAD_BYTES) {
        sendJson(413, { success: false, message: "Corpo da requisi\xE7\xE3o excede o limite permitido." });
        return;
      }
      try {
        req.body = JSON.parse(req.body);
      } catch {
        sendJson(400, { success: false, message: "Corpo JSON inv\xE1lido." });
        return;
      }
      executeHandler();
      return;
    }
    let serialized;
    try {
      serialized = JSON.stringify(req.body);
    } catch {
      sendJson(400, { success: false, message: "Corpo JSON inv\xE1lido." });
      return;
    }
    if (typeof serialized !== "string") {
      sendJson(400, { success: false, message: "Corpo JSON inv\xE1lido." });
      return;
    }
    if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
      sendJson(413, { success: false, message: "Corpo da requisi\xE7\xE3o excede o limite permitido." });
      return;
    }
    executeHandler();
    return;
  }
  let receivedBytes = 0;
  const chunks = [];
  let exceeded = false;
  req.on("data", (chunk) => {
    if (exceeded) return;
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
    receivedBytes += buf.byteLength;
    if (receivedBytes > MAX_PAYLOAD_BYTES) {
      exceeded = true;
      sendJson(413, { success: false, message: "Corpo da requisi\xE7\xE3o excede o limite permitido." });
      return;
    }
    chunks.push(buf);
  });
  req.on("end", () => {
    if (exceeded) return;
    const bodyBuffer = Buffer.concat(chunks);
    const bodyStr = bodyBuffer.toString("utf8");
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
  MAX_PAYLOAD_BYTES,
  config,
  generateWorkoutHandler as default
};
