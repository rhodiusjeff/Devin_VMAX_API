-- VMAX API Database Initialization Script
-- This script is automatically run when the MariaDB container starts

-- Create database if not exists (already created by docker-compose)
-- CREATE DATABASE IF NOT EXISTS vmax_api;

-- Use the database
USE vmax_api;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON vmax_api.* TO 'vmax_user'@'%';
FLUSH PRIVILEGES;

-- Note: Tables are created automatically by Sequelize ORM
-- This script is for any additional database setup needed
