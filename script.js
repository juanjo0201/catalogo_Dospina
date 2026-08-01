
let PRODUCTOS = [];
let productosFiltrados = [];

const grid = document.getElementById('catalog-grid');
const emptyState = document.getElementById('empty-state');
const filtroTalla = document.getElementById('filtro-talla');
const filtroOrden = document.getElementById('filtro-orden');
const categoryRow = document.getElementById('category-row');

let categoriaActiva = 'todo';
const PRODUCTOS_POR_PAGINA = 24;
let paginaActual = 1;

const NOMBRES_CATEGORIA = {
  'todo': 'Todo',
  'vestidos-cortos': 'Vestidos cortos',
  'vestidos-largos': 'Vestidos largos',
  'chaquetas': 'Chaquetas',
  'faldas': 'Faldas',
  'tops-bodys': 'Tops / Bodys',
  'chalinas': 'Chalinas',
  'zapatos': 'Zapatos',
  'bolsos': 'Bolsos'
};

// ---------- CARGA DE DATOS ----------
async function cargarProductos() {
  try {
    const respuesta = await fetch('data/productos.json');
    PRODUCTOS = await respuesta.json();
    inicializarFiltros();
    aplicarFiltros();
    revisarLinkDirecto();
  } catch (error) {
    grid.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Revisa que data/productos.json exista.</p>';
    console.error('Error cargando productos.json:', error);
  }
}

// ---------- CONFIGURA FILTROS SEGÚN LOS DATOS ----------
function inicializarFiltros() {
  const categorias = ['todo', ...new Set(PRODUCTOS.map(p => p.categoria))];
  categoryRow.innerHTML = categorias.map(cat => `
    <button class="category-pill ${cat === 'todo' ? 'activa' : ''}" data-categoria="${cat}">
      ${NOMBRES_CATEGORIA[cat] || cat}
    </button>
  `).join('');

  categoryRow.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaActiva = btn.dataset.categoria;
      categoryRow.querySelectorAll('.category-pill').forEach(b => b.classList.remove('activa'));
      btn.classList.add('activa');
      actualizarFiltroTalla();
      aplicarFiltros();
    });
  });

  actualizarFiltroTalla();
}

// ---------- ACTUALIZA "TALLA" SEGÚN LA CATEGORÍA ACTIVA ----------
function actualizarFiltroTalla() {
  const productosCategoria = categoriaActiva === 'todo'
    ? PRODUCTOS
    : PRODUCTOS.filter(p => p.categoria === categoriaActiva);

  const tallas = [...new Set(productosCategoria.map(p => p.talla).filter(Boolean))].sort();

  if (tallas.length === 0) {
    filtroTalla.hidden = true;
    filtroTalla.value = '';
  } else {
    filtroTalla.hidden = false;
    filtroTalla.innerHTML = '<option value="">Talla</option>' +
      tallas.map(t => `<option value="${t}">${t}</option>`).join('');
  }
}

// ---------- APLICA BÚSQUEDA + FILTROS + ORDEN ----------
function aplicarFiltros() {
  paginaActual = 1;
  const talla = filtroTalla.value;
  const orden = filtroOrden.value;

  productosFiltrados = PRODUCTOS.filter(p => {
    const coincideCategoria = categoriaActiva === 'todo' || p.categoria === categoriaActiva;
    const coincideTalla = !talla || p.talla === talla;
    return coincideCategoria && coincideTalla;
  });

  if (orden === 'precio-asc') productosFiltrados.sort((a, b) => a.precio - b.precio);
  if (orden === 'precio-desc') productosFiltrados.sort((a, b) => b.precio - a.precio);

  renderizarGrid();
}

// ---------- ARMA EL MENSAJE DE WHATSAPP ----------
function mensajeWhatsapp(producto) {
  const link = `${window.location.origin}${window.location.pathname}#producto-${producto.id}`;
  const nombreCategoria = NOMBRES_CATEGORIA[producto.categoria] || producto.categoria;
  const precioTexto = producto.precio.toLocaleString('es-CO');

  const texto =
`Hola, estoy interesad@ en este producto:

 Categoría: ${nombreCategoria}
 Producto: ${producto.nombre} (#${producto.id})
 Precio: $${precioTexto}${producto.precio_nota ? ' ' + producto.precio_nota : ''}
 Ver aquí: ${link}

¿Sigue disponible?`;

  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
}

