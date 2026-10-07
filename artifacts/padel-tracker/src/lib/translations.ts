export type Language = "es" | "en" | "pt";

export type TranslationKey =
  // Navegación & General
  | "dashboard"
  | "ranking"
  | "pairs"
  | "matches"
  | "players"
  | "encuentros"
  | "payments"
  | "adminPanel"
  | "adminTitle"
  | "clubsRegistered"
  | "newClub"
  | "copyLink"
  | "copyCode"
  | "visit"
  | "edit"
  | "deactivate"
  | "sportsEnabled"
  | "adminContact"
  | "noAdminAssigned"
  | "demoLoad"
  | "padel"
  | "tenis"
  | "futbol"
  | "search"
  | "filter"
  | "all"
  | "loading"
  | "save"
  | "saving"
  | "cancel"
  | "delete"
  | "close"
  | "back"
  | "confirm"
  | "actions"
  | "status"
  | "date"
  | "location"
  | "details"
  | "total"
  | "share"
  | "copied"
  // Dashboard
  | "welcome"
  | "clubOverview"
  | "quickStats"
  | "totalPlayers"
  | "totalMatches"
  | "activeEvents"
  | "recentMatches"
  | "topPlayers"
  | "viewAll"
  | "noRecentMatches"
  | "noPlayersYet"
  | "newMatch"
  | "newEvent"
  | "newPlayer"
  | "matchesThisMonth"
  | "winRate"
  | "eloLeaderboard"
  // Ranking
  | "playerRanking"
  | "rankingSubtitle"
  | "rank"
  | "player"
  | "elo"
  | "matchesPlayed"
  | "wins"
  | "losses"
  | "position"
  | "category"
  | "allSports"
  | "allCategories"
  | "noRankingsFound"
  // Partidos
  | "matchesTitle"
  | "matchesSubtitle"
  | "filterAll"
  | "filterConfirmed"
  | "filterPending"
  | "noMatchesFound"
  | "newMatchButton"
  | "matchDetails"
  | "sets"
  | "score"
  | "pendingApproval"
  | "confirmedStatus"
  | "approveResult"
  | "proposedBy"
  | "vs"
  | "completed"
  | "inProgress"
  | "editScore"
  | "enterScore"
  // Jugadores
  | "playersTitle"
  | "playersSubtitle"
  | "searchPlaceholder"
  | "dominantHand"
  | "courtPosition"
  | "rightSide"
  | "leftSide"
  | "bothSides"
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "forward"
  | "viewProfile"
  | "unlinked"
  | "linked"
  | "noPlayersFound"
  // Cobros & Finanzas
  | "paymentsTitle"
  | "paymentsSubtitle"
  | "courtRental"
  | "costPerPlayer"
  | "totalAmount"
  | "courtCount"
  | "shareWhatsappReport"
  | "splitCalculator"
  | "unpaid"
  | "paid"
  | "markAsPaid"
  | "markAsUnpaid"
  | "paymentSummary"
  | "playersToCharge"
  // Parejas
  | "pairsTitle"
  | "pairsSubtitle"
  | "topPairs"
  | "matchesTogether"
  | "chemistry"
  // Encuentros
  | "encuentrosTitle"
  | "encuentrosSubtitle"
  | "spotsAvailable"
  | "waitlist"
  | "confirmedAttendance"
  | "shareInvitation"
  | "generateMatches"
  | "endEvent"
  | "spotsFull"
  // Parryn IA
  | "parryn"
  | "parrynSecretary"
  | "parrynHeroTitle"
  | "parrynHeroSubtitle"
  | "parrynAskWhoMissing"
  | "parrynDraftWhatsapp"
  | "parrynPaymentReminder"
  | "parrynMatchSummary"
  | "parrynOpenChat"
  | "parrynStatusOnline";

