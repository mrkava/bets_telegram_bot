require('dotenv').config();
const moment = require("moment");
const fsPromises = require('fs').promises;
const path = require('path');

const { Telegraf } = require('telegraf');
// const bot = new Telegraf(process.env.TEST_BOT_TOKEN);
const bot = new Telegraf(process.env.BOT_TOKEN);

// prod db
const db = require('./util/db');

// local db
// const db = require('./util/db-local');

const getDataFromBetexplorer = require('./main/main');
const getResultsFromBEandCalculateTotals = require('./main/results');
const helper = require('./main/helper');

const tgChannelId_TEST = process.env.TEST_CHANNEL_ID;
const tgChannelId = process.env.CHANNEL_ID;
const pathToResLastUpdateFile = path.join(
    path.dirname(process.mainModule.filename),
    'util',
    'resupdate.txt'
  ); 

getDataFromBetexplorer(formBetsAndSendMessageToBot);
const delay = 1000 * 60 * 10;
setInterval(() => {
         sendResults();
         console.log(moment().format());
         getDataFromBetexplorer(formBetsAndSendMessageToBot);
         try {
            bot.telegram.sendMessage(tgChannelId_TEST, 'alive');
         } catch (error) {
             console.log('alive ping error', error);
         }
    }, delay);

function sendResults() {
    if (moment().hours() >= 11) {
        fsPromises.readFile(pathToResLastUpdateFile, {encoding: 'utf8'})
            .then(resUpdateDate => {
                if (!moment(resUpdateDate).isSame(moment(), 'day')) {
                    console.log(resUpdateDate);
                    getResultsFromBEandCalculateTotals()
                    .then((res) => {
                        if (!res) {
                            return;
                        }
                        res = res[0];
                        const results = res[0];
                        if (results) {
                            console.log('results', results);
                            const finres = (results.finres - results.betsSum).toFixed(2);
                            let ROI = (finres*100)/results.bets;
                            ROI = ROI.toFixed(2);
                            const resultsMessage = `${results.bets} bets made for ${results.betsSum}% , Won: ${results.won_bets}, Lost: ${results.bets - results.won_bets}, Result: ${finres}%, ROI: ${ROI}%`;
                            sendMessageToBot(resultsMessage).then(() => {
                                fsPromises.writeFile(pathToResLastUpdateFile, moment().format(), {encoding: 'utf8'});
                            })
                            .catch(error => console.log(error));
                        };
                    })
                    .catch(error => console.log(error));
                } 
            })
            .catch(error => console.log(error));
     }
}

function formBetsAndSendMessageToBot(matchDate, matchTime, matchName, matchClicks, matchOdds, matchId, matchLink) {
    const totalClicks = matchClicks.reduce((previousValue, currentValue) => {
        return previousValue + currentValue;
    });

    if (totalClicks < 50) {
        return;
    }

    const [homeOdds, drawOdds, awayOdds] = matchOdds;
    const [homeClicks, drawClicks, awayClicks] = matchClicks;

    if (totalClicks >= 50 && homeOdds*(homeClicks/totalClicks) > 1.4 && homeOdds < 2.6) {
        const bet = 'AWAY';
        const oddsPosition = helper.getBetPosition(bet);
        return helper.getPinnacleOddsFromBE(matchId, matchLink, oddsPosition)
            .then(odds => {
                const betMessage = `${matchDate} ${matchTime} * ${matchName} * AWAY WIN * @${odds || awayOdds} * 1%`;
                insertBetsInDB(matchId, matchDate, matchTime, matchName, matchLink, bet, 1, odds || awayOdds)
                    .then(([res]) => {
                        if (res.affectedRows > 0) {
                            sendMessageToBot(betMessage);
                        }
                    })
                    .catch(err => console.log('DB save error (home):', err));;
            });
    
    }

    if (totalClicks >= 100 && awayOdds*(awayClicks/totalClicks) > 1) {
        if (homeOdds > 3.0) {
            const bet = 'HOME';
            const oddsPosition = helper.getBetPosition(bet);
            return helper.getPinnacleOddsFromBE(matchId, matchLink, oddsPosition)
                .then(odds => {
                    const betMessage = `${matchDate} ${matchTime} * ${matchName} * HOME WIN * @${odds || homeOdds} * 1%`;
                    insertBetsInDB(matchId, matchDate, matchTime, matchName, matchLink, bet, 1, odds || homeOdds)
                        .then(([res]) => {
                            if (res.affectedRows > 0) {
                                sendMessageToBot(betMessage);
                            }
                        })
                        .catch(err => console.log('DB save error (away):', err));;
                });
        } else {
            const bet = 'DRAW';
            const oddsPosition = helper.getBetPosition(bet);
            return helper.getPinnacleOddsFromBE(matchId, matchLink, oddsPosition)
                .then(odds => {
                    const betMessage = `${matchDate} ${matchTime} * ${matchName} * DRAW * @${odds || drawOdds} * 0.5%`;
                    insertBetsInDB(matchId, matchDate, matchTime, matchName, matchLink, bet, 0.5, odds || drawOdds)
                        .then(([res]) => {
                            if (res.affectedRows > 0) {
                                sendMessageToBot(betMessage);
                            }
                        })
                        .catch(err => console.log('DB save error (draw):', err));;
                });
        }
    }
    
}

function insertBetsInDB
(id, date, time, match, link, bet, sum, odds) {
    // const oddsPosition = helper.getBetPosition(bet);

    return db.execute(
        `INSERT IGNORE INTO bets_kedlo VALUES (?, ?, ?, ?, ?, ?, ?, null, null, ?, null, null, null)`,
        [id, date, time, match, link, bet, sum, odds]
    );

    // return helper.getPinnacleOddsFromBE(id, link, oddsPosition)
    //     .then(odds => {
    //         return db.execute(
    //             `INSERT IGNORE INTO bets_kedlo VALUES (?, ?, ?, ?, ?, ?, ?, null, null, ?, null, null, null)`,
    //             [id, date, time, match, link, bet, sum, odds]
    //         );
    //     });
}

function sendMessageToBot(message) {
    // for production cgange to tgChannelId !!!
    // return bot.telegram.sendMessage(tgChannelId_TEST, message);
    return bot.telegram.sendMessage(tgChannelId, message);
}
