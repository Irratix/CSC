# CSC - Election hacking
use `node assignment_3.js` or `node assignment_3.js <path_to_data_file>` to run.

tested on node v19.6.0.

## Manual
An optional argument can be passed that provides a path to a data file. If no datafile is provided, data.txt will be used.

## Program output
The output of the program will be id of the original winner, and if a coalition is found the manipulated ballots of the members of the coalition as well as their original ballot. Ballots are identified with an id (0-based), corresponding to where they were encountered in the input (id 0 belonging to the first voter, 1 to the next etc.). 

NOTE: Equivalent ballots are assigned the same id (a vote count provided on the ballot), but a ballot may be 'split' if not all equivalent ballots are needed to complete the coalition. This will be reflected in a difference in the vote count for a given ballot between the manipulated and original ballot.

## Algorithm in a nutshell
The algorithm will iterate over alternatives that have greater support than the winning alternative and incrementally create a growing coalition of agents that push the currently tested alternative to the top of their ballot. Once a coalition is found that wins, it is returned to the output.