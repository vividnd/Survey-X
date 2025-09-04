import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SurveyX } from "../target/types/survey_x";
import { expect } from "chai";

describe("SurveyX Deployment Test", () => {
  // Configure the client to use devnet explicitly
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SurveyX as Program<SurveyX>;

  it("Program is deployed and accessible on devnet", async () => {
    console.log("Program ID:", program.programId.toString());

    // Check if the program account exists
    const programInfo = await provider.connection.getAccountInfo(program.programId);

    console.log("Program deployed successfully:", !!programInfo);
    console.log("Program data length:", programInfo?.data.length || 0);
    console.log("Program owner:", programInfo?.owner.toString() || "None");
    console.log("Program balance:", programInfo ? await provider.connection.getBalance(program.programId) : 0, "lamports");

    // Verify the program exists and is executable
    expect(programInfo).to.not.be.null;
    expect(programInfo!.executable).to.be.true;
  });

  it("Can fetch program IDL", async () => {
    // Verify we can fetch the program's IDL
    const idl = program.idl;
    console.log("IDL fetched successfully:", !!idl);
    console.log("Program name:", idl.name);
    console.log("Number of instructions:", idl.instructions.length);

    expect(idl).to.not.be.undefined;
    expect(idl.instructions).to.exist;
    expect(idl.instructions.length).to.be.greaterThan(0);
  });

  it("Program account has executable flag", async () => {
    const accountInfo = await provider.connection.getAccountInfo(program.programId);

    console.log("Account executable:", accountInfo?.executable);
    console.log("Account rent epoch:", accountInfo?.rentEpoch);

    expect(accountInfo?.executable).to.be.true;
  });
});
