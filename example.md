<p align="center">
  <img src="https://cdn.discordapp.com/attachments/1503494832218308808/1503494861805064243/content.png?ex=6a038e34&is=6a023cb4&hm=cb9faffffca18d6e7abc9a5ae4d45f288ca23c73c8c472b7785fbe5f7986c3bb" alt="Nexus Music Bot Banner" width="100%"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js v14"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 18+"/>
  <img src="https://img.shields.io/badge/Lavalink-Poru-ff69b4?style=for-the-badge" alt="Lavalink Poru"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">Nexus Music Bot</h1>
<p align="center">
  <strong>High-quality Discord music bot with multi-node Lavalink, Spotify, and advanced audio filters</strong><br/>
  <sub>Slash commands · Prefix commands · Queue persistence · AutoMod · DJ mode · Live lyrics · Favorites · Playlists</sub>
</p>

---

## Overview

Nexus is a feature-rich Discord music bot built on **discord.js v14** and **Poru (Lavalink v4)**. It supports multi-node Lavalink with automatic failover, full Spotify integration, 16 audio filters, a persistent queue system, per-server DJ role controls, a built-in AutoMod panel, and live synced lyrics with translation. All UI is built using Discord's Components V2 (containers, sections, thumbnails, separators).

---

## Features

### Music Playback
- Play from YouTube, YouTube Music, Spotify, SoundCloud, and Apple Music
- Autocomplete search powered by YouTube Music with deduplication and smart title cleaning
- Playlist support — YouTube playlists and Spotify playlists/albums/artists (up to 50 tracks per queue)
- Autoplay — automatically queues related songs when the queue ends
- Loop modes — off, track repeat, queue repeat
- Skip, back, forward, rewind, replay, skipto, move, shuffle, clear

### Audio Filters
17 real-time audio filters via Lavalink equalizer and timescale:

| Filter | Effect |
|--------|--------|
| Nightcore | Higher pitch + faster tempo |
| Vaporwave | Slowed + dreamy low-pitch |
| Bass Boost | Enhanced low-frequency EQ |
| 8D Audio | 360° rotation effect |
| Karaoke | Vocal reduction |
| Vibrato | Pitch modulation |
| Tremolo | Volume modulation |
| Slowed | Relaxed tempo and pitch |
| Chipmunk | High-pitched fast playback |
| Deep Voice | Low pitch + bass EQ |
| Electronic | EDM-style frequency boost |
| Rock | Powerful mids and highs |
| Party | Club-ready bass and treble |
| Radio | AM radio frequency range |
| Pop | Balanced pop EQ |
| Soft | Reduced high frequencies |
| HiFi Surround | Headphone-optimized stereo + presence boost |

### Queue System
- Paginated queue viewer (5 tracks per page) with track thumbnails
- Jump-to-track dropdown (up to 25 tracks per dropdown)
- Queue persistence — queues are saved to disk and restored on bot restart
- Daily cleanup of stale queue files

### Favorites & Playlists
- Per-user favorites stored in SQLite via Sequelize
- Full playlist system — create, save, load, append, rename, delete, share, and import playlists
- Playlist share codes and Spotify URL import support

### Spotify Integration
- Link your Spotify account (public read-only) to browse and play your playlists
- Resolves Spotify tracks, albums, playlists, and artists via `poru-spotify`
- Spotify data cached per user in `data/spotify/`

### Lyrics
- Live synced lyrics with real-time line highlighting (updates every 2 seconds)
- Sources: lrclib.net → lyrics.ovh → Genius API (fallback chain)
- Translation support for 12 languages via Google Translate API
- Full lyrics viewer with pagination

### AutoMod
- Full Discord AutoMod control panel via slash command
- Block custom keywords, Discord invites, scam links, and server promotion spam
- Import a pre-configured `badwords.txt` list (200+ words, multi-language)
- Live file watcher — changes to `badwords.txt` apply instantly without restart
- View, toggle, and delete existing AutoMod rules
- Channel exemptions support

