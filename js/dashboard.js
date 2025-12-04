// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyA8kwhiKJSGLBZRLi1yrXmdnUWGXnY-kgU",
    authDomain: "castillo-sem6.firebaseapp.com",
    projectId: "castillo-sem6",
    storageBucket: "castillo-sem6.firebasestorage.app",
    messagingSenderId: "656452655199",
    appId: "1:656452655199:web:caef2c8cf7d35b549d63ea",
    measurementId: "G-9GZ0L36WNT"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// VARIABLES GLOBALES
let todosPedidos = [];
let todosProductos = [];
let filtroActual = 'todos';
let fechaSeleccionada = new Date().toISOString().split('T')[0];
let productoEditando = null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('fechaSelector').value = fechaSeleccionada;

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            cargarPedidos();
            cargarProductos();
        }
    });

    // Event Listeners
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);
    document.getElementById('fechaSelector').addEventListener('change', cambiarFecha);
    document.getElementById('btnNuevoProducto').addEventListener('click', abrirModalNuevo);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
    document.getElementById('formProducto').addEventListener('submit', guardarProducto);

    // Sidebar items
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', function() {
            cambiarSeccion(this.dataset.section);
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            filtrarPedidos(this.dataset.filtro);
        });
    });
});

// FUNCIONES DE NAVEGACIÓN
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function cambiarSeccion(seccion) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    
    if (seccion === 'pedidos') {
        document.getElementById('seccion-pedidos').classList.add('active');
        document.querySelector('.sidebar-item[data-section="pedidos"]').classList.add('active');
    } else if (seccion === 'productos') {
        document.getElementById('seccion-productos').classList.add('active');
        document.querySelector('.sidebar-item[data-section="productos"]').classList.add('active');
    }
    
    toggleSidebar();
}

function cambiarFecha() {
    fechaSeleccionada = document.getElementById('fechaSelector').value;
    actualizarEstadisticas();
    mostrarPedidos();
}

async function cargarPedidos() {
    document.getElementById('pedidosContainer').innerHTML = '<div class="loading">Cargando pedidos...</div>';

    db.collection('pedidos').onSnapshot(async snapshot => {
        todosPedidos = [];
        
        const pedidosPromises = [];
        snapshot.forEach(doc => {
            const pedidoData = { id: doc.id, ...doc.data() };
            pedidosPromises.push(cargarDatosUsuario(pedidoData));
        });

        todosPedidos = await Promise.all(pedidosPromises);

        todosPedidos.sort((a, b) => {
            if (!a.fecha || !b.fecha) return 0;
            const fechaA = a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
            const fechaB = b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
            return fechaB - fechaA;
        });

        actualizarEstadisticas();
        mostrarPedidos();
    }, error => {
        console.error('Error al cargar pedidos:', error);
    });
}

async function cargarDatosUsuario(pedido) {
    if (pedido.correo_usuario) {
        try {
            const usuariosSnapshot = await db.collection('usuarios')
                .where('email', '==', pedido.correo_usuario)
                .limit(1)
                .get();

            if (!usuariosSnapshot.empty) {
                const usuario = usuariosSnapshot.docs[0].data();
                pedido.nombre_cliente = usuario.nombre || 'Sin nombre';
                pedido.telefono = usuario.telefono || 'No disponible';
            }
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
        }
    }
    
    return pedido;
}

function actualizarEstadisticas() {
    const [year, month, day] = fechaSeleccionada.split('-').map(Number);
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0);
    const finDia = new Date(year, month - 1, day, 23, 59, 59);

    const totalPedidos = todosPedidos.length;
    const pendientes = todosPedidos.filter(p =>
        (p.estado === 'Pendiente' || p.estado === 'Esperando pago')
    ).length;
    const preparacion = todosPedidos.filter(p =>
        p.estado === 'Preparando pedido'
    ).length;

    const ventasDia = todosPedidos
        .filter(p => {
            if (!p.fecha) return false;
            const fechaPedido = p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha);
            return fechaPedido >= inicioDia && fechaPedido <= finDia;
        })
        .reduce((sum, p) => sum + (p.total || 0), 0);

    document.getElementById('totalPedidos').textContent = totalPedidos;
    document.getElementById('pedidosPendientes').textContent = pendientes;
    document.getElementById('pedidosPreparacion').textContent = preparacion;
    document.getElementById('totalVentas').textContent = `S/ ${ventasDia.toFixed(2)}`;
}

