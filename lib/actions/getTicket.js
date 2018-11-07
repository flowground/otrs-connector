"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Get ticket based on ticket id.
 *
 * @param {string} msg.body.TicketID - ticket id
 * @returns {Promise}
 */
function processAction(msg, cfg) {
    const otrs = new OtrsConnector(cfg);
    const TicketID = msg.body.TicketID;

    if(!TicketID) {
        throw new Error('Ticket ID is required');
    }

    return otrs.getTicket(TicketID, {AllArticles: 1, DynamicFields: 1});
}
