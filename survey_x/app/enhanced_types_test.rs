use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Enhanced test structs demonstrating more Arcium types
    pub struct EnhancedTestInput {
        // Unsigned integers - expanded usage
        value1: u64,           // Large values
        value2: u8,            // Small values (1-255)
        value3: u16,           // Medium values (1-65,535)
        value4: u32,           // Medium-large values (1-4,294,967,295)
        value5: u128,          // Very large values
        value6: usize,         // Array indices and sizes
        
        // Signed integers - new usage
        sentiment: i8,         // -128 to +127
        mood_change: i16,      // -32,768 to +32,767
        trend_direction: i32,  // -2,147,483,648 to +2,147,483,647
        financial_impact: i64, // -9,223,372,036,854,775,808 to +9,223,372,036,854,775,807
        
        // Floating point - new usage
        quality_score: f32,    // 0.0 to 10.0 with decimal precision
        confidence_level: f64, // 0.0 to 1.0 with high precision
        
        // Boolean
        flag: bool,
        
        // Fixed-size arrays
        daily_scores: [u32; 7],      // Weekly tracking
        monthly_totals: [u64; 12],   // Annual statistics
        quality_metrics: [f32; 5],   // 5 quality dimensions
    }

    pub struct EnhancedTestOutput {
        // Comprehensive output with various types
        result: u64,
        processed: u8,
        calculated: u16,
        status: bool,
        
        // New types
        sentiment_analysis: i8,
        trend_score: f32,
        confidence: f64,
        array_index: usize,
        
        // Array outputs
        weekly_summary: [u32; 7],
        annual_stats: [u64; 12],
        quality_summary: [f32; 5],
    }

    // Test constants with various types
    const MAX_VALUE: u64 = 1000;
    const MIN_THRESHOLD: u8 = 5;
    const DEFAULT_SCORE: u16 = 100;
    const MEDIUM_THRESHOLD: u32 = 50000;
    const LARGE_THRESHOLD: u128 = 100000000000000000000000000000000000000;
    const ARRAY_SIZE: usize = 7;
    const NEGATIVE_THRESHOLD: i8 = -5;
    const POSITIVE_THRESHOLD: i16 = 1000;
    const FLOAT_THRESHOLD: f32 = 5.5;
    const DOUBLE_THRESHOLD: f64 = 0.75;

    #[instruction]
    pub fn test_enhanced_types(
        input: Enc<Shared, EnhancedTestInput>,
        recipient: Shared
    ) -> (Enc<Shared, EnhancedTestOutput>, Enc<Shared, u64>) {
        let data = input.to_arcis();
        
        // ========================================
        // TEST 1: Enhanced Integer Operations
        // ========================================
        
        // ✅ Unsigned integer operations
        let sum_u64 = data.value1 + 100u64;
        let diff_u32 = data.value4 - 50u32;
        let product_u16 = data.value3 * 2u16;
        let quotient_u8 = data.value2 / 2u8;
        let remainder_usize = data.value6 % 3usize;
        
        // ✅ Signed integer operations
        let sentiment_sum = data.sentiment + 5i8;
        let mood_product = data.mood_change * 2i16;
        let trend_quotient = data.trend_direction / 1000i32;
        let financial_remainder = data.financial_impact % 1000000i64;
        
        // ✅ Mixed type operations with casts
        let mixed_calc = (data.value1 as u128) + (data.value5 as u128);
        let signed_mixed = (data.value2 as i16) + data.mood_change;
        
        // ========================================
        // TEST 2: Floating Point Operations
        // ========================================
        
        // ✅ f32 operations
        let quality_bonus = data.quality_score * 2.0f32;
        let quality_threshold = if data.quality_score > FLOAT_THRESHOLD {
            data.quality_score + 1.0f32
        } else {
            data.quality_score - 0.5f32
        };
        
        // ✅ f64 operations
        let confidence_multiplier = data.confidence_level * 1.5f64;
        let confidence_threshold = if data.confidence_level > DOUBLE_THRESHOLD {
            data.confidence_level + 0.1f64
        } else {
            data.confidence_level - 0.05f64
        };
        
        // ✅ Mixed float operations
        let mixed_float = (data.quality_score as f64) + data.confidence_level;
        
        // ========================================
        // TEST 3: Array Operations
        // ========================================
        
        // ✅ Fixed-size array operations
        let daily_sum = data.daily_scores.iter().fold(0u32, |acc, &x| acc + x);
        let monthly_avg = data.monthly_totals.iter().fold(0u64, |acc, &x| acc + x) / 12u64;
        let quality_max = data.quality_metrics.iter().fold(0.0f32, |acc, &x| if x > acc { x } else { acc });
        
        // ✅ Array indexing with usize
        let first_day_score = data.daily_scores[0];
        let last_month_total = data.monthly_totals[11];
        let middle_quality = data.quality_metrics[2];
        
        // ✅ Array element operations
        let enhanced_daily = [
            data.daily_scores[0] + 10u32,
            data.daily_scores[1] + 20u32,
            data.daily_scores[2] + 30u32,
            data.daily_scores[3] + 40u32,
            data.daily_scores[4] + 50u32,
            data.daily_scores[5] + 60u32,
            data.daily_scores[6] + 70u32,
        ];
        
        // ========================================
        // TEST 4: Complex Type Combinations
        // ========================================
        
        // ✅ Complex calculations with multiple types
        let sentiment_score = if data.sentiment > NEGATIVE_THRESHOLD {
            (data.sentiment as u8) * 10u8
        } else {
            (data.sentiment.abs() as u8) * 5u8
        };
        
        let trend_multiplier = if data.trend_direction > 0i32 {
            (data.trend_direction as u32) / 1000u32
        } else {
            0u32
        };
        
        let quality_confidence = (data.quality_score * data.confidence_level as f32) as u32;
        
        // ========================================
        // TEST 5: Type-Specific Optimizations
        // ========================================
        
        // ✅ Use appropriate types for value ranges
        let small_score = if data.value2 < 128u8 { data.value2 as u8 } else { 127u8 };
        let medium_score = if data.value4 < 65536u32 { data.value4 as u16 } else { 65535u16 };
        let large_score = if data.value1 < 4294967295u64 { data.value1 as u32 } else { 4294967295u32 };
        
        // ✅ Signed vs unsigned for appropriate use cases
        let sentiment_trend = if data.sentiment > 0i8 {
            "positive" // Represented as boolean for simplicity
        } else if data.sentiment < 0i8 {
            "negative"
        } else {
            "neutral"
        };
        
        // ========================================
        // TEST 6: Performance Optimizations
        // ========================================
        
        // ✅ Group expensive operations
        let expensive_calc = (data.value1 * data.value4 as u64) + (data.value5 as u64);
        
        // ✅ Use cheap operations where possible
        let cheap_calc = data.daily_scores.iter().fold(0u32, |acc, &x| acc + x);
        
        // ✅ Minimize type conversions
        let optimized_calc = data.value2 as u32 + data.value3 as u32 + data.value4;
        
        // ========================================
        // TEST 7: Data Independence Verification
        // ========================================
        
        // ✅ All paths execute regardless of input values
        let path1 = if data.value1 > 0u64 { 1u64 } else { 0u64 };
        let path2 = if data.sentiment > 0i8 { 1u64 } else { 0u64 };
        let path3 = if data.quality_score > 0.0f32 { 1u64 } else { 0u64 };
        let path4 = if data.flag { 1u64 } else { 0u64 };
        
        // All paths are guaranteed to execute
        let total_paths = path1 + path2 + path3 + path4;
        
        // ========================================
        // TEST 8: Final Output Construction
        // ========================================
        
        // ✅ Create comprehensive output with all types
        let final_output = EnhancedTestOutput {
            result: sum_u64 + total_paths,
            processed: small_score,
            calculated: medium_score as u16,
            status: data.flag && (data.quality_score > FLOAT_THRESHOLD),
            
            // New types
            sentiment_analysis: sentiment_score as i8,
            trend_score: quality_threshold,
            confidence: confidence_threshold,
            array_index: data.value6,
            
            // Array outputs
            weekly_summary: enhanced_daily,
            annual_stats: data.monthly_totals,
            quality_summary: data.quality_metrics,
        };
        
        // ✅ Create summary for recipient
        let summary = daily_sum as u64 + monthly_avg + quality_max as u64 + total_paths;
        
        // ========================================
        // TEST 9: Encryption and Sealing
        // ========================================
        
        // ✅ Encrypt for owner (all data together)
        let owner_result = input.owner.from_arcis(final_output);
        
        // ✅ Re-encrypt summary for recipient
        let recipient_result = recipient.from_arcis(summary);
        
        // Return both encrypted results
        (owner_result, recipient_result)
    }

    // ========================================
    // TEST 10: Additional Type Demonstrations
    // ========================================
    
    #[instruction]
    pub fn test_type_specific_operations(
        input: Enc<Shared, u64>,
        analyst: Shared
    ) -> (Enc<Shared, u64>, Enc<Shared, f32>) {
        let value = input.to_arcis();
        
        // ✅ Demonstrate type-specific operations
        let u32_value = if value < 4294967295u64 { value as u32 } else { 4294967295u32 };
        let u16_value = if value < 65535u64 { value as u16 } else { 65535u16 };
        let u8_value = if value < 255u64 { value as u8 } else { 255u8 };
        
        // ✅ Demonstrate signed operations
        let signed_value = if value > 2147483647u64 {
            (value - 2147483647u64) as i32
        } else {
            value as i32
        };
        
        // ✅ Demonstrate floating point operations
        let float_value = (value as f32) / 1000.0f32;
        let double_value = (value as f64) / 1000000.0f64;
        
        // ✅ Demonstrate array operations with different types
        let type_array = [
            u8_value as u64,
            u16_value as u64,
            u32_value as u64,
            value,
        ];
        
        let array_sum = type_array.iter().fold(0u64, |acc, &x| acc + x);
        
        // ✅ Demonstrate tuple operations with mixed types
        let mixed_tuple = (
            u8_value as u64,
            signed_value as u64,
            float_value as u64,
            array_sum
        );
        
        let tuple_sum = mixed_tuple.0 + mixed_tuple.1 + mixed_tuple.2 + mixed_tuple.3;
        
        // ✅ Final calculations
        let final_result = tuple_sum + (float_value as u64) + (double_value as u64);
        let analysis_score = float_value * 10.0f32;
        
        // ✅ Encrypt results for different recipients
        let owner_result = input.owner.from_arcis(final_result);
        let analyst_result = analyst.from_arcis(analysis_score);
        
        (owner_result, analyst_result)
    }
}
