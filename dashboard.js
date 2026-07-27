// State Management
let products = [];
let availableCategories = ["Men", "Women", "Unisex", "Designer", "Niche"];

// Render Variant Rows in Dashboard Modal
function renderVariantRows(variants = []) {
  const container = document.getElementById("variants-container");
  if (!container) return;
  container.innerHTML = "";

  if (variants.length === 0) {
    // Default initial row
    variants = [{ size: "100ml", price: 0 }];
  }

  variants.forEach((v, idx) => {
    const row = document.createElement("div");
    row.className = "variant-row";
    row.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
    row.innerHTML = `
      <input type="text" class="variant-size" placeholder="Size (e.g. 50ml)" value="${v.size || ""}" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
      <input type="number" class="variant-price" placeholder="Price (KSh)" value="${v.price || ""}" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
      <button type="button" class="remove-variant-btn" data-idx="${idx}" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">✕</button>
    `;
    container.appendChild(row);
  });

  document.querySelectorAll(".remove-variant-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.currentTarget.parentElement.remove();
    });
  });
}

// Add Variant Button Event
const addVariantBtn = document.getElementById("add-variant-btn");
if (addVariantBtn) {
  addVariantBtn.addEventListener("click", () => {
    const container = document.getElementById("variants-container");
    if (!container) return;
    const row = document.createElement("div");
    row.className = "variant-row";
    row.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
    row.innerHTML = `
      <input type="text" class="variant-size" placeholder="Size (e.g. 100ml)" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
      <input type="number" class="variant-price" placeholder="Price (KSh)" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
      <button type="button" class="remove-variant-btn" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">✕</button>
    `;
    container.appendChild(row);

    row.querySelector(".remove-variant-btn").addEventListener("click", () => row.remove());
  });
}

// Helper: Collect Variants from Form
function getVariantsFromForm() {
  const rows = document.querySelectorAll(".variant-row");
  const variants = [];
  rows.forEach((row) => {
    const size = row.querySelector(".variant-size")?.value.trim();
    const price = Number(row.querySelector(".variant-price")?.value || 0);
    if (size && price > 0) {
      variants.push({ size, price });
    }
  });
  return variants;
}

// Firestore REST Payload Converter for Multi-Variants
function serializeProductForFirestore(product) {
  const variantValues = (product.variants || []).map((v) => ({
    mapValue: {
      fields: {
        size: { stringValue: v.size },
        price: { doubleValue: Number(v.price) }
      }
    }
  }));

  const categoryValues = (product.categories || []).map((cat) => ({
    stringValue: cat
  }));

  return {
    mapValue: {
      fields: {
        name: { stringValue: product.name },
        price: { doubleValue: Number(product.price || (product.variants?.[0]?.price || 0)) },
        stock: { stringValue: product.stock },
        img: { stringValue: product.img },
        categories: { arrayValue: { values: categoryValues } },
        variants: { arrayValue: { values: variantValues } }
      }
    }
  };
}
