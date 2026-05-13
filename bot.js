const { Client, GatewayIntentBits, PermissionsBitField, SlashCommandBuilder, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');
const fs = require('fs');
const YAML = require('yaml');
const readline = require('readline');
require('dotenv').config();

// ===== LOAD CONFIGURATION =====
let CONFIG;
try {
  const configFile = fs.readFileSync('config.yml', 'utf8');
  CONFIG = YAML.parse(configFile);
  console.log('Configuration loaded from config.yml');
} catch (error) {
  console.error('Error loading config.yml:', error.message);
  console.log('💡 Make sure you have created config.yml (copy from config.example.yml)');
  process.exit(1);
}

// Bot client for target guild
const botClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// Selfbot client for source guild
const userClient = new SelfbotClient({
  checkUpdate: false,
  intents: [
    'GUILDS',
    'GUILD_MESSAGES',
    'GUILD_MEMBERS'
  ]
});

let botReady = false;
let userReady = false;

// ===== REGISTER SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder()
    .setName('start-copy')
    .setDescription('Clone a source guild into this server (destructive)')
    .addStringOption(option =>
      option.setName('source_guild_id')
        .setDescription('The source guild ID to copy from')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  
  new SlashCommandBuilder()
    .setName('manual-copy')
    .setDescription('Copy source guild structure without deleting existing data')
    .addStringOption(option =>
      option.setName('source_guild_id')
        .setDescription('The source guild ID to copy from')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('copy_roles')
        .setDescription('Create missing roles from the source guild')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('copy_channels')
        .setDescription('Create missing channels from the source guild')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('copy_guild_description')
        .setDescription('Copy the source guild description if supported')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName('backup-create')
    .setDescription('Create a JSON backup of a guild structure')
    .addStringOption(option =>
      option.setName('guild_id')
        .setDescription('The guild ID to backup')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName('backup-list')
    .setDescription('List available local backups')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName('check-status')
    .setDescription('Check this guild status')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  
  new SlashCommandBuilder()
    .setName('verify-clone')
    .setDescription('Verify cloning progress')
    .addStringOption(option =>
      option.setName('source_guild_id')
        .setDescription('The source guild ID to verify against')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View current cloner settings')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

// Bot ready event
botClient.once('ready', async () => {
  console.log(`Bot: ${botClient.user.tag}`);
  botReady = true;
  
  // Register commands
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  
  try {
    await rest.put(
      Routes.applicationCommands(botClient.user.id),
      { body: commands }
    );
    console.log('Commands registered');
  } catch (error) {
    console.error('Command registration failed:', error.message);
  }
  
  checkBothReady();
});

// User client ready event
userClient.once('ready', () => {
  console.log(`User: ${userClient.user.tag}`);
  userReady = true;
  checkBothReady();
});

function checkBothReady() {
  if (botReady && userReady) {
    console.log('\nAll clients ready. Use /start-copy or CLI console.\n');
    startCLI();
  }
}

// ===== INTERACTIVE CLI CONSOLE =====
function startCLI() {
  if (CONFIG.interface.enable_cli === false) return;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: CONFIG.interface.cli_prompt || 'Nexus-Cloner> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const args = line.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'help':
        console.log('\n--- Nexus Cloner CLI Help ---');
        console.log('status          - Show status of bot and user clients');
        console.log('scan <id>       - Manually scan a guild and save to JSON');
        console.log('clone <src> <trg> - Trigger clone process (CLI version)');
        console.log('list            - List available local backups');
        console.log('clear           - Clear the console output');
        console.log('exit            - Safely shutdown the bot');
        console.log('-----------------------------\n');
        break;

      case 'status':
        console.log(`\nBot: ${botClient.user ? botClient.user.tag : 'Offline'}`);
        console.log(`User: ${userClient.user ? userClient.user.tag : 'Offline'}`);
        console.log(`Guilds Access: ${userClient.guilds.cache.size}\n`);
        break;

      case 'scan':
        if (!args[0]) {
          console.log('Usage: scan <guild_id>');
        } else {
          const guild = userClient.guilds.cache.get(args[0]);
          if (!guild) console.log('Source guild not found or user token has no access.');
          else {
            console.log(`Scanning ${guild.name}...`);
            await scanGuild(guild);
            console.log(`Backup saved to guild-full-${guild.id}.json`);
          }
        }
        break;

      case 'list':
        const files = fs.readdirSync('.').filter(f => f.startsWith('guild-full-') && f.endsWith('.json'));
        if (files.length === 0) console.log('No local backups found.');
        else {
          console.log('\n--- Local Backups ---');
          files.forEach(f => console.log(`• ${f}`));
          console.log('---------------------\n');
        }
        break;

      case 'clear':
        console.clear();
        break;

      case 'exit':
        console.log('Shutting down...');
        process.exit(0);
        break;

      case '':
        break;

      default:
        console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
        break;
    }
    rl.prompt();
  }).on('close', () => {
    console.log('Shutting down...');
    process.exit(0);
  });
}

// ===== HANDLE SLASH COMMANDS =====
botClient.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  
  // Handle button interactions
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('confirm_clone_')) {
      const sourceGuildId = interaction.customId.replace('confirm_clone_', '');
      await interaction.update({ content: 'Starting clone process...', components: [], embeds: [] });
      await startCloning(interaction, sourceGuildId);
    } else if (interaction.customId === 'cancel_clone') {
      await interaction.update({ content: 'Clone cancelled.', components: [], embeds: [] });
    }
    return;
  }
  
  // Handle slash commands
  const { commandName } = interaction;
  
  if (commandName === 'start-copy') {
    await handleStartCopy(interaction);
  } else if (commandName === 'manual-copy') {
    await handleManualCopy(interaction);
  } else if (commandName === 'backup-create') {
    await handleBackupCreate(interaction);
  } else if (commandName === 'backup-list') {
    await handleBackupList(interaction);
  } else if (commandName === 'check-status') {
    await handleCheckStatus(interaction);
  } else if (commandName === 'verify-clone') {
    await handleVerifyClone(interaction);
  } else if (commandName === 'settings') {
    await handleSettings(interaction);
  }
});

