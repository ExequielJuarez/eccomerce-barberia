USE barba_black;
SET NAMES utf8mb4;
SET time_zone = '-03:00';

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE turnos;
TRUNCATE TABLE bloqueos_turno;
TRUNCATE TABLE horarios_turno;
TRUNCATE TABLE servicios_turno;
TRUNCATE TABLE barberos;
TRUNCATE TABLE sucursales;
TRUNCATE TABLE notificaciones;
TRUNCATE TABLE arrepentimientos;
TRUNCATE TABLE pedido_items;
TRUNCATE TABLE pedidos;
TRUNCATE TABLE favoritos;
TRUNCATE TABLE especificaciones;
TRUNCATE TABLE producto_imagenes;
TRUNCATE TABLE producto_colores;
TRUNCATE TABLE productos;
TRUNCATE TABLE colores;
TRUNCATE TABLE subcategorias;
TRUNCATE TABLE categorias;
TRUNCATE TABLE cupones;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;
ALTER TABLE pedidos AUTO_INCREMENT = 1001;

INSERT INTO usuarios (id, nombre, apellido, email, telefono, password, google_id, rol, newsletter) VALUES
  (1, 'Cliente', 'Demo', 'demo@tienda.com', NULL, '$2b$10$jX3V6AhKp.Par41X/kOWfelfguSzaU4z/IZkvYOv0UHGBQ/6Rl2Oy', NULL, 'cliente', 0),
  (2, 'Admin', 'Barba Black', 'admin@tienda.com', NULL, '$2b$10$OUwf1N16MEgHBa5jhFt6K.cGjo4yUyiF/cOwUOBsyttSBQqgwMRYq', NULL, 'admin', 0),
  (3, 'Super', 'Admin', 'super@tienda.com', NULL, '$2b$10$AhElj/1kwG2mSrQCEpRKI.eaaUIicEpYgvqxK2sckmrfVXodWJpke', NULL, 'superadmin', 0),
  (4, 'Lucas', 'Gómez', 'lucas@barbablack.com', NULL, '$2b$10$zHLP03zrGolna.uA8M.rNe3PHbOONbZx46YNGUZnEFpS4TGcjxBty', NULL, 'barbero', 0),
  (5, 'Nico', 'Ferreyra', 'nico@barbablack.com', NULL, '$2b$10$zHLP03zrGolna.uA8M.rNe3PHbOONbZx46YNGUZnEFpS4TGcjxBty', NULL, 'barbero', 0);

INSERT INTO categorias (id, nombre, slug, orden) VALUES
  (1, 'Clippers', 'clippers', 1),
  (2, 'Shavers', 'shavers', 2),
  (3, 'Tijeras', 'tijeras', 3),
  (4, 'Insumos', 'insumos', 4);

INSERT INTO subcategorias (id, categoria_id, nombre, slug, orden) VALUES
  (1, 1, 'Wahl', 'wahl', 1),
  (2, 1, 'Kemei', 'kemei', 2),
  (3, 1, 'VGR', 'vgr', 3),
  (4, 1, 'Viggo', 'viggo', 4),
  (5, 2, 'VGR', 'vgr', 5),
  (6, 3, 'Viggo', 'viggo', 6),
  (7, 4, 'Higiene', 'higiene', 7);

INSERT INTO colores (id, valor, nombre, hex, orden) VALUES
  (1, 'negro', 'Negro', '#111111', 1),
  (2, 'blanco', 'Blanco', '#f4f2ee', 2),
  (3, 'plata', 'Plata', '#b9bcc2', 3),
  (4, 'dorado', 'Dorado', '#c9a24b', 4),
  (5, 'rojo', 'Rojo', '#c62828', 5),
  (6, 'azul', 'Azul', '#2f64c4', 6),
  (7, 'bordo', 'Bordó', '#6b1a2b', 7);

