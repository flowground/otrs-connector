"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Updates an OTRS ticket by adding a article.
 * The function returns a Promise.
 *
 * @param {object} msg - incoming message
 * @param {string} msg.body.comment - comment to be added as article
 * @param {string} msg.body.TicketID - id of OTRS ticket
 * @param {object} cfg - configuration & credentials
 * @param {string} cfg.password
 * @param {string} cfg.user
 * @param {string} cfg.baseUrl
 * @returns {Promise} - resolves to a message to be emitted to the platform
 */
function processAction(msg, cfg) {
    const otrs = new OtrsConnector(cfg);

    return otrs.addArticle(msg.body.TicketID, msg.body.comment);
}