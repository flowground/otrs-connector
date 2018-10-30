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
 * @param {string} cfg.includeArticles - 'none', 'first' or 'all'
 * @param {string} cfg.includeAttachments - get ticket articles with attachments
 * @param {object} snp - last processed ticket id and the date that it was last changed
 * @param {string} snp.lastUpdatedTicketId - the id of the the last processed ticket
 * @param {string} snp.lastUpdatedTicketDate - the date the last processed ticket was changed
 * @returns {Promise}
 */
async function processAction(msg, cfg, snp) {
    const otrs = new OtrsConnector(cfg);
    const limit = cfg.limit ? Number(cfg.limit) : 50;

    if(!cfg.startDateTime) {
        throw new Error('"Tickets updated since" field is required');
    }

    if(!otrs.isValidDate(cfg.startDateTime)) {
        throw new Error('"Tickets updated since" field is invalid. Valid format is "yyyy-mm-dd hh:mm:ss"')
    }

    if(!(limit > 0)) {
        throw new Error('Limit must be a number greater than zero.');
    }

    if(cfg.includeArticles === 'none' && cfg.includeAttachments) {
        throw new Error('In order to include attachments, articles need to be included, too.')
    }

    const filters = {
        DynamicFields: 1
    };

    if(cfg.includeArticles === 'all') {
        filters.AllArticles = 1;
    }

    if(cfg.includeArticles === 'first') {
        filters.AllArticles = 1;
        filters.ArticleLimit = 1;
    }

    if(cfg.includeAttachments) {
        filters.Attachments = 1;
    }

    let queues = this.parseCsvInput(cfg.queues);
    let lastUpdatedTicketId = snp.lastUpdatedTicketId || 0;
    let lastUpdatedTicketDate = snp.lastUpdatedTicketDate || cfg.startDateTime;

    // load tickets that have been updated at the exact same date-time (second) as the last processed ticket (from prev trigger run)
    let ids = await otrs.searchTickets({
        TicketLastChangeTimeNewerDate: lastUpdatedTicketDate,
        TicketLastChangeTimeOlderDate: lastUpdatedTicketDate,
        SortBy: 'TicketNumber',
        OrderBy: 'Up',
        Limit: limit,
        Queues: queues,
    }).then(ids => {
        return ids.filter(ticketId => Number(ticketId) > lastUpdatedTicketId); // filter out tickets processed in the previous run
    });
    console.log('Same datetime ticket ids:', ids);

    if(ids.length < limit) {
        // load tickets updated after the update date-time of the last processed ticket (from prev run)
        ids = ids.concat(await otrs.searchTickets({
            TicketLastChangeTimeNewerDate: otrs.add1Second(lastUpdatedTicketDate),
            SortBy: ['Changed', 'TicketNumber'],
            OrderBy: ['Up', 'Up'],
            Limit: limit - ids.length, // total number of processed tickets in this run should not exceed cfg.limit
            Queues: queues,
        }));
        console.log('All ticket ids:', ids);

        if(!ids.length) {
            return;
        }
    }

    return otrs.getTickets(ids, filters).then(async tickets => {
        let meta = {
            startDateTime: lastUpdatedTicketDate
        };

        for(const ticket of tickets) {
            await otrs.processAttachments(ticket);

            this.emitData({
                ticket: ticket,
                meta: meta,
            });

            this.emitSnapshot({
                lastUpdatedTicketId: Number(ticket.TicketID),
                lastUpdatedTicketDate: ticket.Changed
            });
        }
    });
}
