const fs = require('fs');

/*
 * I recommend not reading this code, it somehow gets a profile out of some
 *string idk profile is an ~array~ of preferences of the following structure:
 * {
 *   "amt": amount of voters with this profile
 *   "preference": ordered ~array~ of alternatives
 *   Note that each alternative here is an ~array~ (possibly singleton) of
 *strings. If there is a tie within a preference, each alternative in that tie
 *is in that array. Otherwise it contains only 1 element.
 * }
 **/
const construct_profile =
    function(txt) {
  return txt.replace(/#.+\n/g, '').match(/[^\n]+/g).map(votes => {
    return {
      amt: Number(votes.split(':')[0]),
          preference: votes.match(/\{.+\}|\d+(?=$|,)/g)
              .map(n => n.replace(/[{}]/g, '').split(','))
    }
  });
}

// returns the file if it could be accessed
const read_data_file = function(path) { return fs.readFileSync(path, 'utf8'); }

// Returns a map of plurality scores for each alternative in the profile
// Alternatives that are not selected will be undefined
const construct_plurality_scores =
    function(profile) {
  let scores = new Map();
  for (const ballot of profile) {
    if (ballot.preference.length > 0) {
      if (!Array.isArray(ballot.preference[0])) {
        // singleton handling
        const preference = ballot.preference[0];
        if (scores.has(preference)) {
          // notation seems redundant but this works
          if (scores.has(preference))
            scores.set(preference, scores.get(preference) + ballot.amt);
          else
            scores.set(preference, ballot.amt);
        }
      } else {
        // array handling
        for (const preference of ballot.preference[0]) {
          // in case of a tie we need to make sure that the scores are divied up
          // correctly
          const votes = ballot.amt / ballot.preference[0].length
          // notation seems redundant but this works
          if (scores.has(preference))
          scores.set(preference, scores.get(preference) + votes);
          else scores.set(preference, votes);
        }
      }
    }
  }
  return scores;
}

// Takes a profile as an argument and filters a given array of alternatives from
// it The returned value is a filtered copy of the input profile
const filter_alternatives =
    function(profile, alternatives) {
  let profile_n = [];
  for (const ballot of profile) {
    let ballot_copy = Object();
    ballot_copy.amt = ballot.amt;
    ballot_copy.preference = [];
    for (const preference of ballot.preference) {
      // remember preference can be an array
      if (Array.isArray(preference)) {
        let filtered_preference = preference.filter(function(
            element) { return !alternatives.includes(element) });
        // filtering may have produced an empty array
        if (filtered_preference.length > 0)
          ballot_copy.preference.push(filtered_preference);
      } else if (!alternatives.includes(preference)) {
        ballot_copy.preference.push([ preference ]);
      }
    }
    profile_n.push(ballot_copy);
  }
  return profile_n;
}

// Computes and filters from the profile the alternative with the maximum
// plurality score
const sigma_profile =
    function(profile) {
  const pluralities = construct_plurality_scores(profile);
  // get the alternatives with the lowest plurality scores
  let minimum = Math.min(...pluralities.values());
  // verbose, but works
  let alternatives_to_filter = [];
  for (const [key, value] of pluralities) {
    if (value == minimum)
      alternatives_to_filter.push(key);
  }
  return filter_alternatives(profile, alternatives_to_filter);
}

// returns the winning alternatives of the profile using the STV rule
const single_transferable_vote =
    function(profile) {
  const profile_n_1 = single_transferable_vote_profile_minus_n(profile);
  const pluralities = construct_plurality_scores(profile_n_1);
  // cool destructuring op
  const winners = [...pluralities.keys() ];
  return winners;
}

// returns the profile obtained n iterations of sigma_profile before it obtains
// the empty set
const single_transferable_vote_profile_minus_n =
    function(profile, n = 1) {
  return single_transferable_vote_all_profiles(profile).at(-(1 + n));
}

const single_transferable_vote_all_profiles =
    function(profile) {
  let pluralities = construct_plurality_scores(profile);
  // it's all a reference anyway
  let profile_n = [ profile ];
  // the profile that will contain the last remaining alternative
  let numberOfIterations = 0;
  while (pluralities.size > 0) {
    // .(-1) is a really ugly way to write .back()
    profile_n.push(sigma_profile(profile_n.at(-1)));
    pluralities = construct_plurality_scores(profile_n.at(-1));
    numberOfIterations++;
  }
  return profile_n;
}

// Returns the ballots in a profile such that x > y in those ballots
// essentially returns a subset of the profile
const nxy =
    function(profile, x, y) {
  let subset = [];
  for (const ballot of profile) {
    for (const preference of ballot.preference) {
      if ((Array.isArray(preference) && preference.includes(x)) ||
          preference == x) {
        if (!(Array.isArray(preference) && preference.includes(y))) {
          // we found a ballot including x before y, add it
          subset.push(ballot);
        }
        break;
      }
      // the ballot contains y before x, continue
      if ((Array.isArray(preference) && preference.includes(y)) ||
          preference == y) {
        break;
      }
    }
  }
  return subset;
}