// ===== COMMAND: /start-copy =====
async function handleStartCopy(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const sourceGuildId = interaction.options.getString('source_guild_id');
  const targetGuild = interaction.guild; // The guild where command is used
  
  if (!targetGuild) {
    await interaction.editReply('This command must be used in a server.');
    return;
  }
  
  const sourceGuild = userClient.guilds.cache.get(sourceGuildId);
  
  if (!sourceGuild) {
    await interaction.editReply('Source guild not found. Verify the guild ID and ensure the user token has access.');
    return;
  }
  
  // Check if bot role is at top
  const botMember = await targetGuild.members.fetch(botClient.user.id);
  const botRole = botMember.roles.highest;
  const topRole = targetGuild.roles.cache.sort((a, b) => b.position - a.position).first();
  
  if (botRole.position < topRole.position - 1) {
    await interaction.editReply('Bot role must be at the top of the role hierarchy. Please move the bot role to the highest position in Server Settings > Roles.');
    return;
  }
  
  // Create warning embed
  const warningEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('Destructive Clone Confirmation')
    .setDescription('This action will permanently delete existing server structure and replace it with the source guild structure.')
    .addFields(
      { name: 'Target Server', value: 'All channels, categories, and roles will be removed from this server before cloning.', inline: true },
      { name: 'Source Guild', value: 'The source guild will be scanned and its structure will be replicated in this server.', inline: true },
      { name: 'Guilds', value: `Source: ${sourceGuild.name}\nTarget: ${targetGuild.name}`, inline: false }
    )
    .setFooter({ text: 'This action cannot be undone. Ensure you have a backup.' })
    .setTimestamp();
  
  // Create confirmation buttons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_clone_${sourceGuildId}`)
        .setLabel('Confirm and Clone')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_clone')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.editReply({
    embeds: [warningEmbed],
    components: [row]
  });
}

// ===== COMMAND: /manual-copy =====
async function handleManualCopy(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const sourceGuildId = interaction.options.getString('source_guild_id');
  const targetGuild = interaction.guild;

  if (!targetGuild) {
    await interaction.editReply('This command must be used in a server.');
    return;
  }

  const sourceGuild = userClient.guilds.cache.get(sourceGuildId);
  if (!sourceGuild) {
    await interaction.editReply('Source guild not found. Verify the guild ID and ensure the user token has access.');
    return;
  }

  const copyRoles = interaction.options.getBoolean('copy_roles') ?? true;
  const copyChannels = interaction.options.getBoolean('copy_channels') ?? true;
  const copyGuildDescription = interaction.options.getBoolean('copy_guild_description') ?? false;

  if (!copyRoles && !copyChannels && !copyGuildDescription) {
    await interaction.editReply('No copy options selected. Enable at least one of roles, channels, or guild description.');
    return;
  }

  await interaction.editReply('Manual copy started. This operation will preserve existing target data where possible.');

  await startCloning(interaction, sourceGuildId, {
    destructive: false,
    preserveExistingRoles: true,
    copyRoles,
    copyChannels,
    copyGuildDescription
  });
}

// ===== COMMAND: /backup-create =====
async function handleBackupCreate(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.options.getString('guild_id');
  const guild = userClient.guilds.cache.get(guildId);

  if (!guild) return interaction.editReply('Guild not found or access denied.');

  await scanGuild(guild);
  await interaction.editReply('Backup created for ' + guild.name + '. File: guild-full-' + guild.id + '.json');
}

