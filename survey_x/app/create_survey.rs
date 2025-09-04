use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Fixed-size data structure using only supported types
    // No String, Vec, or variable-length types allowed
    // Following Arcium best practices for data independence
    pub struct SurveyData {
        title_length: u8,        // Supported: u8
        description_length: u8,   // Supported: u8
        question_count: u8,       // Supported: u8
        complexity_score: u8,     // Supported: u8 (1-10)
        target_audience: u8,      // Supported: u8 (1-5)
        estimated_duration: u16,  // Supported: u16 (minutes)
    }

    // Fixed-size output structure for survey creator
    pub struct SurveyMetrics {
        base_score: u64,          // Base calculation score
        complexity_bonus: u64,    // Complexity-based bonus
        audience_bonus: u64,      // Audience-targeting bonus
        duration_bonus: u64,      // Duration-based bonus
        total_score: u64,         // Total calculated score
        quality_tier: u8,         // Quality tier (1-5)
    }

    // Survey analysis result for survey analyst (sealing example)
    pub struct SurveyAnalysis {
        market_fit_score: u8,     // Market fit assessment (1-10)
        target_demographic: u8,   // Primary demographic (1-5)
        estimated_response_rate: u8, // Expected response rate (1-100)
        competitive_advantage: u8,   // Competitive positioning (1-10)
    }

    #[instruction]
    pub fn create_survey(
        input_ctxt: Enc<Shared, SurveyData>,
        survey_analyst: Shared
    ) -> (Enc<Shared, SurveyMetrics>, Enc<Shared, SurveyAnalysis>) {
        let input = input_ctxt.to_arcis();
        
        // FOLLOWING ARCIUM BEST PRACTICES:
        // 1. Data Independence: All code paths execute regardless of input values
        // 2. Performance: Minimize expensive operations (multiplications, comparisons)
        // 3. Use supported operations: +, *, comparison, field access
        // 4. Minimize calls to owner.from_arcis() by grouping data per owner
        
        // Base calculations (cheap operations - additions are fastest)
        let title_weight = (input.title_length as u64) * 2u64;
        let desc_weight = (input.description_length as u64) * 3u64;
        let question_weight = (input.question_count as u64) * 10u64;
        let base_score = title_weight + desc_weight + question_weight;
        
        // Complexity bonus calculation (data independent - all paths execute)
        let complexity_bonus = if input.complexity_score > 7u8 {
            50u64
        } else if input.complexity_score > 4u8 {
            25u64
        } else {
            10u64
        };
        
        // Audience targeting bonus (data independent)
        let audience_bonus = if input.target_audience > 3u8 {
            40u64
        } else if input.target_audience > 1u8 {
            20u64
        } else {
            5u64
        };
        
        // Duration-based bonus (data independent)
        let duration_bonus = if input.estimated_duration > 30u16 {
            30u64
        } else if input.estimated_duration > 15u16 {
            20u64
        } else {
            10u64
        };
        
        // Total score calculation (cheap addition operations)
        let total_score = base_score + complexity_bonus + audience_bonus + duration_bonus;
        
        // Quality tier calculation (data independent)
        let quality_tier = if total_score > 200u64 {
            5u8 // Premium
        } else if total_score > 150u64 {
            4u8 // High
        } else if total_score > 100u64 {
            3u8 // Medium
        } else if total_score > 50u64 {
            2u8 // Basic
        } else {
            1u8 // Simple
        };
        
        // Create output struct for survey creator (all data encrypted together)
        let creator_output = SurveyMetrics {
            base_score: base_score,
            complexity_bonus: complexity_bonus,
            audience_bonus: audience_bonus,
            duration_bonus: duration_bonus,
            total_score: total_score,
            quality_tier: quality_tier,
        };
        
        // Survey analysis for analyst (sealing example)
        // Calculate market fit without revealing exact survey details
        let market_fit_score = if input.complexity_score >= 7u8 && input.target_audience >= 4u8 {
            9u8 // High market fit
        } else if input.complexity_score >= 5u8 && input.target_audience >= 3u8 {
            7u8 // Good market fit
        } else if input.complexity_score >= 3u8 && input.target_audience >= 2u8 {
            5u8 // Moderate market fit
        } else {
            3u8 // Low market fit
        };
        
        // Determine target demographic based on complexity and audience
        let target_demographic = if input.complexity_score >= 8u8 {
            5u8 // Expert/Professional
        } else if input.complexity_score >= 6u8 {
            4u8 // Advanced
        } else if input.complexity_score >= 4u8 {
            3u8 // Intermediate
        } else if input.complexity_score >= 2u8 {
            2u8 // Beginner
        } else {
            1u8 // General
        };
        
        // Estimate response rate based on survey characteristics
        let estimated_response_rate = if input.estimated_duration <= 5u16 && input.question_count <= 5u8 {
            85u8 // High response rate
        } else if input.estimated_duration <= 15u16 && input.question_count <= 10u8 {
            70u8 // Good response rate
        } else if input.estimated_duration <= 30u16 && input.question_count <= 20u8 {
            55u8 // Moderate response rate
        } else {
            40u8 // Lower response rate
        };
        
        // Calculate competitive advantage score
        let competitive_advantage = if input.complexity_score >= 8u8 && input.target_audience >= 4u8 && input.estimated_duration <= 20u16 {
            9u8 // High competitive advantage
        } else if input.complexity_score >= 6u8 && input.target_audience >= 3u8 && input.estimated_duration <= 30u16 {
            7u8 // Good competitive advantage
        } else if input.complexity_score >= 4u8 && input.target_audience >= 2u8 {
            5u8 // Moderate competitive advantage
        } else {
            3u8 // Low competitive advantage
        };
        
        // Create survey analysis result for analyst
        let analyst_output = SurveyAnalysis {
            market_fit_score: market_fit_score,
            target_demographic: target_demographic,
            estimated_response_rate: estimated_response_rate,
            competitive_advantage: competitive_advantage,
        };
        
        // Return encrypted results using proper sealing pattern:
        // 1. Survey creator gets full metrics (Enc<Shared, SurveyMetrics>)
        // 2. Survey analyst gets only analysis insights (Enc<Shared, SurveyAnalysis>)
        // This demonstrates information flow control through re-encryption
        
        // Group all data for survey creator in one struct to minimize from_arcis calls
        let creator_result = input_ctxt.owner.from_arcis(creator_output);
        
        // Re-encrypt survey analysis specifically for survey analyst
        let analyst_result = survey_analyst.from_arcis(analyst_output);
        
        (creator_result, analyst_result)
    }
}
