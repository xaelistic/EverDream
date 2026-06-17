import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('EverDreamNFT', () => {
  it('mints with URI to recipient', async () => {
    const [owner, user] = await ethers.getSigners();
    const EverDreamNFT = await ethers.getContractFactory('EverDreamNFT');
    const nft = await EverDreamNFT.deploy();
    await nft.waitForDeployment();

    const dreamHash = ethers.id('dream-test-123');
    const uri = 'ipfs://QmExample/metadata.json';

    await expect(nft.connect(owner).mintDream(user.address, uri, dreamHash))
      .to.emit(nft, 'DreamMinted')
      .withArgs(user.address, 0n, uri, dreamHash);

    expect(await nft.ownerOf(0)).to.equal(user.address);
    expect(await nft.tokenURI(0)).to.equal(uri);
  });

  it('rejects non-owner mint', async () => {
    const [owner, user] = await ethers.getSigners();
    const EverDreamNFT = await ethers.getContractFactory('EverDreamNFT');
    const nft = await EverDreamNFT.deploy();
    await nft.waitForDeployment();

    await expect(
      nft.connect(user).mintDream(user.address, 'ipfs://x', ethers.id('d')),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
});