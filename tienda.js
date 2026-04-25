/* ══════════════════════════════════════
   AUTONOVA — tienda.js
   Sistema de carrito, checkout y factura
   ══════════════════════════════════════ */

const cart = {};

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  initSearch();
  updateCount();
  renderCart();
});

/* ════════ INSTALL TOGGLE ════════ */
const installSelected = {};   // { productId: true/false }

function toggleInstall(id) {
  installSelected[id] = !installSelected[id];
  const btn  = document.getElementById('install-btn-' + id);
  if (!btn) return;
  if (installSelected[id]) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

/* ════════ CANTIDAD EN TARJETA ════════ */
function changeQty(id, delta) {
  const el = document.getElementById('qty-' + id);
  if (!el) return;
  let val = parseInt(el.textContent) + delta;
  if (val < 1) val = 1;
  el.textContent = val;
}

/* ════════ AGREGAR AL CARRITO ════════ */
function addToCartFull(id) {
  const card  = document.querySelector('[data-id="' + id + '"]');
  if (!card) return;
  const name    = card.dataset.name;
  const price   = parseInt(card.dataset.unit);
  const install = parseInt(card.dataset.install || 0);
  const icon    = card.dataset.icon;
  const qty     = parseInt(document.getElementById('qty-' + id)?.textContent || 1);
  const withInstall = !!installSelected[id];
  const total   = price + (withInstall ? install : 0);

  const cartKey = withInstall ? id + '-install' : id;
  const label   = withInstall ? name + ' + Instalación' : name;

  if (cart[cartKey]) {
    cart[cartKey].qty += qty;
  } else {
    cart[cartKey] = { name: label, price: total, qty, icon, installPrice: withInstall ? install : 0 };
  }
  renderCart();
  showToast('🛒 ' + label + ' agregado');
  openCart();
}

/* ════════ RENDER CARRITO ════════ */
function renderCart() {
  const itemsEl  = document.getElementById('cartItems');
  const emptyEl  = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const countEl  = document.getElementById('cartCount');
  if (!itemsEl) return;
  const keys = Object.keys(cart);
  const totalQty = keys.reduce((s, k) => s + cart[k].qty, 0);
  if (countEl) countEl.textContent = totalQty;
  if (keys.length === 0) {
    emptyEl.style.display  = 'block';
    footerEl.style.display = 'none';
    itemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());
    return;
  }
  emptyEl.style.display  = 'none';
  footerEl.style.display = 'block';
  itemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());
  keys.forEach(id => {
    const item = cart[id];
    const div  = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML =
      '<div class="cart-item-icon"><i class="' + item.icon + '"></i></div>' +
      '<div class="cart-item-info"><h5>' + item.name + '</h5><p>' + fmt(item.price) + ' c/u</p></div>' +
      '<div class="cart-item-right">' +
        '<div class="cart-item-price">' + fmt(item.price * item.qty) + '</div>' +
        '<div class="cart-item-qty">' +
          '<button class="cqty-btn" onclick="cartQty(\'' + id + '\',-1)">−</button>' +
          '<span class="cqty-val">' + item.qty + '</span>' +
          '<button class="cqty-btn" onclick="cartQty(\'' + id + '\',1)">+</button>' +
          '<button class="cart-item-remove" onclick="removeFromCart(\'' + id + '\')" title="Eliminar">✕</button>' +
        '</div></div>';
    itemsEl.appendChild(div);
  });
  const subtotal = keys.reduce((s, k) => s + cart[k].price * cart[k].qty, 0);
  const iva      = Math.round(subtotal * 0.19);
  const total    = subtotal + iva;
  document.getElementById('cartSubtotal').textContent = fmt(subtotal);
  document.getElementById('cartIva').textContent      = fmt(iva);
  document.getElementById('cartTotal').textContent    = fmt(total);
}

function cartQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty = Math.max(1, cart[id].qty + delta);
  renderCart();
}
function removeFromCart(id) { delete cart[id]; renderCart(); }

