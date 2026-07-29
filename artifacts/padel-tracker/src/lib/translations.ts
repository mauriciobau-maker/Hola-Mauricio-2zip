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
  | "futbol";

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
  },
};