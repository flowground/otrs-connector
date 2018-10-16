"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Get all new tickets based on the config.
 *
 * @param {object} msg - an empty object
 * @param {object} cfg - credentials + trigger configuration
 * @param {string} cfg.baseUrl
 * @param {string} cfg.username
 * @param {string} cfg.password
 * @param {string} cfg.startDateTime
 * @param {string} cfg.limit
 * @param {object} snp - last processed ticket id and the date that it was last changed
 * @param {string} snp.lastProcessedTicketId - the id of the the last processed ticket
 * @param {string} snp.lastProcessedTicketDate - the date the last processed ticket was created
 * @returns {Promise}
 */
async function processAction(msg, cfg, snp) {

    if(!cfg.startDateTime) {
        throw new Error('You must specify a start date');
    }

    const limit = cfg.limit ? Number(cfg.limit) : 50;

    if(!(limit > 0)) {
        throw new Error('Limit must be a number greater than zero.')
    }

    let queues = this.parseCsvInput(cfg.queues);

    const otrs = new OtrsConnector(cfg);

    let lastProcessedTicketId = snp.lastProcessedTicketId || 0;
    let lastProcessedTicketDate = snp.lastProcessedTicketDate || cfg.startDateTime;

    let ids = await otrs.searchTickets({
        TicketCreateTimeNewerDate: lastProcessedTicketDate,
        TicketCreateTimeOlderDate: lastProcessedTicketDate,
        SortBy: 'TicketNumber',
        OrderBy: 'Up',
        Limit: limit,
        Queues: queues,
    }).then(ids => {
        return ids.filter(ticketId => Number(ticketId) > lastProcessedTicketId);
    });


    ids = ids.concat(await otrs.searchTickets({
        TicketCreateTimeNewerDate: otrs.add1Second(lastProcessedTicketId),
        SortBy: ['Created', 'TicketNumber'],
        OrderBy: ['Up', 'Up'],
        Limit: limit,
        Queues: queues,
    }));

    if(!ids.length) {
        return;
    }

    return otrs.getTickets(ids).then(tickets => {
        tickets.forEach(ticket => {
            this.emitData(ticket);
            this.emitSnapshot({
                lastProcessedTicketId: Number(ticket.TicketID),
                lastProcessedTicketDate: ticket.Created
            });
        });
    })
}