INSERT INTO productos (id, nombre, categoria_id, subcategoria_id, color_id, precio, costo, stock, etiqueta, resumen, descripcion, destacados) VALUES
  (1, 'Wahl Magic Clip', 1, 1, 7, 220000, 154000, 6, 'Más vendido',
   'La clásica Magic Clip cordless de Wahl, hecha para fades prolijos y trabajo de todo el día.',
   'La Magic Clip Cordless es una de las máquinas más elegidas en barberías de todo el mundo. Terminación bordó con letras doradas, hoja de precisión y un cuerpo cómodo para trabajar horas sin cansarte.\n\nInalámbrica, lista para usar en el sillón o en el domicilio.',
   'Inalámbrica (cordless)\nHoja de precisión para degradados\nCuerpo ergonómico\nOriginal Wahl'),
  (2, 'Líquido sanitizante Geo 2000', 4, 7, 6, 12000, 7200, 40, NULL,
   'Loción bactericida de uso profesional para sanitizar herramientas de trabajo.',
   'Sanitizante para peluquerías, barberías y estéticas a base de cloruro de benzalconio. Envase de 1000 cm3, industria argentina.\n\nIdeal para mantener peines, tijeras y cuchillas limpias entre un cliente y el siguiente.',
   'Uso profesional\nContenido neto: 1000 cm3\nIndustria argentina\nA base de cloruro de benzalconio'),
  (3, 'Combo de tijeras Viggo', 3, 6, 1, 85000, 55250, 10, 'Combo',
   'Tijera de corte y tijera entresacadora de 6 pulgadas con estuche, en negro o plata.',
   'Combo profesional Viggo con dos tijeras de 6 pulgadas: una recta para corte y otra entresacadora. Acero 7CR, filo parejo y tornillo de ajuste con el logo de la marca.\n\nViene en estuche con cierre, listo para guardar y llevar.',
   'Tijera recta + entresacadora\n6 pulgadas · acero 7CR\nIncluye estuche con cierre\nDisponible en negro y plata'),
  (4, 'Shaver VGR', 2, 5, 1, 95000, 61750, 8, 'Hot',
   'Shaver profesional de doble malla dorada para terminaciones al ras.',
   'Afeitadora tipo shaver con malla doble dorada, cuerpo negro mate y detalle turquesa. Pensada para perfilar y dejar los bordes limpios después del corte.',
   'Malla doble dorada\nCuerpo compacto, entra en la mano\nIdeal para perfilados y terminaciones'),
  (5, 'Clipper Kemei KM-90-4', 1, 2, 2, 90000, 58500, 12, 'Kit completo',
   'Máquina de corte inalámbrica con hoja DLC, guías, aceite y base de carga.',
   'Clipper Kemei KM-90-4 con hoja DLC y cuerpo blanco con frente negro. Viene en caja de regalo con todo lo necesario: guías de corte, aceite lubricante para la hoja, cable y base de carga.',
   'Hoja DLC\nIncluye guías de corte\nIncluye aceite lubricante\nBase de carga y cable en la caja'),
  (6, 'VGR V-880c', 1, 3, 2, 150000, 97500, 8, NULL,
   'Clipper profesional VGR de cuerpo blanco con detalles plateados y hoja negra.',
   'Clipper profesional VGR modelo V-880c. Cuerpo blanco con acabados plateados, botón de encendido frontal y hoja negra de buen filo. Una máquina prolija para trabajar todos los días.',
   'Línea profesional VGR\nCuerpo blanco con detalles plateados\nHoja negra'),
  (7, 'Viggo Volt Clipper', 1, 4, 5, 260000, 169000, 5, 'Nuevo',
   'Viggo Volt Diamond Pro+, la clipper roja con control intuitivo de torque.',
   'La Volt Diamond Pro+ de Viggo combina cuerpo rojo con rayos blancos, hoja dorada y control intuitivo de torque. Incluye función de bloqueo de viaje (travel lock) y 1 año de garantía oficial Viggo.',
   'Control intuitivo de torque\nTravel lock\nHoja dorada\n1 año de garantía oficial Viggo');

