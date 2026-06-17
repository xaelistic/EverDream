import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying EverDreamNFT with:', deployer.address);

  const EverDreamNFT = await ethers.getContractFactory('EverDreamNFT');
  const contract = await EverDreamNFT.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await ethers.provider.getNetwork();

  console.log('EverDreamNFT deployed to:', address);
  console.log('Chain ID:', network.chainId.toString());

  const outDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `${network.chainId}.json`);
  fs.writeFileSync(
    outfile,
    JSON.stringify(
      {
        contract: 'EverDreamNFT',
        address,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log('Wrote', outfile);
  console.log('\nSet in ed.app.new/.env:');
  console.log(`VITE_NFT_CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_CHAIN_ID=${network.chainId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});