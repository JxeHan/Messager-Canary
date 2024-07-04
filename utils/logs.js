const { inspect } = require('node:util');

const color = {
    red: '\x1b[31m',
    orange: '\x1b[38;5;202m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    ff8b00: '\x1b[34m',
    pink: '\x1b[35m',
    purple: '\x1b[38;5;129m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
}

function getTimestamp() {
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parse(message) {
    const properties = inspect(message, { depth: 3 });

    const regex = /^\s*["'`](.*)["'`]\s*\+?$/gm;

    const response = [];
    for (const line of properties.split('\n')) {
        response.push( line.replace(regex, '$1') );
    }

    return response.join('\n');
}

function info(message) {
    console.log(`${color.yellow}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function warn(message) {
    console.log(`${color.orange}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function error(message) {
    console.log(`${color.red}[${getTimestamp()}] ${parse(message)}${color.reset}`);
}

function success(message) {
    console.log(`${color.green}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function debug(message) {
    console.log(`${color.ff8b00}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function deleted(message) {
    console.log(`${color.pink}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function updated(message) {
    console.log(`${color.purple}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function created(message) {
    console.log(`${color.cyan}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

function custom(message, selection) {
    console.log(`${color[selection] ?? color.reset}[${getTimestamp()}]${color.reset} ${parse(message)}`);
}

module.exports = { getTimestamp, info, warn, error, success, debug, deleted, updated, created, custom };