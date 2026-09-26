// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ArcPoll} from "../ArcPoll.sol";

contract ArcPollTest is Test {
    ArcPoll internal poll;

    address internal alice   = makeAddr("alice");
    address internal bob     = makeAddr("bob");
    address internal charlie = makeAddr("charlie");

    // Canonical 2-option and 4-option arrays used across tests.
    string[] internal opts2;
    string[] internal opts4;

    function setUp() public {
        poll = new ArcPoll();

        // Build reusable option arrays (dynamic arrays must be pushed element-by-element).
        opts2.push("Yes");
        opts2.push("No");

        opts4.push("A");
        opts4.push("B");
        opts4.push("C");
        opts4.push("D");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// Creates a 2-option poll from alice and returns the pollId.
    function _createPoll2(address creator) internal returns (uint256 pollId) {
        vm.prank(creator);
        pollId = poll.createPoll("Best option?", opts2);
    }

    /// Creates a 4-option poll from alice and returns the pollId.
    function _createPoll4(address creator) internal returns (uint256 pollId) {
        vm.prank(creator);
        pollId = poll.createPoll("Pick one", opts4);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createPoll — happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_CreatePoll_TwoOptions_HappyPath() public {
        vm.prank(alice);
        uint256 id = poll.createPoll("Best option?", opts2);

        assertEq(id, 1, "First poll ID should be 1");
        assertEq(poll.pollCount(), 1, "pollCount should be 1");

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.id, 1);
        assertEq(p.question, "Best option?");
        assertEq(p.creator, alice);
        assertEq(p.options.length, 2);
        assertEq(p.options[0], "Yes");
        assertEq(p.options[1], "No");
        assertEq(p.voteCounts.length, 2);
        assertEq(p.voteCounts[0], 0);
        assertEq(p.voteCounts[1], 0);
        assertEq(p.totalVotes, 0);
        assertFalse(p.closed);
        assertGt(p.createdAt, 0, "createdAt should be set");
    }

    function test_CreatePoll_FourOptions_HappyPath() public {
        vm.prank(alice);
        uint256 id = poll.createPoll("Pick one", opts4);

        assertEq(id, 1);
        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.options.length, 4);
        assertEq(p.options[0], "A");
        assertEq(p.options[3], "D");
        assertEq(p.voteCounts.length, 4);
    }

    function test_CreatePoll_ReturnsIncrementingIds() public {
        vm.prank(alice);
        uint256 id1 = poll.createPoll("Q1", opts2);
        vm.prank(bob);
        uint256 id2 = poll.createPoll("Q2", opts4);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(poll.pollCount(), 2);
    }

    function test_CreatePoll_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(poll));
        emit ArcPoll.PollCreated(1, alice, "Best option?", opts2);
        poll.createPoll("Best option?", opts2);
    }

    function test_CreatePoll_SetsCreatedAtToBlockTimestamp() public {
        vm.warp(12345);
        vm.prank(alice);
        uint256 id = poll.createPoll("When?", opts2);
        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.createdAt, 12345);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createPoll — revert paths
    // ─────────────────────────────────────────────────────────────────────────

    function test_CreatePoll_RevertsOnEmptyQuestion() public {
        vm.prank(alice);
        vm.expectRevert(ArcPoll.InvalidQuestion.selector);
        poll.createPoll("", opts2);
    }

    function test_CreatePoll_RevertsOnOneOption() public {
        string[] memory oneOpt = new string[](1);
        oneOpt[0] = "Only";
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.InvalidOptionsCount.selector, uint256(1)));
        poll.createPoll("One option?", oneOpt);
    }

    function test_CreatePoll_RevertsOnZeroOptions() public {
        string[] memory noOpts = new string[](0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.InvalidOptionsCount.selector, uint256(0)));
        poll.createPoll("No options?", noOpts);
    }

    function test_CreatePoll_RevertsOnFiveOptions() public {
        string[] memory fiveOpts = new string[](5);
        for (uint256 i = 0; i < 5; i++) fiveOpts[i] = "x";
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.InvalidOptionsCount.selector, uint256(5)));
        poll.createPoll("Too many?", fiveOpts);
    }

    function test_CreatePoll_RevertsOnEmptyOptionAtIndex0() public {
        string[] memory badOpts = new string[](2);
        badOpts[0] = "";
        badOpts[1] = "Valid";
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.EmptyOption.selector, uint256(0)));
        poll.createPoll("Bad first option", badOpts);
    }

    function test_CreatePoll_RevertsOnEmptyOptionAtIndex1() public {
        string[] memory badOpts = new string[](2);
        badOpts[0] = "Valid";
        badOpts[1] = "";
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.EmptyOption.selector, uint256(1)));
        poll.createPoll("Bad second option", badOpts);
    }

    function test_CreatePoll_RevertsOnEmptyOptionMidList() public {
        string[] memory badOpts = new string[](4);
        badOpts[0] = "A";
        badOpts[1] = "B";
        badOpts[2] = "";
        badOpts[3] = "D";
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.EmptyOption.selector, uint256(2)));
        poll.createPoll("Bad middle option", badOpts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // vote — happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_Vote_HappyPath_Option0() public {
        uint256 id = _createPoll2(alice);

        vm.prank(bob);
        poll.vote(id, 0);

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.voteCounts[0], 1, "option 0 should have 1 vote");
        assertEq(p.voteCounts[1], 0, "option 1 should have 0 votes");
        assertEq(p.totalVotes, 1);

        assertTrue(poll.hasVoted(id, bob), "bob should be marked as voted");
        assertEq(poll.voterChoice(id, bob), 0, "bob's choice should be 0");
    }

    function test_Vote_HappyPath_Option1() public {
        uint256 id = _createPoll2(alice);

        vm.prank(bob);
        poll.vote(id, 1);

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.voteCounts[0], 0);
        assertEq(p.voteCounts[1], 1);
        assertEq(p.totalVotes, 1);
        assertEq(poll.voterChoice(id, bob), 1);
    }

    function test_Vote_MultipleVotersDifferentOptions() public {
        uint256 id = _createPoll4(alice);

        vm.prank(alice);   poll.vote(id, 0);
        vm.prank(bob);     poll.vote(id, 1);
        vm.prank(charlie); poll.vote(id, 1);

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.voteCounts[0], 1);
        assertEq(p.voteCounts[1], 2);
        assertEq(p.voteCounts[2], 0);
        assertEq(p.voteCounts[3], 0);
        assertEq(p.totalVotes, 3);
    }

    function test_Vote_EmitsEvent() public {
        uint256 id = _createPoll2(alice);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true, address(poll));
        emit ArcPoll.Voted(id, bob, 1);
        poll.vote(id, 1);
    }

    function test_Vote_CreatorCanVoteOnOwnPoll() public {
        uint256 id = _createPoll2(alice);
        vm.prank(alice);
        poll.vote(id, 0);
        assertTrue(poll.hasVoted(id, alice));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // vote — revert paths
    // ─────────────────────────────────────────────────────────────────────────

    function test_Vote_RevertsOnDuplicateVote() public {
        uint256 id = _createPoll2(alice);
        vm.prank(bob);
        poll.vote(id, 0);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.AlreadyVoted.selector, id, bob));
        poll.vote(id, 0);
    }

    function test_Vote_RevertsOnDuplicateVoteDifferentOption() public {
        uint256 id = _createPoll2(alice);
        vm.prank(bob);
        poll.vote(id, 0);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.AlreadyVoted.selector, id, bob));
        poll.vote(id, 1);
    }

    function test_Vote_RevertsAfterPollClosed() public {
        uint256 id = _createPoll2(alice);
        vm.prank(alice);
        poll.closePoll(id);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollAlreadyClosed.selector, id));
        poll.vote(id, 0);
    }

    function test_Vote_RevertsOnInvalidOptionIndex() public {
        uint256 id = _createPoll2(alice); // 2 options → valid indices 0, 1

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.InvalidOption.selector, id, uint256(2)));
        poll.vote(id, 2);
    }

    function test_Vote_RevertsOnLargeInvalidOptionIndex() public {
        uint256 id = _createPoll2(alice);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.InvalidOption.selector, id, type(uint256).max));
        poll.vote(id, type(uint256).max);
    }

    function test_Vote_RevertsOnNonExistentPoll() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, uint256(999)));
        poll.vote(999, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // closePoll — happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_ClosePoll_HappyPath_CreatorCloses() public {
        uint256 id = _createPoll2(alice);

        vm.prank(alice);
        poll.closePoll(id);

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertTrue(p.closed, "poll should be closed");
    }

    function test_ClosePoll_EmitsEvent() public {
        uint256 id = _createPoll2(alice);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(poll));
        emit ArcPoll.PollClosed(id, alice);
        poll.closePoll(id);
    }

    function test_ClosePoll_ResultsPreservedAfterClose() public {
        uint256 id = _createPoll2(alice);
        vm.prank(bob);    poll.vote(id, 0);
        vm.prank(charlie); poll.vote(id, 1);

        vm.prank(alice);
        poll.closePoll(id);

        (string[] memory options, uint256[] memory voteCounts, uint256 totalVotes, bool closed) = poll.getResults(id);
        assertEq(totalVotes, 2);
        assertEq(voteCounts[0], 1);
        assertEq(voteCounts[1], 1);
        assertTrue(closed);
        assertEq(options.length, 2);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // closePoll — revert paths
    // ─────────────────────────────────────────────────────────────────────────

    function test_ClosePoll_RevertsWhenNonCreatorCloses() public {
        uint256 id = _createPoll2(alice);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.NotPollCreator.selector, id, bob));
        poll.closePoll(id);
    }

    function test_ClosePoll_RevertsOnAlreadyClosed() public {
        uint256 id = _createPoll2(alice);
        vm.prank(alice);
        poll.closePoll(id);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollAlreadyClosed.selector, id));
        poll.closePoll(id);
    }

    function test_ClosePoll_RevertsOnNonExistentPoll() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, uint256(42)));
        poll.closePoll(42);
    }

    function test_ClosePoll_RevertsOnPollId0() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, uint256(0)));
        poll.closePoll(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getPoll
    // ─────────────────────────────────────────────────────────────────────────

    function test_GetPoll_CorrectDataAfterCreate() public {
        vm.warp(9999);
        vm.prank(alice);
        uint256 id = poll.createPoll("My Question", opts2);

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.id,         id);
        assertEq(p.question,   "My Question");
        assertEq(p.creator,    alice);
        assertEq(p.options[0], "Yes");
        assertEq(p.options[1], "No");
        assertEq(p.voteCounts[0], 0);
        assertEq(p.voteCounts[1], 0);
        assertEq(p.totalVotes, 0);
        assertFalse(p.closed);
        assertEq(p.createdAt, 9999);
    }

    function test_GetPoll_CorrectDataAfterVote() public {
        uint256 id = _createPoll2(alice);
        vm.prank(bob);
        poll.vote(id, 0);

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.voteCounts[0], 1);
        assertEq(p.voteCounts[1], 0);
        assertEq(p.totalVotes, 1);
    }

    function test_GetPoll_RevertsOnNonExistentPoll() public {
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, uint256(99)));
        poll.getPoll(99);
    }

    function test_GetPoll_RevertsOnPollId0() public {
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, uint256(0)));
        poll.getPoll(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getResults
    // ─────────────────────────────────────────────────────────────────────────

    function test_GetResults_CorrectVoteCountsAndTotalVotes() public {
        uint256 id = _createPoll4(alice);
        vm.prank(alice);   poll.vote(id, 3);
        vm.prank(bob);     poll.vote(id, 3);
        vm.prank(charlie); poll.vote(id, 1);

        (string[] memory options, uint256[] memory voteCounts, uint256 totalVotes, bool closed) =
            poll.getResults(id);

        assertEq(options.length, 4);
        assertEq(options[0], "A");
        assertEq(options[3], "D");
        assertEq(voteCounts[0], 0);
        assertEq(voteCounts[1], 1);
        assertEq(voteCounts[2], 0);
        assertEq(voteCounts[3], 2);
        assertEq(totalVotes, 3);
        assertFalse(closed);
    }

    function test_GetResults_ClosedFlagAfterClose() public {
        uint256 id = _createPoll2(alice);
        vm.prank(alice);
        poll.closePoll(id);

        (,, , bool closed) = poll.getResults(id);
        assertTrue(closed);
    }

    function test_GetResults_ZeroVotesInitially() public {
        uint256 id = _createPoll4(alice);
        (, uint256[] memory voteCounts, uint256 totalVotes,) = poll.getResults(id);

        assertEq(totalVotes, 0);
        for (uint256 i = 0; i < 4; i++) {
            assertEq(voteCounts[i], 0);
        }
    }

    function test_GetResults_RevertsOnNonExistentPoll() public {
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, uint256(7)));
        poll.getResults(7);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getActivePolls
    // ─────────────────────────────────────────────────────────────────────────

    function test_GetActivePolls_EmptyWhenNoPolls() public view {
        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 0);
    }

    function test_GetActivePolls_ReturnsAllWhenNoneClosed() public {
        _createPoll2(alice);
        _createPoll2(bob);
        _createPoll2(charlie);

        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 3);
        assertEq(active[0], 1);
        assertEq(active[1], 2);
        assertEq(active[2], 3);
    }

    function test_GetActivePolls_ExcludesClosedPoll() public {
        uint256 id1 = _createPoll2(alice);
        uint256 id2 = _createPoll2(bob);
        uint256 id3 = _createPoll2(charlie);

        // Close the middle poll.
        vm.prank(bob);
        poll.closePoll(id2);

        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 2, "only 2 active polls remain");
        assertEq(active[0], id1);
        assertEq(active[1], id3);
    }

    function test_GetActivePolls_EmptyWhenAllClosed() public {
        uint256 id1 = _createPoll2(alice);
        uint256 id2 = _createPoll2(bob);

        vm.prank(alice); poll.closePoll(id1);
        vm.prank(bob);   poll.closePoll(id2);

        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 0);
    }

    function test_GetActivePolls_SinglePollClosedReturnsEmpty() public {
        uint256 id = _createPoll2(alice);
        vm.prank(alice);
        poll.closePoll(id);

        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getAllPollIds
    // ─────────────────────────────────────────────────────────────────────────

    function test_GetAllPollIds_EmptyWhenNoPolls() public view {
        uint256[] memory ids = poll.getAllPollIds();
        assertEq(ids.length, 0);
    }

    function test_GetAllPollIds_ReturnsAllIds() public {
        _createPoll2(alice);
        _createPoll2(bob);
        _createPoll4(charlie);

        uint256[] memory ids = poll.getAllPollIds();
        assertEq(ids.length, 3);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
        assertEq(ids[2], 3);
    }

    function test_GetAllPollIds_IncludesClosedPolls() public {
        uint256 id1 = _createPoll2(alice);
        uint256 id2 = _createPoll2(bob);
        vm.prank(alice); poll.closePoll(id1);

        uint256[] memory ids = poll.getAllPollIds();
        assertEq(ids.length, 2, "getAllPollIds includes closed polls");
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Full flow: create → vote → results → close
    // ─────────────────────────────────────────────────────────────────────────

    function test_FullFlow_CreateVoteResultsClose() public {
        // 1. Alice creates a 4-option poll.
        vm.prank(alice);
        uint256 id = poll.createPoll("What is your favourite colour?", opts4);
        assertEq(id, 1);

        // 2. Three voters cast their votes.
        vm.prank(alice);   poll.vote(id, 0);  // A
        vm.prank(bob);     poll.vote(id, 2);  // C
        vm.prank(charlie); poll.vote(id, 2);  // C

        // 3. Check poll state via getPoll.
        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.totalVotes, 3);
        assertEq(p.voteCounts[0], 1);
        assertEq(p.voteCounts[1], 0);
        assertEq(p.voteCounts[2], 2);
        assertEq(p.voteCounts[3], 0);
        assertFalse(p.closed);

        // 4. Verify results via getResults.
        (string[] memory options, uint256[] memory voteCounts, uint256 totalVotes, bool closed) =
            poll.getResults(id);
        assertEq(options.length, 4);
        assertEq(totalVotes, 3);
        assertEq(voteCounts[2], 2);
        assertFalse(closed);

        // 5. Alice closes the poll.
        vm.prank(alice);
        poll.closePoll(id);
        assertTrue(poll.getPoll(id).closed);

        // 6. getActivePolls returns empty; getAllPollIds still returns the id.
        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 0);
        uint256[] memory all = poll.getAllPollIds();
        assertEq(all.length, 1);
        assertEq(all[0], id);

        // 7. Voting after close is rejected.
        address dave = makeAddr("dave");
        vm.prank(dave);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollAlreadyClosed.selector, id));
        poll.vote(id, 0);
    }

    function test_FullFlow_TwoConcurrentPolls() public {
        // Create two separate polls by different creators.
        uint256 idA = _createPoll2(alice);
        uint256 idB = _createPoll4(bob);

        // Alice and charlie vote on poll A.
        vm.prank(alice);   poll.vote(idA, 0);
        vm.prank(charlie); poll.vote(idA, 1);

        // Bob votes on poll B only.
        vm.prank(bob); poll.vote(idB, 3);

        // Verify isolation: poll A unaffected by poll B votes.
        ArcPoll.Poll memory pA = poll.getPoll(idA);
        assertEq(pA.totalVotes, 2);
        ArcPoll.Poll memory pB = poll.getPoll(idB);
        assertEq(pB.totalVotes, 1);
        assertEq(pB.voteCounts[3], 1);

        // Close poll A only; poll B stays active.
        vm.prank(alice);
        poll.closePoll(idA);

        uint256[] memory active = poll.getActivePolls();
        assertEq(active.length, 1);
        assertEq(active[0], idB);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz tests
    // ─────────────────────────────────────────────────────────────────────────

    /// Fuzzes the option index: any index >= 2 on a 2-option poll must revert.
    function testFuzz_Vote_RevertsOnOutOfBoundsOption(uint256 optionIndex) public {
        optionIndex = bound(optionIndex, 2, type(uint256).max);
        uint256 id = _createPoll2(alice);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.InvalidOption.selector, id, optionIndex));
        poll.vote(id, optionIndex);
    }

    /// Fuzzes poll IDs: any non-zero ID that was never created must revert.
    function testFuzz_GetPoll_RevertsOnNonExistentId(uint256 badId) public {
        badId = bound(badId, 1, type(uint256).max); // 0 is also non-existent but separate test covers it.
        vm.expectRevert(abi.encodeWithSelector(ArcPoll.PollNotFound.selector, badId));
        poll.getPoll(badId);
    }

    /// Fuzzes vote counts: N voters on option 0 → totalVotes == N and voteCounts[0] == N.
    function testFuzz_Vote_TotalVotesAccumulate(uint8 n) public {
        n = uint8(bound(n, 1, 50)); // Keep it cheap.
        uint256 id = _createPoll2(alice);

        for (uint256 i = 0; i < n; i++) {
            // Use vm.addr to get a unique address per iteration.
            address voter = address(uint160(uint256(keccak256(abi.encodePacked("voter", i)))));
            vm.prank(voter);
            poll.vote(id, 0);
        }

        ArcPoll.Poll memory p = poll.getPoll(id);
        assertEq(p.totalVotes, n);
        assertEq(p.voteCounts[0], n);
        assertEq(p.voteCounts[1], 0);
    }
}
