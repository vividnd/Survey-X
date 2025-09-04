import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SurveyX } from "./target/types/survey_x";
import {
  getArciumAccountBaseSeed,
  getCompDefAccOffset,
  getArciumProgAddress,
  getMXEAccAddress,
} from "@arcium-hq/client";
const idl = require("./target/idl/survey_x.json");

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Use the new deployed program ID
  const newProgramId = new PublicKey('HhfT3ytQx3CsvR354wcPRGB4m7sKQ7Xhpcx4VZ1QiGaR');
  const program = new Program(idl, provider) as Program<SurveyX>;
  // Override the program ID after construction
  Object.defineProperty(program, 'programId', {
    value: newProgramId,
    writable: false
  });

  console.log("🚀 Initializing Arcium accounts for SurveyX...");
  console.log("Program ID:", program.programId.toString());

  try {
    // Initialize the create_survey computation definition
    console.log("📝 Initializing create_survey computation definition...");
    
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("create_survey");
    
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Create Survey Comp Def PDA:", compDefPDA.toString());
    console.log("MXE Account:", getMXEAccAddress(program.programId).toString());

    const sig = await program.methods
      .initCreateSurveyCompDef()
      .accountsPartial({
        payer: provider.wallet.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
        compDefAccount: compDefPDA,
        arciumProgram: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'),
        systemProgram: new PublicKey('11111111111111111111111111111111'),
      })
      .rpc({
        commitment: "confirmed",
      });

    console.log("✅ Create Survey computation definition initialized!");
    console.log("Transaction signature:", sig);

    // Check if accounts exist now
    const mxeAccountInfo = await provider.connection.getAccountInfo(getMXEAccAddress(program.programId));
    const compDefAccountInfo = await provider.connection.getAccountInfo(compDefPDA);
    
    console.log("MXE Account exists:", !!mxeAccountInfo);
    console.log("Create Survey Comp Def Account exists:", !!compDefAccountInfo);

  } catch (error) {
    console.error("❌ Error initializing accounts:", error);
  }
}

main().catch(console.error);
