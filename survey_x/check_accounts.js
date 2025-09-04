const { PublicKey } = require("@solana/web3.js");
const {
  getArciumAccountBaseSeed,
  getCompDefAccOffset,
  getArciumProgAddress,
  getMXEAccAddress,
} = require("@arcium-hq/client");

async function main() {
  const programId = new PublicKey('HhfT3ytQx3CsvR354wcPRGB4m7sKQ7Xhpcx4VZ1QiGaR');
  
  console.log("🔍 Checking account addresses...");
  console.log("Program ID:", programId.toString());
  
  // Derive the computation definition account
  const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
  const offset = getCompDefAccOffset("create_survey");
  
  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log("Create Survey Comp Def PDA:", compDefPDA.toString());
  console.log("MXE Account:", getMXEAccAddress(programId).toString());
  
  // Check if account exists
  const connection = new (require("@solana/web3.js")).Connection("https://api.devnet.solana.com", "confirmed");
  const accountInfo = await connection.getAccountInfo(compDefPDA);
  console.log("Account exists:", !!accountInfo);
  
  if (accountInfo) {
    console.log("Account owner:", accountInfo.owner.toString());
    console.log("Account data length:", accountInfo.data.length);
  }
}

main().catch(console.error);
