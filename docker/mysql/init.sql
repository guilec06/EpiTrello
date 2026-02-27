-- EpiTrello initial schema
-- This file is executed once when the MySQL container is first created.
-- To apply schema changes to an existing container run:
--   docker-compose down -v && docker-compose up --build

CREATE DATABASE IF NOT EXISTS epitrello
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE epitrello;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  username    VARCHAR(100) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  owner_id    INT UNSIGNED NOT NULL,
  visibility  ENUM('private','public') NOT NULL DEFAULT 'private',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Board members (collaborators)
CREATE TABLE IF NOT EXISTS board_members (
  board_id    INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  role        ENUM('viewer','editor') NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (board_id, user_id),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- Lists (columns inside a board)
CREATE TABLE IF NOT EXISTS lists (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  board_id    INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  position    SMALLINT     NOT NULL DEFAULT 0,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  list_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  position    SMALLINT     NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

-- Tags (per board)
CREATE TABLE IF NOT EXISTS tags (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  board_id    INT UNSIGNED NOT NULL,
  name        VARCHAR(50)  NOT NULL,
  color       VARCHAR(7)   NOT NULL DEFAULT '#61bd4f',
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Card-Tag junction
CREATE TABLE IF NOT EXISTS card_tags (
  card_id     INT UNSIGNED NOT NULL,
  tag_id      INT UNSIGNED NOT NULL,
  PRIMARY KEY (card_id, tag_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
