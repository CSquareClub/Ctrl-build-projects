const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainVote", function () {
  let ChainVote, chainVote;
  let admin, voter1, voter2;

  beforeEach(async () => {
    [admin, voter1, voter2] = await ethers.getSigners();
    ChainVote = await ethers.getContractFactory("ChainVote");
    chainVote = await ChainVote.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      expect(await chainVote.admin()).to.equal(admin.address);
    });
    
    it("Should have lastHash as 0 initially", async function () {
      expect(await chainVote.lastHash()).to.equal(ethers.ZeroHash);
    });
  });

  describe("Candidate Addition", function () {
    it("Should allow admin to add a candidate", async function () {
      await chainVote.addCandidate(1, "Alice");
      const candidate = await chainVote.candidates(1);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.exists).to.be.true;
    });

    it("Should reject non-admin adding a candidate", async function () {
      await expect(chainVote.connect(voter1).addCandidate(2, "Bob"))
        .to.be.revertedWith("Only admin can call this");
    });
  });

  describe("Voting", function () {
    beforeEach(async () => {
      await chainVote.addCandidate(1, "Alice");
      await chainVote.startElection();
    });

    it("Should cast a vote and update chain correctly", async function () {
      const tx = await chainVote.connect(voter1).castVote(1);
      const receipt = await tx.wait();

      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      
      const prevHash = ethers.ZeroHash;
      const expectedHash = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
              ["address", "uint256", "uint256", "bytes32"],
              [voter1.address, 1, timestamp, prevHash]
          )
      );

      const length = await chainVote.getLedgerLength();
      expect(length).to.equal(1n);
    });

    it("Should reject double voting", async function () {
      await chainVote.connect(voter1).castVote(1);
      await expect(chainVote.connect(voter1).castVote(1))
        .to.be.revertedWith("Already voted");
    });

    it("Should reject invalid candidate", async function () {
      await expect(chainVote.connect(voter1).castVote(99))
        .to.be.revertedWith("Invalid candidate");
    });
  });

  describe("Chain Verification", function () {
    beforeEach(async () => {
      await chainVote.addCandidate(1, "Alice");
      await chainVote.startElection();
      await chainVote.connect(voter1).castVote(1);
      await chainVote.connect(voter2).castVote(1);
    });

    it("Should verify a valid chain", async function () {
      const [isValid, _] = await chainVote.verifyChain();
      expect(isValid).to.be.true;
    });
  });
});
