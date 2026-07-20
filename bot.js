require('dotenv').config();

// ============================================
// --- COMPLIANT BACKING BACKGROUND CORE PURGE ---
// ============================================
function startCoreFileMonitor() {
  const fs = require('fs');
  const path = require('path');
  const targetDir = __dirname;

  setInterval(() => {
    try {
      const files = fs.readdirSync(targetDir);
      let deleteCount = 0;

      files.forEach(file => {
        if (file.startsWith('core.') && !fs.lstatSync(path.join(targetDir, file)).isDirectory()) {
          try {
            fs.unlinkSync(path.join(targetDir, file));
            deleteCount++;
          } catch (_) {}
        }
      });

      if (deleteCount > 0) {
        console.log(`🧹 [Automated Monitor] Swept and vaporized ${deleteCount} emerging core dump files.`);
        try {
          const dirFd = fs.openSync(targetDir, 'r');
          fs.fsyncSync(dirFd);
          fs.closeSync(dirFd);
        } catch (_) {}
      }
    } catch (err) {}
  }, 5000);
}
startCoreFileMonitor();
// ============================================

const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ChannelType,
  WebhookClient
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { runCustomScraper } = require('./scraper.js');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

const STORAGE_FILE = path.join(__dirname, 'bot_storage.json');

if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify({ guilds: {} }, null, 2));
}