### DJ Mode
- Assign a DJ role per server — only DJs and admins can use restricted commands
- Restrict or unrestrict any of 35+ music commands individually
- `/dj setup`, `/dj restrict`, `/dj reset`, `/dj info`

### System & Reliability
- **Multi-node Lavalink** — supports multiple nodes defined in `config.yml`, with automatic failover and exponential backoff reconnection
- **Node selector** — automatically routes players to the best available node
- **Crash recovery** — logs crashes to `data/crash-logs/`, tracks crash count, prevents restart loops (max 5 crashes/hour)
- **Health monitor** — checks Discord and Lavalink health every 60 seconds, auto-reconnects dead nodes
- **Bug report system** — users can submit bug reports via a modal, delivered to a Discord webhook
- **Rotating status** — cycles through custom DND statuses every 5 seconds

---

## Project Structure

```
nexus/
├── index.js                  # Bot entry point — client, Lavalink, events, interactions
├── main.js                   # Combined launcher — starts Lavalink then the bot
├── config.yml                # ★ Single config file — tokens, nodes, emojis, prefix shortcuts
├── config.example.yml        # Template — copy to config.yml and fill in credentials
├── config.js                 # Config loader — reads config.yml and exports structured object
├── badwords.txt              # Word list for AutoMod import
├── emojis.json               # Auto-generated from config.yml on startup (do not edit manually)
│
├── commands/                 # Slash command handlers (66 commands)
├── prefixCommands/           # Prefix command handlers (22 commands)
├── events/                   # Discord event listeners
│   ├── prefixCommands.js     # Prefix message handler
│   └── voiceStateUpdate.js   # Voice channel event handler
│
├── music/                    # Lavalink player layer
│   ├── client.js             # Poru client setup
│   ├── events.js             # Player events (trackStart, trackEnd, etc.)
│   ├── buttonHandlers.js     # Now Playing button interactions
│   └── buttonCollectorHelper.js
│
├── helpers/                  # Utility modules
│   ├── audioConstants.js     # EQ presets — HiFi, surround, bass, nightcore, etc.
│   ├── audioQuality.js       # Audio quality settings and filter helpers
│   ├── automodData.js        # AutoMod keyword storage
│   ├── badwordsWatcher.js    # Live badwords.txt file watcher
│   ├── colorHelper.js        # Hex color utilities
│   ├── crashRecovery.js      # Crash logging and recovery
│   ├── djSettings.js         # DJ role settings per guild
│   ├── healthCheck.js        # Discord + Lavalink health monitor
│   ├── messageHelper.js      # Message formatting utilities
│   ├── MusicCard.js          # Music card image generator (@napi-rs/canvas)
│   ├── musicHelpers.js       # Duration formatting, permission checks
│   ├── nodeSelector.js       # Automatic Lavalink node selection
│   ├── nowPlayingFormatter.js # Now Playing message formatter
│   ├── permissionChecker.js  # DJ and admin permission checks
│   ├── premiumFilters.js     # Premium audio filter logic
│   ├── queueManager.js       # Queue space and management
│   ├── queuePersistence.js   # Save/load queues to disk
│   ├── spamDetection.js      # Spam detection utilities
│   ├── spotifyResolver.js    # Spotify URL resolution with caching
│   ├── spotifyStorage.js     # Per-user Spotify account storage
│   ├── thumbnailResolver.js  # Track artwork URL resolver
│   ├── updateNowPlaying.js   # Now Playing message updater
│   ├── voiceConnectionFix.js # Voice connection stability helpers
│   ├── volumeManager.js      # Volume management
│   └── volumeProtection.js   # Volume clipping protection
│
├── database/                 # SQLite via Sequelize
│   ├── sequelize.js          # Database connection
│   ├── BaseModel.js          # Base model class
│   ├── nexus.db              # SQLite database file (gitignored)
│   └── models/
│       ├── Favorite.js       # User favorites
│       ├── Playlist.js       # User playlists
│       ├── PlaylistTrack.js  # Playlist tracks
│       ├── NoPrefix.js       # No-prefix guild settings
│       └── index.js          # Model loader
│
└── data/                     # Runtime data (auto-generated, gitignored)
    ├── automod/              # Per-guild AutoMod keyword data
    ├── enqueue/              # Persistent queue files
    ├── queue/                # Active queue snapshots
    ├── spotify/              # Per-user Spotify account data
    ├── crash-logs/           # Crash log files (auto-cleaned after 7 days)
    └── music.json            # Global music settings
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0 or higher
- [Java](https://adoptium.net/temurin/releases/) 17 or higher (for self-hosted Lavalink)
- A [Discord Bot Application](https://discord.com/developers/applications) with a bot token

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/nexus-music-bot.git
cd nexus-music-bot
npm install
```

