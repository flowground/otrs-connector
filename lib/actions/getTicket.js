"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Get ticket based on ticket id.
 *
 * @param {object} msg.body - issue
 * @param {string} msg.body.customfield_10015 - ticket id
 * @returns {Promise}
 */
async function processAction(msg, cfg) {
    const otrs = new OtrsConnector(cfg);
    const ticketId = msg.body.customfield_10015;

    if(!ticketId) {
        throw new Error('"Ticket ID is required');
    }

    return otrs.getTickets([ticketId]);
}