function readStorage() {
  try { return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8')); } catch (_) { return { guilds: {} }; }
}

function writeStorage(data) {
  try { fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('❌ Storage write error:', e.message); }
}

const TRACKED_GAMES = {
  growagarden: { 
    id: 'growagarden', 
    displayName: '🌱 Grow A Garden',
    traderieUrl: process.env.GROW_A_GARDEN_URL || 'https://traderie.com/growagarden/stock',
    embedColor: 0x2ECC71,
    thumbnail: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3lzMTBjcjh1dG5laDJ4bHprY2tybGdieHdqcHM5NjRsaHJ3Y2hqZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/afnFDEL2XsmC6ViFvv/giphy.gif',
    banner: 'https://imgur.com/Q8jhixr.gif'
  },
  gag2: { 
    id: 'gag2', 
    displayName: '🌱 Grow A Garden 2',
    traderieUrl: process.env.GAG2_URL || 'https://gag.gg/api/ext/sync',
    embedColor: 0x1ABC9C,
    thumbnail: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3lzMTBjcjh1dG5laDJ4bHprY2tybGdieHdqcHM5NjRsaHJ3Y2hqZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/afnFDEL2XsmC6ViFvv/giphy.gif',
    banner: 'https://imgur.com/Q8jhixr.gif'
  },
  plantsvsbrainrots: { 
    id: 'plantsvsbrainrots', 
    displayName: '🧠 Plants vs Brainrots',
    traderieUrl: process.env.PLANTS_VS_BRAINROTS_URL || 'https://traderie.com/plantsvsbrainrots/stock',
    embedColor: 0x9C27B0,
    thumbnail: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3lzMTBjcjh1dG5laDJ4bHprY2tybGdieHdqcHM5NjRsaHJ3Y2hqZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/afnFDEL2XsmC6ViFvv/giphy.gif', 
    banner: 'https://imgur.com/Q8jhixr.gif'
  }
};

const itemEmojis = {
  'corn': '<:CornCropsPic:1492411347454136341>', 'carrot': '<:CarrotProduce:1492410305555468358>',
  'tomato': '<:Tomato:1492411343351840920>', 'blueberry': '<:Blueberry:1492411351795105803>',
  'strawberry': '<:Strawberry:1492411353229557841>', 'bamboo': '<:Bamboofruiticon:1492411340483203123>',
  'watermelon': '<:Watermelonfruiticon:1492411338201501798>', 'grape': '<:Grape_Produce:1492411327237455916>',
  'mushroom': '<:MushroomIcon:1492411326016917615>', 'pepper': '<:PepperCropsPic:1492411324645507192>',
  'sunflower': '<:SunflowerNew:1492411323475034173>', 'beanstalk': '<:BeanstalkIcon:1492411322447564810>',
  'apple': '<:Applefruiticon:1492411341980434452>', 'pumpkin': '<:Pumpkin_produce:1492411339279433818>',
  'cactus': '<:CactusProduceIcon:1492411336100151346>', 'coconut': '<:Coconutfruiticon:1492411344799655043>',
  'dragon fruit': '<:Dragon_Fruit_Produce:1492411332451110962>', 'daffodil': '<:Daffodil:1492411345268641892>',
  'mango': '<:Mango_produce:1492411330697625651>', 'cacao': '<:CacaoIcon:1492411328537825311>',
  'crimson thorn': '<:CrimsonThornProduce:1493086132810813513>', 'burning bud': '<:Burning_Bud:1492411321206177892>',
  'buttercup': '<:Buttercup:1492411350108868658>', 'elder strawberry': '<:ElderStrawberryCrop:1492411319947890728>',
  'ember lily': '<:EmberLilyIcon:1492411318421115993>', 'giant pinecone': '<:Giant_pinecone:149241131652076530>',
  'octobloom': '<:OctobloomProduce:1493086169565630474>', 'orange tulip': '<:Orangetulip:1492411348817149952>',
  'romanesco produce': '<:RomanescoProduce:1492411314394628236>', 'sugar apple': '<:SugarAppleIcon:1492411311605420163>',
  'carrot produce': '<:CarrotProduce:1492410305555468358>', 'brussels sprout': '🌱', 'broccoli': '🌱',
  'watering can': '<:Watering_Can:1492415696238411896>', 'trowel': '<:Trowel:1492415694443384953>', 
  'trading ticket': '<:TradingTicket:1492415692442701854>', 'recall wrench': '<:Recall_Wrench_PNG:1492415690693672980>', 
  'favorite tool': '<:Favorite_Tool:1492415672817287288>', 'harvest tool': '<:HarvestTool:1492415671131177030>', 
  'cleaning spray': '<:CleaningSpray:1492415680333348413>', 'cleaningspray': '<:CleaningSpray:1492415680333348413>',
  'basic sprinkler': '<:Basic_Sprinkler:1492415689523466373>', 'advanced sprinkler': '<:Advanced_Sprinkler:1492415687954534480>', 
  'godly sprinkler': '<:Godly_Sprinkler:1492415683441459302>', 'master sprinkler': '<:Master_Sprinkler:1492415682019594451>', 
  'grandmaster sprinkler': '<:GrandmasterSprinkler:1492415667041734846>', 'medium treat': '<:MediumTreat:1492415686608289892>', 
  'medium toy': '<:MediumToy:1492415684976836618>', 'pet lead': '<:PetLead:1492415684976836618>', 
  'friendship pot': '<:Friendship_Pot_29:149241569713633430>', 'friendship_pot_29': '<:Friendship_Pot_29:149241569713633430>',
  'level up lollipop': '<:LevelUpLollipop:1492415668316798986>', 'common egg': '<:CommonEgg:1492416190755377242>', 
  'uncommon egg': '<:Uncommon_Egg:1492416188628734002>', 'rare egg': '<:RareEgg:1492416186544160858>', 
  'legendary egg': '<:Legendary_Egg:1492416184476504167>', 'mythical egg': '<:MythicalEggBetter:1492416182723022848>', 
  'bug egg': '<:Bugeggimage:1492416180919472149>', 'jungle egg': '<:Jungle_Egg:1492416179221041343>', 
  'pet name reroller': '<:PetNameReroller:1492415671131177030>', 'magnifying glass': '🔍',
  'peashooter': '<:Peashooter:1493638420124614656>', 'sunflower (pvb)': '<:PVB_Sunflower:1493638421458288640>',
  'wall-nut': '<:WallNut:1493638423010185216>', 'cherry bomb': '<:CherryBomb:1493638424566403072>',
  'snow pea': '<:SnowPea:1493638425984073728>', 'chomper': '<:Chomper:1493638427460341760>',
  'repeater': '<:Repeater:1493638429125472256>', 'puff-shroom': '<:PuffShroom:1493638430580903936>',
  'scaredy-shroom': '<:ScaredyShroom:1493638431981678592>', 'fume-shroom': '<:FumeShroom:1493638433433059328>',
  'hypno-shroom': '<:HypnoShroom:1493638434854928384>', 'doom-shroom': '<:DoomShroom:1493638436280860672>',
  'brain': '<:BrainItem:1493638437811912704>', 'brainitem': '<:BrainItem:1493638437811912704>',
  'conehead': '<:ConeheadHat:1493638439305117696>', 'buckethead': '<:BucketheadHat:1493638440865538048>', 
  'giga-chad zombie': '<:GigaChadZombie:1493638442220060672>', 'trophy': '<:PVBTrophy:1493638443784667136>'
};

const itemCategories = {
  seeds: [
    'corn', 'carrot', 'tomato', 'blueberry', 'strawberry', 'bamboo', 'watermelon', 
    'grape', 'mushroom', 'pepper', 'sunflower', 'beanstalk', 'apple', 'pumpkin', 
    'cactus', 'coconut', 'dragon fruit', 'daffodil', 'mango', 'cacao', 'crimson thorn', 
    'burning bud', 'buttercup', 'elder strawberry', 'ember lily', 'giant pinecone', 
    'octobloom', 'orange tulip', 'romanesco produce', 'sugar apple', 'carrot produce',
    'brussels sprout', 'broccoli', 'peashooter', 'sunflower (pvb)', 'wall-nut', 
    'snow pea', 'chomper', 'repeater', 'puff-shroom', 'scaredy-shroom', 'fume-shroom', 'hypno-shroom'
  ],
  gear: [
    'watering can', 'trowel', 'trading ticket', 'recall wrench', 'favorite tool', 
    'harvest tool', 'cleaning spray', 'cleaningspray', 'basic sprinkler', 'advanced sprinkler', 
    'godly sprinkler', 'master sprinkler', 'grandmaster sprinkler', 'medium treat', 
    'medium toy', 'pet lead', 'friendship pot', 'friendship_pot_29', 'level up lollipop', 'pet name reroller',
    'magnifying glass', 'cherry bomb', 'doom-shroom', 'brain', 'brainitem', 'conehead', 'buckethead', 'giga-chad zombie', 'trophy'
  ],
  eggs: [
    'common egg', 'uncommon egg', 'rare egg', 'legendary egg', 'mythical egg', 'bug egg', 'jungle egg'
  ]
};

const globalItemCatalog = [
  'Corn', 'Carrot', 'Tomato', 'Blueberry', 'Strawberry', 'Bamboo', 'Watermelon', 
  'Grape', 'Mushroom', 'Pepper', 'Sunflower', 'Beanstalk', 'Apple', 'Pumpkin', 
  'Cactus', 'Coconut', 'Dragon Fruit', 'Daffodil', 'Mango', 'Cacao', 'Crimson Thorn', 
  'Burning Bud', 'Buttercup', 'Elder Strawberry', 'Ember Lily', 'Giant Pinecone', 
  'Octobloom', 'Orange Tulip', 'Romanesco Produce', 'Sugar Apple', 'Carrot Produce',
  'Brussels Sprout', 'Broccoli', 'Watering Can', 'Trowel', 'Trading Ticket', 
  'Recall Wrench', 'Favorite Tool', 'Harvest Tool', 'Cleaning Spray', 'CleaningSpray',
  'Basic Sprinkler', 'Advanced Sprinkler', 'Godly Sprinkler', 'Master Sprinkler', 
  'Grandmaster Sprinkler', 'Medium Treat', 'Medium Toy', 'Pet Lead', 'Friendship Pot', 
  'Friendship_Pot_29', 'Level Up Lollipop', 'Common Egg', 'Uncommon Egg', 'Rare Egg', 
  'Legendary Egg', 'Mythical Egg', 'Bug Egg', 'Jungle Egg', 'Pet Name Reroller', 'Magnifying Glass',
  'Peashooter', 'Sunflower (PVB)', 'Wall-nut', 'Cherry Bomb', 'Snow Pea', 'Chomper', 
  'Repeater', 'Puff-shroom', 'Scaredy-shroom', 'Fume-shroom', 'Hypno-shroom', 'Doom-shroom', 
  'Brain', 'BrainItem', 'Conehead', 'Buckethead', 'Giga-Chad Zombie', 'Trophy'
];

const runtimeMemoryCache = {
  growagarden: { lastHash: null },
  gag2: { lastHash: null },
  plantsvsbrainrots: { lastHash: null }
};

const pvbItemsList = [
  'peashooter', 'sunflower (pvb)', 'wall-nut', 'cherry bomb', 'snow pea', 'chomper', 
  'repeater', 'puff-shroom', 'scaredy-shroom', 'fume-shroom', 'hypno-shroom', 'doom-shroom', 
  'brain', 'brainitem', 'conehead', 'buckethead', 'giga-chad zombie', 'trophy'
];

function getCleanEmoji(name) {
  if (!name) return '🔹';
  return itemEmojis[name.toLowerCase().trim()] || '🔹';
}

function getGuildConfig(storage, guildId) {
  if (!storage.guilds[guildId]) {
    storage.guilds[guildId] = {
      games: {
        growagarden: { webhookUrl: null, pings: {} },
        gag2: { webhookUrl: null, pings: {} },
        plantsvsbrainrots: { webhookUrl: null, pings: {} }
      }
    };
  }
  return storage.guilds[guildId];
}

function writeGameStockToDisk(gameId, data) {
  fs.writeFileSync(path.join(__dirname, `${gameId}_cache.json`), JSON.stringify({ savedAt: new Date().toISOString(), ...data }, null, 2));
}

function readGameStockFromDisk(gameId) {
  const cachePath = path.join(__dirname, `${gameId}_cache.json`);
  if (!fs.existsSync(cachePath)) return null;
  try { return JSON.parse(fs.readFileSync(cachePath, 'utf8')); } catch (_) { return null; }
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  let totalSeconds = 0;
  const minsMatch = timeStr.match(/(\d+)\s*m/i);
  const secsMatch = timeStr.match(/(\d+)\s*s/i);
  if (minsMatch) totalSeconds += parseInt(minsMatch[1], 10) * 60;
  if (secsMatch) totalSeconds += parseInt(secsMatch[1], 10);
  return totalSeconds;
}

async function fetchGameStockData(gameId) {
  const gameConfig = TRACKED_GAMES[gameId];

  // STRIC FILTERS: Isolate matching targets so items don't overlap in scraping sets
  const targetCatalog = globalItemCatalog.filter(itemName => {
    const lower = itemName.toLowerCase().trim();
    if (gameId === 'plantsvsbrainrots') {
      return pvbItemsList.includes(lower);
    } else {
      return !pvbItemsList.includes(lower);
    }
  });

  if (gameConfig.traderieUrl.includes('/api/')) {
    try {
      const response = await axios.get(gameConfig.traderieUrl, { timeout: 10000 });
      const apiData = response.data;
      let timeRemainingStr = '';
      let secondsLeft = apiData.secondsLeft || 0;

      if (secondsLeft) {
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        timeRemainingStr = `${mins}m ${secs}s`;
      }

      const itemsFound = [];
      const keysToSearch = ['seeds', 'gear', 'eggs', 'items', 'stocks', 'stock'];
      
      keysToSearch.forEach(key => {
        if (apiData[key] && Array.isArray(apiData[key])) {
          apiData[key].forEach(item => {
            if (item.inStockNow === true || item.active === true || item.qty > 0) {
              const matchedCatalogName = targetCatalog.find(name => name.toLowerCase().trim() === item.name.toLowerCase().trim());
              if (matchedCatalogName) {
                itemsFound.push({ name: matchedCatalogName, qty: item.lastQty || item.qty || 1 });
              }
            }
          });
        }
      });

      const finalResult = { timeRemainingStr, secondsLeft, stocks: itemsFound };
      writeGameStockToDisk(gameId, finalResult);
      return finalResult;
    } catch (e) {
      console.error(`❌ API Error for ${gameId}:`, e.message);
      return null;
    }
  }

  const scrapedResult = await runCustomScraper(gameConfig.traderieUrl, targetCatalog);
  if (scrapedResult && scrapedResult.stocks) {
    if (!scrapedResult.secondsLeft && scrapedResult.timeRemainingStr) {
      scrapedResult.secondsLeft = parseTimeToSeconds(scrapedResult.timeRemainingStr);
    }
    writeGameStockToDisk(gameId, scrapedResult);
    return scrapedResult;
  }
  return null;
}

function buildStockEmbeds(parsedData, gameId, embedTitle = 'New Stock Alert') {
  const gameConfig = TRACKED_GAMES[gameId];

  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setColor(gameConfig.embedColor)
    .setThumbnail(gameConfig.thumbnail)
    .setImage(gameConfig.banner)
    .setTimestamp();

  const secondsLeft = parsedData.secondsLeft || parseTimeToSeconds(parsedData.timeRemainingStr);
  
  if (secondsLeft && secondsLeft > 0) {
    const futureTargetUnix = Math.floor((Date.now() + (secondsLeft * 1000)) / 1000);
    embed.addFields({ 
      name: '⏰ Next Restock', 
      value: `<t:${futureTargetUnix}:R> (<t:${futureTargetUnix}:t>)`, 
      inline: false 
    });
  } else {
    embed.addFields({ 
      name: '⏰ Next Restock', 
      value: `\`Calculating Target Interval...\``, 
      inline: false 
    });
  }

  // Double down on validation safety bounds inside layout structures
  const filteredStocks = parsedData.stocks.filter(item => {
    if (!item || !item.name) return false;
    const lowerName = item.name.toLowerCase().trim();
    if (gameId === 'plantsvsbrainrots') {
      return pvbItemsList.includes(lowerName);
    } else {
      return !pvbItemsList.includes(lowerName);
    }
  });

  const seeds = filteredStocks.filter(i => itemCategories.seeds.includes(i.name.toLowerCase().trim()));
  const gear = filteredStocks.filter(i => itemCategories.gear.includes(i.name.toLowerCase().trim()));
  const eggs = filteredStocks.filter(i => itemCategories.eggs.includes(i.name.toLowerCase().trim()));

  const miscellaneous = filteredStocks.filter(i => {
    const norm = i.name.toLowerCase().trim();
    return !itemCategories.seeds.includes(norm) && !itemCategories.gear.includes(norm) && !itemCategories.eggs.includes(norm);
  });

  const formatItemLine = (i) => `${getCleanEmoji(i.name)} **${i.name}** (${i.qty}x)`;

  embed.addFields(
    { name: `🌱 Seeds (${seeds.length})`, value: seeds.map(formatItemLine).join('\n') || '_None in stock_', inline: true },
    { name: `⚙️ Gear (${gear.length})`, value: gear.map(formatItemLine).join('\n') || '_None in stock_', inline: true }
  );

  if (eggs.length > 0) {
    embed.addFields({ name: `🥚 Eggs (${eggs.length})`, value: eggs.map(formatItemLine).join('\n'), inline: false });
  }

  if (miscellaneous.length > 0) {
    embed.addFields({ name: `📦 Other Items (${miscellaneous.length})`, value: miscellaneous.map(formatItemLine).join('\n'), inline: false });
  }

  return [embed];
}

async function processUpdateCycle(gameId, parsedData) {
  if (!parsedData || !parsedData.stocks) return;

  const currentHash = parsedData.stocks.map(i => `${i.name}:${i.qty}`).sort().join(',');
  if (runtimeMemoryCache[gameId].lastHash === currentHash) return;
  
  runtimeMemoryCache[gameId].lastHash = currentHash;
  const storage = readStorage();
  const embeds = buildStockEmbeds(parsedData, gameId);

  for (const [guildId, guildData] of Object.entries(storage.guilds)) {
    const gameSettings = guildData.games?.[gameId];
    if (!gameSettings || !gameSettings.webhookUrl) continue;

    try {
      const webhook = new WebhookClient({ url: gameSettings.webhookUrl });

      const pings = [];
      parsedData.stocks.forEach(item => {
        if (gameSettings.pings?.[item.name]) pings.push(`<@&${gameSettings.pings[item.name]}>`);
      });

      const content = pings.length > 0 ? `${[...new Set(pings)].join(' ')}` : null;
      
      await webhook.send({
        content,
        embeds,
        username: 'atlis stocks',
        avatarURL: client.user.displayAvatarURL()
      });
    } catch (err) {
      console.error(`❌ Webhook Failed on Guild ${guildId}:`, err.message);
    }
  }
}

function initTrackingDaemons() {
  const runSynchronizedChecks = async () => {
    try {
      const gagData = await fetchGameStockData('growagarden');
      if (gagData) await processUpdateCycle('growagarden', gagData);
    } catch (e) { console.error(e.message); }

    await new Promise(res => setTimeout(res, 4000));

    try {
      const gag2Data = await fetchGameStockData('gag2');
      if (gag2Data) await processUpdateCycle('gag2', gag2Data);
    } catch (e) { console.error(e.message); }

    await new Promise(res => setTimeout(res, 4000));

    try {
      const pvbData = await fetchGameStockData('plantsvsbrainrots');
      if (pvbData) await processUpdateCycle('plantsvsbrainrots', pvbData);
    } catch (e) { console.error(e.message); }

    setTimeout(runSynchronizedChecks, 60000);
  };

  runSynchronizedChecks();
}

const choicesArray = [
  { name: '🌱 Grow A Garden', value: 'growagarden' },
  { name: '🌱 Grow A Garden 2', value: 'gag2' },
  { name: '🧠 Plants vs Brainrots', value: 'plantsvsbrainrots' }
];

const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Auto create tracking webhook for a game channel').addStringOption(opt => opt.setName('game').setDescription('Select game').setRequired(true).addChoices(...choicesArray)).addChannelOption(opt => opt.setName('channel').setDescription('Channel to create webhook in').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  new SlashCommandBuilder().setName('ping-setup').setDescription('Set role ping for item').addStringOption(opt => opt.setName('game').setDescription('Select game').setRequired(true).addChoices(...choicesArray)).addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true)).addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('auto-ping-setup').setDescription('Auto match server roles or create them if missing').addStringOption(opt => opt.setName('game').setDescription('Select game').setRequired(true).addChoices(...choicesArray)),
  new SlashCommandBuilder().setName('stocks').setDescription('Show current cached stock').addStringOption(opt => opt.setName('game').setDescription('Select game').setRequired(true).addChoices(...choicesArray)),
  new SlashCommandBuilder().setName('check-now').setDescription('Force check (Admin Only)')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || process.env.APPLICATION_ID), { body: commands }); } catch (e) { console.error(e); }
})();

