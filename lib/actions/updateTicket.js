"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Updates an OTRS ticket by sending a request to the OTRS Web Service API.
 * The function returns a Promise.
 *
 * @param {object} msg - incoming message
 * @param {object} msg.body - otrs ticket to update
 * @param {string} msg.body.TicketID
 * @param {object} cfg - configuration & credentials
 * @param {string} cfg.password
 * @param {string} cfg.user
 * @param {string} cfg.baseUrl
 * @returns {Promise} - resolves to a message to be emitted to the platform
 */
function processAction(msg, cfg) {
    const ticket = msg.body;
    const otrs = new OtrsConnector(cfg);

    return otrs.updateTicket(ticket.TicketID, otrs.mapInputToTicket(ticket));
}