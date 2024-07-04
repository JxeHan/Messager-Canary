const ReadFolder = require('./reader.js');
const { existsSync } = require('fs');
const mongoose = require('mongoose');
const { PermissionsBitField: { Flags: Permissions } } = require('discord.js');

const modules = [
  'commands',
  'schemas',
];

module.exports = function (client) {
  console.log(`
        .__                     .__ 
        |__|_______ ____ ___  __|__|
        |  \\___   // __ \\\\  \\/  /  |
        |  |/    /\\  ___/ >    <|  |
        |__/_____ \\\\___  >__/\\_ \\__|
                 \\/    \\/      \\/   
  `);

  for (const module of modules) {
    client.logs.success(`${module} successfully loaded.`);
    client[module] = new Map();

    if (!existsSync(`${__dirname}/../${module}`)) {
      //client.logs.warn(`No ${module} folder found - Skipping...`);
      continue;
    }

    const files = ReadFolder(module);
    for (const { path, data } of files) {
      try {
        //client.logs.debug(`Loading file: ${path}`);

        if (module === 'schemas') {
          if (!data.modelName) throw `No modelName property found in ${path}`;
          if (!data.schema) throw `No schema property found in ${path}`;
          mongoose.model(data.modelName, data.schema);
          //client.logs.success(`Loaded schema: ${data.modelName}`);
          continue;
        }

        if (!data.execute) throw `No execute function found in ${path}`;
        if (typeof data.execute !== 'function') throw `Execute is not a function in ${path}`;

        if (data.roles) {
          if (!Array.isArray(data.roles)) throw `Invalid roles type in ${path} - Must be an array`;
          if (data.roles.some(role => typeof role !== 'string')) throw `Invalid roles type in ${path} - Must be an array of strings`;
        }

        if (data.users) {
          if (!Array.isArray(data.users)) throw `Invalid users type in ${path} - Must be an array`;
          if (data.users.some(user => typeof user !== 'string')) throw `Invalid users type in ${path} - Must be an array of strings`;
        }

        if (data.clientPerms) {
          if (!Array.isArray(data.clientPerms)) throw `Invalid bot permissions type in ${path} - Must be an array`;
          if (data.clientPerms.some(perm => typeof perm !== 'string')) throw `Invalid bot permissions type in ${path} - Must be an array of strings`;
          CheckPerms(data.clientPerms, 'bot');
        }

        if (data.userPerms) {
          if (!Array.isArray(data.userPerms)) throw `Invalid user permissions type in ${path} - Must be an array`;
          if (data.userPerms.some(perm => typeof perm !== 'string')) throw `Invalid user permissions type in ${path} - Must be an array of strings`;
          CheckPerms(data.userPerms, 'user');
        }

        switch (module) {
          case 'messages':
            if (!data.name) throw `No name property found in ${path}`;
            if (!data.description) throw `No description property found in ${path}`;
            if (data.cooldown && typeof data.cooldown !== 'number') throw `Invalid cooldown type in ${path} - Must be a number (seconds)`;
            addComponent(client[module], data.name, data);
            break;
          case 'commands':
            if (!data.data) throw `No data property found in ${path}`;
            addComponent(client[module], data.data.name, data);
            break;
          case 'buttons':
          case 'menus':
          case 'modals':
            if (!data.customID) throw `No custom ID has been set in ${path}`;
            if (!Array.isArray(data.customID) && typeof data.customID !== 'string') throw `Invalid custom ID type in ${path} - Must be string (single) or array (multiple)`;
            addComponent(client[module], data.customID, data);
            break;
        }
      } catch (error) {
        client.logs.error(`[${module.toUpperCase()}] Failed to load ./${path}: ${error.stack || error}`);
      }
    }
    // client.logs.success(`Loaded ${client[module].size} ${module}`);
  }
};

function CheckPerms(perms, type) {
  if (!Array.isArray(perms)) return;
  const invalidPerms = [];
  for (let i = 0; i < perms.length; i++) {
    if (Permissions[perms[i]]) continue;
    invalidPerms.push(perms[i]);
  }
  if (invalidPerms.length > 0) throw `Invalid ${type} permissions found: ${invalidPerms.join(', ')}`;
}

function addComponent(map, id, data) {
  const duplicateIDs = [];
  if (Array.isArray(id)) {
    for (const i of id) {
      if (map.has(i)) duplicateIDs.push(i);
      map.set(i, Object.assign(data, { customID: i }));
    }
  }

  if (typeof id === 'string') {
    if (map.has(id)) duplicateIDs.push(id);
    map.set(id, Object.assign(data, { customID: id }));
  }

  if (duplicateIDs.length > 0) throw `Duplicate IDs found: ${duplicateIDs.join(', ')}`;
}