/* ════════ PANEL CARRITO ════════ */
function openCart() {
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ════════ CHECKOUT MODAL ════════ */
function openCheckout() {
  closeCart();
  buildCheckoutSummary();
  document.getElementById('checkoutOverlay').classList.add('open');
}
function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('open');
  document.getElementById('checkoutError').textContent = '';
}
function buildCheckoutSummary() {
  const el   = document.getElementById('checkoutSummary');
  const keys = Object.keys(cart);
  const sub  = keys.reduce((s, k) => s + cart[k].price * cart[k].qty, 0);
  const iva  = Math.round(sub * 0.19);
  const tot  = sub + iva;
  let rows   = keys.map(k =>
    '<div class="cs-row"><span><i class="' + cart[k].icon + '" style="margin-right:.3rem;color:#FE88BC"></i>' + cart[k].name + ' x' + cart[k].qty + '</span><span>' + fmt(cart[k].price * cart[k].qty) + '</span></div>'
  ).join('');
  el.innerHTML =
    '<h5>Resumen del pedido</h5>' + rows +
    '<div class="cs-row"><span>Subtotal</span><span>' + fmt(sub) + '</span></div>' +
    '<div class="cs-row"><span>IVA (19%)</span><span>' + fmt(iva) + '</span></div>' +
    '<div class="cs-row total"><span>Total a pagar</span><span>' + fmt(tot) + '</span></div>';
}

/* ════════ GENERAR FACTURA ════════ */
function generarFactura() {
  const nombre    = document.getElementById('cNombre').value.trim();
  const cedula    = document.getElementById('cCedula').value.trim();
  const email     = document.getElementById('cEmail').value.trim();
  const tel       = document.getElementById('cTel').value.trim();
  const direccion = document.getElementById('cDireccion').value.trim();
  const pago      = document.getElementById('cPago').value;
  const errEl     = document.getElementById('checkoutError');

  if (!nombre || !cedula || !email || !direccion) {
    errEl.textContent = '⚠️ Completa todos los campos obligatorios (*)'; return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = '⚠️ Correo electrónico no válido'; return;
  }
  errEl.textContent = '';

  const keys   = Object.keys(cart);
  const sub    = keys.reduce((s, k) => s + cart[k].price * cart[k].qty, 0);
  const iva    = Math.round(sub * 0.19);
  const total  = sub + iva;
  const facNum = 'AUT-' + Date.now().toString().slice(-8);
  const fecha  = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
  const hora   = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  const pagoLabels = { transferencia:'Transferencia bancaria', efectivo:'Efectivo en tienda', nequi:'Nequi / Daviplata', tarjeta:'Tarjeta crédito/débito' };

  const itemRows = keys.map(k =>
    '<tr><td><i class="' + cart[k].icon + '" style="margin-right:.3rem;color:#FE88BC"></i>' + cart[k].name + '</td>' +
    '<td style="text-align:center">' + cart[k].qty + '</td>' +
    '<td style="text-align:right">' + fmt(cart[k].price) + '</td>' +
    '<td style="text-align:right">' + fmt(cart[k].price * cart[k].qty) + '</td></tr>'
  ).join('');

  document.getElementById('invoiceContent').innerHTML =
    '<div class="invoice-header">' +
      '<div class="invoice-brand">' +
        '<div class="logo-inv">AUTO<span>NOVA</span></div>' +
        '<p>Cra 15 #85-22, Cali, Colombia</p>' +
        '<p>+57 310 000 0000 · contacto@autonova.co</p>' +
        '<p>NIT: 900.123.456-7</p>' +
      '</div>' +
      '<div class="invoice-meta">' +
        '<h4>FACTURA DE VENTA</h4>' +
        '<p class="inv-num">N° ' + facNum + '</p>' +
        '<p>Fecha: ' + fecha + '</p>' +
        '<p>Hora: ' + hora + '</p>' +
        '<p>Pago: ' + pagoLabels[pago] + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="invoice-client">' +
      '<div class="inv-field"><label>Cliente</label><span>' + nombre + '</span></div>' +
      '<div class="inv-field"><label>Cédula / NIT</label><span>' + cedula + '</span></div>' +
      '<div class="inv-field"><label>Correo</label><span>' + email + '</span></div>' +
      '<div class="inv-field"><label>Teléfono</label><span>' + (tel || '—') + '</span></div>' +
      '<div class="inv-field" style="grid-column:1/-1"><label>Dirección de envío</label><span>' + direccion + '</span></div>' +
    '</div>' +
    '<table class="invoice-table">' +
      '<thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio unit.</th><th style="text-align:right">Total</th></tr></thead>' +
      '<tbody>' + itemRows + '</tbody>' +
    '</table>' +
    '<div class="invoice-totals">' +
      '<div class="inv-tot-row"><span>Subtotal</span><span>' + fmt(sub) + '</span></div>' +
      '<div class="inv-tot-row"><span>IVA (19%)</span><span>' + fmt(iva) + '</span></div>' +
      '<div class="inv-tot-row grand"><span>TOTAL</span><span>' + fmt(total) + '</span></div>' +
    '</div>' +
    '<div class="invoice-footer">' +
      '<p>Gracias por tu compra en <strong>AUTONOVA</strong> 🌸</p>' +
      '<p>Esta factura es tu comprobante de pago. Conserva una copia.</p>' +
      '<p>Garantía de 12 meses · Instalación disponible bajo cita previa</p>' +
      '<p style="margin-top:.5rem;font-size:.72rem">Innova con AutoNova — autonova.co</p>' +
    '</div>';

  closeCheckout();
  document.getElementById('invoiceOverlay').classList.add('open');
  Object.keys(cart).forEach(k => delete cart[k]);
  renderCart();
}

