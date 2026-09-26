// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Arc Poll
/// @notice A decentralized onchain polling application where each poll has its own creator.
contract ArcPoll {
    struct Poll {
        uint256 id;
        string question;
        string[] options;
        address creator;
        uint256[] voteCounts;
        uint256 totalVotes;
        bool closed;
        uint256 createdAt;
    }

    error PollNotFound(uint256 pollId);
    error PollAlreadyClosed(uint256 pollId);
    error AlreadyVoted(uint256 pollId, address voter);
    error InvalidOption(uint256 pollId, uint256 optionIndex);
    error NotPollCreator(uint256 pollId, address caller);
    error InvalidQuestion();
    error InvalidOptionsCount(uint256 count);
    error EmptyOption(uint256 index);

    event PollCreated(uint256 indexed pollId, address indexed creator, string question, string[] options);
    event Voted(uint256 indexed pollId, address indexed voter, uint256 optionIndex);
    event PollClosed(uint256 indexed pollId, address indexed creator);

    mapping(uint256 => Poll) public polls;
    uint256 public pollCount;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public voterChoice;

    /// @notice Creates a new poll with 2 to 4 options.
    /// @param question The poll question.
    /// @param options The list of options (must have 2-4 non-empty entries).
    /// @return pollId The newly created poll ID.
    function createPoll(string calldata question, string[] calldata options) external returns (uint256 pollId) {
        if (bytes(question).length == 0) revert InvalidQuestion();

        uint256 optionsCount = options.length;
        if (optionsCount < 2 || optionsCount > 4) revert InvalidOptionsCount(optionsCount);

        for (uint256 i = 0; i < optionsCount; i++) {
            if (bytes(options[i]).length == 0) revert EmptyOption(i);
        }

        // First poll ID must be 1.
        pollId = ++pollCount;

        Poll storage poll = polls[pollId];
        poll.id = pollId;
        poll.question = question;
        poll.creator = msg.sender;
        poll.createdAt = block.timestamp;

        for (uint256 i = 0; i < optionsCount; i++) {
            poll.options.push(options[i]);
            poll.voteCounts.push(0);
        }

        emit PollCreated(pollId, msg.sender, question, options);
    }

    /// @notice Casts a vote for a specific option in an open poll.
    /// @param pollId The poll ID.
    /// @param optionIndex The index of the selected option.
    function vote(uint256 pollId, uint256 optionIndex) external {
        Poll storage poll = _getPollOrRevert(pollId);

        if (poll.closed) revert PollAlreadyClosed(pollId);
        if (hasVoted[pollId][msg.sender]) revert AlreadyVoted(pollId, msg.sender);
        if (optionIndex >= poll.options.length) revert InvalidOption(pollId, optionIndex);

        hasVoted[pollId][msg.sender] = true;
        voterChoice[pollId][msg.sender] = optionIndex;

        poll.voteCounts[optionIndex] += 1;
        poll.totalVotes += 1;

        emit Voted(pollId, msg.sender, optionIndex);
    }

    /// @notice Closes an existing poll. Only the poll creator can close it.
    /// @param pollId The poll ID.
    function closePoll(uint256 pollId) external {
        Poll storage poll = _getPollOrRevert(pollId);

        if (poll.creator != msg.sender) revert NotPollCreator(pollId, msg.sender);
        if (poll.closed) revert PollAlreadyClosed(pollId);

        poll.closed = true;

        emit PollClosed(pollId, msg.sender);
    }

    /// @notice Returns the full poll struct.
    /// @param pollId The poll ID.
    /// @return poll The full poll data.
    function getPoll(uint256 pollId) external view returns (Poll memory poll) {
        poll = _getPollOrRevert(pollId);
    }

    /// @notice Returns the poll results and status.
    /// @param pollId The poll ID.
    /// @return options The poll options.
    /// @return voteCounts Vote counts parallel to options.
    /// @return totalVotes Total votes cast.
    /// @return closed Whether the poll is closed.
    function getResults(uint256 pollId)
        external
        view
        returns (string[] memory options, uint256[] memory voteCounts, uint256 totalVotes, bool closed)
    {
        Poll storage poll = _getPollOrRevert(pollId);
        return (poll.options, poll.voteCounts, poll.totalVotes, poll.closed);
    }

    /// @notice Returns all active (not closed) poll IDs.
    function getActivePolls() external view returns (uint256[] memory) {
        uint256 activeCount;

        for (uint256 i = 1; i <= pollCount; i++) {
            if (!_pollExists(i)) continue;
            if (!polls[i].closed) {
                activeCount++;
            }
        }

        uint256[] memory activePollIds = new uint256[](activeCount);
        uint256 index;

        for (uint256 i = 1; i <= pollCount; i++) {
            if (!_pollExists(i)) continue;
            if (!polls[i].closed) {
                activePollIds[index] = i;
                index++;
            }
        }

        return activePollIds;
    }

    /// @notice Returns all poll IDs (active and closed).
    function getAllPollIds() external view returns (uint256[] memory) {
        uint256[] memory allPollIds = new uint256[](pollCount);

        for (uint256 i = 1; i <= pollCount; i++) {
            allPollIds[i - 1] = i;
        }

        return allPollIds;
    }

    function _getPollOrRevert(uint256 pollId) internal view returns (Poll storage) {
        if (!_pollExists(pollId)) revert PollNotFound(pollId);
        return polls[pollId];
    }

    function _pollExists(uint256 pollId) internal view returns (bool) {
        return polls[pollId].id != 0;
    }
}
