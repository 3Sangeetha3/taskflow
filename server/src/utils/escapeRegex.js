// Escapes regex metacharacters so user input is matched literally.
module.exports = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
