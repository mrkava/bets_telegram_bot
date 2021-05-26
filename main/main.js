const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const moment = require("moment");

function getDataFromBetexplorer(callbackForSaveAndSendBets) {
    JSDOM.fromURL('https://www.betexplorer.com/popular-bets/soccer/?order_by=2')
      .then(dom => {
        const blocks = dom.window.document.querySelectorAll("tbody");
        blocks.forEach(block => {
            const subBlocks = block.querySelectorAll("tr");
            let matchDate;
            subBlocks.forEach(subBlock => {
                const matchDateElem = subBlock.querySelector("th.h-text-left");
                if (!matchDateElem) {
                    const matchLinkElement = subBlock.querySelector("a");
                    const matchTime = subBlock.querySelector(".table-main__time").textContent;
                    const matchLink = matchLinkElement.href;
                    const matchId = getMatchIdFromUrl(matchLink);
                    const matchName = matchLinkElement.textContent;
                    
                    const matchOdds = Array.from(subBlock.querySelectorAll(".table-main__odds"))
                    .map(oddsElement => {
                        return oddsElement && +oddsElement.querySelector("[data-odd]").getAttribute('data-odd');
                    });

                    const matchClicks = Array.from(subBlock.querySelectorAll(".table-main__clicks"))
                    .map(clickElement => {
                        return clickElement && +clickElement.textContent;
                    });

                    console.log(matchName);
                    console.log('odds', matchOdds);
                    console.log('clicks', matchClicks);
                    console.log('matchId', matchId);
                    callbackForSaveAndSendBets(matchDate, matchTime, matchName, matchClicks, matchOdds, matchId, matchLink);
                } else {
                    matchDate = moment(matchDateElem.textContent, 'DD.MM.YYYY').format('YYYY-MM-DD');
                    console.log(matchDate);
                }
            });
        });
      })
      .catch(err => {
        console.log('err1', err);
      });
}

function getMatchIdFromUrl(url) {
    const tempUrl = url.substring(0, url.length - 1);
    const index = tempUrl.lastIndexOf('/');
    return tempUrl.substring(index + 1);
  }

  module.exports = getDataFromBetexplorer;