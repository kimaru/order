const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let currentStoreId = "perfumescentre";
let storeConfig = {
  storeName: "",
  whatsappNumber: "",
  categories: [],
  products: []
};

function getEl(id) { return document.getElementById(id); }

// Navigation Banner Logic
function updateStoreLinkBanner(storeId) {
  const banner = getEl("store-link-banner");
  const urlText = getEl("store-url-text");
  const btn = getEl("visit-store-btn");

  if (!storeId || !banner) return;

  const storeRelativePath = `index.html?store=${encodeURIComponent(storeId)}`;
  const fullUrl = `${window.location.origin}${window.location.pathname.replace(/dashboard\.html$/i, "")}${storeRelativePath}`;

  if (urlText) urlText.innerText = fullUrl;
  if (btn) {
    btn.href = storeRelativePath;
    btn.target = "_blank";
  }
  banner.style.display = "flex";
}

// Canvas Base64 Compression to fit Firestore limits
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 600;
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Firestore Converter Helpers
function toFirestore(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") return { doubleValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestore) } };
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestore(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function parseFirestore(valObj) {
  if (!valObj) return null;
  if ("stringValue" in valObj) return valObj.stringValue;
  if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
  if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
  if ("booleanValue" in valObj) return valObj.booleanValue;
  if ("arrayValue" in valObj) return (valObj.arrayValue.values || []).map(parseFirestore);
  if ("mapValue" in valObj) {
    const res = {};
    for (const [k, v] of Object.entries(valObj.mapValue.fields || {})) res[k] = parseFirestore(v);
    return res;
  }
  return null;
}

async function syncToCloud() {
  try {
    const fields = {};
    for (const [k, v] of Object.entries(storeConfig)) fields[k] = toFirestore(v);

    const res = await fetch(`${FIRESTORE_BASE_URL}/stores/${currentStoreId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("Store published successfully!");
  } catch (err) {
    console.error("Cloud Sync Error:", err);
    alert(`Sync failed: ${err.message}`);
  }
}

async function fetchFromCloud(storeId) {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/stores/${storeId}`);
    if (!res.ok) return null;
    const doc = await res.json();
    const data = {};
    for (const [k, v] of Object.entries(doc.fields || {})) data[k] = parseFirestore(v);
    return data;
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
}

function renderCategories() {
  const catList = getEl("category-list");
  const catSelect = getEl("product-category-select");

  if (catList) {
    catList.innerHTML = (storeConfig.categories || [])
      .map((c, i) => `<li>${c} <button class="btn btn-danger" style="padding:2px 6px;" onclick="deleteCategory(${i})">✕</button></li>`)
      .join("");
  }
  if (catSelect) {
    catSelect.innerHTML = (storeConfig.categories || [])
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  }
}

function renderProducts() {
  const tbody = getEl("products-table-body");
  if (!tbody) return;

  tbody.innerHTML = (storeConfig.products || [])
    .map((p, i) => `
      <tr>
        <td><img src="${p.image || ''}" width="40" height="40" style="object-fit:cover; border-radius:4px;" /></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category || '-'}</td>
        <td>KSh ${p.price || 0}</td>
        <td><button class="btn btn-danger" onclick="deleteProduct(${i})">Delete</button></td>
      </tr>
    `).join("");
}

// Global Operations
window.addCategory = function() {
  const input = getEl("new-category-input");
  if (input && input.value.trim()) {
    storeConfig.categories = storeConfig.categories || [];
    storeConfig.categories.push(input.value.trim());
    input.value = "";
    renderCategories();
  }
};

window.deleteCategory = function(i) {
  storeConfig.categories.splice(i, 1);
  renderCategories();
};

window.addProduct = async function() {
  const name = getEl("prod-name").value.trim();
  const category = getEl("product-category-select").value;
  const price = parseFloat(getEl("prod-price").value) || 0;
  const fileInput = getEl("prod-image");

  if (!name) return alert("Product name is required.");

  let image = "";
  if (fileInput.files && fileInput.files[0]) {
    image = await compressImage(fileInput.files[0]);
  }

  storeConfig.products = storeConfig.products || [];
  storeConfig.products.push({ name, category, price, image });
  
  getEl("prod-name").value = "";
  getEl("prod-price").value = "";
  fileInput.value = "";
  
  renderProducts();
};

window.deleteProduct = function(i) {
  storeConfig.products.splice(i, 1);
  renderProducts();
};

window.saveStoreConfig = function() {
  storeConfig.storeName = getEl("store-name-input").value;
  storeConfig.whatsappNumber = getEl("store-phone-input").value;
  syncToCloud();
};

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  currentStoreId = params.get("store") || "perfumescentre";

  updateStoreLinkBanner(currentStoreId);

  const cloudData = await fetchFromCloud(currentStoreId);
  if (cloudData) {
    storeConfig = { ...storeConfig, ...cloudData };
    if (getEl("store-name-input")) getEl("store-name-input").value = storeConfig.storeName || "";
    if (getEl("store-phone-input")) getEl("store-phone-input").value = storeConfig.whatsappNumber || "";
  }

  renderCategories();
  renderProducts();
});
