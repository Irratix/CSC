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
  let id = 0;
  let lines = txt.replace(/#.+\n/g, '').match(/[^\n]+/g);
  let profile = lines.map(ballot => {
    return {
      amt : Number(ballot.split(':')[0]),
      preference : ballot.match(/\{.+\}|\d+(?=$|,)/g)
                       .map(n => n.replace(/[{}]/g, '').split(',')),
      ballot_id : id++ // note intentional postfix increment
    };
  });
  return profile;
}

// returns the file if it could be accessed
const read_data_file = function(path) { return fs.readFileSync(path, 'utf8'); }

// Returns a map of plurality scores for each alternative in the profile
// Alternatives that are not selected will be undefined
const construct_plurality_scores =
    function(profile) {
  let scores = new Map();
  for (const ballot of profile) {
    for (const preference of ballot.preference[0]) {
      // in case of a tie we need to make sure that the scores are divied up
      // correctly
      const votes = ballot.amt / ballot.preference[0].length;
      // notation seems redundant but this works
      if (scores.has(preference))
        scores.set(preference, scores.get(preference) + ballot.amt);
      else
        scores.set(preference, ballot.amt);
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
    ballot_copy.ballot_id = ballot.ballot_id;
    for (const preference of ballot.preference) {
      // remember preference can be an array
      let filtered_preference = preference.filter(function(
          element) { return !alternatives.includes(element) });
      // filtering may have produced an empty array
      if (filtered_preference.length > 0)
        ballot_copy.preference.push(filtered_preference);
    }
    // add only ballots that are still part of the vote
    if (ballot_copy.preference.length > 0)
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
      if (preference.includes(x)) {
        if (!preference.includes(y)) {
          // we found a ballot including x before y, add it
          subset.push(ballot);
        }
        break;
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
// n ballots that do not already have the alternative at the top, unless they
// rank the target above alternative.
// returns the number of ballots that were thus modified (may be less than n if
// all ballots already rank alternative at the the top) NOTE: Can technically
// return a count > n (WIP)
const bump_alternative =
    function(profile, alternative, target, max_number_of_manipulations) {
  let current_number_of_manipulations = 0;
  let coalition = [];
  for (const ballot of profile) {
    if (current_number_of_manipulations >= max_number_of_manipulations) {
      // we're done manipulating, for now
      break;
    }
    // if the alternative is not already on top
    if ((!ballot.preference[0].includes(alternative))) {
      const index_alternative =
          ballot.preference.findIndex(element => element.includes(alternative));
      // ballot does not prefer this alternative
      if (index_alternative == -1)
        continue;
      const index_target =
          ballot.preference.findIndex(element => element.includes(target));
      // only bump the alternative if it is preferred by the ballot
      if (index_target === -1 || index_alternative < index_target) {
        let manip_ballot = ballot;
        // make sure we only manipulate to the desired extent
        if (current_number_of_manipulations + ballot.amt >
            max_number_of_manipulations) {
          // split this ballot entry so we manipulate only the votes needed
          manip_ballot = deep_copy(ballot);
          manipulated_vote_count =
              max_number_of_manipulations - current_number_of_manipulations;
          manip_ballot.amt = manipulated_vote_count;
          ballot.amt -= manipulated_vote_count;
        }
        // bump the alternative to the top of the ballot
        // (by means of swapping with the current top)
        [manip_ballot.preference[0],
         manip_ballot.preference[index_alternative]] =
            [
              manip_ballot.preference[index_alternative],
              manip_ballot.preference[0]
            ];

        current_number_of_manipulations += manip_ballot.amt;
        coalition.push(manip_ballot);
      }
    }
  }
  return coalition;
}

// made a special function due to encountering a really odd bug
const deep_copy =
    function(profile) {
  const copy = JSON.parse(JSON.stringify(profile));
  return copy;
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
  const checked_alternatives = [];
  for (const profile_n of vote_iterations.slice(1)) {
    const alternatives_n = alternatives_in_profile(profile_n);
    // we look for alternatives that can potentially be bumped up
    const viable_alternatives = alternatives_n.filter(function(element) {
      return !winner.includes(element) &&
             !checked_alternatives.includes(element) &&
             (nxy(profile, element, winner[0]) >
              nxy(profile, winner[0], element));
    });
    // start with the alternative that has the smallest distance to the
    // winner(s)
    viable_alternatives.sort(
        (x, y) => cardinality_profile(
            nxy(profile_n, x, winner[0]) >
            cardinality_profile(nxy(profile_n, y, winner[0]))));
    for (const alternative of viable_alternatives) {
      // get the subsets (pools of agents) nxy where x beats (one of the
      // winning) y's
      for (const target of winner) {
        const agent_pool = nxy(profile_n, alternative, target);
        // now with this agent pool, make alternative the top choice for an
        // incremental number of agents
        for (let number_of_manipulated_ballots = 0;
             number_of_manipulated_ballots < cardinality_profile(agent_pool);
             ++number_of_manipulated_ballots) {
          // create a deep copy and modify it
          const prime = deep_copy(profile_n);
          const coalition = bump_alternative(prime, alternative, target,
                                             number_of_manipulated_ballots);

          // determine the winner of the modified profile
          const winner_prime = single_transferable_vote(prime);
          const pluralities_prime = construct_plurality_scores(
              single_transferable_vote_profile_minus_n(prime));
          const coalition_size = cardinality_profile(coalition);

          // only allows singleton victories
          if (winner_prime == alternative) {
            // we're done, create a nice result object
            return {
              coalition : coalition,
              winner : winner_prime,
              pluralities : pluralities_prime,
              manipulated_ballots : coalition_size,
              prime : prime
            };
          }

          // stop early, we are not able to assemble a coalition of proper size
          if (coalition_size < number_of_manipulated_ballots)
            break;
        }
      }
      // make sure to only consider each alternative once
      checked_alternatives.push.apply(checked_alternatives,
                                      viable_alternatives);
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
      // now plug this coalition in with the rest of the agents and see if we
      // win
      const prime = [...agent_pool, ...agent_pool_complement ];
      const winner_prime = single_transferable_vote(prime);

      if (winner_prime == alternative || winner_prime.includes(alternative)) {
        return agent_pool;
      }
    }
  }
  // no coalition to be found
  return;
}

// Returns the path to the datafile that is to be used
const manage_args =
    function() {
  if (process.argv.length > 2)
    return process.argv[2];
  else
    return "data.txt";
}

const main =
    function() {
  const data = read_data_file(manage_args());
  if (!data) {
    console.log('File reading failed');
    return;
  }
  const profile = construct_profile(data);
  console.log("Outcome of original profile", single_transferable_vote(profile));
  const algo_coalition = find_coalition(profile);
  if (algo_coalition) {
    console.log("Ballots of coalition");
    for (const ballot of algo_coalition.coalition) {
      console.log("manipulated:", ballot);
      console.log("original:", profile.find(original => original.ballot_id ===
                                                        ballot.ballot_id));
    }
    console.log("Coalition found, winning alternative", algo_coalition.winner);
    console.log("Number of manipulated ballots:",
                algo_coalition.manipulated_ballots);
  } else {
    console.log("Found no manipulative coalition");
    if (naive_coalition_finder(profile) != undefined)
      console.log("It seems the proper algorithm is erroneous");
  }
}

main();