// ===== COMMAND: /backup-list =====
async function handleBackupList(interaction) {
  const files = fs.readdirSync('.').filter(f => f.startsWith('guild-full-') && f.endsWith('.json'));
  if (files.length === 0) return interaction.reply({ content: 'No local backups found.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('Local Guild Backups')
    .setDescription(files.map(f => `• \`${f}\``).join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ===== COMMAND: /settings =====
async function handleSettings(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('Nexus Cloner Settings')
    .addFields(
      { name: 'Delay (ms)', value: `\`${CONFIG.settings.delay_ms}\``, inline: true },
      { name: 'Max Bitrate', value: `\`${CONFIG.settings.max_bitrate}\``, inline: true },
      { name: 'Batch Size', value: `\`${CONFIG.settings.batch_size}\``, inline: true },
      { name: 'Smart Fallback', value: `\`${CONFIG.cloning.smart_fallback}\``, inline: true },
      { name: 'Clone Standalone', value: `\`${CONFIG.cloning.clone_standalone}\``, inline: true },
      { name: 'Auto-Delete Target', value: `\`${CONFIG.cloning.auto_delete_target}\``, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ===== START CLONING PROCESS =====
async function startCloning(interaction, sourceGuildId, options = {}) {
  const sourceGuild = userClient.guilds.cache.get(sourceGuildId);
  const targetGuild = interaction.guild;
  
  const destructive = options.destructive !== undefined ? options.destructive : CONFIG.cloning.auto_delete_target;
  const copyRoles = options.copyRoles !== undefined ? options.copyRoles : true;
  const copyChannels = options.copyChannels !== undefined ? options.copyChannels : true;
  const preserveExistingRoles = options.preserveExistingRoles || false;
  const copyGuildDescription = options.copyGuildDescription || false;

  // Create a log channel first
  let logChannel;
  
  try {
    logChannel = await targetGuild.channels.create({
      name: destructive ? 'clone-log' : 'manual-copy-log',
      type: 0,
      reason: destructive ? 'Clone progress log' : 'Manual copy progress log'
    });
    
    const startMessage = destructive
      ? 'Guild cloning started. Existing target data will be replaced according to configuration.'
      : 'Manual copy started. Existing target data will be preserved where possible.';

    await logChannel.send(startMessage);
    await logChannel.send('Scanning the source guild...');
    const guildData = await scanGuild(sourceGuild);
    await logChannel.send(`Scanned source guild with ${guildData.roles.length} roles, ${guildData.categories.length} categories, and ${guildData.standalone_channels.length} standalone channels.`);
    
    if (copyGuildDescription && sourceGuild.description) {
      try {
        await targetGuild.edit({ description: sourceGuild.description, reason: 'Copy guild description' });
        await logChannel.send('Guild description copied to the target server.');
      } catch (error) {
        await logChannel.send('Unable to copy guild description to the target server.');
      }
    }
    
    if (destructive) {
      await logChannel.send('Deleting existing channels and roles in the target server...');
      await deleteAllChannels(targetGuild, logChannel.id);
      await deleteAllRoles(targetGuild);
    }
    
    const roleMap = copyRoles
      ? await cloneRoles(targetGuild, guildData, { preserveExisting: preserveExistingRoles })
      : new Map();

    if (!roleMap.size) {
      const everyoneRole = guildData.roles.find(r => r.name === '@everyone');
      if (everyoneRole) roleMap.set(everyoneRole.id, targetGuild.roles.everyone.id);
    }

    if (copyRoles) {
      await logChannel.send('Creating roles...');
      await logChannel.send(`Role copy complete. Roles available: ${roleMap.size - 1}`);
    }

    let categoryMap = new Map();
    if (copyChannels) {
      await logChannel.send('Creating categories...');
      categoryMap = await cloneCategories(targetGuild, guildData, roleMap);
      await logChannel.send(`Category copy complete. Created ${categoryMap.size} categories.`);

      await logChannel.send('Creating channels in categories...');
      const channelCount = await cloneChannels(targetGuild, guildData, roleMap, categoryMap);
      await logChannel.send(`Created ${channelCount} category channels.`);

      if (CONFIG.cloning.clone_standalone && guildData.standalone_channels.length > 0) {
        await logChannel.send('Creating standalone channels...');
        const standaloneCount = await cloneStandaloneChannels(targetGuild, guildData, roleMap);
        await logChannel.send(`Created ${standaloneCount} standalone channels.`);
      }
    }

    const finalChannels = await targetGuild.channels.fetch();
    const finalRoles = await targetGuild.roles.fetch();
    const finalCategories = finalChannels.filter(c => c.type === 4);
    const textChannels = finalChannels.filter(c => c.type === 0).size;
    const voiceChannels = finalChannels.filter(c => c.type === 2).size;
    const stageChannels = finalChannels.filter(c => c.type === 13).size;
    const announcementChannels = finalChannels.filter(c => c.type === 5).size;
    const forumChannels = finalChannels.filter(c => c.type === 15).size;
    
    let categoryPerms = 0;
    let channelPerms = 0;
    let totalPermOverwrites = 0;

    finalCategories.forEach(cat => {
      categoryPerms += cat.permissionOverwrites.cache.size;
      totalPermOverwrites += cat.permissionOverwrites.cache.size;
    });
    finalChannels.filter(c => c.type !== 4).forEach(ch => {
      channelPerms += ch.permissionOverwrites.cache.size;
      totalPermOverwrites += ch.permissionOverwrites.cache.size;
    });

    let totalRolePerms = 0;
    finalRoles.forEach(r => {
      totalRolePerms += r.permissions.toArray().length;
    });

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(destructive ? 'Guild Cloning Complete' : 'Manual Copy Complete')
      .setDescription(destructive ? 'The source guild structure has been replicated in the target server.' : 'The source guild structure has been merged into the target server.')
      .addFields(
        { name: 'Roles', value: `${finalRoles.size}`, inline: true },
        { name: 'Categories', value: `${finalCategories.size}`, inline: true },
        { name: 'Text Channels', value: `${textChannels}`, inline: true },
        { name: 'Voice Channels', value: `${voiceChannels}`, inline: true },
        { name: 'Stage Channels', value: `${stageChannels}`, inline: true },
        { name: 'Announcement Channels', value: `${announcementChannels}`, inline: true },
        { name: 'Forum Channels', value: `${forumChannels}`, inline: true },
        { name: 'Permission Overwrites', value: `${channelPerms + categoryPerms}`, inline: true },
        { name: 'Source Guild', value: sourceGuild.name, inline: true },
        { name: 'Target Guild', value: targetGuild.name, inline: true }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [successEmbed] });
    await logChannel.send('Copy complete. Review the new structure and remove this log channel if it is no longer needed.');

  } catch (error) {
    console.error('Error during cloning:', error);
    if (logChannel) {
      try {
        await logChannel.send(`Error during copy: ${error.message}`);
      } catch (e) {
        console.error('Failed to send error to log channel:', e);
      }
    }
  }
}

// ===== SCAN GUILD =====
async function scanGuild(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const allChannels = guild.channels.cache;
  const allRoles = guild.roles.cache;

  const guildData = {
    guild_info: {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ dynamic: true, size: 1024 }),
      description: guild.description,
      verification_level: guild.verificationLevel,
      default_message_notifications: guild.defaultMessageNotifications,
      explicit_content_filter: guild.explicitContentFilter,
      afk_channel_id: guild.afkChannelId,
      afk_timeout: guild.afkTimeout,
      system_channel_id: guild.systemChannelId,
      system_channel_flags: guild.systemChannelFlags
    },
    roles: [],
    categories: [],
    standalone_channels: []
  };

  // Scan ALL roles with FULL permissions
  allRoles.sort((a, b) => b.position - a.position).forEach(role => {
    guildData.roles.push({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
      permissions: role.permissions.toArray(),
      permissions_bitfield: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
      hoist: role.hoist,
      managed: role.managed,
      icon: role.iconURL(),
      unicode_emoji: role.unicodeEmoji,
      tags: role.tags
    });
  });

  // Helper function to convert channel type to number
  const getChannelTypeNumber = (type) => {
    if (typeof type === 'number') return type;
    const typeMap = {
      'GUILD_TEXT': 0,
      'DM': 1,
      'GUILD_VOICE': 2,
      'GROUP_DM': 3,
      'GUILD_CATEGORY': 4,
      'GUILD_NEWS': 5,
      'GUILD_ANNOUNCEMENT': 5,
      'GUILD_STORE': 6,
      'GUILD_NEWS_THREAD': 10,
      'GUILD_PUBLIC_THREAD': 11,
      'GUILD_PRIVATE_THREAD': 12,
      'GUILD_STAGE_VOICE': 13,
      'GUILD_STAGE': 13,
      'GUILD_DIRECTORY': 14,
      'GUILD_FORUM': 15,
      'GUILD_MEDIA': 16
    };
    return typeMap[type] || 0;
  };

  // Helper function to convert video quality mode
  const getVideoQualityMode = (mode) => {
    if (typeof mode === 'number') return mode;
    if (!mode) return undefined;
    const modeMap = {
      'AUTO': 1,
      'FULL': 2
    };
    return modeMap[mode] || 1;
  };

  // Scan ALL categories (handle both numeric and string types)
  const categories = allChannels.filter(c => c.type === 4 || c.type === 'GUILD_CATEGORY');

  categories.sort((a, b) => a.position - b.position).forEach(category => {
    const categoryData = {
      id: category.id,
      name: category.name,
      position: category.position,
      permission_overwrites: [],
      channels: []
    };

    category.permissionOverwrites.cache.forEach(overwrite => {
      const isRole = overwrite.type === 0 || overwrite.type === 'role';
      const target = isRole ? allRoles.get(overwrite.id) : guild.members.cache.get(overwrite.id);
      categoryData.permission_overwrites.push({
        id: overwrite.id,
        type: isRole ? 'role' : 'member',
        name: target ? (target.name || target.user?.tag) : 'Unknown',
        allow: overwrite.allow.toArray(),
        allow_bitfield: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.toArray(),
        deny_bitfield: overwrite.deny.bitfield.toString()
      });
    });

    const categoryChannels = allChannels.filter(c => c.parentId === category.id || c.parent?.id === category.id);
    categoryChannels.sort((a, b) => a.position - b.position).forEach(channel => {
      const channelData = {
        id: channel.id,
        name: channel.name,
        type: getChannelTypeNumber(channel.type),
        position: channel.position,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rate_limit_per_user: channel.rateLimitPerUser,
        bitrate: channel.bitrate,
        user_limit: channel.userLimit,
        rtc_region: channel.rtcRegion,
        video_quality_mode: getVideoQualityMode(channel.videoQualityMode),
        default_auto_archive_duration: channel.defaultAutoArchiveDuration,
        permission_overwrites: []
      };

      channel.permissionOverwrites.cache.forEach(overwrite => {
        const isRole = overwrite.type === 0 || overwrite.type === 'role';
        const target = isRole ? allRoles.get(overwrite.id) : guild.members.cache.get(overwrite.id);
        channelData.permission_overwrites.push({
          id: overwrite.id,
          type: isRole ? 'role' : 'member',
          name: target ? (target.name || target.user?.tag) : 'Unknown',
          allow: overwrite.allow.toArray(),
          allow_bitfield: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.toArray(),
          deny_bitfield: overwrite.deny.bitfield.toString()
        });
      });

      categoryData.channels.push(channelData);
    });

    guildData.categories.push(categoryData);
  });

  // Scan standalone channels - exclude categories
  const standaloneChannels = allChannels.filter(c => !c.parentId && !c.parent && c.type !== 4 && c.type !== 'GUILD_CATEGORY');
  if (standaloneChannels.size > 0) {

    standaloneChannels.sort((a, b) => a.position - b.position).forEach(channel => {
      const channelData = {
        id: channel.id,
        name: channel.name,
        type: getChannelTypeNumber(channel.type),
        position: channel.position,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rate_limit_per_user: channel.rateLimitPerUser,
        bitrate: channel.bitrate,
        user_limit: channel.userLimit,
        rtc_region: channel.rtcRegion,
        video_quality_mode: getVideoQualityMode(channel.videoQualityMode),
        default_auto_archive_duration: channel.defaultAutoArchiveDuration,
        permission_overwrites: []
      };

      channel.permissionOverwrites.cache.forEach(overwrite => {
        const isRole = overwrite.type === 0 || overwrite.type === 'role';
        const target = isRole ? allRoles.get(overwrite.id) : guild.members.cache.get(overwrite.id);
        channelData.permission_overwrites.push({
          id: overwrite.id,
          type: isRole ? 'role' : 'member',
          name: target ? (target.name || target.user?.tag) : 'Unknown',
          allow: overwrite.allow.toArray(),
          allow_bitfield: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.toArray(),
          deny_bitfield: overwrite.deny.bitfield.toString()
        });
      });

      guildData.standalone_channels.push(channelData);
    });
  }

  const filename = `guild-full-${guild.id}.json`;
  fs.writeFileSync(filename, JSON.stringify(guildData, null, 2));

  return guildData;
}


// ===== DELETE ALL CHANNELS =====
async function deleteAllChannels(guild, logChannelId) {
  const channels = await guild.channels.fetch();
  const channelArray = Array.from(channels.values()).filter(c => c.id !== logChannelId);
  const batchSize = CONFIG.settings.batch_size || 5;
  
  for (let i = 0; i < channelArray.length; i += batchSize) {
    const batch = channelArray.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (channel) => {
      try {
        await channel.delete('Preparing for guild clone');
      } catch (error) {
        // Silent fail
      }
    }));
    
    if (i + batchSize < channelArray.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.settings.delay_ms || 200));
    }
  }
}

