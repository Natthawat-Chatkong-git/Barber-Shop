import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const $ = (selector) => document.querySelector(selector);
const state = { supabase: null, services: [], barbers: [], profile: null, authMode: "login" };
const money = (value) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value));
const escapeText = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function api(path, options = {}) {
  const { data: { session } } = await state.supabase.auth.getSession();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
  return payload;
}

function showMessage(selector, message, isError = false) {
  const element = $(selector);
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function renderServices() {
  $("#service-count").textContent = `${state.services.length} รายการ`;
  $("#service-state").textContent = state.services.length ? "" : "ขณะนี้ยังไม่มีบริการที่เปิดใช้งาน";
  $("#service-list").replaceChildren(...state.services.map((service) => {
    const card = document.createElement("article");
    card.className = "service-card";
    const name = document.createElement("h3");
    name.textContent = service.name;
    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = service.description || "บริการจาก Barber-Shop";
    const meta = document.createElement("div");
    meta.className = "service-meta";
    meta.innerHTML = `<span>${Number(service.duration_minutes)} นาที</span><strong>${money(service.price)}</strong>`;
    card.append(name, description, meta);
    return card;
  }));

  $("#booking-services").replaceChildren(...state.services.map((service) => {
    const label = document.createElement("label");
    label.className = "choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "serviceIds";
    checkbox.value = service.id;
    checkbox.addEventListener("change", updateTotal);
    const text = document.createElement("span");
    text.textContent = `${service.name} · ${money(service.price)} · ${service.duration_minutes} นาที`;
    label.append(checkbox, text);
    return label;
  }));
}

function updateTotal() {
  const ids = new Set([...document.querySelectorAll('input[name="serviceIds"]:checked')].map((input) => input.value));
  const total = state.services.filter((service) => ids.has(service.id)).reduce((sum, service) => sum + Number(service.price), 0);
  $("#booking-total").textContent = money(total);
}

async function loadPublicData() {
  const [services, barbers] = await Promise.all([api("/api/services"), api("/api/barbers")]);
  state.services = services.data || [];
  state.barbers = barbers.data || [];
  renderServices();
  $("#barber-select").replaceChildren(new Option("ช่างที่ว่าง (ระบบเลือกให้อัตโนมัติ)", ""));
  state.barbers.forEach((barber) => $("#barber-select").add(new Option(barber.display_name, barber.id)));
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  $("#name-field").classList.toggle("hidden", mode !== "signup");
  $("#full-name").required = mode === "signup";
  $("#password").autocomplete = mode === "signup" ? "new-password" : "current-password";
  $("#auth-submit").textContent = mode === "signup" ? "สร้างบัญชี" : "เข้าสู่ระบบ";
  showMessage("#auth-message", "");
}

async function loadProfile() {
  const result = await api("/api/me");
  state.profile = result.data;
  $("#account-label").textContent = state.profile.full_name;
  $("#signout-button").classList.remove("hidden");
  $("#auth-panel").classList.add("hidden");
  $("#booking-panel").classList.remove("hidden");
  $("#my-appointments").classList.remove("hidden");
  await loadAppointments();
  if (state.profile.role === "admin") {
    $("#admin-panel").classList.remove("hidden");
    await loadAdminDashboard();
  }
}

async function loadAppointments() {
  showMessage("#appointments-state", "กำลังโหลดรายการจอง...");
  try {
    const result = await api("/api/appointments");
    const rows = result.data || [];
    $("#appointments-state").textContent = rows.length ? "" : "ยังไม่มีรายการจอง";
    $("#appointments-list").replaceChildren(...rows.map((item) => {
      const card = document.createElement("article");
      card.className = "appointment-card";
      const date = new Date(item.starts_at);
      const serviceNames = (item.appointment_services || []).map((service) => service.service_name).join(", ");
      const barber = item.barbers?.display_name || "ช่าง";
      card.innerHTML = `<div><strong>${escapeText(serviceNames || "รายการบริการ")}</strong><p class="muted">${date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })} · ${escapeText(barber)}</p></div><span class="status status-${escapeText(item.status)}">${statusLabel(item.status)}</span>`;
      return card;
    }));
  } catch (error) {
    showMessage("#appointments-state", error.message, true);
  }
}

function statusLabel(status) {
  return ({ pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", in_progress: "กำลังให้บริการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", no_show: "ไม่มาตามนัด" })[status] || status;
}

async function handleAuth(event) {
  event.preventDefault();
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const submit = $("#auth-submit");
  submit.disabled = true;
  showMessage("#auth-message", "กำลังดำเนินการ...");
  try {
    if (state.authMode === "signup") {
      const fullName = $("#full-name").value.trim();
      const { data, error } = await state.supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      if (!data.session) {
        showMessage("#auth-message", "สมัครสมาชิกสำเร็จ กรุณายืนยันอีเมลจากกล่องจดหมาย แล้วกลับมาเข้าสู่ระบบ");
        return;
      }
    } else {
      const { error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    await loadProfile();
    showMessage("#auth-message", "");
  } catch (error) {
    showMessage("#auth-message", error.message, true);
  } finally {
    submit.disabled = false;
  }
}

async function handleBooking(event) {
  event.preventDefault();
  const serviceIds = [...document.querySelectorAll('input[name="serviceIds"]:checked')].map((input) => input.value);
  if (!serviceIds.length) return showMessage("#booking-message", "กรุณาเลือกบริการอย่างน้อย 1 รายการ", true);
  const localValue = $("#booking-time").value;
  if (!localValue) return showMessage("#booking-message", "กรุณาเลือกวันที่และเวลา", true);
  const startsAt = new Date(`${localValue}:00+07:00`);
  if (Number.isNaN(startsAt.getTime())) return showMessage("#booking-message", "วันและเวลาไม่ถูกต้อง", true);

  const submit = event.submitter;
  submit.disabled = true;
  showMessage("#booking-message", "กำลังตรวจสอบและบันทึกการจอง...");
  try {
    await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        serviceIds,
        startsAt: startsAt.toISOString(),
        barberId: $("#barber-select").value || null,
        customerNote: $("#booking-note").value.trim() || null
      })
    });
    showMessage("#booking-message", "จองคิวสำเร็จ");
    $("#booking-form").reset();
    updateTotal();
    await loadAppointments();
  } catch (error) {
    showMessage("#booking-message", error.message, true);
  } finally {
    submit.disabled = false;
  }
}


async function loadAdminDashboard() {
  showMessage("#admin-appointments-message", "กำลังโหลดข้อมูลผู้ดูแล...");
  try {
    const [appointments, services, barbers] = await Promise.all([
      api("/api/admin/appointments"), api("/api/admin/services"), api("/api/admin/barbers")
    ]);
    renderAdminAppointments(appointments.data || []);
    renderAdminServices(services.data || []);
    renderAdminBarbers(barbers.data || []);
    showMessage("#admin-appointments-message", "");
  } catch (error) {
    showMessage("#admin-appointments-message", error.message, true);
  }
}

function renderAdminAppointments(rows) {
  const list = $("#admin-appointments");
  list.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "ยังไม่มีรายการจอง"; list.append(empty); return;
  }
  rows.forEach((item) => {
    const card = document.createElement("article"); card.className = "admin-row";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.profiles?.full_name || "ลูกค้า";
    const detail = document.createElement("p"); detail.className = "muted";
    const when = new Date(item.starts_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
    detail.textContent = `${when} · ${(item.appointment_services || []).map((s) => s.service_name).join(", ")} · ${item.barbers?.display_name || "ช่าง"}`;
    info.append(title, detail);
    const controls = document.createElement("div"); controls.className = "admin-controls";
    const select = document.createElement("select");
    ["pending","confirmed","in_progress","completed","cancelled","no_show"].forEach((status) => select.add(new Option(statusLabel(status), status)));
    select.value = item.status;
    const save = document.createElement("button"); save.className = "button button-quiet"; save.type = "button"; save.textContent = "บันทึก";
    save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        await api(`/api/admin/appointments/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status: select.value }) });
        showMessage("#admin-appointments-message", "อัปเดตสถานะคิวแล้ว");
        await loadAppointments();
      } catch (error) { showMessage("#admin-appointments-message", error.message, true); }
      finally { save.disabled = false; }
    });
    controls.append(select, save); card.append(info, controls); list.append(card);
  });
}

function renderAdminServices(rows) {
  const list = $("#admin-services"); list.replaceChildren();
  rows.forEach((item) => {
    const row = document.createElement("div"); row.className = "admin-row";
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = item.name;
    const detail = document.createElement("p"); detail.className = "muted"; detail.textContent = `${money(item.price)} · ${item.duration_minutes} นาที`;
    info.append(title, detail);
    const toggle = document.createElement("button"); toggle.className = "button button-quiet"; toggle.type = "button"; toggle.textContent = item.is_active ? "ปิดบริการ" : "เปิดบริการ";
    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try { await api(`/api/admin/services/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !item.is_active }) }); await loadAdminDashboard(); await loadPublicData(); }
      catch (error) { showMessage("#admin-service-message", error.message, true); }
      finally { toggle.disabled = false; }
    });
    row.append(info, toggle); list.append(row);
  });
}