// returns the array of alternatives in the given profile
const alternatives_in_profile =
    function(profile) {
  // technically inefficient but not by that much
  let pluralities = construct_plurality_scores(profile);
  return [...pluralities.keys() ];
}

// returns the total number of ballots in a profile
const cardinality_profile =
    function(profile) {
  let sum = 0;
  for (ballot of profile) {
    sum += ballot.amt;
  }
  return sum;
}

// In the given profile, bumps the alternative to the top of the list for up to
// n ballots that do not already have the alternative at the top returns the
// number of ballots that were thus modified (may be less than n if all ballots
// already rank alternative at the the top) NOTE: Can technically return results
// > n (WIP)
const bump_alternative =
    function(profile, alternative, n) {
  let bumps = 0;
  for (const ballot of profile) {
    if (bumps < n) {
      if (
          // singleton case
          (!Array.isArray(ballot.preference[0]) &&
           ballot.preference[0] != alternative) ||
          // array case
          (!ballot.preference[0].includes(alternative))) {
        const index_alternative =
            ballot.preference.find(element => element == alternative ||
                                              (Array.isArray(element) &&
                                               element.includes(alternative)));
        // bump it (by means of swap)
        [ballot.preference[0], ballot.preference[index_alternative]] =
            [ ballot.preference[alternative], ballot.preference[0] ];
        bumps += ballot.amt;
      }
    } else {
      break;
    }
  }
  return bumps;
}

// algorithm that finds the minimal alteration of the given profile, prime
// such that there is a decisive coalition that prefers its outcome stv(prime)
// to the outcome of stv(profile)
const find_coalition =
    function(profile) {
  const winner = single_transferable_vote(profile);
  // go through all the voting iterations (from back to front, skipping the
  // first)
  const vote_iterations =
      single_transferable_vote_all_profiles(profile).reverse();
  const alternatives = alternatives_in_profile(profile);
  const checked_alternatives = [];
  for (const profile_n of vote_iterations.slice(1)) {
    const alternatives_n = alternatives_in_profile(profile_n);
    // we look for alternatives that can potentially be bumped up
    const viable_alternatives = alternatives_n.filter(function(element) {
      return !winner.includes(element) &&
             !checked_alternatives.includes(element)
    });
    for (const alternative of viable_alternatives) {
      // get the subsets (pools of agents) nxy where x beats y
      for (target of winner) {
        let agent_pool = nxy(profile_n, alternative, target);
        const agent_pool_complement = nxy(profile_n, target, alternative);
        // now with this agent pool, make alternative the top choice for an
        // incremental number of agents
        for (let n = 0; n < cardinality_profile(agent_pool);) {
          const actual_n = bump_alternative(agent_pool, alternative, n);

          // now plug this coalition in with the rest of the agents and see if
          // we win
          const prime = [...agent_pool, ...agent_pool_complement ];

          // output some information
          const winner_prime = single_transferable_vote(prime);
          const pluralities_prime = construct_plurality_scores(prime);
          if (winner_prime == alternative ||
              winner_prime.includes(alternative)) {
            // we're done
            return agent_pool;
          }

          if (actual_n < n)
            break;
          // skip some steps
          if (actual_n > n)
            n = actual_n;

          // optimization: we need at least a number of agents that is equal to
          // at least half the plurality score difference
          let diff = pluralities_prime[target] - pluralities_prime[alternative];
          n += diff / 2;
        }
      }
      checked_alternatives.concat(viable_alternatives);
    }
  }
  // no coalition to be found
  return;
}

// naive algorithm
const naive_coalition_finder =
    function(profile) {
  const winner = single_transferable_vote(profile);
  const alternatives = alternatives_in_profile(profile);
  const viable_alternatives = alternatives.filter(function(
      element) { return !winner.includes(element) });
  // go through all the voting iterations (from back to front, skipping the
  // first)
  for (alternative of viable_alternatives) {
    // get the subsets (pools of agents) nxy where x beats y
    for (target of winner) {
      let agent_pool = nxy(profile, alternative, target);
      const agent_pool_complement = nxy(profile, target, alternative);
      // bump the alternative to the maximum
      const actual_n = bump_alternative(agent_pool, alternative,
                                        cardinality_profile(agent_pool));
      // now plug this coalition in with the rest of the agents and see if we
      // win
      const prime = [...agent_pool, ...agent_pool_complement ];
      const winner_prime = single_transferable_vote(prime);
      const pluralities_prime = construct_plurality_scores(prime);

      if (winner_prime == alternative || winner_prime.includes(alternative)) {
        return agent_pool;
      }
    }
  }
  // no coalition to be found
  return;
}

const main =
    function(data) {
  if (!data) {
    console.log('File reading failed');
    return;
  }
  const profile = construct_profile(data);
  console.log(profile[0]);
  console.log(single_transferable_vote(profile));
  console.log(nxy(profile, '3', '8')[0]);
  console.log(cardinality_profile(nxy(profile, '3', '8')));
  console.log(alternatives_in_profile(nxy(profile, '3', '8')));
  console.log(find_coalition(profile));
  console.log(naive_coalition_finder(profile));
}

// read file and pass it off to main function
main(read_data_file('data.txt'));