// ===== DELETE ALL ROLES =====
async function deleteAllRoles(guild) {
  const roles = await guild.roles.fetch();
  const roleArray = Array.from(roles.values()).filter(r => r.name !== '@everyone' && !r.managed);
  const batchSize = CONFIG.settings.batch_size || 5;
  
  for (let i = 0; i < roleArray.length; i += batchSize) {
    const batch = roleArray.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (role) => {
      try {
        await role.delete('Preparing for guild clone');
      } catch (error) {
        // Silent fail
      }
    }));
    
    if (i + batchSize < roleArray.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.settings.delay_ms || 200));
    }
  }
}

// ===== CLONE ROLES =====
async function cloneRoles(guild, guildData, options = {}) {
  const preserveExisting = options.preserveExisting || false;
  const roleMap = new Map();
  const existingRoles = preserveExisting ? await guild.roles.fetch() : null;
  const existingRoleByName = preserveExisting && existingRoles
    ? new Map(Array.from(existingRoles.values()).map(r => [r.name, r]))
    : new Map();

  const rolesToCreate = guildData.roles.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);
  const batchSize = 3;
  let created = 0;

  for (let i = 0; i < rolesToCreate.length; i += batchSize) {
    const batch = rolesToCreate.slice(i, i + batchSize);

    await Promise.allSettled(batch.map(async (roleData) => {
      if (preserveExisting && existingRoleByName.has(roleData.name)) {
        roleMap.set(roleData.id, existingRoleByName.get(roleData.name).id);
        created++;
        return;
      }

      try {
        const permissions = new PermissionsBitField(BigInt(roleData.permissions_bitfield));
        const roleOptions = {
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: permissions,
          reason: 'Guild clone'
        };

        const newRole = await guild.roles.create(roleOptions);
        roleMap.set(roleData.id, newRole.id);
        created++;
      } catch (error) {
        if (error.code === 429) {
          await new Promise(resolve => setTimeout(resolve, (error.retry_after || 3) * 1000));
        }
      }
    }));

    if (CONFIG.interface.verbose_logging) {
      const progress = Math.floor((created / rolesToCreate.length) * 20);
      const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
      process.stdout.write(`\rRoles: ${bar} ${created}/${rolesToCreate.length}`);
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.settings.delay_ms || 200));
  }

  console.log('');
  const everyoneRole = guildData.roles.find(r => r.name === '@everyone');
  if (everyoneRole) roleMap.set(everyoneRole.id, guild.roles.everyone.id);

  return roleMap;
}