function renderAdminBarbers(rows) {
  const list = $("#admin-barbers"); list.replaceChildren();
  if (!rows.length) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "ยังไม่มีข้อมูลช่าง กรุณาเพิ่มบัญชีช่างก่อน"; list.append(empty); return; }
  rows.forEach((item) => {
    const row = document.createElement("div"); row.className = "admin-row";
    const name = document.createElement("strong"); name.textContent = item.display_name;
    const toggle = document.createElement("button"); toggle.className = "button button-quiet"; toggle.type = "button"; toggle.textContent = item.is_active ? "ปิดรับจอง" : "เปิดรับจอง";
    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try { await api(`/api/admin/barbers/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !item.is_active }) }); await loadAdminDashboard(); await loadPublicData(); }
      catch (error) { showMessage("#admin-appointments-message", error.message, true); }
      finally { toggle.disabled = false; }
    });
    row.append(name, toggle); list.append(row);
  });
}

async function handleAdminServiceCreate(event) {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    await api("/api/admin/services", { method: "POST", body: JSON.stringify({
      name: $("#new-service-name").value.trim(),
      description: $("#new-service-description").value.trim(),
      durationMinutes: Number($("#new-service-duration").value),
      price: Number($("#new-service-price").value)
    })});
    $("#admin-service-form").reset();
    showMessage("#admin-service-message", "เพิ่มบริการแล้ว");
    await loadAdminDashboard(); await loadPublicData();
  } catch (error) { showMessage("#admin-service-message", error.message, true); }
  finally { button.disabled = false; }
}

async function init() {
  $("#year").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  $("#auth-form").addEventListener("submit", handleAuth);
  $("#booking-form").addEventListener("submit", handleBooking);
  $("#refresh-bookings").addEventListener("click", loadAppointments);
  $("#admin-refresh").addEventListener("click", loadAdminDashboard);
  $("#admin-service-form").addEventListener("submit", handleAdminServiceCreate);
  $("#signout-button").addEventListener("click", async () => {
    await state.supabase.auth.signOut();
    window.location.reload();
  });

  try {
    const configResponse = await fetch("/api/config");
    if (!configResponse.ok) throw new Error("โหลดการตั้งค่าระบบไม่สำเร็จ");
    const config = await configResponse.json();
    state.supabase = createClient(config.supabaseUrl, config.supabasePublishableKey);
    await loadPublicData();

    const { data: { session } } = await state.supabase.auth.getSession();
    if (session) {
      try { await loadProfile(); }
      catch { await state.supabase.auth.signOut(); }
    }
    state.supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        state.profile = null;
        $("#account-label").textContent = "ยังไม่ได้เข้าสู่ระบบ";
        $("#signout-button").classList.add("hidden");
        $("#auth-panel").classList.remove("hidden");
        $("#booking-panel").classList.add("hidden");
        $("#my-appointments").classList.add("hidden");
      }
    });
  } catch (error) {
    showMessage("#service-state", error.message, true);
  }
}

init();
