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
 * @param {string} cfg.includeArticles - 'none', 'first' or 'all'
 * @param {string} cfg.includeAttachments - get ticket articles with attachments
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

    if(cfg.includeArticles !== 'none' && cfg.includeAttachments) {
        filters.Attachments = 1;
    }

    let queues = this.parseCsvInput(cfg.queues);
    let lastProcessedTicketId = snp.lastProcessedTicketId || 0;
    let lastProcessedTicketDate = snp.lastProcessedTicketDate || cfg.startDateTime;

    // load the tickets that have the exact same create date-time as the last processed ticket (from the previous trigger run)
    let ids = await otrs.searchTickets({
        TicketCreateTimeNewerDate: lastProcessedTicketDate,
        TicketCreateTimeOlderDate: lastProcessedTicketDate,
        SortBy: 'TicketNumber',
        OrderBy: 'Up',
        Limit: limit,
        Queues: queues,
    }).then(ids => {
        return ids.filter(ticketId => Number(ticketId) > lastProcessedTicketId); // filter out tickets that have already been processed in the previous trigger run
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
            for (const article of ticket.Article || []) {
                for (const attachment of article.Attachment || []) {
                    const attach = await util.createAttachment();

                    await attach.upload(attachment.Content);
                    attachment.Content = attach.getDownloadUrl();
                }
            }

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