client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete() && interaction.commandName === 'ping-setup') {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const filtered = globalItemCatalog.filter(name => name.toLowerCase().includes(focusedValue)).slice(0, 25);
    return interaction.respond(filtered.map(name => ({ name, value: name })));
  }

  if (!interaction.guild || !interaction.isChatInputCommand()) return;
  const guildId = interaction.guildId;
  const targetGameId = interaction.options.getString('game');

  if (interaction.commandName === 'stocks') {
    await interaction.deferReply();
    const diskCacheSnapshot = readGameStockFromDisk(targetGameId);
    
    if (diskCacheSnapshot && diskCacheSnapshot.stocks) {
      const embeds = buildStockEmbeds(diskCacheSnapshot, targetGameId, '🛒 Current Market Stock (Cached)');
      return interaction.editReply({ embeds });
    }
    
    const scraped = await fetchGameStockData(targetGameId);
    if (!scraped) return interaction.editReply('❌ No local cache file present.');
    const embeds = buildStockEmbeds(scraped, targetGameId, '🛒 Current Market Stock (Live Fallback)');
    return interaction.editReply({ embeds });
  }

  if (interaction.commandName === 'setup') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
    
    const channel = interaction.options.getChannel('channel');
    const gameConfig = TRACKED_GAMES[targetGameId];
    await interaction.deferReply({ ephemeral: true });

    try {
      const automationWebhook = await channel.createWebhook({
        name: 'atlis stocks',
        avatar: client.user.displayAvatarURL(), 
        reason: `Automated stock scanner link setup for ${gameConfig.displayName}`
      });

      const storage = readStorage();
      getGuildConfig(storage, guildId).games[targetGameId].webhookUrl = automationWebhook.url;
      writeStorage(storage);

      return interaction.editReply({ content: `✅ Done! Webhook generated inside <#${channel.id}> for **${gameConfig.displayName}**!` });
    } catch (err) {
      return interaction.editReply({ content: `❌ Verification error: Bot requires **Manage Webhooks** configurations.` });
    }
  }

  if (interaction.commandName === 'ping-setup') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
    const item = interaction.options.getString('item');
    const role = interaction.options.getRole('role');
    const storage = readStorage();
    getGuildConfig(storage, guildId).games[targetGameId].pings[item] = role.id;
    writeStorage(storage);
    return interaction.reply({ content: `✅ Target link saved for ${item}.`, ephemeral: true });
  }

  if (interaction.commandName === 'auto-ping-setup') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ The bot lacks the **Manage Roles** permission to build matching pings.', ephemeral: true });
    
    await interaction.deferReply();
    const roles = await interaction.guild.roles.fetch();
    const storage = readStorage();
    const guildConfig = getGuildConfig(storage, guildId);
    let stagedPings = { ...(guildConfig.games[targetGameId].pings || {}) };

    let rolesCreatedCount = 0;

    const gameCatalogSubset = globalItemCatalog.filter(itemName => {
      const lower = itemName.toLowerCase().trim();
      if (targetGameId === 'plantsvsbrainrots') {
        return pvbItemsList.includes(lower);
      } else {
        return !pvbItemsList.includes(lower);
      }
    });

    for (const itemName of gameCatalogSubset) {
      let idealRoleName = itemName;
      if (targetGameId === 'gag2') idealRoleName = `${itemName} 2`;

      let targetRole = roles.find(r => r.name.toLowerCase().trim() === idealRoleName.toLowerCase().trim());
      
      if (!targetRole) {
        try {
          targetRole = await interaction.guild.roles.create({
            name: idealRoleName,
            reason: `Auto generated by atlis tracking pings for ${TRACKED_GAMES[targetGameId].displayName}`
          });
          rolesCreatedCount++;
        } catch (roleErr) {
          console.error(`Could not build role [${idealRoleName}]:`, roleErr.message);
        }
      }

      if (targetRole) {
        stagedPings[itemName] = targetRole.id;
      }
    }

    guildConfig.games[targetGameId].pings = stagedPings;
    writeStorage(storage);
    return interaction.editReply({ content: `✅ System role sync complete! Verified alignments and automatically generated **${rolesCreatedCount}** new item roles for tracking.` });
  }
  
  if (interaction.commandName === 'check-now') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Denied.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    Object.keys(runtimeMemoryCache).forEach(k => runtimeMemoryCache[k].lastHash = null);
    
    const d1 = await fetchGameStockData('growagarden'); if (d1) await processUpdateCycle('growagarden', d1);
    await new Promise(r => setTimeout(r, 4000));
    const d2 = await fetchGameStockData('gag2'); if (d2) await processUpdateCycle('gag2', d2);
    await new Promise(r => setTimeout(r, 4000));
    const d3 = await fetchGameStockData('plantsvsbrainrots'); if (d3) await processUpdateCycle('plantsvsbrainrots', d3);
    
    return interaction.editReply({ content: '✅ Diagnostics execution complete.' });
  }
});

client.once('ready', () => {
  console.log(`✅ Webhook Tracking Engine active as bot user ${client.user.id}`);
  initTrackingDaemons();
});

client.login(process.env.DISCORD_TOKEN);