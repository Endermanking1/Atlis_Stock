<p align="center">
  <img src="https://github.com/yourusername/atlis-stocks/blob/main/assets/Atlis%20Stock-Photoroom.png?raw=true" alt="Atlis Stocks Banner" width="700">
</p>

<h1 align="center">Atlis Stocks</h1>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-≥18.0.0-339933?logo=nodedotjs&logoColor=white" alt="Node.js"></a>
  <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white" alt="Discord.js"></a>
  <a href="https://pptr.dev/"><img src="https://img.shields.io/badge/Puppeteer-Latest-40B5A4?logo=puppeteer&logoColor=white" alt="Puppeteer"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
</p>

<p align="center">
  <em>Automated real-time market stock tracking for Discord.</em>
</p>

---

## What it does

This project automatically gathers live in-game market stock and inventory data for games like gag, pvb, and gag 2 directly from Traderie. It processes this data and displays it on an automated, real-time Discord dashboard embed featuring restock countdown timers and item category sorting.

## Requirements

- CPU: 200%+ CPU utilization capability (requires multiple CPU cores/threads to handle headless browser clustering).
- RAM: 3GB to 5GB of available RAM.
- Storage: 10GB to 20GB of local disk storage space (for Node modules, browser cache, and local state logs).

## How to set up

- Clone the repository: `git clone <repository-url>`
- Navigate into the project directory: `cd atlis-stocks`
- Install all required dependencies: `npm install discord.js puppeteer`
- Configure the environment: Create a `.env` file in the project root containing your `DISCORD_TOKEN`, `CLIENT_ID`, and target Traderie URLs.
- Register the slash commands: `node deploy-commands.js`
- Start the application: `node index.js`

## Project Components

- **Premium Anti-Cloudflare Precise Isolated Component Scraper (`scraper.js`)**: A headless Puppeteer implementation running viewport masks, custom User-Agents, and `AutomationControlled` bypass flags. Evaluation routines are pinned directly to the page `mainFrame` to block detached frame execution exceptions caused by dynamic ad frames shifting during scraping. It parses multipliers (e.g., `4x`) and countdown timers via regex.
- **Discord Bot & Dashboard System**: Built via Discord.js to host a live, rich-embed stock dashboard. Cross-references scraped text with a pre-configured `targetCatalog` to filter items into designated spaces like Seeds and Gear. Automatically handles live fallback logging when pages shift.

## Available Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/auto-ping-setup game` | Automatically match server roles or create them if missing for the specific game catalog. | `@everyone` |
| `/check-now` | Force an immediate diagnostic update loop check. | Admin only |
| `/ping-setup game: item: role:` | Assign a specific role to be pinged when an item appears in stock. | `@everyone` |
| `/setup game: channel:` | Auto create tracking webhook link for a specific game within a selected text channel. | `@everyone` |
| `/stock game:` | Force display of current cached stock levels or a live fallback layout. | `@everyone` |

## License

This project is licensed under the [MIT License](LICENSE).