// ===== CLONE CATEGORIES =====
async function cloneCategories(guild, guildData, roleMap) {
  const categoryMap = new Map();
  const batchSize = 3;
  let created = 0;
  
  for (let i = 0; i < guildData.categories.length; i += batchSize) {
    const batch = guildData.categories.slice(i, i + batchSize);
    
    await Promise.allSettled(batch.map(async (categoryData) => {
      try {
        const permissionOverwrites = [];
        for (const overwrite of categoryData.permission_overwrites) {
          const newId = roleMap.get(overwrite.id);
          if (newId) {
            permissionOverwrites.push({
              id: newId,
              allow: new PermissionsBitField(BigInt(overwrite.allow_bitfield || 0)),
              deny: new PermissionsBitField(BigInt(overwrite.deny_bitfield || 0))
            });
          }
        }
        
        const newCategory = await guild.channels.create({
          name: categoryData.name,
          type: 4,
          position: categoryData.position,
          permissionOverwrites: permissionOverwrites,
          reason: 'Guild clone'
        });
        
        categoryMap.set(categoryData.id, newCategory.id);
        created++;
      } catch (error) {
        // Silent fail
      }
    }));
    
    if (CONFIG.interface.verbose_logging) {
      const progress = Math.floor((created / guildData.categories.length) * 20);
      const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
      process.stdout.write(`\rCategories: ${bar} ${created}/${guildData.categories.length}`);
    }
    
    if (i + batchSize < guildData.categories.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.settings.delay_ms || 200));
    }
  }
  
  console.log('');
  return categoryMap;
}

