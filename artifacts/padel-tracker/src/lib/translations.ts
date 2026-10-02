export type Language = "es" | "en" | "pt";

export type TranslationKey =
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
  | "parrynSecretary"
  | "fairPlay"
  | "pendingConfirmation"
  | "confirmed"
  | "approveResult"
  | "adminApprove"
  | "proposeScore"
  | "finalizeEncuentro"
  | "generatePayments"
  | "whatsappShare"
  | "copySuccess"
  | "courtSide"
  | "dominantHand"
  | "drive"
  | "reves"
  | "bothSides"
  | "rightHanded"
  | "leftHanded"
  | "waitingRival"
  | "disputeScore";

export const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
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
    parrynSecretary: "Secretario IA (Parryn)",
    fairPlay: "Fair Play Deportivo",
    pendingConfirmation: "Pendiente de validación rival",
    confirmed: "Resultado Oficial Confirmado",
    approveResult: "Aprobar resultado del rival",
    adminApprove: "Aprobar como Administrador",
    proposeScore: "Marcador propuesto por",
    finalizeEncuentro: "Finalizar Encuentro",
    generatePayments: "Generar Cobros del Encuentro",
    whatsappShare: "Compartir por WhatsApp",
    copySuccess: "¡Copiado al portapapeles!",
    courtSide: "Posición en pista",
    dominantHand: "Mano hábil",
    drive: "Drive (Derecha)",
    reves: "Revés (Izquierda)",
    bothSides: "Ambos lados",
    rightHanded: "Diestro",
    leftHanded: "Zurdo",
    waitingRival: "Esperando aprobación de tus rivales",
    disputeScore: "Disputar / Corregir",
  },
  en: {
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
    parrynSecretary: "AI Secretary (Parryn)",
    fairPlay: "Sports Fair Play",
    pendingConfirmation: "Pending opponent confirmation",
    confirmed: "Official Result Confirmed",
    approveResult: "Approve opponent's score",
    adminApprove: "Approve as Administrator",
    proposeScore: "Score proposed by",
    finalizeEncuentro: "Finish Event",
    generatePayments: "Generate Event Fees",
    whatsappShare: "Share via WhatsApp",
    copySuccess: "Copied to clipboard!",
    courtSide: "Court Side",
    dominantHand: "Dominant Hand",
    drive: "Drive (Right)",
    reves: "Backhand (Left)",
    bothSides: "Both sides",
    rightHanded: "Right-handed",
    leftHanded: "Left-handed",
    waitingRival: "Waiting for opponents' approval",
    disputeScore: "Dispute / Correct",
  },
  pt: {
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
    parrynSecretary: "Secretário IA (Parryn)",
    fairPlay: "Fair Play Esportivo",
    pendingConfirmation: "Pendente de validação do adversário",
    confirmed: "Resultado Oficial Confirmado",
    approveResult: "Aprovar placar do adversário",
    adminApprove: "Aprovar como Administrador",
    proposeScore: "Placar proposto por",
    finalizeEncuentro: "Finalizar Encontro",
    generatePayments: "Gerar Cobranças do Encontro",
    whatsappShare: "Compartilhar no WhatsApp",
    copySuccess: "Copiado para a área de transferência!",
    courtSide: "Posição na quadra",
    dominantHand: "Mão dominante",
    drive: "Drive (Direita)",
    reves: "Revés (Esquerda)",
    bothSides: "Ambos os lados",
    rightHanded: "Destro",
    leftHanded: "Canhoto",
    waitingRival: "Aguardando aprovação dos adversários",
    disputeScore: "Disputar / Corrigir",
  },
};
