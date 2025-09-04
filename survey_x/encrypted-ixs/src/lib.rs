use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct InputValues {
        v1: u8,
        v2: u8,
    }

    #[instruction]
    pub fn add_together(input_ctxt: Enc<Shared, InputValues>) -> Enc<Shared, u16> {
        let input = input_ctxt.to_arcis();
        let sum = input.v1 as u16 + input.v2 as u16;
        input_ctxt.owner.from_arcis(sum)
    }

    // Updated confidential instruction for submitting survey responses with sealing
    #[instruction]
    pub fn submit_response(
        response_ctxt: Enc<Shared, u64>,
        loan_officer: Shared
    ) -> (Enc<Shared, u64>, Enc<Shared, u8>) {
        let v = response_ctxt.to_arcis();
        
        // Process the response and create eligibility assessment
        let eligibility_score = if v > 1000u64 {
            8u8 // High eligibility
        } else if v > 500u64 {
            6u8 // Medium eligibility
        } else if v > 100u64 {
            4u8 // Low eligibility
        } else {
            2u8 // Very low eligibility
        };
        
        // Return results for different recipients (sealing pattern)
        let owner_result = response_ctxt.owner.from_arcis(v);
        let loan_officer_result = loan_officer.from_arcis(eligibility_score);
        
        (owner_result, loan_officer_result)
    }

    // Updated confidential instruction for creating surveys with sealing
    #[instruction]
    pub fn create_survey(
        survey_metadata_ctxt: Enc<Shared, u64>,
        survey_analyst: Shared
    ) -> (Enc<Shared, u64>, Enc<Shared, u8>) {
        let metadata = survey_metadata_ctxt.to_arcis();
        
        // Analyze survey metadata and create insights
        let quality_score = if metadata > 1000u64 {
            9u8 // High quality
        } else if metadata > 500u64 {
            7u8 // Good quality
        } else if metadata > 100u64 {
            5u8 // Medium quality
        } else {
            3u8 // Low quality
        };
        
        // Return results for different recipients (sealing pattern)
        let creator_result = survey_metadata_ctxt.owner.from_arcis(metadata);
        let analyst_result = survey_analyst.from_arcis(quality_score);
        
        (creator_result, analyst_result)
    }
}
