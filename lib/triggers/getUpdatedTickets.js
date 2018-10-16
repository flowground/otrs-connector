'use strict';
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Get all updated tickets based on the config.
 *
 * @param {object} msg - an empty object
 * @param {object} cfg - credentials + trigger configuration
 * @param {string} cfg.baseUrl
 * @param {string} cfg.username
 * @param {string} cfg.password
 * @param {string} cfg.startDateTime
 * @param {string} cfg.limit
 * @param {object} snp - last processed ticket id and the date that it was last changed
 * @param {string} snp.lastUpdatedTicketId - the id of the the last processed ticket
 * @param {string} snp.lastUpdatedTicketDate - the date the last processed ticket was changed
 * @returns {Promise}
 */
async function processAction(msg, cfg, snp) {
    if(!cfg.startDateTime) {
        throw new Error('You must specify a start date.');
    }

    const limit = cfg.limit ? Number(cfg.limit) : 50;

    if(!(limit > 0)) {
        throw new Error('Limit must be a number greater than zero.')
    }

    let queues = this.parseCsvInput(cfg.queues);

    const otrs = new OtrsConnector(cfg);

    let lastUpdatedTicketId = snp.lastUpdatedTicketId || 0;
    let lastUpdatedTicketDate = snp.lastUpdatedTicketDate || cfg.startDateTime;

    // load tickets that have been updated at the exact same date-time (second) as the last processed ticket (from prev trigger run)
    let ids = await otrs.searchTickets({
        TicketChangeTimeNewerDate: lastUpdatedTicketDate,
        TicketChangeTimeOlderDate: lastUpdatedTicketDate,
        SortBy: 'TicketNumber',
        OrderBy: 'Up',
        Limit: limit,
        Queues: queues,
    }).then(ids => {
        return ids.filter(ticketId => Number(ticketId) > lastUpdatedTicketId); // filter out tickets processed in the previous run
    });

    if(ids.length < limit) {
        // load tickets updated after the update date-time of the last processed ticket (from prev run)
        ids = ids.concat(await otrs.searchTickets({
            TicketChangeTimeNewerDate: otrs.add1Second(lastUpdatedTicketDate),
            SortBy: ['Changed', 'TicketNumber'],
            OrderBy: ['Up', 'Up'],
            Limit: limit - ids.length, // total number of processed tickets in this run should not exceed cfg.limit
            Queues: queues,
        }));

        if(!ids.length) {
            return;
        }
    }

    return otrs.getTickets(ids).then(tickets => {
        tickets.forEach(ticket => {
            this.emitData(ticket);
            this.emitSnapshot({
                lastUpdatedTicketId: Number(ticket.TicketID),
                lastUpdatedTicketDate: ticket.Created
            });
        });
    });
}
