export interface ExerciseGuide {
  description: string;
  descriptionPt: string;
  commonMistakes?: string;
  commonMistakesPt?: string;
}

export const EXERCISE_GUIDE: Record<string, ExerciseGuide> = {
  // === CHEST (11) ===
  bench_press: {
    description: 'Barbell Hold: Keep shoulder blades retracted, grip slightly wider than shoulder width, and press vertically while driving feet firmly into the floor.',
    descriptionPt: 'Execução: Mantenha as escápulas retraídas, segure a barra ligeiramente além da largura dos ombros e empurre verticalmente, firmando os pés no chão.',
    commonMistakes: 'Flaring elbows to 90 degrees, bouncing the bar off the chest, or lifting glutes off the bench.',
    commonMistakesPt: 'Abrir os cotovelos a 90 graus, quicar a barra no peito ou tirar o quadril do banco.',
  },
  incline_db_press: {
    description: 'Dumbbell Hold: Set the bench to 30°, lower the weights with a deep stretch at the bottom and press while leading with your elbows up to the shoulder plane.',
    descriptionPt: 'Execução: Ajuste o banco a 30°, desça os halteres com alongamento profundo na base e empurre conduzindo os cotovelos alinhados ao plano dos ombros.',
    commonMistakes: 'Setting bench angle too steep (>45°) shifting load to anterior delts, or clanking dumbbells together at the top.',
    commonMistakesPt: 'Inclinar o banco em excesso (>45°) transferindo carga para os ombros, ou bater os halteres no topo.',
  },
  cable_fly: {
    description: 'Cable Hold: Keep a slight bend in your elbows, bring the handles together at chest height and squeeze your pecs for 1 second at peak contraction.',
    descriptionPt: 'Execução: Mantenha leve flexão nos cotovelos, aproxime os pegadores na altura do peitoral e aperte por 1 segundo na contração máxima.',
    commonMistakes: 'Turning the fly into a press by bending elbows excessively, or swinging torso forward.',
    commonMistakesPt: 'Transformar o crucifixo em supino flexionando demais os cotovelos, ou balançar o tronco à frente.',
  },
  push_up: {
    description: 'Push-Up: Maintain rigid plank core, lower chest to floor with elbows at 45 degree angle.',
    descriptionPt: 'Execução: Mantenha o corpo em prancha alinhada e desça o peito próximo ao chão com os cotovelos a 45 graus.',
    commonMistakes: 'Letting hips sag toward the floor, flaring elbows wide, or cutting range of motion short.',
    commonMistakesPt: 'Deixar o quadril cair, abrir excessivamente os cotovelos ou fazer repetições curtas sem descer o peito.',
  },
  band_chest_press: {
    description: 'Band Press: Anchor band behind torso, press forward in a straight line without arching back.',
    descriptionPt: 'Execução: Prenda o elástico atrás do corpo e empurre à frente em linha reta sem curvar a coluna.',
    commonMistakes: 'Losing core tension and arching lower back, or letting band snap back quickly during the eccentric.',
    commonMistakesPt: 'Perder a firmeza do abdômen arqueando a lombar, ou deixar o elástico voltar sem controle.',
  },
  incline_barbell_press: {
    description: 'Incline Barbell Press: Set bench at 30–35°, retract shoulder blades, lower bar to upper chest below clavicles, and press smoothly upward.',
    descriptionPt: 'Execução: Ajuste o banco entre 30° e 35°, retraia as escápulas, desça a barra até a parte superior do peitoral e empurre de forma controlada.',
    commonMistakes: 'Touching the bar too low on the sternum or losing upper-back tightness.',
    commonMistakesPt: 'Descer a barra muito abaixo do peitoral superior ou perder a retração escapular.',
  },
  db_bench_press: {
    description: 'Flat Dumbbell Press: Start with dumbbells stacked over shoulders, lower to chest level with elbows angled ~45°, and press back up evenly.',
    descriptionPt: 'Execução: Comece com os halteres alinhados aos ombros, desça até a linha do peitoral com cotovelos a ~45° e empurre simultaneamente.',
    commonMistakes: 'Dropping dumbbells rapidly at the bottom or pressing unevenly between left and right arms.',
    commonMistakesPt: 'Descer os halteres sem controle na base ou empurrar de forma assimétrica entre os lados.',
  },
  db_fly: {
    description: 'Flat Dumbbell Fly: Maintain a soft fixed bend in elbows, open arms in a wide arc until a controlled chest stretch, then bring weights back over sternum.',
    descriptionPt: 'Execução: Mantenha leve flexão fixa nos cotovelos, abra os braços em arco até alongar o peitoral e retorne os halteres acima do esterno.',
    commonMistakes: 'Overstretching shoulders below bench line with heavy load or bending elbows into a press.',
    commonMistakesPt: 'Descer os braços além da linha do ombro com carga alta ou dobrar os cotovelos transformando em supino.',
  },
  chest_press_machine: {
    description: 'Seated Chest Press Machine: Adjust seat height so handles align with mid-chest, brace shoulder blades against pad, and press to near lockout.',
    descriptionPt: 'Execução: Ajuste o banco para que as manoplas fiquem na linha média do peitoral, apoie as escápulas e empurre sem travar os cotovelos.',
    commonMistakes: 'Protracting shoulders forward off the backrest at the end of the press.',
    commonMistakesPt: 'Descolar os ombros e escápulas do encosto ao final da extensão.',
  },
  pec_deck_fly: {
    description: 'Pec Deck Machine: Set seat so elbows remain slightly below shoulder height, bring pads or handles smoothly together, and control the eccentric.',
    descriptionPt: 'Execução: Regule o assento com os cotovelos levemente abaixo dos ombros, aproxime os braços da máquina e controle a abertura.',
    commonMistakes: 'Shrugging shoulders upward or slamming weight plates between repetitions.',
    commonMistakesPt: 'Elevar os ombros em direção às orelhas ou bater as placas de peso a cada repetição.',
  },
  decline_push_up: {
    description: 'Decline Push-Up: Elevate feet on a stable bench, brace glutes and core, lower upper chest toward floor, and press back smoothly.',
    descriptionPt: 'Execução: Apoie os pés em um banco estável, contraia abdômen e glúteos, desça o peitoral superior em direção ao chão e empurre.',
    commonMistakes: 'Dropping the head forward or letting the lower back hyperextend.',
    commonMistakesPt: 'Projetar a cabeça para baixo antes do tronco ou deixar a lombar ceder.',
  },

  // === BACK (12) ===
  barbell_deadlift: {
    description: 'Conventional Deadlift: Pull slack out of the bar, brace abdomen, and explode through hips keeping bar against shins.',
    descriptionPt: 'Execução: Retire a folga da barra, trave o abdômen e suba empurrando o chão com o quadril, mantendo a barra rente às canelas.',
    commonMistakes: 'Rounding the lumbar spine, jerking the bar off the floor, or letting the bar drift away from the legs.',
    commonMistakesPt: 'Arredondar a lombar, dar tranco para tirar a barra do chão ou afastar a barra das pernas.',
  },
  lat_pulldown: {
    description: 'Lat Pulldown: Depress scapula first, pull bar down towards upper clavicle and squeeze lats.',
    descriptionPt: 'Execução: Deprima as escápulas antes de puxar, traga a barra em direção à parte superior do peito e aperte as dorsais.',
    commonMistakes: 'Leaning back excessively to turn it into a row, or pulling the bar behind the neck.',
    commonMistakesPt: 'Inclinar demais o tronco para trás usando impulso ou puxar a barra atrás da nuca.',
  },
  barbell_row: {
    description: 'Bent-Over Row: Torso locked at 45 degrees, pull bar towards lower ribcage while driving elbows back.',
    descriptionPt: 'Execução: Mantenha o tronco firme a 45 graus e puxe a barra em direção às costelas inferiores direcionando os cotovelos para trás.',
    commonMistakes: 'Raising the torso upright on every rep or curling with biceps instead of retracting scapulae.',
    commonMistakesPt: 'Levantar o tronco a cada repetição para usar impulso ou puxar apenas com os braços.',
  },
  prone_snow_angels: {
    description: 'Prone Angels: Lie face down, keep chest lightly raised, and glide arms in a wide controlled arc.',
    descriptionPt: 'Execução: Deitado de bruços, eleve levemente o peito e mova os braços em arco amplo e controlado ativando as costas.',
    commonMistakes: 'Hyperextending the neck by looking straight up or rushing the arc.',
    commonMistakesPt: 'Forçar a cervical olhando muito para cima ou acelerar o movimento sem controle escapular.',
  },
  band_row: {
    description: 'Band Row: Anchor band securely, pull elbows back along ribs and squeeze shoulder blades.',
    descriptionPt: 'Execução: Prenda o elástico à frente e puxe os cotovelos em direção às costelas unindo as escápulas.',
    commonMistakes: 'Shrugging traps toward ears or leaning backward with momentum.',
    commonMistakesPt: 'Encolher os ombros em direção às orelhas ou jogar o tronco para trás.',
  },
  pull_up: {
    description: 'Pull-Up: Grip bar wider than shoulder width palms facing away, depress shoulders, and pull chest toward bar until chin clears.',
    descriptionPt: 'Execução: Segure a barra em pegada pronada além da largura dos ombros, encaixe as escápulas e puxe até o queixo passar da barra.',
    commonMistakes: 'Kipping with legs, rounding shoulders forward at top, or doing half-reps without full arm extension.',
    commonMistakesPt: 'Dar impulso com as pernas, projetar os ombros para frente no topo ou não estender os braços na descida.',
  },
  chin_up: {
    description: 'Chin-Up: Grip bar shoulder-width palms facing you, brace core, and pull elbows down toward ribs until chin clears bar.',
    descriptionPt: 'Execução: Segure a barra em pegada supinada na largura dos ombros, estabilize o core e puxe até o queixo ultrapassar a barra.',
    commonMistakes: 'Swinging legs forward or stopping short of full scapular stretch at the bottom.',
    commonMistakesPt: 'Balançar as pernas à frente ou interromper a descida antes de estender os braços.',
  },
  one_arm_db_row: {
    description: 'Single-Arm Dumbbell Row: Brace opposite hand and knee on bench with flat back, pull dumbbell toward hip while keeping torso square.',
    descriptionPt: 'Execução: Apoie mão e joelho opostos no banco com a coluna neutra e puxe o halter em direção ao quadril mantendo o tronco alinhado.',
    commonMistakes: 'Rotating torso excessively to heave weight or pulling straight up to the chest instead of toward the hip.',
    commonMistakesPt: 'Girar o tronco para roubar a subida ou puxar em linha reta para o ombro em vez do quadril.',
  },
  seated_cable_row: {
    description: 'Seated Cable Row: Sit tall with slight knee bend, pull handle to lower abdomen while squeezing shoulder blades together.',
    descriptionPt: 'Execução: Sente-se com a coluna ereta e joelhos semiflexionados, puxe o pegador até o abdômen inferior unindo as escápulas.',
    commonMistakes: 'Flexing lower back forward on extension or leaning too far back at lockout.',
    commonMistakesPt: 'Curvar a lombar na volta ou inclinar demais o tronco para trás no final da puxada.',
  },
  straight_arm_pulldown: {
    description: 'Straight-Arm Pulldown: Hinge slightly at hips with elbows softly locked, sweep bar or rope from overhead down to thighs using lats.',
    descriptionPt: 'Execução: Incline levemente o quadril com cotovelos quase estendidos e leve a barra da altura acima da cabeça até as coxas contraindo o dorsal.',
    commonMistakes: 'Bending elbows into a tricep pushdown or swinging upper body.',
    commonMistakesPt: 'Flexionar os cotovelos transformando em tríceps ou balançar o tronco.',
  },
  chest_supported_row_machine: {
    description: 'Machine Chest-Supported Row: Press chest firmly against pad, pull handles back driving elbows behind torso, pause briefly at squeeze.',
    descriptionPt: 'Execução: Apoie firmemente o peito no encosto da máquina, puxe as alavancas levando os cotovelos atrás da linha do tronco e controle o retorno.',
    commonMistakes: 'Lifting chest off the pad to gain momentum or shrugging upper traps.',
    commonMistakesPt: 'Descolar o peito do apoio para gerar impulso ou tensionar excessivamente o trapézio superior.',
  },
  band_lat_pulldown: {
    description: 'Band Lat Pulldown: Anchor band overhead, kneel or sit tall, and pull handles down to upper chest keeping elbows tucked slightly forward.',
    descriptionPt: 'Execução: Prenda o elástico acima da cabeça, ajoelhe-se ou sente com coluna firme e puxe até a linha superior do peito.',
    commonMistakes: 'Flaring elbows behind torso or allowing band to pull shoulders upward awkwardly.',
    commonMistakesPt: 'Jogar os cotovelos muito para trás ou perder o alinhamento dos ombros na volta.',
  },

  // === SHOULDERS (10) ===
  overhead_press: {
    description: 'Barbell Hold: Lock your glutes and core, keep the bar close to your body and press vertically in a tight bar path without flaring the elbows outward.',
    descriptionPt: 'Execução: Contraia glúteos e abdômen, mantenha a barra próxima ao corpo e empurre verticalmente em trajetória firme, sem abrir excessivamente os cotovelos.',
    commonMistakes: 'Hyperextending the lower back, pushing the bar forward away from face, or bending knees for momentum.',
    commonMistakesPt: 'Hiperestender a lombar, empurrar a barra para frente longe do rosto ou dar impulso com os joelhos.',
  },
  lateral_raise: {
    description: 'Dumbbell Hold: Keep a slight lean in your torso and lead with your elbows up to the shoulder plane, raising the weights only to shoulder height.',
    descriptionPt: 'Execução: Incline levemente o tronco à frente e eleve os halteres conduzindo pelos cotovelos até a altura dos ombros.',
    commonMistakes: 'Swinging hips for momentum, lifting weights above shoulder height, or shrugging traps.',
    commonMistakesPt: 'Balançar o tronco para subir a carga, passar muito da linha dos ombros ou encolher o trapézio.',
  },
  seated_db_shoulder_press: {
    description: 'Seated Dumbbell Press: Keep back supported against upright bench, start dumbbells at ear level with elbows slightly forward, and press overhead.',
    descriptionPt: 'Execução: Apoie as costas no banco vertical, posicione os halteres na altura das orelhas com cotovelos levemente à frente e empurre acima da cabeça.',
    commonMistakes: 'Flaring elbows completely flat to the sides or arching the lower back off the pad.',
    commonMistakesPt: 'Abrir os cotovelos totalmente na linha lateral ou desencostar a lombar do banco.',
  },
  front_db_raise: {
    description: 'Dumbbell Front Raise: Stand tall with braced core, raise dumbbells smoothly in front of torso to shoulder height with soft elbows.',
    descriptionPt: 'Execução: Em pé com o core firme, eleve os halteres à frente do corpo até a altura dos ombros mantendo leve flexão nos cotovelos.',
    commonMistakes: 'Leaning backward to swing heavy dumbbells upward.',
    commonMistakesPt: 'Jogar o tronco para trás usando balanço para subir o peso.',
  },
  rear_delt_db_fly: {
    description: 'Bent-Over Rear Delt Fly: Hinge torso near parallel with neutral spine, raise dumbbells out to sides squeezing posterior delts.',
    descriptionPt: 'Execução: Incline o tronco à frente com coluna neutra e abra os braços lateralmente contraindo a porção posterior dos ombros.',
    commonMistakes: 'Rounding the back or pinching shoulder blades solely with traps instead of sweeping arms wide.',
    commonMistakesPt: 'Arredondar a coluna ou puxar apenas com o trapézio sem afastar os braços.',
  },
  cable_lateral_raise: {
    description: 'Single-Arm Cable Lateral Raise: Set pulley at wrist height, stand sideways, and sweep arm smoothly to shoulder height with constant cable tension.',
    descriptionPt: 'Execução: Ajuste a polia na altura do punho, posicione-se lateralmente e eleve o braço até a altura do ombro sob tensão contínua.',
    commonMistakes: 'Using torso tilt to yank the cable off the bottom or shrugging the shoulder.',
    commonMistakesPt: 'Inclinar o tronco para puxar o cabo no início ou elevar o ombro.',
  },
  cable_face_pull: {
    description: 'Cable Face Pull: Set rope at upper-chest or face height, pull ends toward temples while externally rotating shoulders and separating hands.',
    descriptionPt: 'Execução: Ajuste a corda na altura do rosto, puxe em direção às têmporas afastando as mãos e fazendo rotação externa dos ombros.',
    commonMistakes: 'Pulling elbows below hands instead of keeping wrists and elbows aligned, or leaning back excessively.',
    commonMistakesPt: 'Deixar os cotovelos caírem abaixo das mãos ou inclinar demais o tronco para trás.',
  },
  shoulder_press_machine: {
    description: 'Machine Shoulder Press: Adjust seat so handles start near chin/shoulder height, keep head and back against pad, and press vertically.',
    descriptionPt: 'Execução: Ajuste o assento para as manoplas iniciarem na altura dos ombros, mantenha costas apoiadas e empurre verticalmente.',
    commonMistakes: 'Locking elbows forcefully at the top or dropping weights onto the stack.',
    commonMistakesPt: 'Travar os cotovelos com impacto no topo ou soltar o peso bruscamente.',
  },
  pike_push_up: {
    description: 'Pike Push-Up: Form an inverted V with hips high, lower top of head forward between hands, and press back up strongly through shoulders.',
    descriptionPt: 'Execução: Forme um V invertido elevando o quadril, desça o topo da cabeça à frente da linha das mãos e empurre com os ombros.',
    commonMistakes: 'Turning the movement into a regular push-up by dropping hips, or flaring elbows wide.',
    commonMistakesPt: 'Abaixar o quadril transformando em flexão comum ou abrir demais os cotovelos.',
  },
  band_pull_apart: {
    description: 'Band Pull-Apart: Hold band at shoulder height with straight arms, pull band apart until it touches chest while squeezing rear delts.',
    descriptionPt: 'Execução: Segure o elástico à frente na altura dos ombros com braços estendidos e abra até encostar no peitoral ativando os posteriores de ombro.',
    commonMistakes: 'Bending elbows during the pull or arching the lower back as arms open.',
    commonMistakesPt: 'Dobrar os cotovelos durante a abertura ou hiperestender a lombar.',
  },

  // === BICEPS (8) ===
  barbell_curl: {
    description: 'Barbell Curl: Keep elbows pinned to sides, curl bar in smooth arc with zero back momentum.',
    descriptionPt: 'Execução: Firme os cotovelos ao lado das costelas e suba a barra em arco contínuo sem balançar o tronco.',
    commonMistakes: 'Swinging the lower back to initiate the curl or letting elbows drift far forward.',
    commonMistakesPt: 'Balançar a lombar para iniciar a subida ou projetar os cotovelos excessivamente para frente.',
  },
  db_bicep_curl: {
    description: 'Alternating Dumbbell Curl: Keep elbows tucked at sides, curl one dumbbell while supinating wrist smoothly, lower fully before alternating.',
    descriptionPt: 'Execução: Mantenha os cotovelos próximos às costelas, eleve um halter girando a palma para cima e controle toda a descida.',
    commonMistakes: 'Dropping dumbbells quickly on the eccentric or rocking torso side to side.',
    commonMistakesPt: 'Soltar o halter na descida sem controle ou balançar o tronco lateralmente.',
  },
  hammer_curl: {
    description: 'Dumbbell Hammer Curl: Hold dumbbells with neutral palms facing torso, curl without twisting wrists, keeping upper arms still.',
    descriptionPt: 'Execução: Segure os halteres em pegada neutra (palmas voltadas para o corpo) e flexione os cotovelos sem girar os punhos.',
    commonMistakes: 'Shrugging shoulders up or swinging elbows back and forth.',
    commonMistakesPt: 'Elevar os ombros ou balançar os cotovelos durante a execução.',
  },
  incline_db_curl: {
    description: 'Incline Dumbbell Curl: Sit on 45° incline bench letting arms hang vertically behind torso, curl dumbbells without moving elbows forward.',
    descriptionPt: 'Execução: Sentado no banco a 45° com os braços pendentes atrás da linha do tronco, flexione os cotovelos mantendo-os apontados para baixo.',
    commonMistakes: 'Swinging elbows forward to shorten the lever arm or lifting shoulders off the bench.',
    commonMistakesPt: 'Projetar os cotovelos para frente durante a subida ou desencostar os ombros do banco.',
  },
  concentration_curl: {
    description: 'Concentration Curl: Sit with back of upper arm braced against inner thigh, curl dumbbell slowly toward shoulder and squeeze at peak.',
    descriptionPt: 'Execução: Sentado, apoie a parte posterior do braço na face interna da coxa e flexione o cotovelo de forma concentrada.',
    commonMistakes: 'Using leg movement or torso lean to help lift the dumbbell.',
    commonMistakesPt: 'Impulsionar com a perna ou inclinar o tronco para ajudar a subir o peso.',
  },
  cable_bicep_curl: {
    description: 'Cable Bicep Curl: Stand upright holding straight or EZ attachment from low pulley, curl smoothly keeping elbows stationary.',
    descriptionPt: 'Execução: Em pé com pegada na polia baixa, flexione os cotovelos mantendo os braços estáveis junto ao corpo sob tensão constante.',
    commonMistakes: 'Stepping too close to the pulley or leaning back at the top.',
    commonMistakesPt: 'Ficar próximo demais da polia perdendo tensão ou jogar o tronco para trás.',
  },
  preacher_curl_machine: {
    description: 'Preacher Curl Machine: Align elbows with machine pivot axis and rest triceps flat on pad, curl handles smoothly without lifting elbows.',
    descriptionPt: 'Execução: Alinhe os cotovelos ao eixo da máquina com os tríceps bem apoiados no suporte e flexione sem levantar os braços.',
    commonMistakes: 'Hyperextending elbows violently at the bottom or lifting chest/armpits off pad.',
    commonMistakesPt: 'Estender os cotovelos com tranco no final da descida ou tirar as axilas do apoio.',
  },
  band_bicep_curl: {
    description: 'Band Bicep Curl: Step firmly on band center, keep elbows pinned to sides, and curl handles upward controlling the return.',
    descriptionPt: 'Execução: Pise firme no centro do elástico, fixe os cotovelos junto ao tronco e flexione os braços controlando a descida.',
    commonMistakes: 'Unstable footing causing uneven tension or letting elbows flare outward.',
    commonMistakesPt: 'Desequilíbrio na pisada gerando tensão desigual ou abrir os cotovelos.',
  },

  // === TRICEPS (8) ===
  tricep_pushdown: {
    description: 'Rope Pushdown: Flare rope outward at full extension for lateral head peak and keep elbows pinned to torso.',
    descriptionPt: 'Execução: Mantenha os cotovelos colados ao tronco e afaste as pontas da corda na extensão total para contrair a cabeça lateral do tríceps.',
    commonMistakes: 'Letting elbows flare forward/backward or pressing body weight onto the cable.',
    commonMistakesPt: 'Deixar os cotovelos avançarem para frente/trás ou jogar o peso do corpo sobre a corda.',
  },
  overhead_cable_tricep_ext: {
    description: 'Overhead Cable Extension: Face away from pulley with rope overhead, keep elbows pointed forward and extend arms cleanly above head.',
    descriptionPt: 'Execução: De costas para a polia com a corda acima da cabeça, mantenha os cotovelos apontados para frente e estenda os antebraços.',
    commonMistakes: 'Flaring elbows wide outward or arching the lumbar spine excessively.',
    commonMistakesPt: 'Abrir excessivamente os cotovelos para os lados ou arquear a lombar.',
  },
  skull_crusher: {
    description: 'Lying Barbell Triceps Extension: Lie flat with upper arms slightly angled back, bend elbows to lower bar behind forehead, then extend.',
    descriptionPt: 'Execução: Deitado no banco com braços levemente inclinados atrás, flexione os cotovelos levando a barra acima da testa e estenda.',
    commonMistakes: 'Flaring elbows out to the sides or swinging upper arms forward/backward like a pullover.',
    commonMistakesPt: 'Abrir os cotovelos para fora ou balançar os ombros como um pullover.',
  },
  close_grip_bench_press: {
    description: 'Close-Grip Bench Press: Grip barbell roughly shoulder-width, keep elbows tucked close to ribs on descent, and press smoothly upward.',
    descriptionPt: 'Execução: Segure a barra na largura dos ombros, desça mantendo os cotovelos próximos às costelas e empurre com foco no tríceps.',
    commonMistakes: 'Gripping hands too narrow (<15 cm) straining wrists, or flaring elbows wide.',
    commonMistakesPt: 'Pegada fechada em excesso sobrecarregando os punhos ou abrir os cotovelos.',
  },
  db_overhead_tricep_ext: {
    description: 'Overhead Dumbbell Extension: Hold one dumbbell vertically overhead with both hands, lower slowly behind head, and extend without moving elbows wide.',
    descriptionPt: 'Execução: Segure um halter acima da cabeça com as duas mãos, desça controladamente atrás da nuca e estenda os cotovelos.',
    commonMistakes: 'Hyperextending lower back while seated/standing or flaring elbows wide.',
    commonMistakesPt: 'Hiperestender a lombar durante a descida ou afastar os cotovelos lateralmente.',
  },
  db_tricep_kickback: {
    description: 'Dumbbell Triceps Kickback: Hinge torso forward with upper arm parallel to floor, extend forearm back to full contraction and lower with control.',
    descriptionPt: 'Execução: Incline o tronco à frente mantendo o braço paralelo ao chão e estenda o antebraço para trás contraindo o tríceps.',
    commonMistakes: 'Dropping the upper arm downward or swinging the dumbbell with momentum.',
    commonMistakesPt: 'Abaixar o cotovelo durante a extensão ou usar impulso de balanço.',
  },
  diamond_push_up: {
    description: 'Diamond Push-Up: Place hands close under chest forming a triangle with thumbs and index fingers, keep core tight, and lower chest toward hands.',
    descriptionPt: 'Execução: Posicione as mãos próximas sob o peitoral formando um diamante, mantenha o corpo firme e desça o peito em direção às mãos.',
    commonMistakes: 'Letting hips sag or flaring elbows excessively outward straining shoulders.',
    commonMistakesPt: 'Deixar o quadril cair ou abrir os cotovelos demais sobrecarregando os ombros.',
  },
  band_tricep_pushdown: {
    description: 'Band Triceps Pushdown: Anchor band overhead, pin elbows to sides, and extend arms downward to lockout with controlled return.',
    descriptionPt: 'Execução: Prenda o elástico acima da cabeça, firme os cotovelos junto ao corpo e estenda os braços para baixo.',
    commonMistakes: 'Moving shoulders forward or losing elbow anchor against the ribs.',
    commonMistakesPt: 'Projetar os ombros para frente ou desencostar os cotovelos das costelas.',
  },

  // === QUADS (10) ===
  barbell_squat: {
    description: 'Back Squat: Hit parallel depth or lower with knees tracking over toes, bracing core throughout.',
    descriptionPt: 'Execução: Agache até as coxas ficarem paralelas ao chão com joelhos alinhados aos pés, mantendo o abdômen pressurizado.',
    commonMistakes: 'Knees caving inward (valgus), heels lifting off the floor, or rounding the lower back at depth.',
    commonMistakesPt: 'Joelhos fechando para dentro (valgo), calcanhares saindo do chão ou arredondamento da lombar na base.',
  },
  leg_press: {
    description: 'Leg Press: Full range of motion without letting lower back round or lift off the seat pad.',
    descriptionPt: 'Execução: Desça o carrinho com amplitude completa garantindo que a lombar permaneça 100% apoiada no encosto.',
    commonMistakes: 'Locking knees completely straight at the top or curling pelvis off the seat.',
    commonMistakesPt: 'Travar os joelhos totalmente no topo ou tirar o quadril/lombar do assento na descida.',
  },
  bodyweight_squat: {
    description: 'Air Squat: Chest tall, push knees outward over toes, and sink below parallel.',
    descriptionPt: 'Execução: Mantenha o peito aberto, projete os joelhos para fora na linha dos pés e agache até a paralela.',
    commonMistakes: 'Letting knees collapse inward or leaning chest onto thighs.',
    commonMistakesPt: 'Deixar os joelhos caírem para dentro ou inclinar demais o tronco à frente.',
  },
  reverse_lunge: {
    description: 'Reverse Lunge: Step back smoothly, keeping front knee stacked directly over ankle.',
    descriptionPt: 'Execução: Dê o passo para trás de forma controlada, mantendo o joelho da frente alinhado sobre o tornozelo.',
    commonMistakes: 'Stepping on a tightrope causing balance loss, or slamming the rear knee onto the floor.',
    commonMistakesPt: 'Alinhar os pés em linha reta perdendo o equilíbrio ou bater o joelho de trás no chão.',
  },
  band_squat: {
    description: 'Band Squat: Step on band loop, maintain tension at top and keep knees tracking over toes.',
    descriptionPt: 'Execução: Pise sobre o elástico segurando as pontas nos ombros e agache mantendo a tensão firme durante todo o movimento.',
    commonMistakes: 'Allowing the band tension to pull the upper spine into flexion.',
    commonMistakesPt: 'Deixar a tração do elástico curvar a coluna para frente.',
  },
  front_barbell_squat: {
    description: 'Front Squat: Rest barbell across front delts with elbows high, keep torso upright, and squat deep pushing through midfoot.',
    descriptionPt: 'Execução: Apoie a barra nos deltóides anteriores com cotovelos elevados, mantenha o tronco vertical e agache com controle.',
    commonMistakes: 'Dropping elbows on descent causing the bar to roll forward, or heels lifting.',
    commonMistakesPt: 'Abaixar os cotovelos na descida fazendo a barra escorregar para frente, ou tirar os calcanhares do chão.',
  },
  goblet_squat: {
    description: 'Goblet Squat: Hold dumbbell vertically against upper chest, sit hips between heels keeping elbows inside knees, and drive up tall.',
    descriptionPt: 'Execução: Segure o halter na vertical junto ao peito, agache encaixando o quadril entre os pés com tronco erguido e suba firme.',
    commonMistakes: 'Holding the weight away from the chest or rounding the upper back.',
    commonMistakesPt: 'Afastar o halter do peito cansando os braços ou curvar a coluna dorsal.',
  },
  bulgarian_split_squat: {
    description: 'Bulgarian Split Squat: Place rear instep on bench behind you, lower front thigh parallel to floor keeping front shin stable, and drive through front heel.',
    descriptionPt: 'Execução: Apoie o peito do pé traseiro no banco atrás, desça até a coxa da frente ficar paralela ao solo e empurre pelo calcanhar dianteiro.',
    commonMistakes: 'Standing too close to the bench pushing front knee awkwardly, or pushing mostly with the back leg.',
    commonMistakesPt: 'Ficar próximo demais do banco ou fazer força excessiva com a perna de trás.',
  },
  leg_extension: {
    description: 'Leg Extension Machine: Align knee joint with machine pivot, keep hips glued to seat, extend legs smoothly and pause briefly at peak.',
    descriptionPt: 'Execução: Alinhe os joelhos ao eixo da máquina, mantenha o quadril firme no banco, estenda as pernas e controle a descida.',
    commonMistakes: 'Swinging shins rapidly with momentum or lifting glutes off the seat.',
    commonMistakesPt: 'Chutar a carga com impulso ou levantar o quadril do banco no topo.',
  },
  hack_squat_machine: {
    description: 'Hack Squat Machine: Press back and hips firmly against sled pad, place feet shoulder-width, lower under control and press without locking knees.',
    descriptionPt: 'Execução: Apoie costas e quadril totalmente no carrinho, posicione os pés na plataforma, desça com controle e empurre sem travar os joelhos.',
    commonMistakes: 'Heels lifting off the footplate or hyperextending knees at lockout.',
    commonMistakesPt: 'Descolar os calcanhares da plataforma ou travar os joelhos no topo.',
  },

  // === HAMSTRINGS (7) ===
  romanian_deadlift: {
    description: 'RDL: Push hips backward with soft knee bend, lowering bar along thighs until massive hamstring stretch.',
    descriptionPt: 'Execução: Empurre o quadril para trás com joelhos semi-flexionados, descendo a barra rente às pernas até sentir forte tensão nos posteriores.',
    commonMistakes: 'Bending knees into a squat, rounding lower back, or letting the bar drift forward.',
    commonMistakesPt: 'Flexionar demais os joelhos virando agachamento, arredondar a lombar ou afastar a barra das coxas.',
  },
  db_romanian_deadlift: {
    description: 'Dumbbell RDL: Keep dumbbells close to thighs, hinge hips back with flat spine until deep hamstring stretch, then drive hips forward.',
    descriptionPt: 'Execução: Mantenha os halteres rente às coxas, projete o quadril para trás com coluna neutra até alongar os posteriores e retorne estendendo o quadril.',
    commonMistakes: 'Rounding shoulders forward or descending below hamstring flexibility causing lumbar flexion.',
    commonMistakesPt: 'Curvar os ombros à frente ou descer além da flexibilidade dobrando a lombar.',
  },
  seated_leg_curl: {
    description: 'Seated Leg Curl: Lock lap pad snugly over thighs, align knees with pivot, curl heels smoothly underneath seat and control return.',
    descriptionPt: 'Execução: Trave o apoio firme sobre as coxas, alinhe os joelhos ao eixo da máquina e flexione levando os calcanhares sob o banco.',
    commonMistakes: 'Lifting hips forward or letting the weight stack crash between reps.',
    commonMistakesPt: 'Desencostar o quadril do encosto ou soltar o peso rapidamente na volta.',
  },
  lying_leg_curl: {
    description: 'Lying Leg Curl: Keep hips pressed flat into bench throughout, curl pad smoothly toward glutes, and lower slowly.',
    descriptionPt: 'Execução: Mantenha o quadril pressionado contra o banco durante toda a execução, flexione os joelhos em direção aos glúteos e controle a descida.',
    commonMistakes: 'Lifting hips upward off the bench to compensate for heavy load.',
    commonMistakesPt: 'Elevar o quadril do banco para ajudar na flexão com carga excessiva.',
  },
  good_morning: {
    description: 'Barbell Good Morning: Rest bar across upper back, brace core hard, hinge hips backward with soft knees until torso nears 45°, and return.',
    descriptionPt: 'Execução: Apoie a barra nos trapézios, trave o abdômen, projete o quadril para trás mantendo joelhos semiflexionados e retorne estendendo o quadril.',
    commonMistakes: 'Using excessive weight that causes spinal rounding or turning it into a knee-dominant squat.',
    commonMistakesPt: 'Exagerar na carga curvando a coluna ou dobrar demais os joelhos.',
  },
  single_leg_rdl_bw: {
    description: 'Single-Leg Bodyweight RDL: Balance on one softly bent leg, hinge hips backward extending opposite leg behind in a straight line with torso.',
    descriptionPt: 'Execução: Equilibre-se em uma perna com joelho levemente flexionado e projete o quadril para trás estendendo a perna livre alinhada ao tronco.',
    commonMistakes: 'Opening hips sideways instead of keeping pelvis square to the floor.',
    commonMistakesPt: 'Girar o quadril para o lado em vez de manter a pelve alinhada ao chão.',
  },
  band_leg_curl: {
    description: 'Band Leg Curl: Anchor band low, lie face down with band looped around ankles, keep hips flat, and curl heels toward glutes.',
    descriptionPt: 'Execução: Prenda o elástico em ponto baixo, deite de bruços com o elástico nos tornozelos e flexione as pernas trazendo os calcanhares ao glúteo.',
    commonMistakes: 'Arching the lower back or rushing the eccentric phase.',
    commonMistakesPt: 'Hiperestender a lombar ou deixar o elástico puxar as pernas sem controle.',
  },

  // === GLUTES (7) ===
  glute_bridge: {
    description: 'Glute Bridge: Drive through heels, keep ribs down, and squeeze glutes hard at the top.',
    descriptionPt: 'Execução: Empurre o chão com os calcanhares, contraia os glúteos no topo sem hiperestender a lombar.',
    commonMistakes: 'Pushing through toes or flaring ribs and arching the lower back at lockout.',
    commonMistakesPt: 'Empurrar com a ponta dos pés ou arquear excessivamente a lombar no ponto alto.',
  },
  barbell_hip_thrust: {
    description: 'Barbell Hip Thrust: Rest upper back against bench edge, place padded bar across hip crease, drive through heels until shins are vertical at top.',
    descriptionPt: 'Execução: Apoie a região inferior das escápulas no banco, barra protegida na dobra do quadril e empurre pelos calcanhares até o tronco alinhar paralelo ao chão.',
    commonMistakes: 'Hyperextending lower back at top instead of posterior pelvic tilt, or placing feet too close/far.',
    commonMistakesPt: 'Arquear a lombar no topo ou posicionar os pés muito perto ou longe do tronco.',
  },
  db_sumo_squat: {
    description: 'Dumbbell Sumo Squat: Take a wide stance with toes angled out ~35°, hold dumbbell vertically between legs, push knees outward and sit upright.',
    descriptionPt: 'Execução: Afaste bem os pés apontando pontas para fora (~35°), segure o halter ao centro e agache mantendo os joelhos alinhados aos pés.',
    commonMistakes: 'Allowing knees to cave inward or leaning torso excessively forward.',
    commonMistakesPt: 'Deixar os joelhos fecharem para dentro ou inclinar demais o tronco à frente.',
  },
  cable_glute_kickback: {
    description: 'Cable Glute Kickback: Attach ankle strap to low pulley, keep torso lightly braced on frame, and kick leg backward squeezing glute without arching spine.',
    descriptionPt: 'Execução: Prenda a tornozeleira na polia baixa, estabilize o tronco e estenda a perna para trás contraindo o glúteo sem mexer a lombar.',
    commonMistakes: 'Hyperextending the lower back at the end of every kick to gain extra range.',
    commonMistakesPt: 'Arquear a lombar a cada chute para aumentar artificialmente a amplitude.',
  },
  hip_abduction_machine: {
    description: 'Seated Hip Abduction Machine: Sit upright with back supported, drive knees outward against pads smoothly, pause 1 second at peak, control return.',
    descriptionPt: 'Execução: Sente-se com a coluna apoiada, afaste os joelhos contra os apoios de forma controlada, sustente 1 segundo aberto e retorne devagar.',
    commonMistakes: 'Slamming weights together on return or bouncing torso forward/backward.',
    commonMistakesPt: 'Bater os pesos no retorno ou balançar o tronco para gerar impulso.',
  },
  single_leg_glute_bridge: {
    description: 'Single-Leg Glute Bridge: Keep one leg bent with foot planted and opposite knee tucked or extended, drive hips up evenly without twisting pelvis.',
    descriptionPt: 'Execução: Com um pé firme no chão e a outra perna elevada, empurre o quadril para cima mantendo a pelve nivelada sem girar.',
    commonMistakes: 'Letting the unsupported side of the pelvis drop downward.',
    commonMistakesPt: 'Deixar um lado do quadril cair durante a subida.',
  },
  band_hip_thrust: {
    description: 'Band Glute Bridge: Place resistance band across hips anchored under hands or feet, keep knees pressing gently outward, and bridge smoothly.',
    descriptionPt: 'Execução: Posicione o elástico sobre o quadril preso pelas mãos ou pés e execute a elevação pélvica contraindo forte os glúteos no topo.',
    commonMistakes: 'Letting knees collapse inward or arching lumbar spine.',
    commonMistakesPt: 'Deixar os joelhos fecharem ou forçar a lombar no topo.',
  },
  cable_pull_through: {
    description: 'Cable Pull-Through: Stand facing away from low pulley with rope between legs, hinge hips backward letting hands glide back, then snap hips forward with glutes.',
    descriptionPt: 'Execução: De costas para a polia baixa com a corda entre as pernas, empurre o quadril para trás mantendo a coluna neutra e estenda contraindo os glúteos.',
    commonMistakes: 'Pulling the rope upward with arms/shoulders instead of driving solely with hip extension.',
    commonMistakesPt: 'Puxar a corda com os braços em vez de estender o quadril.',
  },

  // === CALVES (5) ===
  standing_calf: {
    description: 'Calf Raise: Pause 2 seconds at the bottom stretch and hold 1 second at full plantar flexion peak.',
    descriptionPt: 'Execução: Alongue completamente a panturrilha na base com pausa de 2 segundos e contraia no topo por 1 segundo.',
    commonMistakes: 'Bouncing rapidly off the bottom tendon stretch without pauses or bending knees.',
    commonMistakesPt: 'Usar efeito mola quicando na base sem pausa ou dobrar os joelhos.',
  },
  seated_calf_raise: {
    description: 'Seated Calf Raise: Place balls of feet on block with pad over lower thighs, lower heels into deep stretch, and press vertically to peak contraction.',
    descriptionPt: 'Execução: Apoie a ponta dos pés no degrau com suporte acima dos joelhos, alongue os calcanhares ao máximo e suba contraindo o sóleo.',
    commonMistakes: 'Shortening range of motion or bouncing quickly through reps.',
    commonMistakesPt: 'Fazer amplitude curta ou acelerar as repetições quicando na base.',
  },
  single_leg_bw_calf_raise: {
    description: 'Single-Leg Calf Raise: Stand on step edge on one foot holding support lightly, lower heel fully, then rise onto ball of foot smoothly.',
    descriptionPt: 'Execução: Apoie a ponta de um pé na borda de um degrau com apoio leve para equilíbrio, desça bem o calcanhar e suba ao máximo.',
    commonMistakes: 'Leaning body weight onto the support rail or rushing without bottom stretch.',
    commonMistakesPt: 'Descarregar o peso no apoio das mãos ou não alongar na descida.',
  },
  db_standing_calf_raise: {
    description: 'Dumbbell Standing Calf Raise: Hold dumbbells at sides, stand with forefeet elevated on block, pause in stretch and push straight up.',
    descriptionPt: 'Execução: Segure halteres ao lado do corpo com a ponta dos pés em um degrau, pause no alongamento baixo e eleve os calcanhares.',
    commonMistakes: 'Rolling ankles outward toward pinky toes or bouncing at bottom.',
    commonMistakesPt: 'Tombar os tornozelos para fora ou quicar na parte baixa.',
  },
  leg_press_calf_raise: {
    description: 'Leg Press Calf Press: Place balls of feet on lower edge of sled with nearly straight (unlocked) knees, flex ankles back and press through big toe ball.',
    descriptionPt: 'Execução: Apoie a ponta dos pés na borda inferior da plataforma com joelhos quase estendidos (sem travar) e execute flexão plantar completa.',
    commonMistakes: 'Locking knees completely straight or letting feet slip off the bottom edge.',
    commonMistakesPt: 'Hiperestender os joelhos travados ou posicionar os pés sem segurança na borda.',
  },

  // === CORE (11) ===
  hanging_leg_raise: {
    description: 'Hanging Leg Raise: Curl pelvis upwards at the apex and avoid swinging body momentum.',
    descriptionPt: 'Execução: Eleve as pernas realizando retroversão pélvica no ponto alto, controlando a descida sem balançar.',
    commonMistakes: 'Swinging legs forward with momentum or stopping at 90° using only hip flexors.',
    commonMistakesPt: 'Balançar o corpo para ganhar embalo ou subir apenas até 90° sem enrolar a pelve.',
  },
  plank: {
    description: 'Forearm Plank: Align elbows under shoulders, squeeze glutes and brace abs so body forms a straight rigid line from head to heels.',
    descriptionPt: 'Execução: Alinhe os cotovelos sob os ombros, contraia glúteos e abdômen mantendo o corpo reto da cabeça aos calcanhares.',
    commonMistakes: 'Letting lower back sag or hiking hips high into the air.',
    commonMistakesPt: 'Deixar a lombar afundar ou subir demais o quadril.',
  },
  side_plank: {
    description: 'Side Plank: Stack elbow under shoulder and feet together or staggered, lift hips off floor until torso forms a straight lateral line.',
    descriptionPt: 'Execução: Apoie o cotovelo sob o ombro com os pés alinhados e eleve o quadril mantendo o corpo reto lateralmente.',
    commonMistakes: 'Letting top hip rotate forward or bottom hip sag toward the mat.',
    commonMistakesPt: 'Girar o tronco para frente ou deixar o quadril cair em direção ao solo.',
  },
  dead_bug: {
    description: 'Dead Bug: Lie on back pressing lower back flat into floor, extend opposite arm and leg slowly above floor without losing lumbar contact.',
    descriptionPt: 'Execução: Deitado de costas com a lombar pressionada contra o chão, estenda braço e perna opostos lentamente sem arquear a lombar.',
    commonMistakes: 'Allowing the lower back to arch off the floor as the leg lowers.',
    commonMistakesPt: 'Desencostar a lombar do solo quando a perna desce.',
  },
  bicycle_crunch: {
    description: 'Bicycle Crunch: Keep lower back pressed down, rotate ribcage slowly to bring elbow toward opposite knee while extending other leg smoothly.',
    descriptionPt: 'Execução: Mantenha a lombar firme no chão, gire o tronco aproximando o cotovelo do joelho oposto enquanto estende a outra perna sem pressa.',
    commonMistakes: 'Pulling on the neck with hands or pedaling legs wildly without torso rotation.',
    commonMistakesPt: 'Puxar o pescoço com as mãos ou movimentar só as pernas rapidamente sem girar o tronco.',
  },
  hollow_body_hold: {
    description: 'Hollow Body Hold: Press lumbar spine firmly into floor, raise shoulder blades and extended legs slightly off mat maintaining a tight banana curve.',
    descriptionPt: 'Execução: Cole a lombar no chão, tire escápulas e pernas estendidas levemente do solo sustentando tensão contínua no abdômen.',
    commonMistakes: 'Lower back lifting off the floor due to legs being held too low.',
    commonMistakesPt: 'Arqueamento da lombar descolando do solo por abaixar demais as pernas.',
  },
  cable_woodchopper: {
    description: 'Cable Woodchopper: Stand sideways to pulley with arms extended, rotate torso cleanly through hips and core diagonally across body.',
    descriptionPt: 'Execução: Posicione-se lateralmente à polia com braços estendidos e gire o tronco em diagonal usando a rotação do core, sem dobrar os cotovelos.',
    commonMistakes: 'Pulling solely with arms instead of rotating the ribcage and bracing hips.',
    commonMistakesPt: 'Puxar o cabo usando apenas a força dos braços sem rotação controlada do tronco.',
  },
  cable_crunch: {
    description: 'Kneeling Cable Crunch: Kneel holding rope beside temples, keep hips stationary over knees, and curl ribcage downward toward pelvis.',
    descriptionPt: 'Execução: Ajoelhado segurando a corda ao lado da cabeça, mantenha o quadril fixo sobre os joelhos e flexione a coluna levando as costelas em direção à pelve.',
    commonMistakes: 'Sitting hips back onto heels like a hip hinge instead of flexing the spine.',
    commonMistakesPt: 'Sentar o quadril para trás usando o peso do corpo em vez de flexionar o abdômen.',
  },
  db_russian_twist: {
    description: 'Dumbbell Russian Twist: Sit with torso reclined ~45° and braced core, rotate shoulders side to side moving dumbbell with control.',
    descriptionPt: 'Execução: Sentado com o tronco inclinado a ~45° e core contraído, gire os ombros de um lado para o outro levando o halter com controle.',
    commonMistakes: 'Moving only the hands side to side without rotating the shoulders, or rounding the lower back.',
    commonMistakesPt: 'Mover apenas os braços sem girar o tronco ou arredondar a lombar.',
  },
  ab_crunch_machine: {
    description: 'Ab Crunch Machine: Adjust seat so torso aligns with pad, exhale while flexing spine forward smoothly, and control the eccentric return.',
    descriptionPt: 'Execução: Ajuste o banco alinhando o tronco ao apoio, expire flexionando o abdômen para frente de forma controlada e retorne sem soltar o peso.',
    commonMistakes: 'Pulling with arms or flexing hips aggressively instead of crunching the ribcage.',
    commonMistakesPt: 'Puxar a carga com os braços ou dobrar apenas o quadril.',
  },
  band_pallof_press: {
    description: 'Band Pallof Press: Stand sideways to anchored band holding handle at sternum, press arms straight forward resisting torso rotation, pause, and return.',
    descriptionPt: 'Execução: Em pé lateralmente ao elástico preso, segure na frente do esterno e estenda os braços à frente resistindo à rotação do tronco.',
    commonMistakes: 'Letting shoulders or hips twist toward the anchor or shrugging traps.',
    commonMistakesPt: 'Deixar o tronco girar em direção ao ponto de fixação ou elevar os ombros.',
  },
};
