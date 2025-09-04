const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const {
  getArciumAccountBaseSeed,
  getCompDefAccOffset,
  getArciumProgAddress,
  getMXEAccAddress,
} = require("@arcium-hq/client");
const idl = require("./target/idl/survey_x.json");

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Use the old deployed program ID that actually works
  const newProgramId = new PublicKey('FoZGZMWrz5ATiCDJsyakp8bxF9gZjGBWZFGpJQrLEgtY');
  const program = new anchor.Program(idl, provider);
  // Override the program ID
  Object.defineProperty(program, 'programId', { value: newProgramId, writable: false });

  console.log("🚀 Initializing Arcium accounts for SurveyX...");
  console.log("Program ID:", program.programId.toString());
  console.log("Available methods:", Object.keys(program.methods));

  try {
    // Check if accounts already exist
    console.log("📝 Checking if Arcium accounts exist...");
    
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("add_together");
    
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Add Together Comp Def PDA:", compDefPDA.toString());
    console.log("MXE Account:", getMXEAccAddress(program.programId).toString());

    // Check if accounts exist
    const mxeAccountInfo = await provider.connection.getAccountInfo(getMXEAccAddress(program.programId));
    const compDefAccountInfo = await provider.connection.getAccountInfo(compDefPDA);
    
    console.log("MXE Account exists:", !!mxeAccountInfo);
    console.log("Add Together Comp Def Account exists:", !!compDefAccountInfo);
    
    if (mxeAccountInfo && compDefAccountInfo) {
      console.log("✅ Accounts already exist! No initialization needed.");
    } else {
      console.log("❌ Accounts don't exist. Need to initialize them.");
    }

  } catch (error) {
    console.error("❌ Error initializing accounts:", error);
  }
}

main().catch(console.error);
