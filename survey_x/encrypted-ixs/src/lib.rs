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

    // New confidential instruction for submitting a single numeric response (e.g., rating or compact hash)
    #[instruction]
    pub fn submit_response(response_ctxt: Enc<Shared, u64>) -> Enc<Shared, u64> {
        let v = response_ctxt.to_arcis();
        response_ctxt.owner.from_arcis(v)
    }

    // New confidential instruction for creating surveys
    #[instruction]
    pub fn create_survey(survey_metadata_ctxt: Enc<Shared, u64>) -> Enc<Shared, u64> {
        let metadata = survey_metadata_ctxt.to_arcis();
        // Return the metadata as-is for now (could add validation/computation here)
        survey_metadata_ctxt.owner.from_arcis(metadata)
    }
}
