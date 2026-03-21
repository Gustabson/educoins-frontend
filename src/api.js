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
  if (_socket?.connected) return _socket;
  if (_socket) { _socket.disconnect(); _socket = null; }
  _socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });
  _socket.on('connect', () => console.log('Socket conectado:', _socket.id));
  _socket.on('connect_error', (e) => console.warn('Socket error:', e.message));
  return _socket;
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
  rankingLive:    (p,s,cid)               => apiFetch(`/ranking/live?periodo=${p}&scope=${s}${cid?`&classroom_id=${cid}`:""}`),
  rankingConfig:  ()                      => apiFetch("/ranking/config"),
  rankingConfigUpdate:(id,d)              => apiFetch(`/ranking/config/${id}`, { method:"PATCH", body:d }),
  rankingConfigCreate:(d)                 => apiFetch("/ranking/config",       { method:"POST",  body:d }),
  rankingClose:   (d)                     => apiFetch("/ranking/close",        { method:"POST",  body:d }),
  rankingPayouts: ()                      => apiFetch("/ranking/payouts"),
  rankingRevert:  (id,motivo)             => apiFetch(`/ranking/payouts/${id}/revert`, { method:"POST", body:{motivo} }),
  subscribe:      (item_id,periodo)       => apiFetch("/subscriptions/subscribe", { method:"POST", body:{item_id,periodo} }),
  mySubscriptions:()                      => apiFetch("/subscriptions/me"),
  cancelSub:      (id)                    => apiFetch(`/subscriptions/${id}`,  { method:"DELETE" }),
  chargeAll:      ()                      => apiFetch("/subscriptions/charge-all", { method:"POST" }),
  equip:          (type, item_id)         => apiFetch("/profile/equip",       { method:"POST", body:{type,item_id} }),
  adminUsers:     ()                      => apiFetch("/admin/users"),
  createUser:     (data)                  => apiFetch("/admin/users",         { method:"POST", body:data }),
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
  polls:          (scope,cid)             => apiFetch(`/polls${scope?'?scope='+scope+(cid?'&classroom_id='+cid:''):(cid?'?classroom_id='+cid:'')}`),
  poll:           (id)                    => apiFetch(`/polls/${id}`),
  vote:           (poll_id, option_id)    => apiFetch(`/polls/${poll_id}/vote`,{ method:"POST", body:{option_id} }),
  createPoll:     (data)                  => apiFetch("/polls",               { method:"POST", body:data }),
  reactPoll:      (id, tipo)              => apiFetch(`/polls/${id}/react`,    { method:"POST", body:{tipo} }),
  pollComments:   (id)                    => apiFetch(`/polls/${id}/comments`),
  createComment:  (id, data)              => apiFetch(`/polls/${id}/comments`, { method:"POST", body:data }),
  commentReplies: (pid, cid)              => apiFetch(`/polls/${pid}/comments/${cid}/replies`),
  reactComment:   (pid, cid, tipo)        => apiFetch(`/polls/${pid}/comments/${cid}/react`, { method:"POST", body:{tipo} }),
  deleteComment:  (pid, cid)              => apiFetch(`/polls/${pid}/comments/${cid}`, { method:"DELETE" }),
  // ── Personalización ───────────────────────────────────────
  customShop:     (tipo)     => apiFetch(`/custom/shop${tipo?`?tipo=${tipo}`:""}`),
  customMe:       ()         => apiFetch("/custom/me"),
  customUser:     (id)       => apiFetch(`/custom/user/${id}`),
  customBuy:      (item_id)  => apiFetch("/custom/buy",    { method:"POST", body:{item_id} }),
  customEquip:    (tipo,item_id,custom_bg_color,custom_accent_color) => apiFetch("/custom/equip",{ method:"POST", body:{tipo,item_id,custom_bg_color,custom_accent_color} }),
  customEquipText:(item_id,txt,sub) => apiFetch("/custom/equip",{ method:"POST", body:{tipo:"text_style",item_id,custom_txt_color:txt,custom_sub_color:sub} }),
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
  adminEconomy:   ()         => apiFetch("/admin/economy"),
  adminEconomyUpdate:(id,d)  => apiFetch(`/admin/economy/${id}`,      { method:"PATCH", body:d }),
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
  updateMission:  (id,d)     => apiFetch(`/missions/${id}`,   { method:"PATCH", body:d }),
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
  createReport:   (data)                  => apiFetch("/reports",          { method:"POST", body:data }),
  myReports:      ()                      => apiFetch("/reports/mine"),
  allReports:     (q="")                  => apiFetch(`/reports${q}`),
  updateReport:   (id, data)              => apiFetch(`/reports/${id}/estado`, { method:"PATCH", body:data }),
  reportMessages: (id)                    => apiFetch(`/reports/${id}/messages`),
  sendReportMsg:  (id, texto)             => apiFetch(`/reports/${id}/messages`, { method:"POST", body:{texto} }),
  deletePost:     (id)                    => apiFetch(`/posts/${id}`,          { method:"DELETE" }),
  updatePoll:     (id, data)              => apiFetch(`/polls/${id}`,          { method:"PATCH", body:data }),
  adminClassrooms:()                      => apiFetch("/admin/classrooms"),
  createClassroom:(data)                  => apiFetch("/admin/classrooms",     { method:"POST", body:data }),
  addClassroomMember:(id,data)            => apiFetch(`/admin/classrooms/${id}/members`, { method:"POST", body:data }),
};

// ── GAMIFICACIÓN (local, solo visual) ────────────────────────
// ── Helper: nombre visible (apodo si tiene, nombre si no) ────

export { apiFetch, connectSocket, getSocket, api };