// ---------- FORMATO DE PRECIO ----------
function formatoPrecio(producto) {
  const precio = producto.precio.toLocaleString('es-CO');
  return producto.precio_nota
    ? `$${precio} <span>${producto.precio_nota}</span>`
    : `$${precio}`;
}

// ---------- RENDERIZA UNA TARJETA ----------
function crearTarjeta(producto) {
  const agotado = producto.estado === 'agotado';
  const nombreCategoria = NOMBRES_CATEGORIA[producto.categoria] || producto.categoria;

  let mediaHTML;
  if (producto.imagenes && producto.imagenes.length) {
    mediaHTML = `
      <div class="mini-gallery">
        ${producto.imagenes.slice(0, 4).map(img => `
          <img src="${img}" alt="${producto.nombre}" loading="lazy"
               onerror="this.style.display='none'">
        `).join('')}
      </div>`;
  } else {
    mediaHTML = `
      <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy"
           onerror="if(this.closest('.card-media')) this.closest('.card-media').innerHTML = placeholderHTML('${nombreCategoria}')">
    `;
  }

  const detalleTalla = producto.talla ? `Talla ${producto.talla} · ` : '';
  const detalleMaterial = producto.material || '';

  return `
    <article class="card ${agotado ? 'agotado' : ''}" id="producto-${producto.id}">
      ${agotado ? '<span class="badge-agotado">Agotado</span>' : ''}
      <div class="card-media">
        ${mediaHTML}
      </div>
      <div class="card-body">
        <span class="card-categoria">${nombreCategoria}</span>
        <h3 class="card-nombre">${producto.nombre}</h3>
        <p class="card-detalle">${detalleTalla}${detalleMaterial}</p>
        <p class="card-precio">${formatoPrecio(producto)}</p>
        <div class="card-acciones">
          <button class="card-btn ver-detalles" ${agotado ? 'disabled' : ''} onclick="abrirModal(${producto.id})">
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---------- PLACEHOLDER SI FALTA LA IMAGEN ----------
function placeholderHTML(nombreCategoria) {
  return `<div class="card-placeholder">${nombreCategoria}<br>(foto próximamente)</div>`;
}

// ---------- RENDERIZA TODA LA GRILLA ----------
function renderizarGrid() {
  if (!productosFiltrados.length) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  emptyState.hidden = true;

  const totalPaginas = Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const productosPagina = productosFiltrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);

  grid.innerHTML = productosPagina.map(crearTarjeta).join('');
  renderizarPaginacion(totalPaginas);
}

// ---------- BOTONES DE PAGINACIÓN ----------
function renderizarPaginacion(totalPaginas) {
  const cont = document.getElementById('pagination');

  if (totalPaginas <= 1) {
    cont.innerHTML = '';
    return;
  }

  let html = `<button ${paginaActual === 1 ? 'disabled' : ''} data-pagina="${paginaActual - 1}">‹</button>`;

  const paginasAMostrar = new Set([1, totalPaginas, paginaActual, paginaActual - 1, paginaActual + 1]);
  let anterior = 0;
  for (let p = 1; p <= totalPaginas; p++) {
    if (!paginasAMostrar.has(p)) continue;
    if (p - anterior > 1) html += `<span class="puntos">…</span>`;
    html += `<button class="${p === paginaActual ? 'activa' : ''}" data-pagina="${p}">${p}</button>`;
    anterior = p;
  }

  html += `<button ${paginaActual === totalPaginas ? 'disabled' : ''} data-pagina="${paginaActual + 1}">›</button>`;

  cont.innerHTML = html;

  cont.querySelectorAll('button[data-pagina]').forEach(btn => {
    btn.addEventListener('click', () => {
      paginaActual = parseInt(btn.dataset.pagina, 10);
      renderizarGrid();
      document.querySelector('.catalog-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bloquearScroll() {
  const anchoBarraScroll = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-width', `${anchoBarraScroll}px`);
  document.body.classList.add('modal-abierto');
  document.body.style.overflow = 'hidden';
}

function desbloquearScroll() {
  document.body.classList.remove('modal-abierto');
  document.body.style.overflow = '';
}

function abrirModal(id) {
  const producto = PRODUCTOS.find(p => p.id === id);
  if (!producto) return;

  const nombreCategoria = NOMBRES_CATEGORIA[producto.categoria] || producto.categoria;

  // Imagen o mini galería
  let mediaHTML;
  if (producto.imagenes && producto.imagenes.length) {
    mediaHTML = `
      <div class="mini-gallery">
        ${producto.imagenes.slice(0, 4).map(img => `
          <img src="${img}" alt="${producto.nombre}" onerror="this.style.display='none'">
        `).join('')}
      </div>`;
  } else {
    mediaHTML = `<img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.parentElement.innerHTML = placeholderHTML('${nombreCategoria}')">`;
  }
  document.getElementById('product-modal-media').innerHTML = mediaHTML;

  document.getElementById('modal-categoria').textContent = nombreCategoria;
  document.getElementById('modal-nombre').textContent = producto.nombre;
  document.getElementById('modal-precio').innerHTML = formatoPrecio(producto);

  const detalles = [];
  if (producto.talla) detalles.push(`<li><strong>Talla:</strong> ${producto.talla}</li>`);
  if (producto.material) detalles.push(`<li><strong>Material:</strong> ${producto.material}</li>`);
  detalles.push(`<li><strong>Código:</strong> #${producto.id}</li>`);
  document.getElementById('modal-detalles').innerHTML = detalles.join('');

  document.getElementById('modal-whatsapp-btn').href = mensajeWhatsapp(producto);

