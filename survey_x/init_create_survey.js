const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const {
  getArciumAccountBaseSeed,
  getCompDefAccOffset,
  getArciumProgAddress,
  getMXEAccAddress,
} = require("@arcium-hq/client");

async function main() {
  // Set up connection
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(require("fs").readFileSync(require("os").homedir() + "/.config/solana/id.json", "utf8")))
  );
  
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
  anchor.setProvider(provider);

  // Load the IDL
  const idl = require("./target/idl/survey_x.json");
  const programId = new PublicKey('HhfT3ytQx3CsvR354wcPRGB4m7sKQ7Xhpcx4VZ1QiGaR');
  const program = new anchor.Program(idl, programId, provider);

  console.log("🚀 Initializing create_survey computation definition...");
  console.log("Program ID:", programId.toString());
  console.log("Wallet:", wallet.publicKey.toString());

  try {
    // Derive the computation definition account
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("create_survey");
    
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Create Survey Comp Def PDA:", compDefPDA.toString());
    console.log("MXE Account:", getMXEAccAddress(programId).toString());

    // Check if account already exists
    const accountInfo = await connection.getAccountInfo(compDefPDA);
    if (accountInfo) {
      console.log("✅ Account already exists!");
      return;
    }

    // Initialize the computation definition
    const tx = await program.methods
      .initCreateSurveyCompDef()
      .accountsPartial({
        payer: wallet.publicKey,
        mxeAccount: getMXEAccAddress(programId),
        compDefAccount: compDefPDA,
        arciumProgram: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'),
        systemProgram: new PublicKey('11111111111111111111111111111111'),
      })
      .rpc({
        commitment: "confirmed",
      });

    console.log("✅ Create Survey computation definition initialized!");
    console.log("Transaction signature:", tx);

    // Verify the account was created
    const newAccountInfo = await connection.getAccountInfo(compDefPDA);
    console.log("Account exists:", !!newAccountInfo);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch(console.error);

