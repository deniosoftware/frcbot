/**
 *
 * @param {String} text
 */
function parseSlashCommand(text) {
  var exploded = text.split(" ");

  exploded = exploded.map((item, index) => {
    return item.toLowerCase();
  });

  return {
    command: exploded.shift(),
    params: exploded,
  };
}

module.exports = parseSlashCommand;
