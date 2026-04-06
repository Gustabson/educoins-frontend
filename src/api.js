import { io } from 'socket.io-client';
// api.js — cliente HTTP y socket

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const API = `${API_URL}/api/v1`;

async function apiFetch(path, options={}) {
  const token = localStorage.getItem("ec_token");
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw { code: data.error?.code, message: data.error?.message };
  return data.data;
}

let _socket = null;

function connectSocket(token) {
  // Si ya existe (aunque esté conectando), devolvemos el mismo —
  // no destruirlo evita que los handlers registrados queden en un socket muerto.
  if (_socket) return _socket;
  _socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
  });
  _socket.on('connect',       () => console.log('Socket conectado:', _socket.id));
  _socket.on('connect_error', (e) => console.warn('Socket error:', e.message));
  return _socket;
}
export function disconnectSocket() {
  if (_socket) { _socket.disconnect(); _socket = null; }
}
function getSocket() { return _socket; }


// ── CONFIGURACIÓN DE API ──────────────────────────────────────

const api = {
  login:          (email, password)       => apiFetch("/auth/login",         { method:"POST", body:{email,password} }),
  me:             ()                      => apiFetch("/auth/me"),
  account:        ()                      => apiFetch("/accounts/me"),
  transactions:   (page=1)               => apiFetch(`/accounts/me/transactions?page=${page}&limit=20`),
  missions:       ()                      => apiFetch("/missions"),
  submitMission:  (id)                    => apiFetch(`/missions/${id}/submit`,  { method:"POST" }),
  submissions:    ()                      => apiFetch("/missions/submissions?estado=pendiente"),
  allSubmissions: ()                      => apiFetch("/missions/submissions"),
  approve:        (id,data={})            => apiFetch(`/missions/submissions/${id}/approve`, { method:"POST", body:data }),
  reject:         (id, data)              => apiFetch(`/missions/submissions/${id}/reject`,  { method:"POST", body:typeof data==="string"?{reason:data}:data }),
  createMission:  (data)                  => apiFetch("/missions",            { method:"POST", body:data }),
  storeItems:     ()                      => apiFetch("/store/items"),
  createItem:     (data)                  => apiFetch("/store/items",         { method:"POST", body:data }),
  purchase:       (item_id)               => apiFetch("/transactions/purchase",{ method:"POST", body:{item_id} }),
  transfer:       (to_user_id, amount)    => apiFetch("/transactions/transfer",{ method:"POST", body:{to_user_id,amount} }),
  ranking:        ()                      => apiFetch("/ranking/live?periodo=weekly&scope=global"),
  rankingConfig:  ()                      => apiFetch("/ranking/config"),
  rankingData:    (params)                => apiFetch(`/ranking/live?${params}`),
  rankingConfigUpdate:(id,d)              => apiFetch(`/ranking/config/${id}`, { method:"PATCH", body:d }),
  rankingClose:   (d)                     => apiFetch("/ranking/close",        { method:"POST",  body:d }),
  rankingPayouts: ()                      => apiFetch("/ranking/payouts"),
  rankingRevert:  (id,motivo)             => apiFetch(`/ranking/payouts/${id}/revert`, { method:"POST", body:{motivo} }),
  subscribe:      (item_id,periodo)       => apiFetch("/subscriptions/subscribe", { method:"POST", body:{item_id,periodo} }),
  mySubscriptions:()                      => apiFetch("/subscriptions/me"),
  chargeAll:      ()                      => apiFetch("/subscriptions/charge-all", { method:"POST" }),
  equip:          (type, item_id)         => apiFetch("/profile/equip",       { method:"POST", body:{type,item_id} }),
  buyItem:        (type, item_id)         => apiFetch("/profile/buy-item",    { method:"POST", body:{type,item_id} }),
  buyTituloChange:(titulo, precio)        => apiFetch("/profile/buy-titulo-change", { method:"POST", body:{titulo,precio} }),
  setEstado:      (estado)                => apiFetch("/profile/estado",           { method:"PATCH", body:{estado} }),
  setActiveTitles:(titles)                => apiFetch("/profile/active-titles",     { method:"PATCH", body:{titles} }),
  setAvatarBg:    (avatar_bg)             => apiFetch("/profile/avatar-bg",          { method:"PATCH", body:{avatar_bg} }),
  earnedTitles:   ()                      => apiFetch("/profile/earned-titles"),
  grantTitle:     (data)                  => apiFetch("/profile/earned-titles",      { method:"POST",  body:data }),
  revokeTitle:    (id)                    => apiFetch(`/profile/earned-titles/${id}`, { method:"DELETE" }),
  earnedTitlesOf: (userId)                => apiFetch(`/profile/earned-titles/${userId}/all`),
  revokeLoan:     (id)                    => apiFetch(`/profile/loaned-items/${id}`,  { method:"DELETE" }),
  loanedItemsOf:  (userId)                => apiFetch(`/profile/loaned-items/${userId}`),
  // P2P Exchange
  p2pConfig:        ()           => apiFetch("/p2p/config"),
  p2pConfigUpdate:  (data)       => apiFetch("/p2p/config",           { method:"PATCH", body:data }),
  p2pOffers:        ()           => apiFetch("/p2p/offers"),
  p2pMyOffers:      ()           => apiFetch("/p2p/my-offers"),
  p2pCreateOffer:   (data)       => apiFetch("/p2p/offers",           { method:"POST",  body:data }),
  p2pPauseOffer:    (id)         => apiFetch(`/p2p/offers/${id}/pause`,{ method:"PATCH" }),
  p2pCancelOffer:   (id)         => apiFetch(`/p2p/offers/${id}`,     { method:"DELETE" }),
  p2pCreateOrder:   (offerId,data)=>apiFetch(`/p2p/offers/${offerId}/order`,{ method:"POST", body:data }),
  p2pOrders:        ()           => apiFetch("/p2p/orders"),
  p2pPaymentSent:   (id,data)    => apiFetch(`/p2p/orders/${id}/payment-sent`,{ method:"PATCH", body:data }),
  p2pRelease:       (id)         => apiFetch(`/p2p/orders/${id}/release`,     { method:"PATCH" }),
  p2pDispute:       (id,data)    => apiFetch(`/p2p/orders/${id}/dispute`,     { method:"PATCH", body:data }),
  p2pResolve:       (id,data)    => apiFetch(`/p2p/orders/${id}/resolve`,     { method:"PATCH", body:data }),
  p2pRate:          (id,data)    => apiFetch(`/p2p/orders/${id}/rate`,        { method:"POST",  body:data }),
  p2pAdminOrders:   (status)     => apiFetch(`/p2p/admin/orders${status?`?status=${status}`:""}`),
  p2pMarket:        ()           => apiFetch("/p2p/market"),
  p2pOrderDetail:   (id)         => apiFetch(`/p2p/orders/${id}/detail`),
  // Prizes
  prizeSets:      ()                      => apiFetch("/prizes/sets"),
  prizeAddItem:   (setId, data)           => apiFetch(`/prizes/sets/${setId}/items`, { method:"POST", body:data }),
  prizeDelItem:   (itemId)                => apiFetch(`/prizes/items/${itemId}`,     { method:"DELETE" }),
  prizeGrantManual:(userId, premios)      => apiFetch("/prizes/grant-manual",        { method:"POST", body:{user_id:userId, premios} }),
  prizeExecute:   (periodo)               => apiFetch(`/prizes/execute/${periodo}`,  { method:"POST" }),
  prizeHistory:   ()                      => apiFetch("/prizes/history"),
  prizeSchedules: ()                      => apiFetch("/prizes/schedules"),
  prizeScheduleUpdate:(periodo,data)      => apiFetch(`/prizes/schedules/${periodo}`, { method:"PATCH", body:data }),
  prizeSetCreate: (data)                  => apiFetch("/prizes/sets",                 { method:"POST",  body:data }),
  prizeSetDelete: (id)                    => apiFetch(`/prizes/sets/${id}`,           { method:"DELETE" }),
  loanedItems:    ()                      => apiFetch("/profile/loaned-items"),
  myPrizes:       ()                      => apiFetch("/profile/my-prizes"),
  loanItem:       (data)                  => apiFetch("/profile/loaned-items",       { method:"POST",   body:data }),
  adminUsers:     ()                      => apiFetch("/admin/users"),
  createUser:     (data)                  => apiFetch("/admin/users",         { method:"POST", body:data }),
  adminUpdatePermisos:(id,permisos)       => apiFetch(`/admin/users/${id}/permisos`, { method:"PATCH", body:{permisos} }),
  // ── Solicitudes (superadmin) ──────────────────────────────
  adminProposals:       ()               => apiFetch("/admin/proposals"),
  adminResolveProposal: (id,data)        => apiFetch(`/admin/proposals/${id}`, { method:"PATCH", body:data }),
  // ── Solicitudes (staff) ────────────────────────────────────
  staffSendProposal:    (data)           => apiFetch("/staff/proposals",       { method:"POST", body:data }),
  staffMyProposals:     ()               => apiFetch("/staff/proposals/mine"),
  treasury:       ()                      => apiFetch("/admin/treasury"),
  mint:           (amount, description)   => apiFetch("/admin/mint",          { method:"POST", body:{amount,description} }),
  burn:           (amount, reason)        => apiFetch("/admin/burn",          { method:"POST", body:{amount,reason} }),
  setBudget:      (teacher_id, monthly_limit) => apiFetch("/admin/teacher-budget", { method:"POST", body:{teacher_id,monthly_limit} }),
  auditLog:       ()                      => apiFetch("/admin/audit-log"),
  adminRanking:   (cid)                   => apiFetch(`/admin/ranking${cid?`?classroom_id=${cid}`:""}`),
  bankTransfer:   (data)                  => apiFetch("/admin/bank-transfer", { method:"POST", body:data }),
  bankRevert:     (data)                  => apiFetch("/admin/bank-revert",   { method:"POST", body:data }),
  applyTax:       (data)                  => apiFetch("/admin/tax",           { method:"POST", body:data }),
  updateItem:     (id,data)               => apiFetch(`/store/items/${id}`,   { method:"PATCH", body:data }),
  deleteItem:     (id)                    => apiFetch(`/store/items/${id}`,   { method:"DELETE" }),
  deactivate:     (id)                    => apiFetch(`/admin/users/${id}/deactivate`, { method:"PATCH" }),
  // ── Noticias ──────────────────────────────────────────────
  posts:          (tag)                   => apiFetch(`/posts${tag?`?tag=${tag}`:""}`),
  post:           (id)                    => apiFetch(`/posts/${id}`),
  createPost:     (data)                  => apiFetch("/posts",               { method:"POST", body:data }),
  // ── Votaciones ────────────────────────────────────────────
  polls:          (scope,cid,status)      => apiFetch(`/polls?${new URLSearchParams(Object.fromEntries(Object.entries({scope,classroom_id:cid,status}).filter(([,v])=>v)))}`),
  pollSnapshot:   (scope,cid)             => apiFetch(`/polls/snapshot?${new URLSearchParams(Object.fromEntries(Object.entries({scope,classroom_id:cid}).filter(([,v])=>v)))}`),
  poll:           (id)                    => apiFetch(`/polls/${id}`),
  vote:           (poll_id, option_id)    => apiFetch(`/polls/${poll_id}/vote`,{ method:"POST", body:{option_id} }),
  createPoll:     (data)                  => apiFetch("/polls",               { method:"POST", body:data }),
  reactPoll:      (id, tipo)              => apiFetch(`/polls/${id}/react`,    { method:"POST", body:{tipo} }),
  pollComments:   (id)                    => apiFetch(`/polls/${id}/comments`),
  createComment:  (id, data)              => apiFetch(`/polls/${id}/comments`, { method:"POST", body:data }),
  commentReplies: (pid, cid)              => apiFetch(`/polls/${pid}/comments/${cid}/replies`),
  reactComment:   (pid, cid, tipo)        => apiFetch(`/polls/${pid}/comments/${cid}/react`, { method:"POST", body:{tipo} }),
  deleteComment:  (pid, cid)              => apiFetch(`/polls/${pid}/comments/${cid}`, { method:"DELETE" }),
  reviewPoll:     (id, action, note)      => apiFetch(`/polls/${id}/review`,  { method:"PATCH", body:{action, note} }),
  approvePoll:    (id)                    => apiFetch(`/polls/${id}/approve`, { method:"PATCH" }),
  deletePoll:     (id)                    => apiFetch(`/polls/${id}`,         { method:"DELETE" }),
  pendingPolls:   ()                      => apiFetch("/polls/pending"),
  pollById:       (id)                    => apiFetch(`/polls/${id}`),
  pollVoters:     (id)                    => apiFetch(`/polls/${id}/voters`),
  quorumSettings: ()                      => apiFetch("/admin/quorum-settings"),
  updateQuorum:   (scope, data)           => apiFetch(`/admin/quorum-settings/${scope}`, { method:"PATCH", body:data }),
  // ── Personalización ───────────────────────────────────────
  customShop:     (tipo)     => apiFetch(`/custom/shop${tipo?`?tipo=${tipo}`:""}`),
  customMe:       ()         => apiFetch("/custom/me"),
  customBuy:      (item_id)  => apiFetch("/custom/buy",    { method:"POST", body:{item_id} }),
  customEquip:    (tipo,item_id,custom_bg_color,custom_accent_color) => apiFetch("/custom/equip",{ method:"POST", body:{tipo,item_id,custom_bg_color,custom_accent_color} }),
  customEquipText:(item_id,txt,sub) => apiFetch("/custom/equip",{ method:"POST", body:{tipo:"text_style",item_id,custom_txt_color:txt,custom_sub_color:sub} }),
  saveCustomMode:  (config)            => apiFetch("/custom/save-mode", { method:"POST", body:{config} }),
  customGift:     (data)     => apiFetch("/custom/gift",   { method:"POST", body:data }),
  customGifts:    ()         => apiFetch("/custom/gifts"),
  customGiftRead: (id)       => apiFetch(`/custom/gifts/${id}/read`, { method:"PATCH" }),
  customAdminItems:  ()      => apiFetch("/custom/admin/items"),
  customAdminCreate: (data)  => apiFetch("/custom/admin/items",       { method:"POST",  body:data }),
  customAdminUpdate: (id,d)  => apiFetch(`/custom/admin/items/${id}`, { method:"PATCH", body:d }),
  setApodo:       (apodo)    => apiFetch("/profile/apodo",            { method:"PATCH", body:{apodo} }),
  setFoto:        (foto_url) => apiFetch("/profile/foto",             { method:"PATCH", body:{foto_url} }),
  setTituloCustom:(titulo)   => apiFetch("/profile/titulo-custom",    { method:"PATCH", body:{titulo} }),
  publicProfile:  (id)       => apiFetch(`/profile/user/${id}`),
  blockUser:      (user_id)  => apiFetch("/profile/block",            { method:"POST", body:{user_id} }),
  unblockUser:    (id)       => apiFetch(`/profile/block/${id}`,      { method:"DELETE" }),
  blockedUsers:   ()         => apiFetch("/profile/blocked"),
  // ── Check-in ──────────────────────────────────────────────
  checkin:        ()         => apiFetch("/checkin",          { method:"POST" }),
  checkinMe:      ()         => apiFetch("/checkin/me"),
  checkinConfig:  ()         => apiFetch("/checkin/config"),
  checkinConfigUpdate:(d)    => apiFetch("/checkin/config",   { method:"PATCH", body:d }),
  // ── Notificaciones ────────────────────────────────────────
  myNotifs:       ()         => apiFetch("/notifications"),
  notifReadAll:   ()         => apiFetch("/notifications/read",{ method:"PATCH" }),
  notifRead:      (id)       => apiFetch(`/notifications/${id}/read`,{ method:"PATCH" }),
  // ── Misiones avanzadas ────────────────────────────────────
  teacherMissions:()         => apiFetch("/missions/teacher"),
  classroomStudents:()       => apiFetch("/missions/classroom-students"),
  rewardDirect:   (d)        => apiFetch("/missions/reward-direct",{ method:"POST", body:d }),
  allSubmissions: (estado)   => apiFetch(`/missions/submissions${estado?`?estado=${estado}`:""}`),
  // ── Chat ──────────────────────────────────────────────────
  chatGlobalInfo:    ()             => apiFetch("/chat/global/info"),
  chatGlobalMsgs:    ()             => apiFetch("/chat/global/messages"),
  chatClassroomInfo: ()             => apiFetch("/chat/classroom/info"),
  chatClassroomMsgs: ()             => apiFetch("/chat/classroom/messages"),
  chatPersonalMsgs:  (userId)       => apiFetch(`/chat/personal/${userId}/messages`),
  chatFriends:       ()             => apiFetch("/chat/friends"),
  chatSearch:        (q)            => apiFetch(`/chat/users/search?q=${encodeURIComponent(q)}`),
  chatFriendReq:     (addressee_id) => apiFetch("/chat/friends/request", { method:"POST", body:{addressee_id} }),
  chatFriendAccept:  (id)           => apiFetch(`/chat/friends/${id}/accept`, { method:"POST" }),
  chatFriendReject:  (id)           => apiFetch(`/chat/friends/${id}/reject`, { method:"POST" }),
  chatFriendRemove:  (id)           => apiFetch(`/chat/friends/${id}`,        { method:"DELETE" }),
  sendNotification:  (body)         => apiFetch("/notifications/send",        { method:"POST", body }),
  createGroup:       (body)         => apiFetch("/chat/groups",               { method:"POST", body }),
  myGroups:          ()             => apiFetch("/chat/groups"),
  groupMsgs:         (id)           => apiFetch(`/chat/groups/${id}/messages`),
  groupMembers:      (id)           => apiFetch(`/chat/groups/${id}/members`),
  groupAddMember:    (id, user_id)  => apiFetch(`/chat/groups/${id}/members`, { method:"POST", body:{ user_id } }),
  groupSettings:     (id, body)     => apiFetch(`/chat/groups/${id}/settings`,{ method:"PATCH", body }),
  // ── Padres ────────────────────────────────────────────────
  parentChildren:  ()                         => apiFetch("/parent/children"),
  parentTransfer:  (student_id, amount, description) => apiFetch("/parent/transfer-to-child", { method:"POST", body:{student_id, amount, description} }),
  adminParentLink: (parent_id, student_id)    => apiFetch("/admin/parent-link",  { method:"POST",   body:{parent_id, student_id} }),
  adminParentUnlink:(parent_id, student_id)   => apiFetch("/admin/parent-link",  { method:"DELETE", body:{parent_id, student_id} }),
  adminParentLinks: ()                        => apiFetch("/admin/parent-links"),
  createReport:   (data)                  => apiFetch("/reports",          { method:"POST", body:data }),
  // ── Wellness ──────────────────────────────────────────────
  wellnessToday:              ()       => apiFetch("/wellness/today"),
  wellnessCheckin:            (body)   => apiFetch("/wellness/checkin",           { method:"POST",  body }),
  wellnessReport:             (body)   => apiFetch("/wellness/report",            { method:"POST",  body }),
  wellnessReports:            ()       => apiFetch("/wellness/reports"),
  wellnessMarkReviewed:       (id)     => apiFetch(`/wellness/reports/${id}`,     { method:"PATCH" }),
  wellnessAdminDashboard:     ()       => apiFetch("/wellness/admin/dashboard"),
  wellnessAdminStudents:      (filter) => apiFetch(`/wellness/admin/students?filter=${filter||'all'}`),
  wellnessAdminStudent:       (uid)    => apiFetch(`/wellness/admin/student/${uid}`),
  wellnessAdminConfig:        ()       => apiFetch("/wellness/admin/config"),
  wellnessAdminConfigUpdate:  (body)   => apiFetch("/wellness/admin/config",      { method:"PUT",   body }),
  wellnessAdminExplore:       (days)   => apiFetch(`/wellness/admin/explore?days=${days||30}`),
  wellnessAdminStudentDays:   (uid, days) => apiFetch(`/wellness/admin/student/${uid}?days=${days||30}`),
  wellnessAdminBackups:       ()       => apiFetch("/wellness/admin/backups"),
  wellnessAdminBackupCreate:  (days)   => apiFetch("/wellness/admin/backups",       { method:"POST", body:{days} }),
  wellnessAdminBackupDelete:  (id)     => apiFetch(`/wellness/admin/backups/${id}`, { method:"DELETE" }),
  wellnessAdminBackupDownload:(id)     => `${(typeof process!=="undefined"?process.env?.REACT_APP_API_URL:"")||""}/api/v1/wellness/admin/backups/${id}/download`,
  myReports:      ()                      => apiFetch("/reports/mine"),
  allReports:     (q="")                  => apiFetch(`/reports${q}`),
  updateReport:   (id, data)              => apiFetch(`/reports/${id}/estado`,    { method:"PATCH", body:data }),
  shareReport:    (id, dominios)          => apiFetch(`/reports/${id}/compartir`, { method:"PATCH", body:{ compartido_con: dominios } }),
  reportMessages: (id)                    => apiFetch(`/reports/${id}/messages`),
  sendReportMsg:  (id, texto)             => apiFetch(`/reports/${id}/messages`,  { method:"POST", body:{texto} }),
  deletePost:     (id)                    => apiFetch(`/posts/${id}`,          { method:"DELETE" }),
  updatePoll:     (id, data)              => apiFetch(`/polls/${id}`,          { method:"PATCH", body:data }),
  adminClassrooms:()                      => apiFetch("/admin/classrooms"),
  createClassroom:(data)                  => apiFetch("/admin/classrooms",     { method:"POST", body:data }),
  addClassroomMember:(id,data)            => apiFetch(`/admin/classrooms/${id}/members`, { method:"POST", body:data }),
  // ── Veredictos ────────────────────────────────────────────
  sendVerdict:    (data)  => apiFetch("/verdicts",      { method:"POST", body:data }),
  allVerdicts:    ()      => apiFetch("/verdicts"),
  myVerdicts:     ()      => apiFetch("/verdicts/mine"),
  readVerdict:    (id)    => apiFetch(`/verdicts/${id}/read`, { method:"PATCH" }),
  // ── IA ────────────────────────────────────────────────────
  aiQuery:           (pregunta) => apiFetch("/ai/query",          { method:"POST", body:{pregunta} }),
  aiVerdictSuggest:  (caso)     => apiFetch("/ai/verdict-suggest", { method:"POST", body:{caso} }),
  aiDocs:            ()         => apiFetch("/ai-docs"),
  aiDoc:             (id)       => apiFetch(`/ai-docs/${id}`),
  aiDocCreate:       (data)     => apiFetch("/ai-docs",            { method:"POST",   body:data }),
  aiDocUpdate:       (id, data) => apiFetch(`/ai-docs/${id}`,      { method:"PATCH",  body:data }),
  aiDocDelete:       (id)       => apiFetch(`/ai-docs/${id}`,      { method:"DELETE" }),
  // ── Diwy ──────────────────────────────────────────────────────
  diwyStudents:       ()          => apiFetch("/diwy/students"),
  diwyAddObs:         (data)      => apiFetch("/diwy/observations",         { method:"POST",   body:data }),
  diwyObservations:   (studentId) => apiFetch(`/diwy/observations/${studentId}`),
  diwyDeleteObs:      (id)        => apiFetch(`/diwy/observations/${id}`,   { method:"DELETE" }),
  diwyGenerate:       (studentId) => apiFetch(`/diwy/generate/${studentId}`,{ method:"POST" }),
  diwyReports:        (studentId) => apiFetch(`/diwy/reports/${studentId}`),
  diwyReview:         (id, data)  => apiFetch(`/diwy/reports/${id}/review`, { method:"PATCH",  body:data }),
  diwyApprove:        (id)        => apiFetch(`/diwy/reports/${id}/approve`,{ method:"PATCH" }),
  diwyParentReports:  ()          => apiFetch("/diwy/parent"),
  diwyParentRequest:  (studentId) => apiFetch(`/diwy/parent/request/${studentId}`, { method:"POST" }),
  diwyParentSnapshot: ()          => apiFetch("/diwy/parent/snapshot"),
  diwyParentAsk:      (data)      => apiFetch("/diwy/parent/ask",                  { method:"POST", body:data }),
  // ── Parent portal ─────────────────────────────────────────
  parentLinkSearch:    (name)      => apiFetch(`/parent/link-search?q=${encodeURIComponent(name)}`),
  parentLinkConfirm:   (studentId) => apiFetch("/parent/link-request/confirm", { method:"POST", body:{student_id:studentId} }),
  parentLinkRequests:  ()          => apiFetch("/parent/link-requests"),
  parentLinkCancel:    (id)        => apiFetch(`/parent/link-requests/${id}`, { method:"DELETE" }),
  parentChildrenVerdicts: ()       => apiFetch("/parent/children-verdicts"),
  parentBurn:          (amount)    => apiFetch("/parent/burn", { method:"POST", body:{amount} }),
  parentChatMessages:  ()          => apiFetch("/chat/parent-messages"),
  parentChatSend:      (texto)     => apiFetch("/chat/parent-messages", { method:"POST", body:{texto} }),
  // ── Parent chat v2 (conversations infrastructure) ─────────────
  parentGlobalInfo:    ()          => apiFetch("/chat/parent-global/info"),
  parentGlobalMsgs:    ()          => apiFetch("/chat/parent-global/messages"),
  parentClassroomInfo: ()          => apiFetch("/chat/parent-classroom/info"),
  parentClassroomMsgs: ()          => apiFetch("/chat/parent-classroom/messages"),
  parentUsersSearch:   (q)         => apiFetch(`/chat/parent-users/search?q=${encodeURIComponent(q)}`),
  adminLinkRequests:   ()          => apiFetch("/admin/link-requests"),
  adminLinkApprove:    (id)        => apiFetch(`/admin/link-requests/${id}/approve`, { method:"PATCH" }),
  adminLinkReject:     (id)        => apiFetch(`/admin/link-requests/${id}/reject`,  { method:"PATCH" }),
};

// ── GAMIFICACIÓN (local, solo visual) ────────────────────────
// ── Helper: nombre visible (apodo si tiene, nombre si no) ────

export { apiFetch, connectSocket, getSocket, api };