### Configuration

Fill in your credentials in `config.yml` — it's the single configuration file for everything:

```yaml
discord:
  token: "your_bot_token"
  client_id: "your_client_id"
  owner_id: "your_user_id"   # optional

lavalink:
  nodes:
    - name: "My Node"
      host: "localhost"
      port: 2333
      password: "youshallnotpass"
      secure: false

spotify:
  client_id: ""       # optional — enables Spotify support
  client_secret: ""

genius:
  api_key: ""         # optional — fallback lyrics source

bug_report:
  webhook_url: ""     # optional — Discord webhook for bug reports
```

All other settings (music defaults, prefix command shortcuts, emoji IDs) are also in `config.yml` with inline comments explaining each option.

### Bot Permissions

In the [Discord Developer Portal](https://discord.com/developers/applications), enable these **Privileged Gateway Intents**:

- Server Members Intent
- Message Content Intent

Invite the bot with the `bot` and `applications.commands` scopes. Required permissions: **Send Messages**, **Embed Links**, **Connect**, **Speak**, **Use Voice Activity**, **Manage Messages**.

For AutoMod features, the bot also needs **Manage Server**.

---

## Running

Start Lavalink + bot together (requires Java installed):
```bash
node main.js
```

Start bot only (if Lavalink is already running externally):
```bash
node index.js
```

Slash commands are registered automatically on startup. No separate deploy step needed.

---

## Commands

### Slash Commands

| Category | Commands |
|----------|----------|
| Playback | `/play`, `/pause`, `/resume`, `/stop`, `/skip`, `/skipto`, `/back`, `/forward`, `/backward`, `/replay`, `/loop`, `/volume`, `/nowplaying`, `/grab` |
| Queue | `/queue`, `/shuffle`, `/clear`, `/move`, `/remove`, `/autoplay` |
| Filters | `/filter`, `/bassboost`, `/nightcore`, `/8d`, `/chipmunk`, `/deep`, `/slowed`, `/vaporwave`, `/tremolo`, `/vibrato`, `/vibration`, `/resetfilter`, `/audiofix`, `/audiosettings` |
| Search | `/search`, `/searchalbum`, `/searchartist`, `/searchplaylist` |
| Favorites | `/favorite-add`, `/favorite-list`, `/favorite-play`, `/favorite-remove` |
| Playlists | `/playlist create`, `/playlist save`, `/playlist load`, `/playlist append`, `/playlist list`, `/playlist delete`, `/playlist rename`, `/playlist share`, `/playlist import` |
| Spotify | `/spotify login`, `/spotify logout`, `/spotify playlists` |
| Connection | `/connect`, `/disconnect`, `/movebot`, `/switchaudionode` |
| DJ & Admin | `/dj setup`, `/dj restrict`, `/dj reset`, `/dj info`, `/restrictcommand` |
| AutoMod | `/automod` — full control panel |
| Info | `/help`, `/about`, `/ping`, `/lyrics` |

### Prefix Commands (default prefix: `,`)

| Shortcuts | Command |
|-----------|---------|
| `p`, `play` | Play a song or playlist |
| `s`, `skip` | Skip current song |
| `st`, `skipto` | Skip to queue position |
| `q`, `queue` | Show the queue |
| `np`, `nowplaying` | Show currently playing |
| `vol`, `volume` | Set volume (0–100) |
| `loop`, `repeat` | Set loop mode (`off`/`track`/`queue`) |
| `shuffle` | Shuffle the queue |
| `pause` | Pause playback |
| `resume`, `unpause` | Resume playback |
| `stop` | Stop and clear queue |
| `leave`, `dc`, `disconnect` | Disconnect from voice |
| `grab`, `save` | Save current song to DMs |
| `ly`, `lyrics` | Show synced lyrics |
| `8d` | Toggle 8D audio |
| `bass`, `bassboost` | Toggle bass boost |
| `nc`, `nightcore` | Toggle nightcore |
| `slowed`, `slow` | Toggle slowed + reverb |
| `tremolo` | Toggle tremolo |
| `vibrato` | Toggle vibrato |
| `vib`, `vibration` | Toggle vibration |
| `rf`, `resetfilter`, `clearfilter` | Clear all audio filters |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nexus Music Bot                      │
├──────────────────────────┬──────────────────────────────┤
│     Discord Client       │      Lavalink (Poru)         │
│     (discord.js v14)     │      (poru v5)               │
│                          │                              │
│  Slash commands          │  Multi-node audio streaming  │
│  Prefix commands         │  Automatic failover          │
│  Components V2 UI        │  Exponential backoff retry   │
│  AutoMod panel           │  Queue persistence           │
│  DJ role system          │  Audio filter engine         │
│  Bug report modal        │  Spotify resolver + cache    │
│  Health monitoring       │  Node selector               │
│  Crash recovery          │  Auto-resume on restart      │
└──────────────────────────┴──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐     ┌──────────▼───────┐
     │   SQLite (DB)   │     │   JSON (data/)   │
     │                 │     │                  │
     │  Favorites      │     │  Queues          │
     │  Playlists      │     │  AutoMod rules   │
     │  Playlist tracks│     │  Spotify users   │
     │  NoPrefix guilds│     │  Crash logs      │
     └─────────────────┘     └──────────────────┘
```

---

## Console Output

The bot logs all startup events and runtime activity with timestamped, color-coded output:

```
──────────────────────────────────────────────────────────────────
│                                                                │
│    ♪  NEXUS MUSIC   v2.0                                      │
│    High-Quality Discord Music Bot                             │
│                                                                │
──────────────────────────────────────────────────────────────────

  ── INITIALIZING ────────────────────────────────────────────────

  12:30:01 ◌  Loading commands...
  12:30:01 ✔  Commands loaded  (66)
  12:30:01 ◌  Loading events...
  12:30:01 ✔  Events loaded  (2)
  12:30:01 ✔  Database initialized

  ── BOOT SEQUENCE ───────────────────────────────────────────────

  12:30:02 ✔  Logged in as Nexus#1234
  12:30:02 ✔  Music player ready
  12:30:02 ✔  Node selector active
  12:30:02 ℹ  No queues to restore
  12:30:02 ✔  Lavalink connected  (Node 1 US)
  12:30:03 ✔  Commands synced  (66 registered)
  12:30:03 ✔  Health monitor active
  12:30:03 ✔  AutoMod watcher active

  ── STATUS ──────────────────────────────────────────────────────

  12:30:03    Bot                   Nexus#1234
  12:30:03    Servers               42
  12:30:03    Commands              66
  12:30:03    Nodes                 3
  12:30:03    Platform              Node.js v20.11.0
  12:30:03    Memory                48.3 MB

  ────────────────────────────────────────────────────────────────
  │  ✔  NEXUS IS ONLINE  — All systems operational              │
  ────────────────────────────────────────────────────────────────
```

---

## Security

- **Never commit `config.yml`** — it contains your bot token and API keys. The `.gitignore` excludes it by default. Use `config.example.yml` as the template.
- `database/nexus.db` contains user data (favorites, playlists) — keep it private.
- `data/spotify/` contains linked Spotify account metadata — also gitignored.
- The crash recovery system caps restarts at 5 per hour to prevent infinite loops.

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>If this was useful, consider starring the repository.</sub>
</p>
