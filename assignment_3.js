const fs = require('fs');

/*
 * I recommend not reading this code, it somehow gets a profile out of some string idk
 * profile is an array of preferences of the following structure:
 * {
 *   "amt": amount of voters with this profile
 *   "preference": ordered array of alternatives
 *   Note that each alternative here is an array.
 *   If there is a tie within a preference, each alternative in that tie is in that array.
 *   Otherwise it contains only 1 element.
 * }
**/
const construct_profile = function (txt) {
  return txt
    .replace(/#.+\n/g,'')
    .match(/[^\n]+/g)
    .map(votes => {
      return {
        amt: Number(votes.split(':')[0]),
        preference: votes
          .match(/\{.+\}|\d+(?=$|,)/g)
          .map(n => n
             .replace(/[{}]/g,'')
             .split(',')
          )
        }
      });
}

// read file and pass it off to main function
fs.readFile('data.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  main(data);
});


const main = function (data) {
  const profile = construct_profile(data);
  // console.log(JSON.stringify(profile,1,4));
}