// ===== HELPER: CREATE CHANNEL WITH FALLBACK =====
async function createChannelWithFallback(guild, channelOptions) {
  const originalType = channelOptions.type;
  
  try {
    return await guild.channels.create(channelOptions);
  } catch (error) {
    if (CONFIG.cloning.smart_fallback && (error.code === 50024 || error.message.toLowerCase().includes('type') || error.message.toLowerCase().includes('feature'))) {
      let fallbackType = null;
      let typeName = 'Unknown';

      if (originalType === 5) {
        fallbackType = 0;
        typeName = 'Announcement';
      } else if (originalType === 13) {
        fallbackType = 2;
        typeName = 'Stage';
      } else if (originalType === 15 || originalType === 16) {
        fallbackType = 0;
        typeName = originalType === 15 ? 'Forum' : 'Media';
      }

      if (fallbackType !== null) {
        const fallbackOptions = { ...channelOptions, type: fallbackType };
        if (fallbackType === 0) {
          delete fallbackOptions.videoQualityMode;
          delete fallbackOptions.bitrate;
          delete fallbackOptions.userLimit;
        }
        
        try {
          return await guild.channels.create(fallbackOptions);
        } catch (retryError) {
          console.error(`Failed fallback for ${channelOptions.name}:`, retryError.message);
          return null;
        }
      }
    }
    
    console.error(`Failed to create channel ${channelOptions.name}:`, error.message);
    return null;
  }
}

