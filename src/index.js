const express = require('express');

const { ServerConfig, Logger, Queue } = require('./config');

const apiRoutes = require('./routes');
const CRON = require('./utils/common/cron-jobs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', apiRoutes);
app.use('/bookingService/api', apiRoutes);

app.listen(ServerConfig.PORT,async () => {
    console.log("Successfully running on",ServerConfig.PORT);
    CRON();
    Logger.info("Successfully started the server");
    await Queue.connectQueue();
}); 