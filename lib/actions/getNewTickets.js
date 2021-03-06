/**
 * flowground :- Telekom iPaaS / otrs-connector
 * Copyright © 2020, Deutsche Telekom AG
 * contact: https://flowground.net/en/support-and-contact
 *
 * All files of this connector are licensed under the Apache 2.0 License. For details
 * see the file LICENSE on the top-level directory.
 */

"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Get all new tickets based on the config.
 *
 * @alias getNewTickets
 * @param {object} msg - an empty object
 * @param {object} cfg - credentials + step configuration
 * @param {string} cfg.baseUrl
 * @param {string} cfg.username
 * @param {string} cfg.password
 * @param {string} cfg.startDateTime
 * @param {string} cfg.limit
 * @param {string} cfg.includeArticles - 'none', 'first' or 'all'
 * @param {boolean} cfg.includeAttachments - get ticket articles with attachments
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
        throw new Error('Limit must be a number greater than zero.');
    }

    if(cfg.includeArticles === 'none' && cfg.includeAttachments) {
        throw new Error('In order to include attachments, articles need to be included, too.');
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
    let lastProcessedTicketId = snp.lastProcessedTicketId || 0;
    let lastProcessedTicketDate = snp.lastProcessedTicketDate || cfg.startDateTime;

    // load the tickets that have the exact same create date-time as the last processed ticket (from the previous execution)
    let ids = await otrs.searchTickets({
        TicketCreateTimeNewerDate: lastProcessedTicketDate,
        TicketCreateTimeOlderDate: lastProcessedTicketDate,
        SortBy: 'TicketNumber',
        OrderBy: 'Up',
        Limit: limit,
        Queues: queues,
    }).then(ids => {
        return ids.filter(ticketId => Number(ticketId) > lastProcessedTicketId); // filter out tickets that have already been processed in the previous execution
    });
    console.log('Same datetime ticket ids:', ids);

    if(ids.length < limit) {
        // load tickets that have been created after the last successfully processed ticket
        ids = ids.concat(await otrs.searchTickets({
            TicketCreateTimeNewerDate: otrs.add1Second(lastProcessedTicketDate),
            SortBy: ['Created', 'TicketNumber'],
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
            startDateTime: lastProcessedTicketDate
        };

        for(const ticket of tickets) {
            await otrs.uploadAttachmentsToPlatform(ticket);

            this.emitData({
                ticket: ticket,
                meta: meta,
            });

            this.emitSnapshot({
                lastProcessedTicketId: Number(ticket.TicketID),
                lastProcessedTicketDate: ticket.Created
            });
        }
    })
}
