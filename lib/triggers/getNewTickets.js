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
    const limit = cfg.limit ? Number(cfg.limit) : 50;
    const otrs = new OtrsConnector(cfg);

    if(!cfg.startDateTime) {
        throw new Error('"Tickets created since" field is required');
    }

    if(!otrs.isValidDate(cfg.startDateTime)) {
        throw new Error('"Tickets created since" field is invalid. Valid format is "yyyy-mm-dd hh:mm:ss"')
    }

    if(!(limit > 0)) {
        throw new Error('Limit must be a number greater than zero.')
    }

    let queues = this.parseCsvInput(cfg.queues);
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
