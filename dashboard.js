const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let currentStoreId = "perfumescentre";
let storeConfig = {
  storeName: "",
  whatsappNumber: "",
  slogan: "",
  logoUrl: "",
  categories: [],
  products: []
};

function getEl(id) { return document.getElementById(id); }

function updateStoreLinkBanner(storeId) {
  const banner = getEl("store-link-banner");
  const urlText = getEl("store-url-text");
  const btn = getEl("visit-store-btn");
  if (!storeId || !banner) return;

  const storeRelativePath = `index.html?store=${encodeURIComponent(storeId)}`;
  const fullUrl = `${window.location.origin}${window.location.pathname.replace(/dashboard\.html$/i, "")}${storeRelativePath}`;

  if (urlText) urlText.innerText = fullUrl;
  if (btn) { btn.href = storeRelativePath; btn.target = "_blank"; }
  banner.style.display = "flex";
}

// Canvas Compression: Max 600px width/height, 0.6 JPEG quality
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
  const catBoxes = getEl("product-category-checkboxes");

  if (catList) {
    catList.innerHTML = (storeConfig.categories || [])
      .map((c, i) => `<li>${c} <button class="btn btn-danger btn-sm" onclick="deleteCategory(${i})">✕</button></li>`)
      .join("");
  }
  if (catBoxes) {
    if ((storeConfig.categories || []).length === 0) {
      catBoxes.innerHTML = `<span style="color:#6c757d; font-size:12px;">Add categories above first.</span>`;
    } else {
      catBoxes.innerHTML = (storeConfig.categories || [])
        .map(c => `
          <label class="checkbox-label">
            <input type="checkbox" class="prod-cat-checkbox" value="${c}"> ${c}
          </label>
        `).join("");
    }
  }
}

function renderProducts() {
  const tbody = getEl("products-table-body");
  if (!tbody) return;

  tbody.innerHTML = (storeConfig.products || [])
    .map((p, i) => {
      const cats = Array.isArray(p.categories) ? p.categories.join(", ") : (p.category || '-');
      const variantStr = (p.variants || [])
        .map(v => `${v.size}: KSh ${v.price}`)
        .join(", ") || "No variants";

      return `
        <tr>
          <td><img src="${p.image || ''}" width="40" height="40" style="object-fit:cover; border-radius:4px;" /></td>
          <td><strong>${p.name}</strong></td>
          <td>${cats}</td>
          <td>${variantStr}</td>
          <td><span style="color:${p.inStock ? 'green' : 'red'}; font-weight:bold;">${p.inStock ? 'In Stock' : 'Out of Stock'}</span></td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteProduct(${i})">Delete</button></td>
        </tr>
      `;
    }).join("");
}

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

window.addVariantRow = function() {
  const container = getEl("variants-container");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "variant-row";
  div.innerHTML = `
    <input type="text" placeholder="Size (e.g. 100ml)" class="variant-size" style="flex:1;">
    <input type="number" placeholder="Price (KSh)" class="variant-price" style="flex:1;">
    <button class="btn btn-danger btn-sm" type="button" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
};

window.addProduct = async function() {
  const name = getEl("prod-name").value.trim();
  const inStock = getEl("prod-stock").value === "true";
  const fileInput = getEl("prod-image");

  // Collect Multiple Selected Categories
  const checkedBoxes = document.querySelectorAll(".prod-cat-checkbox:checked");
  const categories = Array.from(checkedBoxes).map(cb => cb.value);

  if (!name) return alert("Product name is required.");
  if (categories.length === 0) return alert("Please select at least one category.");

  // Parse Variants
  const sizeInputs = document.querySelectorAll(".variant-size");
  const priceInputs = document.querySelectorAll(".variant-price");
  const variants = [];

  sizeInputs.forEach((sInput, idx) => {
    const size = sInput.value.trim();
    const price = parseFloat(priceInputs[idx].value) || 0;
    if (size && price > 0) variants.push({ size, price });
  });

  let image = "";
  if (fileInput.files && fileInput.files[0]) {
    image = await compressImage(fileInput.files[0]);
  }

  storeConfig.products = storeConfig.products || [];
  storeConfig.products.push({ name, categories, variants, inStock, image });
  
  // Clear Form
  getEl("prod-name").value = "";
  fileInput.value = "";
  document.querySelectorAll(".prod-cat-checkbox").forEach(cb => cb.checked = false);
  getEl("variants-container").innerHTML = `
    <div class="variant-row">
      <input type="text" placeholder="Size (e.g. 100ml)" class="variant-size" style="flex:1;">
      <input type="number" placeholder="Price (KSh)" class="variant-price" style="flex:1;">
      <button class="btn btn-danger btn-sm" type="button" onclick="this.parentElement.remove()">✕</button>
    </div>
  `;
  
  renderProducts();
};

window.deleteProduct = function(i) {
  storeConfig.products.splice(i, 1);
  renderProducts();
};

window.saveStoreConfig = function() {
  storeConfig.storeName = getEl("store-name-input").value;
  storeConfig.whatsappNumber = getEl("store-phone-input").value;
  storeConfig.slogan = getEl("store-slogan-input").value;
  storeConfig.logoUrl = getEl("store-logo-input").value;
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
    if (getEl("store-slogan-input")) getEl("store-slogan-input").value = storeConfig.slogan || "";
    if (getEl("store-logo-input")) getEl("store-logo-input").value = storeConfig.logoUrl || "";
  }

  renderCategories();
  renderProducts();
});