// ===== CLONE CHANNELS =====
async function cloneChannels(guild, guildData, roleMap, categoryMap) {
  let channelCount = 0;
  let totalChannels = guildData.categories.reduce((sum, cat) => sum + cat.channels.length, 0);
  const batchSize = CONFIG.settings.batch_size || 5;
  
  for (const categoryData of guildData.categories) {
    const newCategoryId = categoryMap.get(categoryData.id);
    if (!newCategoryId) continue;
    
    for (let i = 0; i < categoryData.channels.length; i += batchSize) {
      const batch = categoryData.channels.slice(i, i + batchSize);
      
      await Promise.allSettled(batch.map(async (channelData) => {
        const permissionOverwrites = [];
        for (const overwrite of channelData.permission_overwrites) {
          const newId = roleMap.get(overwrite.id);
          if (newId) {
            permissionOverwrites.push({
              id: newId,
              allow: new PermissionsBitField(BigInt(overwrite.allow_bitfield || 0)),
              deny: new PermissionsBitField(BigInt(overwrite.deny_bitfield || 0))
            });
          }
        }
        
        const channelType = channelData.type;
        const channelOptions = {
          name: channelData.name,
          type: channelType,
          parent: newCategoryId,
          position: channelData.position,
          permissionOverwrites: permissionOverwrites,
          reason: 'Guild clone'
        };
        
        if (channelData.topic) channelOptions.topic = channelData.topic;
        if (channelData.nsfw !== undefined) channelOptions.nsfw = channelData.nsfw;
        if (channelData.rate_limit_per_user) channelOptions.rateLimitPerUser = channelData.rate_limit_per_user;
        if (channelData.bitrate) channelOptions.bitrate = Math.min(channelData.bitrate, CONFIG.settings.max_bitrate);
        if (channelData.user_limit) channelOptions.userLimit = channelData.user_limit;
        if (channelData.rtc_region) channelOptions.rtcRegion = channelData.rtc_region;
        
        if ((channelType === 2 || channelType === 13) && channelData.video_quality_mode) {
          channelOptions.videoQualityMode = channelData.video_quality_mode;
        }
        if (channelData.default_auto_archive_duration) channelOptions.defaultAutoArchiveDuration = channelData.default_auto_archive_duration;
        
        const newChannel = await createChannelWithFallback(guild, channelOptions);
        if (newChannel) channelCount++;
      }));
      
      if (CONFIG.interface.verbose_logging) {
        const progress = Math.floor((channelCount / totalChannels) * 20);
        const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
        process.stdout.write(`\rChannels: ${bar} ${channelCount}/${totalChannels}`);
      }
      
      if (i + batchSize < categoryData.channels.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.settings.delay_ms || 200));
      }
    }
  }
  
  console.log('');
  return channelCount;
}

