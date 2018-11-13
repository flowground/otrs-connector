"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Create a new OTRS Ticket.
 *
 * @param {object} msg - contains the data for the new ticket
 * @param {object} msg.body - data for new ticket
 * @param {object} cfg - credentials
 * @param {string} cfg.baseUrl
 * @param {string} cfg.username
 * @param {string} cfg.password
 *
 * @returns {Promise} - new OTRS ticket
 */
function processAction(msg, cfg) {
    const ticket = msg.body;

    const otrs = new OtrsConnector(cfg);

    return otrs.createTicket(ticket);
}