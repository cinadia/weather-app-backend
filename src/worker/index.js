let CronJob = require('cron').CronJob;

const fetchData = require('./fetch.js');

new CronJob(
    '* * * * *', // cron schedule expression: at every minute
    fetchData,
    null,
    true,
    'America/Los_Angeles'
);
