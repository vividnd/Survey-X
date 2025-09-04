use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Fixed-size data structure using only supported types
    // No String, Vec, or variable-length types allowed
    // Following Arcium best practices for data independence
    pub struct InputValues {
        response: u64,           // Supported: u64
        rating: u8,              // Supported: u8
        feedback_length: u16,    // Supported: u16
        category: u8,            // Supported: u8 (1-5 for categories)
        timestamp: u64,          // Supported: u64 (Unix timestamp)
    }

    // Fixed-size output structure for survey owner
    pub struct ProcessedResponse {
        score: u64,              // Final calculated score
        category_score: u64,     // Category-specific score
        time_bonus: u64,         // Time-based bonus
        total: u64,              // Total score
    }

    // Loan eligibility result for loan officer (sealing example)
    pub struct LoanEligibility {
        is_eligible: bool,       // Whether applicant meets requirements
        risk_score: u8,          // Risk assessment (1-10)
        recommended_limit: u64,  // Suggested loan limit
    }

    #[instruction]
    pub fn submit_response(
        input_ctxt: Enc<Shared, InputValues>,
        loan_officer: Shared
    ) -> (Enc<Shared, ProcessedResponse>, Enc<Shared, LoanEligibility>) {
        let input = input_ctxt.to_arcis();
        
        // FOLLOWING ARCIUM BEST PRACTICES:
        // 1. Data Independence: All code paths execute regardless of input values
        // 2. Performance: Minimize expensive operations (multiplications, comparisons)
        // 3. Use supported operations: +, *, comparison, field access
        // 4. Minimize calls to owner.from_arcis() by grouping data per owner
        
        // Base calculations (cheap operations)
        let weighted_response = input.response * 2u64;
        let rating_bonus = (input.rating as u64) * 10u64;
        let base_score = weighted_response + rating_bonus;
        
        // Category bonus calculation (data independent - all paths execute)
        let category_bonus = if input.category > 3u8 {
            50u64
        } else if input.category > 1u8 {
            25u64
        } else {
            10u64
        };
        
        // Feedback bonus calculation (data independent)
        let feedback_bonus = if input.feedback_length > 100u16 {
            30u64
        } else if input.feedback_length > 50u16 {
            20u64
        } else {
            10u64
        };
        
        // Time-based calculations (data independent)
        let current_time = 1704067200u64; // Example timestamp
        let time_diff = if input.timestamp > current_time {
            input.timestamp - current_time
        } else {
            current_time - input.timestamp
        };
        
        let time_bonus = if time_diff < 86400u64 { // Within 24 hours
            20u64
        } else {
            5u64
        };
        
        // Final calculation with all bonuses
        let total_score = base_score + category_bonus + feedback_bonus + time_bonus;
        
        // Create output struct for survey owner (all data encrypted together)
        let owner_output = ProcessedResponse {
            score: base_score,
            category_score: category_bonus,
            time_bonus: time_bonus,
            total: total_score,
        };
        
        // Loan eligibility assessment (sealing example)
        // Check if applicant meets minimum requirements without revealing exact values
        let min_balance_required = 1000u64; // Example threshold
        let is_eligible = total_score >= min_balance_required;
        
        // Calculate risk score based on response quality and timing
        let risk_score = if input.rating >= 8u8 && time_diff < 86400u64 {
            2u8 // Low risk
        } else if input.rating >= 6u8 && time_diff < 172800u64 {
            5u8 // Medium risk
        } else {
            8u8 // High risk
        };
        
        // Calculate recommended loan limit based on score
        let recommended_limit = if total_score > 200u64 {
            10000u64
        } else if total_score > 150u64 {
            5000u64
        } else if total_score > 100u64 {
            2000u64
        } else {
            500u64
        };
        
        // Create loan eligibility result for loan officer
        let loan_officer_output = LoanEligibility {
            is_eligible: is_eligible,
            risk_score: risk_score,
            recommended_limit: recommended_limit,
        };
        
        // Return encrypted results using proper sealing pattern:
        // 1. Survey owner gets full response details (Enc<Shared, ProcessedResponse>)
        // 2. Loan officer gets only eligibility info (Enc<Shared, LoanEligibility>)
        // This demonstrates information flow control through re-encryption
        
        // Group all data for survey owner in one struct to minimize from_arcis calls
        let owner_result = input_ctxt.owner.from_arcis(owner_output);
        
        // Re-encrypt loan eligibility result specifically for loan officer
        let loan_officer_result = loan_officer.from_arcis(loan_officer_output);
        
        (owner_result, loan_officer_result)
    }
}
