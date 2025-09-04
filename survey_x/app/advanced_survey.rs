use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Fixed-size data structures using only supported types
    // Following the exact pattern from Arcium documentation
    
    // User input data (Shared - both client and MXE can decrypt)
    pub struct UserSurveyInput {
        user_id: u128,           // Supported: u128
        response_quality: u8,     // Supported: u8 (1-10)
        completion_time: u64,     // Supported: u64 (seconds)
        satisfaction_score: u8,   // Supported: u8 (1-5)
    }

    // Internal MXE state (Mxe - only MXE can decrypt)
    pub struct SurveyAnalytics {
        total_responses: u64,     // Supported: u64
        average_quality: u64,     // Supported: u64
        total_completion_time: u64, // Supported: u64
        quality_threshold: u8,    // Supported: u8
    }

    // Output data for user (Shared - both client and MXE can decrypt)
    pub struct SurveyResult {
        user_score: u64,          // Supported: u64
        percentile_rank: u8,      // Supported: u8 (1-100)
        quality_bonus: u64,       // Supported: u64
        time_bonus: u64,          // Supported: u64
        total_bonus: u64,         // Supported: u64
    }

    // Data science insights for data scientist (sealing example)
    pub struct DataInsights {
        trend_analysis: u8,       // Trend direction (1-10, 5=neutral)
        anomaly_detection: u8,    // Anomaly score (1-10, 1=normal, 10=high anomaly)
        predictive_score: u8,     // Prediction confidence (1-10)
        optimization_suggestions: u8, // Optimization potential (1-10)
    }

    #[instruction]
    pub fn process_survey_response(
        user_input: Enc<Shared, UserSurveyInput>,
        analytics: Enc<Mxe, &SurveyAnalytics>,
        data_scientist: Shared
    ) -> (Enc<Mxe, SurveyAnalytics>, Enc<Shared, SurveyResult>, Enc<Shared, DataInsights>) {
        // Convert encrypted inputs to secret shares using to_arcis()
        let input = user_input.to_arcis();
        let mut current_analytics = *(analytics.to_arcis());
        
        // Demonstrate Arcium operations as per specification
        let quality_bonus = (input.response_quality as u64) * 10u64;
        let time_bonus = if input.completion_time < 300u64 {
            50u64
        } else if input.completion_time < 600u64 {
            25u64
        } else {
            10u64
        };
        
        // Update analytics
        current_analytics.total_responses += 1u64;
        current_analytics.total_completion_time += input.completion_time;
        
        // Calculate user percentile rank based on quality and time
        let user_score = quality_bonus + time_bonus;
        let percentile_rank = if user_score > 100u64 {
            95u8
        } else if user_score > 80u64 {
            85u8
        } else if user_score > 60u64 {
            70u8
        } else if user_score > 40u64 {
            50u8
        } else if user_score > 20u64 {
            30u8
        } else {
            15u8
        };
        
        // Create survey result for user
        let user_result = SurveyResult {
            user_score: user_score,
            percentile_rank: percentile_rank,
            quality_bonus: quality_bonus,
            time_bonus: time_bonus,
            total_bonus: user_score,
        };
        
        // Data science insights for data scientist (sealing example)
        // Analyze trends and patterns without revealing individual user data
        
        // Trend analysis based on response patterns
        let trend_analysis = if input.response_quality >= 8u8 && input.completion_time < 400u64 {
            8u8 // Positive trend
        } else if input.response_quality >= 6u8 && input.completion_time < 600u64 {
            6u8 // Slight positive trend
        } else if input.response_quality >= 4u8 && input.completion_time < 800u64 {
            5u8 // Neutral trend
        } else if input.response_quality >= 2u8 && input.completion_time < 1000u64 {
            4u8 // Slight negative trend
        } else {
            2u8 // Negative trend
        };
        
        // Anomaly detection based on response patterns
        let anomaly_detection = if input.response_quality == 10u8 && input.completion_time < 100u64 {
            9u8 // High anomaly (suspicious)
        } else if input.response_quality <= 2u8 && input.completion_time > 1200u64 {
            8u8 // High anomaly (poor engagement)
        } else if input.response_quality >= 8u8 && input.completion_time < 300u64 {
            3u8 // Low anomaly (good performance)
        } else {
            5u8 // Normal behavior
        };
        
        // Predictive score for future responses
        let predictive_score = if input.response_quality >= 8u8 && input.satisfaction_score >= 4u8 {
            9u8 // High prediction confidence
        } else if input.response_quality >= 6u8 && input.satisfaction_score >= 3u8 {
            7u8 // Good prediction confidence
        } else if input.response_quality >= 4u8 && input.satisfaction_score >= 2u8 {
            5u8 // Moderate prediction confidence
        } else {
            3u8 // Low prediction confidence
        };
        
        // Optimization suggestions based on patterns
        let optimization_suggestions = if input.completion_time > 900u64 && input.response_quality <= 5u8 {
            9u8 // High optimization potential
        } else if input.completion_time > 600u64 && input.response_quality <= 7u8 {
            7u8 // Good optimization potential
        } else if input.completion_time > 400u64 && input.response_quality <= 8u8 {
            5u8 // Moderate optimization potential
        } else {
            3u8 // Low optimization potential
        };
        
        // Create data insights for data scientist
        let data_insights = DataInsights {
            trend_analysis: trend_analysis,
            anomaly_detection: anomaly_detection,
            predictive_score: predictive_score,
            optimization_suggestions: optimization_suggestions,
        };
        
        // Return encrypted results using proper sealing pattern:
        // 1. MXE gets updated analytics (Enc<Mxe, SurveyAnalytics>)
        // 2. User gets their survey result (Enc<Shared, SurveyResult>)
        // 3. Data scientist gets insights (Enc<Shared, DataInsights>)
        // This demonstrates information flow control through re-encryption
        
        // Return updated analytics using owner.from_arcis() as per spec
        let analytics_result = analytics.owner.from_arcis(current_analytics);
        
        // Re-encrypt user result for the user
        let user_result_encrypted = user_input.owner.from_arcis(user_result);
        
        // Re-encrypt data insights specifically for data scientist
        let data_insights_encrypted = data_scientist.from_arcis(data_insights);
        
        (analytics_result, user_result_encrypted, data_insights_encrypted)
    }
}
