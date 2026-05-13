<p align="center">
  <img src="https://img.shields.io/badge/node-16%2B-brightgreen?style=flat-square" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/discord.js-v14-purple?style=flat-square" alt="discord.js" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/status-stable-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

<h1 align="center">Nexus Server Cloner</h1>

<p align="center">
A professional Discord utility for scanning, backing up, and cloning server structures.
</p>

This repository provides a bot and CLI tool for:
- Scanning source guilds
- Saving guild metadata to local JSON backups
- Copying roles, categories, and channels
- Performing manual non-destructive copy operations

---

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Slash Commands](#slash-commands)
- [CLI Commands](#cli-commands)
- [Notes](#notes)
- [File Structure](#file-structure)
- [Disclaimer](#disclaimer)

---

## Overview

The server cloner supports:
- Role cloning with permission mapping
- Category and channel replication
- Announcement, stage, forum, and voice channel handling
- Smart fallback for unsupported channel types
- Local backup creation and verification
- Optional manual copy mode to preserve existing target data

## Requirements

- Node.js 16 or later
- A standard Discord bot token (`BOT_TOKEN`)
- A user account token for source guild scanning (`USER_TOKEN`)

## Installation

```bash
npm install
```

## Configuration

1. Copy `config.example.yml` to `config.yml`.
2. Create a `.env` file with the required tokens:

```env
BOT_TOKEN=your_bot_token
USER_TOKEN=your_user_token
```

3. Update `config.yml` options to match your environment:

| Option | Description |
|--------|-------------|
| `settings.delay_ms` | Delay between API requests (ms) |
| `settings.max_bitrate` | Maximum voice channel bitrate |
| `settings.batch_size` | Channels/roles processed per batch |
| `cloning.clone_standalone` | Clone without external dependencies |
| `cloning.smart_fallback` | Fallback for unsupported channel types |
| `cloning.auto_delete_target` | Clear target before cloning (destructive) |

## Usage

### Start the bot

```bash
node bot.js
```

Once the bot is running, you can use slash commands in Discord or the built‑in CLI in your terminal.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/start-copy source_guild_id:<id>` | Destructively clone the source guild into the current server |
| `/manual-copy source_guild_id:<id>` | Copy source guild structure while preserving existing target data where possible |
| `/backup-create guild_id:<id>` | Save a guild structure to `guild-full-<id>.json` |
| `/backup-list` | List local backup files |
| `/check-status` | Display current server status |
| `/verify-clone source_guild_id:<id>` | Compare the target server against a saved backup |
| `/settings` | Show active cloner configuration |

## CLI Commands

When the bot starts, the built‑in CLI accepts:

| Command | Description |
|---------|-------------|
| `help` | Show available CLI commands |
| `status` | Display bot and selfbot connection state |
| `scan <guild_id>` | Scan a guild and save a local backup |
| `clone <source_id> <target_id>` | Trigger the cloning process from the CLI |
| `list` | Show local backup files |
| `clear` | Clear the terminal output |
| `exit` | Shut down the bot cleanly |

## Notes

- Keep your `.env` and `config.yml` files private – never commit them.
- Backups are saved as `guild-full-<id>.json` in the project root.
- The bot must have sufficient role hierarchy in the target server to create roles and channels.
- Manual copy mode is useful when you want to merge a source structure without wiping the target server.

## File Structure

```
nexus-server-cloner/
├── bot.js                 # Main application entry point
├── config.example.yml     # Configuration template
├── config.yml             # Active configuration file (ignored by git)
├── package.json           # Dependencies and scripts
└── guild-full-<id>.json   # Generated backups
```

## Disclaimer

This repository uses a self‑bot client for source guild scanning. Self‑bots violate Discord's Terms of Service. Use it responsibly and only for educational or authorised purposes. The author assumes no liability for misuse or account penalties.

---

<p align="center">
  Made for Discord server (no need to be administrator or template link)
</p>
