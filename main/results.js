const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// prod db
const db = require('../util/db');

// local db
// const db = require('../util/db-local');
const helper = require('./helper');

function getFinResFromDB() {
    return db.execute(
        `SELECT 
        COUNT(id) as bets,
        SUM(sum) as betsSum,
        SUM(finres) as finres,
        SUM(pinFinres) as pinFinres,
        SUM(IF(finres > 0, 1, 0)) AS won_bets
        from bets_kedlo
        WHERE score1 IS NOT NULL AND score1 <> 99 AND finres IS NOT NULL`
    )
}

function getResultsFromBEandCalculateTotals() {
    return db.execute(
        `SELECT * FROM bets_kedlo 
        WHERE score1 IS NULL AND DATE_ADD(ADDTIME(CONVERT(date,datetime),time), INTERVAL 2 HOUR) < CURRENT_DATE()`
    ).then(([res]) => {
        const promises = [];
        res.forEach(betData => {
            promises.push(getResultsFromBE(betData.link, betData.bet, betData.id, betData.odds, betData.sum));
        });
        return Promise.all(promises).then(() => {
            return getFinResFromDB();
        })
        .catch(err => console.log('Promise all failed', err));
    }).catch(err => console.log('Fetch data for results failed', err));
}

function getResultsFromBE(link, bet, id, odds, sum) {
    const oddsPosition = helper.getBetPosition(bet);
    return JSDOM.fromURL(link)
      .then(dom => {
        const scoreElem = dom.window.document.getElementById('js-score');
        let score1;
        let score2;
        if (scoreElem) {
            const score = scoreElem.textContent;
            const divIndex = score.indexOf(':');
            score1 = +score.substring(0, divIndex);
            score2 = +score.substring(divIndex + 1);
        } else {
            score1 = 99;
            score2 = 99;
        }

        return helper.getPinnacleOddsFromBE(id, link, oddsPosition)
            .then(pinnacleCloseOdds => {
                pinnacleCloseOdds = +pinnacleCloseOdds;
                let finres = isBetWon(bet, score1, score2) && odds*sum || 0;
                let pinFinres = isBetWon(bet, score1, score2) && pinnacleCloseOdds*sum || 0;
                if (score1 === 99) {
                    finres = 0;
                    pinFinres = 0;
                }
                console.log(pinnacleCloseOdds);
                return db.execute(
                    `UPDATE bets_kedlo set score1 = ?, score2 = ?, pinCloseOdds = ?, finres = ?, pinFinres = ? WHERE id = ?`,
                    [score1, score2, pinnacleCloseOdds, finres, pinFinres, id]
            )
            });
      })
      .catch(err => {
        console.log('err1', err);
      });
}

function isBetWon(bet, score1, score2) {
    return (
        (bet === 'HOME' && (score1 > score2)) 
        || (bet === 'AWAY' && (score1 < score2))
        || (bet === 'DRAW' && (score1 === score2))
        )
}

module.exports = getResultsFromBEandCalculateTotals;