// ===== CLONE STANDALONE CHANNELS =====
async function cloneStandaloneChannels(guild, guildData, roleMap) {
  let channelCount = 0;
  const batchSize = CONFIG.settings.batch_size || 5;

  for (let i = 0; i < guildData.standalone_channels.length; i += batchSize) {
    const batch = guildData.standalone_channels.slice(i, i + batchSize);
    
    await Promise.allSettled(batch.map(async (channelData) => {
      const permissionOverwrites = [];
      for (const overwrite of channelData.permission_overwrites) {
        const newId = roleMap.get(overwrite.id);
        if (newId) {
          permissionOverwrites.push({
            id: newId,
            allow: new PermissionsBitField(BigInt(overwrite.allow_bitfield || 0)),
            deny: new PermissionsBitField(BigInt(overwrite.deny_bitfield || 0))
          });
        }
      }
      
      const channelType = channelData.type;
      const channelOptions = {
        name: channelData.name,
        type: channelType,
        position: channelData.position,
        permissionOverwrites: permissionOverwrites,
        reason: 'Guild clone'
      };
      
      if (channelData.topic) channelOptions.topic = channelData.topic;
      if (channelData.nsfw !== undefined) channelOptions.nsfw = channelData.nsfw;
      if (channelData.rate_limit_per_user) channelOptions.rateLimitPerUser = channelData.rate_limit_per_user;
      if (channelData.bitrate) channelOptions.bitrate = Math.min(channelData.bitrate, CONFIG.settings.max_bitrate);
      if (channelData.user_limit) channelOptions.userLimit = channelData.user_limit;
      if (channelData.rtc_region) channelOptions.rtcRegion = channelData.rtc_region;
      
      if ((channelType === 2 || channelType === 13) && channelData.video_quality_mode) {
        channelOptions.videoQualityMode = channelData.video_quality_mode;
      }
      if (channelData.default_auto_archive_duration) channelOptions.defaultAutoArchiveDuration = channelData.default_auto_archive_duration;
      
      const newChannel = await createChannelWithFallback(guild, channelOptions);
      if (newChannel) channelCount++;
    }));
    
    if (CONFIG.interface.verbose_logging) {
      const progress = Math.floor((channelCount / guildData.standalone_channels.length) * 20);
      const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
      process.stdout.write(`\rStandalone: ${bar} ${channelCount}/${guildData.standalone_channels.length}`);
    }
    
    if (i + batchSize < guildData.standalone_channels.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.settings.delay_ms || 200));
    }
  }
  
  console.log('');
  return channelCount;
}

// ===== COMMAND: /check-status =====
async function handleCheckStatus(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const targetGuild = interaction.guild;
  if (!targetGuild) return interaction.editReply('This command must be used in a server.');
  
  const channels = await targetGuild.channels.fetch();
  const roles = await targetGuild.roles.fetch();
  const categories = channels.filter(c => c.type === 4);
  const textChannels = channels.filter(c => c.type === 0);
  const voiceChannels = channels.filter(c => c.type === 2);
  const stageChannels = channels.filter(c => c.type === 13);
  
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`${targetGuild.name} Status`)
    .addFields(
      { name: 'Roles', value: `${roles.size}`, inline: true },
      { name: 'Categories', value: `${categories.size}`, inline: true },
      { name: 'Text Channels', value: `${textChannels.size}`, inline: true },
      { name: 'Voice Channels', value: `${voiceChannels.size}`, inline: true },
      { name: 'Stage Channels', value: `${stageChannels.size}`, inline: true },
      { name: 'Total Channels', value: `${channels.size}`, inline: true }
    )
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

// ===== COMMAND: /verify-clone =====
async function handleVerifyClone(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const sourceGuildId = interaction.options.getString('source_guild_id');
  const targetGuild = interaction.guild;
  if (!targetGuild) return interaction.editReply('This command must be used in a server.');
  
  const filename = `guild-full-${sourceGuildId}.json`;
  if (!fs.existsSync(filename)) {
    return interaction.editReply(`Source guild data not found. Please run \`/backup-create ${sourceGuildId}\` first.`);
  }
  
  const guildData = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const targetRoles = await targetGuild.roles.fetch();
  const targetChannels = await targetGuild.channels.fetch();
  const sourceRoles = guildData.roles.filter(r => r.name !== '@everyone');
  const presentRoles = sourceRoles.filter(sr => targetRoles.find(tr => tr.name === sr.name));
  
  let totalSourceChannels = 0;
  let totalTargetChannels = 0;
  guildData.categories.forEach(cat => totalSourceChannels += cat.channels.length);
  
  const targetCategories = targetChannels.filter(c => c.type === 4);
  targetCategories.forEach(cat => {
    const channelsInCat = targetChannels.filter(c => c.parentId === cat.id && c.type !== 4);
    totalTargetChannels += channelsInCat.size;
  });
  
  const completion = totalSourceChannels > 0 ? ((totalTargetChannels / totalSourceChannels) * 100).toFixed(1) : 100;
  const embed = new EmbedBuilder()
    .setColor(completion >= 99 ? '#00FF00' : '#FFA500')
    .setTitle('Clone Verification')
    .addFields(
      { name: 'Roles', value: `${presentRoles.length}/${sourceRoles.length}`, inline: true },
      { name: 'Categories', value: `${targetCategories.size}/${guildData.categories.length}`, inline: true },
      { name: 'Channels', value: `${totalTargetChannels}/${totalSourceChannels}`, inline: true },
      { name: 'Completion', value: `${completion}%`, inline: false },
      { name: 'Source', value: guildData.guild_info.name, inline: true },
      { name: 'Target', value: targetGuild.name, inline: true }
    )
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

// Login both clients
botClient.login(process.env.BOT_TOKEN).catch(err => {
  console.error('Bot token login failed:', err.message);
  process.exit(1);
});

userClient.login(process.env.USER_TOKEN).catch(err => {
  console.error('User token login failed:', err.message);
  process.exit(1);
});
