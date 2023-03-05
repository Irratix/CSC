const fs = require('fs');


/*
 * I recommend not reading this code, it somehow gets a profile out of some string idk
 * profile is an ~array~ of preferences of the following structure:
 * {
 *   "amt": amount of voters with this profile
 *   "preference": ordered ~array~ of alternatives
 *   Note that each alternative here is an ~array~ (possibly singleton) of strings.
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
  let scores = new Map();
  for (ballot of profile) {
    if (ballot.preference.length > 0) {
      for (preference of ballot.preference[0]) {
        // notation seems redundant but this works
        if (scores.has(preference))
          scores.set(preference, scores.get(preference) + ballot.amt);
        else
          scores.set(preference, ballot.amt);
      }
    }
  }
  return scores;
}

// Takes a profile as an argument and filters a given array of alternatives from it
// The returned value is a filtered copy of the input profile
const filter_alternatives = function (profile, alternatives) {
  let profile_n = []
  for (ballot of profile) {
    let ballot_copy = Object();
    ballot_copy.amt = ballot.amt;
    ballot_copy.preference = [];
    for (preference of ballot.preference) {
      // remember preference can be an array
      let filtered_preference = preference.filter(function (element) { return !alternatives.includes(element) });
      // filtering may have produced an empty array
      if (filtered_preference.length > 0)
        ballot_copy.preference.push(filtered_preference);
    }
    profile_n.push(ballot_copy);
  }
  return profile_n;
}

// Computes and filters from the profile the alternative with the maximum plurality score
const sigma_profile = function (profile) {
  const pluralities = construct_plurality_scores(profile);
  // get the alternatives with the lowest plurality scores
  let minimum = Math.min(...pluralities.values());
  // verbose, but works
  let alternatives_to_filter = [];
  for ([key, value] of pluralities) {
    if (value == minimum)
      alternatives_to_filter.push(key);
  }
  return filter_alternatives(profile, alternatives_to_filter);
}

// returns the winning alternatives of the profile using the STV rule
const single_transferable_vote = function (profile) {
  let profile_n_1 = single_transferable_vote_profile_minus_n(profile);
  pluralities = construct_plurality_scores(profile_n_1);
  // for posterity
  console.log(pluralities);
  // cool destructuring op
  let winners = [...pluralities.keys()];
  return winners;
}

// returns the profile obtained n iterations of sigma_profile before it obtains the empty set
const single_transferable_vote_profile_minus_n = function (profile, n = 1) {
  let pluralities = construct_plurality_scores(profile);
  // it's all a reference anyway
  let profile_n = [profile];
  // the profile that will contain the last remaining alternative
  let numberOfIterations = 0;
  while (pluralities.size > 0) {
    // .(-1) is a really ugly way to write .back()
    profile_n.push(sigma_profile(profile_n.at(-1)));
    pluralities = construct_plurality_scores(profile_n.at(-1));
    numberOfIterations++;
  }
  return profile_n.at(-(1 + n));
}

// Returns the ballots in a profile such that x > y in those ballots
// essentially returns a subset of the profile
const nxy = function (profile, x, y) {
  let subset = [];
  for (ballot of profile) {
    for (preference of ballot.preference) {
      if (preference.includes(x)) {
        if (!preference.includes(y)) {
          // we found a ballot including x before y, add it
          subset.push(ballot);
        }
      }
      // the ballot contains y before x, continue
      if (preference.includes(y)) {
        break;
      }
    }
  }
  return subset;
}

// returns the array of alternatives in the given profile
const alternatives_in_profile = function (profile) {
  // technically inefficient but not by that much
  let pluralities = construct_plurality_scores(profile);
  return [...pluralities.keys()];
}

// returns the total number of ballots in a profile
const cardinality_profile = function (profile) {
  let sum = 0;
  for (ballot of profile) {
    sum += ballot.amt;
  }
  return sum;
}

// algorithm that finds the minimal alteration of the given profile, prime
// such that there is a decisive coalition that prefers its outcome stv(prime)
// to the outcome of stv(profile)
const find_coalition = function (profile) {
  const winner = single_transferable_vote(profile);
  let p_2 = single_transferable_vote_profile_minus_n(profile, 2);
  let alternatives = alternatives_in_profile(p_2);
  // we look for alternatives that can potentially be bumped up
  // TODO
}

// read file and pass it off to main function

const main = function (data) {
  if (!data) {
    console.log("File reading failed");
    return;
  }
  const profile = construct_profile(data);
  console.log(single_transferable_vote(profile));
  console.log(nxy(profile, '3', '8')[0]);
  console.log(cardinality_profile(nxy(profile, '3', '8')));
  console.log(alternatives_in_profile(nxy(profile, '3', '8')));
  console.log(find_coalition(profile));
}

main(read_data_file('data.txt'));