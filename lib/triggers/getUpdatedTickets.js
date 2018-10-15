"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Executes the triggers's logic by sending a request to the OTRS Web Service API for the ticket ids,
 * and then executing a request to get the data for all the updated tickets.
 *
 * @param {object} msg - an empty object
 * @param {object} cfg - credentials + trigger configuration
 * @param {object} snp - last processed ticket id and the date that it was crated
 * @returns {Promise}
 */
async function processAction(msg, cfg, snp) {

    if(!cfg.startDateTime) {
        throw new Error('You must specify a start date.');
    }

    let queues = this.parseCsvInput(cfg.queues);

    const otrs = new OtrsConnector(cfg);

    let lastUpdatedTicketId = snp.lastUpdatedTicketId || 0;
    let lastUpdatedTicketDate = snp.lastUpdatedTicketDate || cfg.startDateTime;

    let newTicketIds = await otrs.searchTickets({
        TicketChangeTimeNewerDate: lastUpdatedTicketDate,
        SortBy: "Changed",
        OrderBy: "Up",
        Queues: queues
    }).then(ids => {
        return (ids || []).filter(ticketId => Number(ticketId) > lastUpdatedTicketId).sort((a, b) => a - b);
    }).catch(error => {
        throw new Error(error);
    });

    if(!newTicketIds.length) {
        return;
    }

    return otrs.getTickets(newTicketIds).then(tickets => {
        tickets.forEach(ticket => {
            this.emitData(ticket);
            this.emitSnapshot({
                lastUpdatedTicketId: Number(ticket.TicketID),
                lastUpdatedTicketDate: ticket.Created
            });
        });
    });
}
