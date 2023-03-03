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
    .replace(/#.+\n/g, '')
    .match(/[^\n]+/g)
    .map(votes => {
      return {
        amt: Number(votes.split(':')[0]),
        preference: votes
          .match(/\{.+\}|\d+(?=$|,)/g)
          .map(n => n
            .replace(/[{}]/g, '')
            .split(',')
          )
      }
    });
}

// returns the file if it could be accessed
const read_data_file = function (path) {
  return fs.readFileSync(path, 'utf8');
}

// Returns a map of plurality scores for each alternative in the profile
// Alternatives that are not selected will be undefined
const construct_plurality_scores = function (profile) {
  let list = new Map();
  for (ballot of profile) {
    for (preference of ballot.preference[0]) {
      // notation seems redundant but this works
      if (list[preference])
        list[preference] += ballot.amt;
      else
        list[preference] = ballot.amt;
    }
  }
  return list;
}

// read file and pass it off to main function

const main = function (data) {
  if (!data) {
    console.log("File reading failed");
    return;
  }
  const profile = construct_profile(data);
  console.log(JSON.stringify(profile[0], 1, 4));
  console.log(JSON.stringify(construct_plurality_scores(profile)));
}

main(read_data_file('data.txt'));