const serviceList = document.querySelector("#service-list");
const serviceState = document.querySelector("#service-state");
const serviceCount = document.querySelector("#service-count");

function formatPrice(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function createServiceCard(service) {
  const card = document.createElement("article");
  card.className = "service-card";

  const title = document.createElement("h3");
  title.textContent = service.name;

  const description = document.createElement("p");
  description.className = "muted";
  description.textContent = service.description || "บริการจาก Barber-Shop";

  const meta = document.createElement("div");
  meta.className = "service-meta";

  const duration = document.createElement("span");
  duration.textContent = `${service.duration_minutes} นาที`;

  const price = document.createElement("strong");
  price.textContent = formatPrice(service.price);

  meta.append(duration, price);
  card.append(title, description, meta);
  return card;
}

async function loadServices() {
  try {
    const response = await fetch("/api/services", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error("ไม่สามารถโหลดรายการบริการได้");
    }

    const result = await response.json();
    const services = Array.isArray(result.data) ? result.data : [];

    serviceList.replaceChildren(...services.map(createServiceCard));
    serviceCount.textContent = `${services.length} รายการ`;
    serviceState.textContent = services.length
      ? ""
      : "ขณะนี้ยังไม่มีบริการที่เปิดใช้งาน";
  } catch (error) {
    serviceState.textContent = error.message;
  }
}

loadServices();