const modal = document.getElementById('product-modal');
  modal.hidden = false;
  bloquearScroll();

  requestAnimationFrame(() => {
    modal.classList.add('abierto');
  });
}

function cerrarModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.remove('abierto');
  desbloquearScroll();

  setTimeout(() => {
    modal.hidden = true;
  }, 300);
}

document.getElementById('product-modal-close').addEventListener('click', cerrarModal);
document.getElementById('product-modal-overlay').addEventListener('click', cerrarModal);

// ---------- SI LLEGAN CON UN LINK DIRECTO A UN PRODUCTO (#producto-7) ----------
function revisarLinkDirecto() {
  if (window.location.hash.startsWith('#producto-')) {
    setTimeout(() => {
      const el = document.querySelector(window.location.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('destacada');
      }
    }, 300);
  }
}

// ---------- CONFIGURA BOTONES FIJOS (header y footer) ----------
function configurarBotonesFijos() {
  const mensajeGeneral = encodeURIComponent('Hola, quiero más información sobre el catálogo de D\'Ospina Alta Costura.');
  document.getElementById('btn-whatsapp-flotante').href = `https://wa.me/${CONFIG.whatsapp}?text=${mensajeGeneral}`;
  document.getElementById('btn-whatsapp-footer').href = `https://wa.me/${CONFIG.whatsapp}?text=${mensajeGeneral}`;
  document.getElementById('btn-instagram-footer').href = `https://instagram.com/${CONFIG.instagram}`;
}

// ---------- EVENTOS DE FILTROS ----------
filtroTalla.addEventListener('change', aplicarFiltros);
filtroOrden.addEventListener('change', aplicarFiltros);

// ---------- INICIO ----------
configurarBotonesFijos();
cargarProductos();

// ---------- LOGO DEL HEADER APARECE AL HACER SCROLL ----------
const siteHeader = document.querySelector('.site-header');
const heroSection = document.querySelector('.hero');

function revisarScroll() {
  const limite = heroSection.offsetHeight - siteHeader.offsetHeight;
  if (window.scrollY > limite) {
    siteHeader.classList.add('visible');
  } else {
    siteHeader.classList.remove('visible');
  }
}

window.addEventListener('scroll', revisarScroll);
revisarScroll(); // revisa el estado inicial al cargar

// ---------- AJUSTA LA POSICIÓN EXACTA DEL BLOQUE DE FILTROS ----------
const filtersSection = document.querySelector('.filters');

function ajustarPosicionFiltros() {
  filtersSection.style.top = `${siteHeader.offsetHeight}px`;
}

window.addEventListener('load', ajustarPosicionFiltros);
window.addEventListener('resize', ajustarPosicionFiltros);