INSERT INTO producto_colores (producto_id, color_id, orden) VALUES
  (1, 7, 0),
  (2, 6, 0),
  (3, 1, 0), (3, 3, 1),
  (4, 1, 0),
  (5, 2, 0),
  (6, 2, 0),
  (7, 5, 0);

INSERT INTO producto_imagenes (producto_id, ruta, orden) VALUES
  (1, '/img/productos/wahl-magic-clip-1.jpg', 0),
  (2, '/img/productos/liquido-sanitizante-1.jpg', 0),
  (3, '/img/productos/tijeras-viggo-1.jpg', 0),
  (3, '/img/productos/tijeras-viggo-2.jpg', 1),
  (4, '/img/productos/shaver-vgr-1.jpg', 0),
  (4, '/img/productos/shaver-vgr-2.jpg', 1),
  (5, '/img/productos/clipper-kemei-90-4-1.jpg', 0),
  (5, '/img/productos/clipper-kemei-90-4-2.jpg', 1),
  (5, '/img/productos/clipper-kemei-90-4-3.jpg', 2),
  (6, '/img/productos/vgr-v880c-1.jpg', 0),
  (6, '/img/productos/vgr-v880c-2.jpg', 1),
  (7, '/img/productos/viggo-volt-clipper-1.jpg', 0),
  (7, '/img/productos/viggo-volt-clipper-2.jpg', 1);

INSERT INTO especificaciones (producto_id, clave, valor, orden) VALUES
  (1, 'Marca', 'Wahl', 1),
  (1, 'Modelo', 'Magic Clip Cordless', 2),
  (1, 'Alimentación', 'Inalámbrica', 3),
  (2, 'Contenido', '1000 cm3', 1),
  (2, 'Base', 'Cloruro de benzalconio', 2),
  (2, 'Origen', 'Argentina', 3),
  (3, 'Marca', 'Viggo', 1),
  (3, 'Modelo', 'V-103BK', 2),
  (3, 'Tamaño', '6 pulgadas', 3),
  (3, 'Acero', '7CR', 4),
  (4, 'Marca', 'VGR', 1),
  (4, 'Malla', 'Doble, dorada', 2),
  (5, 'Marca', 'Kemei', 1),
  (5, 'Modelo', 'KM-90-4', 2),
  (5, 'Hoja', 'DLC', 3),
  (6, 'Marca', 'VGR', 1),
  (6, 'Modelo', 'V-880c', 2),
  (7, 'Marca', 'Viggo', 1),
  (7, 'Modelo', 'Volt Diamond Pro+', 2),
  (7, 'Garantía', '1 año oficial', 3);

INSERT INTO cupones (codigo, descripcion, porcentaje, activo, vence_en) VALUES
  ('BIENVENIDA', '10% off en tu primera compra', 0.1000, 1, NULL);

INSERT INTO sucursales (id, nombre, direccion, activo, orden) VALUES
  (1, 'Barbería', 'Av. Belgrano y Ameghino', 1, 1);

INSERT INTO barberos (id, nombre, sucursal_id, usuario_id, foto, activo, orden) VALUES
  (1, 'Lucas', 1, 4, NULL, 1, 1),
  (2, 'Nico', 1, 5, NULL, 1, 2);

INSERT INTO servicios_turno (id, nombre, detalle, duracion, precio, activo, orden) VALUES
  (1, 'Corte de pelo', 'Corte a tijera o máquina, con perfilado.', 30, NULL, 1, 1),
  (2, 'Corte y barba', 'El combo completo.', 60, NULL, 1, 2),
  (3, 'Perfilado de barba', 'Barba prolija, con toalla caliente.', 30, NULL, 1, 3),
  (4, 'Fade', 'Degradado con terminación al ras.', 45, NULL, 1, 4);

INSERT INTO horarios_turno (dia_semana, desde, hasta) VALUES
  (1, '10:00', '20:00'),
  (2, '10:00', '20:00'),
  (3, '10:00', '20:00'),
  (4, '10:00', '20:00'),
  (5, '10:00', '20:00'),
  (6, '10:00', '18:00');
