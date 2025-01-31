-- Cambiar el plugin de autenticación a mysql_native_password
-- ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';
-- FLUSH PRIVILEGES;

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS users;

-- Crear la tabla tasks si no existe
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