function closeInvoice() { document.getElementById('invoiceOverlay').classList.remove('open'); }
function imprimirFactura() { window.print(); }

/* ════════ HELPERS ════════ */
function fmt(n) { return '$' + n.toLocaleString('es-CO'); }

function showToast(msg) {
  const t = document.getElementById('cartToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function initFilters() {
  let activeCategory = 'todos';
  let activePrice = 'all';

  function applyFilters() {
    const cards = document.querySelectorAll('.product-card');
    let visible = 0;
    cards.forEach(c => {
      const cat   = c.dataset.category;
      const price = parseInt(c.dataset.price);
      const catOk = activeCategory === 'todos' || cat === activeCategory;
      let priceOk = true;
      if (activePrice === 'low')  priceOk = price <= 90000;
      if (activePrice === 'mid')  priceOk = price > 90000 && price <= 200000;
      if (activePrice === 'high') priceOk = price > 200000;
      const show = catOk && priceOk;
      c.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    updateCount(visible);
    document.getElementById('emptyState').style.display = visible === 0 ? 'block' : 'none';
  }

  document.querySelectorAll('[data-filter]').forEach(l => {
    l.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('active'));
      l.classList.add('active');
      activeCategory = l.dataset.filter;
      applyFilters();
    });
  });

  document.querySelectorAll('[data-price]').forEach(l => {
    l.addEventListener('click', () => {
      activePrice = l.dataset.price;
      applyFilters();
    });
  });

  const sortEl = document.getElementById('sortSelect');
  if (sortEl) {
    sortEl.addEventListener('change', () => {
      const grid  = document.getElementById('productsGrid');
      const cards = [...grid.querySelectorAll('.product-card')];
      if (sortEl.value === 'price-asc')  cards.sort((a,b) => parseInt(a.dataset.price) - parseInt(b.dataset.price));
      if (sortEl.value === 'price-desc') cards.sort((a,b) => parseInt(b.dataset.price) - parseInt(a.dataset.price));
      if (sortEl.value === 'rating')     cards.sort((a,b) => parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating));
      cards.forEach(c => grid.appendChild(c));
    });
  }

  applyFilters();
}
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    let visible = 0;
    document.querySelectorAll('.product-card').forEach(c => {
      const txt = (c.querySelector('h4')?.textContent || '').toLowerCase();
      const show = txt.includes(q);
      c.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    updateCount(visible);
    document.getElementById('emptyState').style.display = visible === 0 ? 'block' : 'none';
  });
}
function updateCount(n) {
  const el = document.getElementById('resultsCount');
  if (!el) return;
  const total = n !== undefined ? n : document.querySelectorAll('#productsGrid .product-card').length;
  el.innerHTML = 'Mostrando <strong>' + total + '</strong> producto' + (total !== 1 ? 's' : '');
}
