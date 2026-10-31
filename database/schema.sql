CREATE DATABASE IF NOT EXISTS barba_black
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE barba_black;

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS contenido_inicio;
DROP TABLE IF EXISTS arrepentimientos;
DROP TABLE IF EXISTS configuracion;
DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS pedido_items;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS especificaciones;
DROP TABLE IF EXISTS producto_imagenes;
DROP TABLE IF EXISTS producto_colores;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS colores;
DROP TABLE IF EXISTS subcategorias;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS cupones;
DROP TABLE IF EXISTS usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- Solo personal del local (la tienda no tiene cuentas de clientes).
CREATE TABLE usuarios (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(40)  NOT NULL,
  apellido        VARCHAR(40)  NOT NULL DEFAULT '',
  email           VARCHAR(120) NOT NULL,
  password        CHAR(60)     NOT NULL,
  rol             ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin',
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias (
  id      SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(60)       NOT NULL,
  slug    VARCHAR(60)       NOT NULL,
  orden   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre),
  UNIQUE KEY uq_categorias_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subcategorias (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id  SMALLINT UNSIGNED NOT NULL,
  nombre        VARCHAR(40)       NOT NULL,
  slug          VARCHAR(40)       NOT NULL,
  orden         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subcategorias_slug (categoria_id, slug),
  CONSTRAINT fk_subcategorias_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE colores (
  id      SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  valor   VARCHAR(30)       NOT NULL,
  nombre  VARCHAR(40)       NOT NULL,
  hex     CHAR(7)           NOT NULL,
  orden   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_colores_valor (valor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos (
  id              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(90)       NOT NULL,
  categoria_id    SMALLINT UNSIGNED NOT NULL,
  subcategoria_id SMALLINT UNSIGNED NULL,
  color_id        SMALLINT UNSIGNED NOT NULL,
  precio          DECIMAL(12, 2)    NOT NULL,
  costo           DECIMAL(12, 2)    NOT NULL DEFAULT 0,
  stock           INT UNSIGNED      NOT NULL DEFAULT 0,
  etiqueta        VARCHAR(24)       NULL,
  resumen         VARCHAR(255)      NULL,
  descripcion     TEXT              NULL,
  destacados      TEXT              NULL,
  creado_en       DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_productos_categoria (categoria_id),
  KEY idx_productos_color (color_id),
  KEY idx_productos_subcategoria (subcategoria_id),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_productos_color FOREIGN KEY (color_id) REFERENCES colores (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_productos_subcategoria FOREIGN KEY (subcategoria_id) REFERENCES subcategorias (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT ck_productos_precio CHECK (precio > 0),
  CONSTRAINT ck_productos_costo CHECK (costo >= 0 AND costo <= precio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE producto_imagenes (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  producto_id  INT UNSIGNED      NOT NULL,
  ruta         VARCHAR(255)      NOT NULL,
  orden        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_imagenes_producto (producto_id, orden),
  CONSTRAINT fk_imagenes_producto FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE producto_colores (
  producto_id  INT UNSIGNED      NOT NULL,
  color_id     SMALLINT UNSIGNED NOT NULL,
  orden        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, color_id),
  KEY idx_producto_colores_color (color_id),
  CONSTRAINT fk_pcolores_producto FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pcolores_color FOREIGN KEY (color_id) REFERENCES colores (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE especificaciones (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  producto_id  INT UNSIGNED      NOT NULL,
  clave        VARCHAR(60)       NOT NULL,
  valor        VARCHAR(120)      NOT NULL,
  orden        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_especificaciones_producto (producto_id),
  CONSTRAINT fk_especificaciones_producto FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cupones (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  codigo          VARCHAR(30)   NOT NULL,
  descripcion     VARCHAR(120)  NOT NULL,
  porcentaje      DECIMAL(5, 4) NOT NULL,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  vence_en        DATETIME      NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cupones_codigo (codigo),
  CONSTRAINT ck_cupones_porcentaje CHECK (porcentaje > 0 AND porcentaje < 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pedido armado en la web y mandado por WhatsApp al local. El dueño lo marca como vendido o cancelado.
CREATE TABLE pedidos (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  cliente         VARCHAR(90)    NOT NULL,
  telefono        VARCHAR(20)    NOT NULL,
  entrega         ENUM('retiro', 'domicilio') NOT NULL DEFAULT 'retiro',
  cupon_codigo    VARCHAR(30)    NULL,
  estado          ENUM('pendiente', 'vendido', 'cancelado') NOT NULL DEFAULT 'pendiente',
  vendido_en      DATETIME       NULL,
  subtotal        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total           DECIMAL(12, 2) NOT NULL DEFAULT 0,
  costo           DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ganancia        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pedidos_estado (estado),
  KEY idx_pedidos_fecha (creado_en)
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedido_items (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  pedido_id    INT UNSIGNED      NOT NULL,
  producto_id  INT UNSIGNED      NULL,
  nombre       VARCHAR(90)       NOT NULL,
  color        VARCHAR(40)       NULL,
  precio       DECIMAL(12, 2)    NOT NULL,
  costo        DECIMAL(12, 2)    NOT NULL DEFAULT 0,
  cantidad     SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_items_pedido (pedido_id),
  KEY idx_items_producto (producto_id),
  CONSTRAINT fk_items_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT ck_items_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notificaciones (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tipo        ENUM('pedido', 'stock') NOT NULL DEFAULT 'pedido',
  titulo      VARCHAR(120)  NOT NULL,
  mensaje     VARCHAR(255)  NULL,
  url         VARCHAR(255)  NULL,
  pedido_id   INT UNSIGNED  NULL,
  producto_id INT UNSIGNED  NULL,
  usuario_id  INT UNSIGNED  NULL,
  leida       TINYINT(1)    NOT NULL DEFAULT 0,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notificaciones_leida (leida, creado_en),
  KEY idx_notificaciones_usuario (usuario_id, leida),
  CONSTRAINT fk_notificaciones_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_notificaciones_producto FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos del local editables desde el panel (WhatsApp, dirección, horarios, redes).
CREATE TABLE configuracion (
  clave          VARCHAR(40) NOT NULL,
  valor          TEXT        NOT NULL,
  actualizado_en DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contenido_inicio (
  id             TINYINT UNSIGNED NOT NULL DEFAULT 1,
  datos          LONGTEXT     NOT NULL,
  usuario_id     INT UNSIGNED NULL,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_contenido_inicio_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE arrepentimientos (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  codigo         VARCHAR(20)   NOT NULL,
  usuario_id     INT UNSIGNED  NULL,
  pedido_id      INT UNSIGNED  NULL,
  numero_pedido  VARCHAR(20)   NOT NULL,
  nombre         VARCHAR(90)   NOT NULL,
  email          VARCHAR(120)  NOT NULL,
  telefono       VARCHAR(20)   NULL,
  motivo         VARCHAR(500)  NULL,
  estado         ENUM('recibida', 'resuelta') NOT NULL DEFAULT 'recibida',
  resuelta_en    DATETIME      NULL,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arrepentimientos_codigo (codigo),
  KEY idx_arrepentimientos_estado (estado, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