export const translations: Record<Language, Record<string, string>> = {
  es: {
    // Navegación
    dashboard: "Dashboard",
    ranking: "Ranking",
    pairs: "Parejas",
    matches: "Partidos",
    players: "Jugadores",
    encuentros: "Encuentros",
    payments: "Cobros",
    adminPanel: "Panel Admin",
    adminTitle: "Panel de Admin",
    clubsRegistered: "clubes registrados",
    newClub: "Nuevo Club",
    copyLink: "Copiar Enlace",
    copyCode: "Copiar Código",
    visit: "Visitar",
    edit: "Editar",
    deactivate: "Desactivar",
    sportsEnabled: "DEPORTES HABILITADOS",
    adminContact: "ADMINISTRADOR & CONTACTO",
    noAdminAssigned: "Sin administrador asignado",
    demoLoad: "Cargar Demo",
    padel: "Pádel",
    tenis: "Tenis",
    futbol: "Fútbol",
    search: "Buscar",
    filter: "Filtrar",
    all: "Todos",
    loading: "Cargando...",
    save: "Guardar",
    saving: "Guardando...",
    cancel: "Cancelar",
    delete: "Eliminar",
    close: "Cerrar",
    back: "Volver",
    confirm: "Confirmar",
    actions: "Acciones",
    status: "Estado",
    date: "Fecha",
    location: "Ubicación",
    details: "Detalles",
    total: "Total",
    share: "Compartir",
    copied: "Copiado",

    // Dashboard
    welcome: "Bienvenido",
    clubOverview: "Resumen de tu club deportivo",
    quickStats: "Estadísticas Rápidas",
    totalPlayers: "Total Jugadores",
    totalMatches: "Partidos Jugados",
    activeEvents: "Encuentros Activos",
    recentMatches: "Partidos Recientes",
    topPlayers: "Mejores Jugadores",
    viewAll: "Ver todos",
    noRecentMatches: "No hay partidos registrados aún.",
    noPlayersYet: "No hay jugadores registrados aún.",
    newMatch: "Nuevo Partido",
    newEvent: "Nuevo Encuentro",
    newPlayer: "Nuevo Jugador",
    matchesThisMonth: "Partidos este mes",
    winRate: "% Victorias",
    eloLeaderboard: "Líderes de Ranking",

    // Ranking
    playerRanking: "Ranking de Jugadores",
    rankingSubtitle: "Clasificación oficial por nivel deportivo y rendimiento",
    rank: "Posición",
    player: "Jugador",
    elo: "Puntuación ELO",
    matchesPlayed: "PJ",
    wins: "PG",
    losses: "PP",
    position: "Posición",
    category: "Categoría",
    allSports: "Todos los deportes",
    allCategories: "Todas las categorías",
    noRankingsFound: "No se encontraron jugadores en el ranking.",

    // Partidos
    matchesTitle: "Partidos",
    matchesSubtitle: "Historial y marcadores de partidos de la comunidad",
    filterAll: "Todos",
    filterConfirmed: "Confirmados",
    filterPending: "Pendientes",
    noMatchesFound: "No hay partidos que coincidan con el filtro.",
    newMatchButton: "Registrar Partido",
    matchDetails: "Detalle del Partido",
    sets: "Sets",
    score: "Marcador",
    pendingApproval: "Pendiente de validación por rival",
    confirmedStatus: "Confirmado",
    approveResult: "Aprobar resultado",
    proposedBy: "Propuesto por",
    vs: "vs",
    completed: "Completado",
    inProgress: "En juego",
    editScore: "Editar resultado",
    enterScore: "Ingresar resultado",

    // Jugadores
    playersTitle: "Jugadores del Club",
    playersSubtitle: "Fichas deportivas, estadísticas individuales y contacto",
    searchPlaceholder: "Buscar por nombre o apodo...",
    dominantHand: "Mano hábil",
    courtPosition: "Lado de juego",
    rightSide: "Drive (Derecha)",
    leftSide: "Revés (Izquierda)",
    bothSides: "Ambos lados",
    goalkeeper: "Portero / Arquero",
    defender: "Defensa",
    midfielder: "Mediocampista",
    forward: "Delantero",
    viewProfile: "Ver Perfil",
    unlinked: "Sin vincular",
    linked: "Vinculado",
    noPlayersFound: "No se encontraron jugadores.",

    // Cobros
    paymentsTitle: "Control de Cobros & Finanzas",
    paymentsSubtitle: "Calculadora de pista, división de gastos y cobro por WhatsApp",
    courtRental: "Alquiler de Canchas",
    costPerPlayer: "Costo por Jugador",
    totalAmount: "Monto Total",
    courtCount: "Número de Pistas",
    shareWhatsappReport: "Enviar Cobro por WhatsApp",
    splitCalculator: "Calculadora de Prorrateo",
    unpaid: "Pendiente",
    paid: "Pagado",
    markAsPaid: "Marcar como pagado",
    markAsUnpaid: "Marcar como pendiente",
    paymentSummary: "Resumen de Cobro",
    playersToCharge: "Jugadores a Cobrar",

    // Parejas
    pairsTitle: "Parejas del Club",
    pairsSubtitle: "Rendimiento y química de duplas en competencia",
    topPairs: "Mejores Parejas",
    matchesTogether: "Partidos juntos",
    chemistry: "Efectividad",

    // Encuentros
    encuentrosTitle: "Encuentros Deportivos",
    encuentrosSubtitle: "Convocatorias, citaciones y rotaciones inteligentes",
    spotsAvailable: "Cupos disponibles",
    waitlist: "Lista de Reserva",
    confirmedAttendance: "Asistencia Confirmada",
    shareInvitation: "Compartir Convocatoria",
    generateMatches: "Generar Partidos",
    endEvent: "Finalizar Encuentro",
    spotsFull: "Cupos agotados",

    // Parryn IA
    parryn: "Parryn",
    parrynSecretary: "Secretario IA",
    parrynHeroTitle: "Secretaría del Club con Parryn IA",
    parrynHeroSubtitle: "Tu secretario deportivo: recuerda todo, organiza las convocatorias y mantiene al club al día sin fricciones.",
    parrynAskWhoMissing: "¿Quién falta confirmar?",
    parrynDraftWhatsapp: "Redactar Convocatoria WhatsApp",
    parrynPaymentReminder: "Recordatorio de Cobros",
    parrynMatchSummary: "Resumen de la Jornada",
    parrynOpenChat: "Hablar con Parryn",
    parrynStatusOnline: "Secretario Activo",
  },

  en: {
    // Navigation
    dashboard: "Dashboard",
    ranking: "Ranking",
    pairs: "Pairs",
    matches: "Matches",
    players: "Players",
    encuentros: "Events",
    payments: "Payments",
    adminPanel: "Admin Panel",
    adminTitle: "Admin Panel",
    clubsRegistered: "registered clubs",
    newClub: "New Club",
    copyLink: "Copy Link",
    copyCode: "Copy Code",
    visit: "Visit",
    edit: "Edit",
    deactivate: "Deactivate",
    sportsEnabled: "ENABLED SPORTS",
    adminContact: "ADMINISTRATOR & CONTACT",
    noAdminAssigned: "No admin assigned",
    demoLoad: "Load Demo",
    padel: "Padel",
    tenis: "Tennis",
    futbol: "Soccer",
    search: "Search",
    filter: "Filter",
    all: "All",
    loading: "Loading...",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    back: "Back",
    confirm: "Confirm",
    actions: "Actions",
    status: "Status",
    date: "Date",
    location: "Location",
    details: "Details",
    total: "Total",
    share: "Share",
    copied: "Copied",

    // Dashboard
    welcome: "Welcome",
    clubOverview: "Sports club overview and activity",
    quickStats: "Quick Stats",
    totalPlayers: "Total Players",
    totalMatches: "Matches Played",
    activeEvents: "Active Events",
    recentMatches: "Recent Matches",
    topPlayers: "Top Players",
    viewAll: "View all",
    noRecentMatches: "No matches recorded yet.",
    noPlayersYet: "No players registered yet.",
    newMatch: "New Match",
    newEvent: "New Event",
    newPlayer: "New Player",
    matchesThisMonth: "Matches this month",
    winRate: "Win Rate",
    eloLeaderboard: "ELO Leaderboard",

    // Ranking
    playerRanking: "Player Rankings",
    rankingSubtitle: "Official skill ratings and athletic performance",
    rank: "Rank",
    player: "Player",
    elo: "ELO Rating",
    matchesPlayed: "MP",
    wins: "W",
    losses: "L",
    position: "Position",
    category: "Category",
    allSports: "All sports",
    allCategories: "All categories",
    noRankingsFound: "No ranked players found.",

    // Matches
    matchesTitle: "Matches",
    matchesSubtitle: "Community match scores and historical results",
    filterAll: "All",
    filterConfirmed: "Confirmed",
    filterPending: "Pending",
    noMatchesFound: "No matches found matching filter.",
    newMatchButton: "Record Match",
    matchDetails: "Match Details",
    sets: "Sets",
    score: "Score",
    pendingApproval: "Pending opponent approval",
    confirmedStatus: "Confirmed",
    approveResult: "Approve result",
    proposedBy: "Proposed by",
    vs: "vs",
    completed: "Completed",
    inProgress: "In progress",
    editScore: "Edit score",
    enterScore: "Enter score",

    // Players
    playersTitle: "Club Players",
    playersSubtitle: "Athlete profiles, individual stats and contact info",
    searchPlaceholder: "Search by name or nickname...",
    dominantHand: "Dominant hand",
    courtPosition: "Court side",
    rightSide: "Forehand (Right side)",
    leftSide: "Backhand (Left side)",
    bothSides: "Both sides",
    goalkeeper: "Goalkeeper",
    defender: "Defender",
    midfielder: "Midfielder",
    forward: "Forward",
    viewProfile: "View Profile",
    unlinked: "Unlinked",
    linked: "Linked",
    noPlayersFound: "No players found.",

    // Payments
    paymentsTitle: "Payments & Cost Splitting",
    paymentsSubtitle: "Court booking calculator, split costs and WhatsApp payment links",
    courtRental: "Court Rental Fee",
    costPerPlayer: "Cost per Player",
    totalAmount: "Total Amount",
    courtCount: "Number of Courts",
    shareWhatsappReport: "Send WhatsApp Payment Request",
    splitCalculator: "Cost Split Calculator",
    unpaid: "Pending",
    paid: "Paid",
    markAsPaid: "Mark as paid",
    markAsUnpaid: "Mark as unpaid",
    paymentSummary: "Payment Summary",
    playersToCharge: "Players to Charge",

    // Pairs
    pairsTitle: "Club Pairs",
    pairsSubtitle: "Doubles performance and partnership chemistry",
    topPairs: "Top Pairs",
    matchesTogether: "Matches together",
    chemistry: "Win rate",

    // Encuentros
    encuentrosTitle: "Sports Events",
    encuentrosSubtitle: "Invitations, RSVP rosters and smart match rotations",
    spotsAvailable: "Spots available",
    waitlist: "Waitlist",
    confirmedAttendance: "Confirmed Attendance",
    shareInvitation: "Share Invitation",
    generateMatches: "Generate Matches",
    endEvent: "End Event",
    spotsFull: "Spots full",

    // Parryn IA
    parryn: "Parryn",
    parrynSecretary: "AI Secretary",
    parrynHeroTitle: "Club Secretary with Parryn AI",
    parrynHeroSubtitle: "Your sports club secretary: remembers everything, organizes invitations, and keeps the club running smoothly.",
    parrynAskWhoMissing: "Who is missing to confirm?",
    parrynDraftWhatsapp: "Draft WhatsApp Invitation",
    parrynPaymentReminder: "Payment Reminder",
    parrynMatchSummary: "Matchday Summary",
    parrynOpenChat: "Chat with Parryn",
    parrynStatusOnline: "Secretary Online",
  },

  pt: {
    // Navegação
    dashboard: "Painel",
    ranking: "Classificação",
    pairs: "Duplas",
    matches: "Partidas",
    players: "Jogadores",
    encuentros: "Encontros",
    payments: "Cobranças",
    adminPanel: "Painel Admin",
    adminTitle: "Painel de Admin",
    clubsRegistered: "clubes registrados",
    newClub: "Novo Clube",
    copyLink: "Copiar Link",
    copyCode: "Copiar Código",
    visit: "Visitar",
    edit: "Editar",
    deactivate: "Desativar",
    sportsEnabled: "ESPORTES HABILITADOS",
    adminContact: "ADMINISTRADOR E CONTATO",
    noAdminAssigned: "Nenhum administrador atribuído",
    demoLoad: "Carregar Demo",
    padel: "Padel",
    tenis: "Tênis",
    futbol: "Futebol",
    search: "Buscar",
    filter: "Filtrar",
    all: "Todos",
    loading: "Carregando...",
    save: "Salvar",
    saving: "Salvando...",
    cancel: "Cancelar",
    delete: "Excluir",
    close: "Fechar",
    back: "Voltar",
    confirm: "Confirmar",
    actions: "Ações",
    status: "Status",
    date: "Data",
    location: "Local",
    details: "Detalhes",
    total: "Total",
    share: "Compartilhar",
    copied: "Copiado",

    // Dashboard
    welcome: "Bem-vindo",
    clubOverview: "Visão geral do seu clube esportivo",
    quickStats: "Estatísticas Rápidas",
    totalPlayers: "Total de Jogadores",
    totalMatches: "Partidas Jogadas",
    activeEvents: "Encontros Ativos",
    recentMatches: "Partidas Recentes",
    topPlayers: "Melhores Jogadores",
    viewAll: "Ver todos",
    noRecentMatches: "Nenhuma partida registrada ainda.",
    noPlayersYet: "Nenhum jogador registrado ainda.",
    newMatch: "Nova Partida",
    newEvent: "Novo Encontro",
    newPlayer: "Novo Jogador",
    matchesThisMonth: "Partidas neste mês",
    winRate: "% Vitórias",
    eloLeaderboard: "Líderes do Ranking",

    // Ranking
    playerRanking: "Classificação de Jogadores",
    rankingSubtitle: "Pontuação oficial por nível esportivo e desempenho",
    rank: "Posição",
    player: "Jogador",
    elo: "Pontuação ELO",
    matchesPlayed: "PJ",
    wins: "V",
    losses: "D",
    position: "Posição",
    category: "Categoria",
    allSports: "Todos os esportes",
    allCategories: "Todas as categorias",
    noRankingsFound: "Nenhum jogador encontrado no ranking.",

    // Partidas
    matchesTitle: "Partidas",
    matchesSubtitle: "Histórico e placares das partidas da comunidade",
    filterAll: "Todas",
    filterConfirmed: "Confirmadas",
    filterPending: "Pendentes",
    noMatchesFound: "Nenhuma partida encontrada com o filtro.",
    newMatchButton: "Registrar Partida",
    matchDetails: "Detalhes da Partida",
    sets: "Sets",
    score: "Placar",
    pendingApproval: "Aguardando confirmação do adversário",
    confirmedStatus: "Confirmado",
    approveResult: "Aprovar resultado",
    proposedBy: "Proposto por",
    vs: "vs",
    completed: "Concluído",
    inProgress: "Em andamento",
    editScore: "Editar placar",
    enterScore: "Inserir placar",

    // Jogadores
    playersTitle: "Jogadores do Clube",
    playersSubtitle: "Perfis esportivos, estatísticas e contatos",
    searchPlaceholder: "Buscar por nome ou apelido...",
    dominantHand: "Mão dominante",
    courtPosition: "Lado de jogo",
    rightSide: "Drive (Direita)",
    leftSide: "Revés (Esquerda)",
    bothSides: "Ambos os lados",
    goalkeeper: "Goleiro",
    defender: "Defensor",
    midfielder: "Meio-campista",
    forward: "Atacante",
    viewProfile: "Ver Perfil",
    unlinked: "Sem vínculo",
    linked: "Vinculado",
    noPlayersFound: "Nenhum jogador encontrado.",

    // Cobranças
    paymentsTitle: "Controle de Cobranças & Finanças",
    paymentsSubtitle: "Calculadora de quadra, divisão de custos e cobrança por WhatsApp",
    courtRental: "Aluguel das Quadras",
    costPerPlayer: "Custo por Jogador",
    totalAmount: "Valor Total",
    courtCount: "Número de Quadras",
    shareWhatsappReport: "Enviar Cobrança por WhatsApp",
    splitCalculator: "Calculadora de Divisão",
    unpaid: "Pendente",
    paid: "Pago",
    markAsPaid: "Marcar como pago",
    markAsUnpaid: "Marcar como pendente",
    paymentSummary: "Resumo de Cobrança",
    playersToCharge: "Jogadores a Cobrar",

    // Duplas
    pairsTitle: "Duplas do Clube",
    pairsSubtitle: "Desempenho e entrosamento das duplas em torneios",
    topPairs: "Melhores Duplas",
    matchesTogether: "Partidas juntos",
    chemistry: "Aproveitamento",

    // Encontros
    encuentrosTitle: "Encontros Esportivos",
    encuentrosSubtitle: "Convocações, confirmações de presença e rotação inteligente",
    spotsAvailable: "Vagas disponíveis",
    waitlist: "Lista de Espera",
    confirmedAttendance: "Presença Confirmada",
    shareInvitation: "Compartilhar Convocação",
    generateMatches: "Gerar Partidas",
    endEvent: "Finalizar Encontro",
    spotsFull: "Vagas esgotadas",

    // Parryn IA
    parryn: "Parryn",
    parrynSecretary: "Secretário IA",
    parrynHeroTitle: "Secretaria do Clube com Parryn IA",
    parrynHeroSubtitle: "Seu secretário esportivo: lembra de tudo, organiza convocações e mantém o clube em dia sem atritos.",
    parrynAskWhoMissing: "Quem falta confirmar?",
    parrynDraftWhatsapp: "Redigir Convocação WhatsApp",
    parrynPaymentReminder: "Lembrete de Cobrança",
    parrynMatchSummary: "Resumo da Rodada",
    parrynOpenChat: "Falar com Parryn",
    parrynStatusOnline: "Secretário Ativo",
  },
};