function mostrarPedidos() {
    const container = document.getElementById('pedidosContainer');
    const [year, month, day] = fechaSeleccionada.split('-').map(Number);
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0);
    const finDia = new Date(year, month - 1, day, 23, 59, 59);

    let pedidosFiltrados = todosPedidos.filter(p => {
        if (!p.fecha) return false;
        const fechaPedido = p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha);
        return fechaPedido >= inicioDia && fechaPedido <= finDia;
    });

    if (filtroActual !== 'todos') {
        pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === filtroActual);
    }

    if (pedidosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No hay pedidos para este día</h3>
                <p>Selecciona otro día o verifica si hay pedidos registrados.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pedidosFiltrados.map(p => crearTarjetaPedido(p)).join('');
}

function crearTarjetaPedido(pedido) {
    const fecha = pedido.fecha ? (pedido.fecha.toDate ? pedido.fecha.toDate() : new Date(pedido.fecha)) : new Date();
    const fechaFormato = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()} ${fecha.getHours()}:${fecha.getMinutes().toString().padStart(2, '0')}`;

    const estadoClass = pedido.estado ? pedido.estado.toLowerCase().replace(/ /g, '-') : 'pendiente';
    const tipoEntrega = pedido.tipo_entrega === 'delivery' ? '🚚 Delivery' : '🏪 Recojo en tienda';

    const productos = pedido.productos || [];
    const productosHTML = productos.map(p => `
        <div class="producto-item">
            <span>${p.cantidad}x ${p.nombre || 'Producto'}</span>
            <span>S/ ${(p.subtotal || 0).toFixed(2)}</span>
        </div>
    `).join('');

    const estadosDisponibles = pedido.tipo_entrega === 'delivery'
        ? ['Pendiente', 'Esperando pago', 'Pedido aceptado', 'Preparando pedido', 'Pedido enviado', 'Entregado', 'Cancelado']
        : ['Pendiente', 'Esperando pago', 'Pedido aceptado', 'Preparando pedido', 'Pedido listo', 'Entregado', 'Cancelado'];

    const estadosOptions = estadosDisponibles.map(estado =>
        `<option value="${estado}" ${pedido.estado === estado ? 'selected' : ''}>${estado}</option>`
    ).join('');

    return `
        <div class="pedido-card">
            <div class="pedido-header">
                <div>
                    <div class="pedido-id">Pedido #${pedido.id.substring(0, 8)}</div>
                    <small style="color: #999;">${fechaFormato}</small>
                </div>
                <div>
                    <span class="estado-badge estado-${estadoClass}">${pedido.estado || 'Pendiente'}</span>
                </div>
            </div>

            <div class="pedido-info">
                <div class="info-item">
                    <div class="info-label">Cliente</div>
                    <div class="info-value">${pedido.nombre_cliente || 'Sin nombre'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Teléfono</div>
                    <div class="info-value">${pedido.telefono || 'No disponible'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${pedido.correo_usuario || 'No disponible'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tipo de entrega</div>
                    <div class="info-value">
                        <span class="tipo-entrega">${tipoEntrega}</span>
                    </div>
                </div>
            </div>

            ${pedido.direccion_entrega ? `
                <div class="info-item" style="margin-bottom: 15px;">
                    <div class="info-label">📍 Dirección de entrega</div>
                    <div class="info-value">${pedido.direccion_entrega}</div>
                </div>
            ` : ''}

            ${pedido.notas ? `
                <div class="info-item" style="margin-bottom: 15px;">
                    <div class="info-label">📝 Notas</div>
                    <div class="info-value">${pedido.notas}</div>
                </div>
            ` : ''}

            <div class="pedido-productos">
                <strong>Productos (${pedido.cantidad_productos || productos.length}):</strong>
                ${productosHTML}
                ${pedido.costo_delivery > 0 ? `
                    <div class="producto-item">
                        <span>Costo de delivery</span>
                        <span>S/ ${(pedido.costo_delivery || 0).toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="total-pedido">Total: S/ ${(pedido.total || 0).toFixed(2)}</div>
            </div>

            <div class="pedido-actions">
                <select class="estado-select" id="estado-${pedido.id}">
                    ${estadosOptions}
                </select>
                <button class="btn-actualizar" onclick="actualizarEstado('${pedido.id}')">
                    Actualizar Estado
                </button>
            </div>
        </div>
    `;
}

async function actualizarEstado(pedidoId) {
    const nuevoEstado = document.getElementById(`estado-${pedidoId}`).value;
    try {
        await db.collection('pedidos').doc(pedidoId).update({ estado: nuevoEstado });
        mostrarNotificacion('Estado actualizado correctamente', 'success');
    } catch (error) {
        mostrarNotificacion('Error al actualizar el estado', 'error');
    }
}

function filtrarPedidos(filtro) {
    filtroActual = filtro;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    mostrarPedidos();
}

function cargarProductos() {
    document.getElementById('productosGrid').innerHTML = '<div class="loading">Cargando productos...</div>';

    db.collection('productos').onSnapshot(snapshot => {
        todosProductos = [];
        snapshot.forEach(doc => {
            todosProductos.push({ id: doc.id, ...doc.data() });
        });

        mostrarProductos();
    }, error => {
        console.error('Error al cargar productos:', error);
        mostrarNotificacion('Error al cargar productos', 'error');
    });
}

function mostrarProductos() {
    const container = document.getElementById('productosGrid');

    if (todosProductos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🍔</div>
                <h3>No hay productos registrados</h3>
                <p>Comienza agregando tu primer producto</p>
            </div>
        `;
        return;
    }

    container.innerHTML = todosProductos.map(producto => `
        <div class="producto-card">
            <img src="${producto.l_imag}" alt="${producto.l_nomb}" class="producto-imagen" 
                onerror="this.src='https://via.placeholder.com/300x200?text=Sin+Imagen'">
            <div class="producto-info">
                <div class="producto-nombre">${producto.l_nomb}</div>
                <div class="producto-descripcion">${producto.l_desc}</div>

                <div class="producto-meta">
                    <span class="producto-categoria">${producto.k_cate}</span>
                    <span class="producto-precio">S/ ${parseFloat(producto.s_prec).toFixed(2)}</span>
                </div>

                <!-- Botones alineados al fondo -->
                <div class="producto-actions">
                    <button class="btn-editar" onclick="editarProducto('${producto.id}')">
                        <i class="fa-solid fa-pencil"></i> Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarProducto('${producto.id}')">
                        <i class="fa-solid fa-trash-can"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function abrirModalNuevo() {
    productoEditando = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('modalProducto').classList.add('active');
}

function editarProducto(id) {
    const producto = todosProductos.find(p => p.id === id);
    if (!producto) return;

    productoEditando = id;
    document.getElementById('modalTitulo').textContent = 'Editar Producto';
    document.getElementById('l_nomb').value = producto.l_nomb;
    document.getElementById('l_desc').value = producto.l_desc;
    document.getElementById('k_cate').value = producto.k_cate;
    document.getElementById('l_imag').value = producto.l_imag;
    document.getElementById('s_prec').value = producto.s_prec;
    document.getElementById('modalProducto').classList.add('active');
}

function cerrarModal() {
    document.getElementById('modalProducto').classList.remove('active');
    document.getElementById('formProducto').reset();
    productoEditando = null;
}

async function guardarProducto(e) {
    e.preventDefault();

    const producto = {
        l_nomb: document.getElementById('l_nomb').value.trim(),
        l_desc: document.getElementById('l_desc').value.trim(),
        k_cate: document.getElementById('k_cate').value,
        l_imag: document.getElementById('l_imag').value.trim(),
        s_prec: parseFloat(document.getElementById('s_prec').value)
    };

    try {
        if (productoEditando) {
            await db.collection('productos').doc(productoEditando).update(producto);
            mostrarNotificacion('Producto actualizado correctamente', 'success');
        } else {
            await db.collection('productos').add(producto);
            mostrarNotificacion('Producto agregado correctamente', 'success');
        }
        cerrarModal();
    } catch (error) {
        console.error('Error al guardar producto:', error);
        mostrarNotificacion('Error al guardar el producto', 'error');
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        await db.collection('productos').doc(id).delete();
        mostrarNotificacion('Producto eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        mostrarNotificacion('Error al eliminar el producto', 'error');
    }
}

function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        auth.signOut().then(() => window.location.href = 'index.html');
    }
}

window.actualizarEstado = actualizarEstado;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;