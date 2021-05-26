const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function getPinnacleOddsFromBE(id, link, oddsPosition) {
    return fetch(`https://www.betexplorer.com/match-odds/${id}/1/1x2/`, {
            headers: {
                "referer": link
              }
          })
        .then(res => res.json())
        .then(data => {
            const dom = JSDOM.fragment(data.odds);
            const pinElem = dom.querySelector('[href*=pinnacle]');
            const pinnacleCloseOdds = pinElem.parentElement.parentElement
                .querySelectorAll('.table-main__detail-odds')[oddsPosition].getAttribute('data-odd');
            return pinnacleCloseOdds;    
            })
        .catch(error => console.log('Error fetching odds from BE', error));
}

function getBetPosition(bet) {
    let oddsPosition;
    switch (bet) {
        case 'HOME':
            oddsPosition = 0;
            break;
        case 'DRAW':
            oddsPosition = 1;
            break;
        case 'AWAY':
            oddsPosition = 2;
            break;        
    }

    return oddsPosition;
}

exports.getPinnacleOddsFromBE = getPinnacleOddsFromBE;

exports.getBetPosition = getBetPosition;